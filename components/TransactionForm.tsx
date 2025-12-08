
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account, Category } from '../types';
import { useToast } from './Toast';

interface TransactionFormProps {
    transaction?: Transaction;
    onSave: () => void;
    onCancel: () => void;
    accounts: Account[];
    categories: Category[];
}

const TransactionForm: React.FC<TransactionFormProps> = ({ transaction, onSave, onCancel, accounts, categories }) => {
    const toast = useToast();
    const [type, setType] = useState<'income' | 'expense'>(transaction?.type === 'income' ? 'income' : 'expense');
    const [amount, setAmount] = useState(transaction?.amount?.toString() || '');
    const [notes, setNotes] = useState(transaction?.notes || '');
    const [accountId, setAccountId] = useState(transaction?.account_id || '');
    const [categoryId, setCategoryId] = useState(transaction?.category_id || '');
    const [date, setDate] = useState(transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId) {
            toast.warning("الرجاء اختيار حساب.");
            return;
        }
        setIsSaving(true);
        
        const isUpdate = !!transaction?.id;
        const newAmountValue = Number(amount);

        try {
            const finalDate = new Date(`${date}T00:00:00`); // Local midnight on selected day
            const originalDateString = transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : null;

            // If it's an update and the date part hasn't changed, preserve the original time.
            if (isUpdate && transaction?.date && date === originalDateString) {
                const originalDate = new Date(transaction.date);
                finalDate.setHours(originalDate.getHours());
                finalDate.setMinutes(originalDate.getMinutes());
                finalDate.setSeconds(originalDate.getSeconds());
            } else {
                // For new transactions or if the date was changed on an existing one, use the current time.
                const now = new Date();
                finalDate.setHours(now.getHours());
                finalDate.setMinutes(now.getMinutes());
                finalDate.setSeconds(now.getSeconds());
            }
            
            // Using an RPC is safer for handling balance updates atomically.
            // This prevents race conditions and ensures data integrity.
            const { error } = await supabase.rpc('save_transaction_and_update_balance', {
                p_is_update: isUpdate,
                p_transaction_id: isUpdate ? transaction.id : null,
                p_account_id: accountId,
                p_type: type,
                p_amount: newAmountValue,
                p_date: finalDate.toISOString(),
                p_category_id: categoryId || null,
                p_notes: notes,
                p_old_account_id: isUpdate ? transaction.account_id : null,
                p_old_type: isUpdate ? transaction.type : null,
                p_old_amount: isUpdate ? transaction.amount : null,
            });

            if (error) throw error;
            onSave();
        } catch (error: any) {
            console.error('Error saving transaction:', error.message);
            toast.error('حدث خطأ أثناء حفظ المعاملة. تأكد من أن دالة قاعدة البيانات RPC موجودة.');
        } finally {
            setIsSaving(false);
        }
    };
    
    const filteredCategories = categories.filter(c => c.type === type);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">نوع المعاملة</label>
                <div className="flex gap-4">
                    <button type="button" onClick={() => { setType('expense'); setCategoryId(''); }} className={`w-full p-2 rounded-md ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-700'}`}>مصروف</button>
                    <button type="button" onClick={() => { setType('income'); setCategoryId(''); }} className={`w-full p-2 rounded-md ${type === 'income' ? 'bg-green-500 text-white' : 'bg-slate-700'}`}>دخل</button>
                </div>
            </div>
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-1">المبلغ</label>
                <input type="number" step="0.01" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
            </div>
             <div>
                <label htmlFor="account" className="block text-sm font-medium text-slate-300 mb-1">الحساب</label>
                <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500">
                    <option value="" disabled>اختر حساب</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-1">الفئة</label>
                <select id="category" value={categoryId || ''} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500">
                    <option value="">بدون فئة</option>
                    {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-1">التاريخ</label>
                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
            </div>
             <div>
                <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">ملاحظات</label>
                <input type="text" id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500 disabled:cursor-not-allowed">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
            </div>
        </form>
    );
}

export default TransactionForm;
