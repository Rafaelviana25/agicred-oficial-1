import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  // Tentar listar tabelas (pode não funcionar dependendo das permissões, mas vamos tentar listar dados de tabelas comuns)
  const tables = ['payments', 'installments'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (!error && data && data.length > 0) {
      console.log(`Columns in '${table}':`, Object.keys(data[0]));
    } else if (error) {
      console.log(`Table '${table}' check failed: ${error.message}`);
    } else {
      console.log(`Table '${table}' exists but is empty.`);
    }
  }
}
main();
