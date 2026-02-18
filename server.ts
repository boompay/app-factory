import express from "express";
import path from "path";
import { logEmitter } from "./services/logger-provider";
import { APP_CONFIG, applyConfigOverrides, resetConfig } from "./config/app.config";
import { run, resetRunnerState } from "./runner";

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "web")));

let isRunning = false;

// Serve the UI
app.get("/", (_req, res) => {
  res.sendFile(path.join(__dirname, "web", "index.html"));
});

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
