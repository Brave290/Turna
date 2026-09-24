import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  'https://dhedoxczmbwrgetibvmy.supabase.co';

const SUPABASE_ANON_KEY =
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRoZWRveGN6bWJ3cmdldGlidm15Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk4Mjg0MDQsImV4cCI6MjEwNTQwNDQwNH0.IoV4TnlBVbaFcYy_T1PnxfbJ14uvPeV9hKJCbku24e4';

export const APP_API_URL = (
  process.env.EXPO_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  'https://turnaapp.vercel.app'
).replace(/\/$/, '');

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
});
