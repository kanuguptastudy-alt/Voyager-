import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

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

async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 4, delayMs = 3000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    const errorStr = JSON.stringify(error) || error.message || "";
    const isRetryable = 
      error.status === "RESOURCE_EXHAUSTED" || 
      error.code === 429 || 
      error.status === "UNAVAILABLE" ||
      error.code === 503 ||
      error.code === 500 ||
      errorStr.includes("RESOURCE_EXHAUSTED") || 
      errorStr.includes("429") || 
      errorStr.includes("quota") || 
      errorStr.includes("rate-limits") ||
      errorStr.includes("Quota exceeded") ||
      errorStr.includes("overloaded") ||
      errorStr.includes("Service Unavailable") ||
      errorStr.includes("high demand") ||
      errorStr.includes("Unavailable") ||
      errorStr.includes("503") ||
      errorStr.includes("500") ||
      errorStr.includes("Internal Error");

    if (isRetryable && retries > 0) {
      console.warn(`AI model service busy or limited. Retrying in ${delayMs / 1000} seconds... (${retries} retries left)`);
      
      let waitTime = delayMs;
      if (error.details) {
        try {
          const retryInfo = error.details.find((d: any) => d["@type"]?.includes("RetryInfo"));
          if (retryInfo && retryInfo.retryDelay) {
            const seconds = parseFloat(retryInfo.retryDelay);
            if (!isNaN(seconds)) {
              waitTime = (seconds + 1) * 1000;
            }
          }
        } catch (e) {
          // ignore
        }
      }

      await new Promise((resolve) => setTimeout(resolve, waitTime));
      return callGeminiWithRetry(fn, retries - 1, waitTime * 1.5);
    }
    
    if (isRetryable) {
      throw new Error("Our travel intelligence models are currently experiencing high demand. Please wait a few seconds and try again.");
    }
    throw error;
  }
}

