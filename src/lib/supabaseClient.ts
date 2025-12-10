// Commenting out the Supabase client code as it's not needed for guest access
// import { createClient } from '@supabase/supabase-js'

// Get Supabase config from environment variables
// const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
// const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// Check if environment variables are set
// if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
//   console.warn('Supabase environment variables not set. Authentication will not work.')
// }

// Create Supabase client only if credentials are provided
// export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
//   ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
//   : null

// Export a null value to maintain the export interface
export const supabase = null