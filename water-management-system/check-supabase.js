#!/usr/bin/env node

// Load environment from .env.local
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    if (line && !line.startsWith('#')) {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    }
  });
}

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

console.log('\n🔍 Supabase Configuration Check');
console.log('═'.repeat(60));

if (!url) {
  console.error('❌ VITE_SUPABASE_URL not found in .env.local');
  process.exit(1);
}

if (!key) {
  console.error('❌ VITE_SUPABASE_ANON_KEY not found in .env.local');
  process.exit(1);
}

console.log('✅ Environment variables loaded from .env.local');
console.log(`   URL: ${url}`);
console.log(`   Key: ${key.substring(0, 30)}...`);

// Test basic connectivity
console.log('\n🧪 Testing Supabase REST API...');

const https = require('https');

const testUrl = `${url}/rest/v1/`;
const headers = {
  'Authorization': `Bearer ${key}`,
  'Content-Type': 'application/json'
};

https.get(testUrl, { headers }, (res) => {
  console.log(`✅ Connected to Supabase!`);
  console.log(`   Status: ${res.statusCode}`);
  
  if (res.statusCode === 200) {
    console.log('\n✅ Supabase is configured and working!');
    console.log('═'.repeat(60));
    console.log('\nReady to:');
    console.log('  1. Run: npm run dev');
    console.log('  2. Deploy Edge Functions');
    console.log('  3. Apply database migrations');
  } else if (res.statusCode === 401) {
    console.error('\n❌ Authentication failed - check your Anon Key');
  }
}).on('error', (err) => {
  console.error(`❌ Connection error: ${err.message}`);
  console.error('\nMake sure:');
  console.error('  1. Supabase project is created at app.supabase.com');
  console.error('  2. URL format is: https://xxx.supabase.co');
  console.error('  3. Anon key is correct (not service role key)');
  process.exit(1);
});
