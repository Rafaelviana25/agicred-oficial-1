import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: profiles } = await supabase.from('profiles').select('id').limit(1);
  if (!profiles || profiles.length === 0) {
    console.log('No profiles found');
    return;
  }
  const userId = profiles[0].id;

  const payload = {
    full_name: 'BOLTRANO 9',
    cpf: '000.000.000-06',
    birth_date: '0001-01-01',
    phone: '(00) 0-0000-0000',
    city: '000000000',
    address: '00000000',
    workplace: '0000000',
    user_id: userId
  };
  const { data, error } = await supabase.from('clients').insert(payload);
  console.log('Error:', error);
}
main();
