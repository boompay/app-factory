import { EventEmitter } from "events";
import fs from "fs";
import path from "path";
import winston, { Logger } from "winston";
import Transport from "winston-transport";

export const logEmitter = new EventEmitter();
logEmitter.setMaxListeners(50);

class SSETransport extends Transport {
  log(info: any, callback: () => void) {
    setImmediate(() => {
      logEmitter.emit("log", {
        timestamp: info.timestamp,
        level: info.level,
        message: info.message,
      });
    });
    callback();
  }
}

export class LoggerProvider {
  private static loggers: Map<string, Logger> = new Map<string, Logger>();

  public static create(fileName: string): Logger {
    if (!this.loggers.has(fileName)) {
      const logsDir = path.join(process.cwd(), "logs");

      const logger = winston.createLogger({
        level: "info",
        exitOnError: false,
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.printf(
            ({ timestamp, level, message }) =>
              `${timestamp} [${level.toUpperCase()}] ${message}`
          )
        ),
        transports: [new winston.transports.Console(), new SSETransport()],
      });

      // Best-effort file logging. If the file is locked/blocked (EPERM on Windows),
      // skip file transport entirely — otherwise winston can throw "write after end".
      try {
        fs.mkdirSync(logsDir, { recursive: true });
        const logPath = path.join(logsDir, `${fileName}.log`);
        try {
          const fd = fs.openSync(logPath, "a");
          fs.closeSync(fd);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[logger] file transport disabled (${fileName}): ${message}`);
          this.loggers.set(fileName, logger);
          logger.on("error", (e) => {
            console.error(`[logger] ${fileName}: ${e.message}`);
          });
          return logger;
        }

        const fileTransport = new winston.transports.File({ filename: logPath });

        const detachFileTransport = (err: unknown) => {
          const message = err instanceof Error ? err.message : String(err);
          console.error(`[logger] file transport (${fileName}): ${message}`);
          try {
            logger.remove(fileTransport);
          } catch {
            // ignore
          }
          try {
            fileTransport.close?.();
          } catch {
            // ignore
          }
        };

        fileTransport.on("error", detachFileTransport);
        logger.add(fileTransport);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`[logger] file transport disabled (${fileName}): ${message}`);
      }

      logger.on("error", (err) => {
        console.error(`[logger] ${fileName}: ${err.message}`);
      });

      this.loggers.set(fileName, logger);
    }
    return this.loggers.get(fileName)!;
  }
}
