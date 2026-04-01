import express from "express";
import fs from "fs/promises";
import path from "path";
import fetch from "node-fetch";
import { logEmitter } from "./services/logger-provider";
import { APP_CONFIG, applyConfigOverrides, resetConfig } from "./config/app.config";
import { run, resetRunnerState } from "./runner";

const WIREMOCK_URL = process.env.WIREMOCK_URL || "https://wiremock.staging.boompay.app";
/** Directory with WireMock __files (response bodies). Same path WireMock uses; edits are picked up on next request. */
const WIREMOCK_FILES_DIR = process.env.WIREMOCK_FILES_DIR || "";

const app = express();
app.use(express.json());
/** API routes must be registered before `express.static` so `/api/*` is never shadowed by files under `web/`. */

async function wiremockProxy(
  req: express.Request,
  res: express.Response,
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
    } else if (method !== "GET" && req.body && Object.keys(req.body).length > 0) {
      init.body = JSON.stringify(req.body);
    }
    const response = await fetch(url, init);
    const text = await response.text();
    res.status(response.status).set("Content-Type", response.headers.get("Content-Type") || "application/json");
    res.send(text || "{}");
  } catch (err: any) {
    res.status(502).json({ error: "WireMock unreachable", detail: err?.message || String(err) });
  }
}

app.get("/api/wiremock/mappings", (req, res) => wiremockProxy(req, res, "/__admin/mappings"));
app.post("/api/wiremock/mappings", (req, res) => wiremockProxy(req, res, "/__admin/mappings"));
/** Prefer this path in the UI — short and unambiguous vs `mappings/:id`. */
app.post("/api/wiremock/find-by-metadata", (req, res) =>
  wiremockProxy(req, res, "/__admin/mappings/find-by-metadata")
);
app.post("/api/wiremock/mappings/find-by-metadata", (req, res) =>
  wiremockProxy(req, res, "/__admin/mappings/find-by-metadata")
);
app.get("/api/wiremock/mappings/:id", (req, res) => wiremockProxy(req, res, `/__admin/mappings/${req.params.id}`));
app.put("/api/wiremock/mappings/:id", (req, res) => wiremockProxy(req, res, `/__admin/mappings/${req.params.id}`));
app.delete("/api/wiremock/mappings/:id", (req, res) => wiremockProxy(req, res, `/__admin/mappings/${req.params.id}`));
app.get("/api/wiremock/requests", (req, res) => wiremockProxy(req, res, "/__admin/requests"));
app.post("/api/wiremock/requests/reset", (req, res) => wiremockProxy(req, res, "/__admin/requests/reset", { method: "POST" }));

function safeFilePath(filename: string): string | null {
  if (!WIREMOCK_FILES_DIR || !filename || /[\\/]/.test(filename) || filename.includes("..")) return null;
  const resolved = path.resolve(WIREMOCK_FILES_DIR, filename);
  const base = path.resolve(WIREMOCK_FILES_DIR);
  return resolved.startsWith(base) ? resolved : null;
}

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
  } catch (err: any) {
    if (err?.code === "ENOENT") res.status(404).json({ error: "File not found" });
    else res.status(500).json({ error: err?.message || "Read failed" });
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
    } catch (err: any) {
      res.status(500).json({ error: err?.message || "Write failed" });
    }
  }
);

let isRunning = false;

// Serve the UI (after API routes)
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});
app.use(express.static(path.join(__dirname, "web")));

// Return current config defaults
app.get("/api/config", (_req, res) => {
  res.json({
    ACTORS: APP_CONFIG.ACTORS,
    DEFAULT_VALUES: APP_CONFIG.DEFAULT_VALUES,
    TIMEOUTS: APP_CONFIG.TIMEOUTS,
    RETRY: APP_CONFIG.RETRY,
  });
});

// Return run status
app.get("/api/status", (_req, res) => {
  res.json({ running: isRunning });
});

// SSE log stream
app.get("/api/logs", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const onLog = (entry: { timestamp: string; level: string; message: string }) => {
    res.write(`data: ${JSON.stringify(entry)}\n\n`);
  };

  logEmitter.on("log", onLog);

  req.on("close", () => {
    logEmitter.off("log", onLog);
  });
});

// Start a run
app.post("/api/run", (req, res) => {
  if (isRunning) {
    res.status(409).json({ error: "A run is already in progress" });
    return;
  }

  const { magicLink, overrides } = req.body;
  if (!magicLink) {
    res.status(400).json({ error: "magicLink is required" });
    return;
  }

  isRunning = true;
  resetConfig();
  resetRunnerState();
  if (overrides) {
    applyConfigOverrides(overrides);
  }

  res.json({ status: "started" });

  run(magicLink)
    .then(() => {
      logEmitter.emit("log", {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "__RUN_COMPLETE__",
      });
    })
    .catch((error) => {
      logEmitter.emit("log", {
        timestamp: new Date().toISOString(),
        level: "error",
        message: `Run failed: ${error.message || error}`,
      });
      logEmitter.emit("log", {
        timestamp: new Date().toISOString(),
        level: "info",
        message: "__RUN_COMPLETE__",
      });
    })
    .finally(() => {
      isRunning = false;
    });
});

const PORT = 3500;
app.listen(PORT, () => {
  console.log(`App Factory UI running at http://localhost:${PORT}`);
});
