export interface Activity {
  time: string;
  title: string;
  description: string;
  lat: number;
  lng: number;
  category: "Historical" | "Nature" | "Food" | "Adventure" | "Shopping" | "Nightlife" | "Culture";
  cost: number;
}

export interface DayItinerary {
  day: number;
  theme: string;
  activities: Activity[];
}

export interface BudgetBreakdown {
  accommodation: number;
  food: number;
  transport: number;
  activities: number;
  emergency: number;
  total: number;
}

export interface Hotel {
  name: string;
  description: string;
  rating: number;
  pricePerNight: number;
  lat: number;
  lng: number;
  address: string;
}

export interface ItineraryData {
  destination: string;
  budgetType: string;
  numberOfDays: number;
  travelers: number;
  summary: string;
  budgetBreakdown: BudgetBreakdown;
  days: DayItinerary[];
  hotels: Hotel[];
  tips: string[];
}

export interface PackingItem {
  name: string;
  checked: boolean;
  reason: string;
}

export interface PackingCategory {
  name: string;
  items: PackingItem[];
}

export interface Trip {
  id?: string;
  userId: string;
  destination: string;
  budget: string;
  days: number;
  travelers: number;
  interests: string;
  style: string;
  itinerary: ItineraryData;
  packingList?: PackingCategory[];
  isFavorite?: boolean;
  createdAt: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: number;
}

export interface WeatherData {
  temperatureMax: number[];
  temperatureMin: number[];
  precipitationChance: number[];
  windSpeed: number[];
  dates: string[];
}
