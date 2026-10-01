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

// Example call for New York coordinates (40.71, -74.00)
// getWeather(40.71, -74.0);

// this is where the model can call the tool it knows from.
export const tool_implementations = {
  get_time: getTime,
  get_weather: getWeather,
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
];
