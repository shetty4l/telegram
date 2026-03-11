/**
 * CLI command implementations for the tg tool.
 */

import { readFileSync } from "fs";
import {
  createForumTopic,
  getUpdates,
  sendMessage,
  type TelegramMessage,
} from "./api";
import { chunkMarkdownV2 } from "./chunker";
import {
  getTopicsPath,
  isConfigError,
  loadTgConfig,
  resolveTopicThreadId,
  type TgConfig,
} from "./config";
import { formatForTelegram } from "./format";

// --- Arg parsing helpers ---

interface ParsedSendArgs {
  topic?: string;
  file?: string;
  plain?: boolean;
  verbose?: boolean;
  message?: string;
}

function parseSendArgs(args: string[]): ParsedSendArgs {
  const result: ParsedSendArgs = {};
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === "--topic" || arg === "-t") {
      result.topic = args[++i];
    } else if (arg === "--file" || arg === "-f") {
      result.file = args[++i];
    } else if (arg === "--plain" || arg === "-p") {
      result.plain = true;
    } else if (arg === "--verbose" || arg === "-v") {
      result.verbose = true;
    } else if (!arg.startsWith("-")) {
      result.message = arg;
    }
    i++;
  }

  return result;
}

function parseVerbose(args: string[]): boolean {
  return args.includes("--verbose") || args.includes("-v");
}

function parseLimit(args: string[]): number {
  const limitIdx = args.findIndex((a) => a === "--limit" || a === "-l");
  if (limitIdx !== -1 && args[limitIdx + 1]) {
    const num = Number.parseInt(args[limitIdx + 1], 10);
    if (!Number.isNaN(num) && num > 0) {
      return num;
    }
  }
  return 100;
}

// --- Error handling ---

function printError(message: string, hint?: string): void {
  console.error(`Error: ${message}`);
  if (hint) {
    console.error(`Hint: ${hint}`);
  }
}

function printVerboseError(error: unknown, verbose: boolean): void {
  if (verbose && error instanceof Error) {
    console.error("\nStack trace:");
    console.error(error.stack);
  }
}

// --- Config loading helper ---

function requireConfig(): TgConfig | null {
  const result = loadTgConfig();
  if (isConfigError(result)) {
    printError(result.message, result.hint);
    return null;
  }
  return result;
}

// --- Commands ---

/**
 * Send a message to Telegram.
 *
 * Usage:
 *   tg send "message"
 *   tg send --topic wilson "message"
 *   tg send --file prompt.md
 *   tg send --plain "no markdown conversion"
 */
export async function cmdSend(args: string[], _json: boolean): Promise<number> {
  const parsed = parseSendArgs(args);

  // Get message content
  let content: string;
  if (parsed.file) {
    try {
      content = readFileSync(parsed.file, "utf-8");
    } catch (e) {
      printError(`Failed to read file: ${parsed.file}`);
      printVerboseError(e, parsed.verbose ?? false);
      return 1;
    }
  } else if (parsed.message) {
    content = parsed.message;
  } else {
    printError("No message provided");
    console.error('Usage: tg send "message" or tg send --file path.md');
    return 1;
  }

  // Load config
  const config = requireConfig();
  if (!config) return 1;

  // Resolve topic
  let threadId: number | undefined;
  if (parsed.topic) {
    threadId = resolveTopicThreadId(config, parsed.topic);
    if (threadId === undefined) {
      printError(
        `Topic '${parsed.topic}' not found`,
        `Add it to ${getTopicsPath()} or use a numeric thread ID`,
      );
      return 1;
    }
  }

  // Convert markdown unless --plain
  let text: string;
  let parseMode: string | undefined;
  if (parsed.plain) {
    text = content;
    parseMode = undefined;
  } else {
    text = formatForTelegram(content);
    parseMode = "MarkdownV2";
  }

  // Chunk if needed
  const chunks = chunkMarkdownV2(text);

  // Send each chunk
  try {
    for (const chunk of chunks) {
      await sendMessageWithFallback(
        config.botToken,
        config.chatId,
        chunk,
        threadId,
        parseMode,
        parsed.verbose ?? false,
      );
    }
    return 0;
  } catch (e) {
    printError(e instanceof Error ? e.message : String(e));
    printVerboseError(e, parsed.verbose ?? false);
    return 1;
  }
}

