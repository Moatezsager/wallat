import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account, Category } from '../types';
import { PlusIcon, PencilSquareIcon, TrashIcon, FunnelIcon, XMarkIcon } from './icons';
import TransactionForm from './TransactionForm';

const formatCurrency = (amount: number, currency: string | undefined) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 2 }).format(amount).replace('LYD', currency || 'د.ل');
};

type FilterValues = {
    startDate: string;
    endDate: string;
    type: 'all' | 'expense' | 'income' | 'transfer';
    accounts: string[];
    categories: string[];
};

// Filter Modal Component
const FilterModal: React.FC<{
    accounts: Account[];
    categories: Category[];
    initialFilters: FilterValues;
    onApply: (filters: FilterValues) => void;
    onClose: () => void;
}> = ({ accounts, categories, initialFilters, onApply, onClose }) => {
    const [tempFilters, setTempFilters] = useState(initialFilters);

    const handleTypeChange = (type: FilterValues['type']) => {
        setTempFilters({ ...tempFilters, type });
    };

    const handleAccountToggle = (accountId: string) => {
        const newAccounts = tempFilters.accounts.includes(accountId)
            ? tempFilters.accounts.filter((id: string) => id !== accountId)
            : [...tempFilters.accounts, accountId];
        setTempFilters({ ...tempFilters, accounts: newAccounts });
    };

    const handleCategoryToggle = (categoryId: string) => {
        const newCategories = tempFilters.categories.includes(categoryId)
            ? tempFilters.categories.filter((id: string) => id !== categoryId)
            : [...tempFilters.categories, categoryId];
        setTempFilters({ ...tempFilters, categories: newCategories });
    };
    
    const handleReset = () => {
        const freshFilters = { startDate: '', endDate: '', type: 'all' as 'all', accounts: [], categories: [] };
        setTempFilters(freshFilters);
        onApply(freshFilters); // Apply reset immediately
        onClose();
    }

    const handleApply = () => {
        onApply(tempFilters);
    };

    return (
        <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-800 rounded-lg p-6 w-full max-w-lg border border-slate-700 shadow-xl animate-slide-up">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold">تصفية المعاملات</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm text-slate-400">من تاريخ</label>
                            <input type="date" value={tempFilters.startDate} onChange={e => setTempFilters({...tempFilters, startDate: e.target.value})} className="w-full bg-slate-700 p-2 rounded-md mt-1" />
                        </div>
                        <div>
                            <label className="text-sm text-slate-400">إلى تاريخ</label>
                            <input type="date" value={tempFilters.endDate} onChange={e => setTempFilters({...tempFilters, endDate: e.target.value})} className="w-full bg-slate-700 p-2 rounded-md mt-1" />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-slate-400">النوع</label>
                        <div className="flex bg-slate-700 rounded-lg p-1 text-sm mt-1">
                            {(['all', 'expense', 'income', 'transfer'] as const).map(type => (
                                <button key={type} onClick={() => handleTypeChange(type)} className={`w-full py-2 px-1 rounded-md transition-colors font-semibold ${tempFilters.type === type ? 'bg-slate-600 text-cyan-400' : 'text-slate-300 hover:bg-slate-600/50'}`}>
                                    { {all: 'الكل', expense: 'مصروف', income: 'إيراد', transfer: 'تحويل'}[type] }
                                </button>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-slate-400">الحسابات</label>
                        <div className="mt-1 max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-700 rounded-md">
                            {accounts.map(acc => (
                                <label key={acc.id} className="flex items-center gap-2 p-1 rounded hover:bg-slate-600/50 cursor-pointer">
                                    <input type="checkbox" checked={tempFilters.accounts.includes(acc.id)} onChange={() => handleAccountToggle(acc.id)} className="w-4 h-4 text-cyan-600 bg-slate-600 border-slate-500 rounded focus:ring-cyan-500"/>
                                    <span>{acc.name}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label className="text-sm text-slate-400">الفئات</label>
                         <div className="mt-1 max-h-32 overflow-y-auto space-y-1 p-2 bg-slate-700 rounded-md">
                             {categories.map(cat => (
                                <label key={cat.id} className="flex items-center gap-2 p-1 rounded hover:bg-slate-600/50 cursor-pointer">
                                    <input type="checkbox" checked={tempFilters.categories.includes(cat.id)} onChange={() => handleCategoryToggle(cat.id)} className="w-4 h-4 text-cyan-600 bg-slate-600 border-slate-500 rounded focus:ring-cyan-500"/>
                                    <span>{cat.name} ({cat.type === 'expense' ? 'مصروف' : 'إيراد'})</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="flex justify-between items-center pt-4 mt-2 border-t border-slate-700">
                    <button onClick={handleReset} className="py-2 px-4 text-slate-400 hover:text-white rounded-md transition text-sm">إعادة تعيين</button>
                    <button onClick={handleApply} className="py-2 px-6 bg-cyan-600 hover:bg-cyan-500 rounded-md transition">تطبيق</button>
                </div>
            </div>
        </div>
    );
};

const TransactionsPage: React.FC<{ key: number, handleDatabaseChange: () => void }> = ({ key, handleDatabaseChange }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
    const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [filters, setFilters] = useState<FilterValues>({
        startDate: '',
        endDate: '',
        type: 'all',
        accounts: [],
        categories: [],
    });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            let query = supabase.from('transactions').select('*, accounts:accounts!account_id(name, currency), to_accounts:accounts!to_account_id(name), categories(name)').order('date', { ascending: false });

            if (filters.startDate) query = query.gte('date', new Date(filters.startDate).toISOString());
            if (filters.endDate) {
                const end = new Date(filters.endDate);
                end.setDate(end.getDate() + 1);
                query = query.lt('date', end.toISOString().split('T')[0]);
            }
            if (filters.type !== 'all') query = query.eq('type', filters.type);
            if (filters.accounts.length > 0) query = query.or(`account_id.in.(${filters.accounts.join(',')}),to_account_id.in.(${filters.accounts.join(',')})`);
            if (filters.categories.length > 0) query = query.in('category_id', filters.categories);

            const txPromise = query;
            const accPromise = supabase.from('accounts').select('*');
            const catPromise = supabase.from('categories').select('*');
            
            const [{data: txData, error: txError}, {data: accData}, {data: catData}] = await Promise.all([txPromise, accPromise, catPromise]);
    
            if (txError) console.error('Error fetching transactions:', txError.message);
            else if (txData) setTransactions(txData as unknown as Transaction[]);
    
            setAccounts(accData as Account[] || []);
            setCategories(catData as Category[] || []);
    
            setLoading(false);
        };
        fetchData();
    }, [key, filters]);
    
    const handleSave = () => {
        setIsFormModalOpen(false);
        setEditingTx(undefined);
        handleDatabaseChange();
    }

    const handleDelete = async () => {
        if (!deletingTx || !deletingTx.account_id) return;
        try {
            const { error } = await supabase.rpc('delete_transaction_and_revert_balance', {
                p_transaction_id: deletingTx.id,
                p_account_id: deletingTx.account_id,
                p_type: deletingTx.type,
                p_amount: deletingTx.amount,
            });
            if (error) throw error;
            setDeletingTx(null);
            handleDatabaseChange();
        } catch (error: any) {
             console.error('Error deleting transaction', error.message);
             alert('حدث خطأ أثناء الحذف.');
        }
    }
    
    const handleApplyFilters = (newFilters: FilterValues) => {
        setFilters(newFilters);
        setIsFilterModalOpen(false);
    };
    
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.startDate || filters.endDate) count++;
        if (filters.type !== 'all') count++;
        if (filters.accounts.length > 0) count += filters.accounts.length;
        if (filters.categories.length > 0) count += filters.categories.length;
        return count;
    }, [filters]);

    return (
        <div className="relative">
             <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">كل المعاملات</h2>
                <button onClick={() => setIsFilterModalOpen(true)} className="relative flex items-center gap-2 bg-slate-800 py-2 px-4 rounded-lg text-slate-300 hover:bg-slate-700 transition">
                    <FunnelIcon className="w-5 h-5"/>
                    <span>تصفية</span>
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-500 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>}
                </button>
            </div>
            
            {loading ? (
                <div className="mt-4 animate-pulse text-center text-slate-400">جاري تحميل المعاملات...</div>
            ) : transactions.length === 0 ? (
                 <div className="text-center py-10">
                    <p className="text-slate-400 mb-4">{activeFilterCount > 0 ? "لا توجد معاملات تطابق بحثك." : "لا يوجد معاملات مسجلة."}</p>
                     <button onClick={() => { setEditingTx(undefined); setIsFormModalOpen(true); }} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center">
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
                            <div key={tx.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center animate-fade-in-fast">
                               <div>
                                    <p className="font-bold text-lg">{tx.notes || (tx.type === 'transfer' ? 'تحويل' : tx.categories?.name || 'معاملة')}</p>
                                    <p className="text-sm text-slate-400">{accountInfo}</p>
                               </div>
                               <div className="text-right">
                                   <p className={`font-extrabold text-lg ${tx.type === 'income' ? 'text-green-400' : tx.type === 'expense' ? 'text-red-400' : 'text-slate-300'}`}>
                                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount, tx.accounts?.currency)}
                                   </p>
                                   <div className="flex items-center gap-2 justify-end">
                                        <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                                        {tx.type !== 'transfer' && (
                                        <>
                                            <button onClick={() => { setEditingTx(tx); setIsFormModalOpen(true); }} className="text-slate-500 hover:text-cyan-400"><PencilSquareIcon className="w-4 h-4"/></button>
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

            <button onClick={() => { setEditingTx(undefined); setIsFormModalOpen(true); }} className="fixed bottom-20 right-4 h-14 w-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90">
                <PlusIcon className="w-8 h-8"/>
            </button>
            
            {isFormModalOpen && (
                <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm border border-slate-700">
                        <h3 className="text-lg font-bold mb-4">{editingTx ? 'تعديل المعاملة' : 'إضافة معاملة جديدة'}</h3>
                        <TransactionForm
                            transaction={editingTx}
                            onSave={handleSave}
                            onCancel={() => { setIsFormModalOpen(false); setEditingTx(undefined); }}
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

            {isFilterModalOpen && (
                <FilterModal 
                    accounts={accounts}
                    categories={categories}
                    initialFilters={filters}
                    onApply={handleApplyFilters}
                    onClose={() => setIsFilterModalOpen(false)}
                />
            )}
        </div>
    );
};

export default TransactionsPage;