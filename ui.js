import chalk from "chalk";
import boxen from "boxen";
import { marked } from "marked";
import { markedTerminal } from "marked-terminal";

const terminalRenderer = markedTerminal();

marked.use(terminalRenderer);

marked.use({
  renderer: {
    code({ text, lang }) {
      const rendered = terminalRenderer.renderer.code.call(this, text, lang);

      return boxen(rendered.trimEnd(), {
        padding: { top: 0, bottom: 0, left: 1, right: 1 },
        borderStyle: "round",
        borderColor: "gray",
      });
    },
  },
});

const colors = [
  "black",
  "red",
  "green",
  "yellow",
  "blue",
  "magenta",
  "cyan",
  "white",
  "blackBright",
  "gray",
  "grey",
  "redBright",
  "greenBright",
  "yellowBright",
  "blueBright",
  "magentaBright",
  "cyanBright",
  "whiteBright",
];

export const renderResponse = (text) =>
  boxen(marked.parse(text.trim()), {
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: "round",
    borderColor: "cyan",
    title: process.env.OLLAMA_MODEL || "AI",
    titleAlignment: "left",
  });

export const renderLabel = ({ text, type, color }) => {
  if (!colors.includes(color)) {
    return chalk.blue(text);
  }
  return chalk[color](text);
};

export const renderToolInfo = (info) => {
  return boxen(info.trim(), {
    padding: { top: 0, bottom: 1, left: 1, right: 1 },
    borderStyle: "single",
    borderColor: "white",
    title: process.env.OLLAMA_MODEL || "AI",
    dimBorder: true,
    titleAlignment: "center",
  });
};
