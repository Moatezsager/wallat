
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Transaction } from '../types';
import { 
    EllipsisVerticalIcon, PlusIcon, XMarkIcon, WalletIcon, 
    CreditCardIcon, ArrowUpIcon, ArrowDownIcon, ArrowsRightLeftIcon,
    CalendarDaysIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, InformationCircleIcon
} from './icons';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', currency);
};

// --- Modern Card Themes ---
const CARD_THEMES = {
    'بنكي': 'bg-gradient-to-bl from-slate-900 via-blue-900 to-slate-900 border-blue-500/30',
    'نقدي': 'bg-gradient-to-bl from-emerald-900 via-teal-900 to-slate-900 border-emerald-500/30',
    'مخصص': 'bg-gradient-to-bl from-fuchsia-900 via-purple-900 to-slate-900 border-fuchsia-500/30',
    'default': 'bg-gradient-to-bl from-slate-800 via-slate-900 to-black border-slate-600/30'
};

// --- Account Details Modal Component ---
const AccountDetailsModal: React.FC<{
    account: Account;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ account, onClose, onEdit, onDelete }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ income: 0, expense: 0, transferIn: 0, transferOut: 0 });

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            // Fetch transactions where this account is either the source OR the destination
            const { data, error } = await supabase
                .from('transactions')
                .select('*, categories(name, icon, color), accounts(name), to_accounts:to_account_id(name)')
                .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`)
                .order('date', { ascending: false });

            if (!error && data) {
                const txs = data as unknown as Transaction[];
                setTransactions(txs);

                // Calculate stats
                let inc = 0, exp = 0, tIn = 0, tOut = 0;
                txs.forEach(tx => {
                    if (tx.type === 'income' && tx.account_id === account.id) inc += tx.amount;
                    if (tx.type === 'expense' && tx.account_id === account.id) exp += tx.amount;
                    if (tx.type === 'transfer') {
                        if (tx.account_id === account.id) tOut += tx.amount;
                        if (tx.to_account_id === account.id) tIn += tx.amount;
                    }
                });
                setStats({ income: inc, expense: exp, transferIn: tIn, transferOut: tOut });
            }
            setLoading(false);
        };
        fetchDetails();
    }, [account.id]);

    const netFlow = (stats.income + stats.transferIn) - (stats.expense + stats.transferOut);

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-900 w-full max-w-2xl h-[90vh] rounded-3xl border border-white/10 shadow-2xl flex flex-col overflow-hidden animate-slide-up">
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-start bg-gradient-to-b from-slate-800/50 to-transparent">
                    <div>
                        <p className="text-slate-400 text-sm font-medium mb-1">تفاصيل الحساب</p>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            {account.name}
                            <span className="text-xs px-2 py-1 rounded-full bg-slate-800 border border-white/10 text-slate-300 font-normal">{account.type}</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                         <div className="relative group">
                             <button className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition">
                                 <EllipsisVerticalIcon className="w-6 h-6" />
                             </button>
                             {/* Dropdown for actions inside details */}
                            <div className="absolute left-0 mt-2 w-40 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-20 overflow-hidden hidden group-hover:block hover:block">
                                <button onClick={onEdit} className="flex items-center gap-2 w-full text-right px-4 py-3 text-sm text-slate-200 hover:bg-white/10 transition">
                                    <PencilSquareIcon className="w-4 h-4"/> تعديل
                                </button>
                                <button onClick={onDelete} className="flex items-center gap-2 w-full text-right px-4 py-3 text-sm text-rose-400 hover:bg-white/10 transition">
                                    <TrashIcon className="w-4 h-4"/> حذف
                                </button>
                            </div>
                         </div>
                        <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 transition">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    
                    {/* Hero Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="glass-card p-5 rounded-2xl bg-gradient-to-br from-cyan-900/20 to-blue-900/20 border border-cyan-500/20 relative overflow-hidden">
                             <div className="absolute -right-6 -top-6 w-24 h-24 bg-cyan-500/20 rounded-full blur-2xl"></div>
                            <p className="text-slate-400 text-sm mb-1">الرصيد الحالي</p>
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
                            <p className="text-xs text-slate-400 mb-1">دخل + تحويلات واردة</p>
                            <p className="font-bold text-emerald-400 text-sm">{formatCurrency(stats.income + stats.transferIn)}</p>
                        </div>
                        <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 text-center">
                            <ArrowUpIcon className="w-5 h-5 text-rose-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 mb-1">صرف + تحويلات صادرة</p>
                            <p className="font-bold text-rose-400 text-sm">{formatCurrency(stats.expense + stats.transferOut)}</p>
                        </div>
                         <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 text-center">
                            <ArrowsRightLeftIcon className="w-5 h-5 text-indigo-400 mx-auto mb-2" />
                            <p className="text-xs text-slate-400 mb-1">عدد العمليات</p>
                            <p className="font-bold text-indigo-400 text-sm">{transactions.length}</p>
                        </div>
                    </div>

                    {/* Transactions List */}
                    <div>
                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <CalendarDaysIcon className="w-5 h-5 text-cyan-400" />
                            سجل المعاملات
                        </h3>
                        {loading ? (
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
                                        <div key={tx.id} className="flex items-center justify-between p-4 bg-slate-800/40 border border-white/5 rounded-2xl hover:bg-slate-800/80 transition">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isIncome ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                    {isTransfer ? <ArrowsRightLeftIcon className="w-5 h-5"/> : isIncome ? <ArrowDownIcon className="w-5 h-5"/> : <ArrowUpIcon className="w-5 h-5"/>}
                                                </div>
                                                <div>
                                                    <p className="text-white font-bold text-sm">
                                                        {tx.notes || (isTransfer ? (isIncome ? `تحويل من ${tx.accounts?.name}` : `تحويل إلى ${tx.to_accounts?.name}`) : tx.categories?.name || 'بدون عنوان')}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {new Date(tx.date).toLocaleDateString('ar-LY')}
                                                    </p>
                                                </div>
                                            </div>
                                            <span className={`font-bold ${isIncome ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Form & Main Page ---

const AccountForm: React.FC<{ account?: Account | null; onSave: () => void; onCancel: () => void; }> = ({ account, onSave, onCancel }) => {
    const [name, setName] = useState(account?.name || '');
    const [type, setType] = useState(account?.type || 'بنكي');
    const [balance, setBalance] = useState(account?.balance?.toString() || '0');
    const [currency, setCurrency] = useState(account?.currency || 'د.ل');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const accountData = { name, type, balance: parseFloat(balance), currency };
        const { error } = account?.id ? await supabase.from('accounts').update(accountData).eq('id', account.id) : await supabase.from('accounts').insert(accountData);
        if (!error) onSave();
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1">
                <label className="text-sm text-slate-400 font-medium">اسم الحساب</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: مصرف الجمهورية" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition" />
            </div>
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
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-3 px-6 text-slate-400 hover:text-white transition font-bold">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-3 px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition shadow-lg font-bold">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
            </div>
        </form>
    );
};

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

