import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account, Category } from '../types';
import { PlusIcon, PencilSquareIcon, TrashIcon } from './icons';

const TransactionForm: React.FC<{
    transaction?: Transaction;
    onSave: () => void;
    onCancel: () => void;
    accounts: Account[];
    categories: Category[];
}> = ({ transaction, onSave, onCancel, accounts, categories }) => {
    const [type, setType] = useState<'income' | 'expense'>(transaction?.type === 'income' ? 'income' : 'expense');
    const [amount, setAmount] = useState(transaction?.amount || '');
    const [notes, setNotes] = useState(transaction?.notes || '');
    const [accountId, setAccountId] = useState(transaction?.account_id || '');
    const [categoryId, setCategoryId] = useState(transaction?.category_id || '');
    const [date, setDate] = useState(transaction?.date ? new Date(transaction.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        const originalAmount = transaction ? (transaction.type === 'income' ? transaction.amount : -transaction.amount) : 0;
        const newAmount = type === 'income' ? Number(amount) : -Number(amount);
        const amountDifference = newAmount - originalAmount;

        const transactionData = {
            amount: Number(amount),
            type,
            notes,
            account_id: accountId,
            category_id: categoryId || null,
            date: new Date(date).toISOString(),
        };

        // DB Operations
        try {
            if (transaction?.id) { // Update
                if (transaction.account_id !== accountId) {
                    // Revert old account balance
                    const { data: oldAccount } = await supabase.from('accounts').select('balance').eq('id', transaction.account_id).single();
                    if(oldAccount) await supabase.from('accounts').update({ balance: oldAccount.balance - originalAmount }).eq('id', transaction.account_id);
                    // Update new account balance
                    const { data: newAccount } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
                    if(newAccount) await supabase.from('accounts').update({ balance: newAccount.balance + newAmount }).eq('id', accountId);
                } else {
                    // Update balance on the same account
                    const { data: account } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
                    if(account) await supabase.from('accounts').update({ balance: account.balance + amountDifference }).eq('id', accountId);
                }
                await supabase.from('transactions').update(transactionData).eq('id', transaction.id);
            } else { // Insert
                await supabase.from('transactions').insert(transactionData);
                // Update account balance
                const { data: account } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
                if(account) await supabase.from('accounts').update({ balance: account.balance + newAmount }).eq('id', accountId);
            }
            onSave();
        } catch(error) {
            console.error('Error saving transaction', (error as any).message);
            alert('حدث خطأ أثناء حفظ المعاملة');
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
                    <button type="button" onClick={() => setType('expense')} className={`w-full p-2 rounded-md ${type === 'expense' ? 'bg-red-500 text-white' : 'bg-slate-700'}`}>مصروف</button>
                    <button type="button" onClick={() => setType('income')} className={`w-full p-2 rounded-md ${type === 'income' ? 'bg-green-500 text-white' : 'bg-slate-700'}`}>دخل</button>
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
                <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500">
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

const TransactionsPage: React.FC<{ key: number, handleDatabaseChange: () => void }> = ({ key, handleDatabaseChange }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
    const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const txPromise = supabase.from('transactions').select('*, accounts:accounts!account_id(name, currency), to_accounts:accounts!to_account_id(name), categories(name)').order('date', { ascending: false });
            const accPromise = supabase.from('accounts').select('*');
            const catPromise = supabase.from('categories').select('*');
            
            const [{data: txData, error: txError}, {data: accData, error: accError}, {data: catData, error: catError}] = await Promise.all([txPromise, accPromise, catPromise]);
    
            if (txError) console.error('Error fetching transactions:', txError.message);
            else if (txData) setTransactions(txData as unknown as Transaction[]);
    
            if (accError) console.error('Error fetching accounts:', accError.message);
            else if (accData) setAccounts(accData as Account[]);
    
            if (catError) console.error('Error fetching categories:', catError.message);
            else if (catData) setCategories(catData as Category[]);
    
            setLoading(false);
        };
        fetchData();
    }, [key]);
    
    const handleSave = () => {
        setIsModalOpen(false);
        setEditingTx(undefined);
        handleDatabaseChange();
    }

    const handleDelete = async () => {
        if (!deletingTx) return;

        try {
            // Revert account balance
            const amountToRevert = deletingTx.type === 'income' ? -deletingTx.amount : deletingTx.amount;
            const { data: account } = await supabase.from('accounts').select('balance').eq('id', deletingTx.account_id).single();
            if(account) {
                 await supabase.from('accounts').update({ balance: account.balance + amountToRevert }).eq('id', deletingTx.account_id);
            }
             // Delete transaction
            await supabase.from('transactions').delete().eq('id', deletingTx.id);
            setDeletingTx(null);
            handleDatabaseChange();
        } catch (error) {
             console.error('Error deleting transaction', (error as any).message);
             alert('حدث خطأ أثناء الحذف');
        }
    }
    
    const formatCurrency = (amount: number, currency: string) => {
        return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 2 }).format(amount).replace('LYD', currency);
    };

    return (
        <div className="relative">
            {transactions.length === 0 && !loading ? (
                 <div className="text-center py-10">
                    <p className="text-slate-400 mb-4">لا يوجد معاملات مسجلة.</p>
                     <button onClick={() => { setEditingTx(undefined); setIsModalOpen(true); }} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center">
                        <PlusIcon className="w-5 h-5 ml-2" />
                        إضافة معاملة
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {transactions.map(tx => {
                        const accountInfo = tx.type === 'transfer'
                            ? `${tx.accounts?.name || 'حساب محذوف'} ← ${tx.to_accounts?.name || 'حساب محذوف'}`
                            : tx.accounts?.name || '';

                        return (
                            <div key={tx.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                               <div>
                                    <p className="font-bold text-lg">{tx.notes || (tx.type === 'transfer' ? 'تحويل' : 'معاملة')}</p>
                                    <p className="text-sm text-slate-400">{accountInfo} {tx.categories?.name ? `· ${tx.categories.name}` : ''}</p>
                               </div>
                               <div className="text-right">
                                   <p className={`font-extrabold text-lg ${tx.type === 'income' ? 'text-green-400' : tx.type === 'expense' ? 'text-red-400' : 'text-slate-300'}`}>
                                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount, tx.accounts?.currency || 'د.ل')}
                                   </p>
                                   <div className="flex items-center gap-2 justify-end">
                                        <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                                        {tx.type !== 'transfer' && (
                                        <>
                                            <button onClick={() => { setEditingTx(tx); setIsModalOpen(true); }} className="text-slate-500 hover:text-cyan-400"><PencilSquareIcon className="w-4 h-4"/></button>
                                            <button onClick={() => setDeletingTx(tx)} className="text-slate-500 hover:text-red-400"><TrashIcon className="w-4 h-4"/></button>
                                        </>
                                        )}
                                   </div>
                               </div>
                            </div>
                        );
                    })}
                </div>
            )}
             <button onClick={() => { setEditingTx(undefined); setIsModalOpen(true); }} className="fixed bottom-20 right-4 h-14 w-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90">
                <PlusIcon className="w-8 h-8"/>
            </button>
             {isModalOpen && (
                <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm border border-slate-700">
                        <h3 className="text-lg font-bold mb-4">{editingTx ? 'تعديل المعاملة' : 'إضافة معاملة جديدة'}</h3>
                        <TransactionForm
                            transaction={editingTx}
                            onSave={handleSave}
                            onCancel={() => { setIsModalOpen(false); setEditingTx(undefined); }}
                            accounts={accounts}
                            categories={categories}
                        />
                    </div>
                </div>
            )}
            {deletingTx && (
                 <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm border border-slate-700">
                        <h3 className="text-lg font-bold mb-2">تأكيد الحذف</h3>
                        <p className="text-slate-300 mb-6">هل أنت متأكد من رغبتك في حذف هذه المعاملة؟ سيتم التراجع عن تأثيرها على رصيد الحساب.</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeletingTx(null)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                            <button onClick={handleDelete} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
                        </div>
                    </div>
                </div>
            )}
            {loading && transactions.length === 0 && <div className="mt-4">جاري تحميل المعاملات...</div>}
        </div>
    );
};

export default TransactionsPage;