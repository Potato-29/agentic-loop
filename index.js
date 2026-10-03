import ollama from "ollama";
import "dotenv/config";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import ora from "ora";

import { available_tools, tool_implementations } from "./tools.js";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
const STREAM_RESPONSE = true;
const MAX_TOOL_CALLS = 10;

const messages = [];
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
  const userMsg = await chatInterface.question("You: ");
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
        hideSpinner();
        assembled += chunk;
        process.stdout.write(chunk);
      }
    }
    hideSpinner();

    const assistantMessage = {
      role: "assistant",
      content: assembled,
    };
    if (requested_tool_calls.length) {
      assistantMessage.tool_calls = requested_tool_calls;
    }
    messages.push(assistantMessage);

    if (!requested_tool_calls.length) {
      process.stdout.write("\n");
      break;
    }

    for (const call of requested_tool_calls) {
      const tool_name = call?.function?.name;
      process.stdout.write(`called tool: ${tool_name} \n`);
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
