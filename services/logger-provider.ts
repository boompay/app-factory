import { EventEmitter } from "events";
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
      this.loggers.set(
        fileName,
        winston.createLogger({
          level: "info",
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(
              ({ timestamp, level, message }) =>
                `${timestamp} [${level.toUpperCase()}] ${message}`
            )
          ),
          transports: [
            new winston.transports.Console(),
            new winston.transports.File({ filename: `./logs/${fileName}.log` }),
            new SSETransport(),
          ],
        })
      );
    }
    return this.loggers.get(fileName)!;
  }
}
