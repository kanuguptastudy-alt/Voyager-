import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateItinerary, generatePackingList, geocodePlace } from "../services/api";
import { saveTrip } from "../services/db";
import { useAuth } from "../context/AuthContext";
import { firebaseConfig } from "../firebase/config";
import { Compass, Sparkles, Calendar, DollarSign, Users, MapPin, Smile, Landmark, PlaneTakeoff, Heart, Flame, Soup, ShoppingBag, Moon } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const INTEREST_OPTIONS = [
  { id: "Historical", label: "Historical Places", icon: Landmark },
  { id: "Nature", label: "Nature & Parks", icon: Heart },
  { id: "Food", label: "Local Food & Cuisine", icon: Soup },
  { id: "Adventure", label: "Adventure & Sports", icon: Flame },
  { id: "Shopping", label: "Shopping & Markets", icon: ShoppingBag },
  { id: "Nightlife", label: "Nightlife & Clubs", icon: Moon },
];

const LOADING_STATUSES = [
  "Consulting local guides & digital maps...",
  "Selecting top-rated historical sights and hidden gems...",
  "Calculating optimized daily routes to minimize travel time...",
  "Structuring custom daily schedules and estimated budgets...",
  "Preparing packing checklists tailored to your style...",
  "Finishing your custom travel blueprint...",
];

