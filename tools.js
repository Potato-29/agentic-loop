import * as fs from "node:fs/promises";
import { isPathAllowed } from "./helpers.js";

const getTime = () => {
  const date = new Date().toTimeString();
  return String(date);
};

const getWeather = async ({ lat, lng }) => {
  // const lat = 23.0225;
  // const lon = 72.5714; // Ahmedabad
  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,precipitation&timezone=auto`,
    );

    const { current } = await res.json();

    const weather = {
      temp: current.temperature_2m,
      feelsLike: current.apparent_temperature,
      humidity: current.relative_humidity_2m,
      wind: current.wind_speed_10m,
      precipitation: current.precipitation,
      weatherCode: current.weather_code,
    };
    return JSON.stringify(weather);
  } catch (error) {
    console.error("Error fetching weather data:", error);
  }
};

const listDirectory = async ({ dirPath }) => {
  return isPathAllowed(dirPath, async () => {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    return JSON.stringify(
      files.map((f) => ({ name: f.name, isDirectory: f.isDirectory() })),
    );
  });
};

const getCurrentDirectory = () => {
  return process.cwd();
};

const readAFile = async ({ filePath }) => {
  try {
    return isPathAllowed(filePath, async () => {
      const isDirectory = (await fs.stat(filePath)).isDirectory();
      if (isDirectory) {
        return "illegal operation on a directory, read.";
      }
      const fileBuffer = await fs.readFile(filePath);

      return fileBuffer.toString("utf-8");
    });
  } catch (error) {
    return JSON.stringify(error);
  }
};

const searchFiles = async ({ pattern }) => {
  console.log(pattern);
  try {
    return isPathAllowed(pattern, async () => {
      const matches = [];
      for await (const match of fs.glob(pattern)) {
        matches.push(match);
      }
      return JSON.stringify(matches);
    });
  } catch (error) {
    console.log("error", error);
    return JSON.stringify(error);
  }
};

const writeAFile = async ({ content, filePath }) => {
  try {
    return isPathAllowed(filePath, async () => {
      const writtenFile = await fs.writeFile(filePath, content);
    });
  } catch (error) {
    console.log("error", error);
    JSON.stringify(error);
  }
};

const createFolder = async ({ folderPath }) => {
  try {
    return isPathAllowed(folderPath, async () => {
      const createdFolder = await fs.mkdir(folderPath, { recursive: true });
      return createdFolder;
    });
  } catch (error) {
    console.log("error", error);
    JSON.stringify(error);
  }
};

const modifyFileContent = async ({ filePath, oldContent, newContent }) => {
  try {
    // 1. Read existing content
    const data = await fs.readFile(filePath, "utf8");

    // 2. Modify the content (e.g., replace a word)
    const updatedData = data.replaceAll(oldContent, newContent);

    // 3. Write back to the file
    await fs.writeFile(filePath, updatedData, "utf8");
    console.log("File content updated successfully!");
  } catch (error) {
    console.log("error", error);
    console.error("Error updating file:", error);
  }
};

// this is where the model can call the tool it knows from.
export const tool_implementations = {
  get_time: getTime,
  get_weather: getWeather,
  list_directory: listDirectory,
  get_current_dir: getCurrentDirectory,
  read_file: readAFile,
  search_files: searchFiles,
  write_file: writeAFile,
  create_folder: createFolder,
  edit_file: modifyFileContent,
};

export const available_tools = [
  {
    type: "function",
    function: {
      name: "get_time",
      description: "A tool used to fetch the current time.",
      caller: getTime(), // no need to include because this is a schema for the model to understand the tool.
      parameters: {},
      required: [],
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "A tool used to fetch the weather for given coords.",
      parameters: {
        type: "object",
        properties: {
          lat: {
            type: "integer",
            description: "The latitude to get the weather information for.",
          },
          lng: {
            type: "integer",
            description: "The longitude to get the weather information for.",
          },
        },
      },
      required: ["lat", "lng"],
    },
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description: "A tool used to fetch the content of a directory.",
      parameters: {
        type: "object",
        properties: {
          dirPath: {
            type: "string",
            description:
              "path of the directory you're trying to list, can be relative or absolute, but preffered if it is absolute.",
          },
        },
        required: ["dirPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "get_current_dir",
      description: "A tool used to get the current working directory.",
      parameters: {},
      required: [],
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "A tool used to read the contents of a file.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description:
              "path of the file you're trying to read, can be relative or absolute, but preffered if it is absolute.",
          },
        },
        required: ["filePath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "search_files",
      description:
        "A tool used to search files using a pattern. Example: D:\\projs\\agentic-loop\\*.txt OR D:\\projs\\agentic-loop\\notes.txt",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description:
              "a glob pattern of the file you're trying to search, can be relative or absolute, but preffered if it is absolute.",
          },
        },
        required: ["pattern"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "A tool used to write a new file in a directory.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The content that is to be written in the file.",
          },
          filePath: {
            type: "string",
            description:
              "The path of the file name to write to, it shoul contain the path along with he desired file name. Eg: D:\\projs\\agentic-loop\\test.txt",
          },
        },
        required: ["content", "filePath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_folder",
      description: "A tool used to create a new folder in the directory.",
      parameters: {
        type: "object",
        properties: {
          folderPath: {
            type: "string",
            description:
              "The path along with the desired folder name to create. Eg: D:\\projs\\agentic-loop\\test_folder. This tool can create folders recursively inside the one you created at the very first.",
          },
        },
        required: ["folderPath"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "edit_file",
      description: "A tool used to edit contents of an existing file.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description:
              "The path of the file you're trying to edit, can be relative or absolute, but preffered if it is absolute.",
          },
          oldContent: {
            type: "string",
            description:
              "The old content taken from the file that you wish to replace.",
          },
          newContent: {
            type: "string",
            description:
              "The new content from you that will replace the oldContent (the tool does data.replace(/oldContent/g, newContent);)",
          },
        },
        required: ["filePath", "oldContent", "newContent"],
      },
    },
  },
];
