import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Contact, Debt } from '../types';
import {
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    CheckCircleIcon,
    XMarkIcon,
    ExclamationTriangleIcon
} from './icons';

interface ContactProfilePageProps {
    contactId: string;
    onBack: () => void;
    handleDatabaseChange: (description?: string) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD' }).format(amount).replace('LYD', 'د.ل');
};

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

const DebtForm: React.FC<{
    debt?: Debt;
    onSave: () => void;
    onCancel: () => void;
    contactId: string;
}> = ({ debt, onSave, onCancel, contactId }) => {
    const [type, setType] = useState<'for_you' | 'on_you'>(debt?.type || 'on_you');
    const [amount, setAmount] = useState(debt?.amount?.toString() || '');
    const [dueDate, setDueDate] = useState(debt?.due_date ? new Date(debt.due_date).toISOString().split('T')[0] : '');
    const [description, setDescription] = useState(debt?.description || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const debtData = {
            type,
            amount: Number(amount),
            contact_id: contactId,
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
                <input type="number" step="0.01" id="amount" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            </div>
            <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-slate-300 mb-1">تاريخ الاستحقاق (اختياري)</label>
                <input type="date" id="due_date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            </div>
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-1">الوصف (اختياري)</label>
                <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white"></textarea>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ'}
                </button>
            </div>
        </form>
    );
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


const ContactProfilePage: React.FC<ContactProfilePageProps> = ({ contactId, onBack, handleDatabaseChange }) => {
    const [contact, setContact] = useState<Contact | null>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'on_you' | 'for_you'>('on_you');
    
    const [modal, setModal] = useState<{ type: 'add' | 'edit' | 'delete' | null, debt: Debt | null }>({ type: null, debt: null });
    
    const fetchData = useCallback(async () => {
        setLoading(true);
        const contactPromise = supabase.from('contacts').select('*').eq('id', contactId).single();
        const debtsPromise = supabase.from('debts').select('*').eq('contact_id', contactId).order('due_date');

        const [{ data: contactData, error: contactError }, { data: debtsData, error: debtsError }] = await Promise.all([contactPromise, debtsPromise]);

        if (contactError) console.error("Error fetching contact:", contactError.message);
        else setContact(contactData);

        if (debtsError) console.error("Error fetching debts:", debtsError.message);
        else setDebts(debtsData as Debt[]);
        
        setLoading(false);
    }, [contactId]);

    useEffect(() => {
        fetchData();
    }, [fetchData, handleDatabaseChange]);

    const { forYou, onYou, netBalance } = useMemo(() => {
        const forYou = debts.filter(d => d.type === 'for_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
        const onYou = debts.filter(d => d.type === 'on_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
        return { forYou, onYou, netBalance: forYou - onYou };
    }, [debts]);
    
    const filteredDebts = debts.filter(d => d.type === activeTab && !d.paid);

    const handleSave = () => {
        const description = modal.debt ? `تعديل دين لـ ${contact?.name}` : `إضافة دين جديد لـ ${contact?.name}`;
        setModal({ type: null, debt: null });
        handleDatabaseChange(description);
    };

    const handleDelete = async () => {
        if (!modal.debt) return;
        const description = `حذف دين لـ ${contact?.name}`;
        const { error } = await supabase.from('debts').delete().eq('id', modal.debt.id);
        if (error) {
            console.error('Error deleting debt', error.message);
            alert('حدث خطأ أثناء الحذف.');
        } else {
            setModal({ type: null, debt: null });
            handleDatabaseChange(description);
        }
    };
    
    const handleTogglePaid = async (debt: Debt) => {
        const { error } = await supabase.from('debts').update({ paid: !debt.paid }).eq('id', debt.id);
         if (error) {
            console.error('Error updating debt status', error.message);
            alert('حدث خطأ أثناء تحديث حالة الدين.');
        } else {
            const description = `تحديث حالة دين لـ ${contact?.name} إلى ${!debt.paid ? 'مدفوع' : 'غير مدفوع'}`;
            handleDatabaseChange(description);
        }
    };

    if (loading) {
        return <div className="text-center p-8">جاري تحميل البيانات...</div>;
    }

    if (!contact) {
        return <div className="text-center p-8">لم يتم العثور على جهة الاتصال.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-4 rounded-xl shadow-lg">
                 <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-16 h-16 bg-cyan-800 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-cyan-300 text-2xl">
                            {contact.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div>
                            <h2 className="font-bold text-2xl text-white">{contact.name}</h2>
                            {contact.phone && <p className="text-sm text-slate-400">{contact.phone}</p>}
                            {contact.address && <p className="text-sm text-slate-400">{contact.address}</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
                 <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-sm text-green-400">مستحق لك</p>
                    <p className="font-bold text-lg">{formatCurrency(forYou)}</p>
                </div>
                 <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-sm text-red-400">مستحق عليك</p>
                    <p className="font-bold text-lg">{formatCurrency(onYou)}</p>
                </div>
                <div className={`p-3 rounded-lg ${netBalance > 0 ? 'bg-green-500/10 text-green-400' : netBalance < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                    <p className="text-sm">الصافي</p>
                    <p className="font-bold text-lg">{formatCurrency(netBalance)}</p>
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold mb-3">الديون الحالية</h3>
                 <div className="flex border-b border-slate-700 mb-4">
                    <button onClick={() => setActiveTab('on_you')} className={`w-1/2 py-3 text-center font-semibold transition-colors ${activeTab === 'on_you' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>
                        ديون عليك ({onYou > 0 ? formatCurrency(onYou) : 0})
                    </button>
                    <button onClick={() => setActiveTab('for_you')} className={`w-1/2 py-3 text-center font-semibold transition-colors ${activeTab === 'for_you' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>
                         ديون لك ({forYou > 0 ? formatCurrency(forYou) : 0})
                    </button>
                </div>

                {filteredDebts.length > 0 ? (
                    <div className="space-y-3">
                         {filteredDebts.map(debt => {
                            const status = getDebtStatus(debt.due_date);
                            const statusClasses = { overdue: 'border-r-4 border-red-500', due_soon: 'border-r-4 border-amber-500', ok: '' };
                            const dateColorClass = { overdue: 'text-red-400', due_soon: 'text-amber-400', ok: 'text-slate-500' };
                            return (
                                <div key={debt.id} className={`bg-slate-800 p-3 rounded-lg flex items-center transition-colors ${statusClasses[status]}`}>
                                   <div className="flex-grow">
                                        <p className={`font-extrabold text-xl ${debt.type === 'for_you' ? 'text-green-400' : 'text-red-400'}`}>
                                            {formatCurrency(debt.amount)}
                                        </p>
                                        <p className="text-sm text-slate-300">{debt.description || 'دين'}</p>
                                        {debt.due_date && <p className={`text-xs ${dateColorClass[status]}`}>
                                            {status !== 'ok' && <ExclamationTriangleIcon className="w-3 h-3 inline-block ml-1" />}
                                            مستحق في: {new Date(debt.due_date).toLocaleDateString('ar-LY')}
                                        </p>}
                                   </div>
                                   <div className="flex gap-1 items-center">
                                        <button onClick={() => handleTogglePaid(debt)} className="p-1 rounded-full text-slate-500 hover:text-green-400" title="تعليم كمدفوع">
                                            <CheckCircleIcon className="w-6 h-6"/>
                                        </button>
                                        <button onClick={() => setModal({ type: 'edit', debt })} className="text-slate-400 hover:text-cyan-400 p-1"><PencilSquareIcon className="w-5 h-5"/></button>
                                        <button onClick={() => setModal({ type: 'delete', debt })} className="text-slate-400 hover:text-red-400 p-1"><TrashIcon className="w-5 h-5"/></button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                     <p className="text-center py-8 text-slate-500">لا توجد ديون حالية في هذا القسم.</p>
                )}
            </div>
            
            <button onClick={() => setModal({ type: 'add', debt: null })} className="fixed bottom-20 right-4 h-14 w-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90 z-10">
                <PlusIcon className="w-8 h-8"/>
            </button>
            
            {(modal.type === 'add' || modal.type === 'edit') && (
                 <Modal title={modal.type === 'add' ? `إضافة دين لـ ${contact.name}` : 'تعديل الدين'} onClose={() => setModal({ type: null, debt: null })}>
                    <DebtForm 
                        debt={modal.debt || undefined}
                        onSave={handleSave}
                        onCancel={() => setModal({ type: null, debt: null })}
                        contactId={contactId}
                    />
                 </Modal>
            )}

            {modal.type === 'delete' && modal.debt && (
                 <Modal title="تأكيد الحذف" onClose={() => setModal({ type: null, debt: null })}>
                     <p className="text-slate-300 mb-6">هل أنت متأكد من حذف هذا الدين؟</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setModal({ type: null, debt: null })} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
                    </div>
                 </Modal>
            )}

        </div>
    );
};

export default ContactProfilePage;