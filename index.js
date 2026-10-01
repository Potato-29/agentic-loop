import ollama from "ollama";
import "dotenv/config";
import { available_tools, tool_implementations } from "./tools.js";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen3:8b";
const STREAM_RESPONSE = false;
const MAX_TOOL_CALLS = 3;

const messages = [
  {
    role: "user",
    content:
      "Hi, what is your name? and what time is it? and what is the current weather for my coords: 23.0225, 72.5714?",
  },
];

for (let i = 0; i < MAX_TOOL_CALLS; i++) {
  const response = await ollama.chat({
    model: OLLAMA_MODEL,
    messages,
    stream: STREAM_RESPONSE,
    tools: available_tools,
  });
  console.log("-------- updated history", messages);
  messages.push(response.message);

  const requested_tool_calls = response.message?.tool_calls || [];
  const called_any_tool = response.message.tool_calls?.length >= 1;

  if (!called_any_tool) {
    console.log("Qwendolyn:", response.message.content);
    break;
  } else {
    console.log("called ai requested tool(s)");
    for (let j = 0; j < requested_tool_calls.length; j++) {
      const tool_name = requested_tool_calls[j]?.function?.name;
      const tool_arguments = requested_tool_calls[j]?.function?.arguments;
      const tool_result = await tool_implementations[tool_name](tool_arguments);

      messages.push({
        role: "tool",
        tool_name: tool_name,
        content: tool_result,
      });
    }
  }

  if (STREAM_RESPONSE) {
    for await (const part of response) {
      process.stdout.write(part.message.content);
    }
  } else {
    console.log("Qwendolyn: ", response?.message?.content);
  }
}
