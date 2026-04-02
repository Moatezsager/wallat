
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account, Category } from '../types';
import { useToast } from './Toast';
import { logActivity } from '../lib/logger';
import { CheckCircleIcon, ArrowDownIcon, ArrowUpIcon, CalendarDaysIcon, PencilSquareIcon } from './icons';

interface TransactionFormProps {
    transaction?: Transaction;
    onSave: () => void;
    onCancel: () => void;
    accounts: Account[];
    categories: Category[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل');
};

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

            let logDescription = '';
            const categoryName = categories.find(c => c.id === categoryId)?.name || 'غير مصنف';

            if (isUpdate && transaction) {
                // 1. Revert old transaction effect
                if (transaction.account_id) {
                    const { data: oldAccount } = await supabase.from('accounts').select('balance').eq('id', transaction.account_id).single();
                    if (oldAccount) {
                        const revertAmount = transaction.type === 'income' ? -transaction.amount : transaction.amount;
                        await supabase.from('accounts').update({ balance: oldAccount.balance + revertAmount }).eq('id', transaction.account_id);
                    }
                }

                // 2. Apply new transaction effect
                const { data: newAccount } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
                if (!newAccount) throw new Error("Account not found");
                
                const applyAmount = type === 'income' ? newAmountValue : -newAmountValue;
                await supabase.from('accounts').update({ balance: newAccount.balance + applyAmount }).eq('id', accountId);

                // 3. Update Transaction Record
                const { error } = await supabase.from('transactions').update(transactionData).eq('id', transaction.id);
                if (error) throw error;

                logDescription = `تعديل معاملة (${type === 'income' ? 'إيراد' : 'مصروف'}): ${formatCurrency(newAmountValue)} - ${notes || categoryName}`;

            } else {
                // Insert Logic
                const { data: account } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
                if (!account) throw new Error("Account not found");

                const balanceChange = type === 'income' ? newAmountValue : -newAmountValue;
                
                const { error: accError } = await supabase.from('accounts').update({ balance: account.balance + balanceChange }).eq('id', accountId);
                if (accError) throw accError;

                const { error: txError } = await supabase.from('transactions').insert(transactionData);
                if (txError) throw txError;

                logDescription = `إضافة معاملة (${type === 'income' ? 'إيراد' : 'مصروف'}): ${formatCurrency(newAmountValue)} - ${notes || categoryName}`;
            }

            logActivity(logDescription);
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
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex bg-slate-800/50 p-1 rounded-2xl border border-white/5 shadow-inner">
                <button type="button" onClick={() => { setType('expense'); setCategoryId(''); }} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${type === 'expense' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-500 hover:text-slate-300'}`}>
                    <ArrowUpIcon className="w-4 h-4" /> مصروف
                </button>
                <button type="button" onClick={() => { setType('income'); setCategoryId(''); }} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all flex items-center justify-center gap-2 ${type === 'income' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-500 hover:text-slate-300'}`}>
                    <ArrowDownIcon className="w-4 h-4" /> دخل
                </button>
            </div>

            <div className="relative group text-center py-4">
                <div className={`absolute inset-0 blur-3xl opacity-10 rounded-full transition-colors duration-500 ${type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <div className="relative z-10 flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">المبلغ</span>
                    <div className="flex items-center justify-center gap-2">
                        <input type="number" step="0.01" id="amount" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required autoFocus className={`w-full bg-transparent text-center text-6xl font-black focus:outline-none transition-colors duration-300 placeholder-slate-800 ${type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`} />
                        <span className={`text-xl font-bold ${type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>د.ل</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="account" className="text-[10px] font-black text-slate-500 uppercase px-1 mb-2 block">الحساب</label>
                    <select id="account" value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none">
                        <option value="" disabled>اختر حساب</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="category" className="text-[10px] font-black text-slate-500 uppercase px-1 mb-2 block">الفئة</label>
                    <select id="category" value={categoryId || ''} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none">
                        <option value="">بدون فئة</option>
                        {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="space-y-1.5">
                <label htmlFor="date" className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">التاريخ</label>
                <div className="relative group">
                    <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none" />
                    <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                </div>
            </div>

            <div className="relative group">
                <input type="text" id="notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية (اختياري)..." className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all" />
                <PencilSquareIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            </div>

            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-lg active:scale-95 transition-all">إلغاء</button>
                <button type="submit" disabled={isSaving} className={`flex-[2] py-4 rounded-2xl font-black text-lg text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${type === 'income' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-900/20' : 'bg-gradient-to-r from-rose-600 to-pink-600 shadow-rose-900/20'}`}>
                    {isSaving ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircleIcon className="w-6 h-6" /> حفظ المعاملة</>}
                </button>
            </div>
        </form>
    );
}

export default TransactionForm;
