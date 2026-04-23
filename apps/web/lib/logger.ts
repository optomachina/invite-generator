// Minimal structured logger. Emits single-line JSON to stderr so Vercel/Fly
// log drains parse it cleanly. No external deps — anything fancier (sampling,
// redaction, OTel) gets added when we have a real log pipeline.

export type LogLevel = "debug" | "info" | "warn" | "error";

export type LogFields = Record<string, unknown>;

type Sink = (line: string) => void;

let sink: Sink = (line) => {
  // eslint-disable-next-line no-console
  console.error(line);
};

export function setLogSink(next: Sink): Sink {
  const prev = sink;
  sink = next;
  return prev;
}

function serializeError(err: unknown): LogFields {
  if (err instanceof Error) {
    return { name: err.name, message: err.message, stack: err.stack };
  }
  return { message: String(err) };
}

export function log(level: LogLevel, event: string, fields: LogFields = {}): void {
  const payload: LogFields = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  if (fields.err !== undefined) {
    payload.err = serializeError(fields.err);
  }
  try {
    sink(JSON.stringify(payload));
  } catch {
    // A field was not serializable. Fall back to a best-effort record so the
    // caller's error signal is never lost to a logger bug.
    sink(JSON.stringify({ ts: payload.ts, level, event, logger_error: "serialize_failed" }));
  }
}

export const logger = {
  debug: (event: string, fields?: LogFields) => log("debug", event, fields),
  info: (event: string, fields?: LogFields) => log("info", event, fields),
  warn: (event: string, fields?: LogFields) => log("warn", event, fields),
  error: (event: string, fields?: LogFields) => log("error", event, fields),
};
