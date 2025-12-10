
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Transaction } from '../types';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { 
    EllipsisVerticalIcon, PlusIcon, XMarkIcon, WalletIcon, 
    ArrowUpIcon, ArrowDownIcon, ArrowsRightLeftIcon,
    CalendarDaysIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, InformationCircleIcon,
    PaintBrushIcon, LandmarkIcon, BanknoteIcon, BriefcaseIcon
} from './icons';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', currency);
};

// --- Modern Card Themes ---
const THEME_OPTIONS = [
    { id: 'blue', name: 'أزرق ليلي', class: 'bg-gradient-to-bl from-slate-900 via-blue-900 to-slate-900 border-blue-500/30', preview: 'bg-blue-900' },
    { id: 'emerald', name: 'زمردي', class: 'bg-gradient-to-bl from-emerald-900 via-teal-900 to-slate-900 border-emerald-500/30', preview: 'bg-emerald-900' },
    { id: 'purple', name: 'بنفسجي', class: 'bg-gradient-to-bl from-fuchsia-900 via-purple-900 to-slate-900 border-fuchsia-500/30', preview: 'bg-fuchsia-900' },
    { id: 'rose', name: 'وردي غامق', class: 'bg-gradient-to-bl from-rose-900 via-pink-900 to-slate-900 border-rose-500/30', preview: 'bg-rose-900' },
    { id: 'amber', name: 'كهرماني', class: 'bg-gradient-to-bl from-amber-900 via-orange-900 to-slate-900 border-amber-500/30', preview: 'bg-amber-900' },
    { id: 'cyan', name: 'سماوي', class: 'bg-gradient-to-bl from-cyan-900 via-sky-900 to-slate-900 border-cyan-500/30', preview: 'bg-cyan-900' },
    { id: 'slate', name: 'داكن', class: 'bg-gradient-to-bl from-slate-800 via-slate-900 to-black border-slate-600/30', preview: 'bg-slate-800' },
    { id: 'gold', name: 'ذهبي', class: 'bg-gradient-to-bl from-yellow-900 via-amber-800 to-slate-900 border-yellow-500/30', preview: 'bg-yellow-900' },
];

const getDefaultThemeForType = (type: string) => {
    switch (type) {
        case 'بنكي': return 'blue';
        case 'نقدي': return 'emerald';
        case 'مخصص': return 'purple';
        default: return 'slate';
    }
};

const getAccountTypeIcon = (type: string) => {
    switch (type) {
        case 'بنكي': return LandmarkIcon;
        case 'نقدي': return BanknoteIcon;
        case 'مخصص': return BriefcaseIcon;
        default: return WalletIcon;
    }
};

