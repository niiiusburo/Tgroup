import type { ILogger } from "@interfaces/common/ILogger";
import * as pc from "picocolors";
import type { Formatter } from "picocolors/types";
import { EventId } from "./EventId";

type Level = "DEBUG" | "TRACE" | "INFO" | "WARN" | "ERROR" | "CRITICAL";

const LEVEL_COLORS: Record<Level, Formatter> = {
  DEBUG: (t) => pc.italic(pc.blue(t)),
  TRACE: (t) => pc.italic(pc.green(t)),
  INFO: (t) => pc.italic(pc.white(t)),
  WARN: (t) => pc.italic(pc.yellow(t)),
  ERROR: (t) => pc.italic(pc.red(t)),
  CRITICAL: (t) => pc.italic(pc.red(t)),
};

const headerLabel = (text: string) => pc.bold(pc.dim(text));

export class Logger<T> implements ILogger<T> {
  private readonly className: string;

  constructor() {
    this.className = this.getClassName(Object.create(this.constructor.prototype));
  }

  logDebug(message?: string, exception?: Error, ...args: object[]): void {
    this.log("DEBUG", EventId.Create("Debug"), message, exception, args);
  }
  logTrace(message?: string, exception?: Error, ...args: object[]): void {
    this.log("TRACE", EventId.Create("Stack Trace"), message, exception, args);
  }
  logInformation(message?: string, exception?: Error, ...args: object[]): void {
    this.log("INFO", EventId.Create("Information"), message, exception, args);
  }
  logWarning(message?: string, exception?: Error, ...args: object[]): void {
    this.log("WARN", EventId.Create("Warning"), message, exception, args);
  }
  logError(message?: string, exception?: Error, ...args: object[]): void {
    this.log("ERROR", EventId.Create("Error"), message, exception, args);
  }
  logCritical(message?: string, exception?: Error, ...args: object[]): void {
    this.log("CRITICAL", EventId.Create("Critical Error"), message, exception, args);
  }

  getClassName(instance: T): string {
    return (instance as { constructor?: { name?: string } })?.constructor?.name ?? "Unknown";
  }

  private log(
    level: Level,
    eventId: EventId,
    message?: string,
    exception?: Error,
    ...args: object[]
  ): void {
    const colorize = LEVEL_COLORS[level] ?? ((t: string) => t);

    console.log("");
    console.log(colorize(headerLabel(`${level}: ${this.className}[${eventId.Id ?? 0}]`)));

    if (message || exception) {
      console.log("");
      console.log(`   ${message ?? exception?.message ?? ""}`);
    }

    if (args && args.length > 0) {
      console.log(`   ${pc.blue(headerLabel("Args:"))} ${JSON.stringify(args)}`);
    }

    if (exception) {
      console.log(`   ${pc.red(headerLabel("Exception:"))} ${exception.stack}`);
    }
  }
}
