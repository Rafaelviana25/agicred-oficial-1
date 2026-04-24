import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''; // Needs DB access

if (!supabaseKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY not found in environment.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Checking for 'payment_history' column in 'contracts'...");
  
  // Script to add the column if it's missing
  const sql = `
    DO $$ 
    BEGIN 
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name='contracts' 
            AND column_name='payment_history'
        ) THEN 
            ALTER TABLE contracts ADD COLUMN payment_history jsonb DEFAULT '{}'::jsonb;
        END IF;
    END $$;
  `;

  // Use run_sql or exec_sql depending on what's available in the project's RPC
  const { data, error } = await supabase.rpc('run_sql', { sql });
  
  if (error) {
    const { data: data2, error: error2 } = await supabase.rpc('exec_sql', { sql });
    if (error2) {
        console.error("Failed to add column via RPC:", error2);
        console.log("Tip: If you're using Supabase, you can run this SQL manually in the Dashboard SQL Editor:");
        console.log("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_history jsonb DEFAULT '{}'::jsonb;");
    } else {
        console.log("Column added/verified successfully via exec_sql.");
    }
  } else {
    console.log("Column added/verified successfully via run_sql.");
  }
}

main();
