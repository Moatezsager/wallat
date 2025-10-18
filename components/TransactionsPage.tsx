import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account, Category } from '../types';
import { PlusIcon, PencilSquareIcon, TrashIcon, FunnelIcon, XMarkIcon } from './icons';
import TransactionForm from './TransactionForm';

const PAGE_SIZE = 15; // Number of transactions to load at a time

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

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700 shadow-xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            {children}
        </div>
    </div>
);

// Filter Modal Component (No changes needed here)
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
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
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

// New Component for Transaction Details
const TransactionDetailContent: React.FC<{
    transaction: Transaction;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ transaction, onEdit, onDelete }) => {
    const details = [
        { label: 'المبلغ', value: formatCurrency(transaction.amount, transaction.accounts?.currency), color: transaction.type === 'income' ? 'text-green-400' : transaction.type === 'expense' ? 'text-red-400' : 'text-slate-300' },
        { label: 'النوع', value: {income: 'إيراد', expense: 'مصروف', transfer: 'تحويل'}[transaction.type] },
        { label: 'الحساب', value: transaction.type === 'transfer' ? `من: ${transaction.accounts?.name || 'N/A'}` : transaction.accounts?.name || 'N/A' },
        { label: 'إلى حساب', value: transaction.type === 'transfer' ? transaction.to_accounts?.name || 'N/A' : null },
        { label: 'الفئة', value: transaction.categories?.name || 'غير مصنف' },
        { label: 'التاريخ', value: new Date(transaction.date).toLocaleString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric', hour: 'numeric', minute: '2-digit' }) },
        { label: 'ملاحظات', value: transaction.notes || '-' },
    ].filter(item => item.value !== null);

    return (
        <div className="space-y-3">
            {details.map(item => (
                <div key={item.label} className="flex justify-between items-center text-sm py-2 border-b border-slate-700/50">
                    <span className="text-slate-400">{item.label}</span>
                    <span className={`font-semibold text-right ${item.color || 'text-white'}`}>{item.value}</span>
                </div>
            ))}
            {transaction.type !== 'transfer' && (
                <div className="flex justify-end gap-3 pt-4">
                    <button onClick={onDelete} className="py-2 px-4 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md transition flex items-center gap-2">
                        <TrashIcon className="w-5 h-5"/> حذف
                    </button>
                    <button onClick={onEdit} className="py-2 px-4 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40 rounded-md transition flex items-center gap-2">
                        <PencilSquareIcon className="w-5 h-5"/> تعديل
                    </button>
                </div>
            )}
        </div>
    );
};


const TransactionsPage: React.FC<{ key: number, handleDatabaseChange: (description?: string) => void }> = ({ key, handleDatabaseChange }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    // Modal states
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    
    const [editingTx, setEditingTx] = useState<Transaction | undefined>(undefined);
    const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
    
    // Search and filter states
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<FilterValues>({ startDate: '', endDate: '', type: 'all', accounts: [], categories: [] });

    // Pagination states
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);

    const fetchData = useCallback(async (currentPage: number, isNewSearch = false) => {
        if (isNewSearch) {
            setLoading(true);
        } else {
            setIsFetchingMore(true);
        }

        const from = currentPage * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

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
        if (searchTerm) query = query.ilike('notes', `%${searchTerm}%`);

        query = query.range(from, to);

        const { data: txData, error: txError } = await query;

        if (txError) {
            console.error('Error fetching transactions:', txError.message);
        } else if (txData) {
            setTransactions(prev => isNewSearch ? txData as unknown as Transaction[] : [...prev, ...txData as unknown as Transaction[]]);
            if (txData.length < PAGE_SIZE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        }
        
        if (isNewSearch) {
             const accPromise = supabase.from('accounts').select('*');
             const catPromise = supabase.from('categories').select('*');
             const [{ data: accData }, { data: catData }] = await Promise.all([accPromise, catPromise]);
             setAccounts(accData || []);
             setCategories(catData || []);
        }

        if (isNewSearch) setLoading(false);
        else setIsFetchingMore(false);

    }, [filters, searchTerm]);

    useEffect(() => {
        setTransactions([]);
        setPage(0);
        setHasMore(true);
        fetchData(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, filters, searchTerm]);

    const loadMore = () => {
        if (isFetchingMore) return;
        const nextPage = page + 1;
        setPage(nextPage);
        fetchData(nextPage, false);
    };

    const closeAllModals = () => {
        setIsFormModalOpen(false);
        setEditingTx(undefined);
        setDeletingTx(null);
        setIsDetailModalOpen(false);
        setSelectedTx(null);
    };
    
    const handleSave = () => {
        const description = editingTx ? 'تعديل معاملة' : 'إضافة معاملة جديدة';
        closeAllModals();
        handleDatabaseChange(description);
    }

    const handleDelete = async () => {
        if (!deletingTx || !deletingTx.account_id || deletingTx.type === 'transfer') {
            alert('لا يمكن حذف التحويلات مباشرة.');
            closeAllModals();
            return;
        }
        const description = `حذف معاملة "${deletingTx.notes || 'غير مسجلة'}"`;
        try {
            const { data: account, error: accError } = await supabase
                .from('accounts')
                .select('balance')
                .eq('id', deletingTx.account_id)
                .single();
    
            if (accError || !account) throw accError || new Error("Account not found");
    
            const balanceChange = deletingTx.type === 'income' ? -deletingTx.amount : deletingTx.amount;
            const newBalance = account.balance + balanceChange;
    
            const { error: updateError } = await supabase
                .from('accounts')
                .update({ balance: newBalance })
                .eq('id', deletingTx.account_id);
            
            if (updateError) throw updateError;
    
            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', deletingTx.id);
    
            if (deleteError) {
                // Attempt to revert
                await supabase
                    .from('accounts')
                    .update({ balance: account.balance })
                    .eq('id', deletingTx.account_id);
                throw deleteError;
            }
    
            handleDatabaseChange(description);
        } catch (error: any) {
             console.error('Error deleting transaction', error.message);
             alert('حدث خطأ أثناء الحذف.');
        } finally {
            closeAllModals();
        }
    }
    
    const handleApplyFilters = (newFilters: FilterValues) => {
        setFilters(newFilters);
        setIsFilterModalOpen(false);
    };
    
    const handleOpenDetailModal = (tx: Transaction) => {
        setSelectedTx(tx);
        setIsDetailModalOpen(true);
    };

    const handleOpenEditFromDetail = () => {
        if (!selectedTx) return;
        setEditingTx(selectedTx);
        setIsFormModalOpen(true);
        setIsDetailModalOpen(false);
    };

    const handleOpenDeleteFromDetail = () => {
        if (!selectedTx) return;
        setDeletingTx(selectedTx);
        setIsDetailModalOpen(false);
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
             <div className="flex gap-2 items-center mb-4">
                 <input 
                    type="text" 
                    placeholder="ابحث في الملاحظات..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="flex-grow bg-slate-800 p-2 rounded-lg text-white border border-transparent focus:border-cyan-500 focus:ring-0 transition"
                />
                <button onClick={() => setIsFilterModalOpen(true)} className="relative flex-shrink-0 flex items-center gap-2 bg-slate-800 py-2 px-4 rounded-lg text-slate-300 hover:bg-slate-700 transition">
                    <FunnelIcon className="w-5 h-5"/>
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-500 text-white text-[10px] rounded-full flex items-center justify-center">{activeFilterCount}</span>}
                </button>
            </div>
            
            {loading ? (
                <div className="mt-4 animate-pulse text-center text-slate-400">جاري تحميل المعاملات...</div>
            ) : transactions.length === 0 ? (
                 <div className="text-center py-10">
                    <p className="text-slate-400 mb-4">{activeFilterCount > 0 || searchTerm ? "لا توجد معاملات تطابق بحثك." : "لا يوجد معاملات مسجلة."}</p>
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
                            <button key={tx.id} onClick={() => handleOpenDetailModal(tx)} className="w-full text-right bg-slate-800 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors animate-fade-in-fast">
                               <div>
                                    <p className="font-bold text-lg">{tx.notes || (tx.type === 'transfer' ? 'تحويل' : tx.categories?.name || 'معاملة')}</p>
                                    <p className="text-sm text-slate-400">{accountInfo}</p>
                               </div>
                               <div className="text-left">
                                   <p className={`font-extrabold text-lg ${tx.type === 'income' ? 'text-green-400' : tx.type === 'expense' ? 'text-red-400' : 'text-slate-300'}`}>
                                        {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{formatCurrency(tx.amount, tx.accounts?.currency)}
                                   </p>
                                   <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                               </div>
                            </button>
                        );
                    })}
                </div>
            )}
            
            {!loading && hasMore && (
                <div className="text-center mt-6">
                    <button onClick={loadMore} disabled={isFetchingMore} className="bg-slate-700 hover:bg-slate-600 text-slate-300 font-bold py-2 px-6 rounded-lg transition disabled:opacity-50">
                        {isFetchingMore ? 'جاري التحميل...' : 'تحميل المزيد'}
                    </button>
                </div>
            )}

            <button onClick={() => { setEditingTx(undefined); setIsFormModalOpen(true); }} className="fixed bottom-20 right-4 h-14 w-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90 z-30">
                <PlusIcon className="w-8 h-8"/>
            </button>
            
            {isDetailModalOpen && selectedTx && (
                <Modal title="تفاصيل المعاملة" onClose={closeAllModals}>
                    <TransactionDetailContent 
                        transaction={selectedTx} 
                        onEdit={handleOpenEditFromDetail} 
                        onDelete={handleOpenDeleteFromDetail} 
                    />
                </Modal>
            )}

            {isFormModalOpen && (
                 <Modal title={editingTx ? 'تعديل المعاملة' : 'إضافة معاملة جديدة'} onClose={closeAllModals}>
                    <TransactionForm
                        transaction={editingTx}
                        onSave={handleSave}
                        onCancel={closeAllModals}
                        accounts={accounts}
                        categories={categories}
                    />
                 </Modal>
            )}

            {deletingTx && (
                 <Modal title="تأكيد الحذف" onClose={() => setDeletingTx(null)}>
                    <p className="text-slate-300 mb-6">هل أنت متأكد من رغبتك في حذف هذه المعاملة؟ سيتم التراجع عن تأثيرها على رصيد الحساب.</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeletingTx(null)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
                    </div>
                 </Modal>
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