// Robust Fallback Utilities for Rate Limits or API Failures
async function getGeocodeCoordinates(destination: string): Promise<{ lat: number; lng: number }> {
  try {
    const response = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(destination)}&count=1&language=en&format=json`
    );
    if (response.ok) {
      const data: any = await response.json();
      if (data.results && data.results.length > 0) {
        return {
          lat: data.results[0].latitude,
          lng: data.results[0].longitude,
        };
      }
    }
  } catch (e) {
    console.warn("Geocoding failed in backend fallback:", e);
  }
  return { lat: 48.8566, lng: 2.3522 }; // Fallback to Paris coordinates
}

async function getFallbackItinerary(destination: string, days: number, budget: string, style: string, travelers: number) {
  const coords = await getGeocodeCoordinates(destination);
  const baseLat = coords.lat;
  const baseLng = coords.lng;

  const d = Math.max(1, Math.min(14, days || 3));
  const trav = Math.max(1, travelers || 1);

  const multiplier = budget?.toLowerCase() === "luxury" ? 2.5 : budget?.toLowerCase() === "budget" ? 0.6 : 1.2;
  const accommodation = Math.round(150 * d * multiplier);
  const food = Math.round(50 * d * trav * multiplier);
  const transport = Math.round(30 * d * trav * multiplier);
  const activities = Math.round(40 * d * trav * multiplier);
  const emergency = Math.round(50 * multiplier);
  const total = accommodation + food + transport + activities + emergency;

  const dayThemes = [
    "Introduction to Historic Wonders & Culture",
    "Nature Trails & Picturesque Sceneries",
    "Local Artistry, Flavors & Hidden Cafes",
    "Outdoor Adventure & Vibrant Neighborhoods",
    "Iconic Landmarks & Panoramic Sunset",
    "Leisurely Shopping & Cultural Enrichment",
    "Scenic Waterfront Promenade & Culinary Tour",
    "Historic Museum Day & Botanical Stroll",
    "Local Day Trip & Rustic Mountain Escapes",
    "Relaxing Wellness Spa & Farewell Dinner Cruise",
  ];

  const activityTemplates = [
    {
      time: "09:00 AM",
      title: "Guided Landmark Discovery Walking Tour",
      description: `Embark on an enriching walk to explore the most remarkable structures and historic buildings in ${destination}.`,
      category: "Historical",
      offsetLat: 0.005,
      offsetLng: -0.003,
      baseCost: 15,
    },
    {
      time: "01:00 PM",
      title: "Traditional Culinary Feast & Tasting",
      description: `Indulge in authentic local recipes at a legendary dining spot highly recommended by locals in ${destination}.`,
      category: "Food",
      offsetLat: -0.002,
      offsetLng: 0.008,
      baseCost: 25,
    },
    {
      time: "04:30 PM",
      title: "Scenic Observation Deck & Sunset Viewing",
      description: `Ascend to a breathtaking lookout point or scenic rooftop to witness the sunset over the entire cityscape of ${destination}.`,
      category: "Nature",
      offsetLat: 0.012,
      offsetLng: -0.009,
      baseCost: 10,
    },
    {
      time: "10:00 AM",
      title: "Contemporary Fine Arts Gallery & Museum",
      description: `Browse curated collections and historical artifacts that express the creative heritage of the regional artists.`,
      category: "Culture",
      offsetLat: -0.008,
      offsetLng: -0.004,
      baseCost: 20,
    },
    {
      time: "02:00 PM",
      title: "Stroll in the Serene Botanical Garden",
      description: `Unwind amidst lush greenery, rare botanical specimens, and tranquil ponds of the municipal gardens.`,
      category: "Nature",
      offsetLat: 0.015,
      offsetLng: 0.011,
      baseCost: 5,
    },
    {
      time: "07:00 PM",
      title: "Downtown Food Market & Night Promenade",
      description: `Savor popular snacks, watch dynamic street performances, and pick up beautiful craft souvenirs.`,
      category: "Nightlife",
      offsetLat: -0.004,
      offsetLng: 0.002,
      baseCost: 15,
    },
    {
      time: "09:00 AM",
      title: "Thrilling Forest Canopy Zip-Line Adventure",
      description: `Soar through the majestic treetops on a high-speed zipline course custom designed for adventure enthusiasts.`,
      category: "Adventure",
      offsetLat: 0.022,
      offsetLng: -0.015,
      baseCost: 45,
    },
    {
      time: "02:00 PM",
      title: "Bustling Artisan Shopping Street Exploration",
      description: `Walk through independent boutiques, craft stalls, and antique shops showcasing unique items.`,
      category: "Shopping",
      offsetLat: 0.001,
      offsetLng: 0.004,
      baseCost: 0,
    },
    {
      time: "06:30 PM",
      title: "Gourmet Dinner by the Waterfront",
      description: `Reflect on your adventures with an award-winning dinner situated right on the panoramic waterfront.`,
      category: "Food",
      offsetLat: -0.011,
      offsetLng: 0.015,
      baseCost: 40,
    },
  ];

  const daysData = [];
  for (let i = 1; i <= d; i++) {
    const theme = dayThemes[(i - 1) % dayThemes.length];
    const startIndex = ((i - 1) * 3) % activityTemplates.length;
    const dayActivities = [];
    
    for (let actIdx = 0; actIdx < 3; actIdx++) {
      const template = activityTemplates[(startIndex + actIdx) % activityTemplates.length];
      const lat = parseFloat((baseLat + template.offsetLat + (i * 0.002) - (actIdx * 0.001)).toFixed(5));
      const lng = parseFloat((baseLng + template.offsetLng - (i * 0.001) + (actIdx * 0.003)).toFixed(5));
      const cost = Math.round(template.baseCost * multiplier);

      dayActivities.push({
        time: template.time,
        title: template.title,
        description: template.description,
        lat,
        lng,
        category: template.category,
        cost,
      });
    }

    daysData.push({
      day: i,
      theme,
      activities: dayActivities,
    });
  }

  const tips = [
    `🎒 Packing Advice: For a ${style.toLowerCase()} style in ${destination}, pack versatile layers and comfortable shoes suitable for walking.`,
    `🚇 Transport Guide: Consider getting a local transport pass for the city's robust public transit to save on taxi fares.`,
    `💡 Local Etiquette: Always carry a small amount of local currency for small vendors, and check if tipping is standard before dining.`,
    `🌟 Hidden Gem: Venture 2-3 blocks off the primary tourist avenues for significantly better food prices and authentic charm.`
  ];

  const hotels = [
    {
      name: `${destination} Grand Central Hotel`,
      description: "A highly-rated, central accommodation option featuring superb walking access to major historic landmarks, modern amenities, and highly responsive concierge service.",
      rating: 4.7,
      pricePerNight: Math.round(120 * multiplier),
      lat: parseFloat((baseLat + 0.001).toFixed(5)),
      lng: parseFloat((baseLng - 0.001).toFixed(5)),
      address: `100 Grand Boulevard, Central Area, ${destination}`,
    },
    {
      name: `${destination} Riverside Boutique Inn`,
      description: "A cozy, charming property boasting beautiful waterfront views, custom design interiors, and an exceptional breakfast buffet showcasing local delicacies.",
      rating: 4.5,
      pricePerNight: Math.round(90 * multiplier),
      lat: parseFloat((baseLat - 0.003).toFixed(5)),
      lng: parseFloat((baseLng + 0.004).toFixed(5)),
      address: `45 Promenade Drive, Scenic District, ${destination}`,
    },
    {
      name: `${destination} Budget Comfort Lodge`,
      description: "A budget-friendly, incredibly clean and comfortable hostel/hotel situated extremely close to the city's main public subway and bus terminals.",
      rating: 4.2,
      pricePerNight: Math.round(50 * multiplier),
      lat: parseFloat((baseLat + 0.006).toFixed(5)),
      lng: parseFloat((baseLng - 0.005).toFixed(5)),
      address: `12 Transit Way, Gateway District, ${destination}`,
    },
  ];

  return {
    destination,
    budgetType: budget || "Moderate",
    numberOfDays: d,
    travelers: trav,
    summary: `A high-quality ${style.toLowerCase()} itinerary customized for ${trav} travelers visiting ${destination}. Perfectly optimized to balance sightseeing, food experiences, and hidden gems within your ${budget.toLowerCase()} budget.`,
    budgetBreakdown: {
      accommodation,
      food,
      transport,
      activities,
      emergency,
      total,
    },
    days: daysData,
    hotels,
    tips,
  };
}

