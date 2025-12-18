
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Debt, Transaction, Page, Category } from '../types';
import QuickActions from './QuickActions';
import TransactionForm from './TransactionForm';
import { 
    ArrowDownIcon, ArrowUpIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
    PencilSquareIcon, TrashIcon, ArrowTrendingUp, iconMap, ExclamationTriangleIcon, CalendarDaysIcon, CheckCircleIcon, ChartBarSquareIcon, SparklesIcon,
    LandmarkIcon, BanknoteIcon, BriefcaseIcon, WalletIcon, TagIcon, ArrowTrendingDown, ScaleIcon, AccountsIcon
} from './icons';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js/auto';
import { logActivity } from '../lib/logger';

// --- Animated Counter Component ---
const AnimatedCounter: React.FC<{ value: number; currency?: string }> = ({ value, currency = 'د.ل' }) => {
    const [displayValue, setDisplayValue] = useState(0);

    useEffect(() => {
        let start = displayValue;
        const end = value;
        if (start === end) return;

        let totalDuration = 1000; // 1 second
        let startTime: number | null = null;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = currentTime - startTime;
            const percentage = Math.min(progress / totalDuration, 1);
            
            // Ease out quart
            const ease = 1 - Math.pow(1 - percentage, 4);
            
            const current = start + (end - start) * ease;
            setDisplayValue(current);

            if (progress < totalDuration) {
                requestAnimationFrame(animate);
            } else {
                setDisplayValue(end);
            }
        };

        requestAnimationFrame(animate);
    }, [value]);

    return (
        <span>
            {new Intl.NumberFormat('ar-LY', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(displayValue)}
            <span className="text-sm font-medium mr-1 opacity-70">{currency}</span>
        </span>
    );
};

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'LYD' };
    if (amount % 1 === 0) { options.minimumFractionDigits = 0; options.maximumFractionDigits = 0; } 
    else { options.minimumFractionDigits = 2; options.maximumFractionDigits = 2; }
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', currency);
};

const numericMonthLabels = Array.from({ length: 12 }, (_, i) => String(i + 1));
const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const getDaysRemaining = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const YearlyChart: React.FC<{ data: { income: number, expense: number }[] }> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const chartConfig: ChartConfiguration<'bar'> = {
            type: 'bar',
            data: {
                labels: numericMonthLabels,
                datasets: [
                    {
                        label: 'الإيرادات',
                        data: data.map(d => d.income),
                        backgroundColor: '#10b981',
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    },
                    {
                        label: 'المصروفات',
                        data: data.map(d => d.expense),
                        backgroundColor: '#f43f5e', 
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 12, bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo' }, displayColors: true } },
                scales: {
                    x: { ticks: { color: '#64748b', font: { family: 'Cairo' } }, grid: { display: false } },
                    y: { ticks: { color: '#64748b', font: { family: 'Cairo' } }, grid: { color: 'rgba(255, 255, 255, 0.03)', tickLength: 0 } } 
                }
            }
        };

        chartRef.current = new Chart(ctx, chartConfig);
        return () => { chartRef.current?.destroy(); };
    }, [data]);

    return <div className="h-56 lg:h-72 w-full"><canvas ref={canvasRef}></canvas></div>;
};

const DoughnutChart: React.FC<{ income: number, expense: number }> = ({ income, expense }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();
        
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const chartConfig: ChartConfiguration<'doughnut'> = {
            type: 'doughnut',
            data: {
                labels: ['الإيرادات', 'المصروفات'],
                datasets: [{
                    data: [income, expense],
                    backgroundColor: ['#10b981', '#f43f5e'],
                    borderColor: 'rgba(15, 23, 42, 1)', 
                    borderWidth: 0,
                    hoverOffset: 10,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                plugins: { legend: { display: false } }
            }
        };
        chartRef.current = new Chart(ctx, chartConfig);
        return () => chartRef.current?.destroy();
    }, [income, expense]);

    return <div className="h-full w-full"><canvas ref={canvasRef}></canvas></div>;
};


