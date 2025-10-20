import React, { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Transaction } from '../types';
import { 
    PencilSquareIcon, 
    TrashIcon, 
    EllipsisVerticalIcon, 
    WealthIcon, 
    CreditCardIcon, 
    InformationCircleIcon, 
    XMarkIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ArrowsRightLeftIcon
} from './icons';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'LYD',
    };
    if (amount % 1 === 0) {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    } else {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', currency);
};

const AccountIcon: React.FC<{ type: string, className?: string }> = ({ type, className = "w-8 h-8" }) => {
    switch (type) {
        case 'نقدي': return <WealthIcon className={className} />;
        case 'بنكي': return <CreditCardIcon className={className} />;
        default: return <CreditCardIcon className={className} />;
    }
}

const TransactionIcon: React.FC<{ type: Transaction['type'] }> = ({ type }) => {
    switch (type) {
        case 'income': return <ArrowDownIcon className="w-6 h-6" />;
        case 'expense': return <ArrowUpIcon className="w-6 h-6" />;
        case 'transfer': return <ArrowsRightLeftIcon className="w-6 h-6" />;
        default: return null;
    }
};

const AccountForm: React.FC<{
    account?: Account | null;
    onSave: () => void;
    onCancel: () => void;
}> = ({ account, onSave, onCancel }) => {
    const [name, setName] = useState(account?.name || '');
    const [type, setType] = useState(account?.type || 'بنكي');
    const [balance, setBalance] = useState(account?.balance?.toString() || '0');
    const [currency, setCurrency] = useState(account?.currency || 'د.ل');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const accountData = { name, type, balance: parseFloat(balance), currency };

        const { error } = account?.id
            ? await supabase.from('accounts').update(accountData).eq('id', account.id)
            : await supabase.from('accounts').insert(accountData);

        if (error) {
            console.error('Error saving account:', error.message);
            alert('حدث خطأ');
        } else {
            onSave();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم الحساب" required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                <option value="بنكي">بنكي</option>
                <option value="نقدي">نقدي</option>
                <option value="مخصص">مخصص</option>
            </select>
            <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="الرصيد" required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
            </div>
        </form>
    );
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


const AccountsPage: React.FC<{ key: number, handleDatabaseChange: (description?: string) => void }> = ({ key, handleDatabaseChange }) => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ type: 'edit' | 'delete' | 'details' | null, account: Account | null }>({ type: null, account: null });
    const [detailsTransactions, setDetailsTransactions] = useState<Transaction[]>([]);
    const [detailsSummary, setDetailsSummary] = useState({ income: 0, expense: 0 });
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchAccounts = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('accounts').select('*').order('name');
        if (error) console.error('Error fetching accounts:', error.message);
        else setAccounts(data as Account[]);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts, key]);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSave = () => {
        const description = modal.account ? `تم تعديل حساب "${modal.account.name}"` : 'تم إضافة حساب جديد';
        setModal({ type: null, account: null });
        handleDatabaseChange(description);
    };

    const handleDelete = async () => {
        if (!modal.account) return;
        const description = `تم حذف حساب "${modal.account.name}"`;
        const { error } = await supabase.from('accounts').delete().eq('id', modal.account.id);
        if (error) {
            console.error('Error deleting account', error.message);
            alert('لا يمكن حذف الحساب لارتباطه بمعاملات.');
        } else {
            setModal({ type: null, account: null });
            handleDatabaseChange(description);
        }
    };
    
    const openDetailsModal = async (account: Account) => {
        setModal({ type: 'details', account });
        setDetailsLoading(true);
        setDetailsTransactions([]);
        setDetailsSummary({ income: 0, expense: 0 });

        const txPromise = supabase
            .from('transactions')
            .select('*, categories(name)')
            .or(`account_id.eq.${account.id},to_account_id.eq.${account.id}`)
            .order('date', { ascending: false })
            .limit(20);

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
        
        const summaryPromise = supabase
            .from('transactions')
            .select('amount, type')
            .eq('account_id', account.id)
            .in('type', ['income', 'expense'])
            .gte('date', monthStart)
            .lte('date', monthEnd);

        const [{ data: txData, error: txError }, { data: summaryData, error: summaryError }] = await Promise.all([txPromise, summaryPromise]);

        if(txError) console.error("Error fetching details transactions", txError.message);
        else setDetailsTransactions((txData as any) || []);

        if(summaryError) console.error("Error fetching details summary", summaryError.message);
        else {
            const income = summaryData?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
            const expense = summaryData?.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0) || 0;
            setDetailsSummary({ income, expense });
        }

        setDetailsLoading(false);
    }
    
    const getAccountTypeColor = (type: string) => {
        switch (type) {
            case 'نقدي': return 'bg-amber-500';
            case 'بنكي': return 'bg-sky-500';
            case 'مخصص': return 'bg-violet-500';
            default: return 'bg-slate-600';
        }
    };

    return (
        <div className="relative">
             {accounts.length === 0 && !loading ? (
                 <div className="text-center py-10"><p className="text-slate-400 mb-4">لم تقم بإضافة أي حساب بعد.</p><p className="text-sm text-slate-500">يمكنك إضافة حساب جديد من زر الإجراءات في الصفحة الرئيسية.</p></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {accounts.map(account => (
                        <div key={account.id} className="bg-slate-800 rounded-xl shadow-lg flex flex-col justify-between overflow-hidden relative border border-slate-700/50 group hover:border-cyan-500/50 transition-colors duration-300">
                            <div className={`absolute top-0 left-0 right-0 h-1 ${getAccountTypeColor(account.type)}`}></div>
                            <div className="p-4 flex flex-col justify-between h-full">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-slate-700 p-3 rounded-full">
                                            <AccountIcon type={account.type} className="w-6 h-6 text-cyan-400"/>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-xl text-white">{account.name}</h3>
                                            <p className="text-sm font-medium text-slate-400">{account.type}</p>
                                        </div>
                                    </div>
                                    <div className="relative" ref={openMenuId === account.id ? menuRef : null}>
                                        <button onClick={() => setOpenMenuId(openMenuId === account.id ? null : account.id)} className="text-slate-500 hover:text-white p-1 rounded-full group-hover:text-slate-300 transition-colors">
                                            <EllipsisVerticalIcon className="w-6 h-6"/>
                                        </button>
                                        {openMenuId === account.id && (
                                            <div className="absolute left-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-10 animate-fade-in-fast">
                                               <button onClick={() => { openDetailsModal(account); setOpenMenuId(null); }} className="flex items-center gap-2 w-full text-right px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"><InformationCircleIcon className="w-4 h-4"/> تفاصيل</button>
                                               <button onClick={() => { setModal({ type: 'edit', account }); setOpenMenuId(null); }} className="flex items-center gap-2 w-full text-right px-4 py-2 text-sm text-slate-300 hover:bg-slate-700"><PencilSquareIcon className="w-4 h-4"/> تعديل</button>
                                               <button onClick={() => { setModal({ type: 'delete', account }); setOpenMenuId(null); }} className="flex items-center gap-2 w-full text-right px-4 py-2 text-sm text-red-400 hover:bg-slate-700"><TrashIcon className="w-4 h-4"/> حذف</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-6 text-left">
                                    <p className="text-sm text-slate-500">الرصيد الحالي</p>
                                    <p className="text-3xl font-extrabold text-cyan-300 tracking-tight">{formatCurrency(account.balance, account.currency)}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modals */}
            {modal.type === 'edit' && <Modal title="تعديل الحساب" onClose={() => setModal({ type: null, account: null })}><AccountForm account={modal.account} onSave={handleSave} onCancel={() => setModal({ type: null, account: null })} /></Modal>}
            {modal.type === 'delete' && modal.account && (
                <Modal title="تأكيد الحذف" onClose={() => setModal({ type: null, account: null })}>
                    <p className="text-slate-300 mb-6">هل أنت متأكد من حذف حساب "{modal.account.name}"؟</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setModal({ type: null, account: null })} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
                    </div>
                </Modal>
            )}
            {modal.type === 'details' && modal.account && (
                <Modal title="" onClose={() => setModal({ type: null, account: null })}>
                    <div className="flex flex-col -mt-4">
                        <div className="flex flex-col items-center border-b border-slate-700 pb-4 mb-4">
                            <div className="bg-slate-700 p-3 rounded-full mb-2">
                                <AccountIcon type={modal.account.type} className="w-8 h-8 text-cyan-400"/>
                            </div>
                            <h3 className="text-xl font-bold">{modal.account.name}</h3>
                            <p className="text-sm text-slate-400">{modal.account.type}</p>
                            <p className="text-3xl font-extrabold text-cyan-300 mt-2">{formatCurrency(modal.account.balance, modal.account.currency)}</p>
                            <p className="text-sm text-slate-500">الرصيد الحالي</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                            <div>
                                <p className="text-sm text-slate-400">الدخل هذا الشهر</p>
                                <p className="text-lg font-bold text-green-400">{formatCurrency(detailsSummary.income, modal.account.currency)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-slate-400">المصروف هذا الشهر</p>
                                <p className="text-lg font-bold text-red-400">{formatCurrency(detailsSummary.expense, modal.account.currency)}</p>
                            </div>
                        </div>

                        <h4 className="font-bold mb-2">آخر المعاملات</h4>
                        {detailsLoading ? (
                            <div className="space-y-2">
                                {[...Array(3)].map((_, i) => (
                                    <div key={i} className="flex items-center justify-between bg-slate-700/50 p-3 rounded-lg animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-600"></div>
                                            <div>
                                                <div className="h-4 w-24 bg-slate-600 rounded"></div>
                                                <div className="h-3 w-16 bg-slate-600 rounded mt-1"></div>
                                            </div>
                                        </div>
                                        <div className="h-5 w-20 bg-slate-600 rounded"></div>
                                    </div>
                                ))}
                            </div>
                        ) : detailsTransactions.length > 0 ? (
                            <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                                {detailsTransactions.map(tx => {
                                    const isIncome = tx.type === 'income' || (tx.type === 'transfer' && tx.to_account_id === modal.account?.id);
                                    const isExpense = tx.type === 'expense' || (tx.type === 'transfer' && tx.account_id === modal.account?.id);

                                    return (
                                        <div key={tx.id} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${
                                                    isIncome ? 'bg-green-500/20 text-green-400' : 
                                                    isExpense ? 'bg-red-500/20 text-red-400' : 
                                                    'bg-indigo-500/20 text-indigo-400'
                                                }`}>
                                                    <TransactionIcon type={tx.type} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{tx.notes || (tx as any).categories?.name || (tx.type === 'transfer' ? 'تحويل' : 'معاملة')}</p>
                                                    <p className="text-sm text-slate-400">{new Date(tx.date).toLocaleDateString('ar-LY', {day: '2-digit', month: 'short'})}</p>
                                                </div>
                                            </div>
                                            <p className={`font-bold text-lg whitespace-nowrap ${
                                                isIncome ? 'text-green-400' :
                                                isExpense ? 'text-red-400' : 'text-slate-300'
                                            }`}>
                                                {isIncome ? '+' : isExpense ? '-' : ''}{formatCurrency(tx.amount, modal.account.currency)}
                                            </p>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-slate-400 text-center py-4">لا توجد معاملات لهذا الحساب.</p>
                        )}
                    </div>
                </Modal>
            )}
            {loading && accounts.length === 0 && <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <div key={i} className="h-36 bg-slate-800 rounded-xl animate-pulse"></div>)}</div>}
        </div>
    );
};

export default AccountsPage;