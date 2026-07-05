import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchTripById, updateTrip, fetchUserTrips } from "../services/db";
import { fetchWeather } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Trip, Activity, PackingCategory, WeatherData } from "../types";
import MapComponent from "../components/MapComponent";
import {
  Compass,
  Calendar,
  DollarSign,
  Users,
  CheckSquare,
  Square,
  CloudSun,
  MapPin,
  FileDown,
  ChevronRight,
  Sparkles,
  Award,
  BookOpen,
  ArrowLeft,
  Briefcase,
  Heart,
  TrendingUp,
  Wind,
  CloudRain,
  Sun,
  Map,
  Plus,
  Trash2,
  Save,
  Download,
  Copy,
} from "lucide-react";
import { motion } from "motion/react";

const TripDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"itinerary" | "budget" | "packing" | "weather" | "places">("itinerary");
  const [activeDay, setActiveDay] = useState<number>(1);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");

  // Reusable Packing Checklist states
  const { user } = useAuth();
  const [newItemName, setNewItemName] = useState("");
  const [newItemCategory, setNewItemCategory] = useState("Essentials");
  const [newItemReason, setNewItemReason] = useState("");
  const [isAddingCustomItem, setIsAddingCustomItem] = useState(false);
  const [allUserTrips, setAllUserTrips] = useState<Trip[]>([]);
  const [savedTemplates, setSavedTemplates] = useState<{ id: string; name: string; categories: PackingCategory[] }[]>([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTripIdToCopy, setSelectedTripIdToCopy] = useState("");

  useEffect(() => {
    // Load local templates
    const local = localStorage.getItem("travel_assistant_packing_templates");
    if (local) {
      try {
        setSavedTemplates(JSON.parse(local));
      } catch (e) {
        console.error("Failed to parse templates", e);
      }
    }

    // Load other trips
    const loadOtherTrips = async () => {
      if (user?.uid && id) {
        try {
          const trips = await fetchUserTrips(user.uid);
          setAllUserTrips(trips.filter((t) => t.id !== id));
        } catch (e) {
          console.error("Failed to fetch other trips for copying packing list", e);
        }
      }
    };
    loadOtherTrips();
  }, [user, id]);

  const mergePackingLists = (current: PackingCategory[], target: PackingCategory[]): PackingCategory[] => {
    const copyCurrent = JSON.parse(JSON.stringify(current)) as PackingCategory[];

    target.forEach(targetCat => {
      let existingCat = copyCurrent.find(c => c.name.toLowerCase() === targetCat.name.toLowerCase());
      if (!existingCat) {
        existingCat = { name: targetCat.name, items: [] };
        copyCurrent.push(existingCat);
      }

      targetCat.items.forEach(targetItem => {
        const duplicate = existingCat!.items.find(i => i.name.toLowerCase() === targetItem.name.toLowerCase());
        if (!duplicate) {
          existingCat!.items.push({
            name: targetItem.name,
            checked: false,
            reason: targetItem.reason || "",
          });
        }
      });
    });

    return copyCurrent;
  };

  const handleAddPackingItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip || !trip.id || !newItemName.trim() || !newItemCategory.trim()) return;

    const updatedPacking = JSON.parse(JSON.stringify(trip.packingList || [])) as PackingCategory[];
    const categoryName = newItemCategory.trim();

    let targetCat = updatedPacking.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
    if (!targetCat) {
      targetCat = { name: categoryName, items: [] };
      updatedPacking.push(targetCat);
    }

    targetCat.items.push({
      name: newItemName.trim(),
      checked: false,
      reason: newItemReason.trim(),
    });

    try {
      setTrip({ ...trip, packingList: updatedPacking });
      await updateTrip(trip.id, { packingList: updatedPacking });
      setNewItemName("");
      setNewItemReason("");
      setIsAddingCustomItem(false);
    } catch (err) {
      console.error("Failed to add packing item:", err);
    }
  };

  const handleDeletePackingItem = async (categoryIndex: number, itemIndex: number) => {
    if (!trip || !trip.id || !trip.packingList) return;

    const updatedPacking = JSON.parse(JSON.stringify(trip.packingList)) as PackingCategory[];
    updatedPacking[categoryIndex].items.splice(itemIndex, 1);

    // If category is now empty, remove the category
    if (updatedPacking[categoryIndex].items.length === 0) {
      updatedPacking.splice(categoryIndex, 1);
    }

    try {
      setTrip({ ...trip, packingList: updatedPacking });
      await updateTrip(trip.id, { packingList: updatedPacking });
    } catch (err) {
      console.error("Failed to delete packing item:", err);
    }
  };

  const handleSaveAsTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTemplateName.trim() || !trip?.packingList) return;

    const cleanCategories = JSON.parse(JSON.stringify(trip.packingList)) as PackingCategory[];
    cleanCategories.forEach(cat => {
      cat.items.forEach(item => {
        item.checked = false;
      });
    });

    const newTemplate = {
      id: Math.random().toString(36).substring(2, 9),
      name: newTemplateName.trim(),
      categories: cleanCategories,
    };

    const updated = [...savedTemplates, newTemplate];
    setSavedTemplates(updated);
    localStorage.setItem("travel_assistant_packing_templates", JSON.stringify(updated));
    setNewTemplateName("");
    setIsSavingTemplate(false);
  };

  const handleDeleteTemplate = (templateId: string) => {
    const updated = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updated);
    localStorage.setItem("travel_assistant_packing_templates", JSON.stringify(updated));
    if (selectedTemplateId === templateId) {
      setSelectedTemplateId("");
    }
  };

  const handleImportTemplate = async (templateId: string) => {
    if (!trip || !trip.id) return;
    const template = savedTemplates.find(t => t.id === templateId);
    if (!template) return;

    const merged = mergePackingLists(trip.packingList || [], template.categories);

    try {
      setTrip({ ...trip, packingList: merged });
      await updateTrip(trip.id, { packingList: merged });
      setSelectedTemplateId("");
    } catch (err) {
      console.error("Failed to import template:", err);
    }
  };

  const handleCopyFromTrip = async (otherTripId: string) => {
    if (!trip || !trip.id) return;
    const otherTrip = allUserTrips.find(t => t.id === otherTripId);
    if (!otherTrip || !otherTrip.packingList) return;

    const merged = mergePackingLists(trip.packingList || [], otherTrip.packingList);

    try {
      setTrip({ ...trip, packingList: merged });
      await updateTrip(trip.id, { packingList: merged });
      setSelectedTripIdToCopy("");
    } catch (err) {
      console.error("Failed to copy packing list from other trip:", err);
    }
  };

  useEffect(() => {
    const loadTrip = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const data = await fetchTripById(id);
        if (data) {
          setTrip(data);
          
          // Lazily fetch weather for the destination coordinates
          const firstAct = data.itinerary?.days?.[0]?.activities?.[0];
          if (firstAct && firstAct.lat && firstAct.lng) {
            fetchDestinationWeather(firstAct.lat, firstAct.lng);
          }
        } else {
          navigate("/dashboard");
        }
      } catch (err) {
        console.error("Error loading trip:", err);
      } finally {
        setLoading(false);
      }
    };

    loadTrip();
  }, [id]);

  const fetchDestinationWeather = async (lat: number, lng: number) => {
    setWeatherLoading(true);
    setWeatherError("");
    try {
      const data = await fetchWeather(lat, lng);
      setWeather(data);
    } catch (err) {
      console.error(err);
      setWeatherError("Weather forecast is currently unavailable.");
    } finally {
      setWeatherLoading(false);
    }
  };

  const handleToggleFavorite = async () => {
    if (!trip || !trip.id) return;
    const newVal = !trip.isFavorite;
    try {
      await updateTrip(trip.id, { isFavorite: newVal });
      setTrip({ ...trip, isFavorite: newVal });
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  const handleTogglePackingItem = async (categoryIndex: number, itemIndex: number) => {
    if (!trip || !trip.id || !trip.packingList) return;

    // Deep copy packing list
    const updatedPacking = JSON.parse(JSON.stringify(trip.packingList)) as PackingCategory[];
    const currentItem = updatedPacking[categoryIndex].items[itemIndex];
    currentItem.checked = !currentItem.checked;

    try {
      // Optimistic state update
      setTrip({ ...trip, packingList: updatedPacking });
      await updateTrip(trip.id, { packingList: updatedPacking });
    } catch (err) {
      console.error("Failed to update packing item:", err);
    }
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-8 animate-pulse">
        <div className="h-6 w-1/4 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="h-10 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[400px]">
          <div className="md:col-span-2 bg-slate-100 dark:bg-slate-800/40 rounded-3xl" />
          <div className="bg-slate-100 dark:bg-slate-800/40 rounded-3xl" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <h2 className="text-xl font-bold">Trip not found</h2>
        <button onClick={() => navigate("/dashboard")} className="px-4 py-2 bg-indigo-600 text-white rounded-xl">
          Return to Dashboard
        </button>
      </div>
    );
  }

  // Flatten all activities to display on the map
  const allActivities: Activity[] = trip.itinerary?.days?.flatMap((d) => d.activities) || [];
  const currentDayActivities = trip.itinerary?.days?.find((d) => d.day === activeDay)?.activities || [];

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 print:p-0 print:m-0">
      
      {/* Printable PDF Layout Cover - Hidden in standard UI, visible on print */}
      <div className="hidden print:block p-8 space-y-8">
        <div className="text-center border-b pb-8 border-slate-200">
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 uppercase">
            Custom Travel Blueprint
          </h1>
          <p className="text-lg text-indigo-600 font-semibold mt-2">{trip.destination}</p>
          <p className="text-sm text-slate-500 mt-1">
            {trip.days} Days • {trip.travelers} {trip.travelers === 1 ? "Traveler" : "Travelers"} • {trip.budget} Budget
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Trip Overview</h2>
          <p className="text-slate-600 text-sm leading-relaxed">{trip.itinerary?.summary}</p>
        </div>

        <div className="space-y-4 break-before-page">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Full Daily Schedule</h2>
          {trip.itinerary?.days?.map((day) => (
            <div key={day.day} className="space-y-3 mb-6">
              <h3 className="font-bold text-slate-700">Day {day.day}: {day.theme}</h3>
              <table className="w-full text-left text-xs border border-collapse border-slate-200">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 border">Time</th>
                    <th className="p-2 border">Activity</th>
                    <th className="p-2 border">Description</th>
                    <th className="p-2 border">Estimated Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {day.activities?.map((act, i) => (
                    <tr key={i}>
                      <td className="p-2 border font-medium">{act.time}</td>
                      <td className="p-2 border font-semibold">{act.title}</td>
                      <td className="p-2 border text-slate-500">{act.description}</td>
                      <td className="p-2 border font-medium">${act.cost}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        <div className="space-y-4 break-before-page">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Budget Allocation</h2>
          <table className="w-full text-left text-sm border border-collapse border-slate-200">
            <thead>
              <tr className="bg-slate-100">
                <th className="p-3 border">Category</th>
                <th className="p-3 border">Estimated Cost (USD)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border">Accommodation</td>
                <td className="p-3 border">${trip.itinerary?.budgetBreakdown?.accommodation}</td>
              </tr>
              <tr>
                <td className="p-3 border">Food & Meals</td>
                <td className="p-3 border">${trip.itinerary?.budgetBreakdown?.food}</td>
              </tr>
              <tr>
                <td className="p-3 border">Local Transportation</td>
                <td className="p-3 border">${trip.itinerary?.budgetBreakdown?.transport}</td>
              </tr>
              <tr>
                <td className="p-3 border">Admissions & Activities</td>
                <td className="p-3 border">${trip.itinerary?.budgetBreakdown?.activities}</td>
              </tr>
              <tr>
                <td className="p-3 border">Emergency Fund</td>
                <td className="p-3 border">${trip.itinerary?.budgetBreakdown?.emergency}</td>
              </tr>
              <tr className="bg-slate-50 font-bold">
                <td className="p-3 border">Total Plan Cost</td>
                <td className="p-3 border">${trip.itinerary?.budgetBreakdown?.total}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="space-y-4 break-before-page">
          <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Traveler Tips</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-slate-600">
            {trip.itinerary?.tips?.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Screen Interface - Hidden on Print */}
      <div className="print:hidden space-y-6">
        
        {/* Navigation back and commands bar */}
        <div className="flex items-center justify-between">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-1 text-xs md:text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </Link>
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleToggleFavorite}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                trip.isFavorite
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 hover:text-amber-500"
              }`}
            >
              <Heart className={`w-4 h-4 ${trip.isFavorite ? "fill-current" : ""}`} />
            </button>
            <button
              onClick={handlePrintPDF}
              className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 hover:border-slate-300 text-xs md:text-sm font-semibold transition-all flex items-center gap-2"
            >
              <FileDown className="w-4 h-4 text-indigo-500" /> Export PDF
            </button>
          </div>
        </div>

        {/* Hero Meta Info */}
        <div className="p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm relative overflow-hidden">
          {/* Subtle background abstract shapes */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div className="space-y-2">
              <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-lg text-[10px] font-bold tracking-wider uppercase border border-indigo-100 dark:border-indigo-900/40">
                {trip.style} Adventure
              </span>
              <h1 className="text-3xl md:text-4xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                {trip.destination}
              </h1>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl font-light">
                {trip.itinerary?.summary}
              </p>
            </div>

            {/* Config metadata labels */}
            <div className="flex items-center gap-6 divide-x divide-slate-150 dark:divide-slate-800 shrink-0 border-t md:border-t-0 pt-4 md:pt-0">
              <div className="space-y-1 pl-4 md:pl-0">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Duration</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-indigo-500" /> {trip.days} Days
                </span>
              </div>
              <div className="space-y-1 pl-6">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Travelers</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1">
                  <Users className="w-4 h-4 text-indigo-500" /> {trip.travelers} {trip.travelers === 1 ? "Person" : "People"}
                </span>
              </div>
              <div className="space-y-1 pl-6">
                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block">Budget Level</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <DollarSign className="w-4 h-4" /> {trip.budget}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs bar */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px gap-1">
          {[
            { id: "itinerary", label: "Itinerary & Map", icon: Map },
            { id: "budget", label: "Budget Planner", icon: DollarSign },
            { id: "packing", label: "Packing List", icon: Briefcase },
            { id: "weather", label: "Weather Forecast", icon: CloudSun },
            { id: "places", label: "Places to Visit", icon: MapPin },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 text-xs md:text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 hover:border-slate-200 dark:hover:border-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="min-h-[400px]">
          
          {/* TAB 1: ITINERARY & MAP */}
          {activeTab === "itinerary" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              
              {/* Daily Schedule Timeline (col-span-7) */}
              <div className="lg:col-span-7 space-y-6">
                {/* Day Selectors */}
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  {trip.itinerary?.days?.map((d) => (
                    <button
                      key={d.day}
                      onClick={() => setActiveDay(d.day)}
                      className={`px-4 py-2.5 rounded-xl border text-xs md:text-sm font-bold transition-all cursor-pointer shrink-0 ${
                        activeDay === d.day
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/15"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950"
                      }`}
                    >
                      Day {d.day}
                    </button>
                  ))}
                </div>

                {/* Day Details */}
                {trip.itinerary?.days
                  ?.filter((d) => d.day === activeDay)
                  .map((day) => (
                    <div key={day.day} className="space-y-6">
                      <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">Theme of the Day</span>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{day.theme}</h3>
                      </div>

                      {/* Schedule Timeline */}
                      <div className="relative border-l border-slate-200 dark:border-slate-800 pl-6 ml-3 space-y-8">
                        {day.activities?.map((act, i) => (
                          <div key={i} className="relative">
                            {/* Point Bullet */}
                            <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-950 border-4 border-indigo-600" />
                            
                            {/* Card Info */}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between flex-wrap gap-2">
                                <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 tracking-wider font-mono">
                                  {act.time}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] font-semibold uppercase">
                                    {act.category}
                                  </span>
                                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                                    {act.cost > 0 ? `$${act.cost}` : "Free"}
                                  </span>
                                </div>
                              </div>
                              <h4 className="font-bold text-slate-900 dark:text-white text-base">
                                {act.title}
                              </h4>
                              <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm font-light leading-relaxed">
                                {act.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>

              {/* Map Interactive Frame (col-span-5) */}
              <div className="lg:col-span-5 h-[400px] lg:h-auto lg:sticky lg:top-24">
                <MapComponent activities={allActivities} activeDay={activeDay} />
              </div>
            </div>
          )}

          {/* TAB 2: BUDGET PLANNER */}
          {activeTab === "budget" && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  Budget Allocation <TrendingUp className="w-5 h-5 text-emerald-500" />
                </h3>
                <p className="text-xs text-slate-400 font-light mt-1">
                  Categorized financial overview for your planned vacation.
                </p>

                {/* Total Cost Banner */}
                <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-2xl border border-slate-200 dark:border-slate-800/80 my-6 flex items-center justify-between">
                  <div>
                    <span className="text-xs text-slate-400 block font-medium">Estimated Total Spend</span>
                    <span className="text-3xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400">
                      ${trip.itinerary?.budgetBreakdown?.total}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block font-medium">Average / Day</span>
                    <span className="text-base font-bold font-mono text-slate-800 dark:text-slate-200">
                      ${Math.round((trip.itinerary?.budgetBreakdown?.total || 0) / (trip.days || 1))} / day
                    </span>
                  </div>
                </div>

                {/* Bento progress blocks */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Accommodation", value: trip.itinerary?.budgetBreakdown?.accommodation, color: "bg-indigo-500" },
                    { label: "Dining & Food", value: trip.itinerary?.budgetBreakdown?.food, color: "bg-emerald-500" },
                    { label: "Local Transportation", value: trip.itinerary?.budgetBreakdown?.transport, color: "bg-purple-500" },
                    { label: "Sightseeing & Admissions", value: trip.itinerary?.budgetBreakdown?.activities, color: "bg-amber-500" },
                    { label: "Emergency & Contingency", value: trip.itinerary?.budgetBreakdown?.emergency, color: "bg-red-500" },
                  ].map((category, index) => {
                    const total = trip.itinerary?.budgetBreakdown?.total || 1;
                    const percent = Math.round(((category.value || 0) / total) * 100);
                    return (
                      <div key={index} className="p-4 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 space-y-3">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="text-slate-600 dark:text-slate-400">{category.label}</span>
                          <span className="font-mono text-slate-900 dark:text-white">
                            ${category.value} <span className="text-slate-400 font-light">({percent}%)</span>
                          </span>
                        </div>
                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div className={`h-full ${category.color}`} style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PACKING LIST */}
          {activeTab === "packing" && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                      Trip Packing Checklist <Briefcase className="w-5 h-5 text-indigo-500" />
                    </h3>
                    <p className="text-xs text-slate-400 font-light mt-1">
                      Add custom items, check items off, or save your setup as a template for other trips!
                    </p>
                  </div>
                  {/* Summary packed count */}
                  <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-400">
                    Packed {trip.packingList?.reduce((acc, cat) => acc + (cat.items?.filter(i => i.checked).length || 0), 0)} of {trip.packingList?.reduce((acc, cat) => acc + (cat.items?.length || 0), 0)} items
                  </div>
                </div>

                {/* Reusable Action Bar & Templates Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 border-b border-slate-100 dark:border-slate-800/80 pb-6 mt-6">
                  {/* Quick Copy from other trip */}
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <Copy className="w-3.5 h-3.5 text-indigo-500" /> Copy from another Trip
                    </h5>
                    <div className="flex gap-2">
                      <select
                        value={selectedTripIdToCopy}
                        onChange={(e) => setSelectedTripIdToCopy(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">Select trip...</option>
                        {allUserTrips.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.destination} ({t.days}d)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => selectedTripIdToCopy && handleCopyFromTrip(selectedTripIdToCopy)}
                        disabled={!selectedTripIdToCopy}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Saved Templates Import */}
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 space-y-2">
                    <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                      <Download className="w-3.5 h-3.5 text-indigo-500" /> Reuse Packing Templates
                    </h5>
                    <div className="flex gap-2">
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value="">Select template...</option>
                        {savedTemplates.map((temp) => (
                          <option key={temp.id} value={temp.id}>
                            {temp.name} ({temp.categories?.reduce((acc, c) => acc + (c.items?.length || 0), 0)} items)
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => selectedTemplateId && handleImportTemplate(selectedTemplateId)}
                        disabled={!selectedTemplateId}
                        className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        Load
                      </button>
                      {selectedTemplateId && (
                        <button
                          onClick={() => handleDeleteTemplate(selectedTemplateId)}
                          className="p-2 text-slate-400 hover:text-red-500 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer shrink-0"
                          title="Delete selected template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Save current list as template */}
                  <div className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/40 dark:bg-slate-950/10 flex flex-col justify-between">
                    <div className="space-y-2">
                      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 uppercase tracking-wide">
                        <Save className="w-3.5 h-3.5 text-indigo-500" /> Save Checklist as Template
                      </h5>
                      {!isSavingTemplate ? (
                        <button
                          onClick={() => setIsSavingTemplate(true)}
                          className="w-full py-2 border border-dashed border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/5 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                        >
                          + Create New Template
                        </button>
                      ) : (
                        <form onSubmit={handleSaveAsTemplate} className="flex gap-2">
                          <input
                            type="text"
                            required
                            placeholder="e.g., Business, Beach Trip"
                            value={newTemplateName}
                            onChange={(e) => setNewTemplateName(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            type="submit"
                            className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-xl transition-colors cursor-pointer shrink-0"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsSavingTemplate(false)}
                            className="px-2 py-2 text-xs text-slate-500 hover:text-slate-300 cursor-pointer shrink-0"
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>

                {/* Add Custom Item Section */}
                <div className="mt-6 border-b border-slate-100 dark:border-slate-800/80 pb-6">
                  {!isAddingCustomItem ? (
                    <button
                      onClick={() => setIsAddingCustomItem(true)}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600/10 hover:bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 text-xs font-bold rounded-xl transition-all cursor-pointer uppercase tracking-wider"
                    >
                      <Plus className="w-4 h-4" /> Add Custom Packing Item
                    </button>
                  ) : (
                    <form onSubmit={handleAddPackingItem} className="p-5 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 dark:bg-indigo-950/20 space-y-4 max-w-xl">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                          <Plus className="w-4 h-4 text-indigo-500" /> New Packing Item
                        </h4>
                        <button
                          type="button"
                          onClick={() => setIsAddingCustomItem(false)}
                          className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          Close Form
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wide text-slate-400">Item Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Swimwear, Charger"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wide text-slate-400">Category</label>
                          <select
                            value={newItemCategory}
                            onChange={(e) => setNewItemCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="Essentials">Essentials</option>
                            <option value="Clothing">Clothing</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Toiletries">Toiletries</option>
                            <option value="Documents">Documents</option>
                            <option value="Other">Other (Custom category)</option>
                          </select>
                        </div>
                      </div>

                      {newItemCategory === "Other" && (
                        <div className="space-y-1.5">
                          <label className="text-[10px] uppercase font-bold tracking-wide text-slate-400">Custom Category Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g., Adventure Gear"
                            onChange={(e) => setNewItemCategory(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                          />
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <label className="text-[10px] uppercase font-bold tracking-wide text-slate-400">Reason / Description (Optional)</label>
                        <input
                          type="text"
                          placeholder="e.g., For hotel beach days"
                          value={newItemReason}
                          onChange={(e) => setNewItemReason(e.target.value)}
                          className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl transition-all shadow-md shadow-indigo-600/10 cursor-pointer"
                      >
                        Add to Packing Checklist
                      </button>
                    </form>
                  )}
                </div>

                {/* Packing Sections */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                  {trip.packingList && trip.packingList.length > 0 ? (
                    trip.packingList.map((category, catIdx) => (
                      <div key={catIdx} className="space-y-3">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2 flex items-center justify-between">
                          <span>{category.name}</span>
                          <span className="text-xs font-mono font-normal text-slate-400">
                            ({category.items?.filter(i => i.checked).length || 0}/{category.items?.length || 0})
                          </span>
                        </h4>
                        <div className="space-y-1.5">
                          {category.items?.map((item, itemIdx) => (
                            <div
                              key={itemIdx}
                              className="w-full p-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-950/10 hover:bg-slate-50/80 dark:hover:bg-slate-950/80 flex items-center justify-between gap-3 transition-colors group"
                            >
                              <button
                                onClick={() => handleTogglePackingItem(catIdx, itemIdx)}
                                className="flex items-start gap-3 text-left flex-1 cursor-pointer"
                              >
                                <span className="mt-0.5 text-indigo-600 shrink-0">
                                  {item.checked ? (
                                    <CheckSquare className="w-4 h-4 fill-indigo-100 dark:fill-indigo-950" />
                                  ) : (
                                    <Square className="w-4 h-4 text-slate-400 group-hover:text-indigo-500" />
                                  )}
                                </span>
                                <div>
                                  <span className={`text-xs md:text-sm font-semibold text-slate-800 dark:text-slate-200 ${item.checked ? "line-through text-slate-400 dark:text-slate-500" : ""}`}>
                                    {item.name}
                                  </span>
                                  {item.reason && (
                                    <p className="text-[10px] md:text-xs text-slate-400 font-light mt-0.5 leading-tight">
                                      {item.reason}
                                    </p>
                                  )}
                                </div>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePackingItem(catIdx, itemIdx);
                                }}
                                className="text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer shrink-0"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-2 text-center py-12 text-slate-400 text-sm">
                      No packing items found. Click "+ Add Custom Packing Item" above to get started!
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: WEATHER FORECAST */}
          {activeTab === "weather" && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  Destination Weather Outlook <CloudSun className="w-5 h-5 text-indigo-500" />
                </h3>
                <p className="text-xs text-slate-400 font-light mt-1">
                  7-day atmospheric outlook powered directly by Open-Meteo.
                </p>

                {weatherLoading && (
                  <div className="py-12 flex flex-col items-center justify-center space-y-3">
                    <div className="w-8 h-8 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                    <p className="text-xs text-slate-400 font-medium animate-pulse">Contacting Open-Meteo services...</p>
                  </div>
                )}

                {weatherError && (
                  <div className="py-12 text-center text-sm text-slate-400 font-medium">
                    {weatherError}
                  </div>
                )}

                {!weatherLoading && !weatherError && weather && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4 mt-8">
                    {weather.dates?.map((dateStr, idx) => {
                      const maxTemp = weather.temperatureMax[idx];
                      const minTemp = weather.temperatureMin[idx];
                      const rainProb = weather.precipitationChance[idx];
                      const wind = weather.windSpeed[idx];
                      const dateObj = new Date(dateStr);
                      const isRainy = rainProb > 40;

                      return (
                        <div key={idx} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 text-center flex flex-col justify-between space-y-3.5">
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              {dateObj.toLocaleDateString("en-US", { weekday: "short" })}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">
                              {dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            </p>
                          </div>

                          {/* Weather Icon Indicator */}
                          <div className="mx-auto text-indigo-600 dark:text-indigo-400">
                            {isRainy ? (
                              <CloudRain className="w-8 h-8" />
                            ) : (
                              <Sun className="w-8 h-8 text-amber-500" />
                            )}
                          </div>

                          {/* High/Low */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-center gap-1.5 text-xs font-bold">
                              <span className="text-slate-800 dark:text-slate-100 font-mono">{Math.round(maxTemp)}°</span>
                              <span className="text-slate-400 font-mono font-normal">/ {Math.round(minTemp)}°</span>
                            </div>
                            
                            {/* Wind & Rain probabilities */}
                            <div className="flex items-center justify-center gap-2.5 text-[10px] text-slate-400">
                              <span className="flex items-center gap-0.5" title="Precipitation Chance">
                                <CloudRain className="w-3 h-3 text-sky-400" /> {rainProb}%
                              </span>
                              <span className="flex items-center gap-0.5" title="Wind speed">
                                <Wind className="w-3 h-3 text-slate-400" /> {Math.round(wind)}m/s
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PLACES TO VISIT */}
          {activeTab === "places" && (
            <div className="space-y-6">
              <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
                  Recommended Attractions & Sights <Award className="w-5 h-5 text-indigo-500" />
                </h3>
                <p className="text-xs text-slate-400 font-light mt-1">
                  Curated hot spots in {trip.destination} matching your profile.
                </p>

                {/* Recommendations Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {allActivities?.map((act, i) => (
                    <div key={i} className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/20 flex items-start gap-4">
                      <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[9px] font-semibold uppercase tracking-wide">
                            {act.category}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 dark:text-white text-sm md:text-base">{act.title}</h4>
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-light leading-relaxed">{act.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Practical tips footer card */}
        {trip.itinerary?.tips && trip.itinerary.tips.length > 0 && (
          <div className="p-6 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <h3 className="text-lg font-bold font-display text-slate-900 dark:text-white flex items-center gap-2">
              Practical Travel Tips <BookOpen className="w-5 h-5 text-amber-500" />
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {trip.itinerary.tips.map((tip, i) => (
                <div key={i} className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-slate-600 dark:text-slate-400 text-xs md:text-sm leading-relaxed flex items-start gap-2.5">
                  <span className="p-1 rounded bg-amber-100 dark:bg-amber-950/50 text-amber-600 shrink-0 text-xs font-bold font-mono">
                    {i + 1}
                  </span>
                  <p>{tip}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default TripDetails;
