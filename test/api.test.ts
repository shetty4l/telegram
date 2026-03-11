import { describe, expect, mock, test } from "bun:test";
import {
  callTelegramApi,
  parseTelegramTopicKey,
  TelegramApiError,
} from "../src/api";

describe("parseTelegramTopicKey", () => {
  test("parses chat-only key", () => {
    expect(parseTelegramTopicKey("123456789")).toEqual({ chatId: 123456789 });
  });

  test("parses negative chat ID (group)", () => {
    expect(parseTelegramTopicKey("-1001234567890")).toEqual({
      chatId: -1001234567890,
    });
  });

  test("parses chat:thread key", () => {
    expect(parseTelegramTopicKey("123456789:42")).toEqual({
      chatId: 123456789,
      threadId: 42,
    });
  });

  test("parses negative chat:thread key", () => {
    expect(parseTelegramTopicKey("-1001234567890:123")).toEqual({
      chatId: -1001234567890,
      threadId: 123,
    });
  });

  test("returns null for empty string", () => {
    expect(parseTelegramTopicKey("")).toBeNull();
  });

  test("returns null for non-numeric chat ID", () => {
    expect(parseTelegramTopicKey("abc")).toBeNull();
  });

  test("returns null for non-numeric thread ID", () => {
    expect(parseTelegramTopicKey("123:abc")).toBeNull();
  });

  test("returns null for too many colons", () => {
    expect(parseTelegramTopicKey("123:456:789")).toBeNull();
  });

  test("returns null for floating point", () => {
    expect(parseTelegramTopicKey("123.456")).toBeNull();
  });

  test("returns null for unsafe integer", () => {
    // Number larger than Number.MAX_SAFE_INTEGER
    expect(parseTelegramTopicKey("9999999999999999999")).toBeNull();
  });
});

describe("TelegramApiError", () => {
  test("creates error with correct properties", () => {
    const error = new TelegramApiError("sendMessage", 400, "Bad request");
    expect(error.name).toBe("TelegramApiError");
    expect(error.method).toBe("sendMessage");
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("Bad request");
  });

  test("is instanceof Error", () => {
    const error = new TelegramApiError("test", 500, "error");
    expect(error).toBeInstanceOf(Error);
  });
});

describe("callTelegramApi", () => {
  const originalFetch = globalThis.fetch;

  test("makes POST request with correct headers", async () => {
    const mockFetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ ok: true, result: { id: 123 } }), {
          status: 200,
        }),
      ),
    );
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    try {
      const result = await callTelegramApi<{ id: number }>(
        "test-token",
        "getMe",
        {},
        5000,
      );

      expect(result).toEqual({ id: 123 });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const call = mockFetch.mock.calls[0];
      expect(call).toBeDefined();
      const [url, options] = call as unknown as [string, RequestInit];
      expect(url).toBe("https://api.telegram.org/bottest-token/getMe");
      expect(options.method).toBe("POST");
      expect(options.headers).toEqual({ "Content-Type": "application/json" });
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("throws TelegramApiError on non-ok envelope", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            ok: false,
            error_code: 400,
            description: "Bad Request: chat not found",
          }),
          { status: 200 },
        ),
      ),
    ) as unknown as typeof fetch;

    try {
      await expect(
        callTelegramApi("token", "sendMessage", {}, 5000),
      ).rejects.toThrow(TelegramApiError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("throws TelegramApiError on HTTP error", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("Internal Server Error", { status: 500 })),
    ) as unknown as typeof fetch;

    try {
      await expect(
        callTelegramApi("token", "sendMessage", {}, 5000),
      ).rejects.toThrow(TelegramApiError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("throws TelegramApiError on invalid JSON", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(new Response("not json", { status: 200 })),
    ) as unknown as typeof fetch;

    try {
      await expect(
        callTelegramApi("token", "sendMessage", {}, 5000),
      ).rejects.toThrow("invalid JSON");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test("throws TelegramApiError on network error", async () => {
    globalThis.fetch = mock(() =>
      Promise.reject(new Error("Network unreachable")),
    ) as unknown as typeof fetch;

    try {
      await expect(
        callTelegramApi("token", "sendMessage", {}, 5000),
      ).rejects.toThrow(TelegramApiError);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
