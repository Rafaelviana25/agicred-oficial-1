import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

async function check() {
  const { data, error } = await supabase.from('clients').insert({
    id: '00000000-0000-0000-0000-000000000000',
    user_id: '00000000-0000-0000-0000-000000000000',
    full_name: 'Test',
    cpf: '123',
    phone: '123',
    address: '123',
    city: '123',
    workplace: '123',
    created_at: new Date().toISOString()
  }).select();
  console.log('Insert:', data, error);
}

check();
