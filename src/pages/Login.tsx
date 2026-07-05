import React, { useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../firebase/config";
import { Mail, Lock, LogIn, UserPlus, HelpCircle, Compass, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";

const Login: React.FC = () => {
  const { loginAsGuest } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else if (mode === "register") {
        if (password !== confirmPassword) {
          throw new Error("Passwords do not match.");
        }
        if (password.length < 6) {
          throw new Error("Password must be at least 6 characters long.");
        }
        await createUserWithEmailAndPassword(auth, email, password);
      } else if (mode === "forgot") {
        await sendPasswordResetEmail(auth, email);
        setMessage("Password reset email sent! Check your inbox.");
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = err.message || "An authentication error occurred.";
      if (err.code === "auth/user-not-found") errMsg = "No user found with this email.";
      if (err.code === "auth/wrong-password") errMsg = "Incorrect password.";
      if (err.code === "auth/email-already-in-use") errMsg = "Email is already registered.";
      if (err.code === "auth/operation-not-allowed") {
        errMsg = "Email/Password sign-in is not enabled in your Firebase project. To enable it: \n1. Go to the Firebase Console.\n2. Navigate to Build > Authentication > Sign-in method.\n3. Click 'Add new provider' and choose 'Email/Password'.\n4. Enable it and save changes.";
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error(err);
      // If inside iframe block, show a graceful warning
      setError("Google Sign In failed. This is often blocked inside container previews. Please register with Email/Password instead!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-900 font-sans">
      {/* Decorative Background Circles */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Card */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-8 rounded-3xl border border-slate-800/80 bg-slate-950/80 backdrop-blur-xl shadow-2xl relative z-10 m-4"
      >
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-4 animate-pulse">
            <Compass className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold font-display tracking-tight text-white flex items-center justify-center gap-2">
            Voyages <Sparkles className="w-5 h-5 text-indigo-400" />
          </h1>
          <p className="text-slate-400 text-sm mt-2 font-light">
            Plan, customize, and budget your dream trip with AI
          </p>
        </div>

        {/* Form Alerts */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3.5 rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 text-xs font-medium"
            >
              {error}
            </motion.div>
          )}
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 text-xs font-medium"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Form */}
        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
              />
            </div>
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border border-slate-800 bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full pl-10 pr-4 py-3 text-sm rounded-xl border bg-slate-900/60 text-white placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                    confirmPassword && confirmPassword !== password
                      ? "border-red-500/50 focus:ring-red-500/30 focus:border-red-500"
                      : "border-slate-800 focus:ring-indigo-500/50 focus:border-indigo-500"
                  }`}
                />
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-[11px] text-red-400 mt-1.5 font-medium">
                  Passwords do not match
                </p>
              )}
            </div>
          )}

          {mode === "login" && (
            <div className="text-right">
              <button
                type="button"
                onClick={() => setMode("forgot")}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === "login" && (
                  <>
                    Sign In <LogIn className="w-4 h-4" />
                  </>
                )}
                {mode === "register" && (
                  <>
                    Create Account <UserPlus className="w-4 h-4" />
                  </>
                )}
                {mode === "forgot" && (
                  <>
                    Send Reset Link <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={loginAsGuest}
            className="w-full py-3 px-4 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/50 text-slate-200 hover:text-white text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-3 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            Instant Demo Access (Skip Sign In)
          </button>
        </form>

        {/* SSO Separator */}
        {mode !== "forgot" && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-slate-950 px-3 text-slate-500 font-medium">Or continue with</span>
              </div>
            </div>

            {/* Google Sign-in */}
            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900/40 hover:bg-slate-900/80 text-white text-sm font-medium transition-all flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  fill="#EA4335"
                />
              </svg>
              Google
            </button>
          </>
        )}

        {/* Switch Auth Modes */}
        <div className="mt-8 text-center text-xs text-slate-500">
          {mode === "login" && (
            <p>
              New to Voyages?{" "}
              <button
                onClick={() => setMode("register")}
                className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1 focus:outline-none transition-colors"
              >
                Sign Up
              </button>
            </p>
          )}
          {mode === "register" && (
            <p>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-indigo-400 hover:text-indigo-300 font-semibold ml-1 focus:outline-none transition-colors"
              >
                Sign In
              </button>
            </p>
          )}
          {mode === "forgot" && (
            <button
              onClick={() => setMode("login")}
              className="text-indigo-400 hover:text-indigo-300 font-semibold focus:outline-none transition-colors flex items-center justify-center gap-1 mx-auto"
            >
              <HelpCircle className="w-3.5 h-3.5" /> Back to Sign In
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
