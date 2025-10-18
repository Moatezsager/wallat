import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Contact } from '../types';
import { PlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon } from './icons';

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
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500 disabled:cursor-not-allowed">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
            </div>
        </form>
    );
};


// Main Page Component
const DebtsPage: React.FC<{ key: number, handleDatabaseChange: (description?: string) => void }> = ({ key, handleDatabaseChange }) => {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDebt, setEditingDebt] = useState<Debt | undefined>(undefined);
    const [deletingDebt, setDeletingDebt] = useState<Debt | null>(null);
    const [showPaid, setShowPaid] = useState(false);
    const [activeTab, setActiveTab] = useState<'on_you' | 'for_you'>('on_you');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const debtsPromise = supabase.from('debts').select('*, contacts(name)').order('due_date');
            const contactsPromise = supabase.from('contacts').select('*').order('name');
            
            const [{data: debtsData, error: debtsError}, {data: contactsData, error: contactsError}] = await Promise.all([debtsPromise, contactsPromise]);
    
            if (debtsError) console.error('Error fetching debts:', debtsError.message);
            else if (debtsData) setDebts(debtsData as unknown as Debt[]);
    
            if (contactsError) console.error('Error fetching contacts:', contactsError.message);
            else if (contactsData) setContacts(contactsData as Contact[]);
    
            setLoading(false);
        };
        fetchData();
    }, [key]);

    const handleSave = () => {
        const description = editingDebt ? `تعديل دين لـ "${editingDebt.contacts?.name || ''}"` : 'إضافة دين جديد';
        setIsModalOpen(false);
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
    
    const handleTogglePaid = async (debt: Debt) => {
        const { error } = await supabase.from('debts').update({ paid: !debt.paid }).eq('id', debt.id);
         if (error) {
            console.error('Error updating debt status', error.message);
            alert('حدث خطأ أثناء تحديث حالة الدين.');
        } else {
            const description = `تحديث حالة دين لـ "${debt.contacts?.name || ''}" إلى ${!debt.paid ? 'مدفوع' : 'غير مدفوع'}`;
            handleDatabaseChange(description);
        }
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
    
    const { displayedDebts, remainingTotal, paidTotal } = useMemo(() => {
        const relevantDebts = debts.filter(d => d.type === activeTab);
        
        const remainingTotal = relevantDebts.filter(d => !d.paid).reduce((sum, d) => sum + d.amount, 0);
        const paidTotal = relevantDebts.filter(d => d.paid).reduce((sum, d) => sum + d.amount, 0);
        const displayedDebts = relevantDebts.filter(d => showPaid ? true : !d.paid);

        return { displayedDebts, remainingTotal, paidTotal };

    }, [debts, activeTab, showPaid]);

    return (
        <div className="relative">
            <div className="flex border-b border-slate-700 mb-4">
                <button 
                    onClick={() => setActiveTab('on_you')} 
                    className={`w-1/2 py-3 text-center font-semibold transition-colors ${activeTab === 'on_you' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
                >
                    ديون عليك
                </button>
                <button 
                    onClick={() => setActiveTab('for_you')} 
                    className={`w-1/2 py-3 text-center font-semibold transition-colors ${activeTab === 'for_you' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
                >
                    ديون لك
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-sm text-slate-400">الباقي</p>
                    <h3 className={`text-2xl font-extrabold ${activeTab === 'on_you' ? 'text-red-400' : 'text-green-400'}`}>
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

            <div className="flex justify-end items-center mb-4">
                <label htmlFor="show-paid" className="text-sm text-slate-400 ml-2">إظهار المدفوع</label>
                <input
                    id="show-paid"
                    type="checkbox"
                    checked={showPaid}
                    onChange={() => setShowPaid(!showPaid)}
                    className="w-4 h-4 text-cyan-600 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                />
            </div>

            {loading ? (
                <div className="space-y-3 mt-4">
                    {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-800 rounded-lg animate-pulse"></div>)}
                </div>
            ) : displayedDebts.length === 0 ? (
                 <div className="text-center py-10">
                    <p className="text-slate-400 mb-4">{showPaid ? 'لا يوجد أي ديون في هذا القسم.' : 'لا يوجد ديون غير مدفوعة.'}</p>
                    <button onClick={() => { setEditingDebt(undefined); setIsModalOpen(true); }} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center">
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
                        <div key={debt.id} className={`bg-slate-800 p-3 rounded-lg flex items-center transition-colors ${statusClasses[status]} ${debt.paid ? 'opacity-50' : ''}`}>
                           <div className="flex-grow">
                                <p className={`font-extrabold text-xl ${debt.paid ? 'text-slate-500 line-through' : debt.type === 'for_you' ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(debt.amount)}
                                </p>
                                <p className={`text-sm ${debt.paid ? 'text-slate-600' : 'text-slate-300'}`}>{debt.contacts?.name || debt.description || 'دين'}</p>
                                {debt.due_date && <p className={`text-xs ${debt.paid ? 'text-slate-600' : dateColorClass[status]}`}>
                                    {status !== 'ok' && !debt.paid && <ExclamationTriangleIcon className="w-3 h-3 inline-block ml-1" />}
                                    مستحق في: {new Date(debt.due_date).toLocaleDateString('ar-LY')}
                                </p>}
                           </div>
                           <div className="flex gap-1 items-center">
                                <button onClick={() => handleTogglePaid(debt)} className={`p-1 rounded-full ${debt.paid ? 'text-green-500' : 'text-slate-500 hover:text-green-400'}`} title={debt.paid ? 'تعليم كغير مدفوع' : 'تعليم كمدفوع'}>
                                    <CheckCircleIcon className="w-6 h-6"/>
                                </button>
                                {!debt.paid && (
                                    <>
                                    <button onClick={() => { setEditingDebt(debt); setIsModalOpen(true); }} className="text-slate-400 hover:text-cyan-400 p-1"><PencilSquareIcon className="w-5 h-5"/></button>
                                    <button onClick={() => setDeletingDebt(debt)} className="text-slate-400 hover:text-red-400 p-1"><TrashIcon className="w-5 h-5"/></button>
                                    </>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
            
            <button onClick={() => { setEditingDebt(undefined); setIsModalOpen(true); }} className="fixed bottom-20 right-4 h-14 w-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90">
                <PlusIcon className="w-8 h-8"/>
            </button>

            {isModalOpen && (
                <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm border border-slate-700">
                        <h3 className="text-lg font-bold mb-4">{editingDebt ? 'تعديل الدين' : 'إضافة دين جديد'}</h3>
                        <DebtForm
                            debt={editingDebt}
                            onSave={handleSave}
                            onCancel={() => { setIsModalOpen(false); setEditingDebt(undefined); }}
                            contacts={contacts}
                        />
                    </div>
                </div>
            )}
            
            {deletingDebt && (
                 <div className="fixed inset-0 z-30 bg-black/60 flex items-center justify-center p-4">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-sm border border-slate-700">
                        <h3 className="text-lg font-bold mb-2">تأكيد الحذف</h3>
                        <p className="text-slate-300 mb-6">هل أنت متأكد من رغبتك في حذف هذا الدين؟</p>
                        <div className="flex justify-end gap-3">
                            <button onClick={() => setDeletingDebt(null)} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                            <button onClick={handleDelete} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DebtsPage;