// ... AccountDetailsModal ... (keep existing code, just copy it to ensure file integrity)
const AccountDetailsModal: React.FC<{
    account: Account;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ account, onClose, onEdit, onDelete }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ income: 0, expense: 0, transferIn: 0, transferOut: 0 });
    
    // Pagination State
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const PAGE_SIZE = 10;

    // Fetch Stats (Totals) separately to allow accurate stats even with pagination
    useEffect(() => {
        const fetchStats = async () => {
            const { data, error } = await supabase
                .from('transactions')
                .select('amount, type, account_id, to_account_id')
                .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`);

            if (!error && data) {
                let inc = 0, exp = 0, tIn = 0, tOut = 0;
                data.forEach((tx: any) => {
                    if (tx.type === 'income' && tx.account_id === account.id) inc += tx.amount;
                    if (tx.type === 'expense' && tx.account_id === account.id) exp += tx.amount;
                    if (tx.type === 'transfer') {
                        if (tx.account_id === account.id) tOut += tx.amount;
                        if (tx.to_account_id === account.id) tIn += tx.amount;
                    }
                });
                setStats({ income: inc, expense: exp, transferIn: tIn, transferOut: tOut });
            }
        };
        fetchStats();
    }, [account.id]);

    // Fetch Transactions with Pagination
    const fetchTransactions = useCallback(async (pageNumber: number, isLoadMore = false) => {
        if (!isLoadMore) setLoading(true);
        else setLoadingMore(true);

        const from = pageNumber * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;

        const { data, error } = await supabase
            .from('transactions')
            // Fix: Explicitly specify 'accounts:account_id' to avoid ambiguity with 'to_account_id'
            .select('*, categories(name, icon, color), accounts:account_id(name), to_accounts:to_account_id(name)')
            .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`)
            .order('date', { ascending: false })
            .range(from, to);

        if (!error && data) {
            const newTransactions = data as unknown as Transaction[];
            
            if (newTransactions.length < PAGE_SIZE) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

            setTransactions(prev => isLoadMore ? [...prev, ...newTransactions] : newTransactions);
        } else if (error) {
            console.error("Error fetching transactions:", error.message);
        }

        setLoading(false);
        setLoadingMore(false);
    }, [account.id]);

    useEffect(() => {
        // Initial load
        setPage(0);
        setTransactions([]);
        setHasMore(true);
        fetchTransactions(0, false);
    }, [fetchTransactions]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTransactions(nextPage, true);
    };

    const netFlow = (stats.income + stats.transferIn) - (stats.expense + stats.transferOut);
    
    // Resolve Theme
    const themeId = account.theme || getDefaultThemeForType(account.type);
    const themeOption = THEME_OPTIONS.find(t => t.id === themeId) || THEME_OPTIONS[0];

    // Menu logic inside modal
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-2xl h-[90vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-up ${themeOption.class.replace('bg-gradient-to-bl', 'bg-gradient-to-br')}`}>
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start bg-black/20">
                    <div>
                        <p className="text-white/60 text-sm font-medium mb-1">تفاصيل الحساب</p>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            {account.name}
                            <span className="text-xs px-2 py-1 rounded-full bg-white/10 border border-white/10 text-white font-normal">{account.type}</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="relative">
                             <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition">
                                 <EllipsisVerticalIcon className="w-6 h-6" />
                             </button>
                             {isMenuOpen && (
                                <>
                                <div className="fixed inset-0 z-10" onClick={() => setIsMenuOpen(false)}></div>
                                <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden animate-fade-in">
                                    <button onClick={() => { onEdit(); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-right px-4 py-3 text-sm text-slate-200 hover:bg-white/10 transition">
                                        <PencilSquareIcon className="w-4 h-4 text-cyan-400"/> تعديل الحساب
                                    </button>
                                    <button onClick={() => { onDelete(); setIsMenuOpen(false); }} className="flex items-center gap-3 w-full text-right px-4 py-3 text-sm text-rose-400 hover:bg-white/10 transition">
                                        <TrashIcon className="w-4 h-4"/> حذف الحساب
                                    </button>
                                </div>
                                </>
                             )}
                         </div>
                        <button onClick={onClose} className="p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6 bg-slate-900/40 backdrop-blur-sm">
                    
                    {/* Hero Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className={`glass-card p-5 rounded-2xl border border-white/10 relative overflow-hidden`}>
                             <div className="absolute -right-6 -top-6 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
                            <p className="text-white/60 text-sm mb-1">الرصيد الحالي</p>
                            <p className="text-3xl font-extrabold text-white tracking-tight">{formatCurrency(account.balance, account.currency)}</p>
                        </div>
                        <div className="glass-card p-5 rounded-2xl border border-white/5 flex flex-col justify-center">
                             <p className="text-slate-400 text-sm mb-1">صافي الحركة (المسجلة)</p>
                             <p className={`text-xl font-bold ${netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                 {netFlow > 0 ? '+' : ''}{formatCurrency(netFlow, account.currency)}
                             </p>
                        </div>
                    </div>

                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 text-center">
                            <ArrowDownIcon className="w-5 h-5 text-emerald-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 mb-1">دخل + وارد</p>
                            <p className="font-bold text-emerald-400 text-sm">{formatCurrency(stats.income + stats.transferIn)}</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 text-center">
                            <ArrowUpIcon className="w-5 h-5 text-rose-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 mb-1">صرف + صادر</p>
                            <p className="font-bold text-rose-400 text-sm">{formatCurrency(stats.expense + stats.transferOut)}</p>
                        </div>
                         <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 text-center">
                            <ArrowsRightLeftIcon className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 mb-1">العمليات</p>
                            <p className="font-bold text-indigo-400 text-sm">{transactions.length}</p>
                        </div>
                    </div>

                    {/* Transactions List */}
                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <CalendarDaysIcon className="w-5 h-5 text-cyan-400" />
                            سجل المعاملات
                        </h3>
                        {loading && transactions.length === 0 ? (
                             <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse"></div>)}</div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                                لا توجد معاملات مسجلة لهذا الحساب.
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map(tx => {
                                    const isTransfer = tx.type === 'transfer';
                                    const isIncome = tx.type === 'income' || (isTransfer && tx.to_account_id === account.id);
                                    
                                    return (
                                        <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-800/40 border border-white/5 rounded-2xl hover:bg-slate-800/80 transition group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                    {isTransfer ? <ArrowsRightLeftIcon className="w-5 h-5"/> : isIncome ? <ArrowDownIcon className="w-5 h-5"/> : <ArrowUpIcon className="w-5 h-5"/>}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">
                                                        {tx.notes || (isTransfer ? (isIncome ? `تحويل من ${tx.accounts?.name}` : `تحويل إلى ${tx.to_accounts?.name}`) : tx.categories?.name || 'بدون عنوان')}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(tx.date).toLocaleDateString('ar-LY', {day:'numeric', month:'long', year:'numeric'})}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </span>
                                        </div>
                                    );
                                })}

                                {hasMore && (
                                    <button 
                                        onClick={handleLoadMore} 
                                        disabled={loadingMore}
                                        className="w-full py-3 mt-4 text-sm font-bold text-cyan-400 bg-slate-800/50 hover:bg-slate-800 border border-dashed border-slate-700 rounded-xl transition-all flex items-center justify-center gap-2"
                                    >
                                        {loadingMore ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                                                جاري التحميل...
                                            </>
                                        ) : (
                                            <>عرض المزيد من المعاملات</>
                                        )}
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... AccountForm ... (keep existing)
const AccountForm: React.FC<{ account?: Account | null; onSave: () => void; onCancel: () => void; }> = ({ account, onSave, onCancel }) => {
    const toast = useToast();
    const [name, setName] = useState(account?.name || '');
    const [type, setType] = useState(account?.type || 'بنكي');
    const [balance, setBalance] = useState(account?.balance?.toString() || '0');
    const [currency, setCurrency] = useState(account?.currency || 'د.ل');
    const [theme, setTheme] = useState(account?.theme || 'blue');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!account && type) {
            setTheme(getDefaultThemeForType(type));
        }
    }, [type, account]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const accountData = { name, type, balance: parseFloat(balance), currency, theme };
        const { error } = account?.id ? await supabase.from('accounts').update(accountData).eq('id', account.id) : await supabase.from('accounts').insert(accountData);
        if (!error) {
            onSave();
        } else {
            console.error(error);
            toast.error('حدث خطأ أثناء حفظ الحساب');
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
                <label className="text-sm text-slate-400 font-medium">اسم الحساب</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: مصرف الجمهورية" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition" />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-sm text-slate-400 font-medium">نوع الحساب</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-cyan-500">
                        <option value="بنكي">بنكي</option>
                        <option value="نقدي">نقدي</option>
                        <option value="مخصص">مخصص</option>
                    </select>
                </div>
                 <div className="space-y-1">
                    <label className="text-sm text-slate-400 font-medium">الرصيد الحالي</label>
                    <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white outline-none focus:border-cyan-500" />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm text-slate-400 font-medium flex items-center gap-2">
                    <PaintBrushIcon className="w-4 h-4"/>
                    تخصيص المظهر
                </label>
                <div className="grid grid-cols-4 gap-3">
                    {THEME_OPTIONS.map(opt => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setTheme(opt.id)}
                            className={`h-12 rounded-xl transition-all relative overflow-hidden group border-2 ${theme === opt.id ? 'border-white scale-105 shadow-lg' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}`}
                        >
                            <div className={`absolute inset-0 ${opt.preview}`}></div>
                            {theme === opt.id && <div className="absolute inset-0 flex items-center justify-center bg-black/20"><CheckCircleIcon className="w-5 h-5 text-white"/></div>}
                        </button>
                    ))}
                </div>
                <p className="text-center text-xs text-slate-500 mt-2">{THEME_OPTIONS.find(t => t.id === theme)?.name}</p>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <button type="button" onClick={onCancel} className="py-3 px-6 text-slate-400 hover:text-white transition font-bold">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-3 px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition shadow-lg font-bold">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
            </div>
        </form>
    );
};

