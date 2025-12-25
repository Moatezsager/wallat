
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
    SmartphoneIcon,
    FunnelIcon,
    PrinterIcon
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
    
    // إعدادات التصدير
    const [showExportModal, setShowExportModal] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [exportStatus, setExportStatus] = useState('');
    const [pdfFilters, setPdfFilters] = useState({
        type: 'all' as 'all' | 'for_you' | 'on_you',
        status: 'all' as 'all' | 'unpaid' | 'paid'
    });

    const reportRef = useMemo(() => `REF-${Math.floor(1000 + Math.random() * 9000)}`, []);
    const currentDate = useMemo(() => new Date().toLocaleDateString('ar-LY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), []);

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

    // معالجة البيانات المخصصة للتصدير
    const debtsToPrint = useMemo(() => {
        return debts.filter(d => {
            const typeMatch = pdfFilters.type === 'all' || d.type === pdfFilters.type;
            const statusMatch = pdfFilters.status === 'all' || 
                              (pdfFilters.status === 'paid' && d.paid) || 
                              (pdfFilters.status === 'unpaid' && !d.paid);
            return typeMatch && statusMatch;
        });
    }, [debts, pdfFilters]);

    const printStats = useMemo(() => {
        const forYou = debtsToPrint.filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);
        const onYou = debtsToPrint.filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
        return { forYou, onYou, net: forYou - onYou };
    }, [debtsToPrint]);

    const handleExportPDF = async () => {
        setShowExportModal(false);
        setIsExporting(true);
        setExportProgress(0);
        const steps = [
            { p: 30, s: 'جاري تجميع السجلات المخصصة...' },
            { p: 60, s: 'تدقيق الأرصدة والعمليات...' },
            { p: 90, s: 'تجهيز قالب الطباعة الاحترافي...' },
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
            <p className="text-slate-500 font-bold animate-pulse text-sm">جاري تحميل السجل المالي...</p>
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
                    onClick={() => setShowExportModal(true)} 
                    className="flex items-center gap-2 px-4 py-2.5 bg-cyan-600 text-white rounded-2xl font-black text-sm hover:bg-cyan-500 transition active:scale-95 shadow-lg shadow-cyan-900/20"
                >
                    <DocumentArrowDownIcon className="w-5 h-5" /> تصدير مخصص
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

                    <div className="w-full">
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

            {/* Transactions List */}
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
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-[2.5rem]">
                        <p className="text-slate-600 font-bold text-sm">لا توجد سجلات مطابقة حالياً</p>
                    </div>
                )}
            </div>

            {/* Export Settings Modal */}
            {showExportModal && (
                <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in print:hidden">
                    <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 space-y-8 animate-slide-up">
                        <div className="flex justify-between items-center">
                            <h3 className="text-xl font-black text-white flex items-center gap-2"><FunnelIcon className="w-6 h-6 text-cyan-500"/> تخصيص الكشف</h3>
                            <button onClick={() => setShowExportModal(false)} className="p-2 bg-white/5 rounded-full text-slate-500 hover:text-white"><XMarkIcon className="w-5 h-5"/></button>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">نوع المعاملات</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['all', 'for_you', 'on_you'] as const).map(t => (
                                        <button key={t} onClick={() => setPdfFilters(f => ({...f, type: t}))} className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${pdfFilters.type === t ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                            {t === 'all' ? 'الكل' : t === 'for_you' ? 'لك' : 'عليك'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">الحالة المالية</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['all', 'unpaid', 'paid'] as const).map(s => (
                                        <button key={s} onClick={() => setPdfFilters(f => ({...f, status: s}))} className={`py-2.5 rounded-xl text-[10px] font-black border transition-all ${pdfFilters.status === s ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-slate-800 text-slate-500 border-white/5'}`}>
                                            {s === 'all' ? 'الكل' : s === 'unpaid' ? 'معلقة' : 'تمت'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleExportPDF} 
                            className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-cyan-900/30 active:scale-95 flex items-center justify-center gap-3 transition-transform"
                        >
                            <PrinterIcon className="w-6 h-6" /> توليد الكشف المخصص
                        </button>
                    </div>
                </div>
            )}

            {/* Exporting Progress Modal */}
            {isExporting && (
                <div className="fixed inset-0 z-[120] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-fade-in print:hidden">
                    <div className="w-full max-w-xs space-y-8 text-center">
                        <div className="relative w-24 h-24 mx-auto">
                            <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
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

            {/* --- PRINT TEMPLATE (ENHANCED FOR LARGE AMOUNTS) --- */}
            <div className="print-only bg-white text-black p-8 font-sans min-h-screen relative" dir="rtl">
                {/* PDF Header with Date */}
                <div className="flex justify-between items-start border-b-[6px] border-slate-900 pb-8 mb-10">
                    <div>
                        <h1 className="text-4xl font-black text-slate-900 mb-2">كشف حساب مالي</h1>
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.2em]">محفظتي الإلكترونية الذكية</p>
                        <div className="mt-4 bg-slate-100 px-4 py-2 rounded-xl inline-flex items-center gap-2">
                            <CalendarDaysIcon className="w-4 h-4 text-slate-900" />
                            <span className="text-sm font-black text-slate-900">{currentDate}</span>
                        </div>
                    </div>
                    <div className="text-left">
                        <p className="text-[10px] font-black text-slate-400 uppercase">الرقم المرجعي</p>
                        <p className="font-mono text-sm font-black bg-slate-900 text-white px-3 py-1 rounded-lg">{reportRef}</p>
                    </div>
                </div>

                {/* Client Info & Summary Summary */}
                <div className="grid grid-cols-5 gap-6 mb-12">
                    <div className="col-span-2 bg-slate-50 p-6 rounded-[2.5rem] border-2 border-slate-100 flex flex-col justify-center">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3">جهة الاتصال</h4>
                        <p className="text-2xl font-black text-slate-900 leading-tight">{contact.name}</p>
                        <p className="text-slate-500 font-bold text-sm mt-1">{contact.phone || 'بدون هاتف'}</p>
                    </div>
                    <div className="col-span-3 bg-slate-900 p-8 rounded-[2.5rem] text-white flex flex-col justify-center shadow-xl">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-[11px] text-white/40 font-black uppercase tracking-widest">إجمالي الرصيد المستحق (للكشف الحالي)</h4>
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black ${printStats.net >= 0 ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                {printStats.net >= 0 ? 'رصيد دائن (+)' : 'رصيد مدين (-)'}
                            </span>
                        </div>
                        <p className="text-5xl font-black tabular-nums">{formatCurrency(Math.abs(printStats.net))}</p>
                    </div>
                </div>

                {/* PDF Stats Grid */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="p-5 border-2 border-slate-100 rounded-3xl bg-slate-50/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي ما لك</p>
                        <p className="text-2xl font-black text-emerald-600">{formatCurrency(printStats.forYou)}</p>
                    </div>
                    <div className="p-5 border-2 border-slate-100 rounded-3xl bg-slate-50/50">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-1">إجمالي ما عليك</p>
                        <p className="text-2xl font-black text-rose-600">{formatCurrency(printStats.onYou)}</p>
                    </div>
                </div>

                {/* Transactions with Amount on Independent Line */}
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                        <div className="w-8 h-1 bg-slate-900"></div> تفاصيل السجلات المالية
                    </h3>
                    
                    <div className="border-t-2 border-slate-100">
                        {debtsToPrint.length > 0 ? (
                            debtsToPrint.map((d, i) => (
                                <div key={d.id} className={`py-6 border-b-2 border-slate-50 flex justify-between items-start ${d.paid ? 'opacity-40' : ''}`}>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-1">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded border ${d.type === 'for_you' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700'}`}>
                                                {d.type === 'for_you' ? 'دائن (+)' : 'مدين (-)'}
                                            </span>
                                            <span className="text-[10px] font-mono text-slate-400">{new Date(d.created_at).toLocaleDateString('ar-LY')}</span>
                                            {d.paid && <span className="text-[9px] font-black text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase">تمت التسوية</span>}
                                        </div>
                                        <p className="text-lg font-bold text-slate-900 mb-2 leading-snug">{d.description || 'عملية مسجلة'}</p>
                                        
                                        {/* المبلغ في سطر مستقل وبخط عريض جداً */}
                                        <div className="bg-slate-50/80 p-4 rounded-2xl inline-block min-w-[200px]">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">قيمة العملية</p>
                                            <p className={`text-3xl font-black tabular-nums ${d.type === 'for_you' ? 'text-emerald-700' : 'text-rose-700'}`}>
                                                {d.type === 'for_you' ? '+' : '-'}{formatCurrency(d.amount)}
                                            </p>
                                        </div>
                                    </div>
                                    {d.due_date && !d.paid && (
                                        <div className="text-left border-r-2 border-slate-100 pr-4 mr-4">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">تاريخ الاستحقاق</p>
                                            <p className="text-sm font-black text-slate-900">{new Date(d.due_date).toLocaleDateString('ar-LY')}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : (
                            <p className="text-center py-20 text-slate-400 font-bold italic">لا توجد عمليات تطابق إعدادات التصدير المختارة.</p>
                        )}
                    </div>
                </div>

                {/* Footer with branding */}
                <div className="mt-20 pt-10 border-t-2 border-slate-100">
                    <div className="flex justify-between items-end">
                        <div className="text-slate-400 text-[9px] font-bold space-y-1">
                            <p>تاريخ إصدار التقرير: {new Date().toLocaleString('ar-LY')}</p>
                            <p>تم توليد هذا الكشف عبر تطبيق محفظتي الإلكترونية.</p>
                            <p className="text-slate-900 font-black pt-2 text-[10px]">By GreenBox 2025</p>
                        </div>
                        <div className="text-center">
                            <div className="w-32 h-1 bg-slate-900 mb-3 mx-auto"></div>
                            <p className="text-[10px] font-black text-slate-900 uppercase">الختم أو توقيع المصادقة</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactProfilePage;
