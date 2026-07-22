import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY as string;

console.log("🔍 Supabase Configuration Test");
console.log("━".repeat(50));

// Check environment variables
if (!supabaseUrl) {
  console.error("❌ VITE_SUPABASE_URL is missing");
  process.exit(1);
}

if (!supabaseAnonKey) {
  console.error("❌ VITE_SUPABASE_ANON_KEY is missing");
  process.exit(1);
}

console.log("✅ Environment variables found");
console.log(`   URL: ${supabaseUrl}`);
console.log(`   Key: ${supabaseAnonKey.substring(0, 20)}...`);

// Create client
const supabase = createClient(supabaseUrl, supabaseAnonKey);
console.log("✅ Supabase client created");

// Test connection
async function testConnection() {
  try {
    console.log("\n🧪 Testing Supabase Connection...");
    
    // Try to query a simple table to verify connection
    const { data, error, status } = await supabase
      .from("machines")
      .select("count", { count: "exact", head: true });

    if (error) {
      console.error("❌ Query failed:", error.message);
      return false;
    }

    console.log("✅ Connected to Supabase!");
    console.log(`   Status: ${status}`);
    return true;
  } catch (err: any) {
    console.error("❌ Connection error:", err.message);
    return false;
  }
}

testConnection()
  .then((success) => {
    if (success) {
      console.log("\n✅ Supabase is configured correctly!");
      console.log("━".repeat(50));
      process.exit(0);
    } else {
      console.log("\n❌ Supabase configuration has issues");
      console.log("━".repeat(50));
      process.exit(1);
    }
  })
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
