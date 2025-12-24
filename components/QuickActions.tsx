
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
    <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
        <div className="relative w-full max-w-lg bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
            <div className={`absolute top-0 left-0 right-0 h-24 opacity-20 pointer-events-none bg-gradient-to-b ${headerColor || 'from-cyan-500'} to-transparent`}></div>
            
            <div className="p-5 pb-2 shrink-0 z-10 flex justify-between items-center">
                 {showBackButton ? (
                    <button onClick={onBack} className="p-2.5 rounded-full bg-white/5 text-slate-300 border border-white/5"><ArrowLeftIcon className="w-5 h-5" /></button>
                ) : <div className="w-10"></div>}
                <h3 className="text-lg font-bold text-white tracking-wide">{title}</h3>
                <button onClick={onClose} className="p-2.5 rounded-full bg-white/5 text-slate-300 border border-white/5"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar relative z-10 flex-1">
                {children}
            </div>
        </div>
    </div>
);

// --- Sub-Modals ---

// Fix: Restoring AddInvestmentModal implementation
const AddInvestmentModal: React.FC<{ onSuccess: () => void; onCancel: () => void; }> = ({ onSuccess, onCancel }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('ذهب');
    const [amount, setAmount] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const { error } = await supabase.from('investments').insert({
            name, type, amount: Number(amount), current_value: Number(currentValue) || Number(amount)
        });
        if (error) toast.error('خطأ في الحفظ');
        else {
            logActivity(`إضافة استثمار: ${name}`);
            onSuccess();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم الاستثمار" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none" />
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">
                <option value="ذهب">ذهب</option><option value="أسهم">أسهم</option><option value="عملات">عملات</option><option value="مدخرات">مدخرات</option>
            </select>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ المستثمر" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold">حفظ الاستثمار</button>
        </form>
    );
};

// Fix: Restoring AddAccountModal implementation
const AddAccountModal: React.FC<{ onSuccess: () => void; onCancel: () => void; }> = ({ onSuccess, onCancel }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('بنكي');
    const [balance, setBalance] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const { error } = await supabase.from('accounts').insert({
            name, type, balance: Number(balance), currency: 'د.ل'
        });
        if (error) toast.error('خطأ في الحفظ');
        else {
            logActivity(`فتح حساب جديد: ${name}`);
            onSuccess();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم الحساب" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:outline-none" />
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">
                <option value="بنكي">بنكي</option><option value="نقدي">نقدي</option><option value="مخصص">مخصص</option>
            </select>
            <input type="number" value={balance} onChange={e => setBalance(e.target.value)} placeholder="الرصيد الافتتاحي" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold">فتح الحساب</button>
        </form>
    );
};

