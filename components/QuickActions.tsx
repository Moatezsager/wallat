import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Category, Contact, Debt } from '../types';
import { 
    PlusIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, HandRaisedIcon, UserPlusIcon, ArrowLeftIcon, AccountsIcon, ScaleIcon, ArrowsRightLeftIcon, CurrencyDollarIcon 
} from './icons';

type ModalType = 'expense' | 'income' | 'transfer' | 'add-debt' | 'settle-debt' | 'add-account';

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; showBackButton?: boolean; onBack?: () => void; }> = 
({ children, title, onClose, showBackButton, onBack }) => (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
        <div className="glass-card bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
                 {showBackButton ? (
                    <button onClick={onBack} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><ArrowLeftIcon className="w-5 h-5" /></button>
                ) : <div className="w-9"></div>}
                <h3 className="text-xl font-bold text-white text-center">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            {children}
        </div>
    </div>
);

const AddAccountModal: React.FC<{
    onSuccess: () => void;
    onCancel: () => void;
}> = ({ onSuccess, onCancel }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('بنكي');
    const [balance, setBalance] = useState('0');
    const [currency, setCurrency] = useState('د.ل');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const accountData = { name, type, balance: parseFloat(balance), currency };

        const { error } = await supabase.from('accounts').insert(accountData);

        if (error) {
            console.error('Error saving account:', error.message);
            alert('حدث خطأ');
        } else {
            onSuccess();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم الحساب" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                <option value="بنكي">بنكي</option>
                <option value="نقدي">نقدي</option>
                <option value="مخصص">مخصص</option>
            </select>
            <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="الرصيد الافتتاحي" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-3 px-6 text-slate-400 hover:text-white font-bold transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-3 px-8 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition shadow-lg font-bold disabled:opacity-70">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
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
}> = ({ type, accounts, categories, onSuccess, onCancel }) => {
    const [amount, setAmount] = useState('');
    const [accountId, setAccountId] = useState('');
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
            // Get current account balance
            const { data: account, error: accError } = await supabase.from('accounts').select('balance').eq('id', accountId).single();
            if (accError || !account) throw accError || new Error("Account not found");

            // Update balance and insert transaction
            const { error: updateError } = await supabase.from('accounts').update({ balance: account.balance + amountWithSign }).eq('id', accountId);
            if (updateError) throw updateError;
            
            const finalDate = new Date(`${date}T00:00:00`); // Make sure it's parsed as local midnight
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

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
             {error && <p className="text-rose-400 text-sm font-bold bg-rose-500/10 p-2 rounded-lg">{error}</p>}
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
            <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                <option value="" disabled>اختر الحساب</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                <option value="">اختر الفئة</option>
                {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات (اختياري)" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
            <div className="flex justify-end pt-4">
                 <button type="submit" disabled={isSaving} className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl transition font-bold text-white shadow-lg disabled:opacity-70">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
            </div>
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
            
            // Perform updates
            await supabase.from('accounts').update({ balance: fromAccount.balance - numericAmount }).eq('id', fromAccountId);
            await supabase.from('accounts').update({ balance: toAccount.balance + numericAmount }).eq('id', toAccountId);
            
            // Log transaction
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
        <form onSubmit={handleSubmit} className="space-y-4">
             {error && <p className="text-rose-400 text-sm font-bold bg-rose-500/10 p-2 rounded-lg">{error}</p>}
             <div>
                <label className="text-sm text-slate-400 mb-1 block">من حساب</label>
                <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                    <option value="" disabled>اختر حساب المصدر</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{`${acc.name} (${acc.balance} ${acc.currency})`}</option>)}
                </select>
             </div>
             <div>
                <label className="text-sm text-slate-400 mb-1 block">إلى حساب</label>
                <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                    <option value="" disabled>اختر حساب الوجهة</option>
                    {accounts.filter(a => a.id !== fromAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات (اختياري)" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
            <div className="flex justify-end pt-4">
                 <button type="submit" disabled={isSaving} className="w-full py-3 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl transition font-bold text-white shadow-lg disabled:opacity-70">
                    {isSaving ? 'جاري التحويل...' : 'تأكيد التحويل'}
                </button>
            </div>
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
                <input type="text" placeholder="ابحث عن اسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2">
                    {filteredContacts.map(c => <button key={c.id} onClick={() => handleSelectContact(c)} className="w-full text-right p-3 hover:bg-slate-800 rounded-xl border border-transparent hover:border-white/5 transition-all flex items-center justify-between group">
                        <span className="font-bold">{c.name}</span>
                        <ArrowLeftIcon className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-cyan-400"/>
                    </button>)}
                </div>
                 <button onClick={() => setShowNewContact(!showNewContact)} className="text-cyan-400 text-sm mt-2 font-bold hover:underline">{showNewContact ? 'إلغاء' : 'أو إضافة جهة اتصال جديدة'}</button>
                {showNewContact && (
                    <div className="flex gap-2 mt-2 animate-fade-in">
                        <input type="text" value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="اسم جهة الاتصال" className="flex-grow bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                        <button onClick={handleAddNewContact} className="bg-cyan-600 hover:bg-cyan-500 text-white p-3 rounded-xl transition shadow-lg"><UserPlusIcon className="w-5 h-5"/></button>
                    </div>
                )}
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="space-y-4 animate-slide-up">
                 <p className="text-center text-slate-400">إضافة دين لـ <span className="font-bold text-white text-lg block mt-1">{selectedContact?.name}</span></p>
                 <div className="flex gap-4">
                    <button type="button" onClick={() => setDebtType('on_you')} className={`w-full py-3 rounded-xl transition font-bold ${debtType === 'on_you' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-800 text-slate-400'}`}>دين عليك</button>
                    <button type="button" onClick={() => setDebtType('for_you')} className={`w-full py-3 rounded-xl transition font-bold ${debtType === 'for_you' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-800 text-slate-400'}`}>دين لك</button>
                </div>
                 <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                 {debtType === 'for_you' && (
                     <select value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                         <option value="">خصم من حساب (اختياري)</option>
                         {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                     </select>
                 )}
                 <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                 <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="الوصف (اختياري)" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                 <button onClick={handleSaveDebt} className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl transition font-bold text-white shadow-lg mt-2">حفظ الدين</button>
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
                        {on_you > 0 && <button onClick={() => handleSelect({contact, type: 'on_you', total: on_you, debts: on_you_debts})} className="w-full flex justify-between items-center p-3 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                            <span className="font-bold text-white group-hover:text-cyan-400 transition-colors">{contact.name}</span>
                            <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-1 rounded-lg">{on_you} د.ل</span>
                        </button>}
                        {for_you > 0 && <button onClick={() => handleSelect({contact, type: 'for_you', total: for_you, debts: for_you_debts})} className="w-full flex justify-between items-center p-3 hover:bg-slate-800 rounded-xl border border-white/5 hover:border-white/10 transition-all group">
                            <span className="font-bold text-white group-hover:text-cyan-400 transition-colors">{contact.name}</span>
                            <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-1 rounded-lg">{for_you} د.ل</span>
                        </button>}
                    </React.Fragment>
                ))}
                {aggregatedDebts.length === 0 && <p className="text-slate-400 text-center py-8">لا توجد ديون غير مسددة.</p>}
            </div>
        );
    }
    
    if(step === 2 && selectedInfo) {
         return (
             <div className="space-y-4 animate-slide-up">
                 <p className="text-center text-slate-400">تسوية دين مع <span className="font-bold text-white text-lg block mt-1">{selectedInfo.contact.name}</span></p>
                 <div className="bg-slate-800/50 p-4 rounded-2xl text-center border border-white/5">
                    <span className="text-sm text-slate-400 block mb-1">إجمالي المستحق</span>
                    <span className={`font-extrabold text-3xl ${selectedInfo.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedInfo.total} <span className="text-lg">د.ل</span></span>
                 </div>
                 <input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="المبلغ المدفوع" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" />
                 <select value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none">
                    <option value="" disabled>اختر حساب الدفع</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                <button onClick={handleSettle} className="w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-xl transition font-bold text-white shadow-lg mt-2">تأكيد التسوية</button>
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
        expense: 'إضافة مصروف جديد',
        income: 'إضافة إيراد جديد',
        transfer: 'تحويل أموال',
        'add-debt': 'إضافة دين جديد',
        'settle-debt': 'تسوية دين',
        'add-account': 'إضافة حساب جديد'
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
                className={`fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-30 transition-opacity duration-300 ease-in-out ${isFabOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsFabOpen(false)}
                aria-hidden="true"
            />
            
            {/* FAB and Actions Container - Moved to Left Side for better UX with RTL Sidebar */}
            <div className="fixed bottom-24 md:bottom-10 left-6 z-30 flex flex-col items-start gap-5">
                {/* Actions List */}
                <div className={`flex flex-col-reverse items-start gap-4 transition-all duration-300 ${isFabOpen ? 'visible' : 'invisible'}`}>
                    {fabActions.map((action, index) => (
                        <div
                            key={index}
                            className={`flex items-center gap-4 transition-all duration-300 ease-out ${isFabOpen ? 'translate-x-0 opacity-100' : '-translate-x-8 opacity-0'}`}
                            style={{ transitionDelay: `${index * 40}ms` }}
                        >
                            <button onClick={action.action} className={`bg-gradient-to-br ${action.gradient} h-12 w-12 rounded-2xl text-white flex items-center justify-center flex-shrink-0 shadow-lg shadow-black/30 hover:brightness-110 transition-all hover:scale-105 active:scale-95 border border-white/10`}>
                                {action.icon}
                            </button>
                            <span className="bg-slate-800/80 backdrop-blur-md text-white text-sm font-bold py-1.5 px-4 rounded-xl shadow-lg whitespace-nowrap border border-white/5">{action.label}</span>
                        </div>
                    ))}
                </div>

                {/* FAB Button */}
                <button
                    onClick={() => setIsFabOpen(!isFabOpen)}
                    className="group relative h-16 w-16 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-[24px] shadow-2xl shadow-cyan-500/30 flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 z-10 border border-white/20 overflow-hidden"
                    aria-haspopup="true"
                    aria-expanded={isFabOpen}
                    aria-label={isFabOpen ? 'إغلاق الإجراءات السريعة' : 'فتح الإجراءات السريعة'}
                >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/20 to-transparent translate-y-full group-hover:translate-y-0 transition-transform duration-500 rounded-[24px]" />
                    <PlusIcon className={`w-8 h-8 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isFabOpen ? 'rotate-[135deg]' : ''}`} />
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