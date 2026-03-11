import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('Trying to add column via RPC exec_sql...');
  
  const sql = `ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_history JSONB;`;
  
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  
  if (error) {
    console.log('RPC exec_sql failed:', error.message);
    // Try another common name for sql execution function
    const { error: error2 } = await supabase.rpc('run_sql', { sql });
    if (error2) {
        console.log('RPC run_sql failed:', error2.message);
    } else {
        console.log('RPC run_sql success!');
    }
  } else {
    console.log('RPC exec_sql success!');
  }
}

main();