// Fix: Restoring TransactionModal implementation
const TransactionModal: React.FC<{
    type: 'income' | 'expense';
    accounts: Account[];
    categories: Category[];
    onSuccess: () => void;
    onCancel: () => void;
}> = ({ type, accounts, categories, onSuccess, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId) return toast.warning('اختر حساباً');
        setIsSaving(true);
        const val = Number(amount);
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
        if (acc) {
            const newBal = type === 'income' ? acc.balance + val : acc.balance - val;
            await supabase.from('accounts').update({ balance: newBal }).eq('id', accountId);
            await supabase.from('transactions').insert({
                account_id: accountId, amount: val, type, category_id: categoryId || null, notes, date: new Date().toISOString()
            });
            logActivity(`تسجيل ${type === 'income' ? 'إيراد' : 'مصروف'}: ${val}`);
            onSuccess();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="text-center py-4">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required className={`w-full bg-transparent text-center text-5xl font-black focus:outline-none ${type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`} />
            </div>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">
                <option value="">اختر حساباً</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
            </select>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">
                <option value="">الفئة (اختياري)</option>
                {categories.filter(c => c.type === type).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white" />
            <button type="submit" disabled={isSaving} className={`w-full py-3 rounded-xl font-bold text-white ${type === 'income' ? 'bg-emerald-600' : 'bg-rose-600'}`}>حفظ</button>
        </form>
    );
};

// Fix: Restoring TransferModal implementation
const TransferModal: React.FC<{ accounts: Account[]; onSuccess: () => void; onCancel: () => void; }> = ({ accounts, onSuccess, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [fromId, setFromId] = useState('');
    const [toId, setToId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromId || !toId || !amount) return;
        if (fromId === toId) return toast.warning('لا يمكن التحويل لنفس الحساب');
        setIsSaving(true);
        const val = Number(amount);
        const { data: fromAcc } = await supabase.from('accounts').select('balance').eq('id', fromId).single();
        const { data: toAcc } = await supabase.from('accounts').select('balance').eq('id', toId).single();
        if (fromAcc && toAcc) {
            await supabase.from('accounts').update({ balance: fromAcc.balance - val }).eq('id', fromId);
            await supabase.from('accounts').update({ balance: toAcc.balance + val }).eq('id', toId);
            await supabase.from('transactions').insert({
                account_id: fromId, to_account_id: toId, amount: val, type: 'transfer', date: new Date().toISOString()
            });
            logActivity(`تحويل ${val} من ${fromId} إلى ${toId}`);
            onSuccess();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white text-center text-3xl font-bold" />
            <select value={fromId} onChange={e => setFromId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">
                <option value="">من حساب</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <select value={toId} onChange={e => setToId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white">
                <option value="">إلى حساب</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <button type="submit" disabled={isSaving} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">تأكيد التحويل</button>
        </form>
    );
};

// Fix: Restoring AddDebtWizard implementation
const AddDebtWizard: React.FC<{
    contacts: Contact[];
    accounts: Account[];
    categories: Category[];
    onSuccess: () => void;
    onCancel: () => void;
    step: number;
    setStep: (s: number) => void;
}> = ({ contacts, accounts, categories, onSuccess, onCancel, step, setStep }) => {
    const [type, setType] = useState<'for_you' | 'on_you'>('on_you');
    const [amount, setAmount] = useState('');
    const [contactId, setContactId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [desc, setDesc] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleNext = () => setStep(step + 1);
    const handleSubmit = async () => {
        setIsSaving(true);
        const { error } = await supabase.from('debts').insert({
            contact_id: contactId || null, amount: Number(amount), type, due_date: dueDate || null, description: desc, paid: false
        });
        if (!error) {
            logActivity(`تسجيل دين بقيمة ${amount}`);
            onSuccess();
        }
        setIsSaving(false);
    };

    if (step === 1) return (
        <div className="space-y-6">
            <div className="flex bg-slate-800 p-1 rounded-xl">
                <button type="button" onClick={() => setType('on_you')} className={`flex-1 py-2 rounded-lg font-bold ${type === 'on_you' ? 'bg-rose-600 text-white' : 'text-slate-400'}`}>عليك</button>
                <button type="button" onClick={() => setType('for_you')} className={`flex-1 py-2 rounded-lg font-bold ${type === 'for_you' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}>لك</button>
            </div>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" className="w-full bg-transparent text-center text-5xl font-black text-white outline-none" autoFocus />
            <button type="button" onClick={handleNext} disabled={!amount} className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold">التالي</button>
        </div>
    );

    return (
        <div className="space-y-4">
            <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl text-white">
                <option value="">اختر اسماً (اختياري)</option>
                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-800 p-3 rounded-xl text-white" />
            <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="وصف..." className="w-full bg-slate-800 p-3 rounded-xl text-white h-24" />
            <button type="button" onClick={handleSubmit} disabled={isSaving} className="w-full py-3 bg-cyan-600 text-white rounded-xl font-bold">حفظ الدين</button>
        </div>
    );
};

// Fix: Restoring SettleDebtWizard implementation
const SettleDebtWizard: React.FC<{
    unpaidDebts: Debt[];
    contacts: Contact[];
    accounts: Account[];
    categories: Category[];
    onSuccess: () => void;
    step: number;
    setStep: (s: number) => void;
}> = ({ unpaidDebts, contacts, accounts, categories, onSuccess, step, setStep }) => {
    const [selectedDebtId, setSelectedDebtId] = useState('');
    const [accountId, setAccountId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const selectedDebt = unpaidDebts.find(d => d.id === selectedDebtId);

    const handleSubmit = async () => {
        if (!selectedDebt || !accountId) return;
        setIsSaving(true);
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
        if (acc) {
            const sign = selectedDebt.type === 'on_you' ? -1 : 1;
            await supabase.from('accounts').update({ balance: acc.balance + (selectedDebt.amount * sign) }).eq('id', accountId);
            await supabase.from('debts').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', selectedDebtId);
            await supabase.from('transactions').insert({
                account_id: accountId, amount: selectedDebt.amount, type: selectedDebt.type === 'on_you' ? 'expense' : 'income', notes: `تسوية دين: ${selectedDebt.description || ''}`, date: new Date().toISOString()
            });
            logActivity(`تسوية دين: ${selectedDebt.amount}`);
            onSuccess();
        }
        setIsSaving(false);
    };

    if (step === 1) return (
        <div className="space-y-4">
            <p className="text-sm text-slate-400 text-center">اختر الدين المراد تسويته</p>
            <div className="space-y-2 max-h-60 overflow-y-auto custom-scrollbar">
                {unpaidDebts.length === 0 ? <p className="text-center text-slate-500 py-4">لا توجد ديون نشطة حالياً</p> :
                unpaidDebts.map(d => (
                    <button key={d.id} type="button" onClick={() => { setSelectedDebtId(d.id); setStep(2); }} className="w-full p-4 bg-slate-800 rounded-xl text-right hover:bg-slate-700 transition border border-white/5">
                        <div className="flex justify-between items-center">
                            <span className="font-bold text-white">{d.contacts?.name || 'مجهول'}</span>
                            <span className={d.type === 'for_you' ? 'text-emerald-400' : 'text-rose-400'}>{formatCurrency(d.amount)}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{d.description || 'بدون وصف'}</p>
                    </button>
                ))}
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-4 rounded-xl text-center">
                <p className="text-xs text-slate-400 mb-1">المبلغ المطلوب</p>
                <p className="text-3xl font-black text-white">{formatCurrency(selectedDebt?.amount || 0)}</p>
            </div>
            <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-slate-800 p-3 rounded-xl text-white">
                <option value="">اختر الحساب لسداد/تحصيل المبلغ</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
            </select>
            <button type="button" onClick={handleSubmit} disabled={isSaving || !accountId} className="w-full py-4 bg-cyan-600 text-white rounded-xl font-bold">تأكيد التسوية</button>
        </div>
    );
};


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
    
    useEffect(() => { if(activeModal) fetchDataForModals(); }, [activeModal, fetchDataForModals]);

    const handleActionSuccess = () => {
        queryClient.invalidateQueries();
        setActiveModal(null);
        setModalStep(1);
        setIsFabOpen(false);
        onActionSuccess('تم تحديث البيانات');
    };

    const fabActions = [
        { label: 'مصروف', icon: <ArrowUpIcon className="w-5 h-5"/>, action: () => { setActiveModal('expense'); setIsFabOpen(false); }, gradient: 'from-rose-500 to-pink-600' },
        { label: 'إيراد', icon: <ArrowDownIcon className="w-5 h-5"/>, action: () => { setActiveModal('income'); setIsFabOpen(false); }, gradient: 'from-emerald-500 to-teal-600' },
        { label: 'تحويل', icon: <ArrowsRightLeftIcon className="w-5 h-5"/>, action: () => { setActiveModal('transfer'); setIsFabOpen(false); }, gradient: 'from-violet-500 to-indigo-600' },
        { label: 'دين', icon: <HandRaisedIcon className="w-5 h-5"/>, action: () => { setActiveModal('add-debt'); setIsFabOpen(false); }, gradient: 'from-amber-500 to-orange-600' },
        { label: 'تسوية', icon: <ScaleIcon className="w-5 h-5"/>, action: () => { setActiveModal('settle-debt'); setIsFabOpen(false); }, gradient: 'from-sky-500 to-blue-600' },
        { label: 'استثمار', icon: <SparklesIcon className="w-5 h-5"/>, action: () => { setActiveModal('add-investment'); setIsFabOpen(false); }, gradient: 'from-cyan-500 to-blue-600' },
    ];
    
    const modalConfig: Record<ModalType, { title: string, color: string }> = {
        expense: { title: 'تسجيل مصروف', color: 'from-rose-500' },
        income: { title: 'تسجيل إيراد', color: 'from-emerald-500' },
        transfer: { title: 'تحويل أموال', color: 'from-violet-500' },
        'add-debt': { title: 'تسجيل دين جديد', color: 'from-amber-500' },
        'settle-debt': { title: 'تسوية الديون', color: 'from-sky-500' },
        'add-account': { title: 'حساب جديد', color: 'from-cyan-500' },
        'add-investment': { title: 'استثمار جديد', color: 'from-cyan-500' }
    };

    return (
        <>
            <div className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${isFabOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsFabOpen(false)} />
            
            <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center pointer-events-none mb-safe">
                <div className={`flex flex-col items-center gap-3 mb-6 transition-all duration-300 ${isFabOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-10'}`}>
                    {fabActions.map((action, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-white bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">{action.label}</span>
                            <button onClick={action.action} className={`h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow-2xl bg-gradient-to-br ${action.gradient} active:scale-90 transition-transform`}>
                                {action.icon}
                            </button>
                        </div>
                    ))}
                </div>

                <button onClick={() => setIsFabOpen(!isFabOpen)} className={`pointer-events-auto relative h-16 w-16 bg-slate-900 rounded-[22px] shadow-[0_0_30px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-500 z-50 border-4 border-slate-900 ${isFabOpen ? 'rotate-[135deg] bg-rose-600 border-rose-600' : ''}`}>
                    <div className={`absolute inset-0 rounded-[18px] flex items-center justify-center transition-all duration-500 ${isFabOpen ? 'opacity-0' : 'opacity-100 bg-gradient-to-tr from-cyan-500 to-blue-600'}`}>
                        <PlusIcon className="w-8 h-8 text-white" />
                    </div>
                    {isFabOpen && <XMarkIcon className="w-8 h-8 text-white" />}
                </button>
            </div>
            
            {activeModal && (
                <Modal title={modalConfig[activeModal].title} headerColor={modalConfig[activeModal].color} onClose={() => { setActiveModal(null); setModalStep(1); }} showBackButton={modalStep > 1} onBack={() => setModalStep(s => s - 1)}>
                    {activeModal === 'expense' || activeModal === 'income' ? <TransactionModal type={activeModal} accounts={accounts} categories={categories} onSuccess={handleActionSuccess} onCancel={() => setActiveModal(null)} /> :
                     activeModal === 'transfer' ? <TransferModal accounts={accounts} onSuccess={handleActionSuccess} onCancel={() => setActiveModal(null)} /> :
                     activeModal === 'add-debt' ? <AddDebtWizard contacts={contacts} accounts={accounts} categories={categories} onSuccess={handleActionSuccess} onCancel={() => setActiveModal(null)} step={modalStep} setStep={setModalStep} /> :
                     activeModal === 'settle-debt' ? <SettleDebtWizard unpaidDebts={unpaidDebts} contacts={contacts} accounts={accounts} categories={categories} onSuccess={handleActionSuccess} step={modalStep} setStep={setModalStep} /> :
                     activeModal === 'add-account' ? <AddAccountModal onSuccess={handleActionSuccess} onCancel={() => setActiveModal(null)} /> :
                     activeModal === 'add-investment' ? <AddInvestmentModal onSuccess={handleActionSuccess} onCancel={() => setActiveModal(null)} /> : null}
                </Modal>
            )}
        </>
    );
};

export default QuickActions;
