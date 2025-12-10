
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Contact, Debt } from '../types';
import { useToast } from './Toast';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, ScaleIcon, MagnifyingGlassIcon, EllipsisVerticalIcon } from './icons';

// ... (Keep existing imports and helper functions: formatCurrency, ContactForm, Modal, getInitials)
interface ContactWithDebtInfo extends Contact { forYou: number; onYou: number; netBalance: number; }
interface ContactsPageProps { refreshTrigger: number; handleDatabaseChange: (description?: string) => void; onSelectContact: (contactId: string) => void; }
const formatCurrency = (amount: number, currency: string = 'د.ل') => { const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'LYD', }; if (amount % 1 === 0) { options.minimumFractionDigits = 0; options.maximumFractionDigits = 0; } else { options.minimumFractionDigits = 2; options.maximumFractionDigits = 2; } return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', currency); };
const ContactForm: React.FC<{ contact?: Contact | null; onSave: () => void; onCancel: () => void; }> = ({ contact, onSave, onCancel }) => { const toast = useToast(); const [name, setName] = useState(contact?.name || ''); const [phone, setPhone] = useState(contact?.phone || ''); const [address, setAddress] = useState(contact?.address || ''); const [isSaving, setIsSaving] = useState(false); const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); setIsSaving(true); const contactData = { name, phone: phone || null, address: address || null }; const { error } = contact?.id ? await supabase.from('contacts').update(contactData).eq('id', contact.id) : await supabase.from('contacts').insert(contactData); if (error) { console.error('Error saving contact:', error.message); toast.error('حدث خطأ أثناء حفظ جهة الاتصال'); } else { onSave(); } setIsSaving(false); }; return ( <form onSubmit={handleSubmit} className="space-y-4"> <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" /> <input type="tel" value={phone || ''} onChange={e => setPhone(e.target.value)} placeholder="رقم الهاتف (اختياري)" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" /> <input type="text" value={address || ''} onChange={e => setAddress(e.target.value)} placeholder="العنوان (اختياري)" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-white focus:border-cyan-500 focus:outline-none" /> <div className="flex justify-end gap-3 pt-4"> <button type="button" onClick={onCancel} className="py-2 px-4 text-slate-400 hover:text-white font-bold transition">إلغاء</button> <button type="submit" disabled={isSaving} className="py-2 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition font-bold shadow-lg"> {isSaving ? 'جاري الحفظ...' : 'حفظ'} </button> </div> </form> ); };
const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => ( <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"> <div className="glass-card bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up"> <div className="flex justify-between items-center mb-6"> <h3 className="text-xl font-bold text-white">{title}</h3> <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"><XMarkIcon className="w-5 h-5 text-slate-400" /></button> </div> {children} </div> </div> );
const getInitials = (name: string) => { const names = name.split(' '); if (names.length > 1 && names[0] && names[names.length - 1]) { return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase(); } return name.substring(0, 2).toUpperCase(); };

const ContactsPage: React.FC<ContactsPageProps> = ({ refreshTrigger, handleDatabaseChange, onSelectContact }) => {
    const toast = useToast();
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
    }, [fetchData, refreshTrigger]);

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
        toast.success(description);
    };

    const handleDelete = async () => {
        if (!modal.contact) return;
        const description = `تم حذف جهة الاتصال "${modal.contact.name}"`;
        const { error } = await supabase.from('contacts').delete().eq('id', modal.contact.id);
        if (error) {
            console.error('Error deleting contact', error.message);
            toast.error('لا يمكن حذف جهة الاتصال لارتباطها بديون');
        } else {
            setModal({ type: null, contact: null });
            handleDatabaseChange(description);
            toast.success(description);
        }
    };

    return (
        <div className="relative">
            <div className="relative mb-6 group">
                <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" />
                <input
                    type="text"
                    placeholder="ابحث بالاسم أو رقم الهاتف..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 p-3 pr-12 rounded-2xl text-white border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition shadow-inner"
                />
            </div>
            {loading && allContactsWithDebts.length === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-32 bg-slate-800/50 rounded-2xl animate-pulse"></div>)}
                </div>
            ) : filteredContacts.length === 0 ? (
                <div className="text-center py-16 bg-slate-900/20 rounded-3xl border-dashed border-2 border-slate-800">
                    <p className="text-slate-500 mb-6 text-lg">{searchTerm ? "لا يوجد أسماء تطابق بحثك." : "لم تقم بإضافة أي أسماء بعد."}</p>
                     <button onClick={() => setModal({ type: 'add', contact: null })} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl inline-flex items-center shadow-lg transition-transform hover:scale-105">
                        <PlusIcon className="w-5 h-5 ml-2" />
                        إضافة اسم جديد
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-24">
                    {filteredContacts.map(contact => (
                        <div key={contact.id} className="relative glass-card rounded-2xl p-1 hover:bg-white/5 transition-all group border border-white/5 hover:border-white/10">
                             <button onClick={() => onSelectContact(contact.id)} className="w-full text-right p-4 flex items-center justify-between focus:outline-none">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl flex-shrink-0 flex items-center justify-center font-bold text-white text-xl shadow-lg">
                                        {getInitials(contact.name)}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-lg text-white mb-1">{contact.name}</h3>
                                        {contact.netBalance !== 0 && (
                                            <div className={`text-sm font-bold flex items-center gap-1 ${contact.netBalance > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                <ScaleIcon className="w-3.5 h-3.5"/>
                                                <span dir="ltr">{formatCurrency(Math.abs(contact.netBalance))}</span>
                                                <span>{contact.netBalance > 0 ? '(لك)' : '(عليك)'}</span>
                                            </div>
                                        )}
                                        {contact.netBalance === 0 && contact.phone && <p className="text-sm text-slate-500">{contact.phone}</p>}
                                    </div>
                                </div>
                            </button>
                            
                            <div className="absolute top-4 left-4" ref={openMenuId === contact.id ? menuRef : null}>
                                <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === contact.id ? null : contact.id); }} className="p-2 text-slate-500 hover:text-white rounded-full hover:bg-white/10 transition-colors">
                                    <EllipsisVerticalIcon className="w-6 h-6"/>
                                </button>
                                {openMenuId === contact.id && (
                                    <div className="absolute left-0 mt-2 w-36 bg-slate-900 border border-white/10 rounded-xl shadow-xl z-10 animate-fade-in overflow-hidden">
                                       <button onClick={() => { setModal({ type: 'edit', contact }); setOpenMenuId(null); }} className="flex items-center gap-3 w-full text-right px-4 py-3 text-sm text-slate-300 hover:bg-white/10 transition"><PencilSquareIcon className="w-4 h-4"/> تعديل</button>
                                       <button onClick={() => { setModal({ type: 'delete', contact }); setOpenMenuId(null); }} className="flex items-center gap-3 w-full text-right px-4 py-3 text-sm text-rose-400 hover:bg-white/10 transition"><TrashIcon className="w-4 h-4"/> حذف</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Centered FAB */}
            <button 
                onClick={() => setModal({ type: 'add', contact: null })} 
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 h-16 w-16 bg-slate-900 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-300 border-4 border-slate-900 overflow-visible hover:scale-105 active:scale-95 group"
            >
                <div className="absolute inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <PlusIcon className="w-8 h-8 text-white transition-transform duration-300 group-hover:rotate-90"/>
                </div>
            </button>

            {/* Modals */}
            {(modal.type === 'add' || modal.type === 'edit') && (
                <Modal title={modal.type === 'add' ? 'إضافة اسم جديد' : 'تعديل الاسم'} onClose={() => setModal({ type: null, contact: null })}>
                    <ContactForm contact={modal.contact} onSave={handleSave} onCancel={() => setModal({ type: null, contact: null })} />
                </Modal>
            )}
            {modal.type === 'delete' && modal.contact && (
                <Modal title="تأكيد الحذف" onClose={() => setModal({ type: null, contact: null })}>
                    <p className="text-slate-300 mb-8 text-lg">هل أنت متأكد من حذف "<span className="font-bold text-white">{modal.contact.name}</span>"؟</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setModal({ type: null, contact: null })} className="py-3 px-6 text-slate-400 font-bold hover:text-white transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-3 px-6 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition font-bold shadow-lg">تأكيد الحذف</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default ContactsPage;
