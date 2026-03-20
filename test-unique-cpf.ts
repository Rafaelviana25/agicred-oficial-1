import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data: profiles } = await supabase.from('profiles').select('id').limit(2);
  if (!profiles || profiles.length < 2) {
    console.log('Not enough profiles found');
    return;
  }
  const userId1 = profiles[0].id;
  const userId2 = profiles[1].id;

  const payload1 = {
    full_name: 'BOLTRANO 4',
    cpf: '000.000.000-03',
    user_id: userId1
  };
  const payload2 = {
    full_name: 'BOLTRANO 5',
    cpf: '000.000.000-03',
    user_id: userId2
  };
  await supabase.from('clients').insert(payload1);
  const { error } = await supabase.from('clients').insert(payload2);
  console.log('Error:', error);
}
main();
