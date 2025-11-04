import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Contact, Debt } from '../types';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, ScaleIcon, MagnifyingGlassIcon, EllipsisVerticalIcon } from './icons';

interface ContactWithDebtInfo extends Contact {
    forYou: number;
    onYou: number;
    netBalance: number;
}

interface ContactsPageProps {
    key: number;
    handleDatabaseChange: (description?: string) => void;
    onSelectContact: (contactId: string) => void;
}

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
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
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', currency);
};

const ContactForm: React.FC<{
    contact?: Contact | null;
    onSave: () => void;
    onCancel: () => void;
}> = ({ contact, onSave, onCancel }) => {
    const [name, setName] = useState(contact?.name || '');
    const [phone, setPhone] = useState(contact?.phone || '');
    const [address, setAddress] = useState(contact?.address || '');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const contactData = { name, phone: phone || null, address: address || null };

        const { error } = contact?.id
            ? await supabase.from('contacts').update(contactData).eq('id', contact.id)
            : await supabase.from('contacts').insert(contactData);

        if (error) {
            console.error('Error saving contact:', error.message);
            alert('حدث خطأ');
        } else {
            onSave();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل" required className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <input type="tel" value={phone || ''} onChange={e => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <input type="text" value={address || ''} onChange={e => setAddress(e.target.value)} placeholder="العنوان (اختياري)" className="w-full bg-slate-700 border border-slate-600 rounded-md p-2 text-white" />
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500">
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

const getInitials = (name: string) => {
    const names = name.split(' ');
    if (names.length > 1 && names[0] && names[names.length - 1]) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
};

const ContactsPage: React.FC<ContactsPageProps> = ({ key, handleDatabaseChange, onSelectContact }) => {
    const [allContactsWithDebts, setAllContactsWithDebts] = useState<ContactWithDebtInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState<{ type: 'add' | 'edit' | 'delete' | null, contact: Contact | null }>({ type: null, contact: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const contactsPromise = supabase.from('contacts').select('*');
        const debtsPromise = supabase.from('debts').select('contact_id, amount, type').eq('paid', false);

        const [{ data: contactsData, error: contactsError }, { data: debtsData, error: debtsError }] = await Promise.all([contactsPromise, debtsPromise]);

        if (contactsError || debtsError) {
            console.error('Error fetching data:', (contactsError || debtsError)?.message);
            setLoading(false);
            return;
        }

        const debtInfoMap = new Map<string, { forYou: number, onYou: number }>();
        debtsData.forEach(debt => {
            if (!debt.contact_id) return;
            const current = debtInfoMap.get(debt.contact_id) || { forYou: 0, onYou: 0 };
            if (debt.type === 'for_you') {
                current.forYou += debt.amount;
            } else {
                current.onYou += debt.amount;
            }
            debtInfoMap.set(debt.contact_id, current);
        });

        const combinedData = (contactsData as unknown as Contact[]).map(contact => {
            const debts = debtInfoMap.get(contact.id) || { forYou: 0, onYou: 0 };
            return {
                ...contact,
                ...debts,
                netBalance: debts.forYou - debts.onYou
            };
        }).sort((a, b) => a.name.localeCompare(b.name));

        setAllContactsWithDebts(combinedData);
        setLoading(false);
    }, []);
    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData, key]);

    const filteredContacts = useMemo(() => {
        if (!searchTerm) return allContactsWithDebts;
        const lowercasedFilter = searchTerm.toLowerCase();
        return allContactsWithDebts.filter(contact =>
            contact.name.toLowerCase().includes(lowercasedFilter) ||
            contact.phone?.includes(lowercasedFilter)
        );
    }, [allContactsWithDebts, searchTerm]);


    const handleSave = () => {
        const description = modal.contact ? `تم تعديل بيانات "${modal.contact.name}"` : 'تم إضافة جهة اتصال جديدة';
        setModal({ type: null, contact: null });
        handleDatabaseChange(description);
    };

    const handleDelete = async () => {
        if (!modal.contact) return;
        const description = `تم حذف جهة الاتصال "${modal.contact.name}"`;
        const { error } = await supabase.from('contacts').delete().eq('id', modal.contact.id);
        if (error) {
            console.error('Error deleting contact', error.message);
            alert('لا يمكن حذف جهة الاتصال لارتباطها بديون.');
        } else {
            setModal({ type: null, contact: null });
            handleDatabaseChange(description);
        }
    };

    return (
        <div className="relative">
            <div className="relative mb-4">
                <MagnifyingGlassIcon className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                    type="text"
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2 pr-10 pl-4 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
            </div>
            {loading && allContactsWithDebts.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-44 bg-slate-800 rounded-xl animate-pulse"></div>)}
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-slate-400 mb-4">{searchTerm ? "لا يوجد أسماء تطابق بحثك." : "لم تقم بإضافة أي أسماء بعد."}</p>
                     <button onClick={() => setModal({ type: 'add', contact: null })} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-2 px-4 rounded-lg inline-flex items-center">
                        <PlusIcon className="w-5 h-5 ml-2" />
                        إضافة اسم جديد
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredContacts.map(contact => (
                        <div key={contact.id} className="relative bg-slate-800 rounded-xl shadow-lg transition-colors border border-slate-700/50 group hover:border-cyan-500/50">
                             <button onClick={() => onSelectContact(contact.id)} className="w-full text-right p-4 flex flex-col gap-4 focus:outline-none">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 bg-cyan-800 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-cyan-300 text-xl">
                                        {getInitials(contact.name)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-xl text-white">{contact.name}</h3>
                                        {contact.phone && <p className="text-sm text-slate-400">{contact.phone}</p>}
                                    </div>
                                </div>
                                <div className={`flex items-center justify-center gap-2 p-3 rounded-lg ${contact.netBalance > 0 ? 'bg-green-500/10 text-green-400' : contact.netBalance < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                                    <ScaleIcon className="w-5 h-5"/>
                                    <span className="text-sm font-medium">الرصيد الصافي:</span>
                                    <span className="font-bold text-lg">{formatCurrency(contact.netBalance)}</span>
                                </div>
                            </button>
                            <div className="absolute top-2 left-2" ref={openMenuId === contact.id ? menuRef : null}>
                                <button onClick={() => setOpenMenuId(openMenuId === contact.id ? null : contact.id)} className="text-slate-500 hover:text-white p-2 rounded-full group-hover:text-slate-300 transition-colors">
                                    <EllipsisVerticalIcon className="w-5 h-5"/>
                                </button>
                                {openMenuId === contact.id && (
                                    <div className="absolute left-0 mt-2 w-32 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-10 animate-fade-in-fast">
                                       <button onClick={() => { setModal({ type: 'edit', contact }); setOpenMenuId(null); }} className="flex items-center gap-2 w-full text-right px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 rounded-t-md"><PencilSquareIcon className="w-4 h-4"/> تعديل</button>
                                       <button onClick={() => { setModal({ type: 'delete', contact }); setOpenMenuId(null); }} className="flex items-center gap-2 w-full text-right px-4 py-2 text-sm text-red-400 hover:bg-slate-700 rounded-b-md"><TrashIcon className="w-4 h-4"/> حذف</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <button onClick={() => setModal({ type: 'add', contact: null })} className="fixed bottom-20 right-4 h-14 w-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90 z-10">
                <PlusIcon className="w-8 h-8"/>
            </button>

            {/* Modals */}
            {(modal.type === 'add' || modal.type === 'edit') && (
                <Modal title={modal.type === 'add' ? 'إضافة اسم جديد' : 'تعديل الاسم'} onClose={() => setModal({ type: null, contact: null })}>
                    <ContactForm contact={modal.contact} onSave={handleSave} onCancel={() => setModal({ type: null, contact: null })} />
                </Modal>
            )}
            {modal.type === 'delete' && modal.contact && (
                <Modal title="تأكيد الحذف" onClose={() => setModal({ type: null, contact: null })}>
                    <p className="text-slate-300 mb-6">هل أنت متأكد من حذف "{modal.contact.name}"؟</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setModal({ type: null, contact: null })} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ContactsPage;