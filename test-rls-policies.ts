import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const sql = "SELECT * FROM pg_policies WHERE tablename = 'clients';";
  const { data, error } = await supabase.rpc('exec_sql', { sql });
  if (error) {
    const { data: data2, error: error2 } = await supabase.rpc('run_sql', { sql });
    console.log(data2 || error2);
  } else {
    console.log(data);
  }
}
main();