const TripPlanner: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [destination, setDestination] = useState("");
  const [budget, setBudget] = useState("Moderate");
  const [days, setDays] = useState(3);
  const [style, setStyle] = useState("Balanced");
  const [travelers, setTravelers] = useState(1);
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStatusIndex, setLoadingStatusIndex] = useState(0);
  const [customLoadingMessage, setCustomLoadingMessage] = useState<string | null>(null);

  // Rotate loading text for high fidelity loader
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStatusIndex((prev) => (prev + 1) % LOADING_STATUSES.length);
      }, 3500);
    } else {
      setLoadingStatusIndex(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((item) => item !== interest) : [...prev, interest]
    );
  };

  const handlePlanTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination.trim()) {
      setError("Please specify a travel destination!");
      return;
    }
    setError("");
    setLoading(true);

    try {
      // 1. Generate travel itinerary and packing list in parallel from Express Gemini Proxy API
      const [itinerary, packingListResponse] = await Promise.all([
        generateItinerary({
          destination,
          budget,
          days,
          interests: selectedInterests.join(", ") || "General Sightseeing",
          style,
          travelers,
        }),
        generatePackingList({
          destination,
          duration: days,
          season: "standard",
          type: style,
          weather: "favorable",
        }).catch((err) => {
          console.warn("Failed packing list fetch, using fallback packing list", err);
          return {
            categories: [
              {
                name: "Essentials",
                items: [
                  { name: "Passports & Visas", checked: false, reason: "Absolute travel requirements" },
                  { name: "Local Currency / Cards", checked: false, reason: "Required for shopping and dining" },
                  { name: "First-aid essentials", checked: false, reason: "Always safe to have" }
                ]
              }
            ]
          };
        })
      ]);

      // 2. Resolve precise coordinates for all generated places using Geocoding service (Google Geocoding / Nominatim)
      setCustomLoadingMessage("Pinpointing real-world coordinates for landmarks & stays...");
      const apiKey = firebaseConfig.apiKey;

      // Geocode Hotels
      if (itinerary.hotels && itinerary.hotels.length > 0) {
        for (const hotel of itinerary.hotels) {
          setCustomLoadingMessage(`Locating hotel: ${hotel.name}...`);
          try {
            const coords = await geocodePlace(hotel.name, destination, apiKey);
            if (coords) {
              hotel.lat = coords.lat;
              hotel.lng = coords.lng;
            }
          } catch (e) {
            console.error(`Failed to geocode hotel ${hotel.name}:`, e);
          }
        }
      }

      // Geocode Activities
      if (itinerary.days && itinerary.days.length > 0) {
        for (const day of itinerary.days) {
          if (day.activities && day.activities.length > 0) {
            for (const act of day.activities) {
              setCustomLoadingMessage(`Verifying map marker: ${act.title}...`);
              try {
                const coords = await geocodePlace(act.title, destination, apiKey);
                if (coords) {
                  act.lat = coords.lat;
                  act.lng = coords.lng;
                }
              } catch (e) {
                console.error(`Failed to geocode activity ${act.title}:`, e);
              }
            }
          }
        }
      }

      setCustomLoadingMessage("Finalizing your customized itinerary blueprint...");

      // 3. Save to Firestore
      if (user) {
        const tripId = await saveTrip({
          userId: user.uid,
          destination,
          budget,
          days,
          travelers,
          interests: selectedInterests.join(", "),
          style,
          itinerary,
          packingList: packingListResponse.categories,
          isFavorite: false,
          createdAt: Date.now(),
        });
        navigate(`/trip/${tripId}`);
      } else {
        throw new Error("User session expired. Please sign in again.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while designing your trip. Please try again.");
    } finally {
      setLoading(false);
      setCustomLoadingMessage(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <AnimatePresence mode="wait">
        {!loading ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="space-y-8"
          >
            {/* Intro Header */}
            <div className="text-center md:text-left">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-semibold tracking-wider uppercase border border-indigo-100 dark:border-indigo-900/60 inline-flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 animate-spin-slow" /> AI Travel Architect
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold font-display tracking-tight text-slate-900 dark:text-white mt-3">
                Design Your Next Adventure
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base mt-2 max-w-2xl font-light">
                Provide some basic travel details, and our generative AI will instantly draft a customized daily itinerary, map coordinates, and dynamic budget breakdown.
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-2xl text-sm font-medium">
                {error}
              </div>
            )}

            {/* Input Form */}
            <form onSubmit={handlePlanTrip} className="space-y-6">
              {/* Boxed sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Destination Input */}
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <MapPin className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Where are you going?</h3>
                      <p className="text-xs text-slate-400 font-light">Enter any city, region, or country</p>
                    </div>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Paris, Tokyo, Bali, New York"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                  />
                </div>

                {/* Duration Picker */}
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Calendar className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Trip Duration</h3>
                      <p className="text-xs text-slate-400 font-light">Up to 14 days of smart planning</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="14"
                      value={days}
                      onChange={(e) => setDays(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <span className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-xl border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                      {days} {days === 1 ? "Day" : "Days"}
                    </span>
                  </div>
                </div>

                {/* Travelers Picker */}
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Travelers</h3>
                      <p className="text-xs text-slate-400 font-light font-sans">Number of people on this trip</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={travelers}
                      onChange={(e) => setTravelers(Number(e.target.value))}
                      className="w-full accent-indigo-600"
                    />
                    <span className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-sm font-bold rounded-xl border border-indigo-100 dark:border-indigo-900/60 shrink-0">
                      {travelers} {travelers === 1 ? "Traveler" : "Travelers"}
                    </span>
                  </div>
                </div>

                {/* Budget Selection */}
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Budget Range</h3>
                      <p className="text-xs text-slate-400 font-light">Select preferred price segment</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {["Budget", "Moderate", "Luxury"].map((tier) => (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setBudget(tier)}
                        className={`py-2 px-3 text-xs md:text-sm font-semibold rounded-xl border transition-all ${
                          budget === tier
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15"
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {tier}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Travel Style */}
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 md:col-span-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Smile className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Travel Style</h3>
                      <p className="text-xs text-slate-400 font-light">Determine the daily pacing and scheduling</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2.5">
                    {["Relaxed", "Balanced", "Fast-Paced"].map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setStyle(item)}
                        className={`py-2.5 px-3 text-xs md:text-sm font-semibold rounded-xl border transition-all ${
                          style === item
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15"
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Interests Section */}
                <div className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 md:col-span-2">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-200">Select Activities / Interests</h3>
                      <p className="text-xs text-slate-400 font-light font-sans">Choose as many categories as you enjoy</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {INTEREST_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = selectedInterests.includes(opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => toggleInterest(opt.id)}
                          className={`flex items-center gap-2.5 p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-400 text-indigo-700 dark:text-indigo-300 font-medium"
                              : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                          }`}
                        >
                          <span className={`p-1.5 rounded-lg ${isSelected ? "bg-indigo-200/50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                            <Icon className="w-4 h-4" />
                          </span>
                          <span className="text-xs md:text-sm">{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Submit Planning Button */}
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
              >
                <PlaneTakeoff className="w-5 h-5" /> Generate Complete Trip Blueprint
              </button>
            </form>
          </motion.div>
        ) : (
          /* Loading Animation Block */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="min-h-[500px] flex flex-col items-center justify-center text-center p-6 space-y-8"
          >
            {/* Spinning glowing icon */}
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 blur-xl rounded-full w-24 h-24 animate-pulse mx-auto" />
              <div className="w-24 h-24 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin flex items-center justify-center relative z-10 bg-white dark:bg-slate-900">
                <Compass className="w-10 h-10 text-indigo-600 animate-pulse" />
              </div>
            </div>

            <div className="space-y-3 max-w-lg">
              <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-white font-display">
                Creating your Travel Experience...
              </h2>
              {/* Rotating Status Message */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={customLoadingMessage ? "custom" : loadingStatusIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold min-h-12 flex items-center justify-center px-4"
                >
                  {customLoadingMessage || LOADING_STATUSES[loadingStatusIndex]}
                </motion.p>
              </AnimatePresence>
              <p className="text-slate-400 text-xs font-light font-sans">
                This takes about 10-15 seconds. Our travel intelligence models are building a customized, data-rich plan.
              </p>
            </div>

            {/* Simulated progress boxes skeleton */}
            <div className="w-full max-w-sm border border-slate-200 dark:border-slate-800 rounded-2xl p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md space-y-3">
              <div className="h-3.5 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse" />
              <div className="h-3 w-full bg-slate-100 dark:bg-slate-800/60 rounded-full animate-pulse" />
              <div className="h-3 w-5/6 bg-slate-100 dark:bg-slate-800/60 rounded-full animate-pulse" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TripPlanner;
