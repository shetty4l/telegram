/**
 * @shetty4l/telegram
 *
 * Telegram Bot API client and MarkdownV2 utilities for Bun/TypeScript.
 *
 * Import from the root for convenience, or from sub-paths for specificity:
 *   import { sendMessage, formatForTelegram, chunkMarkdownV2 } from "@shetty4l/telegram"
 *   import { sendMessage } from "@shetty4l/telegram/api"
 *   import { formatForTelegram } from "@shetty4l/telegram/format"
 */

// Types from API
export type {
  CallbackQuery,
  ForumTopic,
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  SendMessageOptions,
  TelegramMessage,
  TelegramTopic,
  TelegramUpdate,
} from "./api";
// API module
export {
  // High-level API functions
  answerCallbackQuery,
  // Core API function
  callTelegramApi,
  createForumTopic,
  deleteForumTopic,
  editMessageReplyMarkup,
  getUpdates,
  // Utilities
  parseTelegramTopicKey,
  sendMessage,
  // Constants
  TELEGRAM_API_BASE_URL,
  TELEGRAM_MAX_MESSAGE_LENGTH,
  // Error class
  TelegramApiError,
} from "./api";
// Chunker module
export { chunkMarkdownV2 } from "./chunker";
// Config module (as namespace for CLI consumers)
export * as config from "./config";
// Format module
export {
  convertMarkdownToTelegram,
  escapeMarkdownV2Code,
  escapeMarkdownV2LinkUrl,
  escapeMarkdownV2Text,
  formatForTelegram,
} from "./format";
