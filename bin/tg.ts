#!/usr/bin/env bun
/**
 * tg - Telegram Bot API CLI
 *
 * Usage:
 *   tg send "message"              Send a message to default chat
 *   tg send --topic wilson "msg"   Send to a named topic
 *   tg send --file prompt.md       Send file contents
 *   tg topics                      List configured topics
 *   tg updates                     Get recent messages
 *   tg create-topic "Name"         Create a forum topic
 */

import { cli, readVersion } from "@shetty4l/core";
import { cmdCreateTopic, cmdSend, cmdTopics, cmdUpdates } from "../src/cli";

const VERSION = readVersion(import.meta.dir);

const HELP = `tg - Telegram Bot API CLI

Usage:
  tg <command> [options]

Commands:
  send [message]        Send a message
    --topic, -t <name>  Send to a named topic or thread ID
    --file, -f <path>   Send file contents instead of message arg
    --plain, -p         Skip markdown conversion
    --verbose, -v       Show detailed errors

  topics                List configured topics from ~/.config/tg/topics.json

  updates               Get recent updates from Telegram
    --limit, -l <n>     Limit number of results (default: 100)
    --verbose, -v       Show detailed errors

  create-topic <name>   Create a new forum topic
    --verbose, -v       Show detailed errors

  help                  Show this help
  version               Show version

Environment:
  TELEGRAM_BOT_TOKEN    Bot token (required)
  TELEGRAM_CHAT_ID      Default chat ID (required)

Config:
  ~/.config/tg/topics.json    Named topics: { "name": threadId }

Examples:
  tg send "Hello world"
  tg send --topic wilson "Build complete"
  tg send --file ./prompt.md
  tg create-topic "Deployments"
`;

const commands: Record<string, cli.CommandHandler> = {
  send: cmdSend,
  topics: cmdTopics,
  updates: cmdUpdates,
  "create-topic": cmdCreateTopic,
};

cli.runCli({
  name: "tg",
  version: VERSION,
  commands,
  help: HELP,
});
