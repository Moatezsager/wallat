
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Contact, Debt } from '../types';
import {
    PencilSquareIcon,
    TrashIcon,
    PlusIcon,
    XMarkIcon,
    DocumentArrowDownIcon,
    ArrowRightIcon,
    WalletIcon,
    CalendarDaysIcon,
    CheckCircleIcon,
    SparklesIcon,
    ArrowUpIcon,
    ArrowDownIcon,
    ClockIcon,
    // Fix: Replaced PhoneIcon with SmartphoneIcon which is available in icons.tsx
    SmartphoneIcon
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
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace('LYD', 'د.ل');
};

const ContactProfilePage: React.FC<ContactProfilePageProps> = ({ contactId, onBack, handleDatabaseChange }) => {
    const [contact, setContact] = useState<Contact | null>(null);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'unpaid' | 'paid'>('all');
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportStatus, setExportStatus] = useState('');

    const reportRef = useMemo(() => `REF-${Math.floor(1000 + Math.random() * 9000)}`, []);

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

    const stats = useMemo(() => {
        const forYou = debts.filter(d => d.type === 'for_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
        const onYou = debts.filter(d => d.type === 'on_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
        return { forYou, onYou, net: forYou - onYou };
    }, [debts]);

    const filteredDebts = useMemo(() => {
        if (activeTab === 'all') return debts;
        if (activeTab === 'unpaid') return debts.filter(d => !d.paid);
        return debts.filter(d => d.paid);
    }, [debts, activeTab]);

    const handleExportPDF = async () => {
        setIsExporting(true);
        setExportProgress(0);
        const steps = [
            { p: 30, s: 'جاري تجميع السجلات...' },
            { p: 60, s: 'تدقيق الأرصدة النهائية...' },
            { p: 90, s: 'تجهيز الكشف للطباعة...' },
            { p: 100, s: 'جاهز!' }
        ];
        for (const step of steps) {
            setExportStatus(step.s);
            setExportProgress(step.p);
            await new Promise(r => setTimeout(r, 400));
        }
        setTimeout(() => { window.print(); setIsExporting(false); }, 300);
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold animate-pulse text-sm">جاري تحميل السجل...</p>
        </div>
    );

    if (!contact) return <div className="p-8 text-center text-rose-400">جهة الاتصال غير موجودة.</div>;

    return (
        <div className="space-y-6 animate-fade-in relative pb-20">
            {/* Navigation Header */}
            <div className="flex justify-between items-center px-1 print:hidden">
                <button onClick={onBack} className="p-2.5 bg-slate-800 text-slate-300 rounded-2xl hover:bg-slate-700 transition active:scale-90">
                    <ArrowRightIcon className="w-6 h-6" />
                </button>
                <button 
                    onClick={handleExportPDF} 
                    className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-cyan-400 rounded-2xl font-bold text-sm hover:bg-white/10 transition active:scale-95"
                >
                    <DocumentArrowDownIcon className="w-5 h-5" /> تصدير PDF
                </button>
            </div>

            {/* Profile Hero Section */}
            <div className="relative overflow-hidden glass-card rounded-[2.5rem] p-8 border border-white/5 bg-slate-900/40 print:hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 rounded-full blur-[60px] -translate-y-1/2 translate-x-1/2"></div>
                
                <div className="flex flex-col items-center text-center relative z-10">
                    <div className="w-24 h-24 bg-gradient-to-tr from-cyan-600 to-blue-700 rounded-[2rem] flex items-center justify-center font-black text-white text-4xl shadow-2xl mb-4 border-4 border-slate-900 ring-1 ring-white/10">
                        {contact.name.charAt(0)}
                    </div>
                    <h2 className="font-black text-3xl text-white mb-1 tracking-tight">{contact.name}</h2>
                    <div className="flex items-center gap-2 text-slate-500 font-bold text-sm mb-8">
                        {contact.phone ? (
                            <><SmartphoneIcon className="w-4 h-4 text-slate-500" /><span className="font-mono">{contact.phone}</span></>
                        ) : 'لا يوجد رقم هاتف'}
                    </div>

                    <div className="w-full grid grid-cols-1 gap-3">
                        <div className={`p-5 rounded-3xl border transition-all ${stats.net >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">الرصيد الصافي المستحق</p>
                            <p className={`text-4xl font-black tabular-nums ${stats.net >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {formatCurrency(Math.abs(stats.net))}
                                <span className="text-xs font-bold mr-2 opacity-60">{stats.net >= 0 ? '(لك)' : '(عليك)'}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Statement Filter Tabs */}
            <div className="flex bg-slate-900/60 p-1 rounded-2xl border border-white/5 print:hidden">
                {(['all', 'unpaid', 'paid'] as const).map(tab => (
                    <button 
                        key={tab} 
                        onClick={() => setActiveTab(tab)} 
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === tab ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {tab === 'all' ? 'الكل' : tab === 'unpaid' ? 'معلقة' : 'تمت'}
                    </button>
                ))}
            </div>

            {/* Transactions / Statement List */}
            <div className="space-y-3 print:hidden">
                <div className="flex items-center justify-between px-2 mb-2">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <WalletIcon className="w-4 h-4" /> سجل العمليات المالية
                    </h3>
                    <span className="text-[10px] font-bold text-slate-600">{filteredDebts.length} عملية</span>
                </div>
                
                {filteredDebts.length > 0 ? (
                    filteredDebts.map(debt => {
                        const isForYou = debt.type === 'for_you';
                        return (
                            <div key={debt.id} className={`group relative p-4 rounded-3xl border transition-all active:scale-[0.98] ${debt.paid ? 'bg-slate-900/30 border-slate-800 opacity-60' : 'bg-slate-800/40 border-white/5'}`}>
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-inner ${debt.paid ? 'bg-slate-800 text-slate-600' : isForYou ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                            {debt.paid ? <CheckCircleIcon className="w-6 h-6" /> : isForYou ? <ArrowDownIcon className="w-6 h-6" /> : <ArrowUpIcon className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-white text-sm line-clamp-1">{debt.description || (isForYou ? 'دين جديد لك' : 'دين جديد عليك')}</p>
                                            <p className="text-[10px] text-slate-500 font-bold flex items-center gap-1 mt-0.5">
                                                <CalendarDaysIcon className="w-3 h-3" />
                                                {new Date(debt.created_at).toLocaleDateString('ar-LY')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <p className={`text-lg font-black tabular-nums ${debt.paid ? 'text-slate-500 line-through' : isForYou ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            {isForYou ? '+' : '-'}{formatCurrency(debt.amount)}
                                        </p>
                                        {debt.due_date && !debt.paid && (
                                            <span className="text-[9px] font-black text-amber-500/80 uppercase tracking-tighter">استحقاق: {new Date(debt.due_date).toLocaleDateString('ar-LY')}</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                        <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ClockIcon className="w-8 h-8 text-slate-700" />
                        </div>
                        <p className="text-slate-600 font-bold text-sm">لا توجد سجلات مطابقة حالياً</p>
                    </div>
                )}
            </div>

            {/* Exporting Progress Modal */}
            {isExporting && (
                <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in print:hidden">
                    <div className="w-full max-w-xs space-y-8 text-center">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
                            <div 
                                className="absolute inset-0 border-4 border-cyan-500 rounded-full transition-all duration-300"
                                style={{ 
                                    clipPath: `inset(0 ${100 - exportProgress}% 0 0)`,
                                    transform: 'rotate(-90deg)'
                                }}
                            ></div>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <SparklesIcon className="w-10 h-10 text-cyan-400 animate-pulse" />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-xl font-black text-white">جاري إنشاء الكشف</h3>
                            <p className="text-slate-400 text-sm font-bold">{exportStatus}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PRINT ONLY TEMPLATE (PROFESSIONAL) --- */}
            <div className="print-only bg-white text-black p-12 font-sans min-h-screen" dir="rtl">
                <div className="flex justify-between items-center border-b-4 border-slate-900 pb-8 mb-10">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900">كشف حساب مالي</h1>
                        <p className="text-slate-500 font-bold text-xs uppercase mt-1 tracking-widest">محفظتي الإلكترونية الذكية</p>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase">الرقم المرجعي</p>
                        <p className="font-mono text-sm font-black">{reportRef}</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-12">
                    <div className="bg-slate-50 p-6 rounded-3xl border-2 border-slate-100">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3">جهة الاتصال</h4>
                        <p className="text-2xl font-black text-slate-900">{contact.name}</p>
                        <p className="text-slate-600 font-bold text-sm mt-1">{contact.phone}</p>
                    </div>
                    <div className="bg-slate-900 p-6 rounded-3xl text-white">
                        <h4 className="text-[10px] font-white/40 font-black uppercase mb-3">صافي الرصيد الحالي</h4>
                        <p className="text-4xl font-black">{formatCurrency(Math.abs(stats.net))}</p>
                        <p className="text-xs font-bold mt-2 text-cyan-400">{stats.net >= 0 ? 'مستحق لك (دائن)' : 'مستحق عليك (مدين)'}</p>
                    </div>
                </div>

                <table className="w-full text-sm border-collapse">
                    <thead>
                        <tr className="bg-slate-900 text-white">
                            <th className="p-4 text-right rounded-tr-xl">التاريخ</th>
                            <th className="p-4 text-right">البيان</th>
                            <th className="p-4 text-center">النوع</th>
                            <th className="p-4 text-left rounded-tl-xl">المبلغ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {debts.map((d, i) => (
                            <tr key={d.id} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                <td className="p-4 font-mono text-slate-500 border-b border-slate-100">{new Date(d.created_at).toLocaleDateString('ar-LY')}</td>
                                <td className="p-4 font-bold border-b border-slate-100">{d.description || 'عملية مسجلة'}</td>
                                <td className="p-4 text-center border-b border-slate-100">
                                    <span className={`text-[10px] font-black px-2 py-1 rounded border ${d.type === 'for_you' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                        {d.type === 'for_you' ? 'دائن (+)' : 'مدين (-)'}
                                    </span>
                                </td>
                                <td className={`p-4 text-left font-black border-b border-slate-100 ${d.paid ? 'text-slate-300' : d.type === 'for_you' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                    {formatCurrency(d.amount)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <div className="mt-20 flex justify-between items-end border-t-2 border-slate-100 pt-10">
                    <div className="text-slate-400 text-[10px] font-bold">
                        <p>تاريخ الإصدار: {new Date().toLocaleString('ar-LY')}</p>
                        <p>هذا المستند تم توليده آلياً ولا يحتاج لختم رسمي.</p>
                    </div>
                    <div className="text-center">
                        <div className="w-32 h-1 bg-slate-900 mb-2"></div>
                        <p className="text-[10px] font-black text-slate-900 uppercase">توقيع المصادقة</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactProfilePage;
