
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
    SparklesIcon
} from './icons';
import { logActivity } from '../lib/logger';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', currency);
};

// تعريف الأنماط الاحترافية الثابتة التي يتم تعيينها تلقائياً
const STYLE_PRESETS: Record<string, { bg: string, accent: string, gradient: string }> = {
    'sapphire': { 
        bg: 'bg-[#0a192f]', 
        accent: 'text-blue-400', 
        gradient: 'from-blue-600/30 via-slate-900 to-indigo-900/40' 
    },
    'emerald': { 
        bg: 'bg-[#052c24]', 
        accent: 'text-emerald-400', 
        gradient: 'from-emerald-600/30 via-slate-900 to-teal-900/40' 
    },
    'obsidian': { 
        bg: 'bg-[#0f0f0f]', 
        accent: 'text-slate-400', 
        gradient: 'from-zinc-700/20 via-black to-slate-900/30' 
    },
    'ruby': { 
        bg: 'bg-[#2d0a0a]', 
        accent: 'text-rose-400', 
        gradient: 'from-rose-600/30 via-slate-900 to-red-900/40' 
    },
    'amethyst': { 
        bg: 'bg-[#1a0b2e]', 
        accent: 'text-purple-400', 
        gradient: 'from-purple-600/30 via-slate-900 to-fuchsia-900/40' 
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
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
            <div className="relative w-full max-w-lg bg-[#0d0d0d] rounded-[3.5rem] shadow-2xl border border-white/5 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
                {/* Header Card Area */}
                <div className={`shrink-0 p-10 relative overflow-hidden ${style.bg}`}>
                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
                    <div className={`absolute -top-24 -right-24 w-80 h-80 bg-gradient-to-br ${style.gradient} rounded-full blur-[100px] opacity-70`}></div>
                    
                    <div className="relative z-10 flex justify-between items-start text-white mb-12">
                        <div className="w-14 h-14 rounded-2xl bg-white/5 backdrop-blur-2xl flex items-center justify-center border border-white/10 shadow-inner">
                            {React.createElement(getAccountTypeIcon(account.type), { className: "w-7 h-7 opacity-90" })}
                        </div>
                        <button onClick={onClose} className="p-3 rounded-full bg-white/5 text-white/40 hover:text-white transition-colors border border-white/5">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="relative z-10">
                        <h2 className="text-xs font-black text-white/40 mb-2 tracking-[0.3em] uppercase">{account.name}</h2>
                        <h3 className="text-5xl font-black text-white tracking-tighter tabular-nums">{formatCurrency(account.balance, account.currency)}</h3>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar p-10 space-y-10">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
                            <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">إجمالي الوارد</p>
                            <p className="text-2xl font-bold text-white">+{formatCurrency(stats.income)}</p>
                        </div>
                        <div className="bg-white/[0.02] p-6 rounded-[2rem] border border-white/5">
                            <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">إجمالي الصادر</p>
                            <p className="text-2xl font-bold text-white">-{formatCurrency(stats.expense)}</p>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mb-6">العمليات الأخيرة</h4>
                        {loading ? (
                            <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse"></div>)}</div>
                        ) : transactions.length === 0 ? (
                            <div className="text-center py-10 opacity-20 font-bold">لا يوجد سجلات حالياً</div>
                        ) : (
                            <div className="space-y-3">
                                {transactions.map(tx => {
                                    const isIncome = tx.type === 'income' || (tx.type === 'transfer' && tx.to_account_id === account.id);
                                    return (
                                        <div key={tx.id} className="flex items-center justify-between p-5 bg-white/[0.03] rounded-3xl border border-white/5 group hover:bg-white/[0.05] transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                    {isIncome ? <ArrowDownIcon className="w-5 h-5"/> : <ArrowUpIcon className="w-5 h-5"/>}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-white truncate max-w-[120px]">{tx.notes || tx.categories?.name || 'معاملة مالية'}</p>
                                                    <p className="text-[10px] text-slate-500 font-medium">{new Date(tx.date).toLocaleDateString('ar-LY')}</p>
                                                </div>
                                            </div>
                                            <span className={`text-sm font-black tabular-nums ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer Controls */}
                <div className="p-8 bg-black/40 backdrop-blur-xl border-t border-white/5 flex gap-4">
                    <button onClick={onEdit} className="flex-1 py-5 rounded-[1.5rem] bg-white text-black font-black text-sm flex items-center justify-center gap-2 hover:bg-cyan-50 transition-all active:scale-95 shadow-xl">
                        <PencilSquareIcon className="w-5 h-5" /> تعديل الحساب
                    </button>
                    <button onClick={onDelete} className="p-5 rounded-[1.5rem] bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 transition-all active:scale-95">
                        <TrashIcon className="w-6 h-6" />
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
        
        // تعيين النمط تلقائياً بناءً على النوع المختار للحفاظ على تناسق الواجهة
        let style_preset = account?.style_preset || 'obsidian';
        if (!account?.id) {
            if (type === 'بنكي') style_preset = 'sapphire';
            else if (type === 'نقدي') style_preset = 'emerald';
            else style_preset = 'amethyst';
        }

        const data = { name, type, balance: parseFloat(balance), style_preset, pattern_type: 'mesh' };
        const { error } = account?.id 
            ? await supabase.from('accounts').update(data).eq('id', account.id) 
            : await supabase.from('accounts').insert(data);
        
        if (error) toast.error('فشل في حفظ البيانات');
        else onSave();
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-5">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block px-2">اسم الحساب</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-[#111] border border-white/5 rounded-2xl p-5 text-white focus:outline-none focus:border-white/20 transition-all text-lg font-bold" placeholder="مثلاً: المصرف التجاري" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block px-2">نوع الحساب</label>
                        <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-[#111] border border-white/5 rounded-2xl p-5 text-white focus:outline-none font-bold">
                            <option value="بنكي">بنكي</option>
                            <option value="نقدي">نقدي</option>
                            <option value="مخصص">مخصص</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2 block px-2">الرصيد الحالي</label>
                        <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} required className="w-full bg-[#111] border border-white/5 rounded-2xl p-5 text-white focus:outline-none font-bold tabular-nums" />
                    </div>
                </div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-5 bg-white text-black rounded-[1.5rem] font-black text-lg shadow-2xl active:scale-95 transition-all hover:bg-cyan-50">
                {isSaving ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
            </button>
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
        const { data, error } = await supabase.from('accounts').select('*').order('name');
        if (!error && data) setAccounts(data as Account[]);
        setLoading(false);
    }, []);

    useEffect(() => { fetchAccounts(); }, [fetchAccounts, refreshTrigger]);

    const totalWealth = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

    const handleDelete = async () => {
        if (!modal.account) return;
        const { error } = await supabase.from('accounts').delete().eq('id', modal.account.id);
        if(!error) { 
            logActivity(`حذف حساب: ${modal.account.name}`); 
            setModal({type:null, account:null}); 
            handleDatabaseChange(); 
            toast.success("تم الحذف بنجاح"); 
        } else {
            toast.error("لا يمكن الحذف لارتباطه بعمليات سابقة");
        }
    };

    return (
        <div className="space-y-12 pb-32 max-w-6xl mx-auto px-4">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 animate-slide-up">
                <div>
                    <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.5em] mb-3 flex items-center gap-2">
                        إجمالي الأرصدة المتاحة <SparklesIcon className="w-4 h-4 text-cyan-500" />
                    </p>
                    <h1 className="text-7xl font-black text-white tracking-tighter tabular-nums leading-none">
                        {formatCurrency(totalWealth)}
                    </h1>
                </div>
                <button 
                    onClick={() => setModal({ type: 'add', account: null })} 
                    className="h-16 px-10 bg-white text-black rounded-[1.5rem] font-black text-sm transition-all flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(255,255,255,0.1)] active:scale-95 shrink-0"
                >
                    <PlusIcon className="w-6 h-6" /> إضافة حساب جديد
                </button>
            </div>

            {/* Premium Accounts Grid */}
            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {[1,2,3].map(i => <div key={i} className="h-72 bg-white/[0.02] rounded-[3.5rem] animate-pulse border border-white/5"></div>)}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                    {accounts.map((acc, index) => {
                        // تعيين النمط اللوني بناءً على البريسيت المخزن أو افتراضياً
                        const style = STYLE_PRESETS[acc.style_preset as string] || STYLE_PRESETS.obsidian;
                        const TypeIcon = getAccountTypeIcon(acc.type);
                        return (
                            <div 
                                key={acc.id} 
                                onClick={() => setModal({ type: 'details', account: acc })}
                                className={`group relative h-72 rounded-[3.5rem] p-10 text-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.5)] transition-all duration-700 border border-white/5 cursor-pointer hover:scale-[1.03] active:scale-95 animate-slide-up overflow-hidden ${style.bg}`}
                                style={{ animationDelay: `${index * 100}ms` }}
                            >
                                {/* Decorative Layers */}
                                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-15 pointer-events-none mix-blend-soft-light"></div>
                                <div className={`absolute -top-20 -right-20 w-80 h-80 bg-gradient-to-br ${style.gradient} rounded-full blur-[100px] opacity-40 group-hover:opacity-60 transition-opacity duration-1000`}></div>
                                
                                <div className="relative z-10 flex justify-between items-start h-full flex-col">
                                    <div className="flex justify-between items-center w-full">
                                        <div className="w-16 h-16 bg-white/5 backdrop-blur-2xl rounded-3xl flex items-center justify-center border border-white/10 group-hover:rotate-6 transition-transform shadow-inner">
                                            <TypeIcon className={`w-8 h-8 ${style.accent} opacity-80 group-hover:opacity-100`} />
                                        </div>
                                        <div className="opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                                            <ChevronLeftIcon className="w-8 h-8 text-white/30" />
                                        </div>
                                    </div>

                                    <div>
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 mb-2">{acc.type}</p>
                                        <h3 className="text-3xl font-black mb-6 truncate max-w-[220px] tracking-tight">{acc.name}</h3>
                                        <h4 className="text-4xl font-black tabular-nums tracking-tighter leading-none">{formatCurrency(acc.balance, acc.currency)}</h4>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            {/* Modals */}
            {(modal.type === 'add' || modal.type === 'edit') && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
                    <div className="relative w-full max-w-md bg-[#0d0d0d] rounded-[3rem] shadow-2xl border border-white/10 p-10 animate-slide-up">
                        <div className="flex justify-between items-center mb-10">
                            <h3 className="text-2xl font-black text-white tracking-tight">{modal.type === 'add' ? 'فتح حساب جديد' : 'تعديل البيانات'}</h3>
                            <button onClick={() => setModal({ type: null, account: null })} className="p-3 bg-white/5 rounded-full text-slate-500 hover:text-white transition-colors border border-white/5"><XMarkIcon className="w-6 h-6" /></button>
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
                />
            )}

            <ConfirmDialog 
                isOpen={modal.type === 'delete' && !!modal.account} 
                title="تأكيد حذف الحساب" 
                message={`هل أنت متأكد من حذف حساب "${modal.account?.name}"؟ سيؤدي هذا إلى إزالة سجل الرصيد المرتبط به نهائياً.`} 
                confirmText="نعم، حذف نهائياً" 
                onConfirm={handleDelete} 
                onCancel={() => setModal({ type: null, account: null })} 
            />
        </div>
    );
};

export default AccountsPage;
