import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { auth } from "../firebase/config";

interface AuthContextType {
  user: any | null;
  loading: boolean;
  logout: () => Promise<void>;
  loginAsGuest: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [guestUser, setGuestUser] = useState<any | null>(() => {
    try {
      const saved = localStorage.getItem("travel_assistant_guest_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginAsGuest = () => {
    const mockUser = {
      uid: "guest-" + Math.random().toString(36).substring(2, 9),
      email: "guest@example.com",
      displayName: "Traveler Guest",
      isAnonymous: true,
    };
    localStorage.setItem("travel_assistant_guest_user", JSON.stringify(mockUser));
    setGuestUser(mockUser);
  };

  const logout = async () => {
    localStorage.removeItem("travel_assistant_guest_user");
    setGuestUser(null);
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Firebase signOut error", e);
    }
  };

  const activeUser = user || guestUser;

  return (
    <AuthContext.Provider value={{ user: activeUser, loading, logout, loginAsGuest }}>
      {(!loading || guestUser) ? children : <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
