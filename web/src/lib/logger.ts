interface Logger {
  debug: (message: string, ...args: unknown[]) => void;
  info: (message: string, ...args: unknown[]) => void;
  warn: (message: string, ...args: unknown[]) => void;
  error: (message: string, error?: unknown, ...args: unknown[]) => void;
}

export function createLogger(prefix: string, enabled?: boolean): Logger {
  const formatMessage = (message: string) => `[${prefix}] ${message}`;

  const shouldLog = () => {
    if (enabled !== undefined) return enabled;
    return (
      typeof window !== "undefined" && process.env.NODE_ENV === "development"
    );
  };

  return {
    debug: (message: string, ...args: unknown[]) => {
      if (shouldLog()) {
        console.log(formatMessage(message), ...args);
      }
    },
    info: (message: string, ...args: unknown[]) => {
      if (shouldLog()) {
        console.info(formatMessage(message), ...args);
      }
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(formatMessage(message), ...args);
    },
    error: (message: string, error?: unknown, ...args: unknown[]) => {
      if (error) {
        console.error(formatMessage(message), error, ...args);
      } else {
        console.error(formatMessage(message), ...args);
      }
    },
  };
}

export const logger = createLogger("App");

export function createComponentLogger(componentName: string): Logger {
  return createLogger(componentName);
}