const AccountsPage: React.FC<{ key: number, handleDatabaseChange: (description?: string) => void }> = ({ key, handleDatabaseChange }) => {
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

    useEffect(() => { fetchAccounts(); }, [fetchAccounts, key]);

    const totalWealth = useMemo(() => accounts.reduce((sum, acc) => sum + acc.balance, 0), [accounts]);

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
                    const theme = CARD_THEMES[acc.type as keyof typeof CARD_THEMES] || CARD_THEMES['default'];
                    
                    return (
                        <div key={acc.id} className={`relative rounded-[24px] p-7 text-white shadow-2xl overflow-hidden transform transition-all duration-300 hover:-translate-y-2 hover:shadow-cyan-900/10 group border ${theme}`}>
                            
                            {/* Card Texture & Effects */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
                            <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-[50px]"></div>
                            
                            {/* Card Header: Chip & Actions */}
                            <div className="relative z-10 flex justify-between items-start mb-8">
                                <img src="https://cdn-icons-png.flaticon.com/512/6404/6404078.png" alt="Chip" className="w-10 h-10 opacity-80 invert" />
                                
                                <div className="relative">
                                    <button 
                                        onClick={() => setOpenMenuId(openMenuId === acc.id ? null : acc.id)} 
                                        className="p-2 rounded-full hover:bg-white/10 transition backdrop-blur-md"
                                    >
                                        <EllipsisVerticalIcon className="w-6 h-6 text-white" />
                                    </button>
                                    
                                    {openMenuId === acc.id && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)}></div>
                                            <div className="absolute left-0 mt-2 w-44 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden animate-fade-in origin-top-left">
                                                <button onClick={() => { setModal({ type: 'details', account: acc }); setOpenMenuId(null); }} className="flex items-center gap-3 w-full text-right px-4 py-3 text-sm text-cyan-400 font-bold hover:bg-white/10 border-b border-white/5 transition">
                                                    <InformationCircleIcon className="w-4 h-4"/> التفاصيل
                                                </button>
                                                <button onClick={() => { setModal({ type: 'edit', account: acc }); setOpenMenuId(null); }} className="flex items-center gap-3 w-full text-right px-4 py-3 text-sm text-slate-200 hover:bg-white/10 border-b border-white/5 transition">
                                                    <PencilSquareIcon className="w-4 h-4"/> تعديل
                                                </button>
                                                <button onClick={() => { setModal({ type: 'delete', account: acc }); setOpenMenuId(null); }} className="flex items-center gap-3 w-full text-right px-4 py-3 text-sm text-rose-400 hover:bg-white/10 transition">
                                                    <TrashIcon className="w-4 h-4"/> حذف
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            
                            {/* Card Body: Number & Info */}
                            <div className="relative z-10 space-y-6">
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
                                         <p className="text-sm font-bold truncate max-w-[100px]">{acc.name}</p>
                                    </div>
                                </div>
                            </div>

                             {/* Contactless Icon */}
                             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-0 opacity-10">
                                 <svg className="w-24 h-24" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><path d="M12 6c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6zm0 10c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4z"/></svg>
                             </div>
                        </div>
                    );
                })}
            </div>}
            
            <button 
                onClick={() => setModal({ type: 'add', account: null })} 
                className="fixed bottom-28 md:bottom-10 left-6 h-14 w-14 md:h-16 md:w-16 bg-slate-900 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-300 z-50 border border-cyan-500/30 overflow-visible hover:scale-105 active:scale-95 text-cyan-400 group"
            >
                <span className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping-slow"></span>
                <PlusIcon className="w-8 h-8 transition-transform duration-300 group-hover:rotate-90"/>
            </button>

            {/* Modals */}
            {(modal.type === 'add' || modal.type === 'edit') && (
                <Modal title={modal.type === 'add' ? 'إضافة حساب' : 'تعديل حساب'} onClose={() => setModal({ type: null, account: null })}>
                    <AccountForm account={modal.account} onSave={() => { setModal({ type: null, account: null }); handleDatabaseChange(modal.type === 'add' ? 'إضافة حساب' : 'تعديل حساب'); }} onCancel={() => setModal({ type: null, account: null })} />
                </Modal>
            )}
            
             {modal.type === 'delete' && modal.account && (
                 <Modal title="تأكيد الحذف" onClose={() => setModal({ type: null, account: null })}>
                    <p className="text-slate-300 mb-8 text-lg">هل أنت متأكد من حذف حساب <span className="text-white font-bold">"{modal.account.name}"</span>؟</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setModal({ type: null, account: null })} className="py-3 px-6 text-slate-400 font-bold hover:text-white transition">إلغاء</button>
                        <button onClick={async () => { await supabase.from('accounts').delete().eq('id', modal.account!.id); setModal({type: null, account: null}); handleDatabaseChange('حذف حساب'); }} className="py-3 px-8 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition shadow-lg shadow-rose-900/20 font-bold">حذف</button>
                    </div>
                </Modal>
            )}

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
