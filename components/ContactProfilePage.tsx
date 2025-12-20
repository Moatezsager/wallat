
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
    CalendarDaysIcon,
    CheckCircleIcon,
    SparklesIcon
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
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportStatus, setExportStatus] = useState('');

    const fetchData = useCallback(async () => {
        setLoading(true);
        const contactPromise = supabase.from('contacts').select('*').eq('id', contactId).single();
        // جلب جميع الديون (حتى المدفوعة لإظهارها في الكشف الشامل إذا لزم الأمر، أو فقط النشطة)
        const debtsPromise = supabase.from('debts').select('*').eq('contact_id', contactId).order('created_at', { ascending: false });

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

    const handleExportPDF = async () => {
        setIsExporting(true);
        setExportProgress(0);
        
        // محاكاة خطوات التجهيز الاحترافية
        const steps = [
            { p: 20, s: 'جاري تجميع سجلات الديون...' },
            { p: 50, s: 'تحليل العمليات المالية وتدقيق الأرصدة...' },
            { p: 80, s: 'تنسيق القالب النهائي لكشف الحساب...' },
            { p: 100, s: 'جاهز للتصدير!' }
        ];

        for (const step of steps) {
            setExportStatus(step.s);
            setExportProgress(step.p);
            await new Promise(r => setTimeout(r, 600));
        }

        setTimeout(() => {
            window.print();
            setIsExporting(false);
        }, 500);
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-slate-500 font-bold">جاري تحميل الملف...</div>;
    if (!contact) return <div className="p-8 text-center text-rose-400">جهة الاتصال غير موجودة.</div>;

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* Header Actions */}
            <div className="flex justify-between items-center px-1 print:hidden">
                <button onClick={onBack} className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition flex items-center gap-2">
                    <ArrowRightIcon className="w-5 h-5" /> عودة
                </button>
                <button 
                    onClick={handleExportPDF} 
                    className="p-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-xl font-bold flex items-center gap-2 hover:from-cyan-500 hover:to-blue-500 transition-all shadow-xl shadow-cyan-900/20 active:scale-95 group"
                >
                    <DocumentArrowDownIcon className="w-5 h-5 group-hover:animate-bounce" /> تصدير كشف حساب PDF
                </button>
            </div>

            {/* Profile UI - UI Only */}
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

            {/* List for Web Interface */}
            <div className="space-y-4 print:hidden">
                <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/5">
                    <button onClick={() => setActiveTab('for_you')} className={`flex-1 py-3 rounded-xl font-bold transition ${activeTab === 'for_you' ? 'bg-emerald-600 text-white' : 'text-slate-500'}`}>الديون النشطة لك</button>
                    <button onClick={() => setActiveTab('on_you')} className={`flex-1 py-3 rounded-xl font-bold transition ${activeTab === 'on_you' ? 'bg-rose-600 text-white' : 'text-slate-500'}`}>الديون النشطة عليك</button>
                </div>
                
                {debts.filter(d => d.type === activeTab && !d.paid).length > 0 ? (
                    debts.filter(d => d.type === activeTab && !d.paid).map(debt => (
                        <div key={debt.id} className="glass-card p-5 rounded-2xl border border-white/5 flex justify-between items-center group">
                            <div>
                                <p className="font-bold text-white text-lg">{debt.description || 'بدون وصف'}</p>
                                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1"><CalendarDaysIcon className="w-3 h-3"/> {new Date(debt.created_at).toLocaleDateString('ar-LY')}</p>
                            </div>
                            <p className={`text-xl font-black ${activeTab === 'for_you' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(debt.amount)}</p>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-12 text-slate-600 font-medium">لا توجد ديون نشطة في هذا القسم.</div>
                )}
            </div>

            {/* Export Preparation Modal */}
            {isExporting && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in print:hidden">
                    <div className="glass-card bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-sm border border-white/10 text-center space-y-6 shadow-2xl">
                        <div className="w-20 h-20 bg-cyan-500/20 rounded-3xl flex items-center justify-center mx-auto">
                            <SparklesIcon className="w-10 h-10 text-cyan-400 animate-pulse" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-white">جاري إعداد كشف الحساب</h3>
                            <p className="text-slate-400 text-sm font-medium">{exportStatus}</p>
                        </div>
                        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="absolute top-0 right-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                style={{ width: `${exportProgress}%` }}
                            ></div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">يرجى الانتظار قليلاً</p>
                    </div>
                </div>
            )}

            {/* --- PROFESSIONAL PRINT TEMPLATE (ALL DEBTS) --- */}
            <div className="print-only print-container-wrapper bg-white text-black p-10 font-sans min-h-screen" dir="rtl">
                {/* PDF Header */}
                <div className="flex justify-between items-start border-b-8 border-slate-900 pb-8 mb-10">
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-14 h-14 bg-slate-900 rounded-2xl flex items-center justify-center text-white">
                                <WalletIcon className="w-8 h-8" />
                            </div>
                            <h1 className="text-4xl font-black tracking-tighter text-slate-900">كشف حساب مالي تفصيلي</h1>
                        </div>
                        <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">نظام إدارة المحفظة الإلكترونية الذكية - تقرير مالي رسمي</p>
                    </div>
                    <div className="text-left">
                        <p className="text-slate-400 font-bold text-[10px] mb-1 uppercase">تاريخ إصدار التقرير</p>
                        <p className="text-2xl font-black text-slate-900 font-mono">{new Date().toLocaleDateString('ar-LY')}</p>
                    </div>
                </div>

                {/* PDF Info Sections */}
                <div className="grid grid-cols-2 gap-10 mb-10">
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">جهة إصدار الكشف</p>
                        <h3 className="text-xl font-black text-slate-900">سجلاتي المالية الشخصية</h3>
                        <p className="text-slate-500 text-sm mt-1">تطبيق محفظتي الذكية</p>
                    </div>
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-2">الطرف الثاني (العميل)</p>
                        <h3 className="text-xl font-black text-slate-900">{contact.name}</h3>
                        {contact.phone && <p className="text-slate-500 text-sm mt-1 font-bold">هاتف: {contact.phone}</p>}
                    </div>
                </div>

                {/* PDF Summary Box */}
                <div className="grid grid-cols-3 gap-6 mb-12">
                    <div className="border-2 border-emerald-100 bg-emerald-50/30 p-6 rounded-3xl text-center">
                        <p className="text-xs text-emerald-600 font-bold mb-2">إجمالي الديون لك</p>
                        <p className="text-3xl font-black text-emerald-700">{formatCurrency(forYou)}</p>
                    </div>
                    <div className="border-2 border-rose-100 bg-rose-50/30 p-6 rounded-3xl text-center">
                        <p className="text-xs text-rose-600 font-bold mb-2">إجمالي الديون عليك</p>
                        <p className="text-3xl font-black text-rose-700">{formatCurrency(onYou)}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-3xl text-center shadow-xl">
                        <p className="text-xs text-slate-400 font-bold mb-2 uppercase tracking-wide">الرصيد النهائي (الصافي)</p>
                        <p className="text-3xl font-black text-white">{formatCurrency(Math.abs(netBalance))}</p>
                        <p className={`text-[10px] font-bold mt-1 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {netBalance >= 0 ? 'مبلغ مستحق لك بذمة الطرف الآخر' : 'مبلغ مستحق عليك للطرف الآخر'}
                        </p>
                    </div>
                </div>

                {/* PDF Comprehensive Table */}
                <div className="mb-20">
                    <h4 className="text-lg font-black mb-6 text-slate-900 border-r-8 border-slate-900 pr-3">سجل العمليات المالية (كافة الديون المسجلة)</h4>
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="p-4 rounded-tr-2xl text-right text-xs uppercase">تاريخ العملية</th>
                                <th className="p-4 text-right text-xs uppercase">البيان / الوصف</th>
                                <th className="p-4 text-center text-xs uppercase">النوع</th>
                                <th className="p-4 text-center text-xs uppercase">الحالة</th>
                                <th className="p-4 text-left rounded-tl-2xl text-xs uppercase">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {debts.map((debt, idx) => (
                                <tr key={debt.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100`}>
                                    <td className="p-4 text-sm font-bold text-slate-600">{new Date(debt.created_at).toLocaleDateString('ar-LY')}</td>
                                    <td className="p-4">
                                        <p className="font-black text-slate-900">{debt.description || 'بدون وصف إضافي'}</p>
                                        {debt.due_date && <p className="text-[10px] text-slate-500 mt-1">تاريخ الاستحقاق: {new Date(debt.due_date).toLocaleDateString('ar-LY')}</p>}
                                    </td>
                                    <td className="p-4 text-center">
                                        <span className={`font-bold text-xs ${debt.type === 'for_you' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {debt.type === 'for_you' ? 'مستحق لك' : 'مستحق عليك'}
                                        </span>
                                    </td>
                                    <td className="p-4 text-center">
                                        {debt.paid ? (
                                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold uppercase">تم السداد</span>
                                        ) : (
                                            <span className="text-[9px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase">نشط</span>
                                        )}
                                    </td>
                                    <td className={`p-4 text-left font-black font-mono text-lg ${debt.paid ? 'text-slate-400 line-through opacity-50' : (debt.type === 'for_you' ? 'text-emerald-600' : 'text-rose-600')}`}>
                                        {formatCurrency(debt.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {debts.length === 0 && (
                        <div className="text-center py-20 text-slate-400 font-bold border-2 border-dashed border-slate-100 rounded-b-3xl">لا توجد سجلات مالية مسجلة حالياً بين الطرفين</div>
                    )}
                </div>

                {/* PDF Footer with Signatures */}
                <div className="mt-auto pt-10 border-t-2 border-slate-100">
                    <div className="grid grid-cols-2 gap-20 mb-20">
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold mb-16 uppercase">توقيع ومصادقة (الطرف الأول)</p>
                            <div className="w-full h-px bg-slate-300"></div>
                        </div>
                        <div className="text-center">
                            <p className="text-xs text-slate-400 font-bold mb-16 uppercase">توقيع ومصادقة (الطرف الثاني)</p>
                            <div className="w-full h-px bg-slate-300"></div>
                        </div>
                    </div>
                    <p className="text-slate-400 text-center text-[10px] leading-relaxed font-medium">
                        تم إنشاء هذا المستند آلياً عبر تطبيق "محفظتي الإلكترونية الذكية" لعام 2025.<br/>
                        يعتبر هذا الكشف كشفاً استرشادياً للحساب ولا يمثل مستنداً قانونياً إلزامياً إلا في حال التوقيع عليه من كلا الطرفين.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ContactProfilePage;
