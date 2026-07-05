import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { fetchUserTrips, deleteTrip, updateTrip } from "../services/db";
import { useAuth } from "../context/AuthContext";
import { Trip } from "../types";
import {
  Compass,
  Calendar,
  DollarSign,
  Users,
  Search,
  Star,
  Trash2,
  MapPin,
  Sparkles,
  Plane,
  Heart,
  Grid,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [trips, setTrips] = useState<Trip[]>([]);
  const [search, setSearch] = useState("");
  const [filterFavorite, setFilterFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTrips = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await fetchUserTrips(user.uid);
      setTrips(data);
    } catch (err) {
      console.error("Failed to load user trips:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
  }, [user]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.preventDefault(); // Stop click-through to details page
    e.stopPropagation();

    if (!window.confirm("Are you sure you want to delete this trip blueprint?")) {
      return;
    }

    try {
      await deleteTrip(id);
      setTrips((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      console.error("Failed to delete trip:", err);
    }
  };

  const handleToggleFavorite = async (e: React.MouseEvent, id: string, currentVal: boolean) => {
    e.preventDefault();
    e.stopPropagation();

    try {
      await updateTrip(id, { isFavorite: !currentVal });
      setTrips((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isFavorite: !currentVal } : t))
      );
    } catch (err) {
      console.error("Failed to toggle favorite:", err);
    }
  };

  // Filter trips based on search & favorites
  const filteredTrips = trips.filter((t) => {
    const matchesSearch = t.destination.toLowerCase().includes(search.toLowerCase());
    const matchesFav = filterFavorite ? t.isFavorite : true;
    return matchesSearch && matchesFav;
  });

  const totalTripsCount = trips.length;
  const favoriteTripsCount = trips.filter((t) => t.isFavorite).length;
  const totalDaysPlanned = trips.reduce((acc, curr) => acc + (curr.days || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Quick Dashboard Stats / Welcomer */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold font-display text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            Your Travel Dashboard <Sparkles className="w-6 h-6 text-indigo-500" />
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-light mt-1.5">
            Explore and review all your custom-planned destinations.
          </p>
        </div>
        <button
          onClick={() => navigate("/plan")}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/15 active:scale-[0.98] inline-flex items-center justify-center gap-2 cursor-pointer self-start md:self-auto"
        >
          <Compass className="w-4.5 h-4.5" /> Plan New Trip
        </button>
      </div>

      {/* Stats Counter Row */}
      <div className="grid grid-cols-3 gap-4 md:gap-6">
        <div className="p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Plane className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Trips</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">
              {totalTripsCount}
            </p>
          </div>
        </div>

        <div className="p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Star className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Favorites</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">
              {favoriteTripsCount}
            </p>
          </div>
        </div>

        <div className="p-4 md:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-4 shadow-sm">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Calendar className="w-5 h-5 md:w-6 md:h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium">Total Days</p>
            <p className="text-lg md:text-2xl font-bold text-slate-900 dark:text-white">
              {totalDaysPlanned}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search trips..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
          />
        </div>

        {/* Favorite Switch */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterFavorite(!filterFavorite)}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-semibold rounded-xl border transition-all cursor-pointer ${
              filterFavorite
                ? "bg-amber-500 border-amber-500 text-white shadow-md shadow-amber-500/15"
                : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            }`}
          >
            <Heart className={`w-4 h-4 ${filterFavorite ? "fill-current" : ""}`} /> Favorites Only
          </button>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((skeletonId) => (
            <div
              key={skeletonId}
              className="h-[280px] rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 animate-pulse"
            >
              <div className="h-6 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-lg" />
              <div className="h-4 w-1/2 bg-slate-100 dark:bg-slate-800/60 rounded-lg" />
              <div className="space-y-2.5 pt-4">
                <div className="h-3.5 w-full bg-slate-50 dark:bg-slate-800/40 rounded-full" />
                <div className="h-3.5 w-5/6 bg-slate-50 dark:bg-slate-800/40 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredTrips.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/10 p-8 space-y-5">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <Compass className="w-8 h-8 animate-spin-slow" />
          </div>
          <div className="space-y-1.5 max-w-sm mx-auto">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              No trip plans found
            </h3>
            <p className="text-slate-400 text-xs font-light">
              {trips.length === 0
                ? "You haven't designed any trip blueprints yet. Create your first smart vacation plan!"
                : "No saved trips match your search filters."}
            </p>
          </div>
          <button
            onClick={() => navigate("/plan")}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-2"
          >
            Create Trip Blueprint <Grid className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        /* Grid Render */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => {
            // Elegant CSS pattern colors based on destination length to vary colors
            const colors = [
              "from-indigo-500/10 to-indigo-600/5 border-indigo-500/10 dark:border-indigo-500/5",
              "from-emerald-500/10 to-emerald-600/5 border-emerald-500/10 dark:border-emerald-500/5",
              "from-purple-500/10 to-purple-600/5 border-purple-500/10 dark:border-purple-500/5",
              "from-amber-500/10 to-amber-600/5 border-amber-500/10 dark:border-amber-500/5",
            ];
            const colorClass = colors[trip.destination.length % colors.length];

            return (
              <motion.div
                key={trip.id}
                layoutId={trip.id}
                className={`group relative rounded-3xl border bg-gradient-to-br ${colorClass} bg-white dark:bg-slate-900 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none hover:-translate-y-1 transition-all overflow-hidden flex flex-col justify-between`}
              >
                {/* Heart and Favorite indicators */}
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase px-2.5 py-1 bg-indigo-500/5 rounded-lg">
                      <MapPin className="w-3 h-3" /> {trip.style || "Balanced"}
                    </span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={(e) => handleToggleFavorite(e, trip.id!, !!trip.isFavorite)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-950/60 shadow-sm border border-slate-100 dark:border-slate-800 text-amber-500 hover:scale-110 active:scale-95 transition-transform"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${trip.isFavorite ? "fill-current" : ""}`}
                        />
                      </button>
                      <button
                        onClick={(e) => handleDelete(e, trip.id!)}
                        className="p-1.5 rounded-lg bg-white dark:bg-slate-950/60 shadow-sm border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-red-500 hover:scale-110 active:scale-95 transition-transform"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Destination Info */}
                  <Link to={`/trip/${trip.id}`}>
                    <h3 className="text-xl font-bold font-display tracking-tight text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {trip.destination}
                    </h3>
                  </Link>
                  <p className="text-xs text-slate-400 mt-1 font-light italic">
                    Saved on {new Date(trip.createdAt).toLocaleDateString()}
                  </p>

                  <p className="text-slate-500 dark:text-slate-400 text-xs font-light mt-3.5 line-clamp-2">
                    {trip.itinerary?.summary}
                  </p>
                </div>

                {/* Footer specs */}
                <Link
                  to={`/trip/${trip.id}`}
                  className="px-6 py-4 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium"
                >
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> {trip.days} Days
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" /> {trip.travelers} {trip.travelers === 1 ? "Traveler" : "Travelers"}
                  </span>
                  <span className="flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                    <DollarSign className="w-3.5 h-3.5" /> {trip.budget}
                  </span>
                </Link>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
