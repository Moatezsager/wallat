
import { supabase } from './supabase';

export const logActivity = async (description: string) => {
    try {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const timeStr = now.toTimeString().split(' ')[0];

        // 1. إضافة النشاط الجديد
        const { error: insertError } = await supabase.from('activities').insert({
            activity_date: dateStr,
            activity_time: timeStr,
            description: description
        });

        if (insertError) {
            console.error("Failed to log activity:", insertError.message);
            return;
        }

        // 2. تنظيف تلقائي: إبقاء آخر 10 سجلات فقط وحذف ما عدا ذلك
        // نجلب معرفات آخر 10 سجلات
        const { data: latestItems } = await supabase
            .from('activities')
            .select('id')
            .order('activity_date', { ascending: false })
            .order('activity_time', { ascending: false })
            .limit(10);

        if (latestItems && latestItems.length >= 10) {
            const idsToKeep = latestItems.map(item => item.id);
            // حذف أي سجل ليس ضمن القائمة الأخيرة
            await supabase
                .from('activities')
                .delete()
                .not('id', 'in', `(${idsToKeep.join(',')})`);
        }

    } catch (err) {
        console.error("Error logging activity:", err);
    }
};
