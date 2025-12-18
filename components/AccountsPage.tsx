
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
import { logActivity } from '../lib/logger';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', currency);
};

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

const AccountDetailsModal: React.FC<{
    account: Account;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ account, onClose, onEdit, onDelete }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ income: 0, expense: 0, transferIn: 0, transferOut: 0 });
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const PAGE_SIZE = 10;

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

    const fetchTransactions = useCallback(async (pageNumber: number, isLoadMore = false) => {
        if (!isLoadMore) setLoading(true);
        else setLoadingMore(true);
        const from = pageNumber * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error } = await supabase
            .from('transactions')
            .select('*, categories(name, icon, color), accounts:account_id(name), to_accounts:to_account_id(name)')
            .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`)
            .order('date', { ascending: false })
            .range(from, to);
        if (!error && data) {
            const newTransactions = data as unknown as Transaction[];
            setHasMore(newTransactions.length === PAGE_SIZE);
            setTransactions(prev => isLoadMore ? [...prev, ...newTransactions] : newTransactions);
        }
        setLoading(false);
        setLoadingMore(false);
    }, [account.id]);

    useEffect(() => {
        setPage(0);
        fetchTransactions(0, false);
    }, [fetchTransactions]);

    const handleLoadMore = () => {
        const nextPage = page + 1;
        setPage(nextPage);
        fetchTransactions(nextPage, true);
    };

    const themeId = account.theme || getDefaultThemeForType(account.type);
    const themeOption = THEME_OPTIONS.find(t => t.id === themeId) || THEME_OPTIONS[0];

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className={`w-full max-w-4xl h-[90vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col lg:flex-row overflow-hidden animate-slide-up ${themeOption.class.replace('bg-gradient-to-bl', 'bg-gradient-to-br')}`}>
                <div className="lg:w-1/3 p-8 border-b lg:border-b-0 lg:border-l border-white/10 flex flex-col bg-black/20">
                    <div className="flex justify-between items-start mb-8">
                        <div>
                            <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">بيانات الحساب</p>
                            <h2 className="text-3xl font-black text-white">{account.name}</h2>
                            <span className="inline-block mt-2 text-[10px] px-3 py-1 rounded-full bg-white/10 border border-white/10 text-white font-bold">{account.type}</span>
                        </div>
                        <button onClick={onClose} className="lg:hidden p-2 rounded-full bg-black/20 text-white"><XMarkIcon className="w-6 h-6" /></button>
                    </div>
                    <div className="flex-1 space-y-6">
                        <div className="glass-card p-6 rounded-2xl border border-white/10">
                            <p className="text-white/60 text-sm mb-1">الرصيد الكلي</p>
                            <p className="text-4xl font-black text-white">{formatCurrency(account.balance, account.currency)}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                <p className="text-[10px] text-slate-400 font-bold mb-1">دخل + وارد</p>
                                <p className="text-emerald-400 font-black">{formatCurrency(stats.income + stats.transferIn)}</p>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-xl border border-white/5">
                                <p className="text-[10px] text-slate-400 font-bold mb-1">صرف + صادر</p>
                                <p className="text-rose-400 font-black">{formatCurrency(stats.expense + stats.transferOut)}</p>
                            </div>
                        </div>
                        <div className="pt-6 border-t border-white/5 space-y-3">
                            <button onClick={onEdit} className="w-full flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition"><PencilSquareIcon className="w-5 h-5"/> تعديل البيانات</button>
                            <button onClick={onDelete} className="w-full flex items-center justify-center gap-2 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white rounded-xl font-bold transition"><TrashIcon className="w-5 h-5"/> حذف الحساب</button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-slate-900/60">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-white font-black text-xl flex items-center gap-3"><CalendarDaysIcon className="w-6 h-6 text-cyan-400" /> سجل العمليات الأخير</h3>
                        <button onClick={onClose} className="hidden lg:flex p-2 rounded-full bg-white/5 text-white hover:bg-white/10 transition"><XMarkIcon className="w-6 h-6" /></button>
                    </div>
                    {loading ? <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-slate-800 rounded-2xl animate-pulse"></div>)}</div> :
                    transactions.length === 0 ? <div className="text-center py-20 text-slate-500">لا توجد معاملات مسجلة حالياً</div> :
                    <div className="space-y-3">
                        {transactions.map(tx => {
                            const isIncome = tx.type === 'income' || (tx.type === 'transfer' && tx.to_account_id === account.id);
                            return (
                                <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-800/40 border border-white/5 rounded-2xl hover:bg-slate-800/80 transition group">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {tx.type === 'transfer' ? <ArrowsRightLeftIcon className="w-5 h-5"/> : isIncome ? <ArrowDownIcon className="w-5 h-5"/> : <ArrowUpIcon className="w-5 h-5"/>}
                                        </div>
                                        <div>
                                            <p className="text-white font-bold text-sm">{tx.notes || (tx.type === 'transfer' ? (isIncome ? `تحويل من ${tx.accounts?.name}` : `تحويل إلى ${tx.to_accounts?.name}`) : tx.categories?.name || 'بدون عنوان')}</p>
                                            <p className="text-[10px] text-slate-500 font-mono">{new Date(tx.date).toLocaleDateString('ar-LY', {day:'numeric', month:'short', year:'numeric'})}</p>
                                        </div>
                                    </div>
                                    <span className={`font-black ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>{isIncome ? '+' : '-'}{formatCurrency(tx.amount)}</span>
                                </div>
                            );
                        })}
                        {hasMore && <button onClick={handleLoadMore} disabled={loadingMore} className="w-full py-4 text-sm font-black text-cyan-400 hover:text-white transition">عرض المزيد من المعاملات</button>}
                    </div>}
                </div>
            </div>
        </div>
    );
};