function getFallbackPackingList(destination: string, duration: string, season: string, type: string, weather: string) {
  const isCold = season?.toLowerCase().includes("cold") || season?.toLowerCase().includes("winter") || weather?.toLowerCase().includes("snow") || weather?.toLowerCase().includes("rain");
  const isHot = season?.toLowerCase().includes("hot") || season?.toLowerCase().includes("summer") || weather?.toLowerCase().includes("warm") || weather?.toLowerCase().includes("sunny");

  const categories = [
    {
      name: "Essentials",
      items: [
        { name: "Passport, Visa, and Travel Tickets", checked: false, reason: "Absolute essential for crossing borders and flight check-ins." },
        { name: "Credit cards and some local cash currency", checked: false, reason: "Essential for smooth payments and tip-related expenses." },
        { name: "Physical or Digital Hotel Reservation slips", checked: false, reason: "For convenient and stress-free immigration and check-in checks." },
        { name: "Emergency contact numbers & Travel Insurance proof", checked: false, reason: "Highly recommended for safety on any trip." }
      ]
    },
    {
      name: "Clothing",
      items: [
        { name: "Comfortable, high-grip walking sneakers", checked: false, reason: "Essential for exploring the cities, streets, and scenic paths." },
        { name: isCold ? "Thick thermal coat, gloves, and beanie" : isHot ? "Light t-shirts, comfortable shorts, and swimwear" : "Versatile smart-casual shirts and trousers", checked: false, reason: `Optimized for the ${season || "mild"} weather in ${destination}.` },
        { name: "Extra underwear and socks (wicking/breathable)", checked: false, reason: "To keep you fresh and dry during long active exploration days." },
        { name: isCold || weather?.toLowerCase().includes("rain") ? "Sturdy compact umbrella or windproof rain jacket" : "UV Sunglasses and a protective sun hat", checked: false, reason: `Protects you from the expected ${weather || "clear"} weather elements.` }
      ]
    },
    {
      name: "Electronics",
      items: [
        { name: "Smartphone and high-capacity portable power bank", checked: false, reason: "Critical for navigation, map tracking, and saving memories on the go." },
        { name: "Universal Travel Adapter plug", checked: false, reason: `Ensures all your chargers fit the local wall sockets in ${destination}.` },
        { name: "Noise-cancelling headphones", checked: false, reason: "Great for a quiet and relaxing transit or flight experience." }
      ]
    },
    {
      name: "Toiletries",
      items: [
        { name: "Travel-size toothbrush, paste, and dental floss", checked: false, reason: "Maintains optimal hygiene during long sightseeing excursions." },
        { name: "Moisturizer, UV sunscreen, and soothing lip balm", checked: false, reason: "Protects your skin against direct sun exposure and dry winds." },
        { name: "Hand sanitizer and antibacterial pocket wet wipes", checked: false, reason: "Extremely useful for quick hygiene on street food tours." }
      ]
    }
  ];

  return { categories };
}

