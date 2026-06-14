// Emulates the C# `ILogger<T>` contract: per-level methods that accept a message,
// an optional exception, and arbitrary structured args. `T` is the consumer's
// class so the logger can stamp the source class name in the output.
// biome-ignore lint/correctness/noUnusedVariables: T is consumed via instantiation, kept for ergonomic parity with C# ILogger<T>
export interface ILogger<T> {
  logDebug(message?: string, exception?: Error, ...args: object[]): void;
  logTrace(message?: string, exception?: Error, ...args: object[]): void;
  logInformation(message?: string, exception?: Error, ...args: object[]): void;
  logWarning(message?: string, exception?: Error, ...args: object[]): void;
  logError(message?: string, exception?: Error, ...args: object[]): void;
  logCritical(message?: string, exception?: Error, ...args: object[]): void;
}
