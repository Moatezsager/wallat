import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account, Category } from '../types';
import TransactionForm from './TransactionForm';
import { 
    MagnifyingGlassIcon, FunnelIcon, XMarkIcon, PencilSquareIcon, TrashIcon,
    ArrowDownIcon, ArrowUpIcon, ArrowsRightLeftIcon, iconMap, WalletIcon,
    TagIcon, CalendarDaysIcon
} from './icons';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'LYD' };
    if (amount % 1 === 0) {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    } else {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', currency);
};

const formatDateGroup = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'اليوم';
    if (date.toDateString() === yesterday.toDateString()) return 'الأمس';
    
    return new Intl.DateTimeFormat('ar-LY', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
};

const TransactionIcon: React.FC<{ type: Transaction['type'], className?: string }> = ({ type, className = "w-6 h-6" }) => {
    switch (type) {
        case 'income': return <ArrowDownIcon className={className} />;
        case 'expense': return <ArrowUpIcon className={className} />;
        case 'transfer': return <ArrowsRightLeftIcon className={className} />;
        default: return null;
    }
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700 shadow-xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            {children}
        </div>
    </div>
);

type FilterValues = {
    types: Transaction['type'][];
    date_from: string;
    date_to: string;
    accounts: string[];
    categories: string[];
};

