
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://kyxltkcfboyujnujjinq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5eGx0a2NmYm95dWpudWpqaW5xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcyMTgzOTMsImV4cCI6MjA4Mjc5NDM5M30.obcm6sudg6CL8MIlhgO-lHX3Cp8kYBTMCZGaaRnp5RM';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
