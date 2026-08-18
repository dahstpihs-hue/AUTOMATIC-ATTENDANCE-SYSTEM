// backend/supabaseClient.js
const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.warn("WARNING: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your backend .env file!");
}

// Create a single supabase client instance that bypasses RLS for admin operations
const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseServiceRoleKey || "placeholder-key", {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

module.exports = supabase;
