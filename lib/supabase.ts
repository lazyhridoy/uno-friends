import { createClient } from '@supabase/supabase-js';

// Go into the secret .env.local vault and grab the keys
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create the official messenger we will use everywhere in our app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);