import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Request logger middleware
app.use((req, res, next) => {
  console.log(`[Server] ${req.method} ${req.url}`);
  next();
});

// Initialize Gemini client lazily
let aiClient: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not defined.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}

function cleanAndParseJSON(text: string): any {
  let cleanText = text.trim();
  if (cleanText.startsWith("```")) {
    cleanText = cleanText.replace(/^```(?:json)?\n?/, "");
    cleanText = cleanText.replace(/```$/, "");
    cleanText = cleanText.trim();
  }
  return JSON.parse(cleanText);
}

// 1. AI Trip Planner Endpoint
app.post("/api/generate-itinerary", async (req, res) => {
  try {
    const { destination, budget, days, interests, style, travelers } = req.body;

    if (!destination || !days) {
      return res.status(400).json({ error: "Destination and number of days are required." });
    }

    const prompt = `
Generate a highly detailed travel itinerary for a trip to:
Destination: ${destination}
Budget Level: ${budget || "Moderate"}
Duration: ${days} days
Interests: ${interests || "General sightseeing, culture"}
Travel Style: ${style || "Balanced"}
Number of Travelers: ${travelers || 1}

You MUST return a JSON object that adheres strictly to the following structure:
{
  "destination": "Name of the destination",
  "budgetType": "Budget level requested",
  "numberOfDays": Number of days (integer),
  "travelers": Number of travelers (integer),
  "summary": "A 2-3 sentence engaging overview of the trip style and what to expect.",
  "budgetBreakdown": {
    "accommodation": estimated total cost in USD for accommodation,
    "food": estimated total cost in USD for meals/food,
    "transport": estimated total cost in USD for local transportation,
    "activities": estimated total cost in USD for admission/activities,
    "emergency": estimated total cost in USD for emergency/misc,
    "total": sum of all the above estimated costs
  },
  "days": [
    {
      "day": 1,
      "theme": "Theme or highlight of this day",
      "activities": [
        {
          "time": "e.g., 09:00 AM",
          "title": "Name of activity/attraction",
          "description": "Engaging 1-2 sentence description of what to do, eat, or see.",
          "lat": approximate latitude of the location (real coordinate float e.g. 48.8584),
          "lng": approximate longitude of the location (real coordinate float e.g. 2.2945),
          "category": "One of: Historical, Nature, Food, Adventure, Shopping, Nightlife, Culture",
          "cost": estimated cost in USD (number)
        }
      ]
    }
  ],
  "tips": [
    "Practical tip 1 e.g. weather, transport advice",
    "Practical tip 2 e.g. custom/etiquette, safety advice",
    "Practical tip 3 e.g. hidden gems or best times to visit"
  ]
}

Make sure all latitude/longitude values are accurate so they can be plotted on an interactive Leaflet Map.
Ensure the response is strictly valid JSON matching the specified structure, with no markdown code fence wrappers or backticks outside of the JSON block.
`;

    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = result.text;
    if (!text) {
      throw new Error("No response received from Gemini AI.");
    }

    const data = cleanAndParseJSON(text);
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/generate-itinerary:", error);
    res.status(500).json({ error: error.message || "Failed to generate itinerary." });
  }
});

// 2. AI Chat Endpoint
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Message is required." });
    }

    const ai = getAI();
    
    // Prepare conversational prompt
    const systemInstruction = `You are an expert AI Travel Assistant. Your goal is to provide highly detailed, conversational, inspiring, and accurate answers to the user's travel inquiries. Recommend local hidden gems, culture, food, transport advice, and general safety. Keep your answers beautifully structured with Markdown, utilizing bold text, headers, and bullet points.`;

    const contents = [];
    if (history && Array.isArray(history)) {
      for (const turn of history) {
        contents.push({
          role: turn.role === "user" ? "user" : "model",
          parts: [{ text: turn.text }]
        });
      }
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
      }
    });

    res.json({ text: result.text || "Sorry, I am unable to answer that right now." });
  } catch (error: any) {
    console.error("Error in /api/chat:", error);
    res.status(500).json({ error: error.message || "Failed to chat." });
  }
});

// 3. AI Packing List Generator Endpoint
app.post("/api/generate-packing-list", async (req, res) => {
  try {
    const { destination, duration, season, type, weather } = req.body;

    if (!destination) {
      return res.status(400).json({ error: "Destination is required." });
    }

    const prompt = `
Generate a comprehensive packing list for a trip to ${destination}.
Details:
- Duration: ${duration || "a few days"}
- Season/Weather: ${season || "mild"} (${weather || "clear"})
- Travel Style: ${type || "Leisure"}

You MUST return a JSON object with categorized packing items. Format:
{
  "categories": [
    {
      "name": "e.g., Clothing, Essentials, Electronics, Toiletries, Documents",
      "items": [
        { "name": "Item name", "checked": false, "reason": "Brief explanation why this is essential for this destination/style" }
      ]
    }
  ]
}
Ensure the response is strictly valid JSON matching the specified structure.
`;

    const ai = getAI();
    const result = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = result.text;
    if (!text) {
      throw new Error("No response received from Gemini AI.");
    }

    const data = cleanAndParseJSON(text);
    res.json(data);
  } catch (error: any) {
    console.error("Error in /api/generate-packing-list:", error);
    res.status(500).json({ error: error.message || "Failed to generate packing list." });
  }
});

// API 404 handler for any unhandled /api/* requests
app.all("/api/*", (req, res) => {
  res.status(404).json({ error: `API endpoint ${req.method} ${req.originalUrl} not found.` });
});

// Vite Dev Server Middleware or Static Production Build Serves Here
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite dev server middleware mounted.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Serving static files from dist.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
