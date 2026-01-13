
import React, { useState, useMemo, useEffect, useRef, useCallback, memo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Account, Category } from '../types';
import TransactionForm from './TransactionForm';
import { useQuery, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { 
    MagnifyingGlassIcon, FunnelIcon, XMarkIcon, PencilSquareIcon, TrashIcon,
    ArrowDownIcon, ArrowUpIcon, ArrowsRightLeftIcon, iconMap, WalletIcon,
    TagIcon, CalendarDaysIcon, ChevronLeftIcon
} from './icons';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { logActivity } from '../lib/logger';

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

// مكون الهيكل العظمي لتحسين الأداء البصري أثناء التحميل
const TransactionSkeleton = () => (
    <div className="w-full glass-card p-4 rounded-2xl flex justify-between items-center border-transparent animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-800"></div>
            <div className="space-y-2">
                <div className="h-4 w-32 bg-slate-800 rounded"></div>
                <div className="h-3 w-20 bg-slate-800/50 rounded"></div>
            </div>
        </div>
        <div className="h-6 w-16 bg-slate-800 rounded"></div>
    </div>
);

// استخدام memo لمنع إعادة الرندرة غير الضرورية لكل عنصر
const TransactionItem = memo(({ tx, onClick }: { tx: Transaction, onClick: (tx: Transaction) => void }) => {
    const categoryIconName = tx.categories?.icon;
    const CategoryIcon = (categoryIconName && iconMap.hasOwnProperty(categoryIconName)) ? iconMap[categoryIconName] : null;

    const TransactionIcon = ({ type, className = "w-6 h-6" }: { type: Transaction['type'], className?: string }) => {
        switch (type) {
            case 'income': return <ArrowDownIcon className={className} />;
            case 'expense': return <ArrowUpIcon className={className} />;
            case 'transfer': return <ArrowsRightLeftIcon className={className} />;
            default: return null;
        }
    };

    return (
        <button onClick={() => onClick(tx)}
            className="w-full text-right glass-card p-4 rounded-2xl flex justify-between items-center hover:bg-white/5 transition-all group border-transparent hover:border-white/10 active:scale-[0.98] duration-200 hover:shadow-lg">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-md transition-transform group-hover:scale-110 ${
                    tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                    tx.type === 'expense' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                }`}>
                    {CategoryIcon ? <CategoryIcon className="w-6 h-6"/> : <TransactionIcon type={tx.type} />}
                </div>
                <div className="min-w-0">
                    <p className="font-bold text-white text-base mb-0.5 line-clamp-1">{tx.notes || tx.categories?.name || (tx.type === 'transfer' ? `تحويل إلى ${tx.to_accounts?.name}` : 'معاملة')}</p>
                    <p className="text-xs text-slate-400 font-medium truncate">{tx.accounts?.name || 'حساب محذوف'}</p>
                </div>
            </div>
            <p className={`font-extrabold text-lg whitespace-nowrap ${tx.type === 'income' ? 'text-emerald-400' : tx.type === 'expense' ? 'text-rose-400' : 'text-indigo-400'}`}>
                {formatCurrency(tx.amount)}
            </p>
        </button>
    );
});

TransactionItem.displayName = 'TransactionItem';

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
        <div className="glass-card bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
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
            <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-2">
                <div>
                    <label className="text-sm font-medium text-slate-400 mb-2 block">نوع المعاملة</label>
                    <div className="flex gap-2">
                        {(['expense', 'income', 'transfer'] as Transaction['type'][]).map(type => (
                            <button key={type} onClick={() => handleTypeToggle(type)}
                                className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors border ${tempFilters.types.includes(type) ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}>
                                {{expense: 'مصروف', income: 'دخل', transfer: 'تحويل'}[type]}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-400 mb-2 block">نطاق التاريخ</label>
                    <div className="flex gap-3">
                        <input type="date" value={tempFilters.date_from} onChange={e => setTempFilters(f => ({...f, date_from: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                        <input type="date" value={tempFilters.date_to} onChange={e => setTempFilters(f => ({...f, date_to: e.target.value}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                    </div>
                </div>
                 <div>
                    <label htmlFor="account" className="text-sm font-medium text-slate-400 mb-2 block">الحساب</label>
                     <select id="account" value={tempFilters.accounts[0] || ''} onChange={e => setTempFilters(f => ({...f, accounts: e.target.value ? [e.target.value] : []}))} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                        <option value="">كل الحسابات</option>
                        {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                    </select>
                </div>
            </div>
            <div className="flex justify-between items-center pt-6 mt-4 border-t border-white/10">
                <button onClick={handleReset} className="py-2 px-4 text-slate-400 hover:text-white transition font-medium text-sm">إعادة تعيين</button>
                <button onClick={() => onApply(tempFilters)} className="py-2.5 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition font-bold shadow-lg shadow-cyan-500/20">تطبيق</button>
            </div>
        </Modal>
    );
};

const TransactionsPage: React.FC = () => {
    const queryClient = useQueryClient();
    const toast = useToast();
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<FilterValues>({
        types: ['income', 'expense', 'transfer'],
        date_from: '', date_to: '',
        accounts: [], categories: []
    });
    
    // المرجع للكشف عن التمرير التلقائي
    const loadMoreRef = useRef<HTMLDivElement | null>(null);

    const { data: accounts = [] } = useQuery({ queryKey: ['accounts'], queryFn: async () => (await supabase.from('accounts').select('*')).data as Account[] || [] });
    const { data: categories = [] } = useQuery({ queryKey: ['categories'], queryFn: async () => (await supabase.from('categories').select('*')).data as Category[] || [] });

    const PAGE_SIZE = 20;
    
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        error
    } = useInfiniteQuery({
        queryKey: ['transactions', filters, searchTerm],
        queryFn: async ({ pageParam = 0 }) => {
            const start = pageParam * PAGE_SIZE;
            const end = start + PAGE_SIZE - 1;
            
            let query = supabase
                .from('transactions')
                .select('*, accounts:account_id(name, currency), to_accounts:to_account_id(name), categories(name, color, icon)', { count: 'exact' })
                .order('date', { ascending: false })
                .range(start, end);

            if (filters.types.length > 0) query = query.in('type', filters.types);
            if (filters.date_from) query = query.gte('date', new Date(filters.date_from).toISOString());
            if (filters.date_to) query = query.lte('date', new Date(filters.date_to).toISOString());
            if (filters.accounts.length > 0) query = query.in('account_id', filters.accounts);

            if (searchTerm) {
                const { data: matchedAccounts } = await supabase.from('accounts').select('id').ilike('name', `%${searchTerm}%`);
                const { data: matchedCategories } = await supabase.from('categories').select('id').ilike('name', `%${searchTerm}%`);
                
                // Fix: Cast matchedAccounts and matchedCategories explicitly to any[] or [] to satisfy TypeScript and allow .map()
                const accIdsData = (Array.isArray(matchedAccounts) ? matchedAccounts : []) as any[];
                const catIdsData = (Array.isArray(matchedCategories) ? matchedCategories : []) as any[];
                
                // Now map is called on explicitly cast array
                const accIds = accIdsData.map((a: any) => a.id);
                const catIds = catIdsData.map((c: any) => c.id);
                
                const orConditions = [`notes.ilike.%${searchTerm}%`];
                if (accIds.length > 0) {
                    orConditions.push(`account_id.in.(${accIds.join(',')})`);
                    orConditions.push(`to_account_id.in.(${accIds.join(',')})`);
                }
                if (catIds.length > 0) orConditions.push(`category_id.in.(${catIds.join(',')})`);
                query = query.or(orConditions.join(','));
            }

            const { data, error, count } = await query;
            if (error) throw error;
            
            // Fix: Replace unsafe cast with Array.isArray to avoid "Property 'length' does not exist on type 'unknown'"
            const resultData = Array.isArray(data) ? data : [];
            return {
                transactions: resultData as Transaction[],
                totalCount: count || 0,
                nextPage: (resultData.length === PAGE_SIZE) ? pageParam + 1 : undefined
            };
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage) => lastPage.nextPage,
    });

    // مراقب التمرير التلقائي (Intersection Observer)
    useEffect(() => {
        if (!hasNextPage || isFetchingNextPage) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    fetchNextPage();
                }
            },
            { threshold: 0.1, rootMargin: '100px' }
        );

        const currentTarget = loadMoreRef.current;
        if (currentTarget) observer.observe(currentTarget);

        return () => {
            if (currentTarget) observer.unobserve(currentTarget);
        };
    }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

    const allTransactions = useMemo(() => data?.pages.flatMap(page => page.transactions) || [], [data]);

    const { data: stats } = useQuery({
        queryKey: ['transactions-stats', filters, searchTerm],
        queryFn: async () => {
             let query = supabase.from('transactions').select('amount, type, notes, account_id, to_account_id, category_id');
             if (filters.types.length > 0) query = query.in('type', filters.types);
             if (filters.date_from) query = query.gte('date', new Date(filters.date_from).toISOString());
             if (filters.date_to) query = query.lte('date', new Date(filters.date_to).toISOString());
             if (filters.accounts.length > 0) query = query.in('account_id', filters.accounts);
             if (searchTerm) {
                const { data: matchedAccounts } = await supabase.from('accounts').select('id').ilike('name', `%${searchTerm}%`);
                const { data: matchedCategories } = await supabase.from('categories').select('id').ilike('name', `%${searchTerm}%`);
                
                // Fix: Cast matchedAccounts and matchedCategories explicitly to any[] or [] to satisfy TypeScript and allow .map()
                const accIdsForStatsData = (Array.isArray(matchedAccounts) ? matchedAccounts : []) as any[];
                const catIdsForStatsData = (Array.isArray(matchedCategories) ? matchedCategories : []) as any[];
                
                // Now map is called on explicitly cast array
                const accIdsForStats = accIdsForStatsData.map((a: any) => a.id);
                const catIdsForStats = catIdsForStatsData.map((c: any) => c.id);
                
                const orConditions = [`notes.ilike.%${searchTerm}%`];
                if (accIdsForStats.length > 0) { 
                    orConditions.push(`account_id.in.(${accIdsForStats.join(',')})`); 
                    orConditions.push(`to_account_id.in.(${accIdsForStats.join(',')})`); 
                }
                if (catIdsForStats.length > 0) orConditions.push(`category_id.in.(${catIdsForStats.join(',')})`);
                query = query.or(orConditions.join(','));
             }
             const { data } = await query;
             
             // Fix: Explicitly cast narrowing to any[] to satisfy TypeScript for reduce() call on Supabase response
             return (Array.isArray(data) ? (data as any[]) : []).reduce((acc: any, curr: any) => {
                 if (curr.type === 'income') acc.income += curr.amount;
                 if (curr.type === 'expense') acc.expense += curr.amount;
                 return acc;
             }, { income: 0, expense: 0 });
        }
    });

    const summary = stats || { income: 0, expense: 0 };

    // Fix: Explicitly type the reduce generic and initial value to ensure groupedTransactions correctly infers the 'txs' values as 'Transaction[]'
    const groupedTransactions = useMemo(() => {
        return allTransactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
            const dateKey = formatDateGroup(tx.date);
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(tx);
            return acc;
        }, {});
    }, [allTransactions]);

    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [modal, setModal] = useState<{ type: 'edit' | 'delete' | null, transaction: Transaction | null }>({ type: null, transaction: null });
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

    const handleOpenDetail = useCallback((tx: Transaction) => {
        setSelectedTx(tx);
        setIsDetailModalOpen(true);
    }, []);

    const handleSave = (description: string) => {
        setModal({ type: null, transaction: null });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['transactions-stats'] }); 
        toast.success(description);
    };

    const handleDelete = async () => {
        if (!modal.transaction) return;
        const { id, account_id, to_account_id, type, amount } = modal.transaction;
        try {
            if (type === 'transfer') {
                const { data: fromAcc } = await supabase.from('accounts').select('balance').eq('id', account_id!).single();
                const { data: toAcc } = await supabase.from('accounts').select('balance').eq('id', to_account_id!).single();
                await supabase.from('accounts').update({ balance: fromAcc!.balance + amount }).eq('id', account_id!);
                await supabase.from('accounts').update({ balance: toAcc!.balance - amount }).eq('id', to_account_id!);
            } else if(account_id) {
                const { data: acc } = await supabase.from('accounts').select('balance').eq('id', account_id).single();
                const newBalance = type === 'income' ? acc!.balance - amount : acc!.balance + amount;
                await supabase.from('accounts').update({ balance: newBalance }).eq('id', account_id);
            }
            await supabase.from('transactions').delete().eq('id', id);
            logActivity(`حذف معاملة: ${formatCurrency(amount)}`);
            handleSave('تم حذف المعاملة بنجاح');
        } catch (error) {
            toast.error('حدث خطأ أثناء الحذف.');
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
        <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-emerald-400 font-bold mb-1">الدخل</p>
                    <p className="font-extrabold text-lg tracking-tight tabular-nums">{formatCurrency(summary.income)}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-rose-400 font-bold mb-1">المصروف</p>
                    <p className="font-extrabold text-lg tracking-tight tabular-nums">{formatCurrency(summary.expense)}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-cyan-400 font-bold mb-1">الصافي</p>
                    <p className="font-extrabold text-lg tracking-tight tabular-nums">{formatCurrency(summary.income - summary.expense)}</p>
                </div>
            </div>

            <div className="flex gap-3 items-center">
                <div className="relative flex-grow group">
                    <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
                    <input type="text" placeholder="بحث..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 p-3 pr-12 rounded-2xl text-white border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition shadow-inner" />
                </div>
                <button onClick={() => setIsFilterModalOpen(true)} className={`relative flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl transition-all ${activeFilterCount > 0 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}>
                    <FunnelIcon className="w-5 h-5"/>
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">{activeFilterCount}</span>}
                </button>
            </div>
            
            {isLoading ? (
                <div className="space-y-3">
                    {[...Array(6)].map((_,i) => <TransactionSkeleton key={i} />)}
                </div>
            ) : Object.keys(groupedTransactions).length === 0 ? (
                <div className="text-center py-16 bg-slate-900/20 rounded-3xl border-dashed border-2 border-slate-800 text-slate-500">لا توجد سجلات.</div>
            ) : (
                <div className="space-y-6 pb-20">
                    {Object.entries(groupedTransactions).map(([date, txs]) => (
                        <div key={date}>
                            <h3 className="font-bold text-sm text-slate-500 mb-3 px-2 sticky top-16 backdrop-blur-md bg-slate-950/30 rounded-lg inline-block z-10">{date}</h3>
                            <div className="space-y-2">
                                {txs.map(tx => <TransactionItem key={tx.id} tx={tx} onClick={handleOpenDetail} />)}
                            </div>
                        </div>
                    ))}
                    
                    {/* المرجع للكشف عن نهاية القائمة والتحميل التلقائي */}
                    <div ref={loadMoreRef} className="h-20 flex items-center justify-center">
                        {isFetchingNextPage ? (
                            <div className="flex gap-2 items-center text-slate-500 font-bold text-sm">
                                <div className="w-4 h-4 border-2 border-slate-500 border-t-transparent rounded-full animate-spin"></div>
                                جاري تحميل المزيد...
                            </div>
                        ) : hasNextPage ? (
                            <div className="h-1 text-transparent">نهاية محملة</div>
                        ) : (
                            <p className="text-xs text-slate-700 font-bold">لا يوجد المزيد من المعاملات</p>
                        )}
                    </div>
                </div>
            )}

            {/* Modals */}
            {isFilterModalOpen && <FilterModal accounts={accounts} categories={categories} initialFilters={filters} onApply={(f) => {setFilters(f); setIsFilterModalOpen(false);}} onClose={() => setIsFilterModalOpen(false)} />}
            
            {isDetailModalOpen && selectedTx && (
                <Modal title="تفاصيل المعاملة" onClose={() => setIsDetailModalOpen(false)}>
                    <div className="space-y-6">
                        <div className="text-center border-b border-white/10 pb-6">
                            <p className="text-sm text-slate-400 font-medium mb-1">المبلغ</p>
                            <p className={`text-5xl font-extrabold tracking-tight ${selectedTx.type === 'expense' ? 'text-rose-400' : selectedTx.type === 'income' ? 'text-emerald-400' : 'text-indigo-400'}`}>
                                {selectedTx.type === 'expense' ? '-' : selectedTx.type === 'income' ? '+' : ''}{formatCurrency(selectedTx.amount)}
                            </p>
                            <p className="text-lg font-semibold mt-3 text-slate-200 bg-slate-800/50 py-2 px-4 rounded-xl inline-block">{selectedTx.notes || 'بدون ملاحظات'}</p>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                            <button onClick={() => {setModal({type:'delete', transaction:selectedTx}); setIsDetailModalOpen(false);}} className="flex-1 py-3 px-4 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition flex items-center justify-center gap-2 font-bold"><TrashIcon className="w-5 h-5" /> حذف</button>
                            <button onClick={() => {setModal({type:'edit', transaction:selectedTx}); setIsDetailModalOpen(false);}} className="flex-1 py-3 px-4 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-xl transition flex items-center justify-center gap-2 font-bold"><PencilSquareIcon className="w-5 h-5" /> تعديل</button>
                        </div>
                    </div>
                </Modal>
            )}

            {modal.type === 'edit' && modal.transaction && (
                <Modal title="تعديل المعاملة" onClose={() => setModal({ type: null, transaction: null })}>
                    <TransactionForm transaction={modal.transaction} onSave={() => handleSave('تم التعديل')} onCancel={() => setModal({ type: null, transaction: null })} accounts={accounts} categories={categories} />
                </Modal>
            )}

            <ConfirmDialog isOpen={modal.type === 'delete' && !!modal.transaction} title="تأكيد الحذف" message="هل أنت متأكد؟ سيتم حذف هذه المعاملة نهائياً." onConfirm={handleDelete} onCancel={() => setModal({ type: null, transaction: null })} />
        </div>
    );
};

export default TransactionsPage;
