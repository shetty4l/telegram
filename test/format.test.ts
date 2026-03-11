import { describe, expect, test } from "bun:test";
import {
  convertMarkdownToTelegram,
  escapeMarkdownV2Code,
  escapeMarkdownV2LinkUrl,
  escapeMarkdownV2Text,
  formatForTelegram,
} from "../src/format";

describe("escapeMarkdownV2Text", () => {
  test("escapes special characters", () => {
    expect(escapeMarkdownV2Text("hello_world")).toBe("hello\\_world");
    expect(escapeMarkdownV2Text("*bold*")).toBe("\\*bold\\*");
    expect(escapeMarkdownV2Text("test.dot")).toBe("test\\.dot");
    expect(escapeMarkdownV2Text("a-b")).toBe("a\\-b");
  });

  test("escapes multiple special characters", () => {
    expect(escapeMarkdownV2Text("a_b*c.d")).toBe("a\\_b\\*c\\.d");
  });

  test("leaves plain text unchanged", () => {
    expect(escapeMarkdownV2Text("hello world")).toBe("hello world");
  });

  test("escapes all MarkdownV2 reserved chars", () => {
    const special = "_*[]()~`>#+-=|{}.!\\";
    const escaped = escapeMarkdownV2Text(special);
    // Each char should be preceded by backslash
    expect(escaped).toContain("\\_");
    expect(escaped).toContain("\\*");
    expect(escaped).toContain("\\[");
    expect(escaped).toContain("\\]");
  });
});

describe("escapeMarkdownV2Code", () => {
  test("escapes backticks and backslashes in code", () => {
    expect(escapeMarkdownV2Code("code`here")).toBe("code\\`here");
    expect(escapeMarkdownV2Code("path\\to\\file")).toBe("path\\\\to\\\\file");
  });

  test("leaves other special chars unchanged in code", () => {
    expect(escapeMarkdownV2Code("a_b*c")).toBe("a_b*c");
  });
});

describe("escapeMarkdownV2LinkUrl", () => {
  test("escapes parentheses in URLs", () => {
    expect(escapeMarkdownV2LinkUrl("http://example.com/page(1)")).toBe(
      "http://example.com/page\\(1\\)",
    );
  });

  test("escapes backslashes in URLs", () => {
    expect(escapeMarkdownV2LinkUrl("http://example.com\\test")).toBe(
      "http://example.com\\\\test",
    );
  });

  test("escapes extra chars in tg:// URLs", () => {
    expect(escapeMarkdownV2LinkUrl("tg://resolve?domain=test")).toBe(
      "tg://resolve\\?domain\\=test",
    );
  });
});

describe("convertMarkdownToTelegram", () => {
  test("converts headings to bold", () => {
    expect(convertMarkdownToTelegram("# Title")).toBe("*Title*");
    expect(convertMarkdownToTelegram("## Subtitle")).toBe("*Subtitle*");
    expect(convertMarkdownToTelegram("### H3")).toBe("*H3*");
  });

  test("converts bold markdown", () => {
    expect(convertMarkdownToTelegram("**bold text**")).toBe("*bold text*");
  });

  test("converts italic markdown", () => {
    expect(convertMarkdownToTelegram("*italic text*")).toBe("_italic text_");
  });

  test("converts strikethrough", () => {
    expect(convertMarkdownToTelegram("~~strikethrough~~")).toBe(
      "~strikethrough~",
    );
  });

  test("converts inline code", () => {
    expect(convertMarkdownToTelegram("`code`")).toBe("`code`");
    // Special chars inside code should only have backticks escaped
    expect(convertMarkdownToTelegram("`var a = 1`")).toBe("`var a = 1`");
  });

  test("preserves fenced code blocks", () => {
    const input = "```\ncode\n```";
    const output = convertMarkdownToTelegram(input);
    expect(output).toContain("```");
    expect(output).toContain("code");
  });

  test("converts links", () => {
    const input = "[text](https://example.com)";
    const output = convertMarkdownToTelegram(input);
    expect(output).toContain("[text]");
    expect(output).toContain("(https://example.com)");
  });

  test("converts bullet lists", () => {
    expect(convertMarkdownToTelegram("- item")).toContain("•");
    expect(convertMarkdownToTelegram("* item")).toContain("•");
    expect(convertMarkdownToTelegram("+ item")).toContain("•");
  });

  test("escapes special characters in plain text", () => {
    expect(convertMarkdownToTelegram("hello.world")).toBe("hello\\.world");
  });

  test("handles mixed content", () => {
    const input = "# Header\n\nSome **bold** and *italic* text.\n\n- Item 1";
    const output = convertMarkdownToTelegram(input);
    expect(output).toContain("*Header*"); // heading
    expect(output).toContain("*bold*"); // bold
    expect(output).toContain("_italic_"); // italic
    expect(output).toContain("•"); // bullet
  });
});

describe("formatForTelegram", () => {
  test("is alias for convertMarkdownToTelegram", () => {
    const input = "**test**";
    expect(formatForTelegram(input)).toBe(convertMarkdownToTelegram(input));
  });
});
