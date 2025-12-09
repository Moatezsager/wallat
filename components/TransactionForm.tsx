
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
            const finalDate = new Date(`${date}T00:00:00`); 
            
            // Preserve time if updating same day, else use current time
            if (isUpdate && transaction?.date && date === new Date(transaction.date).toISOString().split('T')[0]) {
                const originalDate = new Date(transaction.date);
                finalDate.setHours(originalDate.getHours());
                finalDate.setMinutes(originalDate.getMinutes());
            } else {
                const now = new Date();
                finalDate.setHours(now.getHours());
                finalDate.setMinutes(now.getMinutes());
            }

            const transactionData = {
                account_id: accountId,
                type,
                amount: newAmountValue,
                date: finalDate.toISOString(),
                category_id: categoryId || null,
                notes
            };

            if (isUpdate && transaction) {
                // 1. Revert effect of old transaction on old account
                if (transaction.account_id) {
                    const { data: oldAccount } = await supabase.from('accounts').select('balance').eq('id', transaction.account_id).single();
                    if (oldAccount) {
                        const revertAmount = transaction.type === 'income' ? -transaction.amount : transaction.amount;
                        await supabase.from('accounts').update({ balance: oldAccount.balance + revertAmount }).eq('id', transaction.account_id);
                    }
                }

                // 2. Apply effect of new transaction on new account
                // (Note: Need to fetch fresh balance if account is same, but sequential await ensures order)
                const { data: newAccount } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
                if (!newAccount) throw new Error("Account not found");
                
                const applyAmount = type === 'income' ? newAmountValue : -newAmountValue;
                await supabase.from('accounts').update({ balance: newAccount.balance + applyAmount }).eq('id', accountId);

                // 3. Update Transaction Record
                const { error } = await supabase.from('transactions').update(transactionData).eq('id', transaction.id);
                if (error) throw error;

            } else {
                // Insert Logic
                const { data: account } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
                if (!account) throw new Error("Account not found");

                const balanceChange = type === 'income' ? newAmountValue : -newAmountValue;
                
                // Update Account Balance
                const { error: accError } = await supabase.from('accounts').update({ balance: account.balance + balanceChange }).eq('id', accountId);
                if (accError) throw accError;

                // Insert Transaction
                const { error: txError } = await supabase.from('transactions').insert(transactionData);
                if (txError) throw txError;
            }

            onSave();
        } catch (error: any) {
            console.error('Error saving transaction:', error.message);
            toast.error('حدث خطأ أثناء حفظ المعاملة.');
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
                    <button type="button" onClick={() => { setType('expense'); setCategoryId(''); }} className={`w-full p-2 rounded-xl font-bold transition-all ${type === 'expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'bg-slate-800 text-slate-400'}`}>مصروف</button>
                    <button type="button" onClick={() => { setType('income'); setCategoryId(''); }} className={`w-full p-2 rounded-xl font-bold transition-all ${type === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-800 text-slate-400'}`}>دخل</button>
                </div>
            </div>
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-1">المبلغ</label>
                <input type="number" step="0.01" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none font-bold text-lg" placeholder="0.00" />
            </div>
             <div>
                <label htmlFor="account" className="block text-sm font-medium text-slate-300 mb-1">الحساب</label>
                <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                    <option value="" disabled>اختر حساب</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="category" className="block text-sm font-medium text-slate-300 mb-1">الفئة</label>
                <select id="category" value={categoryId || ''} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                    <option value="">بدون فئة</option>
                    {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="date" className="block text-sm font-medium text-slate-300 mb-1">التاريخ</label>
                <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
            </div>
             <div>
                <label htmlFor="notes" className="block text-sm font-medium text-slate-300 mb-1">ملاحظات</label>
                <input type="text" id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="وصف للمعاملة..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onCancel} className="py-3 px-6 text-slate-400 hover:text-white font-bold transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-3 px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition font-bold shadow-lg disabled:opacity-70">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ المعاملة'}
                </button>
            </div>
        </form>
    );
}

export default TransactionForm;
