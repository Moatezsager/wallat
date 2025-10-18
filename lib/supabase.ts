import { createClient } from '@supabase/supabase-js';

// اقرأ المتغيرات من بيئة العمل بدلاً من كتابتها مباشرة
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

// تأكد من وجود المتغيرات قبل إنشاء العميل
if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key must be defined in environment variables.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
