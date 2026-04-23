import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { logger, setLogSink } from "./logger";

let lines: string[] = [];
let restore: (line: string) => void;

beforeEach(() => {
  lines = [];
  restore = setLogSink((line) => lines.push(line));
});

afterEach(() => {
  setLogSink(restore);
});

describe("logger", () => {
  test("emits one JSON line per call with ts/level/event", () => {
    logger.info("unit.test", { foo: "bar" });
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.level).toBe("info");
    expect(parsed.event).toBe("unit.test");
    expect(parsed.foo).toBe("bar");
    expect(typeof parsed.ts).toBe("string");
    expect(new Date(parsed.ts).toString()).not.toBe("Invalid Date");
  });

  test("serializes Error objects into name/message/stack", () => {
    const err = new Error("boom");
    logger.error("op.failed", { err });
    const parsed = JSON.parse(lines[0]);
    expect(parsed.err.name).toBe("Error");
    expect(parsed.err.message).toBe("boom");
    expect(typeof parsed.err.stack).toBe("string");
  });

  test("serializes non-Error throwables to a message string", () => {
    logger.error("op.failed", { err: "stringified" });
    const parsed = JSON.parse(lines[0]);
    expect(parsed.err.message).toBe("stringified");
  });

  test("emits a fallback record when a field is unserializable", () => {
    const bad: Record<string, unknown> = {};
    bad.self = bad;
    logger.warn("cyclic", { bad });
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.logger_error).toBe("serialize_failed");
    expect(parsed.event).toBe("cyclic");
  });

  test("each level routes through the sink", () => {
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");
    expect(lines.map((l) => JSON.parse(l).level)).toEqual(["debug", "info", "warn", "error"]);
  });
});
