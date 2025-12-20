
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Category, Contact, Debt, Investment } from '../types';
import { useToast } from './Toast';
import { useQueryClient } from '@tanstack/react-query';
import { 
    PlusIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, HandRaisedIcon, UserPlusIcon, ArrowLeftIcon, AccountsIcon, ScaleIcon, ArrowsRightLeftIcon, CurrencyDollarIcon,
    WalletIcon, BanknoteIcon, LandmarkIcon, BriefcaseIcon, CalendarDaysIcon, TagIcon, PencilSquareIcon, iconMap, CheckCircleIcon, SparklesIcon
} from './icons';
import { logActivity } from '../lib/logger';

type ModalType = 'expense' | 'income' | 'transfer' | 'add-debt' | 'settle-debt' | 'add-account' | 'add-investment';

const getAccountTypeIcon = (type: string) => {
    switch (type) {
        case 'بنكي': return LandmarkIcon;
        case 'نقدي': return BanknoteIcon;
        case 'مخصص': return BriefcaseIcon;
        default: return WalletIcon;
    }
};

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل');
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; showBackButton?: boolean; onBack?: () => void; headerColor?: string }> = 
({ children, title, onClose, showBackButton, onBack, headerColor }) => (
    <div className="fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
        <div className="relative w-full max-w-lg bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
            {/* Header Glow */}
            <div className={`absolute top-0 left-0 right-0 h-32 opacity-20 pointer-events-none bg-gradient-to-b ${headerColor || 'from-cyan-500'} to-transparent`}></div>
            
            <div className="p-6 pb-2 shrink-0 z-10 flex justify-between items-center">
                 {showBackButton ? (
                    <button onClick={onBack} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"><ArrowLeftIcon className="w-5 h-5" /></button>
                ) : <div className="w-11"></div>}
                <h3 className="text-xl font-bold text-white tracking-wide drop-shadow-md">{title}</h3>
                <button onClick={onClose} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar relative z-10">
                {children}
            </div>
        </div>
    </div>
);

const AddInvestmentModal: React.FC<{ onSuccess: () => void; onCancel: () => void; }> = ({ onSuccess, onCancel }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('ذهب');
    const [amount, setAmount] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const { error } = await supabase.from('investments').insert({ 
            name, type, amount: Number(amount), current_value: Number(amount) 
        });
        if (error) toast.error('حدث خطأ');
        else onSuccess();
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" placeholder="اسم الاستثمار" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none" />
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none">
                <option value="ذهب">ذهب</option>
                <option value="أسهم">أسهم</option>
                <option value="عملات">عملات</option>
                <option value="مدخرات">مدخرات</option>
            </select>
            <input type="number" placeholder="المبلغ المستثمر" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none" />
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-cyan-600 text-white rounded-xl font-bold">حفظ الاستثمار</button>
        </form>
    );
};

