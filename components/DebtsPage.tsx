
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Contact, Account, Category } from '../types';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { 
    PlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, 
    FunnelIcon, MagnifyingGlassIcon, ContactsIcon, CalendarDaysIcon, DocumentTextIcon 
} from './icons';
import { logActivity } from '../lib/logger';

// Helpers
const getDebtStatus = (dueDate: string | null): 'ok' | 'due_soon' | 'overdue' => { 
    if (!dueDate) return 'ok'; 
    const today = new Date(); 
    today.setHours(0, 0, 0, 0); 
    const due = new Date(dueDate); 
    const diffTime = due.getTime() - today.getTime(); 
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays < 0) return 'overdue'; 
    if (diffDays <= 7) return 'due_soon'; 
    return 'ok'; 
};

const getDueDateInfo = (dueDate: string | null): { text: string; colorClass: string; isUrgent: boolean } => { 
    if (!dueDate) return { text: 'غير محدد', colorClass: 'text-slate-500', isUrgent: false }; 
    const today = new Date(); 
    today.setHours(0, 0, 0, 0); 
    const due = new Date(dueDate); 
    due.setHours(0, 0, 0, 0); 
    const diffTime = due.getTime() - today.getTime(); 
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    if (diffDays < 0) { const days = Math.abs(diffDays); return { text: `متأخر منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`, colorClass: 'text-rose-400', isUrgent: true }; } 
    if (diffDays === 0) { return { text: 'مستحق اليوم', colorClass: 'text-amber-400 font-bold', isUrgent: true }; } 
    if (diffDays <= 7) { return { text: `بعد ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`, colorClass: 'text-amber-400', isUrgent: true }; } 
    return { text: `في ${new Date(dueDate).toLocaleDateString('ar-LY', {day: '2-digit', month: 'short'})}`, colorClass: 'text-slate-400', isUrgent: false }; 
};

const formatCurrency = (amount: number) => { 
    const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'LYD', }; 
    if (amount % 1 === 0) { options.minimumFractionDigits = 0; options.maximumFractionDigits = 0; } 
    else { options.minimumFractionDigits = 2; options.maximumFractionDigits = 2; } 
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', 'د.ل'); 
};

// Components
const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => ( 
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"> 
        <div className="glass-card bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up"> 
            <div className="flex justify-between items-center mb-6"> 
                <h3 className="text-xl font-bold text-white">{title}</h3> 
                <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"><XMarkIcon className="w-5 h-5 text-slate-400" /></button> 
            </div> 
            {children} 
        </div> 
    </div> 
);

