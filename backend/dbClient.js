const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ WARNING: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in backend environment variables.");
}

const supabase = createClient(
  supabaseUrl || "https://placeholder-url.supabase.co",
  supabaseKey || "placeholder-key"
);

module.exports = supabase;