const AddAccountModal: React.FC<{ onSuccess: () => void; onCancel: () => void; }> = ({ onSuccess, onCancel }) => {
    const toast = useToast();
    const [name, setName] = useState('');
    const [type, setType] = useState('بنكي');
    const [balance, setBalance] = useState('');
    const [currency, setCurrency] = useState('د.ل');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const accountData = { name, type, balance: parseFloat(balance) || 0, currency };
        const { error } = await supabase.from('accounts').insert(accountData);
        if (error) { 
            console.error('Error saving account:', error.message); 
            toast.error('حدث خطأ أثناء إنشاء الحساب'); 
        } else { 
            logActivity(`إضافة حساب جديد: ${name} (رصيد افتتاحي: ${formatCurrency(parseFloat(balance) || 0)})`);
            onSuccess(); 
        }
        setIsSaving(false);
    };
    const types = [{ id: 'بنكي', icon: LandmarkIcon, label: 'بنكي' }, { id: 'نقدي', icon: BanknoteIcon, label: 'نقدي' }, { id: 'مخصص', icon: BriefcaseIcon, label: 'مخصص' }];
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center space-y-2">
                <label className="text-slate-400 text-sm font-medium">الرصيد الافتتاحي</label>
                <div className="relative inline-block w-full">
                    <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="0.00" required className="w-full bg-transparent text-center text-5xl font-bold text-white placeholder-slate-700 focus:outline-none py-2" autoFocus />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-500 font-bold text-lg pointer-events-none">د.ل</span>
                </div>
            </div>
            <div className="space-y-4 bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                <div>
                    <label className="text-xs text-slate-400 font-bold mb-2 block px-1">نوع الحساب</label>
                    <div className="grid grid-cols-3 gap-3">
                        {types.map((t) => (
                            <button key={t.id} type="button" onClick={() => setType(t.id)} className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${type === t.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'}`}>
                                <t.icon className="w-6 h-6 mb-1"/><span className="text-xs font-bold">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-xs text-slate-400 font-bold mb-2 block px-1">اسم الحساب</label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: المحفظة الشخصية" required className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition" />
                </div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl transition shadow-lg shadow-cyan-900/20 font-bold text-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'إنشاء الحساب'}
            </button>
        </form>
    );
};

const TransactionModal: React.FC<{ type: 'income' | 'expense'; accounts: Account[]; categories: Category[]; onSuccess: () => void; onCancel: () => void; }> = ({ type, accounts, categories, onSuccess, onCancel }) => {
    const toast = useToast();
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || !amount) { setError('المبلغ والحساب حقول مطلوبة.'); return; }
        setIsSaving(true); setError('');
        const numericAmount = Number(amount);
        const amountWithSign = type === 'income' ? numericAmount : -numericAmount;
        try {
            const { data: account, error: accError } = await supabase.from('accounts').select('balance, name').eq('id', accountId).single();
            if (accError || !account) throw accError || new Error("Account not found");
            
            const { error: updateError } = await supabase.from('accounts').update({ balance: account.balance + amountWithSign }).eq('id', accountId);
            if (updateError) throw updateError;
            
            const finalDate = new Date(`${date}T00:00:00`);
            const now = new Date(); finalDate.setHours(now.getHours()); finalDate.setMinutes(now.getMinutes()); finalDate.setSeconds(now.getSeconds());
            
            const { error: insertError } = await supabase.from('transactions').insert({ amount: numericAmount, type, account_id: accountId, category_id: categoryId || null, date: finalDate.toISOString(), notes });
            if (insertError) throw insertError;

            // Log Activity
            const categoryName = categories.find(c => c.id === categoryId)?.name || 'غير مصنف';
            const logMsg = type === 'income' 
                ? `تسجيل إيراد: ${formatCurrency(numericAmount)} (${categoryName}) في ${account.name}`
                : `تسجيل مصروف: ${formatCurrency(numericAmount)} (${categoryName}) من ${account.name}`;
            logActivity(logMsg);

            onSuccess();
        } catch (err: any) { console.error('Error saving transaction:', err.message); toast.error('حدث خطأ أثناء حفظ المعاملة.'); } finally { setIsSaving(false); }
    };
    const filteredCategories = categories.filter(c => c.type === type);
    const isExpense = type === 'expense';
    const activeColor = isExpense ? 'rose' : 'emerald';
    const activeColorHex = isExpense ? '#f43f5e' : '#10b981';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             {error && <p className="text-rose-400 text-sm font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center">{error}</p>}
            <div className="text-center space-y-2 relative py-4">
                {/* Glow Effect */}
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-[60px] opacity-40 rounded-full ${isExpense ? 'bg-rose-600' : 'bg-emerald-600'}`}></div>
                
                <label className="text-slate-400 text-sm font-medium relative z-10">المبلغ</label>
                <div className="relative inline-block w-full z-10">
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required className={`w-full bg-transparent text-center text-7xl font-black placeholder-slate-800 focus:outline-none py-2 tracking-tighter ${isExpense ? 'text-rose-400 drop-shadow-[0_2px_10px_rgba(244,63,94,0.3)]' : 'text-emerald-400 drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]'}`} autoFocus />
                </div>
            </div>
            
            <div className="space-y-5 bg-slate-800/20 p-1 rounded-3xl">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 px-2 flex items-center gap-2"><WalletIcon className="w-3 h-3"/> الحساب</label>
                    <div className="flex overflow-x-auto gap-3 pb-2 px-1 custom-scrollbar snap-x">
                        {accounts.map(acc => {
                            const isSelected = accountId === acc.id; const TypeIcon = getAccountTypeIcon(acc.type);
                            return (
                                <button key={acc.id} type="button" onClick={() => setAccountId(acc.id)} className={`snap-start flex-shrink-0 flex items-center gap-3 p-3 pr-4 rounded-2xl border transition-all duration-300 min-w-[150px] ${isSelected ? `bg-${activeColor}-500/10 border-${activeColor}-500/50 shadow-lg shadow-${activeColor}-500/10` : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'}`}>
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isSelected ? `bg-${activeColor}-500 text-white shadow-md` : 'bg-slate-700/50 text-slate-500'}`}><TypeIcon className="w-5 h-5" /></div>
                                    <div className="text-right"><span className={`block text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{acc.name}</span><span className={`block text-[10px] font-mono ${isSelected ? `text-${activeColor}-400` : 'text-slate-500'}`}>{acc.balance}</span></div>
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 px-2 flex items-center gap-2"><TagIcon className="w-3 h-3"/> الفئة</label>
                    <div className="flex overflow-x-auto gap-2 pb-2 px-1 custom-scrollbar snap-x">
                        <button type="button" onClick={() => setCategoryId('')} className={`snap-start flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${!categoryId ? `bg-${activeColor}-500/20 border-${activeColor}-500 text-${activeColor}-400` : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800'}`}>
                            <span className="text-xs font-bold whitespace-nowrap">غير مصنف</span>
                        </button>
                        {filteredCategories.map(cat => {
                            const isSelected = categoryId === cat.id; const CatIcon = (cat.icon && iconMap[cat.icon]) ? iconMap[cat.icon] : TagIcon; const catColor = cat.color || activeColorHex;
                            return (
                                <button key={cat.id} type="button" onClick={() => setCategoryId(cat.id)} className={`snap-start flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isSelected ? 'bg-slate-800 border-white/20 shadow-inner ring-1 ring-white/10' : 'bg-slate-800/30 border-transparent text-slate-400 hover:bg-slate-800'}`} style={isSelected ? { borderColor: catColor } : {}}>
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: catColor, color: '#fff' }}><CatIcon className="w-4 h-4" /></div><span className={`text-xs font-bold whitespace-nowrap ${isSelected ? 'text-white' : ''}`}>{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 px-1">التاريخ</label><div className="relative"><input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3.5 pl-10 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-sans font-bold" /><CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/></div></div>
                    <div className="space-y-1"><label className="text-xs font-bold text-slate-500 px-1">ملاحظات</label><div className="relative"><input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري..." className="w-full bg-slate-950/50 border border-slate-700 rounded-xl p-3.5 pl-10 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none" /><PencilSquareIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/></div></div>
                </div>
            </div>
            <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-2xl transition-all hover:scale-[1.02] active:scale-95 shadow-xl font-bold text-lg disabled:opacity-70 flex items-center justify-center gap-2 ${isExpense ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-900/30' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30'} text-white`}>
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'حفظ العملية'}
            </button>
        </form>
    );
};

const TransferModal: React.FC<{ accounts: Account[]; onSuccess: () => void; onCancel: () => void; }> = ({ accounts, onSuccess, onCancel }) => {
    const toast = useToast();
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');
    const fromAccountBalance = useMemo(() => { return accounts.find(a => a.id === fromAccountId)?.balance ?? 0; }, [fromAccountId, accounts]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = Number(amount);
        if (!fromAccountId || !toAccountId || !numericAmount || numericAmount <= 0) { setError('يرجى ملء جميع الحقول بمبلغ صحيح.'); return; }
        if (fromAccountId === toAccountId) { setError('لا يمكن التحويل إلى نفس الحساب.'); return; }
        if (numericAmount > fromAccountBalance) { setError('المبلغ أكبر من الرصيد المتاح.'); return; }
        setIsSaving(true); setError('');
        try {
            const fromAccount = accounts.find(a => a.id === fromAccountId); const toAccount = accounts.find(a => a.id === toAccountId);
            if (!fromAccount || !toAccount) throw new Error("Account not found");
            await supabase.from('accounts').update({ balance: fromAccount.balance - numericAmount }).eq('id', fromAccountId);
            await supabase.from('accounts').update({ balance: toAccount.balance + numericAmount }).eq('id', toAccountId);
            await supabase.from('transactions').insert({ amount: numericAmount, type: 'transfer', account_id: fromAccountId, to_account_id: toAccountId, notes: notes || `تحويل من ${fromAccount.name} إلى ${toAccount.name}`, date: new Date().toISOString() });
            
            // Log Activity
            logActivity(`تحويل مالي: ${formatCurrency(numericAmount)} من ${fromAccount.name} إلى ${toAccount.name}`);
            
            onSuccess();
        } catch (err: any) { console.error('Error during transfer:', err.message); toast.error('حدث خطأ أثناء عملية التحويل.'); } finally { setIsSaving(false); }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             {error && <p className="text-rose-400 text-sm font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center">{error}</p>}
             <div className="text-center relative py-4">
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-[60px] opacity-30 rounded-full bg-indigo-600"></div>
                 <label className="text-slate-400 text-sm font-medium relative z-10">مبلغ التحويل</label>
                 <div className="relative inline-block w-full z-10">
                     <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required className="w-full bg-transparent text-center text-6xl font-black text-indigo-400 placeholder-slate-800 focus:outline-none py-2 tracking-tighter drop-shadow-[0_2px_10px_rgba(99,102,241,0.3)]" autoFocus />
                 </div>
             </div>
            <div className="bg-slate-800/30 p-4 rounded-3xl border border-white/5 relative flex flex-col gap-1">
                {/* Connector Line */}
                <div className="absolute left-8 top-12 bottom-12 w-0.5 border-l-2 border-dashed border-slate-700 z-0"></div>
                
                <div className="relative z-10">
                    <label className="text-xs font-bold text-slate-500 mb-1 block px-2">من حساب</label>
                    <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:border-indigo-500 focus:outline-none font-bold appearance-none"><option value="" disabled>اختر المصدر</option>{accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance})</option>)}</select>
                </div>
                
                <div className="flex justify-center -my-3 relative z-20 pointer-events-none">
                    <div className="bg-slate-900 rounded-full p-1.5 border border-white/10 shadow-xl">
                        <ArrowDownIcon className="w-4 h-4 text-indigo-400" />
                    </div>
                </div>

                <div className="relative z-10">
                    <label className="text-xs font-bold text-slate-500 mb-1 block px-2">إلى حساب</label>
                    <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:border-indigo-500 focus:outline-none font-bold appearance-none"><option value="" disabled>اختر الوجهة</option>{accounts.filter(a => a.id !== fromAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select>
                </div>
            </div>
            <div className="relative"><input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات التحويل (اختياري)" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 pl-10 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none" /><PencilSquareIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/></div>
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl transition shadow-lg shadow-indigo-900/20 font-bold text-white text-lg disabled:opacity-70 flex items-center justify-center gap-2">{isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'تأكيد التحويل'}</button>
        </form>
    );
}

const AddDebtWizard: React.FC<{ contacts: Contact[]; accounts: Account[]; categories: Category[]; onSuccess: () => void; onCancel: () => void; step: number; setStep: (step: number) => void; }> = ({ contacts, accounts, categories, onSuccess, onCancel, step, setStep }) => {
    const toast = useToast();
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [debtType, setDebtType] = useState<'on_you' | 'for_you'>('on_you');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [linkedAccountId, setLinkedAccountId] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewContact, setShowNewContact] = useState(false);
    const [newContactName, setNewContactName] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelectContact = (contact: Contact) => { setSelectedContact(contact); setStep(2); };
    
    const handleAddNewContact = async () => { 
        if (!newContactName.trim()) return; 
        const { data, error } = await supabase.from('contacts').insert({ name: newContactName }).select().single(); 
        if (error || !data) { toast.error('فشل إضافة جهة الاتصال'); } 
        else { toast.success('تمت إضافة جهة الاتصال'); handleSelectContact(data as Contact); } 
    };

    const handleSaveDebt = async () => { 
        if (!amount || !selectedContact) return;
        setIsSaving(true);
        try {
            const debtData = {
                type: debtType,
                amount: Number(amount),
                contact_id: selectedContact.id,
                due_date: dueDate || null,
                description,
                account_id: linkedAccountId || null
            };
            
            const { error } = await supabase.from('debts').insert(debtData);
            if (error) throw error;
            
            if (linkedAccountId) {
                const account = accounts.find(a => a.id === linkedAccountId);
                if (account) {
                    const balanceChange = debtType === 'on_you' ? Number(amount) : -Number(amount);
                    await supabase.from('accounts').update({ balance: account.balance + balanceChange }).eq('id', linkedAccountId);
                }
            }

            // Log Activity
            const typeText = debtType === 'on_you' ? 'دين عليك' : 'دين لك';
            logActivity(`تسجيل ${typeText}: ${formatCurrency(Number(amount))} مع ${selectedContact.name}`);

            onSuccess();
        } catch (error: any) {
            console.error("Error saving debt:", error);
            toast.error("فشل حفظ الدين");
        } finally {
            setIsSaving(false);
        }
    };
    
    if (step === 1) {
        return (
            <div className="space-y-4">
                <input type="text" placeholder="ابحث عن اسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 focus:outline-none" autoFocus />
                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {filteredContacts.map(c => (
                        <button key={c.id} onClick={() => handleSelectContact(c)} className="w-full text-right p-4 bg-slate-800/50 hover:bg-slate-800 rounded-2xl border border-white/5 hover:border-cyan-500/50 transition-all flex items-center justify-between group">
                            <span className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">{c.name}</span>
                            <ArrowLeftIcon className="w-4 h-4 text-slate-500 group-hover:-translate-x-1 transition-transform" />
                        </button>
                    ))}
                </div>
                <div className="pt-2 border-t border-white/5">
                    {showNewContact ? (
                        <div className="flex gap-2">
                            <input type="text" value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="اسم جهة الاتصال" className="flex-1 bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none" autoFocus />
                            <button onClick={handleAddNewContact} className="px-4 bg-cyan-600 rounded-xl text-white font-bold">حفظ</button>
                        </div>
                    ) : (
                        <button onClick={() => setShowNewContact(true)} className="w-full py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-white transition flex items-center justify-center gap-2">
                            <PlusIcon className="w-5 h-5"/> إضافة جهة اتصال جديدة
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-5">
            <h4 className="text-center text-slate-400 text-sm">تسجيل دين لـ <span className="text-white font-bold">{selectedContact?.name}</span></h4>
            <div className="flex gap-3">
                <button onClick={() => setDebtType('on_you')} className={`flex-1 py-3 rounded-xl font-bold transition ${debtType === 'on_you' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-800 text-slate-400'}`}>عليك (سداد)</button>
                <button onClick={() => setDebtType('for_you')} className={`flex-1 py-3 rounded-xl font-bold transition ${debtType === 'for_you' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-800 text-slate-400'}`}>لك (تحصيل)</button>
            </div>
            <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">المبلغ</label>
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-xl font-bold text-white focus:border-cyan-500 focus:outline-none" placeholder="0.00" autoFocus />
            </div>
            <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">تاريخ الاستحقاق</label>
                <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none" />
            </div>
            <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">خصم/إيداع في حساب (اختياري)</label>
                <div className="relative">
                    <select 
                        value={linkedAccountId} 
                        onChange={e => setLinkedAccountId(e.target.value)} 
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 pl-10 text-white focus:border-cyan-500 focus:outline-none appearance-none"
                    >
                        <option value="">لا يوجد ارتباط بحساب</option>
                        {accounts.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name} ({formatCurrency(acc.balance)})
                            </option>
                        ))}
                    </select>
                    <WalletIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 mr-1">
                    {linkedAccountId ? (debtType === 'for_you' ? 'سيتم خصم المبلغ من هذا الحساب' : 'سيتم إيداع المبلغ في هذا الحساب') : ''}
                </p>
            </div>
            <div>
                <label className="text-xs text-slate-400 font-bold mb-1 block">الوصف</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="سبب الدين..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none" />
            </div>
            <button onClick={handleSaveDebt} disabled={isSaving || !amount} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-2xl transition font-bold text-white text-lg disabled:opacity-50 shadow-lg shadow-cyan-900/20">
                {isSaving ? 'جاري الحفظ...' : 'حفظ الدين'}
            </button>
        </div>
    );
};

