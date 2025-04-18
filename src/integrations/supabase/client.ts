
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
export const supabase = createClient(
  'https://vjslwgukffhkmdzryguz.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqc2x3Z3VrZmZoa21kenJ5Z3V6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA0MDk0MjEsImV4cCI6MjA1NTk4NTQyMX0.UHUwK7DApeA05dIjxRlq-r1zlvsGCItUoYDSy02TFss'
);

// Helper function to log errors with context
export const logError = (error: any, context: string) => {
  console.error(`Error in ${context}:`, error);
  return error;
};
