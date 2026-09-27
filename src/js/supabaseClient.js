/**
 * Vendo Platform — Frontend Supabase Client Initializer
 * File: src/js/supabaseClient.js
 * 
 * Instructions:
 * Replace VENDO_SUPABASE_URL and VENDO_SUPABASE_ANON_KEY with your project credentials
 * from Supabase Dashboard -> Project Settings -> API.
 */

window.VENDO_CONFIG = {
  // Your Supabase Project URL
  SUPABASE_URL: window.__ENV?.SUPABASE_URL || "https://oidamfhjfcgyisrcacgc.supabase.co",
  
  // Your Supabase Public Anon Key (safe for client-side browser usage)
  SUPABASE_ANON_KEY: window.__ENV?.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9pZGFtZmhqZmNneWlzcmNhY2djIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA1MjU0MTEsImV4cCI6MjEwNjEwMTQxMX0.LQ_65ACYbrkpT1dsc7r1BIWKQi4yHbPoXzp65CDvNAc",
};

// Initialize Supabase JS Client if loaded via CDN
if (window.supabase) {
  window.supabaseClient = window.supabase.createClient(
    window.VENDO_CONFIG.SUPABASE_URL,
    window.VENDO_CONFIG.SUPABASE_ANON_KEY
  );
  console.log("Vendo Supabase Client initialized.");
}