// ... Modal ... (keep existing)
const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
        <div className="glass-card bg-slate-900 rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700"><XMarkIcon className="w-5 h-5 text-slate-400 hover:text-white transition" /></button>
            </div>
            {children}
        </div>
    </div>
);

// --- AccountsPage ---
const AccountsPage: React.FC<{ refreshTrigger: number, handleDatabaseChange: (description?: string) => void }> = ({ refreshTrigger, handleDatabaseChange }) => {
    const toast = useToast();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ type: 'edit' | 'delete' | 'add' | 'details' | null, account: Account | null }>({ type: null, account: null });
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        const { data } = await supabase.from('accounts').select('*').order('name');
        setAccounts(data as Account[] || []);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts, refreshTrigger]);

    const totalWealth = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

    const handleSave = (description: string) => {
        setModal({ type: null, account: null });
        handleDatabaseChange(description);
        toast.success(description);
    };

    const handleDelete = async () => {
        if (!modal.account) return;
        const { error } = await supabase.from('accounts').delete().eq('id', modal.account.id);
        if(error) {
            console.error(error);
            toast.error('تعذر حذف الحساب. تأكد من حذف المعاملات المرتبطة أولاً.');
        } else {
            handleSave(`تم حذف حساب "${modal.account.name}" بنجاح`);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header with Total Wealth */}
            <div className="glass-card p-6 rounded-3xl border border-white/5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
                <div className="relative z-10 flex justify-between items-end">
                    <div>
                        <p className="text-slate-400 font-medium mb-1 flex items-center gap-2">
                            <WalletIcon className="w-5 h-5 text-cyan-400"/>
                            صافي الثروة
                        </p>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-sm">
                            {formatCurrency(totalWealth)}
                        </h1>
                    </div>
                </div>
            </div>

            {loading ? <div className="grid md:grid-cols-2 gap-6">{[1,2].map(i => <div key={i} className="h-56 bg-slate-800/50 rounded-3xl animate-pulse"></div>)}</div> : 
            accounts.length === 0 ? (
                <div className="text-center py-16 glass-card rounded-3xl border-dashed border-2 border-slate-700">
                    <WalletIcon className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                    <p className="text-slate-400 text-lg">لا توجد حسابات. أضف حسابك الأول!</p>
                </div>
            ) :
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {accounts.map(acc => {
                    const themeId = acc.theme || getDefaultThemeForType(acc.type);
                    const themeOption = THEME_OPTIONS.find(t => t.id === themeId) || THEME_OPTIONS[0];
                    const themeClass = themeOption.class;
                    const isMenuOpen = openMenuId === acc.id;
                    const TypeIcon = getAccountTypeIcon(acc.type);
                    
                    return (
                        <div 
                            key={acc.id} 
                            // IMPORTANT: Removed 'transform' and hover effects when menu is open to fix stacking context for fixed overlay
                            className={`relative rounded-[24px] p-7 text-white shadow-2xl transition-all duration-300 group border ${themeClass} ${isMenuOpen ? 'z-50' : 'hover:-translate-y-2 hover:shadow-cyan-900/10'}`}
                        >
                            
                            {/* Card Texture & Effects */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 rounded-[24px] overflow-hidden pointer-events-none"></div>
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-[50px] pointer-events-none"></div>

                            {/* Distinctive Large Watermark Icon */}
                            <div className="absolute -bottom-4 -left-4 text-white/5 rotate-12 z-0 pointer-events-none">
                                <TypeIcon className="w-32 h-32" strokeWidth={1} />
                            </div>
                            
                            {/* Card Header: Chip & Actions */}
                            <div className="relative z-30 flex justify-between items-start mb-8">
                                <img src="https://cdn-icons-png.flaticon.com/512/6404/6404078.png" alt="Chip" className="w-10 h-10 opacity-80 invert" />
                                
                                <div className="relative z-50">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === acc.id ? null : acc.id); }} 
                                        className="p-2 rounded-full hover:bg-white/10 transition backdrop-blur-md"
                                    >
                                        <EllipsisVerticalIcon className="w-6 h-6 text-white" />
                                    </button>
                                    
                                    {isMenuOpen && (
                                        <>
                                            {/* Fixed backdrop for blur effect - works better when parent transform is removed */}
                                            <div 
                                                className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity" 
                                                onClick={(e) => { e.stopPropagation(); setOpenMenuId(null); }}
                                                style={{ cursor: 'default' }}
                                            ></div>
                                            
                                            {/* Menu Dropdown - Absolute relative to button parent */}
                                            <div className="absolute left-0 mt-2 w-48 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in origin-top-left ring-1 ring-white/5">
                                                <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'details', account: acc }); setOpenMenuId(null); }} className="flex items-center gap-3 w-full text-right px-4 py-3.5 text-sm text-cyan-400 font-bold hover:bg-white/5 border-b border-white/5 transition bg-slate-900">
                                                    <InformationCircleIcon className="w-5 h-5"/> التفاصيل والمعاملات
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'edit', account: acc }); setOpenMenuId(null); }} className="flex items-center gap-3 w-full text-right px-4 py-3.5 text-sm text-slate-200 hover:bg-white/5 border-b border-white/5 transition bg-slate-900">
                                                    <PencilSquareIcon className="w-5 h-5"/> تعديل الحساب
                                                </button>
                                                <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'delete', account: acc }); setOpenMenuId(null); }} className="flex items-center gap-3 w-full text-right px-4 py-3.5 text-sm text-rose-400 hover:bg-white/5 transition bg-slate-900">
                                                    <TrashIcon className="w-5 h-5"/> حذف الحساب
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* Card Body: Number & Info */}
                            <div className="relative z-10 space-y-6 cursor-pointer" onClick={() => setModal({ type: 'details', account: acc })}>
                                <div className="font-mono text-lg tracking-[0.2em] text-white/80 flex items-center gap-2">
                                    <span>****</span><span>****</span><span>****</span>
                                    <span className="text-white font-bold">{acc.id.slice(0,4)}</span>
                                </div>
                                
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="text-xs text-white/60 font-medium mb-1 uppercase tracking-wider">الرصيد</p>
                                        <p className="text-3xl font-bold tracking-tight">{formatCurrency(acc.balance, acc.currency)}</p>
                                    </div>
                                    <div className="text-right">
                                         <p className="text-[10px] text-white/60 uppercase tracking-wider mb-0.5">الاسم</p>
                                         <p className="text-sm font-bold truncate max-w-[100px] mb-1">{acc.name}</p>
                                         <div className="flex items-center justify-end gap-1.5 opacity-80 bg-black/20 px-2 py-0.5 rounded-lg w-fit ml-auto">
                                            <TypeIcon className="w-3 h-3" />
                                            <span className="text-[10px]">{acc.type}</span>
                                         </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>}
            
            {/* Centered FAB */}
            <button 
                onClick={() => setModal({ type: 'add', account: null })} 
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 h-16 w-16 bg-slate-900 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-300 border-4 border-slate-900 overflow-visible hover:scale-105 active:scale-95 group"
            >
                <div className="absolute inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <PlusIcon className="w-8 h-8 text-white transition-transform duration-300 group-hover:rotate-90"/>
                </div>
            </button>

            {/* Modals */}
            {(modal.type === 'add' || modal.type === 'edit') && (
                <Modal title={modal.type === 'add' ? 'إضافة حساب' : 'تعديل حساب'} onClose={() => setModal({ type: null, account: null })}>
                    <AccountForm account={modal.account} onSave={() => handleSave(modal.type === 'add' ? 'تمت إضافة الحساب بنجاح' : 'تم حفظ تعديلات الحساب بنجاح')} onCancel={() => setModal({ type: null, account: null })} />
                </Modal>
            )}
            
            <ConfirmDialog 
                isOpen={modal.type === 'delete' && !!modal.account}
                title="حذف الحساب"
                message={`هل أنت متأكد من رغبتك في حذف حساب "${modal.account?.name}"؟ سيؤدي هذا الإجراء إلى حذف جميع البيانات المرتبطة بالحساب ولا يمكن التراجع عنه.`}
                confirmText="حذف نهائي"
                onConfirm={handleDelete}
                onCancel={() => setModal({ type: null, account: null })}
            />

            {modal.type === 'details' && modal.account && (
                <AccountDetailsModal 
                    account={modal.account} 
                    onClose={() => setModal({ type: null, account: null })}
                    onEdit={() => setModal({ type: 'edit', account: modal.account })}
                    onDelete={() => setModal({ type: 'delete', account: modal.account })}
                />
            )}
        </div>
    );
};

export default AccountsPage;
