
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://vjslwgukffhkmdzryguz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc2x3Z3VrZmZoa21kenJ5Z3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MDk0MjEsImV4cCI6MjA1NTk4NTQyMX0.UHUwK7DApeA05dIjxRlq-r1zlvsGCItUoYDSy02TFss";

if (!SUPABASE_URL) throw new Error('Missing SUPABASE_URL');
if (!SUPABASE_ANON_KEY) throw new Error('Missing SUPABASE_ANON_KEY');

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    headers: {
      'x-app-version': '1.0.0',
    },
  },
});

// Enhanced error logging function with more details
export const logError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  
  if (error && error.message) {
    console.error(`Error message: ${error.message}`);
  }
  
  if (error && error.code) {
    console.error(`Error code: ${error.code}`);
  }
  
  if (error && error.details) {
    console.error(`Error details: ${JSON.stringify(error.details)}`);
  }
  
  return error;
};