function getFallbackChatResponse(message: string) {
  const lowerMsg = message.toLowerCase();
  let text = "";
  if (lowerMsg.includes("weather")) {
    text = `### Weather Information ☀️🌧️\n\nI recommend checking our built-in **5-Day Forecast Card** on the top of the page! It pulls direct, real-time data from Open-Meteo for your destination. Generally, make sure to bring a compact umbrella if there is any rain probability above 40%, and dress in comfortable light layers for daytime walks.`;
  } else if (lowerMsg.includes("food") || lowerMsg.includes("eat") || lowerMsg.includes("restaurant") || lowerMsg.includes("culinary")) {
    text = `### Local Food Recommendations 🍽️\n\nTo experience the most authentic flavors:\n1. **Avenue Bistros**: Avoid eating directly on the main square. Venture 2-3 blocks down side streets for better prices and higher quality.\n2. **Local Markets**: Visit the bustling neighborhood food markets in the morning. Street food stalls offer incredibly fresh and cheap delicacies.\n3. **Traditional Dishes**: Seek out family-owned taverns and ask the staff what the daily special is!`;
  } else if (lowerMsg.includes("pack") || lowerMsg.includes("cloth") || lowerMsg.includes("bring")) {
    text = `### Packing Tips 🎒\n\nBe sure to check out the **Packing List tab**! For most travel styles, the gold standard is **versatility**:\n- **Footwear**: Bring one pair of reliable, broken-in walking shoes.\n- **Layers**: Pack breathable base layers (t-shirts) and a lightweight jacket/cardigan for evenings.\n- **Tech**: A high-capacity power bank and a universal adapter are absolutely indispensable!`;
  } else if (lowerMsg.includes("transport") || lowerMsg.includes("train") || lowerMsg.includes("bus") || lowerMsg.includes("taxi")) {
    text = `### Getting Around 🚇\n\n- **Public Transit**: Most major destinations offer tourist multi-day passes for subways/buses. They are highly economical and let you travel like a local.\n- **Walking**: The absolute best way to discover hidden courtyards, quiet cafes, and striking architecture is on foot.\n- **Ride-hailing**: Download the local region's popular ride-hailing app in advance to avoid overpriced airport taxis.`;
  } else {
    text = `### Travel Assistant Guide 🗺️\n\nHello! I am your Voyages Companion. Currently, we are serving you via our high-speed local guide helper due to high AI service demand.\n\nHere are some quick planning tips for your journey:\n- **Morning starts**: Set off by 08:30 AM to capture stunning, crowd-free photos of major landmarks.\n- **Safety**: Keep digital copies of your passport/ID in your secure cloud storage.\n- **Interactions**: Try learning 3-4 basic local greeting words – it goes a long way with the locals!\n\nWhat other questions can I answer about your upcoming adventure? I'm here to help!`;
  }
  return { text };
}

