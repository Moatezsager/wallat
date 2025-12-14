
import { supabase } from './supabase';

export const logActivity = async (description: string) => {
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        // Format time as HH:MM:SS
        const timeStr = now.toTimeString().split(' ')[0];

        const { error } = await supabase.from('activities').insert({
            activity_date: dateStr,
            activity_time: timeStr,
            description: description
        });

        if (error) {
            console.error("Failed to log activity:", error.message);
        }
    } catch (err) {
        console.error("Error logging activity:", err);
    }
};
