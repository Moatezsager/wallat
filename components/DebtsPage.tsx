
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Contact, Account, Category } from '../types';
import { useToast } from './Toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, FunnelIcon, MagnifyingGlassIcon } from './icons';

// ... (Keep existing imports and helper functions: getDebtStatus, getDueDateInfo, formatCurrency, Modal, DebtForm, SettleDebtModal, DebtDetailContent, DebtFilterModal)
const getDebtStatus = (dueDate: string | null): 'ok' | 'due_soon' | 'overdue' => { if (!dueDate) return 'ok'; const today = new Date(); today.setHours(0, 0, 0, 0); const due = new Date(dueDate); const diffTime = due.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (diffDays < 0) return 'overdue'; if (diffDays <= 7) return 'due_soon'; return 'ok'; };
const getDueDateInfo = (dueDate: string | null): { text: string; colorClass: string; isUrgent: boolean } => { if (!dueDate) return { text: 'غير محدد', colorClass: 'text-slate-500', isUrgent: false }; const today = new Date(); today.setHours(0, 0, 0, 0); const due = new Date(dueDate); due.setHours(0, 0, 0, 0); const diffTime = due.getTime() - today.getTime(); const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); if (diffDays < 0) { const days = Math.abs(diffDays); return { text: `متأخر منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`, colorClass: 'text-rose-400', isUrgent: true }; } if (diffDays === 0) { return { text: 'مستحق اليوم', colorClass: 'text-amber-400 font-bold', isUrgent: true }; } if (diffDays <= 7) { return { text: `بعد ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`, colorClass: 'text-amber-400', isUrgent: true }; } return { text: `في ${new Date(dueDate).toLocaleDateString('ar-LY', {day: '2-digit', month: 'short'})}`, colorClass: 'text-slate-400', isUrgent: false }; };
const formatCurrency = (amount: number) => { const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'LYD', }; if (amount % 1 === 0) { options.minimumFractionDigits = 0; options.maximumFractionDigits = 0; } else { options.minimumFractionDigits = 2; options.maximumFractionDigits = 2; } return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', 'د.ل'); };
const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => ( <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"> <div className="glass-card bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up"> <div className="flex justify-between items-center mb-6"> <h3 className="text-xl font-bold text-white">{title}</h3> <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"><XMarkIcon className="w-5 h-5 text-slate-400" /></button> </div> {children} </div> </div> );
const DebtForm: React.FC<{ debt?: Debt; onSave: () => void; onCancel: () => void; contacts: Contact[]; }> = ({ debt, onSave, onCancel, contacts }) => { const toast = useToast(); const [type, setType] = useState<'for_you' | 'on_you'>(debt?.type || 'on_you'); const [amount, setAmount] = useState(debt?.amount || ''); const [contactId, setContactId] = useState(debt?.contact_id || ''); const [dueDate, setDueDate] = useState(debt?.due_date ? new Date(debt.due_date).toISOString().split('T')[0] : ''); const [description, setDescription] = useState(debt?.description || ''); const [isSaving, setIsSaving] = useState(false); const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setIsSaving(true); const debtData = { type, amount: Number(amount), contact_id: contactId || null, due_date: dueDate || null, description, paid: debt?.paid || false, }; const { error } = debt?.id ? await supabase.from('debts').update(debtData).eq('id', debt.id) : await supabase.from('debts').insert(debtData); if (error) { console.error('Error saving debt:', error.message); toast.error('حدث خطأ أثناء حفظ الدين.'); } else { onSave(); } setIsSaving(false); }; return ( <form onSubmit={handleSubmit} className="space-y-4"> <div> <label className="block text-sm font-medium text-slate-300 mb-2">نوع الدين</label> <div className="flex gap-3"> <button type="button" onClick={() => setType('on_you')} className={`flex-1 py-3 rounded-xl transition font-bold ${type === 'on_you' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/20' : 'bg-slate-800 text-slate-400'}`}>دين عليك</button> <button type="button" onClick={() => setType('for_you')} className={`flex-1 py-3 rounded-xl transition font-bold ${type === 'for_you' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'bg-slate-800 text-slate-400'}`}>دين لك</button> </div> </div> <div> <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-1">المبلغ</label> <input type="number" step="0.01" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" /> </div> <div> <label htmlFor="contact" className="block text-sm font-medium text-slate-300 mb-1">جهة الاتصال (اختياري)</label> <select id="contact" value={contactId} onChange={e => setContactId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none"> <option value="">اختر اسم</option> {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)} </select> </div> <div> <label htmlFor="due_date" className="block text-sm font-medium text-slate-300 mb-1">تاريخ الاستحقاق (اختياري)</label> <input type="date" id="due_date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" /> </div> <div> <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">الوصف (اختياري)</label> <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none"></textarea> </div> <div className="flex justify-end gap-3 pt-4"> <button type="button" onClick={onCancel} className="py-3 px-6 text-slate-400 hover:text-white font-bold transition">إلغاء</button> <button type="submit" disabled={isSaving} className="flex-1 py-3 px-6 bg-cyan-600 hover:bg-cyan-500 rounded-xl transition font-bold text-white shadow-lg shadow-cyan-900/20 disabled:bg-slate-500"> {isSaving ? 'جاري الحفظ...' : 'حفظ'} </button> </div> </form> ); };
const SettleDebtModal: React.FC<{ debt: Debt; accounts: Account[]; onConfirm: (accountId: string) => void; onCancel: () => void; }> = ({ debt, accounts, onConfirm, onCancel }) => { const toast = useToast(); const [selectedAccountId, setSelectedAccountId] = useState(''); const [isSaving, setIsSaving] = useState(false); const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!selectedAccountId) { toast.warning("يرجى اختيار حساب لإتمام العملية."); return; } setIsSaving(true); onConfirm(selectedAccountId); }; const actionText = debt.type === 'on_you' ? 'خصم من' : 'إيداع في'; return ( <form onSubmit={handleSubmit} className="space-y-6"> <p className="text-center text-slate-300 text-lg"> تسوية دين لـ <span className="font-bold text-white block mt-1 text-xl">{debt.contacts?.name || 'شخص ما'}</span> </p> <div className="bg-slate-800/50 p-4 rounded-2xl text-center border border-white/5"> <p className="text-sm text-slate-400 font-medium mb-1">المبلغ</p> <p className={`text-4xl font-extrabold ${debt.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}> {formatCurrency(debt.amount)} </p> </div> <div> <label htmlFor="account" className="block text-sm font-medium text-slate-300 mb-2">{actionText} حساب</label> <select id="account" value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" > <option value="" disabled>اختر حساب</option> {accounts.map(acc => <option key={acc.id} value={acc.id}>{`${acc.name} (${formatCurrency(acc.balance)})`}</option>)} </select> </div> <div className="flex justify-end gap-3 pt-4"> <button type="button" onClick={onCancel} className="py-3 px-6 text-slate-400 hover:text-white font-bold transition">إلغاء</button> <button type="submit" disabled={isSaving} className="flex-1 py-3 px-6 bg-cyan-600 hover:bg-cyan-500 rounded-xl transition font-bold text-white shadow-lg shadow-cyan-900/20 disabled:bg-slate-500"> {isSaving ? 'جاري التأكيد...' : 'تأكيد التسوية'} </button> </div> </form> ); };
const DebtDetailContent: React.FC<{ debt: Debt, onSelectContact: (contactId: string) => void, onClose: () => void; }> = ({ debt, onSelectContact, onClose }) => { const dueDateInfo = getDueDateInfo(debt.due_date); const handleContactClick = () => { if (debt.contact_id) { onSelectContact(debt.contact_id); onClose(); } }; return ( <div className="space-y-6"> <div className="text-center border-b border-white/10 pb-6"> <p className="text-sm text-slate-400 font-medium mb-1">{debt.description || (debt.type === 'on_you' ? 'مبلغ مستحق عليك' : 'مبلغ مستحق لك')}</p> <p className={`text-5xl font-extrabold tracking-tight ${debt.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}> {formatCurrency(debt.amount)} </p> <div className="text-xl font-bold mt-3"> {debt.contacts?.name && debt.contact_id ? ( <> <span className="text-slate-300">لـ </span> <button onClick={handleContactClick} className="text-cyan-400 hover:text-cyan-300 underline decoration-cyan-500/30 hover:decoration-cyan-500 transition-all focus:outline-none"> {debt.contacts.name} </button> </> ) : ( <span className="text-slate-500">غير مرتبط بجهة اتصال</span> )} </div> </div> <div className="space-y-3 text-sm"> <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-white/5"> <span className="text-slate-400 font-medium">الحالة</span> <span className={`font-bold px-3 py-1 rounded-lg text-xs ${debt.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}> {debt.paid ? 'مدفوع' : dueDateInfo.text} </span> </div> <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-white/5"> <span className="text-slate-400 font-medium">تاريخ الاستحقاق</span> <span className="font-bold text-white"> {debt.due_date ? new Date(debt.due_date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'غير محدد'} </span> </div> {debt.account_id && debt.accounts && ( <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-white/5"> <span className="text-slate-400 font-medium">تم الإقراض من حساب</span> <span className="font-bold text-white"> {debt.accounts.name} </span> </div> )} <div className="flex justify-between items-center p-3 bg-slate-800/50 rounded-xl border border-white/5"> <span className="text-slate-400 font-medium">تاريخ الإنشاء</span> <span className="font-bold text-white"> {new Date(debt.created_at).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' })} </span> </div> </div> </div> ); };
type DebtFilterValues = { status: 'all' | 'unpaid' | 'paid'; dueDateStatus: 'all' | 'overdue' | 'due_soon'; };
const DebtFilterModal: React.FC<{ initialFilters: DebtFilterValues; onApply: (filters: DebtFilterValues) => void; onClose: () => void; }> = ({ initialFilters, onApply, onClose }) => { const [tempFilters, setTempFilters] = useState(initialFilters); const handleReset = () => { const defaultFilters = { status: 'unpaid' as const, dueDateStatus: 'all' as const }; setTempFilters(defaultFilters); onApply(defaultFilters); onClose(); }; const handleApply = () => { onApply(tempFilters); }; const statusOptions: { key: DebtFilterValues['status'], label: string }[] = [ { key: 'unpaid', label: 'الحالية' }, { key: 'paid', label: 'المدفوعة' }, { key: 'all', label: 'الكل' }, ]; const dueDateStatusOptions: { key: DebtFilterValues['dueDateStatus'], label: string }[] = [ { key: 'all', label: 'الكل' }, { key: 'due_soon', label: 'مستحقة قريباً' }, { key: 'overdue', label: 'متأخرة' }, ]; return ( <Modal title="تصفية الديون" onClose={onClose}> <div className="space-y-6"> <div> <label className="text-sm font-medium text-slate-400 mb-2 block">حالة السداد</label> <div className="flex gap-2"> {statusOptions.map(({ key, label }) => ( <button key={key} onClick={() => setTempFilters(f => ({ ...f, status: key }))} className={`flex-1 py-2 px-2 rounded-xl text-sm transition-colors font-bold border ${tempFilters.status === key ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}> {label} </button> ))} </div> </div> <div> <label className="text-sm font-medium text-slate-400 mb-2 block">حالة الاستحقاق</label> <div className="flex gap-2"> {dueDateStatusOptions.map(({ key, label }) => ( <button key={key} onClick={() => setTempFilters(f => ({ ...f, dueDateStatus: key }))} className={`flex-1 py-2 px-2 rounded-xl text-sm transition-colors font-bold border ${tempFilters.dueDateStatus === key ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'}`}> {label} </button> ))} </div> </div> </div> <div className="flex justify-between items-center pt-6 mt-4 border-t border-white/10"> <button onClick={handleReset} className="py-2 px-4 text-slate-400 hover:text-white font-bold text-sm">إعادة تعيين</button> <button onClick={handleApply} className="py-2.5 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition font-bold shadow-lg">تطبيق</button> </div> </Modal> ); };

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
        const description = editingDebt ? `تم تعديل دين لـ "${editingDebt.contacts?.name || ''}"` : 'تم إضافة دين جديد';
        setIsFormModalOpen(false);
        setEditingDebt(undefined);
        handleDatabaseChange(description);
        toast.success(description);
    };

    const handleDelete = async () => {
        if (!deletingDebt) return;
        const description = `تم حذف دين لـ "${deletingDebt.contacts?.name || ''}"`;
        const { error } = await supabase.from('debts').delete().eq('id', deletingDebt.id);
        if (error) {
            console.error('Error deleting debt', error.message);
            toast.error('حدث خطأ أثناء الحذف.');
        } else {
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
            const description = `تم تحديث حالة دين لـ "${debt.contacts?.name || ''}" إلى ${!debt.paid ? 'مدفوع' : 'غير مدفوع'}`;
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
                 const { data: newCategory, error: catError } = await supabase
                    .from('categories').insert({ name: categoryName, type: categoryType, icon: categoryType === 'income' ? 'CurrencyDollarIcon' : 'ScaleIcon', color: categoryType === 'income' ? '#34d399' : '#78716c' }).select().single();
                if (catError) throw catError;
                debtCategory = newCategory;
            }

            const account = accounts.find(a => a.id === accountId);
            if (!account) throw new Error("Account not found");
            const newBalance = account.balance + (amount * sign);
            const { error: accError } = await supabase.from('accounts').update({ balance: newBalance }).eq('id', accountId);
            if (accError) throw accError;

            const { error: txError } = await supabase.from('transactions').insert({
                account_id: accountId, amount: amount, date: new Date().toISOString(),
                category_id: debtCategory!.id, type: transactionType,
                notes: `تسوية دين مع ${settlingDebt.contacts?.name || 'شخص ما'}`
            });
            if (txError) throw txError;
            
            const { error: debtError } = await supabase.from('debts').update({ paid: true, paid_at: new Date().toISOString() }).eq('id', settlingDebt.id);
            if (debtError) throw debtError;

            if (settlingDebt.linked_transaction_id) {
                const { data: originalTx, error: fetchError } = await supabase.from('transactions').select('notes').eq('id', settlingDebt.linked_transaction_id).single();
                if (fetchError) { console.warn("Could not find original tx to update notes:", fetchError.message); } 
                else if (originalTx) {
                    const newNotes = originalTx.notes ? `${originalTx.notes} [تمت التسوية]` : '[تمت التسوية]';
                    await supabase.from('transactions').update({ notes: newNotes }).eq('id', settlingDebt.linked_transaction_id);
                }
            }

            setSettlingDebt(null);
            handleDatabaseChange(`تسوية دين لـ "${settlingDebt.contacts?.name || 'شخص ما'}"`);
            toast.success(`تمت تسوية الدين بنجاح`);

        } catch(error: any) {
            console.error("Error during debt settlement:", error.message);
            toast.error("حدث خطأ أثناء تسوية الدين. يرجى المحاولة مرة أخرى.");
            setSettlingDebt(null);
        }
    };
    
    const { displayedDebts, remainingTotal, paidTotal } = useMemo(() => {
        const relevantDebts = debts.filter(d => d.type === activeTab);
        
        const remainingTotal = relevantDebts.filter(d => !d.paid).reduce((sum, d) => sum + d.amount, 0);
        const paidTotal = relevantDebts.filter(d => d.paid).reduce((sum, d) => sum + d.amount, 0);

        const filtered = relevantDebts.filter(debt => {
            const searchTermLower = searchTerm.toLowerCase();
            const matchesSearch = searchTermLower === '' ||
                debt.contacts?.name?.toLowerCase().includes(searchTermLower) ||
                debt.description?.toLowerCase().includes(searchTermLower);

            if (!matchesSearch) return false;

            if (filters.status === 'paid' && !debt.paid) return false;
            if (filters.status === 'unpaid' && debt.paid) return false;

            if (filters.dueDateStatus !== 'all' && !debt.paid) {
                const status = getDebtStatus(debt.due_date);
                if (filters.dueDateStatus === 'overdue' && status !== 'overdue') return false;
                if (filters.dueDateStatus === 'due_soon' && status !== 'due_soon') return false;
            }
            
            return true;
        });

        return { displayedDebts: filtered, remainingTotal, paidTotal };

    }, [debts, activeTab, searchTerm, filters]);

    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (filters.status !== 'unpaid') count++;
        if (filters.dueDateStatus !== 'all') count++;
        return count;
    }, [filters]);
    
    const handleApplyFilters = (newFilters: DebtFilterValues) => {
        setFilters(newFilters);
        setIsFilterModalOpen(false);
    };

    return (
        <div className="relative">
            <div className="glass-card p-1 rounded-xl flex mb-6">
                <button 
                    onClick={() => setActiveTab('for_you')} 
                    className={`w-1/2 py-2.5 rounded-lg text-center font-bold transition-all duration-300 ${activeTab === 'for_you' ? 'bg-emerald-500/20 text-emerald-400 shadow-inner' : 'text-slate-400 hover:text-white'}`}
                >
                    ديون لك
                </button>
                <button 
                    onClick={() => setActiveTab('on_you')} 
                    className={`w-1/2 py-2.5 rounded-lg text-center font-bold transition-all duration-300 ${activeTab === 'on_you' ? 'bg-rose-500/20 text-rose-400 shadow-inner' : 'text-slate-400 hover:text-white'}`}
                >
                    ديون عليك
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="glass-card p-4 rounded-2xl text-center border border-white/5">
                    <p className="text-xs text-slate-400 font-bold mb-1">الباقي</p>
                    <h3 className={`text-2xl font-extrabold tracking-tight ${activeTab === 'for_you' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(remainingTotal)}
                    </h3>
                </div>
                 <div className="glass-card p-4 rounded-2xl text-center border border-white/5">
                    <p className="text-xs text-slate-400 font-bold mb-1">خالص</p>
                    <h3 className="text-2xl font-extrabold text-slate-500 tracking-tight line-through decoration-2 decoration-slate-700">
                        {formatCurrency(paidTotal)}
                    </h3>
                </div>
            </div>

            <div className="flex gap-3 items-center mb-6">
                <div className="relative flex-grow group">
                    <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none group-focus-within:text-cyan-400 transition-colors" />
                    <input 
                        type="text" 
                        placeholder="ابحث..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-900/50 p-3 pr-12 rounded-2xl text-white border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition"
                    />
                </div>
                <button onClick={() => setIsFilterModalOpen(true)} className={`relative flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl transition-all ${activeFilterCount > 0 ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50' : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'}`}>
                    <FunnelIcon className="w-5 h-5"/>
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">{activeFilterCount}</span>}
                </button>
            </div>


            {loading ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-slate-800/50 rounded-2xl animate-pulse"></div>)}
                </div>
            ) : displayedDebts.length === 0 ? (
                 <div className="text-center py-16 bg-slate-900/20 rounded-3xl border-dashed border-2 border-slate-800">
                    <p className="text-slate-500 mb-6 text-lg">{searchTerm || activeFilterCount > 0 ? 'لا توجد ديون تطابق بحثك.' : 'لا يوجد ديون في هذا القسم.'}</p>
                    <button onClick={() => { setEditingDebt(undefined); setIsFormModalOpen(true); }} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl inline-flex items-center shadow-lg shadow-cyan-900/20 transition-transform hover:scale-105">
                        <PlusIcon className="w-5 h-5 ml-2" />
                        إضافة دين
                    </button>
                </div>
            ) : (
                <div className="space-y-3 pb-20">
                    {displayedDebts.map(debt => {
                         const status = getDebtStatus(debt.due_date);
                         const statusClasses = {
                             overdue: 'border-r-4 border-red-500',
                             due_soon: 'border-r-4 border-amber-500',
                             ok: ''
                         };
                         const dateColorClass = {
                             overdue: 'text-rose-400 font-bold',
                             due_soon: 'text-amber-400 font-bold',
                             ok: 'text-slate-400'
                         }
                        return (
                        <div 
                            key={debt.id} 
                            onClick={() => setDetailsDebt(debt)}
                            className={`glass-card p-4 rounded-2xl flex items-center transition-all cursor-pointer group border border-white/5 hover:border-white/10 hover:bg-white/5 ${!debt.paid && statusClasses[status]} ${debt.paid ? 'opacity-50 grayscale' : ''}`}
                        >
                           <div className="flex-grow">
                                <div className="flex justify-between items-start mb-1">
                                    <p className={`font-extrabold text-xl tracking-tight ${debt.paid ? 'text-slate-500 line-through' : debt.type === 'for_you' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {formatCurrency(debt.amount)}
                                    </p>
                                </div>
                                <p className={`text-sm font-medium mb-1 ${debt.paid ? 'text-slate-500' : 'text-white'}`}>{debt.contacts?.name || debt.description || 'دين'}</p>
                                {debt.due_date && !debt.paid && <p className={`text-xs flex items-center gap-1 mt-1 ${dateColorClass[status]}`}>
                                    {status !== 'ok' && <ExclamationTriangleIcon className="w-3.5 h-3.5" />}
                                    {status === 'ok' ? 'استحقاق: ' : ''}{new Date(debt.due_date).toLocaleDateString('ar-LY')}
                                </p>}
                           </div>
                           <div className="flex gap-2 items-center mr-4">
                                <button onClick={(e) => { e.stopPropagation(); handleDebtAction(debt); }} className={`p-2 rounded-full transition-colors ${debt.paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-400 hover:bg-emerald-500/20 hover:text-emerald-400'}`} title={debt.paid ? 'تعليم كغير مدفوع' : 'تسوية الدين'}>
                                    <CheckCircleIcon className="w-6 h-6"/>
                                </button>
                                {!debt.paid && (
                                    <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={(e) => { e.stopPropagation(); setEditingDebt(debt); setIsFormModalOpen(true); }} className="text-slate-400 hover:text-cyan-400 transition"><PencilSquareIcon className="w-5 h-5"/></button>
                                        <button onClick={(e) => { e.stopPropagation(); setDeletingDebt(debt); }} className="text-slate-400 hover:text-rose-400 transition"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
            
            {/* Centered FAB */}
            <button 
                onClick={() => { setEditingDebt(undefined); setIsFormModalOpen(true); }} 
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 h-16 w-16 bg-slate-900 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-300 border-4 border-slate-900 overflow-visible hover:scale-105 active:scale-95 group"
            >
                <div className="absolute inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <PlusIcon className="w-8 h-8 text-white transition-transform duration-300 group-hover:rotate-90"/>
                </div>
            </button>

            {isFormModalOpen && (
                <Modal title={editingDebt ? 'تعديل الدين' : 'إضافة دين جديد'} onClose={() => { setIsFormModalOpen(false); setEditingDebt(undefined); }}>
                    <DebtForm
                        debt={editingDebt}
                        onSave={handleSaveForm}
                        onCancel={() => { setIsFormModalOpen(false); setEditingDebt(undefined); }}
                        contacts={contacts}
                    />
                </Modal>
            )}
            
            {deletingDebt && (
                 <Modal title="تأكيد الحذف" onClose={() => setDeletingDebt(null)}>
                    <p className="text-slate-300 mb-8 text-lg">هل أنت متأكد من رغبتك في حذف هذا الدين؟</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setDeletingDebt(null)} className="py-3 px-6 text-slate-400 font-bold hover:text-white transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-3 px-6 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition font-bold shadow-lg shadow-rose-900/20">حذف</button>
                    </div>
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
                        onSelectContact={onSelectContact}
                        onClose={() => setDetailsDebt(null)} 
                    />
                </Modal>
            )}

            {isFilterModalOpen && (
                <DebtFilterModal
                    initialFilters={filters}
                    onApply={handleApplyFilters}
                    onClose={() => setIsFilterModalOpen(false)}
                />
            )}
        </div>
    );
};

export default DebtsPage;
