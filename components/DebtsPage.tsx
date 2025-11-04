import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Contact, Account, Category } from '../types';
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, FunnelIcon, MagnifyingGlassIcon } from './icons';

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

    if (diffDays < 0) {
        const days = Math.abs(diffDays);
        return { text: `متأخر منذ ${days} ${days === 1 ? 'يوم' : 'أيام'}`, colorClass: 'text-red-400', isUrgent: true };
    }
    if (diffDays === 0) {
        return { text: 'مستحق اليوم', colorClass: 'text-amber-400 font-bold', isUrgent: true };
    }
    if (diffDays <= 7) {
        return { text: `بعد ${diffDays} ${diffDays === 1 ? 'يوم' : 'أيام'}`, colorClass: 'text-amber-400', isUrgent: true };
    }
    return { text: `في ${new Date(dueDate).toLocaleDateString('ar-LY', {day: '2-digit', month: 'short'})}`, colorClass: 'text-slate-500', isUrgent: false };
};


const formatCurrency = (amount: number) => {
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
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', 'د.ل');
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


// Form Component
const DebtForm: React.FC<{
    debt?: Debt;
    onSave: () => void;
    onCancel: () => void;
    contacts: Contact[];
}> = ({ debt, onSave, onCancel, contacts }) => {
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
            alert('حدث خطأ أثناء حفظ الدين.');
        } else {
            onSave();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">نوع الدين</label>
                <div className="flex gap-4">
                    <button type="button" onClick={() => setType('on_you')} className={`w-full p-2 rounded-md ${type === 'on_you' ? 'bg-red-500 text-white' : 'bg-slate-700'}`}>دين عليك</button>
                    <button type="button" onClick={() => setType('for_you')} className={`w-full p-2 rounded-md ${type === 'for_you' ? 'bg-green-500 text-white' : 'bg-slate-700'}`}>دين لك</button>
                </div>
            </div>
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-slate-300 mb-1">المبلغ</label>
                <input type="number" step="0.01" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
            </div>
            <div>
                <label htmlFor="contact" className="block text-sm font-medium text-slate-300 mb-1">جهة الاتصال (اختياري)</label>
                <select id="contact" value={contactId} onChange={e => setContactId(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500">
                    <option value="">اختر اسم</option>
                    {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-slate-300 mb-1">تاريخ الاستحقاق (اختياري)</label>
                <input type="date" id="due_date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500" />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">الوصف (اختياري)</label>
                <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500 disabled:cursor-not-allowed">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
            </div>
        </form>
    );
};

const SettleDebtModal: React.FC<{
    debt: Debt;
    accounts: Account[];
    onConfirm: (accountId: string) => void;
    onCancel: () => void;
}> = ({ debt, accounts, onConfirm, onCancel }) => {
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedAccountId) {
            alert("يرجى اختيار حساب لإتمام العملية.");
            return;
        }
        setIsSaving(true);
        onConfirm(selectedAccountId);
    };
    
    const actionText = debt.type === 'on_you' ? 'خصم من' : 'إيداع في';

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <p className="text-center text-slate-300">
                تسوية دين لـ <span className="font-bold text-white">{debt.contacts?.name || 'شخص ما'}</span>
            </p>
            <div className="bg-slate-700/50 p-3 rounded-lg text-center">
                <p className="text-sm text-slate-400">المبلغ</p>
                <p className={`text-3xl font-extrabold ${debt.type === 'on_you' ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(debt.amount)}
                </p>
            </div>
            <div>
                <label htmlFor="account" className="block text-sm font-medium text-slate-300 mb-1">{actionText} حساب</label>
                <select 
                    id="account" 
                    value={selectedAccountId} 
                    onChange={e => setSelectedAccountId(e.target.value)} 
                    required 
                    className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white focus:ring-cyan-500 focus:border-cyan-500"
                >
                    <option value="" disabled>اختر حساب</option>
                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{`${acc.name} (${formatCurrency(acc.balance)})`}</option>)}
                </select>
            </div>
             <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="w-full py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500">
                    {isSaving ? 'جاري التأكيد...' : 'تأكيد التسوية'}
                </button>
            </div>
        </form>
    );
};

const DebtDetailContent: React.FC<{ debt: Debt, onSelectContact: (contactId: string) => void, onClose: () => void; }> = ({ debt, onSelectContact, onClose }) => {
    const dueDateInfo = getDueDateInfo(debt.due_date);

    const handleContactClick = () => {
        if (debt.contact_id) {
            onSelectContact(debt.contact_id);
            onClose(); // Close the modal after triggering navigation
        }
    };

    return (
        <div className="space-y-4">
            <div className="text-center border-b border-slate-700 pb-4">
                <p className="text-sm text-slate-400">{debt.description || (debt.type === 'on_you' ? 'مبلغ مستحق عليك' : 'مبلغ مستحق لك')}</p>
                <p className={`text-5xl font-extrabold ${debt.type === 'on_you' ? 'text-red-400' : 'text-green-400'}`}>
                    {formatCurrency(debt.amount)}
                </p>
                <div className="text-lg font-semibold mt-1">
                    {debt.contacts?.name && debt.contact_id ? (
                        <>
                            <span>لـ </span>
                            <button onClick={handleContactClick} className="text-cyan-400 hover:text-cyan-300 hover:underline focus:outline-none">
                                {debt.contacts.name}
                            </button>
                        </>
                    ) : (
                        <span>غير مرتبط بجهة اتصال</span>
                    )}
                </div>
            </div>
            
            <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                    <span className="text-slate-400">الحالة</span>
                    <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${debt.paid ? 'bg-green-500/20 text-green-400' : dueDateInfo.colorClass}`}>
                        {debt.paid ? 'مدفوع' : dueDateInfo.text}
                    </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                    <span className="text-slate-400">تاريخ الاستحقاق</span>
                    <span className="font-semibold">
                        {debt.due_date ? new Date(debt.due_date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' }) : 'غير محدد'}
                    </span>
                </div>
                 {debt.account_id && debt.accounts && (
                    <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                        <span className="text-slate-400">تم الإقراض من حساب</span>
                        <span className="font-semibold">
                            {debt.accounts.name}
                        </span>
                    </div>
                )}
                 <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                    <span className="text-slate-400">تاريخ الإنشاء</span>
                    <span className="font-semibold">
                        {new Date(debt.created_at).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                </div>
                {debt.paid && debt.paid_at && (
                     <div className="flex justify-between items-center p-2 bg-slate-900/50 rounded">
                        <span className="text-slate-400">تاريخ التسديد</span>
                        <span className="font-semibold text-green-400">
                            {new Date(debt.paid_at).toLocaleString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};

type DebtFilterValues = {
    status: 'all' | 'unpaid' | 'paid';
    dueDateStatus: 'all' | 'overdue' | 'due_soon';
};

const DebtFilterModal: React.FC<{
    initialFilters: DebtFilterValues;
    onApply: (filters: DebtFilterValues) => void;
    onClose: () => void;
}> = ({ initialFilters, onApply, onClose }) => {
    const [tempFilters, setTempFilters] = useState(initialFilters);

    const handleReset = () => {
        const defaultFilters = { status: 'unpaid' as const, dueDateStatus: 'all' as const };
        setTempFilters(defaultFilters);
        onApply(defaultFilters);
        onClose();
    };

    const handleApply = () => {
        onApply(tempFilters);
    };
    
    const statusOptions: { key: DebtFilterValues['status'], label: string }[] = [
        { key: 'unpaid', label: 'الحالية' },
        { key: 'paid', label: 'المدفوعة' },
        { key: 'all', label: 'الكل' },
    ];

    const dueDateStatusOptions: { key: DebtFilterValues['dueDateStatus'], label: string }[] = [
        { key: 'all', label: 'الكل' },
        { key: 'due_soon', label: 'مستحقة قريباً' },
        { key: 'overdue', label: 'متأخرة' },
    ];

    return (
        <Modal title="تصفية الديون" onClose={onClose}>
            <div className="space-y-6">
                <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">حالة السداد</label>
                    <div className="flex bg-slate-700 rounded-lg p-1 text-sm">
                        {statusOptions.map(({ key, label }) => (
                            <button key={key} onClick={() => setTempFilters(f => ({ ...f, status: key }))} className={`w-full py-2 px-1 rounded-md transition-colors font-semibold ${tempFilters.status === key ? 'bg-slate-600 text-cyan-400' : 'text-slate-300 hover:bg-slate-600/50'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
                <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">حالة الاستحقاق (للديون الحالية)</label>
                    <div className="flex bg-slate-700 rounded-lg p-1 text-sm">
                        {dueDateStatusOptions.map(({ key, label }) => (
                           <button key={key} onClick={() => setTempFilters(f => ({ ...f, dueDateStatus: key }))} className={`w-full py-2 px-1 rounded-md transition-colors font-semibold ${tempFilters.dueDateStatus === key ? 'bg-slate-600 text-cyan-400' : 'text-slate-300 hover:bg-slate-600/50'}`}>
                                {label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="flex justify-between items-center pt-6 mt-4 border-t border-slate-700">
                <button onClick={handleReset} className="py-2 px-4 text-slate-400 hover:text-white rounded-md transition text-sm">إعادة تعيين</button>
                <button onClick={handleApply} className="py-2 px-6 bg-cyan-600 hover:bg-cyan-500 rounded-md transition">تطبيق</button>
            </div>
        </Modal>
    );
};


// Main Page Component
const DebtsPage: React.FC<{ key: number, handleDatabaseChange: (description?: string) => void, onSelectContact: (contactId: string) => void }> = ({ key, handleDatabaseChange, onSelectContact }) => {
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
    }, [key]);

    const handleSaveForm = () => {
        const description = editingDebt ? `تعديل دين لـ "${editingDebt.contacts?.name || ''}"` : 'إضافة دين جديد';
        setIsFormModalOpen(false);
        setEditingDebt(undefined);
        handleDatabaseChange(description);
    };

    const handleDelete = async () => {
        if (!deletingDebt) return;
        const description = `حذف دين لـ "${deletingDebt.contacts?.name || ''}"`;
        const { error } = await supabase.from('debts').delete().eq('id', deletingDebt.id);
        if (error) {
            console.error('Error deleting debt', error.message);
            alert('حدث خطأ أثناء الحذف.');
        } else {
            setDeletingDebt(null);
            handleDatabaseChange(description);
        }
    };
    
    const togglePaidStatus = async (debt: Debt) => {
        const { error } = await supabase.from('debts').update({ paid: !debt.paid, paid_at: null }).eq('id', debt.id);
         if (error) {
            console.error('Error updating debt status', error.message);
            alert('حدث خطأ أثناء تحديث حالة الدين.');
        } else {
            const description = `تحديث حالة دين لـ "${debt.contacts?.name || ''}" إلى ${!debt.paid ? 'مدفوع' : 'غير مدفوع'}`;
            handleDatabaseChange(description);
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

        } catch(error: any) {
            console.error("Error during debt settlement:", error.message);
            alert("حدث خطأ أثناء تسوية الدين. يرجى المحاولة مرة أخرى.");
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
            <div className="flex border-b border-slate-700 mb-4">
                <button 
                    onClick={() => setActiveTab('for_you')} 
                    className={`w-1/2 py-3 text-center font-semibold transition-colors ${activeTab === 'for_you' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
                >
                    ديون لك
                </button>
                <button 
                    onClick={() => setActiveTab('on_you')} 
                    className={`w-1/2 py-3 text-center font-semibold transition-colors ${activeTab === 'on_you' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
                >
                    ديون عليك
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-sm text-slate-400">الباقي</p>
                    <h3 className={`text-2xl font-extrabold ${activeTab === 'for_you' ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(remainingTotal)}
                    </h3>
                </div>
                 <div className="bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-sm text-slate-400">خالص</p>
                    <h3 className="text-2xl font-extrabold text-slate-500">
                        {formatCurrency(paidTotal)}
                    </h3>
                </div>
            </div>

            <div className="flex gap-2 items-center mb-4">
                <div className="relative flex-grow">
                    <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input 
                        type="text" 
                        placeholder="ابحث بالاسم أو الوصف..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-slate-800 p-2 pr-10 rounded-lg text-white border border-slate-700 focus:border-cyan-500 focus:ring-0 transition"
                    />
                </div>
                <button onClick={() => setIsFilterModalOpen(true)} className="relative flex-shrink-0 flex items-center gap-2 bg-slate-800 py-2 px-4 rounded-lg text-slate-300 hover:bg-slate-700 transition border border-slate-700">
                    <FunnelIcon className="w-5 h-5"/>
                    {activeFilterCount > 0 && <span className="absolute -top-1 -right-1 h-4 w-4 bg-cyan-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-900">{activeFilterCount}</span>}
                </button>
            </div>


            {loading ? (
                <div className="space-y-3 mt-4">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-800 rounded-lg animate-pulse"></div>)}
                </div>
            ) : displayedDebts.length === 0 ? (
                 <div className="text-center py-10">
                    <p className="text-slate-400 mb-4">{searchTerm || activeFilterCount > 0 ? 'لا توجد ديون تطابق بحثك.' : 'لا يوجد ديون في هذا القسم.'}</p>
                    <button onClick={() => { setEditingDebt(undefined); setIsFormModalOpen(true); }} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center">
                        <PlusIcon className="w-5 h-5 ml-2" />
                        إضافة دين
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {displayedDebts.map(debt => {
                         const status = getDebtStatus(debt.due_date);
                         const statusClasses = {
                             overdue: 'border-r-4 border-red-500',
                             due_soon: 'border-r-4 border-amber-500',
                             ok: ''
                         };
                         const dateColorClass = {
                             overdue: 'text-red-400',
                             due_soon: 'text-amber-400',
                             ok: 'text-slate-500'
                         }
                        return (
                        <div 
                            key={debt.id} 
                            onClick={() => setDetailsDebt(debt)}
                            className={`bg-slate-800 rounded-lg flex items-center transition-colors cursor-pointer ${!debt.paid && statusClasses[status]} ${debt.paid ? 'opacity-60' : 'hover:bg-slate-700/50'}`}
                        >
                           <div className="flex-grow p-3">
                                <p className={`font-extrabold text-xl ${debt.paid ? 'text-slate-500 line-through' : debt.type === 'for_you' ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(debt.amount)}
                                </p>
                                <p className={`text-sm ${debt.paid ? 'text-slate-600' : 'text-slate-300'}`}>{debt.contacts?.name || debt.description || 'دين'}</p>
                                {debt.due_date && !debt.paid && <p className={`text-xs ${dateColorClass[status]}`}>
                                    {status !== 'ok' && <ExclamationTriangleIcon className="w-3 h-3 inline-block ml-1" />}
                                    مستحق في: {new Date(debt.due_date).toLocaleDateString('ar-LY')}
                                </p>}
                           </div>
                           <div className="flex gap-1 items-center pr-3">
                                <button onClick={(e) => { e.stopPropagation(); handleDebtAction(debt); }} className={`p-1 rounded-full ${debt.paid ? 'text-green-500' : 'text-slate-500 hover:text-green-400'}`} title={debt.paid ? 'تعليم كغير مدفوع' : 'تسوية الدين'}>
                                    <CheckCircleIcon className="w-6 h-6"/>
                                </button>
                                {!debt.paid && (
                                    <>
                                    <button onClick={(e) => { e.stopPropagation(); setEditingDebt(debt); setIsFormModalOpen(true); }} className="text-slate-400 hover:text-cyan-400 p-1"><PencilSquareIcon className="w-5 h-5"/></button>
                                    <button onClick={(e) => { e.stopPropagation(); setDeletingDebt(debt); }} className="text-slate-400 hover:text-red-400 p-1"><TrashIcon className="w-5 h-5"/></button>
                                    </>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
            
            <button onClick={() => { setEditingDebt(undefined); setIsFormModalOpen(true); }} className="fixed bottom-20 right-4 h-14 w-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90">
                <PlusIcon className="w-8 h-8"/>
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
                    <p className="text-slate-300 mb-6">هل أنت متأكد من رغبتك في حذف هذا الدين؟</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setDeletingDebt(null)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
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