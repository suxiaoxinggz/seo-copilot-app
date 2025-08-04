import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types';

// This file no longer creates the client directly.
// It exports an initializer function.
// The single instance will be created in App.tsx after fetching config.

export const initializeSupabase = (url: string, anonKey: string): SupabaseClient<Database> => {
    if (!url || !anonKey) {
        throw new Error("Supabase URL and Anon Key are required for initialization.");
    }
    return createClient<Database>(url, anonKey);
};