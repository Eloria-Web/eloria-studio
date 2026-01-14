// Supabase initialization
// Credenciales de Supabase ya configuradas

const SUPABASE_URL = 'https://yhvsajcckskoachzstme.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_FTJ-KY2wEIUgkULMk5livA_TK_YAatF';

// Initialize Supabase client
if (typeof supabase !== 'undefined') {
  window.supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  console.log('Supabase inicializado correctamente');
} else {
  console.error('Supabase SDK not loaded. Make sure @supabase/supabase-js is included.');
}
