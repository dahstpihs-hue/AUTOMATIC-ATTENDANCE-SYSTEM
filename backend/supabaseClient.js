// backend/supabaseClient.js
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const supabaseUrl = process.env.SUPABASE_URL || "https://placeholder-url.supabase.co";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder-key";

const isPlaceholder = !supabaseUrl || supabaseUrl.includes("placeholder") || supabaseUrl.includes("your-supabase-project");

let supabase;

if (isPlaceholder) {
  console.log("⚠️  [TPIHS LOCAL MODE] USING FILE-BASED JSON DATABASE (NO EXTERNAL DB OR INTERNET REQUIRED)");

  const DATA_DIR = process.env.VERCEL
    ? path.join("/tmp", "data")
    : path.join(__dirname, "data");
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const readTable = (table) => {
    if (table === "lectures_view" || table === "defaulters_view") return [];
    const file = path.join(DATA_DIR, `${table}.json`);
    if (!fs.existsSync(file)) return [];
    try {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      return [];
    }
  };

  const writeTable = (table, data) => {
    const file = path.join(DATA_DIR, `${table}.json`);
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  };

  // Seed default admin accounts if no users exist
  const usersFile = path.join(DATA_DIR, "users.json");
  if (!fs.existsSync(usersFile)) {
    const defaultUsers = [
      {
        id: "admin-dummy-id",
        auth_id: "admin-dummy-id",
        name: "Muhammad Farooq",
        email: "admin@school.com",
        login_id: "admin",
        role: "admin",
        created_at: new Date().toISOString()
      }
    ];
    fs.writeFileSync(usersFile, JSON.stringify(defaultUsers, null, 2), "utf8");
  }

  class MockQueryBuilder {
    constructor(table) {
      this.table = table;
      this.data = readTable(table);
      this.filters = [];
      this.orderCol = null;
      this.ascending = true;
      this.limitVal = null;
    }

    select(cols = "*") {
      return this;
    }

    eq(col, val) {
      this.filters.push((item) => String(item[col]) === String(val));
      return this;
    }

    neq(col, val) {
      this.filters.push((item) => String(item[col]) !== String(val));
      return this;
    }

    in(col, vals) {
      this.filters.push((item) => vals.includes(item[col]));
      return this;
    }

    order(col, { ascending = true } = {}) {
      this.orderCol = col;
      this.ascending = ascending;
      return this;
    }

    limit(n) {
      this.limitVal = n;
      return this;
    }

    maybeSingle() {
      return this.then((res) => {
        return { data: res.data[0] || null, error: null };
      });
    }

    single() {
      return this.then((res) => {
        return { data: res.data[0] || null, error: res.data[0] ? null : { message: "Not found" } };
      });
    }

    async insert(payload) {
      const items = Array.isArray(payload) ? payload : [payload];
      const newItems = items.map(item => ({
        id: item.id || Math.random().toString(36).substring(2, 9),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...item
      }));
      this.data.push(...newItems);
      writeTable(this.table, this.data);
      return { data: Array.isArray(payload) ? newItems : newItems[0], error: null };
    }

    async update(payload) {
      const matching = this.getMatching();
      matching.forEach(item => {
        Object.assign(item, payload, { updated_at: new Date().toISOString() });
      });
      writeTable(this.table, this.data);
      return { data: matching, error: null };
    }

    async delete() {
      const matching = this.getMatching();
      const ids = matching.map(m => m.id);
      const remaining = this.data.filter(item => !ids.includes(item.id));
      writeTable(this.table, remaining);
      return { data: matching, error: null };
    }

    getMatching() {
      let result = [...this.data];
      this.filters.forEach(filter => {
        result = result.filter(filter);
      });
      return result;
    }

    then(onfulfilled) {
      let result = this.getMatching();

      if (this.orderCol) {
        result.sort((a, b) => {
          const valA = a[this.orderCol];
          const valB = b[this.orderCol];
          if (valA < valB) return this.ascending ? -1 : 1;
          if (valA > valB) return this.ascending ? 1 : -1;
          return 0;
        });
      }

      if (this.limitVal) {
        result = result.slice(0, this.limitVal);
      }

      return Promise.resolve({ data: result, error: null }).then(onfulfilled);
    }
  }

  supabase = {
    from: (table) => new MockQueryBuilder(table),
    auth: {
      getUser: async (token) => {
        if (token && token.startsWith("mock-token-")) {
          const emailOrPhone = token.replace("mock-token-", "");
          const isEmail = emailOrPhone.includes("@");
          return {
            data: {
              user: {
                id: emailOrPhone,
                email: isEmail ? emailOrPhone : null,
                phone: isEmail ? null : emailOrPhone,
                user_metadata: { full_name: emailOrPhone.split("@")[0] }
              }
            },
            error: null
          };
        }
        return { data: { user: null }, error: { message: "Invalid token" } };
      },
      admin: {
        createUser: async (payload) => {
          return { data: { user: { id: payload.email, email: payload.email } }, error: null };
        },
        deleteUser: async (id) => {
          return { error: null };
        },
        listUsers: async () => {
          return { data: { users: [] }, error: null };
        }
      }
    }
  };
} else {
  supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

module.exports = supabase;
