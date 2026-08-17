import { createClient } from '@supabase/supabase-js';

// La "anon key" de Supabase está diseñada para exponerse en el cliente (browser/app);
// la seguridad real la dan las políticas RLS configuradas en la base de datos.
// Se puede sobreescribir con variables de entorno de Vercel si se prefiere.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://awbrcwjxtauvggyfpdyt.supabase.co';
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3YnJjd2p4dGF1dmdneWZwZHl0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY5MjgyODAsImV4cCI6MjEwMjUwNDI4MH0.Rp-M7eFSralkUmu6lmCSZ2ikWagw-yqmkh5jEJCJGIs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