const AccountForm: React.FC<{ account?: Account | null; onSave: () => void; onCancel: () => void; }> = ({ account, onSave, onCancel }) => {
    const toast = useToast();
    const [name, setName] = useState(account?.name || '');
    const [type, setType] = useState(account?.type || 'بنكي');
    const [balance, setBalance] = useState(account?.balance?.toString() || '0');
    const [currency, setCurrency] = useState(account?.currency || 'د.ل');
    const [theme, setTheme] = useState(account?.theme || 'blue');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => { if (!account && type) setTheme(getDefaultThemeForType(type)); }, [type, account]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        const numericBalance = parseFloat(balance);
        if (isNaN(numericBalance)) {
            toast.error('يرجى إدخال مبلغ رصيد صحيح');
            setIsSaving(false);
            return;
        }

        // إرسال البيانات الأساسية فقط لضمان عمل الحفظ بدون عمود theme
        const accountData: any = { 
            name, 
            type, 
            balance: numericBalance, 
            currency 
        };

        try {
            let error;
            if (account?.id) {
                const { error: updateError } = await supabase
                    .from('accounts')
                    .update(accountData)
                    .eq('id', account.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('accounts')
                    .insert(accountData);
                error = insertError;
            }

            if (error) {
                console.error('Supabase Error:', error);
                toast.error(`فشل في الحفظ: ${error.message || 'خطأ في قاعدة البيانات'}`);
            } else {
                logActivity(`${account?.id ? 'تعديل' : 'إضافة'} حساب: ${name}`);
                toast.success('تم حفظ بيانات الحساب بنجاح');
                onSave();
            }
        } catch (err: any) {
            console.error('Unexpected Exception:', err);
            toast.error('حدث خطأ غير متوقع أثناء الحفظ');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="text-xs font-bold text-slate-400 mb-1 block">اسم الحساب</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none transition" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">النوع</label>
                    <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none appearance-none">
                        <option value="بنكي">بنكي</option>
                        <option value="نقدي">نقدي</option>
                        <option value="مخصص">مخصص</option>
                    </select>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-400 mb-1 block">الرصيد</label>
                    <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none" />
                </div>
            </div>
            <div>
                <label className="text-xs font-bold text-slate-400 mb-2 block">المظهر (عرض فقط)</label>
                <div className="grid grid-cols-4 gap-2">
                    {THEME_OPTIONS.map(opt => (
                        <button key={opt.id} type="button" onClick={() => setTheme(opt.id)} className={`h-10 rounded-lg border-2 transition-all ${theme === opt.id ? 'border-white scale-105 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'} ${opt.preview}`} />
                    ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-2">ملاحظة: اختيار اللون يؤثر على العرض الحالي فقط ولن يتم حفظه في قاعدة البيانات حتى يتم تحديث الجدول.</p>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onCancel} className="px-6 text-slate-400 font-bold hover:text-white transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="px-8 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-900/20 disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                    {isSaving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'حفظ الحساب'}
                </button>
            </div>
        </form>
    );
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
        <div className="glass-card bg-slate-900 rounded-3xl p-8 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-xl font-black text-white">{title}</h3>
                <button onClick={onClose} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-full text-slate-400 transition-colors"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="relative z-10">{children}</div>
        </div>
    </div>
);

const AccountsPage: React.FC<{ refreshTrigger: number, handleDatabaseChange: (description?: string) => void }> = ({ refreshTrigger, handleDatabaseChange }) => {
    const toast = useToast();
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ type: 'edit' | 'delete' | 'add' | 'details' | null, account: Account | null }>({ type: null, account: null });
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('accounts').select('*').order('name');
        if (error) {
            console.error('Error fetching accounts:', error.message);
            toast.error(`فشل جلب الحسابات: ${error.message}`);
        } else {
            setAccounts(data as Account[] || []);
        }
        setLoading(false);
    }, [toast]);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts, refreshTrigger]);

    const totalWealth = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

    const handleDelete = async () => {
        if (!modal.account) return;
        const { error } = await supabase.from('accounts').delete().eq('id', modal.account.id);
        if(!error) { 
            logActivity(`حذف حساب: ${modal.account.name}`); 
            setModal({type:null, account:null}); 
            handleDatabaseChange(); 
            toast.success("تم حذف الحساب بنجاح"); 
        } else {
            console.error('Delete Error:', error);
            toast.error(`خطأ في الحذف: ${error.message}`);
        }
    };

    return (
        <div className="space-y-8 lg:space-y-12 pb-20">
            <div className="glass-card p-8 lg:p-12 rounded-[2.5rem] border border-white/5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]"></div>
                <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                    <div>
                        <p className="text-slate-400 font-bold lg:text-lg mb-2 flex items-center gap-3"><WalletIcon className="w-6 h-6 text-cyan-400"/> إجمالي الرصيد في جميع الحسابات</p>
                        <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter drop-shadow-2xl">{formatCurrency(totalWealth)}</h1>
                    </div>
                    <button onClick={() => setModal({ type: 'add', account: null })} className="bg-white text-slate-900 px-8 py-4 rounded-[1.5rem] font-black text-sm lg:text-base hover:bg-cyan-50 transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95">إضافة حساب جديد <PlusIcon className="w-6 h-6" /></button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-56 bg-slate-800/50 rounded-[2rem] animate-pulse"></div>)}
                </div>
            ) : accounts.length === 0 ? (
                <div className="text-center py-24 glass-card rounded-[2.5rem] border-dashed border-2 border-slate-700 text-slate-500 font-bold">لا توجد حسابات مضافة حالياً.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 lg:gap-8">
                    {accounts.map(acc => {
                        const themeOption = THEME_OPTIONS.find(t => t.id === (acc.theme || getDefaultThemeForType(acc.type))) || THEME_OPTIONS[0];
                        const TypeIcon = getAccountTypeIcon(acc.type);
                        return (
                            <div key={acc.id} onClick={() => setModal({ type: 'details', account: acc })} className={`relative rounded-[2rem] p-8 text-white shadow-2xl transition-all duration-500 group border cursor-pointer hover:scale-[1.03] hover:shadow-cyan-900/20 ${themeOption.class}`}>
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 rounded-[2rem] overflow-hidden pointer-events-none"></div>
                                <div className="relative z-10 flex justify-between items-start mb-12">
                                    <img src="https://cdn-icons-png.flaticon.com/512/6404/6404078.png" alt="Chip" className="w-12 h-12 opacity-80 invert" />
                                    <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === acc.id ? null : acc.id); }} className="p-2 rounded-full hover:bg-white/10 transition-colors relative">
                                        <EllipsisVerticalIcon className="w-6 h-6 text-white" />
                                        {openMenuId === acc.id && (
                                            <div className="absolute left-0 mt-2 w-36 bg-slate-900 border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1">
                                                <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'edit', account: acc }); setOpenMenuId(null); }} className="w-full text-right px-4 py-2 text-xs font-bold text-slate-200 hover:bg-white/5">تعديل</button>
                                                <button onClick={(e) => { e.stopPropagation(); setModal({ type: 'delete', account: acc }); setOpenMenuId(null); }} className="w-full text-right px-4 py-2 text-xs font-bold text-rose-400 hover:bg-white/5">حذف</button>
                                            </div>
                                        )}
                                    </button>
                                </div>
                                <div className="relative z-10 space-y-6">
                                    <div className="font-mono text-xl tracking-[0.25em] text-white/90 flex items-center gap-2"><span>****</span><span>****</span><span>****</span><span className="text-white font-black">{acc.id.slice(0,4)}</span></div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className="text-[10px] text-white/60 font-black uppercase tracking-wider">الرصيد المتاح</p>
                                                <div className={`w-2 h-2 rounded-full ${acc.balance >= 0 ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,1)]' : 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,1)]'}`}></div>
                                            </div>
                                            <p className="text-3xl font-black tracking-tighter">{formatCurrency(acc.balance, acc.currency)}</p>
                                        </div>
                                        <div className="text-right">
                                             <p className="text-[10px] text-white/60 uppercase font-bold mb-1">{acc.name}</p>
                                             <div className="flex items-center justify-end gap-1.5 opacity-80 bg-black/20 px-3 py-1 rounded-lg w-fit ml-auto border border-white/5"><TypeIcon className="w-3 h-3" /><span className="text-[10px] font-black">{acc.type}</span></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {modal.type === 'add' && <Modal title="فتح حساب جديد" onClose={() => setModal({ type: null, account: null })}><AccountForm onSave={() => { setModal({type:null, account:null}); handleDatabaseChange(); fetchAccounts(); }} onCancel={() => setModal({ type: null, account: null })} /></Modal>}
            {modal.type === 'edit' && modal.account && <Modal title="تحديث بيانات الحساب" onClose={() => setModal({ type: null, account: null })}><AccountForm account={modal.account} onSave={() => { setModal({type:null, account:null}); handleDatabaseChange(); fetchAccounts(); }} onCancel={() => setModal({ type: null, account: null })} /></Modal>}
            {modal.type === 'details' && modal.account && <AccountDetailsModal account={modal.account} onClose={() => setModal({ type: null, account: null })} onEdit={() => setModal({ type: 'edit', account: modal.account })} onDelete={() => setModal({ type: 'delete', account: modal.account })} />}
            <ConfirmDialog isOpen={modal.type === 'delete' && !!modal.account} title="إغلاق الحساب" message={`هل أنت متأكد من رغبتك في حذف حساب "${modal.account?.name}"؟ سيؤدي هذا الإجراء لإزالة الحساب من القائمة، ولكن قد يفشل إذا كان مرتبطاً بمعاملات سابقة.`} confirmText="نعم، حذف نهائي" onConfirm={handleDelete} onCancel={() => setModal({ type: null, account: null })} />
        </div>
    );
};

export default AccountsPage;
