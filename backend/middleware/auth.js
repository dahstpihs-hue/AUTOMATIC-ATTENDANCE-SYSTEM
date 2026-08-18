const supabase = require("../dbClient");

module.exports = (roles = []) => {
  if (typeof roles === "string") roles = [roles];

  return async (req, res, next) => {
    // Read token from Authorization header (Bearer <token>)
    let token = req.headers["authorization"]?.split(" ")[1];

    // Fallback: query parameter (for PDF report links, etc.)
    if (!token && req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: "No token provided" });
    }

    try {
      // 1. Verify token with Supabase Auth
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);

      if (authError || !user) {
        return res.status(401).json({ message: "Invalid or expired token", error: authError?.message });
      }

      // 2. Fetch the corresponding profile from users table
      let { data: dbUser, error: dbError } = await supabase
        .from("users")
        .select("*")
        .eq("email", user.email)
        .maybeSingle();

      if (dbError) {
        return res.status(500).json({ message: "Database lookup failed", error: dbError.message });
      }

      // Fallback: If no email match, try looking up by auth_id (in case of changes)
      if (!dbUser) {
        let { data: dbUserByAuth } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .maybeSingle();
        dbUser = dbUserByAuth;
      }

      if (!dbUser) {
        // Auto-register as pending user
        const { data: newUser, error: registerErr } = await supabase
          .from("users")
          .insert({
            id: user.id,
            auth_id: user.id,
            name: user.user_metadata?.full_name || user.email.split("@")[0],
            email: user.email,
            login_id: user.email.split("@")[0],
            role: "pending"
          })
          .select()
          .single();

        if (registerErr) {
          console.error("Auto-registration failed:", registerErr.message);
          return res.status(500).json({ message: "Auto-registration failed", error: registerErr.message });
        }
        dbUser = newUser;
      }

      // 3. Auto-link auth_id on first login
      if (!dbUser.auth_id) {
        const { error: linkError } = await supabase
          .from("users")
          .update({ auth_id: user.id })
          .eq("id", dbUser.id);
        
        if (linkError) {
          console.error("Failed to auto-link Supabase auth_id:", linkError.message);
        } else {
          dbUser.auth_id = user.id;
        }
      }

      // 4. Attach user payload (compatible with MongoDB route properties)
      req.user = {
        id: dbUser.id,
        authId: dbUser.auth_id,
        role: dbUser.role,
        email: dbUser.email,
        name: dbUser.name
      };

      // 5. Role-based access control check
      if (roles.length && !roles.includes(dbUser.role)) {
        return res.status(403).json({ message: "Access denied. Insufficient permissions." });
      }

      next();
    } catch (err) {
      console.error("Auth Middleware Error:", err);
      return res.status(401).json({ message: "Authentication failed", error: err.message });
    }
  };
};