const DebtForm: React.FC<{ debt?: Debt; onSave: () => void; onCancel: () => void; contacts: Contact[]; }> = ({ debt, onSave, onCancel, contacts }) => {
    const toast = useToast();
    const [type, setType] = useState<'for_you' | 'on_you'>(debt?.type || 'on_you');
    const [amount, setAmount] = useState(debt?.amount || '');
    const [contactId, setContactId] = useState(debt?.contact_id || '');
    const [dueDate, setDueDate] = useState(debt?.due_date ? new Date(debt.due_date).toISOString().split('T')[0] : '');
    const [description, setDescription] = useState(debt?.description || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const debtData = {
            type,
            amount: Number(amount),
            contact_id: contactId || null,
            due_date: dueDate || null,
            description,
            paid: debt?.paid || false,
        };

        const { error } = debt?.id
            ? await supabase.from('debts').update(debtData).eq('id', debt.id)
            : await supabase.from('debts').insert(debtData);

        if (error) {
            console.error('Error saving debt:', error.message);
            toast.error('حدث خطأ أثناء حفظ الدين.');
        } else {
            const contactName = contacts.find(c => c.id === contactId)?.name || 'مجهول';
            const logMsg = debt?.id 
                ? `تعديل دين لـ ${contactName}: ${formatCurrency(Number(amount))}`
                : `إضافة دين جديد لـ ${contactName}: ${formatCurrency(Number(amount))}`;
            logActivity(logMsg);
            onSave();
        }
        setIsSaving(false);
    };

    const isPayable = type === 'on_you';

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex bg-slate-950/50 p-1 rounded-2xl border border-white/5 relative">
                <button type="button" onClick={() => setType('on_you')} className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 relative z-10 ${type === 'on_you' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'text-slate-400 hover:text-white'}`}>عليك (سداد)</button>
                <button type="button" onClick={() => setType('for_you')} className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 relative z-10 ${type === 'for_you' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:text-white'}`}>لك (تحصيل)</button>
            </div>
            <div className="text-center space-y-2 relative py-4">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 blur-[60px] opacity-40 rounded-full transition-colors duration-500 ${isPayable ? 'bg-rose-600' : 'bg-emerald-600'}`}></div>
                <label className="text-slate-400 text-sm font-medium relative z-10">المبلغ</label>
                <div className="relative inline-block w-full z-10">
                    <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" required className={`w-full bg-transparent text-center text-7xl font-black placeholder-slate-800 focus:outline-none py-2 tracking-tighter transition-colors duration-300 ${isPayable ? 'text-rose-400 drop-shadow-[0_2px_10px_rgba(244,63,94,0.3)]' : 'text-emerald-400 drop-shadow-[0_2px_10px_rgba(16,185,129,0.3)]'}`} autoFocus />
                </div>
            </div>
            <div className="space-y-4 bg-slate-800/30 p-1 rounded-3xl border border-white/5">
                <div className="space-y-1 px-1">
                    <label className="text-xs font-bold text-slate-500 px-2 flex items-center gap-2"><ContactsIcon className="w-3 h-3"/> جهة الاتصال</label>
                    <div className="relative">
                        <select value={contactId} onChange={e => setContactId(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 pl-10 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none appearance-none">
                            <option value="">اختر اسم...</option>
                            {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <ContactsIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 pt-1 px-1">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 px-2 flex items-center gap-2"><CalendarDaysIcon className="w-3 h-3"/> تاريخ الاستحقاق</label>
                        <div className="relative">
                            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 pl-10 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none" />
                            <CalendarDaysIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 pointer-events-none"/>
                        </div>
                    </div>
                </div>
                <div className="space-y-1 pb-1 px-1">
                    <label className="text-xs font-bold text-slate-500 px-2 flex items-center gap-2"><DocumentTextIcon className="w-3 h-3"/> التفاصيل</label>
                    <div className="relative">
                        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="وصف الدين (اختياري)..." rows={2} className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-3.5 pl-10 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none resize-none"></textarea>
                        <PencilSquareIcon className="absolute left-3 top-4 w-5 h-5 text-slate-500 pointer-events-none"/>
                    </div>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onCancel} className="py-3 px-6 text-slate-400 hover:text-white font-bold transition rounded-xl hover:bg-white/5">إلغاء</button>
                <button type="submit" disabled={isSaving} className={`flex-1 py-3 px-6 rounded-xl transition font-bold text-white shadow-lg text-lg flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${isPayable ? 'bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 shadow-rose-900/30' : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-900/30'}`}>
                    {isSaving ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'حفظ الدين'}
                </button>
            </div>
        </form>
    );
};

