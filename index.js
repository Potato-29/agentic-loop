import ollama from "ollama";
import "dotenv/config";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import ora from "ora";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

import { available_tools, tool_implementations } from "./tools.js";
import { renderLabel, renderResponse, renderToolInfo } from "./ui.js";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
const STREAM_RESPONSE = true;
const MAX_TOOL_CALLS = 10;

const SYSTEM_PROMPT = `You are a scrappy little coding gremlin living inside this terminal. You've got real tools - reading, writing, editing, and poking around files and folders, checking the time, and peeking at the weather - and you're not afraid to use them. You're also not afraid to clown on the user while you do it.

Personality:
- Be playful, witty, and a little bit mean, in a fun way. Light roasting of the user's typos, bad variable names, sketchy file paths, or questionable life choices is encouraged.
- Teasing is a garnish, not the meal. Always deliver the actual answer or finish the actual task - never let a joke replace getting the work done correctly.
- Dry, sarcastic one-liners beat elaborate bits. Keep the chatter short so it doesn't drown out the real content.
- Punch at the work and the situation, not at the user's intelligence or identity. Roast the bug, not the person who wrote it (well, mostly).

Working style:
- You operate in a sandboxed workspace. Only paths inside ".agent_workspace" are fair game - if the user asks you to touch anything outside it, call that out (sarcastically) and explain why you can't, instead of silently failing.
- Use the tools you've got instead of guessing. Don't make up file contents, directory listings, the time, or the weather - go fetch them.
- Before writing or editing a file, make sure you actually know what's in it when it matters (read first, write second).
- If a tool call fails or a path is rejected, tell the user plainly what happened - a joke is fine, a made-up result is not.
- Keep responses concise. Nobody's paying you by the word.`;

const messages = [
  {
    role: "system",
    content: SYSTEM_PROMPT,
  },
];
const spinner_colors = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "gray",
];

let spinner_verbs = [];

marked.use(markedTerminal());

if (process.env.USE_SAFE_THINKING_VERBS === "1") {
  spinner_verbs = [
    "Ruminating",
    "Thinking hard",
    "Discombobulating",
    "Purring",
    "Contemplating",
  ];
} else {
  spinner_verbs = [
    "larping",
    "bullshitting",
    "ass pulling",
    "bed rotting",
    "doom scrolling",
    "pretending to think",
    "blowing my shit smoove off",
    "ignoring",
    "day drinking",
    "about to kms",
  ];
}

const spinner = ora("bullshitting");

const pickSpinnerLook = () => {
  spinner.color =
    spinner_colors[Math.floor(Math.random() * spinner_colors.length)];
  spinner.text =
    spinner_verbs[Math.floor(Math.random() * spinner_verbs.length)];
};

const startSpinner = () => {
  pickSpinnerLook();
  spinner.start();
  const id = setInterval(pickSpinnerLook, 1000);
  return () => {
    clearInterval(id);
    spinner.stop();
  };
};

const chatInterface = readline.createInterface({ input, output });

while (true) {
  const userMsg = await chatInterface.question(renderLabel({ text: "You: " }));
  if (userMsg === "/exit") {
    process.exit();
  }
  messages.push({
    role: "user",
    content: userMsg,
  });

  for (let i = 0; i < MAX_TOOL_CALLS; i++) {
    const stopSpinner = startSpinner();
    const response = await ollama.chat({
      model: OLLAMA_MODEL,
      messages,
      stream: STREAM_RESPONSE,
      tools: available_tools,
    });

    let assembled = "";
    let requested_tool_calls = [];
    let spinnerRunning = true;

    const hideSpinner = () => {
      if (!spinnerRunning) return;
      stopSpinner();
      spinnerRunning = false;
    };

    for await (const part of response) {
      if (part.message?.tool_calls?.length) {
        requested_tool_calls = part.message.tool_calls;
        hideSpinner();
      }

      const chunk = part.message?.content ?? "";
      if (chunk) {
        // buffer only: boxen needs the full text to size the box
        assembled += chunk;
      }
    }
    hideSpinner();

    if (assembled.trim()) {
      process.stdout.write("\n" + renderResponse(assembled) + "\n\n");
    }

    const assistantMessage = {
      role: "assistant",
      content: assembled,
    };
    if (requested_tool_calls.length) {
      assistantMessage.tool_calls = requested_tool_calls;
    }
    messages.push(assistantMessage);

    if (!requested_tool_calls.length) {
      break;
    }

    for (const call of requested_tool_calls) {
      const tool_name = call?.function?.name;
      process.stdout.write(
        renderLabel({ text: `\n used tool: ${tool_name} \n`, color: "green" }),
      );
      const tool_arguments = call?.function?.arguments;
      const impl = tool_implementations[tool_name];
      if (!impl) {
        throw new Error(`Unknown tool: ${tool_name}`);
      }
      const tool_result = await impl(tool_arguments);
      messages.push({
        role: "tool",
        tool_name,
        content: String(tool_result ?? ""),
      });
    }
  }
}
