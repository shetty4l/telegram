/**
 * Configuration loading for the tg CLI.
 *
 * Reads TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID from environment,
 * and loads topics from ~/.config/tg/topics.json.
 */

import { config as coreConfig } from "@shetty4l/core";
import { existsSync, readFileSync } from "fs";
import { join } from "path";

export interface TgConfig {
  botToken: string;
  chatId: number;
  topics: Record<string, number>; // name -> threadId
}

export interface ConfigError {
  message: string;
  hint?: string;
}

/**
 * Load tg configuration from environment and topics file.
 * Returns the config or an error with a user-friendly message.
 */
export function loadTgConfig(): TgConfig | ConfigError {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return {
      message: "TELEGRAM_BOT_TOKEN environment variable is required",
      hint: "Export your bot token: export TELEGRAM_BOT_TOKEN=your_token",
    };
  }

  const chatIdRaw = process.env.TELEGRAM_CHAT_ID;
  if (!chatIdRaw) {
    return {
      message: "TELEGRAM_CHAT_ID environment variable is required",
      hint: "Export your chat ID: export TELEGRAM_CHAT_ID=123456789",
    };
  }

  const chatId = Number.parseInt(chatIdRaw, 10);
  if (Number.isNaN(chatId)) {
    return {
      message: `TELEGRAM_CHAT_ID must be a number, got: ${chatIdRaw}`,
    };
  }

  const topics = loadTopics();

  return {
    botToken,
    chatId,
    topics: topics ?? {},
  };
}

/**
 * Load topics from ~/.config/tg/topics.json if it exists.
 * Returns null if the file doesn't exist or is invalid.
 */
function loadTopics(): Record<string, number> | null {
  const configDir = coreConfig.getConfigDir("tg");
  const topicsPath = join(configDir, "topics.json");

  if (!existsSync(topicsPath)) {
    return null;
  }

  try {
    const rawText = readFileSync(topicsPath, "utf-8");
    const parsed = JSON.parse(rawText);

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }

    // Validate all values are numbers
    const topics: Record<string, number> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === "number" && Number.isFinite(value)) {
        topics[key] = value;
      }
    }

    return topics;
  } catch {
    return null;
  }
}

/**
 * Get the path to the topics config file.
 */
export function getTopicsPath(): string {
  return join(coreConfig.getConfigDir("tg"), "topics.json");
}

/**
 * Resolve a topic argument to a threadId.
 * - If topicArg is a number string, parse it directly
 * - If topicArg is a name, look it up in config.topics
 * - Returns undefined if not found
 */
export function resolveTopicThreadId(
  config: TgConfig,
  topicArg: string,
): number | undefined {
  // Try parsing as a number first
  const asNumber = Number.parseInt(topicArg, 10);
  if (!Number.isNaN(asNumber) && String(asNumber) === topicArg) {
    return asNumber;
  }

  // Look up by name
  return config.topics[topicArg];
}

/**
 * Type guard to check if result is an error.
 */
export function isConfigError(
  result: TgConfig | ConfigError,
): result is ConfigError {
  return "message" in result && !("botToken" in result);
}
