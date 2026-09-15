import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://mmmjiixymsbrddtixldw.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tbWppaXh5bXNicmRkdGl4bGR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNzIzMzgsImV4cCI6MjEwNDY0ODMzOH0.xlBm6Pfz_-zgaPOt8gfVpk-YK1vNvDIyCq0kiBGSpPw';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}
