
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
    // 1. استدعاء كافة الـ Hooks في بداية المكون (Unconditional Hooks)
    const [contact, setContact] = useState<Contact | null>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'on_you' | 'for_you'>('on_you');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportStatus, setExportStatus] = useState('');

    // توليد رقم مرجعي عشوائي للكشف - يجب أن يكون هنا قبل أي return
    const reportRef = useMemo(() => `GB-${Math.floor(1000 + Math.random() * 9000)}-${new Date().getFullYear()}`, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const contactPromise = supabase.from('contacts').select('*').eq('id', contactId).single();
            const debtsPromise = supabase.from('debts').select('*').eq('contact_id', contactId).order('created_at', { ascending: false });

            const [{ data: contactData }, { data: debtsData }] = await Promise.all([contactPromise, debtsPromise]);
            if (contactData) setContact(contactData);
            if (debtsData) setDebts(debtsData as unknown as Debt[]);
        } catch (err) {
            console.error("Error fetching contact data:", err);
        } finally {
            setLoading(false);
        }
    }, [contactId]);

    useEffect(() => { 
        fetchData(); 
    }, [fetchData]);

    const { forYou, onYou, netBalance } = useMemo(() => {
        const activeDebts = debts.filter(d => !d.paid);
        const f = activeDebts.filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);
        const o = activeDebts.filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
        return { forYou: f, onYou: o, netBalance: f - o };
    }, [debts]);

    const handleExportPDF = async () => {
        setIsExporting(true);
        setExportProgress(0);
        
        const steps = [
            { p: 20, s: 'جاري تجميع سجلات الديون...' },
            { p: 50, s: 'تحليل العمليات المالية وتدقيق الأرصدة...' },
            { p: 80, s: 'تنسيق القالب النهائي لكشف الحساب...' },
            { p: 100, s: 'جاهز للتصدير!' }
        ];

        for (const step of steps) {
            setExportStatus(step.s);
            setExportProgress(step.p);
            await new Promise(r => setTimeout(r, 400));
        }

        setTimeout(() => {
            window.print();
            setIsExporting(false);
        }, 300);
    };

    // 2. جمل الشرط (Conditional Returns) تأتي دائماً بعد الـ Hooks
    if (loading) return <div className="p-20 text-center animate-pulse text-slate-500 font-bold">جاري تحميل ملف العميل...</div>;
    if (!contact) return <div className="p-8 text-center text-rose-400">عذراً، جهة الاتصال غير موجودة.</div>;

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

            {/* Profile UI - Web View */}
            <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 bg-slate-900/50 print:hidden">
                <div className="flex items-center gap-5 mb-8">
                    <div className="w-20 h-20 bg-gradient-to-tr from-cyan-600 to-blue-700 rounded-3xl flex items-center justify-center font-bold text-white text-3xl shadow-xl">
                        {contact.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="font-black text-3xl text-white mb-1">{contact.name}</h2>
                        <p className="text-slate-500 font-bold text-sm">{contact.phone || 'بدون رقم هاتف مسجل'}</p>
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

            {/* List for Web View */}
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
                    <div className="text-center py-12 text-slate-600 font-medium">لا توجد سجلات في هذا التبويب.</div>
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
                            <h3 className="text-xl font-bold text-white">جاري إعداد الوثيقة</h3>
                            <p className="text-slate-400 text-sm font-medium">{exportStatus}</p>
                        </div>
                        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div 
                                className="absolute top-0 right-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                                style={{ width: `${exportProgress}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PROFESSIONAL PRINT TEMPLATE --- */}
            <div className="print-only print-container-wrapper bg-white text-black p-12 font-sans min-h-screen flex flex-col" dir="rtl">
                {/* PDF Header Section */}
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-10 mb-12">
                    <div>
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                <WalletIcon className="w-10 h-10" />
                            </div>
                            <div>
                                <h1 className="text-4xl font-black tracking-tight text-slate-900">كشف مطالبات مالي</h1>
                                <p className="text-slate-500 font-bold text-xs uppercase tracking-[0.2em] mt-1">نظام المحفظة الإلكترونية الذكية</p>
                            </div>
                        </div>
                    </div>
                    <div className="text-left bg-slate-50 p-4 rounded-2xl border border-slate-200 min-w-[200px]">
                        <p className="text-slate-400 font-bold text-[9px] mb-1 uppercase">الرقم المرجعي</p>
                        <p className="text-sm font-black text-slate-900 font-mono mb-3">{reportRef}</p>
                        <p className="text-slate-400 font-bold text-[9px] mb-1 uppercase">تاريخ الإصدار</p>
                        <p className="text-sm font-black text-slate-900 font-mono">{new Date().toLocaleDateString('ar-LY')}</p>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div className="bg-slate-50/50 p-6 rounded-3xl border-2 border-slate-100">
                        <p className="text-[10px] text-slate-400 font-bold uppercase mb-3 border-b border-slate-200 pb-2">بيانات العميل / الطرف المقابل</p>
                        <h3 className="text-2xl font-black text-slate-900 mb-1">{contact.name}</h3>
                        {contact.phone && <p className="text-slate-600 text-sm font-bold">الهاتف: <span className="font-mono">{contact.phone}</span></p>}
                    </div>
                    <div className="bg-slate-900 p-6 rounded-3xl text-white shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                        <p className="text-[10px] text-white/40 font-bold uppercase mb-4 border-b border-white/10 pb-2">الرصيد الختامي المستحق</p>
                        <div className="flex items-end gap-2">
                             <p className="text-4xl font-black">{formatCurrency(Math.abs(netBalance))}</p>
                             <span className={`text-xs font-bold mb-1.5 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {netBalance >= 0 ? '(مستحق لك)' : '(مستحق عليك)'}
                             </span>
                        </div>
                    </div>
                </div>

                {/* Detail Table */}
                <div className="flex-grow mb-16">
                    <div className="flex items-center gap-3 mb-6 px-2">
                        <div className="w-2 h-8 bg-slate-900 rounded-full"></div>
                        <h4 className="text-xl font-black text-slate-900">سجل العمليات التفصيلي</h4>
                    </div>
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-900 text-white">
                                <th className="p-5 text-right text-[10px] font-black uppercase rounded-tr-2xl">تاريخ العملية</th>
                                <th className="p-5 text-right text-[10px] font-black uppercase">البيان والوصف</th>
                                <th className="p-5 text-center text-[10px] font-black uppercase">التصنيف</th>
                                <th className="p-5 text-center text-[10px] font-black uppercase">الحالة</th>
                                <th className="p-5 text-left text-[10px] font-black uppercase rounded-tl-2xl">المبلغ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {debts.map((debt, idx) => (
                                <tr key={debt.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} border-b border-slate-100`}>
                                    <td className="p-5 text-xs font-black text-slate-600 font-mono">{new Date(debt.created_at).toLocaleDateString('ar-LY')}</td>
                                    <td className="p-5">
                                        <p className="font-bold text-slate-900 mb-0.5">{debt.description || 'عملية مالية مسجلة'}</p>
                                        {debt.due_date && <p className="text-[9px] text-slate-400">الاستحقاق: {new Date(debt.due_date).toLocaleDateString('ar-LY')}</p>}
                                    </td>
                                    <td className="p-5 text-center">
                                        <span className={`text-[9px] font-black px-3 py-1 rounded-full border ${debt.type === 'for_you' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                                            {debt.type === 'for_you' ? 'دائن (+)' : 'مدين (-)'}
                                        </span>
                                    </td>
                                    <td className="p-5 text-center">
                                        {debt.paid ? (
                                            <span className="text-[9px] font-bold text-emerald-600 flex items-center justify-center gap-1"><CheckCircleIcon className="w-3 h-3" /> تمت التسوية</span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">معلق</span>
                                        )}
                                    </td>
                                    <td className={`p-5 text-left font-black font-mono text-base ${debt.paid ? 'text-slate-300 line-through' : (debt.type === 'for_you' ? 'text-emerald-700' : 'text-rose-700')}`}>
                                        {formatCurrency(debt.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* OFFICIAL VALIDATION SECTION */}
                <div className="mt-auto border-t-2 border-slate-100 pt-12 pb-8">
                    <div className="grid grid-cols-2 gap-20 items-center">
                        <div className="space-y-4">
                            <h5 className="text-sm font-black text-slate-900 mb-2">المصادقة والاعتماد:</h5>
                            <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                تم استخراج هذا الكشف آلياً من نظام المحفظة الذكية. كافة البيانات المدرجة تخضع للمراجعة والتدقيق بين الأطراف المعنية.
                            </p>
                        </div>
                        
                        <div className="text-center">
                             <div className="inline-block border-2 border-slate-900 p-8 rounded-3xl relative min-w-[240px] bg-slate-50/30">
                                <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest absolute -top-3 left-1/2 -translate-x-1/2 bg-white px-3">توقيع ومصادقة مصدر الكشف</p>
                                <div className="h-16 flex items-center justify-center">
                                    <span className="text-slate-200 font-black text-4xl opacity-40 uppercase tracking-[0.3em]">GREENBOX</span>
                                </div>
                                <p className="text-[9px] text-slate-400 mt-4 italic font-bold">تعتبر هذه الوثيقة رسمية للمطالبة المالية</p>
                             </div>
                        </div>
                    </div>
                </div>

                {/* GREENBOX BRANDING FOOTER */}
                <div className="pt-8 border-t border-slate-100 flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 opacity-60">
                         <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-700 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-sm">GB</div>
                         <p className="text-xs font-black text-slate-900 tracking-tighter">GreenBox <span className="font-bold text-[10px] text-slate-400">Technologies</span></p>
                    </div>
                    <p className="text-[8px] text-slate-400 text-center font-bold uppercase tracking-[0.4em]">
                        تم التطوير بواسطة شركة جرين بوكس للحلول التقنية 2025 ©
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ContactProfilePage;
