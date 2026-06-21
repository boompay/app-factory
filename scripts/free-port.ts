import { execSync } from "child_process";

const port = Number(process.argv[2] ?? 3500);

function killPortOnWindows(targetPort: number): void {
  try {
    const output = execSync("netstat -ano -p TCP", { encoding: "utf8" });
    const pids = new Set<number>();

    for (const line of output.split("\n")) {
      if (!line.includes("LISTENING")) continue;
      const match = line.match(new RegExp(`:${targetPort}\\s+\\S+\\s+LISTENING\\s+(\\d+)`));
      if (!match) continue;

      const pid = Number(match[1]);
      if (pid > 0 && pid !== process.pid) {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Stopped process ${pid} on port ${targetPort}`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // No listeners on this port.
  }
}

function killPortOnUnix(targetPort: number): void {
  try {
    execSync(`lsof -ti:${targetPort} | xargs kill -9`, {
      stdio: "ignore",
      shell: "/bin/sh",
    });
    console.log(`Stopped process(es) on port ${targetPort}`);
  } catch {
    // No listeners on this port.
  }
}

if (process.platform === "win32") {
  killPortOnWindows(port);
} else {
  killPortOnUnix(port);
}
