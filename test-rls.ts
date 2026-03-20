import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  // Login as the user
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'rafael.viana25@gmail.com',
    password: 'password123' // I don't know the password
  });
  
  if (authError) {
    console.log('Auth Error:', authError.message);
    return;
  }

  const payload = {
    full_name: 'BOLTRANO 8',
    cpf: '000.000.000-05',
    user_id: authData.user.id
  };
  const { data, error } = await supabase.from('clients').insert(payload);
  console.log('Error:', error);
}
main();
