import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import {
  type ConfigError,
  getTopicsPath,
  isConfigError,
  loadTgConfig,
  resolveTopicThreadId,
  type TgConfig,
} from "../src/config";

describe("loadTgConfig", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    // Reset env to original state
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  afterEach(() => {
    // Restore original env
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
  });

  test("returns error when TELEGRAM_BOT_TOKEN is missing", () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    process.env.TELEGRAM_CHAT_ID = "123";

    const result = loadTgConfig();
    expect(isConfigError(result)).toBe(true);
    expect((result as ConfigError).message).toContain("TELEGRAM_BOT_TOKEN");
  });

  test("returns error when TELEGRAM_CHAT_ID is missing", () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    delete process.env.TELEGRAM_CHAT_ID;

    const result = loadTgConfig();
    expect(isConfigError(result)).toBe(true);
    expect((result as ConfigError).message).toContain("TELEGRAM_CHAT_ID");
  });

  test("returns error when TELEGRAM_CHAT_ID is not a number", () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "not-a-number";

    const result = loadTgConfig();
    expect(isConfigError(result)).toBe(true);
    expect((result as ConfigError).message).toContain("must be a number");
  });

  test("returns config when env vars are set", () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "123456789";

    const result = loadTgConfig();
    expect(isConfigError(result)).toBe(false);

    const config = result as TgConfig;
    expect(config.botToken).toBe("test-token");
    expect(config.chatId).toBe(123456789);
    expect(config.topics).toEqual({});
  });

  test("parses negative chat ID", () => {
    process.env.TELEGRAM_BOT_TOKEN = "test-token";
    process.env.TELEGRAM_CHAT_ID = "-1001234567890";

    const result = loadTgConfig();
    expect(isConfigError(result)).toBe(false);
    expect((result as TgConfig).chatId).toBe(-1001234567890);
  });
});

describe("resolveTopicThreadId", () => {
  const config: TgConfig = {
    botToken: "test",
    chatId: 123,
    topics: {
      wilson: 42,
      takumi: 99,
    },
  };

  test("resolves numeric thread ID directly", () => {
    expect(resolveTopicThreadId(config, "123")).toBe(123);
    expect(resolveTopicThreadId(config, "999")).toBe(999);
  });

  test("resolves named topic from config", () => {
    expect(resolveTopicThreadId(config, "wilson")).toBe(42);
    expect(resolveTopicThreadId(config, "takumi")).toBe(99);
  });

  test("returns undefined for unknown topic name", () => {
    expect(resolveTopicThreadId(config, "unknown")).toBeUndefined();
  });

  test("treats numeric strings as IDs, not names", () => {
    const configWithNumericName: TgConfig = {
      ...config,
      topics: { "123": 456 },
    };
    // "123" should be parsed as number 123, not looked up as topic name "123"
    expect(resolveTopicThreadId(configWithNumericName, "123")).toBe(123);
  });

  test("handles topic names that look like numbers but aren't exact", () => {
    // "123abc" is not a valid number, so should be looked up as name
    expect(resolveTopicThreadId(config, "123abc")).toBeUndefined();
  });
});

describe("getTopicsPath", () => {
  test("returns path under XDG config dir", () => {
    const path = getTopicsPath();
    expect(path).toContain("tg");
    expect(path).toContain("topics.json");
  });
});

describe("isConfigError", () => {
  test("returns true for error objects", () => {
    const error: ConfigError = { message: "test error" };
    expect(isConfigError(error)).toBe(true);
  });

  test("returns false for config objects", () => {
    const config: TgConfig = {
      botToken: "test",
      chatId: 123,
      topics: {},
    };
    expect(isConfigError(config)).toBe(false);
  });
});
