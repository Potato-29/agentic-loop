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
      await fs.writeFile(filePath, content);
      return "File written successfully!";
    });
  } catch (error) {
    return JSON.stringify(error);
  }
};

const createFolder = async ({ folderPath }) => {
  try {
    return isPathAllowed(folderPath, async () => {
      await fs.mkdir(folderPath, { recursive: true });
      return "Folder created successfully!";
    });
  } catch (error) {
    return JSON.stringify(error);
  }
};

const modifyFileContent = async ({ filePath, oldContent, newContent }) => {
  try {
    return isPathAllowed(filePath, async () => {
      const data = await fs.readFile(filePath, "utf8");
      const updatedData = data.replaceAll(oldContent, newContent);
      await fs.writeFile(filePath, updatedData, "utf8");
      return "File content updated successfully!";
    });
  } catch (error) {
    return JSON.stringify(error);
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
      description:
        "Returns the current local system time as a string, e.g. '14:32:07 GMT+0530'. Takes no arguments.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description:
        "Fetches current weather conditions for a given latitude/longitude. Returns JSON with temp and feelsLike (°C), humidity (%), wind (km/h), precipitation (mm), and weatherCode (WMO weather code). Does not accept city names - resolve those to coordinates yourself first.",
      parameters: {
        type: "object",
        properties: {
          lat: {
            type: "number",
            description: "Latitude in decimal degrees, e.g. 23.0225.",
          },
          lng: {
            type: "number",
            description: "Longitude in decimal degrees, e.g. 72.5714.",
          },
        },
        required: ["lat", "lng"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_directory",
      description:
        "Lists the immediate contents of a directory (not recursive). Returns JSON array of {name, isDirectory}. Only paths inside the .agent_workspace sandbox are allowed.",
      parameters: {
        type: "object",
        properties: {
          dirPath: {
            type: "string",
            description:
              "Path of the directory to list. Absolute paths are preferred over relative ones.",
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
      description:
        "Returns the absolute path of the process's current working directory. Takes no arguments. Note this is not necessarily inside the .agent_workspace sandbox - it's just where the process was launched from.",
      parameters: { type: "object", properties: {} },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Reads and returns the full UTF-8 text contents of a file. Fails if the path is a directory or outside the .agent_workspace sandbox.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description:
              "Path of the file to read. Absolute paths are preferred over relative ones.",
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
        "Finds files matching a glob pattern and returns their paths as a JSON array. Only matches within the .agent_workspace sandbox. Example patterns: 'D:\\projs\\agentic-loop\\.agent_workspace\\*.txt' or '**/*.js'.",
      parameters: {
        type: "object",
        properties: {
          pattern: {
            type: "string",
            description:
              "Glob pattern to match files against. Absolute patterns are preferred over relative ones.",
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
      description:
        "Creates a new file with the given content, or overwrites it completely if it already exists. Use edit_file instead if you only want to change part of an existing file. Only paths inside the .agent_workspace sandbox are allowed.",
      parameters: {
        type: "object",
        properties: {
          content: {
            type: "string",
            description: "The full text content to write into the file.",
          },
          filePath: {
            type: "string",
            description:
              "Full path including the desired file name, e.g. 'D:\\projs\\agentic-loop\\.agent_workspace\\test.txt'.",
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
      description:
        "Creates a new folder, including any missing parent folders along the way (like mkdir -p). No error if the folder already exists. Only paths inside the .agent_workspace sandbox are allowed.",
      parameters: {
        type: "object",
        properties: {
          folderPath: {
            type: "string",
            description:
              "Full path including the desired folder name, e.g. 'D:\\projs\\agentic-loop\\.agent_workspace\\test_folder'.",
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
      description:
        "Edits an existing file by replacing every exact occurrence of oldContent with newContent (like find-and-replace, not a diff/patch). The file must already exist. Only paths inside the .agent_workspace sandbox are allowed. Prefer this over write_file when you only want to change part of a file.",
      parameters: {
        type: "object",
        properties: {
          filePath: {
            type: "string",
            description:
              "Path of the file to edit. Absolute paths are preferred over relative ones.",
          },
          oldContent: {
            type: "string",
            description:
              "The exact existing text to find and replace. Must match the file's content verbatim (including whitespace) - read the file first if unsure.",
          },
          newContent: {
            type: "string",
            description:
              "The text that will replace every occurrence of oldContent.",
          },
        },
        required: ["filePath", "oldContent", "newContent"],
      },
    },
  },
];
