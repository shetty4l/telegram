import { describe, expect, test } from "bun:test";
import { chunkMarkdownV2 } from "../src/chunker";

describe("chunkMarkdownV2", () => {
  test("returns single chunk for short message", () => {
    const text = "Hello world";
    const chunks = chunkMarkdownV2(text);
    expect(chunks).toEqual(["Hello world"]);
  });

  test("returns single chunk for exactly max length", () => {
    const text = "a".repeat(4096);
    const chunks = chunkMarkdownV2(text);
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe(text);
  });

  test("splits long plain text at boundaries", () => {
    const text = "a".repeat(5000);
    const chunks = chunkMarkdownV2(text);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.join("")).toBe(text);
    // Each chunk should be <= 4096
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });

  test("preserves bold formatting across chunks", () => {
    // Create a very long bold text that needs splitting
    const content = "x".repeat(5000);
    const text = `*${content}*`;
    const chunks = chunkMarkdownV2(text);

    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should be properly wrapped with asterisks
    for (const chunk of chunks) {
      expect(chunk.startsWith("*")).toBe(true);
      expect(chunk.endsWith("*")).toBe(true);
    }
  });

  test("preserves italic formatting across chunks", () => {
    const content = "x".repeat(5000);
    const text = `_${content}_`;
    const chunks = chunkMarkdownV2(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.startsWith("_")).toBe(true);
      expect(chunk.endsWith("_")).toBe(true);
    }
  });

  test("preserves inline code formatting across chunks", () => {
    const content = "x".repeat(5000);
    const text = `\`${content}\``;
    const chunks = chunkMarkdownV2(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.startsWith("`")).toBe(true);
      expect(chunk.endsWith("`")).toBe(true);
    }
  });

  test("preserves fenced code blocks across chunks", () => {
    const content = "x".repeat(5000);
    const text = "```\n" + content + "\n```";
    const chunks = chunkMarkdownV2(text);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.startsWith("```")).toBe(true);
      expect(chunk.endsWith("```")).toBe(true);
    }
  });

  test("splits at newline boundaries when possible", () => {
    // 200 lines of 30 chars each = 6000+ chars, exceeds 4096
    const lines = Array(200).fill("This is a line of text......").join("\n");
    const chunks = chunkMarkdownV2(lines);

    // Should have split somewhere
    expect(chunks.length).toBeGreaterThan(1);

    // Chunks should mostly end at newlines (best-effort)
    const totalContent = chunks.join("");
    expect(totalContent).toBe(lines);
  });

  test("handles escaped backslashes correctly", () => {
    // Trailing backslash should not be split
    const text = "a\\\\".repeat(3000);
    const chunks = chunkMarkdownV2(text);

    // Should not break in the middle of an escape sequence
    for (const chunk of chunks) {
      // Count backslashes at end - should be even
      let trailingSlashes = 0;
      for (let i = chunk.length - 1; i >= 0 && chunk[i] === "\\"; i--) {
        trailingSlashes++;
      }
      expect(trailingSlashes % 2).toBe(0);
    }
  });

  test("handles custom max length", () => {
    const text = "a".repeat(100);
    const chunks = chunkMarkdownV2(text, 50);
    expect(chunks.length).toBe(2);
    expect(chunks[0].length).toBe(50);
    expect(chunks[1].length).toBe(50);
  });

  test("handles empty string", () => {
    const chunks = chunkMarkdownV2("");
    expect(chunks).toEqual([""]);
  });

  test("handles links that span chunks", () => {
    const longLinkText = "x".repeat(5000);
    const text = `[${longLinkText}](https://example.com)`;
    const chunks = chunkMarkdownV2(text);

    expect(chunks.length).toBeGreaterThan(1);
    // Each chunk should have proper link format
    for (const chunk of chunks) {
      expect(chunk.startsWith("[")).toBe(true);
      expect(chunk).toContain("](https://example.com)");
    }
  });

  test("handles mixed content", () => {
    const parts = [
      "*bold text*",
      " plain text ",
      "_italic_",
      " more plain ",
      "`code`",
    ];
    const text = parts.join("").repeat(100);
    const chunks = chunkMarkdownV2(text);

    // All content should be preserved
    expect(chunks.join("")).toBe(text);

    // All chunks should respect max length
    for (const chunk of chunks) {
      expect(chunk.length).toBeLessThanOrEqual(4096);
    }
  });
});
