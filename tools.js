import * as fs from "node:fs/promises";
import { isPathAllowed } from "./helpers.js";
import { NodeSSH } from "node-ssh";
import { spawn } from "node:child_process";
import { Duplex } from "node:stream";

const ssh = new NodeSSH();
let proxy = null;

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

const sshToHost = async () => {
  proxy = spawn("cloudflared", [
    "access",
    "ssh",
    "--hostname",
    process.env.SSH_HOST,
  ]);

  // Bridge cloudflared stdin/stdout into a duplex stream
  const socket = new Duplex({
    read() {},
    write(chunk, encoding, callback) {
      if (!proxy.stdin.write(chunk, encoding)) {
        proxy.stdin.once("drain", callback);
      } else {
        callback();
      }
    },
    final(callback) {
      proxy.stdin.end(callback);
    },
  });

  proxy.stdout.on("data", (chunk) => socket.push(chunk));
  proxy.stdout.on("end", () => socket.push(null));
  proxy.on("error", (err) => socket.destroy(err));

  try {
    await ssh.connect({
      sock: socket,
      username: process.env.SSH_USERNAME,
      password: process.env.SSH_PASSWORD,
    });

    // console.log("SSH Connection Established!");

    const result = await ssh.execCommand("uptime");
    // console.log("STDOUT:", result.stdout);
    // console.log("STDERR:", result.stderr);
    return result.stdout;
  } catch (error) {
    return error;
  }
};

const disposeSSH = async () => {
  if (ssh.isConnected()) {
    ssh.dispose();
  }
  if (proxy !== null) {
    proxy.kill();
    proxy = null;
  }
  return "ssh session closed";
};

const toggleService = async ({ service, action }) => {
  if (!ssh.isConnected()) {
    return "not connected - call ssh_to_host first";
  }
  if (action !== "start" && action !== "stop") {
    return "action must be 'start' or 'stop'";
  }
  try {
    const services = JSON.parse(
      await fs.readFile(
        "F:\\projs\\agentic-loop\\.agent_workspace\\services.json",
        "utf8",
      ),
    );
    const entry = services.find(
      (s) =>
        s.key?.toLowerCase() === String(service).toLowerCase() ||
        s.label?.toLowerCase() === String(service).toLowerCase(),
    );
    if (!entry) {
      return `unknown service '${service}'. known keys: ${services.map((s) => s.key).join(", ")}`;
    }
    const command = entry[action];
    if (!command) {
      return `service '${entry.key}' has no '${action}' command`;
    }
    const { stdout, stderr, code } = await ssh.execCommand(command);
    return JSON.stringify({ ran: command, code, stdout, stderr });
  } catch (error) {
    return String(error);
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
  ssh_to_host: sshToHost,
  dispose_ssh: disposeSSH,
  toggle_service: toggleService,
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
  {
    type: "function",
    function: {
      name: "ssh_to_host",
      description:
        "Used to ssh to the host. use whenever user mentions 'cyberdeck' or 'deck', because it's their home server.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "dispose_ssh",
      description: "Used to kill/dispose of an ongoing ssh session.",
      parameters: {
        type: "object",
        properties: {},
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "toggle_service",
      description:
        "Starts or stops a service on the cyberdeck host over the existing ssh connection (call ssh_to_host first). The start/stop command is looked up automatically from services.json - just pass the service name and the action.",
      parameters: {
        type: "object",
        properties: {
          service: {
            type: "string",
            description:
              "The service's 'key' or 'label' as listed in services.json, e.g. 'sshd' or 'crond'.",
          },
          action: {
            type: "string",
            enum: ["start", "stop"],
            description: "Whether to start or stop the service.",
          },
        },
        required: ["service", "action"],
      },
    },
  },
];
