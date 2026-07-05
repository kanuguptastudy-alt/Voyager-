import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import TripPlanner from "./pages/TripPlanner";
import TripDetails from "./pages/TripDetails";
import AIChatPage from "./pages/AIChatPage";
import { Compass, Sparkles, LogOut, Sun, Moon, CompassIcon, Plane, MessageSquare, Menu, X } from "lucide-react";

// Protected Route Guard
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-semibold animate-pulse">Syncing Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Layout component to share header, navbar, and dark mode toggling
const AppLayout: React.FC = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Load and apply theme on start
  useEffect(() => {
    const savedTheme = localStorage.getItem("travel-assistant-theme") as "light" | "dark";
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      // Default to dark mode for rich visual fidelity
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("travel-assistant-theme", newTheme);
  };

  const navLinks = [
    { path: "/dashboard", label: "Trips", icon: Plane },
    { path: "/plan", label: "Plan Trip", icon: Compass },
    { path: "/chat", label: "AI Chat", icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      
      {/* Premium Sticky Header */}
      <header className="sticky top-0 z-50 glass border-b border-slate-200/60 dark:border-slate-800/60 shadow-sm print:hidden">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo / Branding */}
          <Link to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-md group-hover:scale-105 transition-transform duration-200">
              <CompassIcon className="w-5 h-5 animate-spin-slow" />
            </div>
            <span className="text-lg font-bold font-display tracking-tight text-slate-950 dark:text-white flex items-center gap-1.5">
              Voyages <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
            </span>
          </Link>

          {/* Desktop Nav Items */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path || (link.path === "/dashboard" && location.pathname.startsWith("/trip/"));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/10"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* User Controls and Utility toggles */}
          <div className="hidden md:flex items-center gap-4">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-950 transition-all text-indigo-600 dark:text-indigo-400 cursor-pointer shadow-sm"
              title="Toggle theme"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>

            {/* Profile Sign-out dropdown */}
            <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
              <div className="text-right">
                <span className="text-xs font-semibold block text-slate-900 dark:text-white truncate max-w-[120px]">
                  {user?.email?.split("@")[0]}
                </span>
                <span className="text-[10px] text-slate-400 block font-light truncate max-w-[120px]">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 text-slate-400 hover:text-red-500 hover:border-red-500/25 transition-all cursor-pointer shadow-sm"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile hamburger menu toggle */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 cursor-pointer"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pt-2 pb-4 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col gap-2 shadow-inner">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2.5 p-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900"
                  }`}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {link.label}
                </Link>
              );
            })}
            
            <div className="border-t border-slate-100 dark:border-slate-900 pt-3 mt-1 flex items-center justify-between">
              <div className="text-left pl-2">
                <span className="text-xs font-semibold block text-slate-800 dark:text-slate-100 truncate max-w-[180px]">
                  {user?.email}
                </span>
              </div>
              <button
                onClick={logout}
                className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-500 bg-red-500/10 hover:bg-red-500/25 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                Sign Out <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Main App Page Panel */}
      <main className="flex-1 w-full bg-slate-50/50 dark:bg-slate-950/20 py-2">
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/plan" element={<TripPlanner />} />
          <Route path="/trip/:id" element={<TripDetails />} />
          <Route path="/chat" element={<AIChatPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </main>
    </div>
  );
};

const LoginRoute: React.FC = () => {
  const { user } = useAuth();
  return user ? <Navigate to="/dashboard" replace /> : <Login />;
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth Login Flow */}
          <Route path="/login" element={<LoginRoute />} />

          {/* Authenticated Dashboard Core layouts */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