const SettleDebtModal: React.FC<{ debt: Debt; accounts: Account[]; onConfirm: (accountId: string) => void; onCancel: () => void; }> = ({ debt, accounts, onConfirm, onCancel }) => { 
    const toast = useToast(); 
    const [selectedAccountId, setSelectedAccountId] = useState(''); 
    const [isSaving, setIsSaving] = useState(false); 
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!selectedAccountId) { toast.warning("يرجى اختيار حساب لإتمام العملية."); return; } setIsSaving(true); onConfirm(selectedAccountId); }; 
    const actionText = debt.type === 'on_you' ? 'خصم من' : 'إيداع في'; 
    return ( 
        <form onSubmit={handleSubmit} className="space-y-6"> 
            <p className="text-center text-slate-300 text-lg"> تسوية دين لـ <span className="font-bold text-white block mt-1 text-xl">{debt.contacts?.name || 'شخص ما'}</span> </p> 
            <div className="bg-slate-800/50 p-4 rounded-2xl text-center border border-white/5"> 
                <p className="text-sm text-slate-400 font-medium mb-1">المبلغ</p> 
                <p className={`text-4xl font-extrabold ${debt.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}> {formatCurrency(debt.amount)} </p> 
            </div> 
            <div> 
                <label htmlFor="account" className="block text-sm font-medium text-slate-300 mb-1">{actionText} حساب</label> 
                <select id="account" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" > 
                    <option value="" disabled>اختر حساب</option> 
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{`${acc.name} (${formatCurrency(acc.balance)})`}</option>)} 
                </select> 
            </div> 
            <div className="flex justify-end gap-3 pt-4"> 
                <button type="button" onClick={onCancel} className="py-3 px-6 text-slate-400 hover:text-white font-bold transition">إلغاء</button> 
                <button type="submit" disabled={isSaving} className="flex-1 py-3 px-6 bg-cyan-600 hover:bg-cyan-500 rounded-xl transition font-bold text-white shadow-lg shadow-cyan-900/20 disabled:bg-slate-500"> {isSaving ? 'جاري التأكيد...' : 'تأكيد التسوية'} </button> 
            </div> 
        </form> 
    ); 
};

const DebtDetailContent: React.FC<{ debt: Debt, onSelectContact: (contactId: string) => void, onClose: () => void; }> = ({ debt, onSelectContact, onClose }) => { 
    const dueDateInfo = getDueDateInfo(debt.due_date); 
    const handleContactClick = () => { if (debt.contact_id) { onSelectContact(debt.contact_id); onClose(); } }; 
    return ( 
        <div className="space-y-6"> 
            <div className="text-center border-b border-white/10 pb-6"> 
                <p className="text-sm text-slate-400 font-medium mb-1">{debt.description || (debt.type === 'on_you' ? 'مبلغ مستحق عليك' : 'مبلغ مستحق لك')}</p> 
                <p className={`text-5xl font-extrabold tracking-tight ${debt.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}> {formatCurrency(debt.amount)} </p> 
                <div className="text-xl font-bold mt-3"> {debt.contacts?.name && debt.contact_id ? ( <> <span className="text-slate-300">لـ </span> <button onClick={handleContactClick} className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-cyan-500 transition-all focus:outline-none"> {debt.contacts.name} </button> </> ) : ( <span className="text-slate-500">غير مرتبط بجهة اتصال</span> )} </div> 
            </div> 
            <div className="space-y-3 text-sm"> 
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-white/5"> 
                    <span className="text-slate-400 font-medium">الحالة</span> 
                    <span className={`font-bold px-3 py-1 rounded-lg text-xs ${debt.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}> {debt.paid ? 'مدفوع' : dueDateInfo.text} </span> 
                </div> 
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-white/5"> 
                    <span className="text-slate-400 font-medium">تاريخ الاستحقاق</span> 
                    <span className="font-bold text-white"> {debt.due_date ? new Date(debt.due_date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'غير محدد'} </span> 
                </div> 
                {debt.account_id && debt.accounts && ( <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-white/5"> <span className="text-slate-400 font-medium">تم الإقراض من حساب</span> <span className="font-bold text-white"> {debt.accounts.name} </span> </div> )} 
                <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-white/5"> 
                    <span className="text-slate-400 font-medium">تاريخ الإنشاء</span> 
                    <span className="font-bold text-white"> {new Date(debt.created_at).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' })} </span> 
                </div> 
            </div> 
        </div> 
    ); 
};

type DebtFilterValues = { status: 'all' | 'unpaid' | 'paid'; dueDateStatus: 'all' | 'overdue' | 'due_soon'; };

const DebtFilterModal: React.FC<{ initialFilters: DebtFilterValues; onApply: (filters: DebtFilterValues) => void; onClose: () => void; }> = ({ initialFilters, onApply, onClose }) => { 
    const [tempFilters, setTempFilters] = useState(initialFilters); 
    const handleReset = () => { const defaultFilters = { status: 'unpaid' as const, dueDateStatus: 'all' as const }; setTempFilters(defaultFilters); onApply(defaultFilters); onClose(); }; 
    const handleApply = () => { onApply(tempFilters); }; 
    const statusOptions: { key: DebtFilterValues['status'], label: string }[] = [ { key: 'unpaid', label: 'الحالية' }, { key: 'paid', label: 'المدفوعة' }, { key: 'all', label: 'الكل' }, ]; 
    const dueDateStatusOptions: { key: DebtFilterValues['dueDateStatus'], label: string }[] = [ { key: 'all', label: 'الكل' }, { key: 'due_soon', label: 'مستحقة قريباً' }, { key: 'overdue', label: 'متأخرة' }, ]; 
    return ( 
        <Modal title="تصفية الديون" onClose={onClose}> 
            <div className="space-y-6"> 
                <div> 
                    <label className="text-sm font-medium text-slate-400 mb-2 block">حالة السداد</label> 
                    <div className="flex gap-2"> 
                        {statusOptions.map(({ key, label }) => ( <button key={key} onClick={() => setTempFilters(f => ({ ...f, status: key }))} className={`flex-1 py-2 px-2 rounded-xl text-sm transition-colors font-bold border ${tempFilters.status === key ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}> {label} </button> ))} 
                    </div> 
                </div> 
                <div> 
                    <label className="text-sm font-medium text-slate-400 mb-2 block">حالة الاستحقاق</label> 
                    <div className="flex gap-2"> 
                        {dueDateStatusOptions.map(({ key, label }) => ( <button key={key} onClick={() => setTempFilters(f => ({ ...f, dueDateStatus: key }))} className={`flex-1 py-2 px-2 rounded-xl text-sm transition-colors font-bold border ${tempFilters.dueDateStatus === key ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}> {label} </button> ))} 
                    </div> 
                </div> 
            </div> 
            <div className="flex justify-between items-center pt-6 mt-4 border-t border-white/10"> 
                <button onClick={handleReset} className="py-2 px-4 text-slate-400 hover:text-white font-bold text-sm">إعادة تعيين</button> 
                <button onClick={handleApply} className="py-2.5 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition font-bold shadow-lg">تطبيق</button> 
            </div> 
        </Modal> 
    ); 
};

// Main Page Component
const DebtsPage: React.FC<{ refreshTrigger: number, handleDatabaseChange: (description?: string) => void, onSelectContact: (contactId: string) => void }> = ({ refreshTrigger, handleDatabaseChange, onSelectContact }) => {
    const toast = useToast();
    const [debts, setDebts] = useState<Debt[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    const [loading, setLoading] = useState(true);
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [editingDebt, setEditingDebt] = useState<Debt | undefined>(undefined);
    const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
    const [settlingDebt, setSettlingDebt] = useState<Debt | null>(null);
    const [detailsDebt, setDetailsDebt] = useState<Debt | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState<DebtFilterValues>({
        status: 'unpaid',
        dueDateStatus: 'all',
    });

    const [activeTab, setActiveTab] = useState<'on_you' | 'for_you'>('for_you');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const debtsPromise = supabase.from('debts').select('*, contacts(name), accounts(name)').order('due_date');
            const contactsPromise = supabase.from('contacts').select('*').order('name');
            const accountsPromise = supabase.from('accounts').select('*');
            const categoriesPromise = supabase.from('categories').select('*');
            
            const [
                {data: debtsData, error: debtsError}, 
                {data: contactsData, error: contactsError},
                {data: accountsData, error: accountsError},
                {data: categoriesData, error: categoriesError},
            ] = await Promise.all([debtsPromise, contactsPromise, accountsPromise, categoriesPromise]);
    
            if (debtsError) console.error('Error fetching debts:', debtsError.message);
            else if (debtsData) setDebts(debtsData as unknown as Debt[]);
    
            if (contactsError) console.error('Error fetching contacts:', contactsError.message);
            else if (contactsData) setContacts(contactsData as unknown as Contact[]);

            if (accountsError) console.error('Error fetching accounts:', accountsError.message);
            else setAccounts(accountsData || []);
            
            if (categoriesError) console.error('Error fetching categories:', categoriesError.message);
            else setCategories(categoriesData || []);
    
            setLoading(false);
        };
        fetchData();
    }, [refreshTrigger]);

    const handleSaveForm = () => {
        const description = editingDebt ? `تم تعديل بيانات الدين بنجاح` : 'تم تسجيل الدين الجديد بنجاح';
        setIsFormModalOpen(false);
        setEditingDebt(undefined);
        handleDatabaseChange(description);
        toast.success(description);
    };

    const handleDelete = async () => {
        if (!deletingDebt) return;
        const description = `تم حذف الدين بنجاح`;
        const { error } = await supabase.from('debts').delete().eq('id', deletingDebt.id);
        if (error) {
            console.error('Error deleting debt', error.message);
            toast.error('حدث خطأ أثناء الحذف.');
        } else {
            const contactName = deletingDebt.contacts?.name || 'مجهول';
            logActivity(`حذف دين: ${formatCurrency(deletingDebt.amount)} لـ ${contactName}`);
            
            setDeletingDebt(null);
            handleDatabaseChange(description);
            toast.success(description);
        }
    };
    
    const togglePaidStatus = async (debt: Debt) => {
        const { error } = await supabase.from('debts').update({ paid: !debt.paid, paid_at: null }).eq('id', debt.id);
         if (error) {
            console.error('Error updating debt status', error.message);
            toast.error('حدث خطأ أثناء تحديث حالة الدين.');
        } else {
            const description = `تم تغيير حالة الدين إلى ${!debt.paid ? 'مدفوع' : 'غير مدفوع'}`;
            const contactName = debt.contacts?.name || 'مجهول';
            logActivity(`تغيير حالة دين ${contactName} إلى ${!debt.paid ? 'مدفوع' : 'غير مدفوع'}`);
            
            handleDatabaseChange(description);
            toast.success(description);
        }
    };

    const handleDebtAction = (debt: Debt) => {
        if (debt.paid) {
            togglePaidStatus(debt);
        } else {
            setSettlingDebt(debt);
        }
    };
    
    const handleConfirmSettlement = async (accountId: string) => {
        if (!settlingDebt) return;

        try {
            const transactionType = settlingDebt.type === 'on_you' ? 'expense' : 'income';
            const amount = settlingDebt.amount;
            const sign = transactionType === 'expense' ? -1 : 1;

            const categoryType = transactionType;
            const categoryName = categoryType === 'income' ? 'تحصيل ديون' : 'ديون وقروض';
            let debtCategory = categories.find(c => c.name === categoryName && c.type === categoryType);

            if (!debtCategory) {
                 const { data: newCategory, error: catError } = await supabase.from('categories').insert({
                     name: categoryName,
                     type: categoryType,
                     icon: 'CurrencyDollarIcon',
                     color: '#64748b'
                 }).select().single();
                 
                 if (catError) throw catError;
                 debtCategory = newCategory;
            }

            // Update Account Balance
            const { data: account, error: accFetchError } = await supabase.from('accounts').select('balance, name').eq('id', accountId).single();
            if(accFetchError || !account) throw new Error("Account not found");
            
            const { error: accUpdateError } = await supabase.from('accounts').update({ balance: account.balance + (amount * sign) }).eq('id', accountId);
            if(accUpdateError) throw accUpdateError;

            // Create Transaction
            const { error: txError } = await supabase.from('transactions').insert({
                amount: amount,
                type: transactionType,
                account_id: accountId,
                category_id: debtCategory?.id,
                date: new Date().toISOString(),
                notes: `تسوية دين: ${settlingDebt.description || 'بدون وصف'}`
            });
            
            if (txError) throw txError;

            // Mark debt as paid
            const { error: debtUpdateError } = await supabase.from('debts').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', settlingDebt.id);
            if (debtUpdateError) throw debtUpdateError;

            const description = 'تم تسوية الدين بنجاح';
            const contactName = settlingDebt.contacts?.name || 'مجهول';
            logActivity(`تسوية دين (${contactName}): ${formatCurrency(amount)} عبر حساب ${account.name}`);

            handleDatabaseChange(description);
            toast.success(description);
            setSettlingDebt(null);

        } catch (error: any) {
            console.error('Error settling debt:', error.message);
            toast.error('حدث خطأ أثناء تسوية الدين.');
        }
    };

    const filteredDebts = useMemo(() => {
        return debts.filter(debt => {
            const matchesTab = debt.type === activeTab;
            const matchesSearch = !searchTerm || 
                debt.description?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                debt.contacts?.name?.toLowerCase().includes(searchTerm.toLowerCase());
            
            let matchesStatus = true;
            if (filters.status === 'paid') matchesStatus = debt.paid;
            if (filters.status === 'unpaid') matchesStatus = !debt.paid;

            let matchesDueDate = true;
            const status = getDebtStatus(debt.due_date);
            if (filters.dueDateStatus === 'overdue') matchesDueDate = status === 'overdue' && !debt.paid;
            if (filters.dueDateStatus === 'due_soon') matchesDueDate = status === 'due_soon' && !debt.paid;

            return matchesTab && matchesSearch && matchesStatus && matchesDueDate;
        });
    }, [debts, activeTab, searchTerm, filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if(filters.status !== 'unpaid') count++;
        if(filters.dueDateStatus !== 'all') count++;
        return count;
    }, [filters]);

    const stats = useMemo(() => {
        const currentDebts = debts.filter(d => !d.paid);
        return {
            onYou: currentDebts.filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0),
            forYou: currentDebts.filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0)
        };
    }, [debts]);

    return (
        <div className="space-y-6 pb-24">
            {/* Header Cards */}
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveTab('for_you')} className={`glass-card p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${activeTab === 'for_you' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-lg shadow-emerald-500/10' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'}`}>
                    <div className="relative z-10">
                        <p className={`text-xs font-bold mb-1 ${activeTab === 'for_you' ? 'text-emerald-400' : 'text-slate-400'}`}>لك (تحصيل)</p>
                        <p className="text-2xl font-black text-white">{formatCurrency(stats.forYou)}</p>
                    </div>
                    {activeTab === 'for_you' && <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-emerald-500/20 rounded-full blur-xl"></div>}
                </button>
                <button onClick={() => setActiveTab('on_you')} className={`glass-card p-4 rounded-2xl border transition-all duration-300 relative overflow-hidden group ${activeTab === 'on_you' ? 'bg-rose-500/10 border-rose-500/50 shadow-lg shadow-rose-500/10' : 'bg-slate-900/50 border-white/5 hover:bg-slate-800'}`}>
                    <div className="relative z-10">
                        <p className={`text-xs font-bold mb-1 ${activeTab === 'on_you' ? 'text-rose-400' : 'text-slate-400'}`}>عليك (سداد)</p>
                        <p className="text-2xl font-black text-white">{formatCurrency(stats.onYou)}</p>
                    </div>
                     {activeTab === 'on_you' && <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-rose-500/20 rounded-full blur-xl"></div>}
                </button>
            </div>

            {/* Controls */}
            <div className="flex gap-3 items-center">
                 <div className="relative flex-grow group">
                    <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
                    <input type="text" placeholder="ابحث في الديون..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 p-3 pr-12 rounded-2xl text-white border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition shadow-inner" />
                </div>
                <button onClick={() => setIsFilterModalOpen(true)} className={`relative flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl transition-all ${activeFilterCount > 0 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}>
                    <FunnelIcon className="w-5 h-5"/>
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">{activeFilterCount}</span>}
                </button>
            </div>

            {/* Debts List */}
            {loading ? <div className="space-y-3">{[...Array(3)].map((_,i) => <div key={i} className="h-24 bg-slate-800/50 rounded-2xl animate-pulse"></div>)}</div>
            : filteredDebts.length === 0 ? <div className="text-center py-16 bg-slate-900/20 rounded-3xl border-dashed border-2 border-slate-800 text-slate-500">لا توجد ديون تطابق بحثك.</div>
            : (
                <div className="space-y-3">
                    {filteredDebts.map(debt => {
                        const status = getDebtStatus(debt.due_date);
                        const isPayable = debt.type === 'on_you';
                        
                        return (
                            <div key={debt.id} onClick={() => setDetailsDebt(debt)} 
                                className={`relative group p-4 rounded-2xl border transition-all cursor-pointer hover:shadow-lg hover:-translate-y-1 ${debt.paid ? 'bg-slate-900/30 border-slate-800 opacity-60' : 'bg-slate-900/80 border-white/5 hover:border-white/10'}`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white shadow-md ${isPayable ? 'bg-rose-500' : 'bg-emerald-500'}`}>
                                            {debt.contacts?.name?.charAt(0) || '?'}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-base">{debt.contacts?.name || 'غير معروف'}</p>
                                            <p className="text-xs text-slate-400 truncate max-w-[150px]">{debt.description || 'بدون وصف'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`font-extrabold text-lg ${isPayable ? 'text-rose-400' : 'text-emerald-400'} ${debt.paid ? 'line-through text-slate-500' : ''}`}>
                                            {formatCurrency(debt.amount)}
                                        </p>
                                        {debt.paid && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded ml-auto w-fit block">مدفوع</span>}
                                    </div>
                                </div>
                                
                                <div className="flex justify-between items-center mt-3 pt-3 border-t border-white/5">
                                    <div className="flex items-center gap-2">
                                        {status === 'overdue' && !debt.paid && <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-1 rounded-md"><ExclamationTriangleIcon className="w-3 h-3"/> متأخر</span>}
                                        {status === 'due_soon' && !debt.paid && <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-md"><ExclamationTriangleIcon className="w-3 h-3"/> قريباً</span>}
                                        {debt.due_date && <span className="text-[10px] text-slate-500 font-mono">{new Date(debt.due_date).toLocaleDateString('ar-LY')}</span>}
                                    </div>
                                    
                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                        <button onClick={() => { setEditingDebt(debt); setIsFormModalOpen(true); }} className="p-2 text-slate-500 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition"><PencilSquareIcon className="w-4 h-4"/></button>
                                        <button onClick={() => setDeletingDebt(debt)} className="p-2 text-slate-500 hover:text-rose-400 hover:bg-white/5 rounded-lg transition"><TrashIcon className="w-4 h-4"/></button>
                                        {!debt.paid && (
                                            <button 
                                                onClick={() => handleDebtAction(debt)} 
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ml-1 ${isPayable ? 'bg-rose-500/20 text-rose-400 hover:bg-rose-500 hover:text-white' : 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white'}`}
                                            >
                                                {isPayable ? 'سداد' : 'تحصيل'}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
            
            {/* Centered FAB */}
            <button 
                onClick={() => setIsFormModalOpen(true)} 
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 h-16 w-16 bg-slate-900 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-300 border-4 border-slate-900 overflow-visible hover:scale-105 active:scale-95 group"
            >
                <div className="absolute inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <PlusIcon className="w-8 h-8 text-white transition-transform duration-300 group-hover:rotate-90"/>
                </div>
            </button>

            {/* Modals */}
            {isFormModalOpen && (
                <Modal title={editingDebt ? "تعديل الدين" : "تسجيل دين جديد"} onClose={() => { setIsFormModalOpen(false); setEditingDebt(undefined); }}>
                    <DebtForm 
                        debt={editingDebt} 
                        onSave={handleSaveForm} 
                        onCancel={() => { setIsFormModalOpen(false); setEditingDebt(undefined); }}
                        contacts={contacts}
                    />
                </Modal>
            )}

            {settlingDebt && (
                <Modal title="تسوية الدين" onClose={() => setSettlingDebt(null)}>
                    <SettleDebtModal 
                        debt={settlingDebt} 
                        accounts={accounts} 
                        onConfirm={handleConfirmSettlement} 
                        onCancel={() => setSettlingDebt(null)}
                    />
                </Modal>
            )}

            {detailsDebt && (
                <Modal title="تفاصيل الدين" onClose={() => setDetailsDebt(null)}>
                    <DebtDetailContent 
                        debt={detailsDebt} 
                        onSelectContact={(id) => { setDetailsDebt(null); onSelectContact(id); }}
                        onClose={() => setDetailsDebt(null)}
                    />
                </Modal>
            )}

            {isFilterModalOpen && (
                <DebtFilterModal 
                    initialFilters={filters}
                    onApply={(newFilters) => { setFilters(newFilters); setIsFilterModalOpen(false); }}
                    onClose={() => setIsFilterModalOpen(false)}
                />
            )}

            <ConfirmDialog 
                isOpen={!!deletingDebt}
                title="حذف الدين"
                message="هل أنت متأكد من حذف هذا الدين؟ لا يمكن التراجع عن هذا الإجراء."
                confirmText="حذف"
                onConfirm={handleDelete}
                onCancel={() => setDeletingDebt(null)}
            />
        </div>
    );
};

export default DebtsPage;