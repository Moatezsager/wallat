import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vgosloxhrahixrduuzkt.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZnb3Nsb3hocmFoaXhyZHV1emt0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAzMzk2MjEsImV4cCI6MjA3NTkxNTYyMX0.XXx2Us_u3O4HxFAd8HsAHqC8WHRjwM-zzU0Nb2dX5RU';

export const supabase = createClient(supabaseUrl, supabaseKey);
