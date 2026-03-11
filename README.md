# @shetty4l/telegram

Telegram Bot API client and MarkdownV2 utilities for Bun/TypeScript. Zero external dependencies (except `@shetty4l/core` for CLI config).

## Modules

| Module | Purpose |
|--------|---------|
| `api` | Raw Telegram Bot API client (fetch-based) with typed responses |
| `format` | Markdown → MarkdownV2 converter with placeholder-based escaping |
| `chunker` | MarkdownV2-aware message splitter at 4096 char limit |
| `config` | CLI config loading (env vars + topics.json) |

## Install

```bash
bun add @shetty4l/telegram
```

## Usage

### Library Usage

```typescript
import { sendMessage, formatForTelegram, chunkMarkdownV2 } from "@shetty4l/telegram";

// Convert markdown to Telegram's MarkdownV2 format
const text = formatForTelegram("**Bold** and *italic* text");

// Split long messages into 4096-char chunks
const chunks = chunkMarkdownV2(text);

// Send each chunk
for (const chunk of chunks) {
  await sendMessage(botToken, chatId, chunk, { parseMode: "MarkdownV2" });
}
```

### Sub-path imports

```typescript
import { sendMessage, getUpdates, TelegramApiError } from "@shetty4l/telegram/api";
import { formatForTelegram, escapeMarkdownV2Text } from "@shetty4l/telegram/format";
import { chunkMarkdownV2 } from "@shetty4l/telegram/chunker";
```

## CLI

The package includes a `tg` CLI for sending messages from scripts and prompts.

### Setup

```bash
export TELEGRAM_BOT_TOKEN=your_token
export TELEGRAM_CHAT_ID=your_chat_id
```

Optionally create `~/.config/tg/topics.json` for named topics:

```json
{
  "wilson": 123,
  "takumi": 456
}
```

### Commands

```bash
# Send a message (auto-converts markdown to MarkdownV2)
tg send "Hello **world**"

# Send to a named topic
tg send --topic wilson "Build complete"

# Send to a thread ID directly
tg send --topic 123 "Message to thread"

# Send file contents
tg send --file prompt.md

# Skip markdown conversion
tg send --plain "Literal **asterisks**"

# List configured topics
tg topics

# Get recent updates
tg updates
tg updates --limit 10

# Create a new forum topic
tg create-topic "Deployments"
```

### Verbose Mode

Add `--verbose` or `-v` to any command for detailed error output:

```bash
tg send --verbose "test message"
```

## API Reference

### sendMessage

```typescript
sendMessage(
  botToken: string,
  chatId: number,
  text: string,
  opts?: {
    threadId?: number;
    parseMode?: string;
    replyMarkup?: InlineKeyboardMarkup;
  }
): Promise<TelegramMessage>
```

### formatForTelegram

Converts standard Markdown to Telegram's MarkdownV2 format:
- `**bold**` → `*bold*`
- `*italic*` → `_italic_`
- `~~strike~~` → `~strike~`
- `# Heading` → `*Heading*`
- Escapes all special characters in plain text

### chunkMarkdownV2

Splits MarkdownV2 text into chunks ≤4096 chars while preserving formatting:
- Splits at paragraph/line/word boundaries when possible
- Re-wraps formatting markers (`*`, `_`, `` ` ``, `~`) around split content
- Handles fenced code blocks, links, and nested formatting

## Development

```bash
bun install
bun run validate    # typecheck + lint + format:check + test
bun run format      # auto-fix formatting
bun test            # run tests only
```
