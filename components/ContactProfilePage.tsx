
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Contact, Debt } from '../types';
import {
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    XMarkIcon,
    ExclamationTriangleIcon,
    DocumentArrowDownIcon,
    ArrowRightIcon,
    WalletIcon,
    CalendarDaysIcon
} from './icons';

interface ContactProfilePageProps {
    contactId: string;
    onBack: () => void;
    handleDatabaseChange: (description?: string) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', {
        style: 'currency',
        currency: 'LYD',
        minimumFractionDigits: 2
    }).format(amount).replace('LYD', 'د.ل');
};

const ContactProfilePage: React.FC<ContactProfilePageProps> = ({ contactId, onBack, handleDatabaseChange }) => {
    const [contact, setContact] = useState<Contact | null>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'on_you' | 'for_you'>('on_you');
    const [modal, setModal] = useState<{ type: 'add' | 'edit' | 'delete' | null, debt: Debt | null }>({ type: null, debt: null });

    const fetchData = useCallback(async () => {
        setLoading(true);
        const contactPromise = supabase.from('contacts').select('*').eq('id', contactId).single();
        const debtsPromise = supabase.from('debts').select('*').eq('contact_id', contactId).order('created_at', { ascending: true });

        const [{ data: contactData }, { data: debtsData }] = await Promise.all([contactPromise, debtsPromise]);
        if (contactData) setContact(contactData);
        if (debtsData) setDebts(debtsData as unknown as Debt[]);
        setLoading(false);
    }, [contactId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const { forYou, onYou, netBalance } = useMemo(() => {
        const activeDebts = debts.filter(d => !d.paid);
        const f = activeDebts.filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);
        const o = activeDebts.filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
        return { forYou: f, onYou: o, netBalance: f - o };
    }, [debts]);

    const handleExportPDF = () => {
        // نستخدم setTimeout لضمان أن المتصفح قد قام بتحديث DOM قبل فتح نافذة الطباعة
        setTimeout(() => {
            window.print();
        }, 300);
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-slate-500 font-bold">جاري تحميل الملف...</div>;
    if (!contact) return <div className="p-8 text-center text-rose-400">جهة الاتصال غير موجودة.</div>;

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header Actions - Hidden in Print */}
            <div className="flex justify-between items-center px-1 print:hidden">
                <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-2">
                    <ArrowRightIcon className="w-5 h-5" /> عودة
                </button>
                <button 
                    onClick={handleExportPDF} 
                    className="p-3 bg-cyan-600 text-white rounded-xl font-bold flex items-center gap-2 hover:bg-cyan-500 transition-all shadow-xl shadow-cyan-900/20 active:scale-95"
                >
                    <DocumentArrowDownIcon className="w-5 h-5" /> تصدير كشف حساب
                </button>
            </div>

            {/* Profile UI - Hidden in Print */}
            <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 bg-slate-900/50 print:hidden">
                <div className="flex items-center gap-5 mb-8">
                    <div className="w-20 h-20 bg-gradient-to-tr from-cyan-600 to-blue-700 rounded-3xl flex items-center justify-center font-bold text-white text-3xl shadow-xl">
                        {contact.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="font-black text-3xl text-white mb-1">{contact.name}</h2>
                        <p className="text-slate-500 font-bold text-sm">{contact.phone || 'بدون رقم هاتف'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">لك (دائن)</p>
                        <p className="text-xl font-black text-white">{formatCurrency(forYou)}</p>
                    </div>
                    <div className="bg-rose-500/10 p-4 rounded-2xl border border-rose-500/20">
                        <p className="text-[10px] text-rose-400 font-bold uppercase mb-1">عليك (مدين)</p>
                        <p className="text-xl font-black text-white">{formatCurrency(onYou)}</p>
                    </div>
                </div>
            </div>

            {/* Main Tab UI - Hidden in Print */}
            <div className="space-y-4 print:hidden">
                <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
                    <button onClick={() => setActiveTab('for_you')} className={`flex-1 py-3 rounded-xl font-bold transition ${activeTab === 'for_you' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>مبالغ لك</button>
                    <button onClick={() => setActiveTab('on_you')} className={`flex-1 py-3 rounded-xl font-bold transition ${activeTab === 'on_you' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}>مبالغ عليك</button>
                </div>
                
                {debts.filter(d => d.type === activeTab && !d.paid).map(debt => (
                    <div key={debt.id} className="glass-card p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                        <div>
                            <p className="font-bold text-white text-lg">{debt.description || 'بدون وصف'}</p>
                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><CalendarDaysIcon className="w-3 h-3"/> {new Date(debt.created_at).toLocaleDateString('ar-LY')}</p>
                        </div>
                        <p className={`text-xl font-black ${activeTab === 'for_you' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(debt.amount)}</p>
                    </div>
                ))}
            </div>

            {/* --- PDF DOCUMENT TEMPLATE (VISIBLE ONLY DURING PRINT/EXPORT) --- */}
            <div className="print-only print-container-wrapper bg-white text-black p-10 font-sans" dir="rtl">
                {/* PDF Header */}
                <div className="flex justify-between items-start border-b-8 border-slate-900 pb-8 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                                <WalletIcon className="w-8 h-8" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tighter">كشف حساب مالي</h1>
                        </div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-sm">نظام إدارة المحفظة الإلكترونية الذكية</p>
                    </div>
                    <div className="text-left">
                        <p className="text-slate-400 font-bold text-xs mb-1 uppercase">تاريخ إصدار الكشف</p>
                        <p className="text-2xl font-black text-slate-900 font-mono">{new Date().toLocaleDateString('ar-LY')}</p>
                    </div>
                </div>

                {/* PDF Parties Section */}
                <div className="grid grid-cols-2 gap-10 mb-12">
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">الطرف الأول (المُصدر)</p>
                        <h3 className="text-2xl font-black text-slate-900 mb-1">محفظتي الخاصة</h3>
                        <p className="text-slate-500 font-medium">سجل مالي شخصي متكامل</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">الطرف الثاني (العميل/الجهة)</p>
                        <h3 className="text-2xl font-black text-slate-900 mb-1">{contact.name}</h3>
                        <p className="text-slate-500 font-bold">رقم الهاتف: {contact.phone || 'غير مسجل'}</p>
                    </div>
                </div>

                {/* PDF Summary Box */}
                <div className="grid grid-cols-3 gap-6 mb-12">
                    <div className="border-2 border-emerald-100 bg-emerald-50/30 p-6 rounded-3xl text-center">
                        <p className="text-xs text-emerald-600 font-bold mb-2">إجمالي ما لكم</p>
                        <p className="text-3xl font-black text-emerald-700">{formatCurrency(forYou)}</p>
                    </div>
                    <div className="border-2 border-rose-100 bg-rose-50/30 p-6 rounded-3xl text-center">
                        <p className="text-xs text-rose-600 font-bold mb-2">إجمالي ما عليكم</p>
                        <p className="text-3xl font-black text-rose-700">{formatCurrency(onYou)}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-3xl text-center">
                        <p className="text-xs text-slate-400 font-bold mb-2">الرصيد الصافي النهائي</p>
                        <p className="text-3xl font-black text-white">{formatCurrency(Math.abs(netBalance))}</p>
                        <p className="text-[10px] font-bold mt-1 text-cyan-400">
                            {netBalance >= 0 ? '(مبلغ مستحق لكم)' : '(مبلغ مستحق علينا)'}
                        </p>
                    </div>
                </div>

                {/* PDF Table */}
                <div className="mb-20">
                    <h4 className="text-lg font-black mb-6 text-slate-900 border-r-8 border-slate-900 pr-3">سجل العمليات التفصيلي</h4>
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="p-4 rounded-tr-2xl">التاريخ</th>
                                <th className="p-4">البيان / الوصف</th>
                                <th className="p-4 text-center">نوع العملية</th>
                                <th className="p-4 text-left rounded-tl-2xl">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {debts.map((debt, idx) => (
                                <tr key={debt.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'} ${debt.paid ? 'opacity-40 grayscale' : ''}`}>
                                    <td className="p-4 text-sm font-bold text-slate-600">{new Date(debt.created_at).toLocaleDateString('ar-LY')}</td>
                                    <td className="p-4">
                                        <p className="font-black text-slate-900">{debt.description || 'تسجيل مالي'}</p>
                                        {debt.paid && <span className="text-[9px] bg-slate-200 px-2 py-0.5 rounded-full font-bold">تمت التسوية</span>}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`font-bold px-3 py-1 rounded-lg text-xs ${debt.type === 'for_you' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                            {debt.type === 'for_you' ? 'دائن (لك)' : 'مدين (عليك)'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-left font-black text-slate-900 font-mono">{formatCurrency(debt.amount)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* PDF Footer */}
                <div className="mt-auto pt-10 border-t-2 border-slate-100 text-center">
                    <div className="grid grid-cols-2 gap-20 mb-20">
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold mb-16 uppercase">توقيع وختم الطرف الأول</p>
                            <div className="w-full h-px bg-slate-300"></div>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold mb-16 uppercase">توقيع الطرف الثاني</p>
                            <div className="w-full h-px bg-slate-300"></div>
                        </div>
                    </div>
                    <p className="text-slate-400 text-[10px] leading-relaxed">
                        هذا المستند تم إنشاؤه إلكترونياً عبر تطبيق "محفظتي الإلكترونية الذكية" لعام 2025.<br/>
                        كشف حساب استرشادي لا يعتبر وثيقة قانونية إلا في حال التوقيع والمصادقة عليه من الطرفين.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ContactProfilePage;