// 1. AI Trip Planner Endpoint
app.post("/api/generate-itinerary", async (req, res) => {
  const { destination, budget, days, interests, style, travelers } = req.body;
  try {

    if (!destination || !days) {
      return res.status(400).json({ error: "Destination and number of days are required." });
    }

    const prompt = `
You are a professional travel planner. You MUST use the Google Search tool to search for real existing tourist spots, attractions, restaurants, landmarks, and hotels in the destination: "${destination}".

Generate a highly detailed and accurate travel itinerary for:
Destination: ${destination}
Budget Level: ${budget || "Moderate"} (Search for hotels and activities fitting this level)
Duration: ${days} days
Interests: ${interests || "General sightseeing, culture"}
Travel Style: ${style || "Balanced"}
Number of Travelers: ${travelers || 1}

Constraints & Search Requirements:
1. Search Google for real, popular, highly-rated spots, points of interest, restaurants, and sights matching the user's interests.
2. For every activity, provide its true, real-world latitude (lat) and longitude (lng) coordinates (not generic or offset points) so they map accurately.
3. Find exactly 3 real, popular hotels or accommodations currently operating in "${destination}" matching the specified "${budget}" budget level. Provide their true, real-world latitude (lat) and longitude (lng) coordinates, addresses, average cost per night, and current description.
4. Provide up to 3 activities per day. Keep the descriptions concise (1-2 sentences).
5. Be fully helpful and accurate, and strictly conform to the provided JSON schema.
`;

    const itinerarySchema = {
      type: Type.OBJECT,
      properties: {
        destination: { type: Type.STRING },
        budgetType: { type: Type.STRING },
        numberOfDays: { type: Type.INTEGER },
        travelers: { type: Type.INTEGER },
        summary: { type: Type.STRING },
        budgetBreakdown: {
          type: Type.OBJECT,
          properties: {
            accommodation: { type: Type.NUMBER },
            food: { type: Type.NUMBER },
            transport: { type: Type.NUMBER },
            activities: { type: Type.NUMBER },
            emergency: { type: Type.NUMBER },
            total: { type: Type.NUMBER },
          },
          required: ["accommodation", "food", "transport", "activities", "emergency", "total"],
        },
        days: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              day: { type: Type.INTEGER },
              theme: { type: Type.STRING },
              activities: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    time: { type: Type.STRING },
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER },
                    category: { type: Type.STRING },
                    cost: { type: Type.NUMBER },
                  },
                  required: ["time", "title", "description", "lat", "lng", "category", "cost"],
                },
              },
            },
            required: ["day", "theme", "activities"],
          },
        },
        hotels: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              description: { type: Type.STRING },
              rating: { type: Type.NUMBER },
              pricePerNight: { type: Type.NUMBER },
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER },
              address: { type: Type.STRING },
            },
            required: ["name", "description", "rating", "pricePerNight", "lat", "lng", "address"],
          },
        },
        tips: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
      required: [
        "destination",
        "budgetType",
        "numberOfDays",
        "travelers",
        "summary",
        "budgetBreakdown",
        "days",
        "hotels",
        "tips",
      ],
    };

    const ai = getAI();
    const result = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: itinerarySchema,
          tools: [{ googleSearch: {} }],
        },
      })
    );

    const text = result.text;
    if (!text) {
      throw new Error("No response received from Gemini AI.");
    }

    const data = cleanAndParseJSON(text);
    res.json(data);
  } catch (error: any) {
    console.warn("Error in /api/generate-itinerary, falling back to programmatic generation:", error);
    try {
      const fallbackData = await getFallbackItinerary(destination, days, budget, style, travelers);
      res.json(fallbackData);
    } catch (fallbackError: any) {
      console.warn("Fallback itinerary generation also failed:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to generate itinerary." });
    }
  }
});

// 2. AI Chat Endpoint
app.post("/api/chat", async (req, res) => {
  const { message, history } = req.body;
  try {

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

    const result = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction,
        }
      })
    );

    res.json({ text: result.text || "Sorry, I am unable to answer that right now." });
  } catch (error: any) {
    console.warn("Error in /api/chat, falling back to local guide:", error);
    try {
      const fallbackResponse = getFallbackChatResponse(message);
      res.json(fallbackResponse);
    } catch (fallbackError: any) {
      console.warn("Chat fallback failed:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to chat." });
    }
  }
});

// 3. AI Packing List Generator Endpoint
app.post("/api/generate-packing-list", async (req, res) => {
  const { destination, duration, season, type, weather } = req.body;
  try {

    if (!destination) {
      return res.status(400).json({ error: "Destination is required." });
    }

    const prompt = `
Generate a comprehensive packing list for a trip to ${destination}.
Details:
- Duration: ${duration || "a few days"}
- Season/Weather: ${season || "mild"} (${weather || "clear"})
- Travel Style: ${type || "Leisure"}
`;

    const packingSchema = {
      type: Type.OBJECT,
      properties: {
        categories: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              items: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    checked: { type: Type.BOOLEAN },
                    reason: { type: Type.STRING },
                  },
                  required: ["name", "checked", "reason"],
                },
              },
            },
            required: ["name", "items"],
          },
        },
      },
      required: ["categories"],
    };

    const ai = getAI();
    const result = await callGeminiWithRetry(() =>
      ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: packingSchema,
        },
      })
    );

    const text = result.text;
    if (!text) {
      throw new Error("No response received from Gemini AI.");
    }

    const data = cleanAndParseJSON(text);
    res.json(data);
  } catch (error: any) {
    console.warn("Error in /api/generate-packing-list, falling back to programmatic packing list:", error);
    try {
      const fallbackData = getFallbackPackingList(destination, duration, season, type, weather);
      res.json(fallbackData);
    } catch (fallbackError: any) {
      console.warn("Packing list fallback failed:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to generate packing list." });
    }
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
