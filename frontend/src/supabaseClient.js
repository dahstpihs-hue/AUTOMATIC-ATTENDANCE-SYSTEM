import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "placeholder-anon-key";

const isPlaceholder = !supabaseUrl || supabaseUrl.includes("placeholder") || supabaseUrl.includes("your-supabase-project");

export const supabase = isPlaceholder ? {
  auth: {
    getSession: async () => {
      const token = sessionStorage.getItem("token");
      if (token && token.startsWith("mock-token-")) {
        const emailOrPhone = token.replace("mock-token-", "");
        const isEmail = emailOrPhone.includes("@");
        return {
          data: {
            session: {
              access_token: token,
              user: {
                id: emailOrPhone,
                email: isEmail ? emailOrPhone : null,
                phone: isEmail ? null : emailOrPhone
              }
            }
          }
        };
      }
      return { data: { session: null } };
    },
    onAuthStateChange: (callback) => {
      // Simulate listener trigger
      const token = sessionStorage.getItem("token");
      if (token && token.startsWith("mock-token-")) {
        const emailOrPhone = token.replace("mock-token-", "");
        const isEmail = emailOrPhone.includes("@");
        callback("SIGNED_IN", {
          access_token: token,
          user: {
            id: emailOrPhone,
            email: isEmail ? emailOrPhone : null,
            phone: isEmail ? null : emailOrPhone
          }
        });
      }
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    signInWithOtp: async ({ email, phone }) => {
      console.log("🔓 [TPIHS LOCAL MODE] Sending simulated OTP to:", email || phone);
      return { error: null };
    },
    verifyOtp: async ({ email, phone, token }) => {
      console.log("🔓 [TPIHS LOCAL MODE] Verifying simulated OTP:", token);
      const identifier = email || phone || "admin@school.com";
      const mockToken = `mock-token-${identifier}`;
      sessionStorage.setItem("token", mockToken);
      
      // Force trigger context update
      setTimeout(() => {
        window.location.reload();
      }, 500);

      return {
        data: {
          user: {
            id: identifier,
            email: email || null,
            phone: phone || null
          }
        },
        error: null
      };
    },
    signInWithOAuth: async ({ provider }) => {
      // Direct login simulation as admin
      const identifier = "admin@school.com";
      const mockToken = `mock-token-${identifier}`;
      sessionStorage.setItem("token", mockToken);
      setTimeout(() => {
        window.location.reload();
      }, 500);
      return { error: null };
    },
    signOut: async () => {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      setTimeout(() => {
        window.location.reload();
      }, 500);
      return { error: null };
    }
  }
} : createClient(supabaseUrl, supabaseAnonKey);
