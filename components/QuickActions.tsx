
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Category, Contact, Debt } from '../types';
import { 
    PlusIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, HandRaisedIcon, UserPlusIcon, ArrowLeftIcon, AccountsIcon, ScaleIcon, ArrowsRightLeftIcon, CurrencyDollarIcon,
    WalletIcon, BanknoteIcon, LandmarkIcon, BriefcaseIcon, CalendarDaysIcon, TagIcon, PencilSquareIcon, iconMap
} from './icons';

type ModalType = 'expense' | 'income' | 'transfer' | 'add-debt' | 'settle-debt' | 'add-account';

const getAccountTypeIcon = (type: string) => {
    switch (type) {
        case 'بنكي': return LandmarkIcon;
        case 'نقدي': return BanknoteIcon;
        case 'مخصص': return BriefcaseIcon;
        default: return WalletIcon;
    }
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; showBackButton?: boolean; onBack?: () => void; }> = 
({ children, title, onClose, showBackButton, onBack }) => (
    <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in">
        <div className="relative w-full max-w-lg bg-slate-900/90 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
            {/* Ambient Light */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent blur-sm"></div>
            
            <div className="p-6 pb-2 shrink-0 z-10 flex justify-between items-center">
                 {showBackButton ? (
                    <button onClick={onBack} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"><ArrowLeftIcon className="w-5 h-5" /></button>
                ) : <div className="w-11"></div>}
                
                <h3 className="text-xl font-bold text-white tracking-wide">{title}</h3>
                
                <button onClick={onClose} className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors border border-white/5"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar">
                {children}
            </div>
        </div>
    </div>
);

const AddAccountModal: React.FC<{
    onSuccess: () => void;
    onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
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
            alert('حدث خطأ');
        } else {
            onSuccess();
        }
        setIsSaving(false);
    };

    const types = [
        { id: 'بنكي', icon: LandmarkIcon, label: 'بنكي' },
        { id: 'نقدي', icon: BanknoteIcon, label: 'نقدي' },
        { id: 'مخصص', icon: BriefcaseIcon, label: 'مخصص' },
    ];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Amount Input */}
            <div className="text-center space-y-2">
                <label className="text-slate-400 text-sm font-medium">الرصيد الافتتاحي</label>
                <div className="relative inline-block w-full">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={balance} 
                        onChange={e => setBalance(e.target.value)} 
                        placeholder="0.00" 
                        required 
                        className="w-full bg-transparent text-center text-5xl font-bold text-white placeholder-slate-700 focus:outline-none py-2"
                        autoFocus
                    />
                    <span className="absolute top-1/2 right-4 -translate-y-1/2 text-slate-500 font-bold text-lg pointer-events-none">د.ل</span>
                </div>
            </div>

            <div className="space-y-4 bg-slate-800/30 p-4 rounded-2xl border border-white/5">
                <div>
                    <label className="text-xs text-slate-400 font-bold mb-2 block px-1">نوع الحساب</label>
                    <div className="grid grid-cols-3 gap-3">
                        {types.map((t) => (
                            <button
                                key={t.id}
                                type="button"
                                onClick={() => setType(t.id)}
                                className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${type === t.id ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-slate-800 border-transparent text-slate-400 hover:bg-slate-700'}`}
                            >
                                <t.icon className="w-6 h-6 mb-1"/>
                                <span className="text-xs font-bold">{t.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div>
                    <label className="text-xs text-slate-400 font-bold mb-2 block px-1">اسم الحساب</label>
                    <input 
                        type="text" 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        placeholder="مثلاً: المحفظة الشخصية" 
                        required 
                        className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition" 
                    />
                </div>
            </div>

            <button type="submit" disabled={isSaving} className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-2xl transition shadow-lg shadow-cyan-900/20 font-bold text-lg disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'إنشاء الحساب'}
            </button>
        </form>
    );
};


const TransactionModal: React.FC<{
    type: 'income' | 'expense';
    accounts: Account[];
    categories: Category[];
    onSuccess: () => void;
    onCancel: () => void;
}> = ({ type, accounts, categories, onSuccess, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState(accounts.length > 0 ? accounts[0].id : '');
    const [categoryId, setCategoryId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!accountId || !amount) {
            setError('المبلغ والحساب حقول مطلوبة.');
            return;
        }
        setIsSaving(true);
        setError('');
        
        const numericAmount = Number(amount);
        const amountWithSign = type === 'income' ? numericAmount : -numericAmount;

        try {
            const { data: account, error: accError } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
            if (accError || !account) throw accError || new Error("Account not found");

            const { error: updateError } = await supabase.from('accounts').update({ balance: account.balance + amountWithSign }).eq('id', accountId);
            if (updateError) throw updateError;
            
            const finalDate = new Date(`${date}T00:00:00`);
            const now = new Date();
            finalDate.setHours(now.getHours());
            finalDate.setMinutes(now.getMinutes());
            finalDate.setSeconds(now.getSeconds());

            const { error: insertError } = await supabase.from('transactions').insert({
                amount: numericAmount,
                type,
                account_id: accountId,
                category_id: categoryId || null,
                date: finalDate.toISOString(),
                notes,
            });
            if (insertError) throw insertError;
            
            onSuccess();
        } catch (err: any) {
            console.error('Error saving transaction:', err.message);
            setError('حدث خطأ أثناء حفظ المعاملة.');
        } finally {
            setIsSaving(false);
        }
    };

    const filteredCategories = categories.filter(c => c.type === type);
    const isExpense = type === 'expense';
    const activeColor = isExpense ? 'rose' : 'emerald';
    const activeColorHex = isExpense ? '#f43f5e' : '#10b981';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             {error && <p className="text-rose-400 text-sm font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center">{error}</p>}
            
            {/* Hero Input */}
            <div className="text-center space-y-2 relative">
                <div className={`absolute inset-0 blur-3xl opacity-20 rounded-full ${isExpense ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                <label className="text-slate-400 text-sm font-medium relative z-10">المبلغ</label>
                <div className="relative inline-block w-full z-10">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        placeholder="0" 
                        required 
                        className={`w-full bg-transparent text-center text-6xl font-black placeholder-slate-800 focus:outline-none py-2 ${isExpense ? 'text-rose-400' : 'text-emerald-400'}`}
                        autoFocus
                    />
                </div>
            </div>

            <div className="space-y-5">
                {/* Account Selector - Horizontal Scroll with Icons */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 px-1">الحساب</label>
                    <div className="flex overflow-x-auto gap-3 pb-2 custom-scrollbar snap-x">
                        {accounts.map(acc => {
                            const isSelected = accountId === acc.id;
                            const TypeIcon = getAccountTypeIcon(acc.type);
                            return (
                                <button
                                    key={acc.id}
                                    type="button"
                                    onClick={() => setAccountId(acc.id)}
                                    className={`snap-start flex-shrink-0 flex items-center gap-3 p-3 pr-4 rounded-2xl border transition-all duration-300 min-w-[140px] ${isSelected ? `bg-${activeColor}-500/10 border-${activeColor}-500/50 shadow-lg shadow-${activeColor}-500/10` : 'bg-slate-800/50 border-transparent text-slate-400 hover:bg-slate-800'}`}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isSelected ? `bg-${activeColor}-500 text-white shadow-md` : 'bg-slate-700/50 text-slate-500'}`}>
                                        <TypeIcon className="w-5 h-5" />
                                    </div>
                                    <div className="text-right">
                                        <span className={`block text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-300'}`}>{acc.name}</span>
                                        <span className={`block text-[10px] font-mono ${isSelected ? `text-${activeColor}-400` : 'text-slate-500'}`}>{acc.balance}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Category Selector - Horizontal Chips with Icons */}
                <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 px-1">الفئة</label>
                    <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar snap-x">
                        <button
                            type="button"
                            onClick={() => setCategoryId('')}
                            className={`snap-start flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all ${!categoryId ? `bg-${activeColor}-500/20 border-${activeColor}-500 text-${activeColor}-400` : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:bg-slate-800'}`}
                        >
                            <TagIcon className="w-4 h-4"/>
                            <span className="text-xs font-bold whitespace-nowrap">غير مصنف</span>
                        </button>
                        {filteredCategories.map(cat => {
                            const isSelected = categoryId === cat.id;
                            const CatIcon = (cat.icon && iconMap[cat.icon]) ? iconMap[cat.icon] : TagIcon;
                            const catColor = cat.color || activeColorHex;
                            
                            return (
                                <button
                                    key={cat.id}
                                    type="button"
                                    onClick={() => setCategoryId(cat.id)}
                                    className={`snap-start flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isSelected ? 'bg-slate-800 border-white/20 shadow-inner' : 'bg-slate-800/30 border-transparent text-slate-400 hover:bg-slate-800'}`}
                                    style={isSelected ? { borderColor: catColor } : {}}
                                >
                                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ backgroundColor: catColor, color: '#fff' }}>
                                        <CatIcon className="w-4 h-4" />
                                    </div>
                                    <span className={`text-xs font-bold whitespace-nowrap ${isSelected ? 'text-white' : ''}`}>{cat.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 px-1">التاريخ</label>
                        <div className="relative">
                            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 pl-10 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none font-sans font-bold" />
                            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 px-1">ملاحظات</label>
                        <div className="relative">
                            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="اختياري..." className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3.5 pl-10 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none" />
                            <PencilSquareIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                        </div>
                    </div>
                </div>
            </div>

            <button type="submit" disabled={isSaving} className={`w-full py-4 rounded-2xl transition shadow-lg font-bold text-lg disabled:opacity-70 flex items-center justify-center gap-2 ${isExpense ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-900/20' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/20'} text-white`}>
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'حفظ العملية'}
            </button>
        </form>
    );
};

const TransferModal: React.FC<{
    accounts: Account[];
    onSuccess: () => void;
    onCancel: () => void;
}> = ({ accounts, onSuccess, onCancel }) => {
    const [fromAccountId, setFromAccountId] = useState('');
    const [toAccountId, setToAccountId] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    const fromAccountBalance = useMemo(() => {
        return accounts.find(a => a.id === fromAccountId)?.balance ?? 0;
    }, [fromAccountId, accounts]);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = Number(amount);
        if (!fromAccountId || !toAccountId || !numericAmount || numericAmount <= 0) {
            setError('يرجى ملء جميع الحقول بمبلغ صحيح.');
            return;
        }
        if (fromAccountId === toAccountId) {
            setError('لا يمكن التحويل إلى نفس الحساب.');
            return;
        }
        if (numericAmount > fromAccountBalance) {
            setError('المبلغ أكبر من الرصيد المتاح.');
            return;
        }
        
        setIsSaving(true);
        setError('');

        try {
            const fromAccount = accounts.find(a => a.id === fromAccountId);
            const toAccount = accounts.find(a => a.id === toAccountId);
            if (!fromAccount || !toAccount) throw new Error("Account not found");
            
            await supabase.from('accounts').update({ balance: fromAccount.balance - numericAmount }).eq('id', fromAccountId);
            await supabase.from('accounts').update({ balance: toAccount.balance + numericAmount }).eq('id', toAccountId);
            
            await supabase.from('transactions').insert({
                amount: numericAmount,
                type: 'transfer',
                account_id: fromAccountId,
                to_account_id: toAccountId,
                notes: notes || `تحويل من ${fromAccount.name} إلى ${toAccount.name}`,
                date: new Date().toISOString()
            });
            
            onSuccess();
        } catch (err: any) {
            console.error('Error during transfer:', err.message);
            setError('حدث خطأ أثناء عملية التحويل.');
        } finally {
            setIsSaving(false);
        }
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
             {error && <p className="text-rose-400 text-sm font-bold bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 text-center">{error}</p>}
             
             {/* Amount */}
             <div className="text-center relative">
                <label className="text-slate-400 text-sm font-medium">مبلغ التحويل</label>
                <div className="relative inline-block w-full">
                    <input 
                        type="number" 
                        step="0.01" 
                        value={amount} 
                        onChange={e => setAmount(e.target.value)} 
                        placeholder="0" 
                        required 
                        className="w-full bg-transparent text-center text-5xl font-black text-indigo-400 placeholder-slate-800 focus:outline-none py-2"
                        autoFocus
                    />
                </div>
            </div>

            {/* Flow Visual */}
            <div className="bg-slate-800/30 p-4 rounded-3xl border border-white/5 relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 bg-slate-900 rounded-full p-2 border border-white/10 shadow-xl">
                    <ArrowDownIcon className="w-5 h-5 text-indigo-400" />
                </div>

                <div className="space-y-6">
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block px-2">من حساب</label>
                        <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:border-indigo-500 focus:outline-none font-bold appearance-none">
                            <option value="" disabled>اختر المصدر</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block px-2">إلى حساب</label>
                        <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} required className="w-full bg-slate-900 border border-slate-700 rounded-2xl p-4 text-white focus:border-indigo-500 focus:outline-none font-bold appearance-none">
                            <option value="" disabled>اختر الوجهة</option>
                            {accounts.filter(a => a.id !== fromAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="relative">
                <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات التحويل (اختياري)" className="w-full bg-slate-800/50 border border-slate-700 rounded-xl p-3.5 pl-10 text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
                <PencilSquareIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
            </div>

            <button type="submit" disabled={isSaving} className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-2xl transition shadow-lg shadow-indigo-900/20 font-bold text-white text-lg disabled:opacity-70 flex items-center justify-center gap-2">
                {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'تأكيد التحويل'}
            </button>
        </form>
    );
}

const AddDebtWizard: React.FC<{
    contacts: Contact[];
    accounts: Account[];
    categories: Category[];
    onSuccess: () => void;
    onCancel: () => void;
    step: number;
    setStep: (step: number) => void;
}> = ({ contacts, accounts, categories, onSuccess, onCancel, step, setStep }) => {
    // Shared state
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [debtType, setDebtType] = useState<'on_you' | 'for_you'>('on_you');
    const [amount, setAmount] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [description, setDescription] = useState('');
    const [linkedAccountId, setLinkedAccountId] = useState('');

    // Step 1 state
    const [searchTerm, setSearchTerm] = useState('');
    const [showNewContact, setShowNewContact] = useState(false);
    const [newContactName, setNewContactName] = useState('');

    const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const handleSelectContact = (contact: Contact) => {
        setSelectedContact(contact);
        setStep(2);
    };

    const handleAddNewContact = async () => {
        if (!newContactName.trim()) return;
        const { data, error } = await supabase.from('contacts').insert({ name: newContactName }).select().single();
        if (error || !data) {
            console.error('Error adding new contact:', error?.message);
        } else {
            handleSelectContact(data as Contact);
        }
    };
    
    const handleSaveDebt = async () => {
        if (!selectedContact || !amount) return;
    
        try {
            let linkedTxId: string | null = null;
            // If it's a loan ("for_you") and linked to an account, create an expense transaction
            if (debtType === 'for_you' && linkedAccountId) {
                let debtCategoryId: string | null = null;
                const debtCategoryName = 'ديون وقروض'; // "Debts and Loans"
                let debtCategory = categories.find(c => c.name === debtCategoryName && c.type === 'expense');
    
                if (!debtCategory) {
                    const { data: newCategory, error: catError } = await supabase
                        .from('categories').insert({ name: debtCategoryName, type: 'expense', icon: 'ScaleIcon', color: '#78716c' }).select().single();
                    if (catError) {
                        console.error('Error creating debt category:', catError.message);
                    } else {
                        debtCategoryId = newCategory.id;
                    }
                } else {
                    debtCategoryId = debtCategory.id;
                }
    
                const numericAmount = Number(amount);
                const { data: account, error: accError } = await supabase.from('accounts').select('balance').eq('id', linkedAccountId).single();
                if (accError || !account) throw accError;
    
                await supabase.from('accounts').update({ balance: account.balance - numericAmount }).eq('id', linkedAccountId);
    
                const { data: newTransaction, error: txError } = await supabase.from('transactions').insert({
                    amount: numericAmount,
                    type: 'expense',
                    account_id: linkedAccountId,
                    notes: `إقراض إلى ${selectedContact.name}`,
                    date: new Date().toISOString(),
                    category_id: debtCategoryId
                }).select('id').single();
    
                if (txError || !newTransaction) throw txError || new Error("Failed to create transaction");
                linkedTxId = newTransaction.id;
            }
    
            // Insert the debt record
            await supabase.from('debts').insert({
                contact_id: selectedContact.id,
                type: debtType,
                amount: Number(amount),
                due_date: dueDate || null,
                description: description,
                paid: false,
                linked_transaction_id: linkedTxId,
                account_id: (debtType === 'for_you' && linkedAccountId) ? linkedAccountId : null,
            });
    
            onSuccess();
        } catch (err: any) {
            console.error('Error saving debt:', err.message);
            alert('حدث خطأ أثناء حفظ الدين. يرجى المحاولة مرة أخرى.');
        }
    };

    if (step === 1) {
        return (
            <div className="space-y-4">
                <input type="text" placeholder="ابحث عن اسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 focus:outline-none" autoFocus />
                
                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 pr-1">
                    {filteredContacts.map(c => (
                        <button key={c.id} onClick={() => handleSelectContact(c)} className="w-full text-right p-4 bg-slate-800/50 hover:bg-slate-800 rounded-2xl border border-white/5 hover:border-cyan-500/50 transition-all flex items-center justify-between group">
                            <span className="font-bold text-lg">{c.name}</span>
                            <ArrowLeftIcon className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors"/>
                        </button>
                    ))}
                </div>
                
                <div className="pt-2 border-t border-white/5">
                    {!showNewContact ? (
                        <button onClick={() => setShowNewContact(true)} className="w-full py-3 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:text-white hover:border-white transition flex items-center justify-center gap-2">
                            <PlusIcon className="w-5 h-5"/> إضافة جهة اتصال جديدة
                        </button>
                    ) : (
                        <div className="flex gap-2 animate-fade-in">
                            <input type="text" value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="الاسم الكامل" className="flex-grow bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" autoFocus />
                            <button onClick={handleAddNewContact} className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl transition shadow-lg"><UserPlusIcon className="w-6 h-6"/></button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="space-y-6 animate-slide-up">
                 <div className="text-center">
                     <p className="text-slate-400 text-sm mb-1">تسجيل دين مرتبط بـ</p>
                     <h2 className="text-2xl font-bold text-white">{selectedContact?.name}</h2>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <button type="button" onClick={() => setDebtType('on_you')} className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${debtType === 'on_you' ? 'bg-rose-500/10 border-rose-500 text-rose-400' : 'bg-slate-800 border-transparent text-slate-500 hover:bg-slate-700'}`}>
                        <ArrowDownIcon className="w-6 h-6"/>
                        <span className="font-bold">دين عليك (سلف)</span>
                    </button>
                    <button type="button" onClick={() => setDebtType('for_you')} className={`py-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${debtType === 'for_you' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400' : 'bg-slate-800 border-transparent text-slate-500 hover:bg-slate-700'}`}>
                        <ArrowUpIcon className="w-6 h-6"/>
                        <span className="font-bold">دين لك (قرض)</span>
                    </button>
                </div>

                 <div className="relative">
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-center text-3xl font-bold text-white focus:border-cyan-500 focus:outline-none placeholder-slate-700" autoFocus />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">د.ل</span>
                 </div>

                 {debtType === 'for_you' && (
                     <div>
                         <label className="text-xs font-bold text-slate-500 mb-1 block px-1">خصم المبلغ من حساب (اختياري)</label>
                         <select value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                             <option value="">لا تقم بالخصم</option>
                             {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance})</option>)}
                         </select>
                     </div>
                 )}

                 <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 px-1">تاريخ الاستحقاق</label>
                        <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                     </div>
                     <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 px-1">ملاحظة</label>
                        <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف قصير" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                     </div>
                 </div>

                 <button onClick={handleSaveDebt} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-2xl transition font-bold text-white text-lg shadow-lg shadow-cyan-900/20">حفظ الدين</button>
            </div>
        );
    }
    return null;
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
    const [selectedInfo, setSelectedInfo] = useState<{ contact: Contact, type: 'on_you' | 'for_you', total: number, debts: Debt[] } | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentAccountId, setPaymentAccountId] = useState('');

    const aggregatedDebts = useMemo(() => {
        const map = new Map<string, { for_you: number, on_you: number, for_you_debts: Debt[], on_you_debts: Debt[] }>();
        unpaidDebts.forEach(debt => {
            const contactId = debt.contact_id;
            if (!contactId) return;
            if (!map.has(contactId)) map.set(contactId, { for_you: 0, on_you: 0, for_you_debts: [], on_you_debts: [] });
            
            const entry = map.get(contactId)!;
            if (debt.type === 'for_you') {
                entry.for_you += debt.amount;
                entry.for_you_debts.push(debt);
            } else {
                entry.on_you += debt.amount;
                entry.on_you_debts.push(debt);
            }
        });
        return Array.from(map.entries()).map(([contactId, totals]) => ({ contact: contacts.find(c => c.id === contactId)!, ...totals })).filter(item => item.contact);
    }, [unpaidDebts, contacts]);
    
    const handleSelect = (info: { contact: Contact, type: 'on_you' | 'for_you', total: number, debts: Debt[] }) => {
        setSelectedInfo(info);
        setPaymentAmount(info.total.toString());
        setStep(2);
    };
    
    const handleSettle = async () => {
        if(!selectedInfo || !paymentAccountId || !paymentAmount) return;
        const numericPayment = Number(paymentAmount);
        
        try {
            let remainingPayment = numericPayment;
            const debtsToSettle = selectedInfo.debts.sort((a,b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime());

            for (const debt of debtsToSettle) {
                if(remainingPayment <= 0) break;
                const paymentForThisDebt = Math.min(remainingPayment, debt.amount);
                const newDebtAmount = debt.amount - paymentForThisDebt;
                await supabase.from('debts').update({ amount: newDebtAmount, paid: newDebtAmount <= 0 }).eq('id', debt.id);
                remainingPayment -= paymentForThisDebt;
            }
            
            const incomeOrExpense = selectedInfo.type === 'for_you' ? 'income' : 'expense';
            const sign = incomeOrExpense === 'income' ? 1 : -1;
            
            let debtCategoryId: string | null = null;
            const categoryType = incomeOrExpense;
            const categoryName = categoryType === 'income' ? 'تحصيل ديون' : 'ديون وقروض';
            const categoryIcon = categoryType === 'income' ? 'CurrencyDollarIcon' : 'ScaleIcon';
            const categoryColor = categoryType === 'income' ? '#34d399' : '#78716c';

            let debtCategory = categories.find(c => c.name === categoryName && c.type === categoryType);
            
            if (!debtCategory) {
                const { data: newCategory, error: catError } = await supabase
                    .from('categories')
                    .insert({ name: categoryName, type: categoryType, icon: categoryIcon, color: categoryColor }).select().single();
                if (catError) { console.error(`Error creating ${categoryType} debt category:`, catError.message); } 
                else { debtCategoryId = newCategory.id; }
            } else {
                debtCategoryId = debtCategory.id;
            }

            const { data: account } = await supabase.from('accounts').select('balance').eq('id', paymentAccountId).single();
            if(!account) throw new Error("Account not found");
            await supabase.from('accounts').update({ balance: account.balance + (numericPayment * sign) }).eq('id', paymentAccountId);
            
            await supabase.from('transactions').insert({
                amount: numericPayment, type: incomeOrExpense, account_id: paymentAccountId,
                notes: `تسوية دين مع ${selectedInfo.contact.name}`, date: new Date().toISOString(),
                category_id: debtCategoryId
            });

            onSuccess();
        } catch(err: any) {
            console.error('Error settling debt:', err.message);
        }
    };
    
    if(step === 1) {
        return (
             <div className="max-h-80 overflow-y-auto space-y-3 custom-scrollbar">
                 {aggregatedDebts.map(({ contact, for_you, on_you, for_you_debts, on_you_debts }) => (
                    <React.Fragment key={contact.id}>
                        {on_you > 0 && <button onClick={() => handleSelect({contact, type: 'on_you', total: on_you, debts: on_you_debts})} className="w-full flex justify-between items-center p-4 bg-slate-800/30 hover:bg-slate-800 rounded-2xl border border-white/5 hover:border-rose-500/30 transition-all group">
                            <span className="font-bold text-white group-hover:text-rose-400 transition-colors">{contact.name}</span>
                            <span className="text-rose-400 font-bold bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">{on_you} د.ل</span>
                        </button>}
                        {for_you > 0 && <button onClick={() => handleSelect({contact, type: 'for_you', total: for_you, debts: for_you_debts})} className="w-full flex justify-between items-center p-4 bg-slate-800/30 hover:bg-slate-800 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all group">
                            <span className="font-bold text-white group-hover:text-emerald-400 transition-colors">{contact.name}</span>
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">{for_you} د.ل</span>
                        </button>}
                    </React.Fragment>
                ))}
                {aggregatedDebts.length === 0 && <p className="text-slate-400 text-center py-8">لا توجد ديون غير مسددة.</p>}
            </div>
        );
    }
    
    if(step === 2 && selectedInfo) {
         return (
             <div className="space-y-6 animate-slide-up">
                 <div className="text-center">
                     <p className="text-slate-400 text-sm mb-1">تسوية دين مع</p>
                     <h2 className="text-2xl font-bold text-white">{selectedInfo.contact.name}</h2>
                 </div>

                 <div className="bg-slate-800/50 p-6 rounded-3xl text-center border border-white/5">
                    <span className="text-sm text-slate-400 block mb-2 font-medium">إجمالي المستحق</span>
                    <span className={`font-extrabold text-4xl ${selectedInfo.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedInfo.total} <span className="text-lg text-white/50">د.ل</span></span>
                 </div>

                 <div className="space-y-4">
                     <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block px-2">المبلغ المدفوع</label>
                        <input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="0.00" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-lg font-bold focus:border-cyan-500 focus:outline-none" />
                     </div>
                     
                     <div>
                        <label className="text-xs font-bold text-slate-500 mb-1 block px-2">حساب الدفع</label>
                        <select value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:border-cyan-500 focus:outline-none appearance-none">
                            <option value="" disabled>اختر حساب الدفع</option>
                            {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                    </div>
                </div>

                <button onClick={handleSettle} className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 rounded-2xl transition font-bold text-white text-lg shadow-lg shadow-cyan-900/20">تأكيد التسوية</button>
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
        let description = 'تم تحديث البيانات'; // Default
        switch (activeModal) {
            case 'expense': description = 'إضافة مصروف جديد'; break;
            case 'income': description = 'إضافة إيراد جديد'; break;
            case 'transfer': description = 'إجراء تحويل مالي'; break;
            case 'add-debt': description = 'إضافة دين جديد'; break;
            case 'settle-debt': description = 'تسوية دين'; break;
            case 'add-account': description = 'إضافة حساب جديد'; break;
        }
        setActiveModal(null);
        setModalStep(1);
        setIsFabOpen(false);
        onActionSuccess(description);
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
        // Core Transactions
        { label: 'إضافة مصروف', icon: <ArrowUpIcon className="w-6 h-6"/>, action: () => openModal('expense'), gradient: 'from-rose-500 to-pink-600' },
        { label: 'إضافة إيراد', icon: <ArrowDownIcon className="w-6 h-6"/>, action: () => openModal('income'), gradient: 'from-emerald-500 to-teal-600' },
        { label: 'تحويل', icon: <ArrowsRightLeftIcon className="w-6 h-6"/>, action: () => openModal('transfer'), gradient: 'from-violet-500 to-indigo-600' },
        // Debt Management
        { label: 'إضافة دين', icon: <HandRaisedIcon className="w-6 h-6"/>, action: () => openModal('add-debt'), gradient: 'from-amber-500 to-orange-600' },
        { label: 'تسوية دين', icon: <ScaleIcon className="w-6 h-6"/>, action: () => openModal('settle-debt'), gradient: 'from-sky-500 to-blue-600' },
        // Entity Creation
        { label: 'إضافة حساب', icon: <AccountsIcon className="w-6 h-6"/>, action: () => openModal('add-account'), gradient: 'from-slate-600 to-slate-700' },
    ];
    
    const modalTitles: Record<ModalType, string> = {
        expense: 'مصروف جديد',
        income: 'إيراد جديد',
        transfer: 'تحويل أموال',
        'add-debt': 'تسجيل دين',
        'settle-debt': 'تسوية الديون',
        'add-account': 'حساب جديد'
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
            default:
                return null;
        }
    }


    return (
        <>
            {/* Scrim Overlay */}
            <div
                className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity duration-300 ease-in-out ${isFabOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsFabOpen(false)}
                aria-hidden="true"
            />
            
            {/* FAB and Actions Container */}
            <div className="fixed bottom-28 md:bottom-10 left-6 z-50 flex flex-col items-center gap-4 pointer-events-none">
                {/* Actions List */}
                <div className={`flex flex-col-reverse items-center gap-3 transition-all duration-300 mb-2 ${isFabOpen ? 'translate-y-0 opacity-100 pointer-events-auto' : 'translate-y-4 opacity-0 pointer-events-none'}`}>
                    {fabActions.map((action, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-3"
                            style={{ transitionDelay: `${isFabOpen ? index * 30 : 0}ms` }}
                        >
                             <span className="bg-slate-900/90 text-slate-200 text-xs font-bold py-1.5 px-3 rounded-lg shadow-xl backdrop-blur-md border border-slate-700 whitespace-nowrap animate-fade-in">
                                {action.label}
                            </span>
                             <button onClick={action.action} className={`h-11 w-11 rounded-full text-white flex items-center justify-center shadow-lg shadow-black/50 hover:brightness-110 transition-all hover:scale-110 active:scale-95 border border-white/10 bg-gradient-to-br ${action.gradient}`}>
                                {action.icon}
                            </button>
                        </div>
                    ))}
                </div>

                {/* FAB Button */}
                <button
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    className={`pointer-events-auto group relative h-14 w-14 md:h-16 md:w-16 bg-slate-900 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-300 z-50 border border-cyan-500/30 overflow-visible hover:scale-105 active:scale-95 ${isFabOpen ? 'rotate-45 bg-slate-800 border-rose-500/50 text-rose-500 shadow-rose-500/20' : 'text-cyan-400'}`}
                    aria-haspopup="true"
                    aria-expanded={isFabOpen}
                    aria-label={isFabOpen ? 'إغلاق الإجراءات السريعة' : 'فتح الإجراءات السريعة'}
                >
                    {!isFabOpen && <span className="absolute inset-0 rounded-full border border-cyan-400/30 animate-ping-slow"></span>}
                    <PlusIcon className="w-8 h-8 transition-transform duration-300" />
                </button>
            </div>
            
            {activeModal && (
                <Modal 
                  title={modalTitles[activeModal]}
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