const FilterModal: React.FC<{
    accounts: Account[],
    categories: Category[],
    initialFilters: FilterValues,
    onApply: (filters: FilterValues) => void,
    onClose: () => void,
}> = ({ accounts, categories, initialFilters, onApply, onClose }) => {
    const [tempFilters, setTempFilters] = useState(initialFilters);

    const handleTypeToggle = (type: Transaction['type']) => {
        const newTypes = tempFilters.types.includes(type)
            ? tempFilters.types.filter(t => t !== type)
            : [...tempFilters.types, type];
        setTempFilters(f => ({ ...f, types: newTypes }));
    };
    
    const handleReset = () => {
        // Fix: Explicitly type defaultFilters to match FilterValues and resolve type mismatch.
        const defaultFilters: FilterValues = {
            types: ['income', 'expense', 'transfer'],
            date_from: '', date_to: '',
            accounts: [], categories: []
        };
        setTempFilters(defaultFilters);
        onApply(defaultFilters);
        onClose();
    };

    return (
        <Modal title="تصفية المعاملات" onClose={onClose}>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">نوع المعاملة</label>
                    <div className="flex gap-2">
                        {(['expense', 'income', 'transfer'] as Transaction['type'][]).map(type => (
                            <button key={type} onClick={() => handleTypeToggle(type)}
                                className={`w-full p-2 rounded-md text-sm transition-colors ${tempFilters.types.includes(type) ? 'bg-cyan-600 text-white' : 'bg-slate-700 hover:bg-slate-600'}`}>
                                {{expense: 'مصروف', income: 'دخل', transfer: 'تحويل'}[type]}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">نطاق التاريخ</label>
                    <div className="flex gap-2">
                        <input type="date" value={tempFilters.date_from} onChange={e => setTempFilters(f => ({...f, date_from: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                        <input type="date" value={tempFilters.date_to} onChange={e => setTempFilters(f => ({...f, date_to: e.target.value}))} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                    </div>
                </div>
                 <div>
                    <label htmlFor="account" className="text-sm font-medium text-slate-300 mb-2 block">الحساب</label>
                     <select id="account" value={tempFilters.accounts[0] || ''} onChange={e => setTempFilters(f => ({...f, accounts: e.target.value ? [e.target.value] : []}))} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                        <option value="">كل الحسابات</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex justify-between items-center pt-6 mt-4 border-t border-slate-700">
                <button onClick={handleReset} className="py-2 px-4 text-slate-400 hover:text-white rounded-md transition text-sm">إعادة تعيين</button>
                <button onClick={() => onApply(tempFilters)} className="py-2 px-6 bg-cyan-600 hover:bg-cyan-500 rounded-md transition">تطبيق</button>
            </div>
        </Modal>
    );
};

const TransactionDetailContent: React.FC<{
    transaction: Transaction;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ transaction, onEdit, onDelete }) => {
    const typeInfo = {
        income: { text: 'إيراد', color: 'text-green-400' },
        expense: { text: 'مصروف', color: 'text-red-400' },
        transfer: { text: 'تحويل', color: 'text-indigo-400' },
    }[transaction.type];

    const CategoryIcon = (transaction.categories?.icon && iconMap[transaction.categories.icon]) || TagIcon;

    return (
        <div className="space-y-4">
            <div className="text-center border-b border-slate-700 pb-4">
                <p className="text-sm text-slate-400">{typeInfo.text}</p>
                <p className={`text-5xl font-extrabold ${typeInfo.color}`}>
                    {transaction.type === 'expense' ? '-' : transaction.type === 'income' ? '+' : ''}{formatCurrency(transaction.amount, transaction.accounts?.currency)}
                </p>
                <p className="text-lg font-semibold mt-1 text-slate-300">
                    {transaction.notes || 'لا توجد ملاحظات'}
                </p>
            </div>

            <div className="space-y-3 text-sm">
                {transaction.type === 'transfer' ? (
                    <>
                        <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                            <span className="text-slate-400 flex items-center gap-2"><WalletIcon className="w-4 h-4" /> من حساب</span>
                            <span className="font-semibold">{transaction.accounts?.name || 'غير معروف'}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                            <span className="text-slate-400 flex items-center gap-2"><WalletIcon className="w-4 h-4" /> إلى حساب</span>
                            <span className="font-semibold">{transaction.to_accounts?.name || 'غير معروف'}</span>
                        </div>
                    </>
                ) : (
                    <>
                        <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                            <span className="text-slate-400 flex items-center gap-2"><WalletIcon className="w-4 h-4" /> الحساب</span>
                            <span className="font-semibold">{transaction.accounts?.name || 'غير معروف'}</span>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                            <span className="text-slate-400 flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full flex items-center justify-center -ml-1" style={{ backgroundColor: transaction.categories?.color || '#334155' }}>
                                   <CategoryIcon className="w-4 h-4 text-white"/>
                                </div>
                                الفئة
                            </span>
                            <span className="font-semibold">{transaction.categories?.name || 'غير مصنف'}</span>
                        </div>
                    </>
                )}
                <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                    <span className="text-slate-400 flex items-center gap-2"><CalendarDaysIcon className="w-4 h-4" /> التاريخ والوقت</span>
                    <span className="font-semibold">
                        {new Date(transaction.date).toLocaleString('ar-LY', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <button onClick={onDelete} className="py-2 px-4 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md transition flex items-center gap-2">
                    <TrashIcon className="w-5 h-5" /> حذف
                </button>
                <button onClick={onEdit} className="py-2 px-4 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40 rounded-md transition flex items-center gap-2">
                    <PencilSquareIcon className="w-5 h-5" /> تعديل
                </button>
            </div>
        </div>
    );
};


const TransactionsPage: React.FC<{ key: number, handleDatabaseChange: (description?: string) => void }> = ({ key, handleDatabaseChange }) => {
    const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<FilterValues>({
        types: ['income', 'expense', 'transfer'],
        date_from: '', date_to: '',
        accounts: [], categories: []
    });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modal, setModal] = useState<{ type: 'edit' | 'delete' | null, transaction: Transaction | null }>({ type: null, transaction: null });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTransactionForDetail, setSelectedTransactionForDetail] = useState<Transaction | null>(null);

    // Fix: Refactored data fetching to be more robust, handle errors gracefully, and ensure data is correctly typed.
    // This resolves the "Property 'map' does not exist on type 'unknown'" error by preventing untyped data from being set to state.
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const txPromise = supabase.from('transactions').select('*, accounts:account_id(name, currency), to_accounts:to_account_id(name), categories(name, color, icon)').order('date', { ascending: false });
            const accPromise = supabase.from('accounts').select('*');
            const catPromise = supabase.from('categories').select('*');

            const [txResponse, accResponse, catResponse] = await Promise.all([txPromise, accPromise, catPromise]);
            
            if(txResponse.error) console.error("Error fetching transactions", txResponse.error);
            if(accResponse.error) console.error("Error fetching accounts", accResponse.error);
            if(catResponse.error) console.error("Error fetching categories", catResponse.error);

            setAllTransactions((txResponse.data as unknown as Transaction[]) || []);
            setAccounts((accResponse.data as unknown as Account[]) || []);
            setCategories((catResponse.data as unknown as Category[]) || []);
            setLoading(false);
        };
        fetchData();
    }, [key]);

    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(tx => {
            const txDate = new Date(tx.date);
            const fromDate = filters.date_from ? new Date(filters.date_from) : null;
            const toDate = filters.date_to ? new Date(filters.date_to) : null;
            if(fromDate) fromDate.setHours(0,0,0,0);
            if(toDate) toDate.setHours(23,59,59,999);
            
            return (
                (filters.types.includes(tx.type)) &&
                (!fromDate || txDate >= fromDate) &&
                (!toDate || txDate <= toDate) &&
                (filters.accounts.length === 0 || (tx.account_id && filters.accounts.includes(tx.account_id))) &&
                (searchTerm === '' ||
                    tx.notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    tx.accounts?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    tx.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
            );
        });
    }, [allTransactions, filters, searchTerm]);
    
    const groupedTransactions = useMemo(() => {
        return filteredTransactions.reduce((acc, tx) => {
            const dateKey = formatDateGroup(tx.date);
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(tx);
            return acc;
        }, {} as Record<string, Transaction[]>);
    }, [filteredTransactions]);

    const summary = useMemo(() => {
        return filteredTransactions.reduce((acc, tx) => {
            if (tx.type === 'income') acc.income += tx.amount;
            if (tx.type === 'expense') acc.expense += tx.amount;
            return acc;
        }, { income: 0, expense: 0 });
    }, [filteredTransactions]);
    
    const handleOpenDetailModal = (tx: Transaction) => {
        setSelectedTransactionForDetail(tx);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setSelectedTransactionForDetail(null);
        setIsDetailModalOpen(false);
    };
    
    const handleOpenEditModalFromDetail = () => {
        if (!selectedTransactionForDetail) return;
        setModal({ type: 'edit', transaction: selectedTransactionForDetail });
        handleCloseDetailModal();
    };

    const handleOpenDeleteModalFromDetail = () => {
        if (!selectedTransactionForDetail) return;
        setModal({ type: 'delete', transaction: selectedTransactionForDetail });
        handleCloseDetailModal();
    };


    const handleSave = (description: string) => {
        setModal({ type: null, transaction: null });
        handleDatabaseChange(description);
    };

    const handleDelete = async () => {
        if (!modal.transaction) return;
        const { id, account_id, to_account_id, type, amount } = modal.transaction;

        try {
            if (type === 'transfer') {
                if (!account_id || !to_account_id) throw new Error("Transfer accounts not found");
                const { data: fromAcc } = await supabase.from('accounts').select('balance').eq('id', account_id).single();
                const { data: toAcc } = await supabase.from('accounts').select('balance').eq('id', to_account_id).single();
                if (!fromAcc || !toAcc) throw new Error("Could not fetch transfer accounts");
                await supabase.from('accounts').update({ balance: fromAcc.balance + amount }).eq('id', account_id);
                await supabase.from('accounts').update({ balance: toAcc.balance - amount }).eq('id', to_account_id);
            } else if(account_id) {
                const { data: acc } = await supabase.from('accounts').select('balance').eq('id', account_id).single();
                if (!acc) throw new Error("Account not found");
                const newBalance = type === 'income' ? acc.balance - amount : acc.balance + amount;
                await supabase.from('accounts').update({ balance: newBalance }).eq('id', account_id);
            }

            await supabase.from('transactions').delete().eq('id', id);
            handleSave('تم حذف المعاملة');
        } catch (error: any) {
            console.error("Error deleting transaction:", error.message);
            alert('حدث خطأ أثناء الحذف.');
            setModal({ type: null, transaction: null });
        }
    };
    
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if(filters.types.length !== 3) count++;
        if(filters.date_from || filters.date_to) count++;
        if(filters.accounts.length > 0) count++;
        return count;
    }, [filters]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800 p-2 rounded-lg">
                    <p className="text-xs text-green-400">الدخل</p>
                    <p className="font-bold text-sm">{formatCurrency(summary.income)}</p>
                </div>
                <div className="bg-slate-800 p-2 rounded-lg">
                    <p className="text-xs text-red-400">المصروف</p>
                    <p className="font-bold text-sm">{formatCurrency(summary.expense)}</p>
                </div>
                <div className="bg-slate-800 p-2 rounded-lg">
                    <p className="text-xs text-slate-400">الصافي</p>
                    <p className="font-bold text-sm">{formatCurrency(summary.income - summary.expense)}</p>
                </div>
            </div>
            <div className="flex gap-2 items-center">
                <div className="relative flex-grow">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input type="text" placeholder="ابحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 p-2 pr-10 rounded-lg text-white border border-slate-700 focus:border-cyan-500 focus:ring-0 transition" />
                </div>
                <button onClick={() => setIsFilterModalOpen(true)} className="relative flex-shrink-0 flex items-center gap-2 bg-slate-800 py-2 px-4 rounded-lg text-slate-300 hover:bg-slate-700 transition border border-slate-700">
                    <FunnelIcon className="w-5 h-5"/>
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">{activeFilterCount}</span>}
                </button>
            </div>
            
            {loading ? <p className="text-center py-8 text-slate-400">جاري تحميل المعاملات...</p>
            : Object.keys(groupedTransactions).length === 0 ? <p className="text-center py-8 text-slate-500">لا توجد معاملات تطابق بحثك.</p>
            : (
                <div className="space-y-4">
                    {Object.entries(groupedTransactions).map(([date, txs]) => (
                        <div key={date}>
                            <h3 className="font-semibold text-slate-400 mb-2">{date}</h3>
                            <div className="space-y-2">
                                {txs.map(tx => {
                                    const categoryIconName = tx.categories?.icon;
                                    const CategoryIcon = (categoryIconName && iconMap.hasOwnProperty(categoryIconName)) ? iconMap[categoryIconName] : null;
                                    return (
                                        <button key={tx.id} onClick={() => handleOpenDetailModal(tx)}
                                            className="w-full text-right bg-slate-800 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                                    tx.type === 'income' ? 'bg-green-500/20 text-green-400' : 
                                                    tx.type === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'
                                                }`}>
                                                    {CategoryIcon ? <CategoryIcon className="w-6 h-6"/> : <TransactionIcon type={tx.type} />}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{tx.notes || tx.categories?.name || (tx.type === 'transfer' ? `تحويل إلى ${tx.to_accounts?.name}` : 'معاملة')}</p>
                                                    <p className="text-sm text-slate-400">{tx.accounts?.name || 'حساب محذوف'}</p>
                                                </div>
                                            </div>
                                            <p className={`font-bold text-lg ${tx.type === 'income' ? 'text-green-400' : tx.type === 'expense' ? 'text-red-400' : ''}`}>
                                                {formatCurrency(tx.amount, tx.accounts?.currency)}
                                            </p>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isFilterModalOpen && (
                <FilterModal 
                    accounts={accounts} 
                    categories={categories} 
                    initialFilters={filters}
                    onApply={(newFilters) => { setFilters(newFilters); setIsFilterModalOpen(false); }}
                    onClose={() => setIsFilterModalOpen(false)}
                />
            )}
            
            {isDetailModalOpen && selectedTransactionForDetail && (
                <Modal title="تفاصيل المعاملة" onClose={handleCloseDetailModal}>
                    <TransactionDetailContent
                        transaction={selectedTransactionForDetail}
                        onEdit={handleOpenEditModalFromDetail}
                        onDelete={handleOpenDeleteModalFromDetail}
                    />
                </Modal>
            )}

            {modal.type === 'edit' && modal.transaction && (
                <Modal title="تعديل المعاملة" onClose={() => setModal({ type: null, transaction: null })}>
                    {modal.transaction.type === 'transfer' ? (
                        <p className="text-slate-400 text-center py-4">لا يمكن تعديل التحويلات من هنا. يرجى حذفها وإعادة إنشائها.</p>
                    ) : (
                        <TransactionForm
                            transaction={modal.transaction}
                            onSave={() => handleSave('تم تعديل المعاملة')}
                            onCancel={() => setModal({ type: null, transaction: null })}
                            accounts={accounts}
                            categories={categories}
                        />
                    )}
                </Modal>
            )}

            {modal.type === 'delete' && modal.transaction && (
                 <Modal title="تأكيد الحذف" onClose={() => setModal({ type: null, transaction: null })}>
                    <p className="text-slate-300 mb-6">هل أنت متأكد من حذف هذه المعاملة؟ سيتم التراجع عن تأثيرها على رصيد الحساب.</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setModal({ type: null, transaction: null })} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
                    </div>
                </Modal>
            )}

        </div>
    );
};

export default TransactionsPage;