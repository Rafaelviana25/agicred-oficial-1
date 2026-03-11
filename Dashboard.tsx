
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://molhsshtzrvkywoqhxho.supabase.co';
const SUPABASE_API_KEY = 'sb_publishable_2Kycp3WfayHIqrA2v6EFiQ_R-6NYvqz';

export const supabase = createClient(SUPABASE_URL, SUPABASE_API_KEY);
