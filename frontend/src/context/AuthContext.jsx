import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import api from "../api/api";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = sessionStorage.getItem("user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token) => {
    try {
      const { data } = await api.get("/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setUser(data.user);
      sessionStorage.setItem("user", JSON.stringify(data.user));
      return data.user;
    } catch (err) {
      console.error("Failed to fetch user profile from backend:", err.message);
      setUser(null);
      sessionStorage.removeItem("user");
      sessionStorage.removeItem("token");
      await supabase.auth.signOut();
      throw err;
    }
  };

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          sessionStorage.setItem("token", session.access_token);
          await fetchProfile(session.access_token);
        } else {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("user");
          setUser(null);
        }
      } catch (err) {
        console.error("Auth init session failed:", err);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        sessionStorage.setItem("token", session.access_token);
        try {
          await fetchProfile(session.access_token);
        } catch (e) {
          console.error("Profile fetch on auth change failed:", e.message);
        }
      } else {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("user");
        setUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin + "/login"
      }
    });
    if (error) throw error;
  };

  const sendOtp = async ({ email, phone }) => {
    const params = {};
    if (email) params.email = email.trim().toLowerCase();
    if (phone) params.phone = phone.trim();

    const { error } = await supabase.auth.signInWithOtp(params);
    if (error) throw error;
  };

  const verifyOtp = async ({ email, phone, token }) => {
    const params = { token, type: email ? "email" : "sms" };
    if (email) params.email = email.trim().toLowerCase();
    if (phone) params.phone = phone.trim();

    const { data, error } = await supabase.auth.verifyOtp(params);
    if (error) throw error;
    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("user");
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithGoogle, sendOtp, verifyOtp, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
