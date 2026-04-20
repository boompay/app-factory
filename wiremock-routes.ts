import express, { type Express, type Request, type Response } from "express";
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";

const WIREMOCK_URL = process.env.WIREMOCK_URL || "https://wiremock.staging.boompay.app";
/** Directory with WireMock __files (response bodies). Same path WireMock uses; edits are picked up on next request. */
const WIREMOCK_FILES_DIR = process.env.WIREMOCK_FILES_DIR || "";

async function wiremockProxy(
  req: Request,
  res: Response,
  pathSuffix: string,
  options: { method?: string; body?: unknown } = {}
) {
  const method = options.method || req.method;
  const url = `${WIREMOCK_URL}${pathSuffix}`;
  try {
    const init: RequestInit = {
      method,
      headers: { "Content-Type": "application/json" },
    };
    if (method !== "GET" && options.body !== undefined) {
      init.body = JSON.stringify(options.body);
    } else if (method !== "GET" && req.body && Object.keys(req.body as object).length > 0) {
      init.body = JSON.stringify(req.body);
    }
    const response = await fetch(url, init);
    const text = await response.text();
    res.status(response.status).set("Content-Type", response.headers.get("Content-Type") || "application/json");
    res.send(text || "{}");
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    res.status(502).json({ error: "WireMock unreachable", detail });
  }
}

function safeFilePath(filename: string): string | null {
  if (!WIREMOCK_FILES_DIR || !filename || /[\\/]/.test(filename) || filename.includes("..")) return null;
  const resolved = path.resolve(WIREMOCK_FILES_DIR, filename);
  const base = path.resolve(WIREMOCK_FILES_DIR);
  return resolved.startsWith(base) ? resolved : null;
}

/**
 * Proxies WireMock admin API and optional __files read/write for the App Factory UI.
 */
export function registerWiremockRoutes(app: Express): void {
  app.get("/api/wiremock/mappings", (req, res) => wiremockProxy(req, res, "/__admin/mappings"));
  app.post("/api/wiremock/mappings", (req, res) => wiremockProxy(req, res, "/__admin/mappings"));
  app.post("/api/wiremock/find-by-metadata", (req, res) =>
    wiremockProxy(req, res, "/__admin/mappings/find-by-metadata")
  );
  app.post("/api/wiremock/mappings/find-by-metadata", (req, res) =>
    wiremockProxy(req, res, "/__admin/mappings/find-by-metadata")
  );
  app.get("/api/wiremock/mappings/:id", (req, res) => wiremockProxy(req, res, `/__admin/mappings/${req.params.id}`));
  app.put("/api/wiremock/mappings/:id", (req, res) => wiremockProxy(req, res, `/__admin/mappings/${req.params.id}`));
  app.delete("/api/wiremock/mappings/:id", (req, res) =>
    wiremockProxy(req, res, `/__admin/mappings/${req.params.id}`)
  );
  app.get("/api/wiremock/requests", (req, res) => wiremockProxy(req, res, "/__admin/requests"));
  app.delete("/api/wiremock/requests/:id", (req, res) =>
    wiremockProxy(req, res, `/__admin/requests/${req.params.id}`, { method: "DELETE" })
  );
  app.post("/api/wiremock/requests/reset", async (_req, res) => {
    const candidates: Array<{ method: "POST" | "DELETE"; path: string; body?: unknown }> = [
      { method: "POST", path: "/__admin/requests/reset" },
      { method: "DELETE", path: "/__admin/requests" },
      { method: "POST", path: "/__admin/requests/remove", body: {} },
      { method: "POST", path: "/__admin/requests/reset/" },
      { method: "DELETE", path: "/__admin/requests/" },
    ];

    let lastStatus = 502;
    let lastText = "WireMock reset endpoint not available";
    const attempts: string[] = [];

    for (const candidate of candidates) {
      try {
        const response = await fetch(`${WIREMOCK_URL}${candidate.path}`, {
          method: candidate.method,
          headers: { "Content-Type": "application/json" },
          body:
            candidate.method === "POST" && candidate.body !== undefined
              ? JSON.stringify(candidate.body)
              : undefined,
        });
        const text = await response.text();
        attempts.push(`${candidate.method} ${candidate.path} -> ${response.status}`);
        if (response.ok) {
          res
            .status(response.status)
            .set("Content-Type", response.headers.get("Content-Type") || "application/json")
            .send(text || "{}");
          return;
        }
        lastStatus = response.status;
        lastText = text || `${response.status} ${response.statusText}`;
        if (response.status !== 404 && response.status !== 405) break;
      } catch (err: unknown) {
        const detail = err instanceof Error ? err.message : String(err);
        lastStatus = 502;
        lastText = detail || "WireMock unreachable";
        attempts.push(`${candidate.method} ${candidate.path} -> network error`);
      }
    }

    res.status(lastStatus).json({
      error: lastText || "Reset log failed",
      attempts,
      wiremockUrl: WIREMOCK_URL,
    });
  });

  app.get("/api/wiremock/files/:filename", async (req, res) => {
    if (!WIREMOCK_FILES_DIR) {
      res.status(503).json({ error: "WIREMOCK_FILES_DIR not set; file editing disabled" });
      return;
    }
    const filePath = safeFilePath(req.params.filename);
    if (!filePath) {
      res.status(400).json({ error: "Invalid filename" });
      return;
    }
    try {
      const content = await fs.readFile(filePath, "utf-8");
      res.type("application/json").send(content);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === "ENOENT") res.status(404).json({ error: "File not found" });
      else res.status(500).json({ error: e?.message || "Read failed" });
    }
  });

  app.put(
    "/api/wiremock/files/:filename",
    express.text({ type: ["application/json", "text/plain", "*/*"], limit: "20mb" }),
    async (req, res) => {
      if (!WIREMOCK_FILES_DIR) {
        res.status(503).json({ error: "WIREMOCK_FILES_DIR not set; file editing disabled" });
        return;
      }
      const filePath = safeFilePath(req.params.filename);
      if (!filePath) {
        res.status(400).json({ error: "Invalid filename" });
        return;
      }
      const body = typeof req.body === "string" ? req.body : "";
      try {
        await fs.writeFile(filePath, body, "utf-8");
        res.json({ ok: true });
      } catch (err: unknown) {
        const e = err as { message?: string };
        res.status(500).json({ error: e?.message || "Write failed" });
      }
    }
  );
}
