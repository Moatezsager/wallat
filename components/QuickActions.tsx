
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Category, Contact, Debt, Investment } from '../types';
import { useToast } from './Toast';
import { useQueryClient } from '@tanstack/react-query';
import { 
    PlusIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, HandRaisedIcon, UserPlusIcon, ArrowLeftIcon, AccountsIcon, ScaleIcon, ArrowsRightLeftIcon, CurrencyDollarIcon,
    WalletIcon, BanknoteIcon, LandmarkIcon, BriefcaseIcon, CalendarDaysIcon, TagIcon, PencilSquareIcon, iconMap, CheckCircleIcon, SparklesIcon,
    ChevronRightIcon, MagnifyingGlassIcon, ContactsIcon, CheckSquareIcon, CategoriesIcon,
    ShoppingCartIcon, CoffeeIcon, ReceiptIcon, BusIcon, MovieIcon, SaladIcon, ShirtIcon2, PlaneIcon2, TrophyIcon, ClockIcon
} from './icons';
import { logActivity } from '../lib/logger';

type ModalType = 'expense' | 'income' | 'transfer' | 'add-debt' | 'settle-debt' | 'add-account' | 'add-investment' | 'add-category';

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
        <div className="relative w-full max-w-lg bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
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

const FINANCE_ICONS = [ 
    { name: 'UtensilsIcon', label: 'طعام' }, 
    { name: 'SaladIcon', label: 'صحة' },
    { name: 'CoffeeIcon', label: 'مقهى' },
    { name: 'ShoppingCartIcon', label: 'تسوق' }, 
    { name: 'ShoppingBagIcon', label: 'أكياس' }, 
    { name: 'ReceiptIcon', label: 'فواتير' },
    { name: 'CarIcon', label: 'سيارة' }, 
    { name: 'BusIcon', label: 'حافلة' },
    { name: 'PlaneIcon2', label: 'سفر' },
    { name: 'FuelIcon', label: 'وقود' }, 
    { name: 'HomeModernIcon', label: 'منزل' }, 
    { name: 'ZapIcon', label: 'كهرباء' }, 
    { name: 'WifiIcon', label: 'انترنت' }, 
    { name: 'SmartphoneIcon', label: 'هاتف' }, 
    { name: 'MovieIcon', label: 'سينما' },
    { name: 'Gamepad2Icon', label: 'ترفيه' }, 
    { name: 'ShirtIcon2', label: 'ملابس' }, 
    { name: 'GraduationCapIcon', label: 'تعليم' },
    { name: 'TrophyIcon', label: 'رياضة' },
    { name: 'BriefcaseIcon', label: 'عمل' }, 
    { name: 'CurrencyDollarIcon', label: 'مال' }, 
    { name: 'BanknoteIcon', label: 'نقدي' }, 
    { name: 'GiftIcon', label: 'هدايا' }, 
    { name: 'TagIcon', label: 'عام' } 
];

const MODERN_COLORS = [ 
    '#10b981', '#059669', '#3b82f6', '#2563eb', '#06b6d4', '#0891b2', 
    '#8b5cf6', '#7c3aed', '#d946ef', '#f43f5e', '#ef4444', '#f97316', 
    '#f59e0b', '#eab308', '#64748b' 
];

