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

// this is where the model can call the tool it knows from.
export const tool_implementations = {
  get_time: getTime,
  get_weather: getWeather,
  list_directory: listDirectory,
  get_current_dir: getCurrentDirectory,
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
];