/**
 * Send a message with MarkdownV2, falling back to plain text on parse error.
 */
async function sendMessageWithFallback(
  botToken: string,
  chatId: number,
  text: string,
  threadId: number | undefined,
  parseMode: string | undefined,
  verbose: boolean,
): Promise<TelegramMessage> {
  try {
    return await sendMessage(botToken, chatId, text, {
      threadId,
      parseMode,
    });
  } catch (e) {
    // If MarkdownV2 parsing failed, retry without parse mode
    if (
      parseMode === "MarkdownV2" &&
      e instanceof Error &&
      e.message.includes("can't parse")
    ) {
      if (verbose) {
        console.error("MarkdownV2 parse failed, retrying as plain text...");
      }
      return await sendMessage(botToken, chatId, text, {
        threadId,
        parseMode: undefined,
      });
    }
    throw e;
  }
}

/**
 * List configured topics.
 *
 * Usage:
 *   tg topics
 */
export async function cmdTopics(
  args: string[],
  json: boolean,
): Promise<number> {
  const config = requireConfig();
  if (!config) return 1;

  const topicsPath = getTopicsPath();
  const topics = config.topics;
  const entries = Object.entries(topics);

  if (json) {
    console.log(JSON.stringify({ path: topicsPath, topics }));
    return 0;
  }

  if (entries.length === 0) {
    console.log(`No topics configured.`);
    console.log(`Create ${topicsPath} with format: { "name": threadId }`);
    return 0;
  }

  console.log(`Topics from ${topicsPath}:\n`);
  for (const [name, threadId] of entries) {
    console.log(`  ${name}: ${threadId}`);
  }
  return 0;
}

/**
 * Get recent updates from Telegram.
 *
 * Usage:
 *   tg updates
 *   tg updates --limit 10
 */
export async function cmdUpdates(
  args: string[],
  json: boolean,
): Promise<number> {
  const verbose = parseVerbose(args);
  const limit = parseLimit(args);

  const config = requireConfig();
  if (!config) return 1;

  try {
    // Use timeout of 0 for immediate return (no long polling)
    const updates = await getUpdates(config.botToken, undefined, 0);
    const recent = updates.slice(-limit);

    if (json) {
      console.log(JSON.stringify({ updates: recent, total: updates.length }));
      return 0;
    }

    if (recent.length === 0) {
      console.log("No recent updates.");
      return 0;
    }

    console.log(`Recent updates (${recent.length} of ${updates.length}):\n`);
    for (const update of recent) {
      const msg = update.message;
      if (msg) {
        const from = msg.from?.id ?? "unknown";
        const thread = msg.message_thread_id
          ? ` [thread:${msg.message_thread_id}]`
          : "";
        const preview = (msg.text ?? "(no text)").slice(0, 50);
        console.log(
          `  [${update.update_id}] from:${from}${thread} - ${preview}`,
        );
      } else if (update.callback_query) {
        const cb = update.callback_query;
        console.log(
          `  [${update.update_id}] callback from:${cb.from.id} - ${cb.data}`,
        );
      }
    }
    return 0;
  } catch (e) {
    printError(e instanceof Error ? e.message : String(e));
    printVerboseError(e, verbose);
    return 1;
  }
}

/**
 * Create a new forum topic.
 *
 * Usage:
 *   tg create-topic "Topic Name"
 */
export async function cmdCreateTopic(
  args: string[],
  json: boolean,
): Promise<number> {
  const verbose = parseVerbose(args);
  const name = args.find((a) => !a.startsWith("-"));

  if (!name) {
    printError("Topic name is required");
    console.error('Usage: tg create-topic "Topic Name"');
    return 1;
  }

  const config = requireConfig();
  if (!config) return 1;

  try {
    const result = await createForumTopic(config.botToken, config.chatId, name);

    if (json) {
      console.log(
        JSON.stringify({
          name,
          threadId: result.message_thread_id,
          chatId: config.chatId,
        }),
      );
    } else {
      console.log(`Created topic "${name}"`);
      console.log(`Thread ID: ${result.message_thread_id}`);
      console.log(`\nAdd to ${getTopicsPath()}:`);
      console.log(`  "${name.toLowerCase()}": ${result.message_thread_id}`);
    }
    return 0;
  } catch (e) {
    printError(e instanceof Error ? e.message : String(e));
    printVerboseError(e, verbose);
    return 1;
  }
}
