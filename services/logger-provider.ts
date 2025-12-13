import winston, { Logger } from "winston";

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
          ],
        })
      );
    }
    return this.loggers.get(fileName)!;
  }
}