const AddCategoryModal: React.FC<{ onSuccess: (newCategoryId?: string) => void; onCancel: () => void; initialType?: 'income' | 'expense'; isInline?: boolean }> = ({ onSuccess, onCancel, initialType = 'expense', isInline = false }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState<'income' | 'expense'>(initialType);
    const [color, setColor] = useState(MODERN_COLORS[0]);
    const [icon, setIcon] = useState('TagIcon');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const { data, error } = await supabase.from('categories').insert({ name, type, color, icon }).select().single();
        if (error) toast.error('خطأ في حفظ الفئة');
        else {
            logActivity(`إنشاء فئة جديدة: ${name} (${type === 'income' ? 'دخل' : 'مصروف'})`);
            onSuccess(data.id);
        }
        setIsSaving(false);
    };

    const IconComp = iconMap[icon] || TagIcon;

    return (
        <form onSubmit={handleSubmit} className={`space-y-6 ${isInline ? 'animate-fade-in' : ''}`}>
            {!isInline && (
                <div className="flex bg-slate-800 p-1 rounded-2xl border border-white/5 shadow-inner">
                    <button type="button" onClick={() => setType('expense')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${type === 'expense' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}>فئة مصروفات</button>
                    <button type="button" onClick={() => setType('income')} className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${type === 'income' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>فئة دخل</button>
                </div>
            )}
            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-3xl border border-white/5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white shadow-2xl shrink-0 transition-transform hover:scale-105" style={{ backgroundColor: color }}>
                    <IconComp className="w-8 h-8" />
                </div>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم الفئة..." required className="w-full bg-transparent border-b border-slate-700 p-2 text-white font-bold text-xl focus:outline-none focus:border-white transition-colors" />
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">اختر أيقونة</label>
                <div className="grid grid-cols-6 gap-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
                    {FINANCE_ICONS.map(i => {
                        const Icon = iconMap[i.name] || TagIcon;
                        return (
                            <button key={i.name} type="button" onClick={() => setIcon(i.name)} className={`p-2.5 rounded-xl border transition-all flex items-center justify-center ${icon === i.name ? 'bg-white/10 border-white/20' : 'bg-slate-800/30 border-white/5'}`}>
                                <Icon className={`w-5 h-5 ${icon === i.name ? 'text-white' : 'text-slate-500'}`} />
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">لون التمييز</label>
                <div className="flex flex-wrap gap-2 justify-center">
                    {MODERN_COLORS.map(c => (
                        <button key={c} type="button" onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${color === c ? 'border-white scale-110 ring-2 ring-white/20' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                    ))}
                </div>
            </div>
            <div className="flex gap-3">
                {isInline && (<button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-lg active:scale-95 transition-all">إلغاء</button>)}
                <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-cyan-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">{isSaving ? 'جاري الحفظ...' : 'حفظ الفئة'}</button>
            </div>
        </form>
    );
};

const TransactionModal: React.FC<{
    type: 'income' | 'expense';
    accounts: Account[];
    categories: Category[];
    onSuccess: () => void;
    onCancel: () => void;
    onRefreshCategories: () => void;
}> = ({ type, accounts, categories, onSuccess, onCancel, onRefreshCategories }) => {
    const [amount, setAmount] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
    const [selectedCategoryId, setSelectedCategoryId] = useState('');
    const [notes, setNotes] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [time, setTime] = useState(new Date().toTimeString().slice(0, 5));
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingCategory, setIsAddingCategory] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = Number(amount);
        if (!selectedAccountId) return toast.warning('يرجى اختيار حساب');
        if (!amount || val <= 0) return toast.warning('يرجى إدخال مبلغ صحيح');
        
        const account = accounts.find(a => a.id === selectedAccountId);
        if (type === 'expense' && account && account.balance < val) {
            if (!confirm(`رصيد حساب "${account.name}" غير كافٍ حالياً. هل تريد تنفيذ العملية ورصيد الحساب سيصبح سالباً؟`)) return;
        }

        setIsSaving(true);
        const { data: acc } = await supabase.from('accounts').select('balance').eq('id', selectedAccountId).single();
        if (acc) {
            const finalDateTime = new Date(`${date}T${time}:00`);
            const newBal = type === 'income' ? acc.balance + val : acc.balance - val;
            await supabase.from('accounts').update({ balance: newBal }).eq('id', selectedAccountId);
            await supabase.from('transactions').insert({
                account_id: selectedAccountId, amount: val, type, category_id: selectedCategoryId || null, notes, date: finalDateTime.toISOString()
            });
            logActivity(`تسجيل ${type === 'income' ? 'إيراد' : 'مصروف'}: ${formatCurrency(val)}`);
            onSuccess();
        }
        setIsSaving(false);
    };

    if (isAddingCategory) {
        return <AddCategoryModal initialType={type} isInline={true} onSuccess={(newId) => { setIsAddingCategory(false); onRefreshCategories(); if (newId) setSelectedCategoryId(newId); }} onCancel={() => setIsAddingCategory(false)} />;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="relative group text-center py-4">
                <div className={`absolute inset-0 blur-3xl opacity-10 rounded-full transition-colors duration-500 ${type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <div className="relative z-10 flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">أدخل المبلغ</span>
                    <div className="flex items-center justify-center gap-2">
                        <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required autoFocus className={`w-full bg-transparent text-center text-6xl font-black focus:outline-none transition-colors duration-300 placeholder-slate-800 ${type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`} />
                        <span className={`text-xl font-bold ${type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>د.ل</span>
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">التاريخ</label>
                    <div className="relative group">
                        <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none" />
                        <CalendarDaysIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">الوقت</label>
                    <div className="relative group">
                        <input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-xs text-white focus:outline-none focus:border-cyan-500/50 transition-all appearance-none" />
                        <ClockIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                    </div>
                </div>
            </div>
            <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">الحساب</label>
                <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x pr-1">
                    {accounts.map(acc => {
                        const Icon = getAccountTypeIcon(acc.type);
                        const isSelected = selectedAccountId === acc.id;
                        return (
                            <button key={acc.id} type="button" onClick={() => setSelectedAccountId(acc.id)} className={`shrink-0 w-36 p-4 rounded-2xl border transition-all snap-start text-right ${isSelected ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-900/20' : 'bg-slate-800/50 border-white/5 hover:bg-slate-800'}`}>
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${isSelected ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}><Icon className="w-5 h-5" /></div>
                                <p className={`text-xs font-bold truncate mb-1 ${isSelected ? 'text-white' : 'text-slate-400'}`}>{acc.name}</p>
                                <p className={`text-[10px] font-black tabular-nums ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`}>{formatCurrency(acc.balance)}</p>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">الفئة</label>
                    <button type="button" onClick={() => setIsAddingCategory(true)} className="text-cyan-400 p-1.5 bg-cyan-500/10 rounded-full hover:bg-cyan-500/20 transition-all active:scale-90"><PlusIcon className="w-4 h-4" /></button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                    {categories.filter(c => c.type === type).map(cat => {
                        const Icon = (cat.icon && iconMap[cat.icon]) ? iconMap[cat.icon] : TagIcon;
                        const isSelected = selectedCategoryId === cat.id;
                        return (
                            <button key={cat.id} type="button" onClick={() => setSelectedCategoryId(cat.id)} className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 ${isSelected ? 'bg-white/10 border-white/20 ring-1 ring-white/10' : 'bg-slate-800/30 border-white/5'}`}>
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: cat.color || '#334155' }}><Icon className="w-5 h-5" /></div>
                                <span className={`text-[10px] font-bold truncate w-full text-center ${isSelected ? 'text-white' : 'text-slate-400'}`}>{cat.name}</span>
                            </button>
                        );
                    })}
                </div>
            </div>
            <div className="relative group">
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات إضافية (اختياري)..." className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all" />
                <PencilSquareIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
            </div>
            <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-2xl font-black text-lg text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50 ${type === 'income' ? 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-900/20' : 'bg-gradient-to-r from-rose-600 to-pink-600 shadow-rose-900/20'}`}>
                {isSaving ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircleIcon className="w-6 h-6" /> حفظ المعاملة</>}
            </button>
        </form>
    );
};

const TransferModal: React.FC<{ accounts: Account[]; onSuccess: () => void; onCancel: () => void; }> = ({ accounts, onSuccess, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [fromId, setFromId] = useState('');
    const [toId, setToId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const val = Number(amount);
        if (!fromId || !toId || !amount) return;
        if (fromId === toId) return toast.warning('لا يمكن التحويل لنفس الحساب');
        
        const fromAccount = accounts.find(a => a.id === fromId);
        if (fromAccount && fromAccount.balance < val) {
            if (!confirm(`رصيد حساب المصدر غير كافٍ. هل تريد الاستمرار في التحويل؟ سيصبح الرصيد سالباً.`)) return;
        }

        setIsSaving(true);
        const { data: fromAcc } = await supabase.from('accounts').select('balance, name').eq('id', fromId).single();
        const { data: toAcc } = await supabase.from('accounts').select('balance, name').eq('id', toId).single();
        if (fromAcc && toAcc) {
            await supabase.from('accounts').update({ balance: (fromAcc as Account).balance - val }).eq('id', fromId);
            await supabase.from('accounts').update({ balance: (toAcc as Account).balance + val }).eq('id', toId);
            await supabase.from('transactions').insert({
                account_id: fromId, to_account_id: toId, amount: val, type: 'transfer', date: new Date().toISOString()
            });
            logActivity(`تحويل ${formatCurrency(val)} من ${(fromAcc as Account).name} إلى ${(toAcc as Account).name}`);
            onSuccess();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="text-center py-4">
                <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required className="w-full bg-transparent text-center text-5xl font-black text-indigo-400 outline-none" />
                <p className="text-[10px] text-slate-500 font-black mt-2">مبلغ التحويل</p>
            </div>
            <div className="space-y-4">
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase px-1 mb-2 block">من حساب</label>
                    <select value={fromId} onChange={e => setFromId(e.target.value)} required className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none">
                        <option value="">اختر حساب المصدر</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                    </select>
                </div>
                <div className="flex justify-center -my-2 relative z-10">
                    <div className="bg-indigo-600 p-2 rounded-full border-4 border-slate-900 shadow-lg"><ArrowDownIcon className="w-4 h-4 text-white" /></div>
                </div>
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase px-1 mb-2 block">إلى حساب</label>
                    <select value={toId} onChange={e => setToId(e.target.value)} required className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white focus:outline-none">
                        <option value="">اختر حساب الوجهة</option>
                        {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                    </select>
                </div>
            </div>
            <button type="submit" disabled={isSaving} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all">{isSaving ? 'جاري التحويل...' : 'تأكيد التحويل'}</button>
        </form>
    );
};

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

const AddDebtWizard: React.FC<{
    contacts: Contact[];
    accounts: Account[];
    unpaidDebts: Debt[];
    onSuccess: () => void;
    onCancel: () => void;
    step: number;
    setStep: (s: number) => void;
}> = ({ contacts, accounts, unpaidDebts, onSuccess, onCancel, step, setStep }) => {
    const [type, setType] = useState<'for_you' | 'on_you'>('on_you');
    const [amount, setAmount] = useState('');
    const [contactId, setContactId] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [accountId, setAccountId] = useState(''); 
    const [desc, setDesc] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [isAddingNewContact, setIsAddingNewContact] = useState(false);
    const [newContactName, setNewContactName] = useState('');
    const toast = useToast();

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [contacts, searchTerm]);

    const getContactDebt = (id: string) => {
        const contactDebts = unpaidDebts.filter(d => d.contact_id === id);
        const forYou = contactDebts.filter(d => d.type === 'for_you').reduce((s, d) => s + d.amount, 0);
        const onYou = contactDebts.filter(d => d.type === 'on_you').reduce((s, d) => s + d.amount, 0);
        return { forYou, onYou };
    };

    const handleNewContact = async () => {
        if (!newContactName.trim()) return;
        setIsSaving(true);
        const { data, error } = await supabase.from('contacts').insert({ name: newContactName }).select().single();
        if (!error && data) {
            logActivity(`إضافة جهة اتصال جديدة: ${newContactName}`);
            setContactId(data.id);
            setIsAddingNewContact(false);
            setStep(2);
            toast.success('تمت إضافة جهة الاتصال');
        }
        setIsSaving(false);
    };

    const handleSubmit = async () => {
        if (!contactId || !amount) return;
        setIsSaving(true);
        const val = Number(amount);

        try {
            const { data: debt, error: debtError } = await supabase.from('debts').insert({
                contact_id: contactId,
                amount: val,
                type,
                due_date: dueDate || null,
                description: desc,
                paid: false
            }).select().single();

            if (debtError) throw debtError;

            if (accountId) {
                const { data: acc } = await supabase.from('accounts').select('balance, name').eq('id', accountId).single();
                if (acc) {
                    const txType = type === 'on_you' ? 'income' : 'expense'; 
                    const balanceChange = txType === 'income' ? val : -val;
                    
                    await supabase.from('accounts').update({ balance: (acc as Account).balance + balanceChange }).eq('id', accountId);
                    await supabase.from('transactions').insert({
                        account_id: accountId,
                        amount: val,
                        type: txType,
                        notes: `مرتبط بدين: ${desc || 'بدون وصف'}`,
                        date: new Date().toISOString()
                    });
                }
            }

            const contactName = contacts.find(c => c.id === contactId)?.name || 'غير معروف';
            logActivity(`تسجيل دين بقيمة ${formatCurrency(val)} لـ ${contactName} (${type === 'on_you' ? 'عليك' : 'لك'})`);
            onSuccess();
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء حفظ البيانات');
        } finally {
            setIsSaving(false);
        }
    };

    if (step === 1) return (
        <div className="space-y-4 flex flex-col h-full max-h-[60vh]">
            {!isAddingNewContact ? (
                <>
                    <div className="relative group shrink-0">
                        <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-cyan-400 transition-colors" />
                        <input 
                            type="text" 
                            placeholder="ابحث عن اسم..." 
                            value={searchTerm} 
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 pr-12 text-white focus:outline-none focus:border-cyan-500/50 transition-all" 
                        />
                        <button 
                            onClick={() => setIsAddingNewContact(true)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-600 rounded-xl text-white shadow-lg shadow-cyan-900/30 active:scale-90 transition-transform"
                        >
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                        {filteredContacts.length > 0 ? filteredContacts.map(c => {
                            const debt = getContactDebt(c.id);
                            return (
                                <button 
                                    key={c.id} 
                                    onClick={() => { setContactId(c.id); setStep(2); }}
                                    className="w-full p-4 bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 rounded-2xl text-right transition-all flex items-center justify-between group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
                                            <ContactsIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm">{c.name}</p>
                                            <div className="flex gap-2 mt-1">
                                                {debt.forYou > 0 && <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded">لك: {formatCurrency(debt.forYou)}</span>}
                                                {debt.onYou > 0 && <span className="text-[9px] font-black text-rose-400 bg-rose-400/10 px-1.5 py-0.5 rounded">عليك: {formatCurrency(debt.onYou)}</span>}
                                                {debt.forYou === 0 && debt.onYou === 0 && <span className="text-[9px] font-black text-slate-500">لا توجد ديون</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <ChevronRightIcon className="w-5 h-5 text-slate-600 group-hover:translate-x-[-4px] transition-transform" />
                                </button>
                            );
                        }) : (
                            <div className="text-center py-10 opacity-40">لا يوجد نتائج للبحث</div>
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                        <h4 className="font-bold text-white text-sm">إضافة جهة اتصال جديدة</h4>
                        <button onClick={() => setIsAddingNewContact(false)} className="text-slate-500 hover:text-white"><XMarkIcon className="w-4 h-4"/></button>
                    </div>
                    <input 
                        type="text" 
                        value={newContactName} 
                        onChange={e => setNewContactName(e.target.value)} 
                        placeholder="اسم جهة الاتصال" 
                        required 
                        autoFocus
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-500" 
                    />
                    <button 
                        onClick={handleNewContact}
                        disabled={isSaving || !newContactName.trim()}
                        className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-bold active:scale-95 transition-transform"
                    >
                        حفظ واستمرار
                    </button>
                </div>
            )}
        </div>
    );

    const contactNameSelected = contacts.find(c => c.id === contactId)?.name || 'غير معروف';
    return (
        <div className="space-y-8 animate-fade-in">
            <div className="flex bg-slate-800 p-1 rounded-2xl border border-white/5 shadow-inner">
                <button type="button" onClick={() => setType('on_you')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${type === 'on_you' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30' : 'text-slate-500 hover:text-slate-300'}`}>
                    <ArrowDownIcon className="w-4 h-4"/> دين عليك
                </button>
                <button type="button" onClick={() => setType('for_you')} className={`flex-1 py-3 rounded-xl font-black text-sm transition-all flex items-center justify-center gap-2 ${type === 'for_you' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30' : 'text-slate-500 hover:text-slate-300'}`}>
                    <ArrowUpIcon className="w-4 h-4"/> دين لك
                </button>
            </div>

            <div className="text-center relative py-4">
                <div className={`absolute inset-0 blur-[60px] opacity-10 rounded-full ${type === 'on_you' ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                <p className="text-[10px] text-slate-500 font-black uppercase mb-1 relative z-10">المبلغ لـ <span className="text-white">{contactNameSelected}</span></p>
                <div className="flex items-center justify-center gap-2 relative z-10">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        placeholder="0.00" 
                        autoFocus
                        required 
                        className={`w-full bg-transparent text-center text-6xl font-black focus:outline-none ${type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`} 
                    />
                    <span className={`text-xl font-bold ${type === 'on_you' ? 'text-rose-600' : 'text-emerald-600'}`}>د.ل</span>
                </div>
            </div>

            <div className="space-y-4 bg-slate-800/30 p-2 rounded-3xl border border-white/5">
                <div className="grid grid-cols-1 xs:grid-cols-2 gap-3">
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase px-2 mb-1 block">تاريخ الاستحقاق (اختياري)</label>
                        <div className="relative">
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500" />
                            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                        </div>
                    </div>
                    <div>
                        <label className="text-[9px] font-black text-slate-500 uppercase px-2 mb-1 block">ربط بحساب مالي (اختياري)</label>
                        <div className="relative">
                            <select value={accountId} onChange={e => setAccountId(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500 appearance-none">
                                <option value="">لا يوجد ربط مالي</option>
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>)}
                            </select>
                            <AccountsIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-[9px] font-black text-slate-500 uppercase px-2 mb-1 block">الوصف أو السبب</label>
                    <div className="relative">
                        <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="مثلاً: سلفة شخصية، غداء..." className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-500" />
                        <PencilSquareIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 pointer-events-none" />
                    </div>
                </div>
            </div>

            <button 
                onClick={handleSubmit} 
                disabled={isSaving || !amount} 
                className={`w-full py-4 rounded-2xl font-black text-lg text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${type === 'on_you' ? 'bg-gradient-to-r from-rose-600 to-pink-600 shadow-rose-900/20' : 'bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-900/20'} ${isSaving ? 'opacity-50' : ''}`}
            >
                {isSaving ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                    <>
                        <CheckCircleIcon className="w-6 h-6" />
                        تأكيد وتسجيل
                    </>
                )}
            </button>
        </div>
    );
};

const SettleDebtWizard: React.FC<{
    unpaidDebts: Debt[];
    contacts: Contact[];
    accounts: Account[];
    onSuccess: () => void;
    step: number;
    setStep: (s: number) => void;
}> = ({ unpaidDebts, contacts, accounts, onSuccess, step, setStep }) => {
    const [selectedContactId, setSelectedContactId] = useState('');
    const [selectedDebtIds, setSelectedDebtIds] = useState<Set<string>>(new Set());
    const [accountId, setAccountId] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const toast = useToast();

    const contactsWithDebts = useMemo(() => {
        return contacts.map(c => {
            const debts = unpaidDebts.filter(d => d.contact_id === c.id);
            const forYou = debts.filter(d => d.type === 'for_you').reduce((s, d) => s + d.amount, 0);
            const onYou = debts.filter(d => d.type === 'on_you').reduce((s, d) => s + d.amount, 0);
            return { ...c, forYou, onYou, totalCount: debts.length };
        }).filter(c => c.totalCount > 0 && c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [contacts, unpaidDebts, searchTerm]);

    const selectedContact = contacts.find(c => c.id === selectedContactId);
    const contactDebts = unpaidDebts.filter(d => d.contact_id === selectedContactId);

    const netImpact = useMemo(() => {
        let impact = 0;
        contactDebts.forEach(d => {
            if (selectedDebtIds.has(d.id)) {
                impact += (d.type === 'for_you' ? d.amount : -d.amount);
            }
        });
        return impact;
    }, [contactDebts, selectedDebtIds]);

    const toggleDebt = (id: string) => {
        const next = new Set(selectedDebtIds);
        if (next.has(id)) next.delete(id); else next.add(id);
        setSelectedDebtIds(next);
    };

    const selectAll = () => {
        setSelectedDebtIds(new Set(contactDebts.map(d => d.id)));
    };

    const handleFinalSubmit = async () => {
        if (!accountId || selectedDebtIds.size === 0) return;
        setIsSaving(true);

        try {
            const { data: acc } = await supabase.from('accounts').select('balance, name').eq('id', accountId).single();
            if (!acc) throw new Error("Account not found");

            for (const debtId of Array.from(selectedDebtIds)) {
                const debt = contactDebts.find(d => d.id === debtId);
                if (!debt) continue;

                await supabase.from('debts').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', debtId);

                const txType = debt.type === 'for_you' ? 'income' : 'expense';
                await supabase.from('transactions').insert({
                    account_id: accountId,
                    amount: debt.amount,
                    type: txType,
                    notes: `تسوية دين: ${debt.description || 'بدون وصف'} (لـ ${selectedContact?.name})`,
                    date: new Date().toISOString()
                });
            }

            await supabase.from('accounts').update({ balance: (acc as Account).balance + netImpact }).eq('id', accountId);

            logActivity(`تسوية ${selectedDebtIds.size} ديون لـ ${selectedContact?.name} بإجمالي صافي ${formatCurrency(Math.abs(netImpact))}`);
            onSuccess();
        } catch (err) {
            console.error(err);
            toast.error('حدث خطأ أثناء التسوية');
        } finally {
            setIsSaving(false);
        }
    };

    if (step === 1) return (
        <div className="space-y-4">
            <div className="relative">
                <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input 
                    type="text" 
                    placeholder="ابحث عن اسم..." 
                    value={searchTerm} 
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 pr-12 text-white focus:outline-none" 
                />
            </div>
            <div className="space-y-2 max-h-[50vh] overflow-y-auto no-scrollbar">
                {contactsWithDebts.length === 0 ? (
                    <div className="text-center py-10 opacity-40">لا توجد ديون معلقة حالياً</div>
                ) : (
                    contactsWithDebts.map(c => (
                        <button 
                            key={c.id} 
                            onClick={() => { setSelectedContactId(c.id); setStep(2); }}
                            className="w-full p-4 bg-slate-800/40 hover:bg-slate-800/80 border border-white/5 rounded-2xl text-right flex items-center justify-between group active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-cyan-600 transition-colors">
                                    <ContactsIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-bold text-white text-sm">{c.name}</p>
                                    <div className="flex gap-2 mt-1">
                                        {c.forYou > 0 && <span className="text-[9px] font-black text-emerald-400">لك: {formatCurrency(c.forYou)}</span>}
                                        {c.onYou > 0 && <span className="text-[9px] font-black text-rose-400">عليك: {formatCurrency(c.onYou)}</span>}
                                    </div>
                                </div>
                            </div>
                            <ChevronRightIcon className="w-5 h-5 text-slate-600" />
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    if (step === 2) return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-1">
                <h4 className="text-sm font-bold text-white">ديون مع {selectedContact?.name}</h4>
                <button onClick={selectAll} className="text-[10px] font-black text-cyan-400 hover:text-white transition-colors">تحديد الكل ({contactDebts.length})</button>
            </div>
            <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                {contactDebts.map(d => (
                    <button 
                        key={d.id} 
                        onClick={() => toggleDebt(d.id)}
                        className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-right ${selectedDebtIds.has(d.id) ? 'bg-cyan-500/10 border-cyan-500' : 'bg-slate-800/40 border-white/5 opacity-70'}`}
                    >
                        <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedDebtIds.has(d.id) ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-500'}`}>
                                {selectedDebtIds.has(d.id) ? <CheckSquareIcon className="w-5 h-5" /> : <div className="w-4 h-4 rounded border-2 border-slate-600" />}
                            </div>
                            <div>
                                <p className="text-xs font-bold text-white">{d.description || (d.type === 'for_you' ? 'دين لك' : 'دين عليك')}</p>
                                <p className="text-[9px] text-slate-500">{new Date(d.created_at).toLocaleDateString('ar-LY')}</p>
                            </div>
                        </div>
                        <span className={`text-sm font-black ${d.type === 'for_you' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(d.amount)}</span>
                    </button>
                ))}
            </div>
            <div className="bg-slate-800/80 p-5 rounded-2xl border border-white/5 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">صافي المبلغ المحدد</p>
                <p className={`text-2xl font-black ${netImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {netImpact >= 0 ? '+' : ''}{formatCurrency(netImpact)}
                </p>
            </div>
            <button 
                onClick={() => setStep(3)} 
                disabled={selectedDebtIds.size === 0}
                className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 disabled:opacity-30"
            >
                التالي: اختيار الحساب
            </button>
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="text-center py-4 bg-slate-800/50 rounded-[2rem] border border-white/5 relative overflow-hidden">
                <div className={`absolute inset-0 blur-3xl opacity-10 ${netImpact >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                <p className="text-[10px] text-slate-500 font-bold mb-1 relative z-10">إجمالي {selectedDebtIds.size} معاملات</p>
                <p className={`text-4xl font-black relative z-10 ${netImpact >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(Math.abs(netImpact))}</p>
                <p className="text-[10px] text-slate-400 font-bold mt-1 relative z-10">{netImpact >= 0 ? 'سيتم إيداعها في حسابك' : 'سيتم خصمها من حسابك'}</p>
            </div>

            <div>
                <label className="text-[10px] font-black text-slate-500 uppercase px-2 mb-2 block">الحساب المستخدم</label>
                <div className="grid grid-cols-1 gap-2">
                    {accounts.map(acc => (
                        <button 
                            key={acc.id}
                            onClick={() => setAccountId(acc.id)}
                            className={`w-full p-4 rounded-2xl border transition-all text-right flex items-center justify-between ${accountId === acc.id ? 'bg-white/10 border-white/20' : 'bg-slate-800/40 border-white/5 opacity-60'}`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${accountId === acc.id ? 'bg-cyan-500 text-white' : 'bg-slate-700 text-slate-400'}`}>
                                    {React.createElement(getAccountTypeIcon(acc.type), { className: "w-5 h-5" })}
                                </div>
                                <span className="font-bold text-sm text-white">{acc.name}</span>
                            </div>
                            <span className="text-xs font-black text-slate-400">{formatCurrency(acc.balance)}</span>
                        </button>
                    ))}
                </div>
            </div>

            <button 
                onClick={handleFinalSubmit} 
                disabled={isSaving || !accountId}
                className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
            >
                {isSaving ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : (
                    <>
                        <CheckCircleIcon className="w-6 h-6" />
                        تأكيد وإتمام التسوية
                    </>
                )}
            </button>
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
    const queryClient = useQueryClient();

    const fetchDataForModals = useCallback(async () => {
        const accPromise = supabase.from('accounts').select('*').order('name');
        const catPromise = supabase.from('categories').select('*').order('name');
        const conPromise = supabase.from('contacts').select('*').order('name');
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
        { label: 'فئة', icon: <CategoriesIcon className="w-5 h-5"/>, action: () => { setActiveModal('add-category'); setIsFabOpen(false); }, gradient: 'from-indigo-400 to-blue-500' },
    ];
    
    const modalConfig: Record<ModalType, { title: string, color: string }> = {
        expense: { title: 'تسجيل مصروف جديد', color: 'from-rose-600' },
        income: { title: 'تسجيل إيراد جديد', color: 'from-emerald-600' },
        transfer: { title: 'تحويل بين الحسابات', color: 'from-indigo-600' },
        'add-debt': { title: 'تسجيل ذمة مالية', color: 'from-amber-600' },
        'settle-debt': { title: 'تصفية وتسوية الديون', color: 'from-sky-600' },
        'add-account': { title: 'فتح حساب مالي', color: 'from-cyan-600' },
        'add-investment': { title: 'إضافة فرصة استثمارية', color: 'from-cyan-600' },
        'add-category': { title: 'إنشاء فئة جديدة', color: 'from-indigo-500' }
    };

    return (
        <>
            <div className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity duration-300 ${isFabOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsFabOpen(false)} />
            <div className="fixed bottom-4 md:bottom-8 left-1/2 -translate-x-1/2 z-[50] flex flex-col items-center pointer-events-none mb-safe">
                <div className={`flex flex-col items-center gap-3 mb-6 transition-all duration-300 ${isFabOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-10'}`}>
                    {fabActions.map((action, index) => (
                        <div key={index} className="flex items-center gap-3">
                            <span className="text-[10px] font-bold text-white bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10 shadow-lg">{action.label}</span>
                            <button onClick={action.action} className={`h-12 w-12 rounded-2xl text-white flex items-center justify-center shadow-2xl bg-gradient-to-br ${action.gradient} active:scale-90 transition-transform`}>{action.icon}</button>
                        </div>
                    ))}
                </div>
                <button onClick={() => setIsFabOpen(!isFabOpen)} className={`pointer-events-auto relative h-16 w-16 bg-slate-900 rounded-[22px] shadow-[0_0_30px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-500 z-50 border-4 border-slate-900 ${isFabOpen ? 'rotate-[135deg] bg-rose-600 border-rose-600' : ''}`}>
                    <div className={`absolute inset-0 rounded-[18px] flex items-center justify-center transition-all duration-500 ${isFabOpen ? 'opacity-0' : 'opacity-100 bg-gradient-to-tr from-cyan-500 to-blue-600'}`}><PlusIcon className="w-8 h-8 text-white" /></div>
                    {isFabOpen && <XMarkIcon className="w-8 h-8 text-white" />}
                </button>
            </div>
            {activeModal && (
                <Modal title={modalConfig[activeModal].title} headerColor={modalConfig[activeModal].color} onClose={() => { setActiveModal(null); setModalStep(1); }} showBackButton={modalStep > 1} onBack={() => setModalStep(s => s - 1)}>
                    {activeModal === 'expense' || activeModal === 'income' ? (
                        <TransactionModal 
                            type={activeModal} 
                            accounts={accounts} 
                            categories={categories} 
                            onSuccess={handleActionSuccess} 
                            onCancel={() => setActiveModal(null)} 
                            onRefreshCategories={fetchDataForModals} 
                        />
                    ) : activeModal === 'transfer' ? (
                        <TransferModal 
                            accounts={accounts} 
                            onSuccess={handleActionSuccess} 
                            onCancel={() => setActiveModal(null)} 
                        />
                    ) : activeModal === 'add-debt' ? (
                        <AddDebtWizard 
                            contacts={contacts} 
                            accounts={accounts} 
                            unpaidDebts={unpaidDebts}
                            onSuccess={handleActionSuccess} 
                            onCancel={() => setActiveModal(null)} 
                            step={modalStep} 
                            setStep={setModalStep} 
                        />
                    ) : activeModal === 'settle-debt' ? (
                        <SettleDebtWizard 
                            unpaidDebts={unpaidDebts} 
                            contacts={contacts} 
                            accounts={accounts} 
                            onSuccess={handleActionSuccess} 
                            step={modalStep} 
                            setStep={setModalStep} 
                        />
                    ) : activeModal === 'add-account' ? (
                        <AddAccountModal 
                            onSuccess={handleActionSuccess} 
                            onCancel={() => setActiveModal(null)} 
                        />
                    ) : activeModal === 'add-investment' ? (
                        <AddInvestmentModal 
                            onSuccess={handleActionSuccess} 
                            onCancel={() => setActiveModal(null)} 
                        />
                    ) : activeModal === 'add-category' ? (
                        <AddCategoryModal 
                            onSuccess={handleActionSuccess} 
                            onCancel={() => setActiveModal(null)} 
                        />
                    ) : null}
                </Modal>
            )}
        </>
    );
};

export default QuickActions;
