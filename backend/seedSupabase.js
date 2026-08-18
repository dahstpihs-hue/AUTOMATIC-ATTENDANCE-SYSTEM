const supabase = require("./supabaseClient");

async function seed() {
  console.log("🚀 Starting Supabase Seeding...");

  // 1. Clean existing records in tables to avoid duplicate conflicts
  // Delete profiles first due to foreign keys
  await supabase.from("students").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("teachers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const seedUsers = [
    { name: "Muhammad Farooq", email: "admin@school.com", password: "admin123", role: "admin" },
    { name: "Academic Coordinator", email: "coordinator@tpihs.edu.pk", password: "coordinator123", role: "coordinator" },
    { name: "Muhammad Farooq's Parent", email: "parent@tpihs.edu.pk", password: "parent123", role: "parent", parent_phone: "parent" },
    { name: "Managing Director", email: "md@tpihs.edu.pk", password: "md123", role: "md" },
    { name: "Department Head", email: "head@tpihs.edu.pk", password: "head123", role: "head" },
    { name: "Dr. Farooq", email: "teacher@tpihs.edu.pk", password: "teacher123", role: "teacher" },
    { name: "Sufyan Khan", email: "student@tpihs.edu.pk", password: "student123", role: "student" }
  ];

  // List existing auth users to prevent duplicates
  const { data: authUsersList, error: listError } = await supabase.auth.admin.listUsers();
  const existingUsersMap = new Map((authUsersList?.users || []).map(u => [u.email, u.id]));

  for (const u of seedUsers) {
    console.log(`Processing user: ${u.email}...`);
    
    // Delete existing auth user if they exist to start fresh
    if (existingUsersMap.has(u.email)) {
      const existingId = existingUsersMap.get(u.email);
      console.log(`Deleting pre-existing auth user ${u.email}...`);
      await supabase.auth.admin.deleteUser(existingId);
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.name }
    });

    if (error) {
      console.error(`❌ Failed to create auth user ${u.email}:`, error.message);
      continue;
    }

    const authUser = data.user;
    console.log(`✔ Auth User Created: ${authUser.id}`);

    // Insert user into public.users
    const { data: publicUser, error: pubErr } = await supabase
      .from("users")
      .insert({
        id: authUser.id,
        auth_id: authUser.id,
        name: u.name,
        email: u.email,
        login_id: u.email.split("@")[0],
        parent_phone: u.parent_phone || null,
        role: u.role
      })
      .select()
      .single();

    if (pubErr) {
      console.error(`❌ Failed to insert public user for ${u.email}:`, pubErr.message);
      continue;
    }

    // Create corresponding profiles
    if (u.role === "teacher") {
      const { error: profErr } = await supabase.from("teachers").insert({
        name: u.name,
        email: u.email,
        phone: "0300-1234567",
        subject: "BS Radiology & Imaging",
        class: "RADIOLOGY",
        section: "BATCH 1",
        user_id: publicUser.id
      });
      if (profErr) console.error("❌ Failed to create teacher profile:", profErr.message);
      else console.log("✔ Teacher Profile Created");
    } else if (u.role === "student") {
      const { error: profErr } = await supabase.from("students").insert({
        name: u.name,
        dob: "2004-01-01",
        gender: "Male",
        class: "RADIOLOGY",
        section: "BATCH 1",
        roll_number: "STD-RAD-BATCH-001",
        parent_name: "Muhammad Farooq",
        parent_phone: "parent",
        address: "Mardan, Pakistan",
        user_id: publicUser.id
      });
      if (profErr) console.error("❌ Failed to create student profile:", profErr.message);
      else console.log("✔ Student Profile Created");
    }
  }

  console.log("🎉 Seeding Completed successfully!");
}

seed().catch(err => {
  console.error("Seeding crashed:", err);
});
