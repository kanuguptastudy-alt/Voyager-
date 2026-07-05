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

export async function geocodeDestination(name: string): Promise<{ lat: number; lng: number }> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=en&format=json`
    );
    if (!response.ok) {
      throw new Error("Geocoding failed");
    }
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return {
        lat: data.results[0].latitude,
        lng: data.results[0].longitude,
      };
    }
    throw new Error("No results found");
  } catch (error) {
    console.error("Error geocoding destination:", error);
    throw error;
  }
}

export async function geocodePlace(
  query: string,
  destination: string,
  apiKey?: string
): Promise<{ lat: number; lng: number } | null> {
  const fullQuery = `${query}, ${destination}`;

  // 1. Try Google Maps Geocoding API first if apiKey is present
  if (apiKey) {
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullQuery)}&key=${apiKey}`
      );
      if (response.ok) {
        const data = await response.json();
        if (data.status === "OK" && data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location;
          return { lat: loc.lat, lng: loc.lng };
        } else {
          console.warn("Google Geocoding status was not OK:", data.status);
        }
      }
    } catch (e) {
      console.warn("Google Maps Geocoding failed, falling back to Nominatim:", e);
    }
  }

  // 2. Try Nominatim (OpenStreetMap) Geocoding API
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(fullQuery)}&format=json&limit=1`,
      {
        headers: {
          "Accept-Language": "en",
        },
      }
    );
    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lng: parseFloat(data[0].lon),
        };
      }
    }
  } catch (e) {
    console.warn("Nominatim Geocoding failed, falling back to Open-Meteo:", e);
  }

  // 3. Try Open-Meteo Geocoding API
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
    );
    if (response.ok) {
      const data = await response.json();
      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].latitude,
          lng: data.results[0].longitude,
        };
      }
    }
  } catch (e) {
    console.warn("Open-Meteo Geocoding failed:", e);
  }

  return null;
}


