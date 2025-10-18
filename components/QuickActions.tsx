import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Category, Contact, Debt } from '../types';
// Fix: Add missing icon imports
import { 
    PlusIcon, XMarkIcon, ArrowUpIcon, ArrowDownIcon, HandRaisedIcon, ArrowPathRoundedSquareIcon, CurrencyDollarIcon, UserPlusIcon, ArrowLeftIcon, AccountsIcon 
} from './icons';

type ModalType = 'expense' | 'income' | 'transfer' | 'add-debt' | 'settle-debt' | 'add-account';

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; showBackButton?: boolean; onBack?: () => void; }> = 
({ children, title, onClose, showBackButton, onBack }) => (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700 shadow-xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
                 {showBackButton ? (
                    <button onClick={onBack} className="text-slate-400 hover:text-white transition-colors"><ArrowLeftIcon className="w-6 h-6" /></button>
                ) : <div className="w-6"></div>}
                <h3 className="text-lg font-bold text-center">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
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
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم الحساب" required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <select value={type} onChange={e => setType(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                <option value="بنكي">بنكي</option>
                <option value="نقدي">نقدي</option>
                <option value="مخصص">مخصص</option>
            </select>
            <input type="number" step="0.01" value={balance} onChange={e => setBalance(e.target.value)} placeholder="الرصيد الافتتاحي" required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الحساب'}
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
            
            const { error: insertError } = await supabase.from('transactions').insert({
                amount: numericAmount,
                type,
                account_id: accountId,
                category_id: categoryId || null,
                date: new Date(date).toISOString(),
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
             {error && <p className="text-red-400 text-sm">{error}</p>}
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <select value={accountId} onChange={e => setAccountId(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                <option value="" disabled>اختر الحساب</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
            </select>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                <option value="">اختر الفئة</option>
                {filteredCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات (اختياري)" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <div className="flex justify-end pt-2">
                 <button type="submit" disabled={isSaving} className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500">
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
             {error && <p className="text-red-400 text-sm">{error}</p>}
             <div>
                <label className="text-sm">من حساب</label>
                <select value={fromAccountId} onChange={e => setFromAccountId(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                    <option value="" disabled>اختر حساب المصدر</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{`${acc.name} (${acc.balance} ${acc.currency})`}</option>)}
                </select>
             </div>
             <div>
                <label className="text-sm">إلى حساب</label>
                <select value={toAccountId} onChange={e => setToAccountId(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                    <option value="" disabled>اختر حساب الوجهة</option>
                    {accounts.filter(a => a.id !== fromAccountId).map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
            </div>
            <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="ملاحظات (اختياري)" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <div className="flex justify-end pt-2">
                 <button type="submit" disabled={isSaving} className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500">
                    {isSaving ? 'جاري التحويل...' : 'تأكيد التحويل'}
                </button>
            </div>
        </form>
    );
}

// And so on for AddDebtWizard and SettleDebtWizard...
const AddDebtWizard: React.FC<{
    contacts: Contact[];
    accounts: Account[];
    onSuccess: () => void;
    onCancel: () => void;
    step: number;
    setStep: (step: number) => void;
}> = ({ contacts, accounts, onSuccess, step, setStep }) => {
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
        if(!selectedContact || !amount) return;
        
        try {
            // If it's a loan ("for_you") and linked to an account, create an expense transaction
            if (debtType === 'for_you' && linkedAccountId) {
                const numericAmount = Number(amount);
                const { data: account, error: accError } = await supabase.from('accounts').select('balance').eq('id', linkedAccountId).single();
                if (accError || !account) throw accError;
                
                await supabase.from('accounts').update({ balance: account.balance - numericAmount }).eq('id', linkedAccountId);
                await supabase.from('transactions').insert({
                    amount: numericAmount, type: 'expense', account_id: linkedAccountId,
                    notes: `إقراض إلى ${selectedContact.name}`, date: new Date().toISOString()
                });
            }

            await supabase.from('debts').insert({
                contact_id: selectedContact.id, type: debtType, amount: Number(amount),
                due_date: dueDate || null, description: description, paid: false,
            });

            onSuccess();
        } catch(err: any) {
            console.error('Error saving debt:', err.message);
        }
    };

    if (step === 1) {
        return (
            <div className="space-y-3">
                <input type="text" placeholder="ابحث عن اسم..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                <div className="max-h-60 overflow-y-auto">
                    {filteredContacts.map(c => <button key={c.id} onClick={() => handleSelectContact(c)} className="w-full text-right p-2 hover:bg-slate-700 rounded">{c.name}</button>)}
                </div>
                 <button onClick={() => setShowNewContact(!showNewContact)} className="text-cyan-400 text-sm mt-2">{showNewContact ? 'إلغاء' : 'أو إضافة جهة اتصال جديدة'}</button>
                {showNewContact && (
                    <div className="flex gap-2 mt-2">
                        <input type="text" value={newContactName} onChange={e => setNewContactName(e.target.value)} placeholder="اسم جهة الاتصال" className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                        <button onClick={handleAddNewContact} className="bg-cyan-600 p-2 rounded-md"><UserPlusIcon className="w-5 h-5"/></button>
                    </div>
                )}
            </div>
        );
    }

    if (step === 2) {
        return (
            <div className="space-y-4">
                 <p className="text-center text-slate-400">إضافة دين لـ <span className="font-bold text-white">{selectedContact?.name}</span></p>
                 <div className="flex gap-4">
                    <button type="button" onClick={() => setDebtType('on_you')} className={`w-full p-2 rounded-md ${debtType === 'on_you' ? 'bg-red-500 text-white' : 'bg-slate-700'}`}>دين عليك</button>
                    <button type="button" onClick={() => setDebtType('for_you')} className={`w-full p-2 rounded-md ${debtType === 'for_you' ? 'bg-green-500 text-white' : 'bg-slate-700'}`}>دين لك</button>
                </div>
                 <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="المبلغ" required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                 {debtType === 'for_you' && (
                     <select value={linkedAccountId} onChange={e => setLinkedAccountId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                         <option value="">خصم من حساب (اختياري)</option>
                         {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                     </select>
                 )}
                 <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                 <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="الوصف (اختياري)" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                 <button onClick={handleSaveDebt} className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition">حفظ الدين</button>
            </div>
        );
    }
    return null;
};

const SettleDebtWizard: React.FC<{
    unpaidDebts: Debt[];
    contacts: Contact[];
    accounts: Account[];
    onSuccess: () => void;
    step: number;
    setStep: (step: number) => void;
}> = ({ unpaidDebts, contacts, accounts, onSuccess, step, setStep }) => {
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
            const { data: account } = await supabase.from('accounts').select('balance').eq('id', paymentAccountId).single();
            if(!account) throw new Error("Account not found");
            await supabase.from('accounts').update({ balance: account.balance + (numericPayment * sign) }).eq('id', paymentAccountId);
            
            await supabase.from('transactions').insert({
                amount: numericPayment, type: incomeOrExpense, account_id: paymentAccountId,
                notes: `تسديد دين لـ ${selectedInfo.contact.name}`, date: new Date().toISOString()
            });

            onSuccess();
        } catch(err: any) {
            console.error('Error settling debt:', err.message);
        }
    };
    
    if(step === 1) {
        return (
             <div className="max-h-80 overflow-y-auto space-y-2">
                 {aggregatedDebts.map(({ contact, for_you, on_you, for_you_debts, on_you_debts }) => (
                    <React.Fragment key={contact.id}>
                        {on_you > 0 && <button onClick={() => handleSelect({contact, type: 'on_you', total: on_you, debts: on_you_debts})} className="w-full flex justify-between items-center p-2 hover:bg-slate-700 rounded"><span className="font-semibold">{contact.name}</span><span className="text-red-400 font-bold">{on_you} د.ل</span></button>}
                        {for_you > 0 && <button onClick={() => handleSelect({contact, type: 'for_you', total: for_you, debts: for_you_debts})} className="w-full flex justify-between items-center p-2 hover:bg-slate-700 rounded"><span className="font-semibold">{contact.name}</span><span className="text-green-400 font-bold">{for_you} د.ل</span></button>}
                    </React.Fragment>
                ))}
                {aggregatedDebts.length === 0 && <p className="text-slate-400 text-center py-4">لا توجد ديون غير مسددة.</p>}
            </div>
        );
    }
    
    if(step === 2 && selectedInfo) {
         return (
             <div className="space-y-4">
                 <p className="text-center text-slate-400">تسديد دين لـ <span className="font-bold text-white">{selectedInfo.contact.name}</span></p>
                 <div className="bg-slate-700/50 p-2 rounded text-center">
                    <span className="text-sm">إجمالي المستحق: </span>
                    <span className={`font-bold text-lg ${selectedInfo.type === 'on_you' ? 'text-red-400' : 'text-green-400'}`}>{selectedInfo.total} د.ل</span>
                 </div>
                 <input type="number" step="0.01" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="المبلغ" required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
                 <select value={paymentAccountId} onChange={e => setPaymentAccountId(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white">
                    <option value="" disabled>اختر حساب الدفع</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                </select>
                <button onClick={handleSettle} className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition">تأكيد التسديد</button>
             </div>
         );
    }
    return null;
}

// Main Component
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
        { label: 'إضافة مصروف', icon: <ArrowUpIcon className="w-6 h-6"/>, action: () => openModal('expense'), color: 'bg-red-500' },
        { label: 'إضافة إيراد', icon: <ArrowDownIcon className="w-6 h-6"/>, action: () => openModal('income'), color: 'bg-green-500' },
        { label: 'إضافة حساب', icon: <AccountsIcon className="w-6 h-6"/>, action: () => openModal('add-account'), color: 'bg-blue-500' },
        { label: 'إضافة دين', icon: <HandRaisedIcon className="w-6 h-6"/>, action: () => openModal('add-debt'), color: 'bg-amber-500' },
        { label: 'تحويل', icon: <ArrowPathRoundedSquareIcon className="w-6 h-6"/>, action: () => openModal('transfer'), color: 'bg-indigo-500' },
        { label: 'تسديد دين', icon: <CurrencyDollarIcon className="w-6 h-6"/>, action: () => openModal('settle-debt'), color: 'bg-sky-500' },
    ];
    
    const modalTitles: Record<ModalType, string> = {
        expense: 'إضافة مصروف جديد',
        income: 'إضافة إيراد جديد',
        transfer: 'تحويل أموال',
        'add-debt': 'إضافة دين جديد',
        'settle-debt': 'تسديد دين',
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
                return <AddDebtWizard contacts={contacts} accounts={accounts} onSuccess={handleActionSuccess} onCancel={closeModal} step={modalStep} setStep={setModalStep} />;
            case 'settle-debt':
                return <SettleDebtWizard unpaidDebts={unpaidDebts} contacts={contacts} accounts={accounts} onSuccess={handleActionSuccess} step={modalStep} setStep={setModalStep} />
            case 'add-account':
                return <AddAccountModal onSuccess={handleActionSuccess} onCancel={closeModal} />;
            default:
                return null;
        }
    }


    return (
        <>
            <div className="fixed bottom-20 right-4 z-20 flex flex-col items-center gap-3">
                 {isFabOpen && (
                    <div className="flex flex-col-reverse items-end gap-3 animate-fade-in-fast">
                        {fabActions.map((action, index) => (
                             <div key={index} className="flex items-center gap-3 w-full justify-end">
                                <span className="bg-slate-800 text-white text-sm py-1 px-3 rounded-md shadow-lg">{action.label}</span>
                                <button onClick={action.action} className={`${action.color} h-12 w-12 rounded-full text-white flex items-center justify-center shadow-lg hover:opacity-90 transition`}>
                                    {action.icon}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
                <button onClick={() => setIsFabOpen(!isFabOpen)} className="h-16 w-16 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90 z-10">
                    {isFabOpen ? <XMarkIcon className="w-8 h-8"/> : <PlusIcon className="w-8 h-8"/>}
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