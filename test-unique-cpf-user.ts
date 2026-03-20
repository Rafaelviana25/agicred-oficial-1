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

  const payload1 = {
    full_name: 'BOLTRANO 6',
    cpf: '000.000.000-04',
    user_id: userId
  };
  const payload2 = {
    full_name: 'BOLTRANO 7',
    cpf: '000.000.000-04',
    user_id: userId
  };
  await supabase.from('clients').insert(payload1);
  const { error } = await supabase.from('clients').insert(payload2);
  console.log('Error:', error);
}
main();
