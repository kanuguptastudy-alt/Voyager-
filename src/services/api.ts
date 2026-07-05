import { ItineraryData, PackingCategory, ChatMessage, WeatherData } from "../types";

export async function generateItinerary(params: {
  destination: string;
  budget: string;
  days: number;
  interests: string;
  style: string;
  travelers: number;
}): Promise<ItineraryData> {
  const response = await fetch("/api/generate-itinerary", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate itinerary.");
  }

  return response.json();
}

export async function generatePackingList(params: {
  destination: string;
  duration: number;
  season: string;
  type: string;
  weather: string;
}): Promise<{ categories: PackingCategory[] }> {
  const response = await fetch("/api/generate-packing-list", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to generate packing list.");
  }

  return response.json();
}

export async function chatWithAI(
  message: string,
  history: ChatMessage[]
): Promise<string> {
  // Gemini requires the conversational history to start with a user turn.
  // Filter out the initial greeting or any welcome message before mapping.
  const validHistory = history.filter((msg) => msg.id !== "welcome" && msg.role !== "assistant" || history.indexOf(msg) > 0);

  const formattedHistory = validHistory.map((msg) => ({
    role: msg.role === "user" ? "user" : "model",
    text: msg.text,
  }));

  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history: formattedHistory }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to chat with AI.");
  }

  const data = await response.json();
  return data.text;
}

export async function fetchWeather(lat: number, lng: number): Promise<WeatherData> {
  const response = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto`
  );

  if (!response.ok) {
    throw new Error("Failed to fetch weather forecast.");
  }

  const data = await response.json();
  return {
    temperatureMax: data.daily.temperature_2m_max,
    temperatureMin: data.daily.temperature_2m_min,
    precipitationChance: data.daily.precipitation_probability_max,
    windSpeed: data.daily.wind_speed_10m_max,
    dates: data.daily.time,
  };
}