const SettleDebtWizard: React.FC<{
    unpaidDebts: Debt[];
    contacts: Contact[];
    accounts: Account[];
    categories: Category[];
    onSuccess: () => void;
    step: number;
    setStep: (step: number) => void;
}> = ({ unpaidDebts, contacts, accounts, categories, onSuccess, step, setStep }) => {
    const toast = useToast();
    const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
    const [settlementAmount, setSettlementAmount] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [settlementType, setSettlementType] = useState<'pay' | 'receive' | null>(null); // pay = paying "on_you", receive = receiving "for_you"
    const [isProcessing, setIsProcessing] = useState(false);

    // 1. Aggregate debts by contact
    const contactAggregates = useMemo(() => {
        const map = new Map<string, { contact: Contact, onYou: number, forYou: number, onYouDebts: Debt[], forYouDebts: Debt[] }>();
        
        unpaidDebts.forEach(debt => {
            const cId = debt.contact_id;
            if (!cId) return;
            
            if (!map.has(cId)) {
                const contact = contacts.find(c => c.id === cId);
                if (contact) {
                    map.set(cId, { contact, onYou: 0, forYou: 0, onYouDebts: [], forYouDebts: [] });
                }
            }
            
            const entry = map.get(cId);
            if (entry) {
                if (debt.type === 'on_you') {
                    entry.onYou += debt.amount;
                    entry.onYouDebts.push(debt);
                } else {
                    entry.forYou += debt.amount;
                    entry.forYouDebts.push(debt);
                }
            }
        });
        return Array.from(map.values()).sort((a,b) => a.contact.name.localeCompare(b.contact.name));
    }, [unpaidDebts, contacts]);

    const selectedAggregate = useMemo(() => {
        return contactAggregates.find(a => a.contact.id === selectedContactId);
    }, [contactAggregates, selectedContactId]);

    useEffect(() => {
        // Auto-select type based on larger amount when contact is selected
        if (selectedAggregate && !settlementType) {
            if (selectedAggregate.onYou >= selectedAggregate.forYou) {
                setSettlementType('pay');
                setSettlementAmount(selectedAggregate.onYou.toString());
            } else {
                setSettlementType('receive');
                setSettlementAmount(selectedAggregate.forYou.toString());
            }
        }
    }, [selectedAggregate, settlementType]);

    // List of debts displayed in Step 2
    const displayDebts = useMemo(() => {
        if (!selectedAggregate || !settlementType) return [];
        const debts = settlementType === 'pay' ? selectedAggregate.onYouDebts : selectedAggregate.forYouDebts;
        // Sort by date (oldest first or newest first, let's do newest first for display, but settlement logic is usually FIFO)
        return [...debts].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [selectedAggregate, settlementType]);

    const handleSettle = async () => {
        if (!selectedAggregate || !selectedAccountId || !settlementType || !settlementAmount) return;
        const amountToSettle = Number(settlementAmount);
        if (amountToSettle <= 0) return;

        setIsProcessing(true);
        try {
            // 1. Identify debts to settle (FIFO)
            const targetDebts = settlementType === 'pay' ? selectedAggregate.onYouDebts : selectedAggregate.forYouDebts;
            // Sort by date created (FIFO)
            targetDebts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

            let remainingAmount = amountToSettle;
            const debtsToUpdate: { id: string, amount: number, paid: boolean, paid_at?: string }[] = [];

            for (const debt of targetDebts) {
                if (remainingAmount <= 0) break;
                
                if (remainingAmount >= debt.amount) {
                    // Full payment of this debt
                    debtsToUpdate.push({ id: debt.id, amount: 0, paid: true, paid_at: new Date().toISOString() }); 
                    remainingAmount -= debt.amount;
                } else {
                    // Partial payment of this debt
                    debtsToUpdate.push({ id: debt.id, amount: debt.amount - remainingAmount, paid: false });
                    remainingAmount = 0;
                }
            }

            // 2. Perform DB Updates for Debts
            for (const update of debtsToUpdate) {
                if (update.paid) {
                     await supabase.from('debts').update({ paid: true, paid_at: update.paid_at }).eq('id', update.id);
                } else {
                     await supabase.from('debts').update({ amount: update.amount }).eq('id', update.id);
                }
            }

            // 3. Handle Account & Transaction
            const account = accounts.find(a => a.id === selectedAccountId);
            if (!account) throw new Error("Account not found");

            const isPay = settlementType === 'pay'; // Expense
            const newBalance = isPay ? account.balance - amountToSettle : account.balance + amountToSettle;
            
            await supabase.from('accounts').update({ balance: newBalance }).eq('id', selectedAccountId);

            // 4. Create Transaction Record
            const categoryName = isPay ? 'سداد ديون' : 'تحصيل ديون';
            let category = categories.find(c => c.name === categoryName && c.type === (isPay ? 'expense' : 'income'));
            
            if (!category) {
                 const { data: newCat } = await supabase.from('categories').insert({ 
                     name: categoryName, 
                     type: isPay ? 'expense' : 'income', 
                     icon: isPay ? 'ScaleIcon' : 'CurrencyDollarIcon', 
                     color: isPay ? '#78716c' : '#34d399'
                 }).select().single();
                 category = newCat;
            }

            await supabase.from('transactions').insert({
                amount: amountToSettle,
                type: isPay ? 'expense' : 'income',
                account_id: selectedAccountId,
                category_id: category?.id,
                date: new Date().toISOString(),
                notes: `تسوية ديون مع ${selectedAggregate.contact.name}`
            });

            // Log Activity
            logActivity(`تسوية ديون: ${formatCurrency(amountToSettle)} مع ${selectedAggregate.contact.name} (${isPay ? 'سداد' : 'تحصيل'})`);

            onSuccess();

        } catch (error: any) {
            console.error("Error settling debt:", error);
            toast.error("حدث خطأ أثناء المعالجة");
        } finally {
            setIsProcessing(false);
        }
    };

    if (step === 1) {
        return (
            <div className="space-y-2">
                <div className="bg-slate-800/50 p-3 rounded-xl border border-white/5 mb-4 text-center">
                    <p className="text-slate-400 text-xs">إجمالي الديون المعلقة</p>
                    <div className="flex justify-center gap-4 mt-1">
                        <span className="text-emerald-400 font-bold text-sm">لك: {formatCurrency(unpaidDebts.filter(d => d.type === 'for_you').reduce((s,d)=>s+d.amount,0))}</span>
                        <span className="text-rose-400 font-bold text-sm">عليك: {formatCurrency(unpaidDebts.filter(d => d.type === 'on_you').reduce((s,d)=>s+d.amount,0))}</span>
                    </div>
                </div>
                
                <div className="max-h-[60vh] overflow-y-auto custom-scrollbar space-y-2">
                    {contactAggregates.map(({ contact, onYou, forYou }) => (
                        <button 
                            key={contact.id} 
                            onClick={() => { setSelectedContactId(contact.id); setStep(2); }}
                            className="w-full p-4 bg-slate-800/40 hover:bg-slate-800 rounded-2xl border border-white/5 hover:border-cyan-500/30 transition-all group flex justify-between items-center"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white shadow-md">
                                    {contact.name.charAt(0)}
                                </div>
                                <div className="text-right">
                                    <p className="font-bold text-white">{contact.name}</p>
                                    <p className="text-xs text-slate-500">انقر للتفاصيل</p>
                                </div>
                            </div>
                            <div className="text-left text-xs font-bold space-y-1">
                                {onYou > 0 && <p className="text-rose-400">عليك {formatCurrency(onYou)}</p>}
                                {forYou > 0 && <p className="text-emerald-400">لك {formatCurrency(forYou)}</p>}
                            </div>
                        </button>
                    ))}
                    {contactAggregates.length === 0 && <p className="text-center text-slate-500 py-10">لا توجد ديون لتسويتها.</p>}
                </div>
            </div>
        );
    }

    if (step === 2 && selectedAggregate) {
        return (
            <div className="space-y-6">
                <div className="text-center">
                    <p className="text-slate-400 text-xs mb-1">تسوية مع</p>
                    <h3 className="text-2xl font-bold text-white">{selectedAggregate.contact.name}</h3>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        type="button"
                        onClick={() => { setSettlementType('pay'); setSettlementAmount(selectedAggregate.onYou.toString()); }}
                        disabled={selectedAggregate.onYou === 0}
                        className={`p-4 rounded-2xl border transition-all ${settlementType === 'pay' ? 'bg-rose-500/20 border-rose-500 text-rose-400 ring-2 ring-rose-500/30' : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'} ${selectedAggregate.onYou === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <p className="text-xs font-bold mb-1">عليك (سداد)</p>
                        <p className="text-xl font-black">{formatCurrency(selectedAggregate.onYou)}</p>
                    </button>
                    <button 
                        type="button"
                        onClick={() => { setSettlementType('receive'); setSettlementAmount(selectedAggregate.forYou.toString()); }}
                        disabled={selectedAggregate.forYou === 0}
                        className={`p-4 rounded-2xl border transition-all ${settlementType === 'receive' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 ring-2 ring-emerald-500/30' : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'} ${selectedAggregate.forYou === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        <p className="text-xs font-bold mb-1">لك (تحصيل)</p>
                        <p className="text-xl font-black">{formatCurrency(selectedAggregate.forYou)}</p>
                    </button>
                </div>

                {/* List of Specific Debts */}
                {displayDebts.length > 0 && (
                    <div className="bg-slate-800/30 rounded-2xl p-3 border border-white/5">
                        <p className="text-[10px] font-bold text-slate-400 mb-2 px-1 flex justify-between">
                            <span>تفاصيل الديون ({displayDebts.length})</span>
                            <span>التاريخ</span>
                        </p>
                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                            {displayDebts.map(debt => (
                                <div key={debt.id} className="flex justify-between items-center text-sm p-3 bg-slate-800/80 rounded-xl border border-white/5 hover:bg-slate-800 transition-colors">
                                    <div className="flex-1 min-w-0 ml-2">
                                        <p className="text-white font-bold truncate text-xs mb-0.5">{debt.description || 'دين بدون وصف'}</p>
                                        <p className="text-[10px] text-slate-500">
                                            {debt.due_date ? new Date(debt.due_date).toLocaleDateString('ar-LY') : new Date(debt.created_at).toLocaleDateString('ar-LY')}
                                        </p>
                                    </div>
                                    <span className={`font-bold text-xs ${debt.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}>
                                        {formatCurrency(debt.amount)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Amount Input */}
                <div className="relative">
                    <label className="text-xs font-bold text-slate-500 px-1 mb-1 block">المبلغ المدفوع / المستلم</label>
                    <input 
                        type="number" 
                        step="0.01" 
                        value={settlementAmount} 
                        onChange={e => setSettlementAmount(e.target.value)} 
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl p-4 text-center text-3xl font-bold text-white focus:border-cyan-500 focus:outline-none"
                    />
                </div>

                {/* Account Selection */}
                <div>
                    <label className="text-xs font-bold text-slate-500 px-1 mb-1 block">
                        {settlementType === 'pay' ? 'خصم من الحساب' : 'إيداع في الحساب'}
                    </label>
                    <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                        {accounts.map(acc => (
                            <button
                                key={acc.id}
                                onClick={() => setSelectedAccountId(acc.id)}
                                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${selectedAccountId === acc.id ? 'bg-cyan-500/10 border-cyan-500 text-white' : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'}`}
                            >
                                <span className="font-bold text-sm">{acc.name}</span>
                                <span className="text-xs font-mono">{formatCurrency(acc.balance)}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <button 
                    onClick={handleSettle} 
                    disabled={isProcessing || !settlementAmount || !selectedAccountId}
                    className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-2xl font-bold text-white text-lg shadow-lg flex items-center justify-center gap-2"
                >
                    {isProcessing ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'تأكيد العملية'}
                </button>
            </div>
        );
    }

    return null;
}

const QuickActions: React.FC<{ onActionSuccess: (description: string) => void }> = ({ onActionSuccess }) => {
    const [isFabOpen, setIsFabOpen] = useState(false);
    const [activeModal, setActiveModal] = useState<ModalType | null>(null);
    const [modalStep, setModalStep] = useState(1);
    
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [unpaidDebts, setUnpaidDebts] = useState<Debt[]>([]);
    
    const toast = useToast();
    const queryClient = useQueryClient();

    const fetchDataForModals = useCallback(async () => {
        const accPromise = supabase.from('accounts').select('*');
        const catPromise = supabase.from('categories').select('*');
        const conPromise = supabase.from('contacts').select('*');
        const debtPromise = supabase.from('debts').select('*, contacts(name)').eq('paid', false);

        const [{ data: accData }, { data: catData }, { data: conData }, { data: debtData }] = await Promise.all([accPromise, catPromise, conPromise, debtPromise]);
        
        setAccounts(accData as Account[] || []);
        setCategories(catData as Category[] || []);
        setContacts(conData as Contact[] || []);
        setUnpaidDebts(debtData as unknown as Debt[] || []);
    }, []);
    
    useEffect(() => {
        if(activeModal) fetchDataForModals();
    }, [activeModal, fetchDataForModals]);

    const handleActionSuccess = () => {
        let description = 'تم تحديث البيانات';
        switch (activeModal) {
            case 'expense': description = 'إضافة مصروف جديد'; break;
            case 'income': description = 'إضافة إيراد جديد'; break;
            case 'transfer': description = 'إجراء تحويل مالي'; break;
            case 'add-debt': description = 'إضافة دين جديد'; break;
            case 'settle-debt': description = 'تسوية دين'; break;
            case 'add-account': description = 'إضافة حساب جديد'; break;
            case 'add-investment': description = 'تسجيل استثمار جديد'; break;
        }
        queryClient.invalidateQueries({ queryKey: ['accounts'] });
        queryClient.invalidateQueries({ queryKey: ['transactions'] });
        queryClient.invalidateQueries({ queryKey: ['transactions-stats'] });
        queryClient.invalidateQueries({ queryKey: ['debts'] });
        queryClient.invalidateQueries({ queryKey: ['debtNotifications'] });
        queryClient.invalidateQueries({ queryKey: ['investments'] });
        
        toast.success(description);
        setActiveModal(null);
        setModalStep(1);
        setIsFabOpen(false);
        if(onActionSuccess) onActionSuccess(description);
    };

    const openModal = (type: ModalType) => {
        setActiveModal(type);
        setIsFabOpen(false);
    }
    
    const closeModal = () => {
        setActiveModal(null);
        setModalStep(1);
    }

    const fabActions = [
        { label: 'مصروف', icon: <ArrowUpIcon className="w-5 h-5"/>, action: () => openModal('expense'), gradient: 'from-rose-500 to-pink-600', color: 'rose' },
        { label: 'إيراد', icon: <ArrowDownIcon className="w-5 h-5"/>, action: () => openModal('income'), gradient: 'from-emerald-500 to-teal-600', color: 'emerald' },
        { label: 'تحويل', icon: <ArrowsRightLeftIcon className="w-5 h-5"/>, action: () => openModal('transfer'), gradient: 'from-violet-500 to-indigo-600', color: 'violet' },
        { label: 'دين', icon: <HandRaisedIcon className="w-5 h-5"/>, action: () => openModal('add-debt'), gradient: 'from-amber-500 to-orange-600', color: 'amber' },
        { label: 'استثمار', icon: <SparklesIcon className="w-5 h-5"/>, action: () => openModal('add-investment'), gradient: 'from-cyan-500 to-blue-600', color: 'cyan' },
    ];
    
    const modalConfig: Record<ModalType, { title: string, color: string }> = {
        expense: { title: 'مصروف جديد', color: 'from-rose-500' },
        income: { title: 'إيراد جديد', color: 'from-emerald-500' },
        transfer: { title: 'تحويل أموال', color: 'from-violet-500' },
        'add-debt': { title: 'تسجيل دين', color: 'from-amber-500' },
        'settle-debt': { title: 'تسوية الديون', color: 'from-sky-500' },
        'add-account': { title: 'حساب جديد', color: 'from-cyan-500' },
        'add-investment': { title: 'استثمار جديد', color: 'from-cyan-500' }
    };

    const renderModalContent = () => {
        switch(activeModal) {
            case 'expense':
            case 'income':
                return <TransactionModal type={activeModal} accounts={accounts} categories={categories} onSuccess={handleActionSuccess} onCancel={closeModal} />;
            case 'transfer':
                 return <TransferModal accounts={accounts} onSuccess={handleActionSuccess} onCancel={closeModal} />;
            case 'add-debt':
                return <AddDebtWizard contacts={contacts} accounts={accounts} categories={categories} onSuccess={handleActionSuccess} onCancel={closeModal} step={modalStep} setStep={setModalStep} />;
            case 'settle-debt':
                return <SettleDebtWizard unpaidDebts={unpaidDebts} contacts={contacts} accounts={accounts} categories={categories} onSuccess={handleActionSuccess} step={modalStep} setStep={setModalStep} />
            case 'add-account':
                return <AddAccountModal onSuccess={handleActionSuccess} onCancel={closeModal} />;
            case 'add-investment':
                return <AddInvestmentModal onSuccess={handleActionSuccess} onCancel={closeModal} />;
            default:
                return null;
        }
    }

    return (
        <>
            {/* Scrim Overlay */}
            <div
                className={`fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[45] transition-opacity duration-300 ease-in-out ${isFabOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsFabOpen(false)}
                aria-hidden="true"
            />
            
            {/* Centered FAB Container */}
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center justify-end pointer-events-none">
                
                {/* Actions Menu */}
                <div className={`absolute bottom-20 flex flex-col items-center gap-3 transition-all duration-300 ${isFabOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-10'}`}>
                    {fabActions.map((action, index) => {
                        // Staggered delay for upward motion
                        const transitionStyle = {
                            transitionDelay: isFabOpen ? `${index * 40}ms` : '0ms',
                            transform: isFabOpen ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.8)'
                        };
                        
                        return (
                            <div key={index} className="flex items-center gap-3 w-full justify-center transition-all duration-300 ease-out" style={transitionStyle}>
                                <span className="text-xs font-bold text-white bg-slate-900/90 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-lg border border-white/10 whitespace-nowrap min-w-[60px] text-center">
                                    {action.label}
                                </span>
                                <button 
                                    onClick={action.action} 
                                    className={`h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow-xl shadow-black/30 border border-white/20 bg-gradient-to-br ${action.gradient} hover:scale-110 active:scale-95 transition-transform`}
                                >
                                    {action.icon}
                                </button>
                            </div>
                        )
                    })}
                </div>

                {/* Main FAB Button */}
                <button
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    className={`pointer-events-auto relative h-16 w-16 bg-slate-900 rounded-[22px] shadow-[0_0_30px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] z-50 border-4 border-slate-900 overflow-visible hover:scale-105 active:scale-95 ${isFabOpen ? 'rotate-[135deg] bg-rose-600 border-rose-600' : ''}`}
                    aria-haspopup="true"
                    aria-expanded={isFabOpen}
                    aria-label={isFabOpen ? 'إغلاق الإجراءات السريعة' : 'فتح الإجراءات السريعة'}
                >
                    {/* Inner Gradient Circle */}
                    <div className={`absolute inset-0 rounded-[18px] flex items-center justify-center transition-all duration-500 ${isFabOpen ? 'opacity-0' : 'opacity-100 bg-gradient-to-tr from-cyan-500 to-blue-600'}`}>
                        <PlusIcon className="w-8 h-8 text-white transition-transform duration-300" />
                    </div>
                    {/* Close Icon for Open State */}
                    <div className={`absolute inset-0 rounded-[18px] flex items-center justify-center transition-all duration-500 ${isFabOpen ? 'opacity-100' : 'opacity-0'}`}>
                        <PlusIcon className="w-8 h-8 text-white" />
                    </div>
                    
                    {/* Ring Pulse */}
                    {!isFabOpen && <span className="absolute -inset-2 rounded-[26px] border-2 border-cyan-400/20 animate-ping-slow pointer-events-none"></span>}
                </button>
            </div>
            
            {activeModal && (
                <Modal 
                  title={modalConfig[activeModal].title}
                  headerColor={modalConfig[activeModal].color}
                  onClose={closeModal}
                  showBackButton={modalStep > 1}
                  onBack={() => setModalStep(s => s - 1)}
                 >
                    {renderModalContent()}
                </Modal>
            )}
        </>
    );
};

export default QuickActions;