const MonthlySummaryModal: React.FC<{ 
    onClose: () => void; 
    year: number; 
    setActivePage: (page: Page) => void; 
}> = ({ onClose, year, setActivePage }) => {
    const [month, setMonth] = useState(new Date().getMonth());
    const [stats, setStats] = useState({ income: 0, expense: 0, topCategories: [] as any[] });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            const button = scrollRef.current.children[month] as HTMLElement;
            if (button) {
                const scrollLeft = button.offsetLeft - (scrollRef.current.clientWidth / 2) + (button.clientWidth / 2);
                scrollRef.current.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            }
        }
    }, [month]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0, 23, 59, 59);

                const { data, error } = await supabase
                    .from('transactions')
                    .select('amount, type, categories(name, color, icon)')
                    .gte('date', startDate.toISOString())
                    .lte('date', endDate.toISOString());

                if (error) throw error;

                let inc = 0, exp = 0;
                const categoryMap = new Map<string, any>();

                if (data) {
                    data.forEach((tx: any) => {
                        if (tx.type === 'income') inc += tx.amount;
                        else if (tx.type === 'expense') exp += tx.amount;

                        if (tx.type === activeTab) {
                            const catName = tx.categories?.name || 'غير مصنف';
                            const current = categoryMap.get(catName) || { 
                                name: catName, 
                                amount: 0,
                                count: 0,
                                color: tx.categories?.color || '#64748b',
                                icon: tx.categories?.icon
                            };
                            current.amount += tx.amount;
                            current.count += 1;
                            categoryMap.set(catName, current);
                        }
                    });
                }

                const topCats = Array.from(categoryMap.values())
                    .sort((a, b) => b.amount - a.amount)
                    .slice(0, 6); 

                setStats({ income: inc, expense: exp, topCategories: topCats });
            } catch (err) {
                console.error("Error fetching summary:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [month, year, activeTab]);

    const net = stats.income - stats.expense;
    const totalForTab = activeTab === 'expense' ? stats.expense : stats.income;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-lg bg-slate-900 rounded-[3rem] shadow-2xl border border-white/5 flex flex-col max-h-[92vh] overflow-hidden animate-slide-up">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-64 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none blur-3xl"></div>
                <div className="pt-8 px-6 pb-2 shrink-0 z-10 flex justify-between items-center">
                    <div>
                        <p className="text-xs text-cyan-400 font-bold tracking-widest uppercase mb-1">تقرير {year}</p>
                        <h3 className="text-2xl font-black text-white">الموجز المالي</h3>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex items-center justify-center group">
                        <XMarkIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </button>
                </div>
                <div className="overflow-y-auto custom-scrollbar flex-grow px-6 pb-6 z-10">
                    <div className="relative my-6 group">
                        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>
                        <div ref={scrollRef} className="flex overflow-x-auto gap-3 pb-4 pt-2 px-4 custom-scrollbar snap-x cursor-grab active:cursor-grabbing no-scrollbar">
                            {monthNames.map((m, i) => (
                                <button key={i} onClick={() => setMonth(i)} className={`relative shrink-0 px-5 py-3 rounded-2xl text-sm font-bold transition-all duration-500 snap-center overflow-hidden ${month === i ? 'text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-105' : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'}`}>
                                    {month === i && <div className="absolute inset-0 bg-gradient-to-tr from-cyan-600 to-blue-600 -z-10"></div>}
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-24 flex justify-center items-center flex-col gap-4">
                            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-slate-500 text-xs animate-pulse">جاري تحليل البيانات...</p>
                        </div>
                    ) : (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/40 p-5 rounded-[24px] border border-emerald-500/10 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="p-2 bg-emerald-500/20 rounded-lg text-emerald-400"><ArrowDownIcon className="w-4 h-4" /></div>
                                            <span className="text-xs font-bold text-emerald-100/60">الدخل</span>
                                        </div>
                                        <p className="text-2xl font-black text-white tracking-tight">{formatCurrency(stats.income)}</p>
                                    </div>
                                </div>
                                <div className="bg-slate-800/40 p-5 rounded-[24px] border border-rose-500/10 relative overflow-hidden group">
                                    <div className="relative z-10">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className="p-2 bg-rose-500/20 rounded-lg text-rose-400"><ArrowUpIcon className="w-4 h-4" /></div>
                                            <span className="text-xs font-bold text-rose-100/60">الصرف</span>
                                        </div>
                                        <p className="text-2xl font-black text-white tracking-tight">{formatCurrency(stats.expense)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="relative py-2">
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-full blur-[60px] animate-pulse-slow"></div>
                                <div className="h-64 w-64 mx-auto relative z-10">
                                    {stats.income === 0 && stats.expense === 0 ? (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-full bg-slate-900/50 backdrop-blur-sm">
                                            <span className="text-2xl mb-2">🤷‍♂️</span>
                                            <span className="text-xs">لا توجد بيانات</span>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="absolute inset-4 bg-slate-900 rounded-full z-0 shadow-2xl"></div>
                                            <DoughnutChart income={stats.income} expense={stats.expense} />
                                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-20">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">الصافي</span>
                                                <span className={`text-3xl font-black ${net >= 0 ? 'text-white' : 'text-rose-400'} drop-shadow-lg`}>
                                                    {formatCurrency(net)}
                                                </span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-950/30 rounded-[2rem] p-1 border border-white/5">
                                <div className="flex bg-slate-900/80 rounded-[1.5rem] p-1 mb-4 relative">
                                    <div className={`absolute top-1 bottom-1 w-[calc(50%-4px)] bg-slate-800 rounded-2xl shadow-lg transition-all duration-500 ease-out border border-white/5 ${activeTab === 'income' ? 'translate-x-0 right-1' : '-translate-x-[calc(100%+4px)] right-1'}`}></div>
                                    <button onClick={() => setActiveTab('income')} className={`flex-1 py-3 text-xs font-bold relative z-10 transition-colors duration-300 ${activeTab === 'income' ? 'text-white' : 'text-slate-500'}`}>الأعلى دخلاً</button>
                                    <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3 text-xs font-bold relative z-10 transition-colors duration-300 ${activeTab === 'expense' ? 'text-white' : 'text-slate-500'}`}>الأكثر صرفاً</button>
                                </div>
                                <div className="space-y-2 px-2 pb-2">
                                    {stats.topCategories.length > 0 ? stats.topCategories.map((cat, idx) => {
                                         const percentage = totalForTab > 0 ? (cat.amount / totalForTab) * 100 : 0;
                                         const Icon = cat.icon && iconMap[cat.icon] ? iconMap[cat.icon] : TagIcon;
                                         return (
                                            <div key={idx} className="flex items-center gap-4 p-3 hover:bg-white/5 rounded-2xl transition-colors group">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 shrink-0" style={{ backgroundColor: `${cat.color}20`, color: cat.color, border: `1px solid ${cat.color}30` }}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <span className="font-bold text-slate-200 text-sm">{cat.name}</span>
                                                        <span className="font-bold text-white text-sm">{formatCurrency(cat.amount)}</span>
                                                    </div>
                                                    <div className="relative w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="absolute top-0 right-0 h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_currentColor]" style={{ width: `${percentage}%`, backgroundColor: cat.color, color: cat.color }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                         )
                                    }) : <div className="text-center py-12"><p className="text-slate-500 text-xs">لا توجد تصنيفات لعرضها</p></div>}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-6 pt-0 z-20">
                    <button onClick={() => { onClose(); setActivePage('reports'); }} className="w-full py-4 bg-white text-slate-950 hover:bg-slate-200 rounded-[1.5rem] font-bold transition shadow-xl shadow-white/5 flex items-center justify-center gap-2 group active:scale-95">التقرير التفصيلي <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /></button>
                </div>
            </div>
        </div>
    );
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
        <div className="glass-card bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up border border-white/10">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            {children}
        </div>
    </div>
);

const TransactionDetailContent: React.FC<{ transaction: Transaction; onEdit: () => void; onDelete: () => void; }> = ({ transaction, onEdit, onDelete }) => {
    const details = [
        { label: 'المبلغ', value: formatCurrency(transaction.amount, transaction.accounts?.currency), color: transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400' },
        { label: 'النوع', value: transaction.type === 'income' ? 'إيراد' : 'مصروف' },
        { label: 'الحساب', value: transaction.accounts?.name || 'N/A' },
        { label: 'الفئة', value: transaction.categories?.name || 'غير مصنف' },
        { label: 'التاريخ', value: new Date(transaction.date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' }) },
    ];
    return (
        <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-2xl p-5 space-y-4 border border-white/5">
                {details.map(item => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">{item.label}</span>
                        <span className={`font-bold text-base ${item.color || 'text-slate-200'}`}>{item.value}</span>
                    </div>
                ))}
                {transaction.notes && <div className="pt-4 border-t border-white/5"><p className="text-xs text-slate-500 mb-2 font-bold">ملاحظات</p><p className="text-sm text-slate-300 bg-black/20 p-3 rounded-xl">{transaction.notes}</p></div>}
            </div>
            <div className="flex justify-end gap-3">
                <button onClick={onDelete} className="flex-1 py-3 px-4 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition flex items-center justify-center gap-2 font-bold"><TrashIcon className="w-5 h-5"/> حذف</button>
                <button onClick={onEdit} className="flex-1 py-3 px-4 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-xl transition flex items-center justify-center gap-2 font-bold"><PencilSquareIcon className="w-5 h-5"/> تعديل</button>
            </div>
        </div>
    );
};

const renderFormattedActivity = (text: string) => {
    const regex = /(\d+(?:\.\d+)?\s*د\.ل)|(إضافة|تسجيل|جديد)|(تعديل|تسوية|تحويل)|(حذف|مصروف|عليك|سداد)|(إيراد|لك|تحصيل)|(حساب|دين|معاملة|لـ|مع|في|من)/g;
    const parts = text.split(regex);
    return parts.map((part, i) => {
        if (!part) return null;
        if (part.match(/\d+(?:\.\d+)?\s*د\.ل/)) return <span key={i} className="text-amber-400 font-bold font-mono mx-1 bg-amber-400/10 px-1.5 py-0.5 rounded text-sm">{part}</span>;
        if (['إضافة', 'تسجيل', 'جديد'].includes(part)) return <span key={i} className="text-cyan-400 font-bold">{part}</span>;
        if (['تعديل', 'تسوية', 'تحويل'].includes(part)) return <span key={i} className="text-blue-400 font-bold">{part}</span>;
        if (['حذف', 'مصروف', 'عليك', 'سداد'].includes(part)) return <span key={i} className="text-rose-400 font-bold">{part}</span>;
        if (['إيراد', 'لك', 'تحصيل'].includes(part)) return <span key={i} className="text-emerald-400 font-bold">{part}</span>;
        if (['حساب', 'دين', 'معاملة', 'لـ', 'مع', 'في', 'من'].includes(part)) return <span key={i} className="text-slate-400 font-normal mx-0.5">{part}</span>;
        return <span key={i} className="text-slate-200">{part}</span>;
    });
};

const HomePage: React.FC<{ refreshTrigger: number; handleDatabaseChange: (description?: string) => void; setActivePage: (page: Page) => void; }> = ({ refreshTrigger, handleDatabaseChange, setActivePage }) => {
    const [stats, setStats] = useState({ netWorth: 0, debtsForYou: 0, debtsOnYou: 0 });
    const [lastTransactions, setLastTransactions] = useState<Transaction[]>([]);
    const [upcomingDebts, setUpcomingDebts] = useState<Debt[]>([]);
    const [yearlyData, setYearlyData] = useState<{ income: number[], expense: number[] }>({ income: [], expense: [] });
    const [loading, setLoading] = useState(true);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [lastActivity, setLastActivity] = useState<{ description: string; time: string; date: string } | null>(null);

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [accRes, debtRes, lastTxRes, yearlyRes, activityRes, catRes, upcomingDebtsRes] = await Promise.all([
                    supabase.from('accounts').select('*'),
                    supabase.from('debts').select('amount, type').eq('paid', false),
                    supabase.from('transactions').select('*, accounts:account_id(name, currency, type), categories(name, icon, color)').order('date', { ascending: false }).limit(5),
                    supabase.from('transactions').select('amount, date, type').in('type', ['income', 'expense']).gte('date', new Date(currentYear, 0, 1).toISOString()).lte('date', new Date(currentYear, 11, 31, 23, 59, 59).toISOString()),
                    supabase.from('activities').select('description, activity_date, activity_time').order('id', { ascending: false }).limit(1).single(),
                    supabase.from('categories').select('*'),
                    supabase.from('debts').select('*, contacts(name)').eq('paid', false).not('due_date', 'is', null).order('due_date', { ascending: true }).limit(5)
                ]);
                setAccounts(accRes.data || []);
                setCategories(catRes.data || []);
                
                const totalBalance = (accRes.data || []).reduce((sum, acc) => sum + acc.balance, 0);
                const debtsForYou = (debtRes.data || []).filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);
                const debtsOnYou = (debtRes.data || []).filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
                
                // Logic: (Accounts Balance + For You Debts) - On You Debts
                const netWorth = totalBalance + debtsForYou - debtsOnYou;

                setStats({ netWorth, debtsForYou, debtsOnYou });
                setLastTransactions(lastTxRes.data as unknown as Transaction[] || []);
                setUpcomingDebts(upcomingDebtsRes.data as unknown as Debt[] || []);
                if (activityRes.data) setLastActivity({ description: activityRes.data.description, date: activityRes.data.activity_date, time: activityRes.data.activity_time });
                const incomeByMonth = Array(12).fill(0);
                const expenseByMonth = Array(12).fill(0);
                (yearlyRes.data || []).forEach((tx: any) => {
                    const month = new Date(tx.date).getMonth();
                    if (tx.type === 'income') incomeByMonth[month] += tx.amount;
                    else if (tx.type === 'expense') expenseByMonth[month] += tx.amount;
                });
                setYearlyData({ income: incomeByMonth, expense: expenseByMonth });
            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        fetchAllData();
    }, [refreshTrigger, currentYear]);

    return (
        <div className="space-y-6 lg:space-y-10 pb-20 max-w-7xl mx-auto">
            <QuickActions onActionSuccess={handleDatabaseChange} />

            {/* Net Worth Card - Re-designed and Cleaned */}
            <div className="relative overflow-hidden rounded-[2.5rem] p-8 lg:p-12 text-white flex flex-col justify-between min-h-[14rem] lg:min-h-[18rem] shadow-2xl group border border-white/10"
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
                <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]"></div>
                
                <div className="relative z-10 flex justify-between items-start">
                    <div>
                        <p className="text-slate-400 font-bold text-xs lg:text-sm mb-1 tracking-widest uppercase flex items-center gap-2">
                             صافي الممتلكات الكلي <ScaleIcon className="w-3.5 h-3.5 text-cyan-500/50" />
                        </p>
                        <h2 className="text-4xl lg:text-7xl font-black tracking-tight text-white drop-shadow-xl">
                            <AnimatedCounter value={stats.netWorth} />
                        </h2>
                    </div>
                    {/* Modern Action Button - Wallet Icon */}
                    <button 
                        onClick={() => setActivePage('accounts')} 
                        className="p-4 bg-white/5 hover:bg-cyan-500/20 backdrop-blur-xl rounded-[1.5rem] border border-white/10 transition-all hover:scale-110 active:scale-95 group shadow-xl"
                        title="إدارة الحسابات"
                    >
                        <WalletIcon className="w-7 h-7 text-cyan-400 group-hover:text-white transition-transform" />
                    </button>
                </div>

                <div className="relative z-10 flex items-center gap-4 mt-8">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] lg:text-xs font-bold text-emerald-400 uppercase tracking-tighter">وضع مالي مستقر</span>
                    </div>
                    <div className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl">
                        <span className="text-[10px] lg:text-xs font-medium text-slate-400">إجمالي الحسابات: {formatCurrency(accounts.reduce((s,a)=>s+a.balance,0))}</span>
                    </div>
                </div>
            </div>

            {lastActivity && (
                <div className="glass-card rounded-2xl p-4 lg:p-6 border border-white/10 bg-gradient-to-r from-slate-900/80 to-slate-900/60 backdrop-blur-md shadow-lg flex flex-col gap-2 animate-fade-in relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-1 lg:w-2 h-full bg-cyan-500/50"></div>
                    <div className="flex items-start justify-between border-b border-white/5 pb-2 mb-1">
                        <div className="flex items-center gap-2">
                             <div className="relative">
                                <div className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.8)]"></div>
                             </div>
                             <span className="text-xs lg:text-sm text-cyan-400 font-bold tracking-wide uppercase">آخر نشاط مسجل</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 text-[10px] lg:text-xs text-slate-400 font-mono">
                             <div className="flex items-center gap-1 bg-slate-800/80 px-2 py-1 rounded-lg border border-white/5 shadow-sm">
                                <CalendarDaysIcon className="w-3 h-3 text-cyan-500/70" />
                                <span>{new Date(lastActivity.date).toLocaleDateString('ar-LY')}</span>
                            </div>
                        </div>
                    </div>
                    <p className="text-sm lg:text-base text-slate-200 font-medium pr-1 leading-7">
                        {renderFormattedActivity(lastActivity.description)}
                    </p>
                </div>
            )}

            <div className="grid grid-cols-2 lg:grid-cols-2 gap-4 lg:gap-6">
                <button onClick={() => setActivePage('debts')} className="glass-card p-6 lg:p-8 rounded-[2.5rem] flex flex-col justify-center items-start hover:bg-white/5 transition-all group relative overflow-hidden border border-white/5 hover:scale-[1.03] active:scale-95">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400 border border-emerald-500/20"><ArrowDownIcon className="w-6 h-6"/></div>
                        <span className="text-slate-400 text-xs lg:text-base font-bold">ديون لك</span>
                    </div>
                    <span className="text-2xl lg:text-4xl font-black text-white"><AnimatedCounter value={stats.debtsForYou} /></span>
                </button>
                <button onClick={() => setActivePage('debts')} className="glass-card p-6 lg:p-8 rounded-[2.5rem] flex flex-col justify-center items-start hover:bg-white/5 transition-all group relative overflow-hidden border border-white/5 hover:scale-[1.03] active:scale-95">
                    <div className="absolute right-0 top-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl group-hover:bg-rose-500/20 transition-all"></div>
                    <div className="flex items-center gap-3 mb-4">
                         <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 border border-rose-500/20"><ArrowUpIcon className="w-6 h-6"/></div>
                        <span className="text-slate-400 text-xs lg:text-base font-bold">ديون عليك</span>
                    </div>
                    <span className="text-2xl lg:text-4xl font-black text-white"><AnimatedCounter value={stats.debtsOnYou} /></span>
                </button>
            </div>

            {upcomingDebts.length > 0 && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-4 px-2">
                        <h2 className="text-lg lg:text-xl font-bold text-slate-200 flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-6 h-6 text-amber-500" />
                            تنبيهات الاستحقاق العاجلة
                        </h2>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {upcomingDebts.map(debt => {
                            const daysRemaining = getDaysRemaining(debt.due_date!);
                            return (
                                <div key={debt.id} className="glass-card p-5 rounded-2xl border border-white/5 relative overflow-hidden flex flex-col justify-between h-32 hover:-translate-y-1 transition-all hover:bg-white/5">
                                    <div className={`absolute top-0 right-0 w-1.5 h-full ${daysRemaining < 0 ? 'bg-rose-500' : 'bg-amber-500'}`}></div>
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-bold text-white text-base truncate max-w-[150px]">{debt.contacts?.name || 'دين'}</p>
                                            <p className="text-xs text-slate-500">{new Date(debt.due_date!).toLocaleDateString('ar-LY')}</p>
                                        </div>
                                        <div className={`text-base font-black ${debt.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(debt.amount)}</div>
                                    </div>
                                    <div className="mt-2">
                                         <span className={`text-[10px] lg:text-xs px-3 py-1 rounded-lg font-bold flex items-center gap-2 w-fit ${daysRemaining < 0 ? 'bg-rose-500/10 text-rose-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                            <ClockIcon className="w-4 h-4" />
                                            {daysRemaining < 0 ? `متأخر منذ ${Math.abs(daysRemaining)} يوم` : daysRemaining === 0 ? 'مستحق اليوم' : `باقي ${daysRemaining} أيام`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                <div className="lg:col-span-8 glass-card rounded-[2.5rem] p-8 lg:p-10 border border-white/5">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-xl lg:text-2xl font-bold text-white flex items-center gap-3">
                            <ChartBarSquareIcon className="w-7 h-7 text-cyan-400" />
                            تحليل التدفق المالي السنوي
                        </h2>
                        <div className="flex items-center gap-3">
                             <button onClick={() => setIsSummaryModalOpen(true)} className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 px-5 py-2.5 rounded-2xl font-bold text-sm transition-all flex items-center gap-3">
                                <ScaleIcon className="w-5 h-5" /> الملخص الشهري
                            </button>
                            <div className="flex items-center gap-2 bg-slate-900/50 rounded-xl p-1 border border-white/10 shadow-inner">
                                 <button onClick={() => setCurrentYear(y => y - 1)} className="p-2 text-slate-500 hover:text-white transition"><ChevronRightIcon className="w-4 h-4"/></button>
                                 <span className="text-sm font-black px-4 text-slate-300">{currentYear}</span>
                                 <button onClick={() => setCurrentYear(y => y + 1)} className="p-2 text-slate-500 hover:text-white transition"><ChevronLeftIcon className="w-4 h-4"/></button>
                            </div>
                        </div>
                    </div>
                    <YearlyChart data={Array.from({ length: 12 }, (_, i) => ({ income: yearlyData.income[i] || 0, expense: yearlyData.expense[i] || 0}))} />
                </div>

                <div className="lg:col-span-4 flex flex-col h-full">
                    <div className="flex justify-between items-end mb-4 px-2">
                        <h2 className="text-xl font-bold text-white">المعاملات الأخيرة</h2>
                        <button onClick={() => setActivePage('transactions')} className="text-xs lg:text-sm font-bold text-cyan-500 hover:underline">عرض الكل</button>
                    </div>
                    <div className="space-y-4 flex-1">
                        {loading ? [...Array(4)].map((_, i) => <div key={i} className="h-20 bg-slate-800/50 rounded-2xl animate-pulse"></div>) 
                        : lastTransactions.length > 0 ? lastTransactions.map(tx => {
                            const Icon = (tx.categories?.icon && iconMap[tx.categories.icon]) || (tx.type === 'income' ? ArrowDownIcon : ArrowUpIcon);
                            const bgColor = tx.categories?.color || (tx.type === 'income' ? '#10b981' : '#f43f5e');
                            return (
                                <div key={tx.id} onClick={() => { setSelectedTransaction(tx); setIsDetailModalOpen(true); }} 
                                    className="group relative bg-slate-900/40 backdrop-blur-md p-4 rounded-[1.5rem] flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition-all border border-white/5 hover:border-white/10 active:scale-[0.98] duration-200">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: bgColor }}><Icon className="w-6 h-6" /></div>
                                        <div>
                                            <p className="font-bold text-slate-200 text-base line-clamp-1">{tx.notes || tx.categories?.name || 'معاملة'}</p>
                                            <p className="text-xs text-slate-500 font-medium">{tx.accounts?.name} • {new Date(tx.date).toLocaleDateString('ar-LY')}</p>
                                        </div>
                                    </div>
                                    <div className={`font-black text-base ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </div>
                                </div>
                            )
                        }) : <div className="text-center py-10 text-slate-500 border border-dashed border-slate-800 rounded-3xl">لا توجد سجلات حالية</div>}
                    </div>
                </div>
            </div>

            {isDetailModalOpen && selectedTransaction && (
                <Modal title="تفاصيل المعاملة" onClose={() => setIsDetailModalOpen(false)}>
                    <TransactionDetailContent transaction={selectedTransaction} onEdit={() => { setIsDetailModalOpen(false); setIsEditModalOpen(true); }} onDelete={() => { }} />
                </Modal>
            )}
             {isEditModalOpen && selectedTransaction && (
                <Modal title="تعديل المعاملة" onClose={() => setIsEditModalOpen(false)}>
                    <TransactionForm transaction={selectedTransaction} onSave={() => { setIsEditModalOpen(false); handleDatabaseChange(); }} onCancel={() => setIsEditModalOpen(false)} accounts={accounts} categories={categories} />
                </Modal>
            )}
            {isSummaryModalOpen && (
                <MonthlySummaryModal onClose={() => setIsSummaryModalOpen(false)} year={currentYear} setActivePage={setActivePage} />
            )}
        </div>
    );
};

export default HomePage;
