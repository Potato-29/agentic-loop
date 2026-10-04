<div align="center">

<video src="https://github.com/Potato-29/agentic-loop/raw/main/assets/demo.mp4" controls muted width="100%"></video>

[Download the demo video](assets/demo.mp4)

</div>

# agentic-loop

A tiny terminal agent: a local LLM (via [Ollama](https://ollama.com)) that calls tools in a loop until it has an answer. It can read, write and edit files, browse folders, check the time and fetch the weather, all with a sarcastic personality.

## How the loop works

1. You type a prompt, and it's pushed onto `messages[]`.
2. `ollama.chat()` is called with the model, the messages and the tool definitions.
3. If the response contains `tool_calls`, each tool runs and its output is appended as a `role: "tool"` message. Go back to step 2.
4. If there are no tool calls, the response is the final answer. It is printed in a box and the loop breaks.

The loop is capped at `MAX_TOOL_CALLS` (10) round trips per prompt.

## Tools

| Tool | What it does |
|---|---|
| `get_time` | Current local system time |
| `get_weather` | Current weather for a latitude/longitude ([Open-Meteo](https://open-meteo.com), no API key) |
| `get_current_dir` | The process's working directory |
| `list_directory` | List a directory (not recursive) |
| `read_file` | Read a UTF-8 text file |
| `search_files` | Find files by glob pattern |
| `write_file` | Create a file or overwrite it |
| `create_folder` | Create a folder, including missing parents |
| `edit_file` | Find-and-replace every exact occurrence of a string in a file |

File tools are restricted to the `.agent_workspace` sandbox.

## Setup

Requirements: Node.js 18+ and [Ollama](https://ollama.com) running locally with a tool-capable model pulled.

```bash
ollama pull qwen3:8b
npm install
node index.js
```

Type `/exit` to quit.

### Configuration

Set these in a `.env` file or your environment:

| Variable | Default | Purpose |
|---|---|---|
| `OLLAMA_MODEL` | `qwen3:8b` | Model used for chat |
| `USE_SAFE_THINKING_VERBS` | unset | Set to `1` for tamer spinner text |

> **Note:** the sandbox root is currently hardcoded in `helpers.js` to `D:\projs\agentic-loop\.agent_workspace`. If you cloned the repo somewhere else, change it there.

## Project layout

```
index.js     chat loop, streaming, spinner, tool dispatch
tools.js     tool implementations and their schemas
helpers.js   sandbox path checks
ui.js        boxed output, markdown rendering, colors
demo/        Remotion project that renders the demo video
assets/      demo.mp4
```

## Demo video

The video is a scripted mock-up of the terminal, built with [Remotion](https://www.remotion.dev) in `demo/`. It isn't a live recording, so the tool results and replies in it are illustrative.

```bash
cd demo
npm install
npm run studio   # preview in the browser
npm run render   # writes demo/out/demo.mp4
```
