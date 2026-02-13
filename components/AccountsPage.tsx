
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Transaction } from '../types';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { 
    PlusIcon, XMarkIcon, WalletIcon, 
    ArrowUpIcon, ArrowDownIcon, 
    PencilSquareIcon, TrashIcon,
    LandmarkIcon, BanknoteIcon, BriefcaseIcon, ChevronLeftIcon,
    SparklesIcon, EyeOffIcon, CreditCardIcon, ScaleIcon
} from './icons';
import { logActivity } from '../lib/logger';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', currency);
};

const STYLE_PRESETS: Record<string, { bg: string, accent: string, gradient: string, glow: string }> = {
    'sapphire': { 
        bg: 'bg-[#0a192f]', 
        accent: 'text-blue-400', 
        gradient: 'from-blue-600/40 via-blue-900/20 to-slate-950',
        glow: 'shadow-blue-500/20'
    },
    'emerald': { 
        bg: 'bg-[#052c24]', 
        accent: 'text-emerald-400', 
        gradient: 'from-emerald-600/40 via-emerald-900/20 to-slate-950',
        glow: 'shadow-emerald-500/20'
    },
    'obsidian': { 
        bg: 'bg-[#0f0f0f]', 
        accent: 'text-slate-400', 
        gradient: 'from-zinc-700/30 via-zinc-900/10 to-black',
        glow: 'shadow-zinc-500/10'
    },
    'ruby': { 
        bg: 'bg-[#2d0a0a]', 
        accent: 'text-rose-400', 
        gradient: 'from-rose-600/40 via-rose-900/20 to-slate-950',
        glow: 'shadow-rose-500/20'
    },
    'amethyst': { 
        bg: 'bg-[#1a0b2e]', 
        accent: 'text-purple-400', 
        gradient: 'from-purple-600/40 via-purple-900/20 to-slate-950',
        glow: 'shadow-purple-500/20'
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
    onToggleArchive: () => void;
}> = ({ account, onClose, onEdit, onDelete, onToggleArchive }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ income: 0, expense: 0 });

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { data: txs } = await supabase
                .from('transactions')
                .select('*, categories(name, icon, color), accounts:account_id(name)')
                .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`)
                .order('date', { ascending: false })
                .limit(10);
            
            if (txs) {
                setTransactions(txs as unknown as Transaction[]);
                let inc = 0, exp = 0;
                txs.forEach((t: any) => {
                    if (t.type === 'income' && t.account_id === account.id) inc += t.amount;
                    if (t.type === 'expense' && t.account_id === account.id) exp += t.amount;
                });
                setStats({ income: inc, expense: exp });
            }
            setLoading(false);
        };
        fetchData();
    }, [account.id]);

    const style = STYLE_PRESETS[account.style_preset as string] || STYLE_PRESETS.obsidian;

    return (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-0 sm:p-4 animate-fade-in pt-safe pb-safe">
            <div className="relative w-full max-w-lg bg-[#080808] h-full sm:h-auto sm:rounded-[3rem] shadow-2xl border border-white/5 flex flex-col sm:max-h-[90vh] overflow-hidden animate-slide-up">
                
                {/* Immersive Header */}
                <div className={`shrink-0 p-8 pb-12 relative overflow-hidden ${style.bg} ${account.is_archived ? 'grayscale' : ''}`}>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                    <div className={`absolute -top-32 -right-32 w-96 h-96 bg-gradient-to-br ${style.gradient} rounded-full blur-[110px] opacity-80 animate-pulse`}></div>
                    
                    <div className="relative z-10 flex justify-between items-center text-white mb-10">
                        <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-white/60 hover:text-white transition-all active:scale-90">
                            <ChevronLeftIcon className="w-6 h-6 rotate-180" />
                        </button>
                        <div className="flex gap-2">
                             <button onClick={onToggleArchive} className={`p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 transition-all ${account.is_archived ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}>
                                <EyeOffIcon className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="relative z-10 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-white/5 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/10 shadow-inner">
                            {React.createElement(getAccountTypeIcon(account.type), { className: `w-8 h-8 ${style.accent}` })}
                        </div>
                        <h2 className="text-sm font-black text-white/40 mb-2 tracking-[0.4em] uppercase">{account.name}</h2>
                        <h3 className="text-5xl font-black text-white tracking-tighter tabular-nums drop-shadow-2xl">
                            {formatCurrency(account.balance, account.currency)}
                        </h3>
                        {account.is_archived && (
                             <span className="inline-block mt-4 px-4 py-1 bg-amber-500/20 text-amber-500 rounded-full text-[10px] font-black tracking-widest border border-amber-500/20 uppercase">هذا الحساب مؤرشف حالياً</span>
                        )}
                    </div>
                </div>

                {/* Account Body Content */}
                <div className="flex-1 overflow-y-auto no-scrollbar p-6 space-y-8 bg-gradient-to-b from-[#0a0a0a] to-[#080808]">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-emerald-500/[0.03] p-5 rounded-[2rem] border border-emerald-500/10 group hover:bg-emerald-500/[0.05] transition-all">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowDownIcon className="w-3 h-3" /> إجمالي الوارد</p>
                            <p className="text-xl font-black text-white tabular-nums">+{formatCurrency(stats.income)}</p>
                        </div>
                        <div className="bg-rose-500/[0.03] p-5 rounded-[2rem] border border-rose-500/10 group hover:bg-rose-500/[0.05] transition-all">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2 flex items-center gap-2"><ArrowUpIcon className="w-3 h-3" /> إجمالي الصادر</p>
                            <p className="text-xl font-black text-white tabular-nums">-{formatCurrency(stats.expense)}</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex justify-between items-center mb-6 px-2">
                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">سجل العمليات الأخير</h4>
                             <SparklesIcon className="w-4 h-4 text-cyan-500 opacity-20" />
                        </div>
                        {loading ? (
                            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 bg-white/[0.02] rounded-3xl animate-pulse"></div>)}</div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-16 opacity-20 flex flex-col items-center gap-4">
                                <WalletIcon className="w-12 h-12" />
                                <p className="font-bold text-sm">لا يوجد عمليات مسجلة بعد</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map(tx => {
                                    const isIncome = tx.type === 'income' || (tx.type === 'transfer' && tx.to_account_id === account.id);
                                    return (
                                        <div key={tx.id} className="flex items-center justify-between p-5 bg-white/[0.02] rounded-3xl border border-white/5 group hover:border-white/10 transition-all active:scale-[0.98]">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                    {isIncome ? <ArrowDownIcon className="w-5 h-5"/> : <ArrowUpIcon className="w-5 h-5"/>}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-sm font-black text-white truncate max-w-[140px]">{tx.notes || tx.categories?.name || 'معاملة مالية'}</p>
                                                    <p className="text-[10px] text-slate-500 font-bold mt-0.5">{new Date(tx.date).toLocaleDateString('ar-LY')}</p>
                                                </div>
                                            </div>
                                            <div className="text-left">
                                                <span className={`text-base font-black tabular-nums ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-black/40 backdrop-blur-2xl border-t border-white/5 flex gap-3 pb-safe">
                    <button onClick={onEdit} className="flex-[3] py-5 rounded-2xl bg-white text-black font-black text-sm flex items-center justify-center gap-3 hover:bg-cyan-50 transition-all active:scale-95 shadow-xl shadow-white/5">
                        <PencilSquareIcon className="w-5 h-5" /> تعديل البيانات
                    </button>
                    <button onClick={onDelete} className="flex-1 p-5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all active:scale-95 border border-rose-500/10">
                        <TrashIcon className="w-6 h-6 mx-auto" />
                    </button>
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
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        
        let style_preset = account?.style_preset || 'obsidian';
        if (!account?.id) {
            if (type === 'بنكي') style_preset = 'sapphire';
            else if (type === 'نقدي') style_preset = 'emerald';
            else style_preset = 'amethyst';
        }

        const data = { name, type, balance: parseFloat(balance), style_preset, pattern_type: 'mesh', is_archived: account?.is_archived || false };
        const { error } = account?.id 
            ? await supabase.from('accounts').update(data).eq('id', account.id) 
            : await supabase.from('accounts').insert(data);
        
        if (error) toast.error('فشل في حفظ البيانات');
        else onSave();
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">اسم الحساب (مثلاً: مصرف الأمان)</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-transparent border-b border-slate-700 p-2 text-white focus:outline-none focus:border-cyan-500 transition-all text-xl font-black" placeholder="اسم الحساب" />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">النوع</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-transparent text-white focus:outline-none font-bold appearance-none">
                            <option value="بنكي">بنكي</option>
                            <option value="نقدي">نقدي</option>
                            <option value="مخصص">مخصص</option>
                        </select>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">الرصيد الافتتاحي</label>
                        <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} required className="w-full bg-transparent text-white focus:outline-none font-black tabular-nums text-xl" />
                    </div>
                </div>
            </div>
            <div className="flex gap-3">
                <button type="button" onClick={onCancel} className="flex-1 py-4 text-slate-500 font-bold">إلغاء</button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-5 bg-cyan-600 text-white rounded-2xl font-black text-lg shadow-2xl shadow-cyan-900/40 active:scale-95 transition-all">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الحساب'}
                </button>
            </div>
        </form>
    );
};

const AccountsPage: React.FC<{ refreshTrigger: number, handleDatabaseChange: (description?: string) => void }> = ({ refreshTrigger, handleDatabaseChange }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ type: 'add' | 'edit' | 'delete' | 'details' | null, account: Account | null }>({ type: null, account: null });
    const toast = useToast();

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('accounts').select('*').order('is_archived', { ascending: true }).order('name');
        if (!error && data) setAccounts(data as Account[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts, refreshTrigger]);

    const totalWealth = useMemo(() => accounts.filter(a => !a.is_archived).reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

    const handleDelete = async () => {
        if (!modal.account) return;
        const { error } = await supabase.from('accounts').delete().eq('id', modal.account.id);
        if(!error) { 
            logActivity(`حذف حساب: ${modal.account.name}`); 
            setModal({type:null, account:null}); 
            handleDatabaseChange(); 
            toast.success("تم حذف الحساب بنجاح"); 
        } else {
            toast.error("لا يمكن الحذف لارتباط الحساب بعمليات نشطة");
        }
    };

    const handleToggleArchive = async (account: Account) => {
        const { error } = await supabase.from('accounts').update({ is_archived: !account.is_archived }).eq('id', account.id);
        if(!error) {
            toast.success(account.is_archived ? "تمت استعادة الحساب للنشاط" : "تم أرشفة الحساب بنجاح");
            setModal({type: null, account: null});
            fetchAccounts();
            handleDatabaseChange();
        }
    };

    return (
        <div className="space-y-10 pb-32 max-w-5xl mx-auto px-1">
            
            {/* 1. Dashboard Header */}
            <div className="relative group animate-slide-up">
                 <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-700 blur-3xl opacity-10 rounded-[3rem] -z-10 group-hover:opacity-20 transition-opacity"></div>
                 <div className="glass-card rounded-[3rem] p-8 border border-white/10 bg-slate-900/60 overflow-hidden relative">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none"></div>
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                        <div>
                            <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mb-3 flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3 text-cyan-400" /> إجمالي الثروة النقدية النشطة
                            </p>
                            <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter tabular-nums leading-none">
                                {formatCurrency(totalWealth)}
                            </h1>
                        </div>
                        <button 
                            onClick={() => setModal({ type: 'add', account: null })} 
                            className="h-16 px-8 bg-cyan-600 text-white rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-3 shadow-xl shadow-cyan-900/40 hover:bg-cyan-500 active:scale-95 shrink-0"
                        >
                            <PlusIcon className="w-6 h-6" /> إضافة حساب مالي
                        </button>
                    </div>
                 </div>
            </div>

            {/* 2. Accounts Section Title */}
            <div className="flex items-center justify-between px-2">
                 <h2 className="text-xs font-black text-slate-500 uppercase tracking-[0.4em] flex items-center gap-2">
                    <CreditCardIcon className="w-4 h-4" /> محفظة حساباتك ({accounts.length})
                 </h2>
                 <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_5px_rgba(16,185,129,0.5)]"></div>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-20"></div>
                 </div>
            </div>

            {/* 3. Cards Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1,2,3,4].map(i => <div key={i} className="h-64 bg-white/[0.02] rounded-[2.5rem] animate-pulse border border-white/5"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {accounts.map((acc, index) => {
                        const style = STYLE_PRESETS[acc.style_preset as string] || STYLE_PRESETS.obsidian;
                        const TypeIcon = getAccountTypeIcon(acc.type);
                        return (
                            <div 
                                key={acc.id} 
                                onClick={() => setModal({ type: 'details', account: acc })}
                                className={`group relative h-64 rounded-[2.5rem] p-8 text-white shadow-2xl transition-all duration-700 border border-white/5 cursor-pointer hover:-translate-y-2 active:scale-95 animate-slide-up overflow-hidden ${style.bg} ${acc.is_archived ? 'opacity-40 grayscale blur-[1px]' : style.glow}`}
                                style={{ animationDelay: `${index * 80}ms` }}
                            >
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none mix-blend-overlay"></div>
                                <div className={`absolute -top-32 -right-32 w-80 h-80 bg-gradient-to-br ${style.gradient} rounded-full blur-[90px] opacity-40 group-hover:opacity-70 transition-opacity duration-1000`}></div>
                                
                                <div className="relative z-10 flex flex-col justify-between h-full">
                                    <div className="flex justify-between items-start">
                                        <div className="w-14 h-14 bg-white/5 backdrop-blur-3xl rounded-2xl flex items-center justify-center border border-white/10 group-hover:rotate-6 transition-transform shadow-inner">
                                            <TypeIcon className={`w-7 h-7 ${style.accent} opacity-80 group-hover:opacity-100`} />
                                        </div>
                                        {acc.is_archived ? (
                                            <div className="bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/20 flex items-center gap-1.5 backdrop-blur-md">
                                                <EyeOffIcon className="w-3.5 h-3.5 text-amber-500" />
                                                <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">مؤرشف</span>
                                            </div>
                                        ) : (
                                            <div className="w-10 h-6 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
                                                <div className="w-6 h-4 bg-gradient-to-r from-yellow-500 to-amber-600 rounded-[2px] opacity-50"></div>
                                            </div>
                                        )}
                                    </div>

                                    <div>
                                        <p className="text-[9px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">{acc.type}</p>
                                        <h3 className="text-2xl font-black mb-1 truncate max-w-[240px] tracking-tight group-hover:text-cyan-400 transition-colors">{acc.name}</h3>
                                        <h4 className="text-4xl font-black tabular-nums tracking-tighter leading-none flex items-baseline gap-2">
                                            {formatCurrency(acc.balance, acc.currency)}
                                        </h4>
                                    </div>
                                </div>
                                
                                {/* Professional Patterns */}
                                <div className="absolute bottom-4 right-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
                                     <ScaleIcon className="w-32 h-32 rotate-12" />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Empty State */}
            {!loading && accounts.length === 0 && (
                <div className="py-24 text-center glass-card rounded-[3rem] border-2 border-dashed border-slate-800 bg-slate-900/20">
                     <WalletIcon className="w-16 h-16 mx-auto mb-6 text-slate-700 opacity-20" />
                     <h3 className="text-xl font-bold text-slate-500">لا يوجد حسابات مالية مضافة</h3>
                     <p className="text-slate-600 text-sm mt-2 mb-8">ابدأ بإضافة حساب بنكي أو محفظة نقدية لتتبع أموالك</p>
                     <button onClick={() => setModal({ type: 'add', account: null })} className="bg-white text-black px-8 py-4 rounded-2xl font-black text-sm">إضافة حساب الآن</button>
                </div>
            )}

            {/* Modals */}
            {(modal.type === 'add' || modal.type === 'edit') && (
                <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
                    <div className="relative w-full max-w-md bg-[#0a0a0a] rounded-[2.5rem] shadow-2xl border border-white/10 p-8 animate-slide-up">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-white tracking-tight">{modal.type === 'add' ? 'فتح حساب مالي' : 'تحديث البيانات'}</h3>
                            <button onClick={() => setModal({ type: null, account: null })} className="p-3 bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <AccountForm account={modal.account} onSave={() => { setModal({type:null, account:null}); handleDatabaseChange(); fetchAccounts(); }} onCancel={() => setModal({ type: null, account: null })} />
                    </div>
                </div>
            )}

            {modal.type === 'details' && modal.account && (
                <AccountDetailsModal 
                    account={modal.account} 
                    onClose={() => setModal({ type: null, account: null })} 
                    onEdit={() => setModal({ type: 'edit', account: modal.account })} 
                    onDelete={() => setModal({ type: 'delete', account: modal.account })}
                    onToggleArchive={() => handleToggleArchive(modal.account!)}
                />
            )}

            <ConfirmDialog 
                isOpen={modal.type === 'delete' && !!modal.account} 
                title="حذف الحساب" 
                message={`هل أنت متأكد تماماً من حذف حساب "${modal.account?.name}"؟ سيتم حذف جميع السجلات المرتبطة به ولا يمكن التراجع.`} 
                confirmText="نعم، حذف نهائياً" 
                onConfirm={handleDelete} 
                onCancel={() => setModal({ type: null, account: null })} 
            />
        </div>
    );
};

export default AccountsPage;
