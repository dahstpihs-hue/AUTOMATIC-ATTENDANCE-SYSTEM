const supabase = require("./supabaseClient");

const email = process.argv[2];

if (!email || !email.includes("@")) {
  console.error("❌ Error: Please provide a valid email address.");
  console.log("Usage: node makeAdmin.js <email-address>");
  process.exit(1);
}

async function promote() {
  console.log(`🚀 Promoting email '${email}' to HOD (Admin) role...`);

  // Check if the user already exists in the public users table
  const { data: existingUser, error: checkError } = await supabase
    .from("users")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .maybeSingle();

  if (checkError) {
    console.error("❌ Database check failed:", checkError.message);
    process.exit(1);
  }

  if (existingUser) {
    // Promote existing user to admin
    const { data: updated, error: updateError } = await supabase
      .from("users")
      .update({ role: "admin" })
      .eq("id", existingUser.id)
      .select()
      .single();

    if (updateError) {
      console.error("❌ Promotion failed:", updateError.message);
    } else {
      console.log(`🎉 Success! Existing user '${updated.name}' has been promoted to HOD (Admin).`);
    }
  } else {
    // User does not exist, insert them as an admin so that when they sign in, they automatically get admin access
    const name = email.split("@")[0].replace(/\./g, " ");
    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert({
        name: name.replace(/\b\w/g, c => c.toUpperCase()), // capitalize words
        email: email.trim().toLowerCase(),
        login_id: email.split("@")[0].trim().toLowerCase(),
        role: "admin"
      })
      .select()
      .single();

    if (insertError) {
      console.error("❌ Failed to create pre-registered Admin profile:", insertError.message);
    } else {
      console.log(`🎉 Success! Email '${email}' has been pre-registered as HOD (Admin) under name '${inserted.name}'.`);
      console.log("👉 Now, open the portal, click 'Continue with Gmail', and log in using this Gmail account to access the dashboard!");
    }
  }
}

promote();
