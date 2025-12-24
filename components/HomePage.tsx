
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Debt, Transaction, Page, Category } from '../types';
import QuickActions from './QuickActions';
import TransactionForm from './TransactionForm';
import { 
    ArrowDownIcon, ArrowUpIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
    PencilSquareIcon, TrashIcon, ArrowTrendingUp, iconMap, ExclamationTriangleIcon, CalendarDaysIcon, CheckCircleIcon, ChartBarSquareIcon, SparklesIcon,
    LandmarkIcon, BanknoteIcon, BriefcaseIcon, WalletIcon, TagIcon, ArrowTrendingDown, ScaleIcon, AccountsIcon, ClipboardDocumentIcon, ZapIcon,
    ChevronDownIcon
} from './icons';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js/auto';
import { logActivity } from '../lib/logger';

// --- Shared Components for Reports ---

const DoughnutChart: React.FC<{ data: number[], colors: string[], labels: string[], cutout?: string }> = ({ data, colors, labels, cutout = '75%' }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{ 
                    data, 
                    backgroundColor: colors, 
                    borderColor: 'rgba(15, 23, 42, 1)', 
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true, 
                maintainAspectRatio: false, 
                cutout,
                plugins: { legend: { display: false } }
            }
        });
        return () => chartRef.current?.destroy();
    }, [data, labels, colors, cutout]);
    return <div className="h-full w-full"><canvas ref={canvasRef}></canvas></div>;
};

const MonthlyReportModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
    const [loading, setLoading] = useState(false);
    const [monthlyData, setMonthlyData] = useState<{ totalIncome: number; totalExpense: number; incomeCategories: any[]; expenseCategories: any[]; }>({
        totalIncome: 0, totalExpense: 0, incomeCategories: [], expenseCategories: []
    });
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    useEffect(() => {
        if (scrollRef.current) {
            const activeBtn = scrollRef.current.children[month] as HTMLElement;
            if (activeBtn) {
                scrollRef.current.scrollTo({
                    left: activeBtn.offsetLeft - (scrollRef.current.clientWidth / 2) + (activeBtn.clientWidth / 2),
                    behavior: 'smooth'
                });
            }
        }
    }, [month]);

    useEffect(() => {
        const fetchMonthlyData = async () => {
            setLoading(true);
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);
            
            const { data } = await supabase
                .from('transactions')
                .select('amount, type, categories(name, color, icon)')
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString())
                .in('type', ['income', 'expense']);
            
            let tIncome = 0, tExpense = 0;
            const incMap = new Map<string, any>(), expMap = new Map<string, any>();
            
            data?.forEach((tx: any) => {
                const catName = tx.categories?.name || 'غير مصنف';
                const catColor = tx.categories?.color || '#64748b';
                const catIcon = tx.categories?.icon;

                if (tx.type === 'income') {
                    tIncome += tx.amount;
                    const c = incMap.get(catName) || { name: catName, amount: 0, count: 0, color: catColor, icon: catIcon };
                    c.amount += tx.amount;
                    c.count += 1;
                    incMap.set(catName, c);
                } else {
                    tExpense += tx.amount;
                    const c = expMap.get(catName) || { name: catName, amount: 0, count: 0, color: catColor, icon: catIcon };
                    c.amount += tx.amount;
                    c.count += 1;
                    expMap.set(catName, c);
                }
            });

            const process = (map: Map<string, any>, total: number) => 
                Array.from(map.values())
                    .map(c => ({ ...c, percentage: total > 0 ? (c.amount / total) * 100 : 0 }))
                    .sort((a, b) => b.amount - a.amount);

            setMonthlyData({ 
                totalIncome: tIncome, 
                totalExpense: tExpense, 
                incomeCategories: process(incMap, tIncome), 
                expenseCategories: process(expMap, tExpense) 
            });
            setLoading(false);
        };
        fetchMonthlyData();
    }, [year, month]);

    const activeCategories = activeTab === 'expense' ? monthlyData.expenseCategories : monthlyData.incomeCategories;
    const activeTotal = activeTab === 'expense' ? monthlyData.totalExpense : monthlyData.totalIncome;

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
            <div className="relative w-full max-w-lg bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
                
                <div className="p-6 pb-2 shrink-0 z-10 flex justify-between items-center bg-slate-900/50">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button onClick={() => setYear(y => y - 1)} className="p-1 text-slate-500 hover:text-cyan-400 transition"><ChevronRightIcon className="w-3 h-3"/></button>
                            <span className="text-[10px] font-black text-cyan-500 uppercase tracking-widest">{year}</span>
                            <button onClick={() => setYear(y => y + 1)} className="p-1 text-slate-500 hover:text-cyan-400 transition"><ChevronLeftIcon className="w-3 h-3"/></button>
                        </div>
                        <h3 className="text-xl font-black text-white">الموجز المالي</h3>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full bg-white/5 text-slate-400 border border-white/5 hover:text-white transition-colors">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="px-6 shrink-0">
                    <div ref={scrollRef} className="flex gap-2 overflow-x-auto no-scrollbar py-4 snap-x">
                        {monthNames.map((name, i) => (
                            <button 
                                key={i} 
                                onClick={() => setMonth(i)}
                                className={`shrink-0 px-5 py-2.5 rounded-2xl text-xs font-bold transition-all snap-center border ${month === i ? 'bg-cyan-500 text-white border-cyan-400 shadow-lg shadow-cyan-500/20 scale-105' : 'bg-slate-800 text-slate-500 border-white/5 hover:bg-slate-700'}`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 pt-2 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4">
                            <div className="w-12 h-12 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin"></div>
                            <p className="text-slate-500 font-bold animate-pulse text-sm">جاري تحليل البيانات...</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-slate-800/40 p-5 rounded-[2rem] border border-white/5 relative overflow-hidden">
                                <div className="flex items-center justify-between gap-6 relative z-10">
                                    <div className="space-y-4 flex-1">
                                        <div className="flex justify-between items-center group">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                                                <span className="text-xs font-bold text-slate-400">إجمالي الدخل</span>
                                            </div>
                                            <span className="text-sm font-black text-emerald-400">{new Intl.NumberFormat('ar-LY').format(monthlyData.totalIncome)} د.ل</span>
                                        </div>
                                        <div className="flex justify-between items-center group">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"></div>
                                                <span className="text-xs font-bold text-slate-400">إجمالي المصروف</span>
                                            </div>
                                            <span className="text-sm font-black text-rose-400">{new Intl.NumberFormat('ar-LY').format(monthlyData.totalExpense)} د.ل</span>
                                        </div>
                                        <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">الصافي</span>
                                            <span className={`text-base font-black ${monthlyData.totalIncome - monthlyData.totalExpense >= 0 ? 'text-cyan-400' : 'text-rose-500'}`}>
                                                {new Intl.NumberFormat('ar-LY').format(monthlyData.totalIncome - monthlyData.totalExpense)} د.ل
                                            </span>
                                        </div>
                                    </div>
                                    <div className="h-28 w-28 shrink-0 relative">
                                        <DoughnutChart 
                                            data={[monthlyData.totalIncome || 1, monthlyData.totalExpense || 0]} 
                                            labels={['دخل', 'صرف']} 
                                            colors={['#10b981', '#f43f5e']} 
                                            cutout="75%"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <ScaleIcon className="w-5 h-5 text-slate-700" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <div className="flex bg-slate-800/80 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                                    <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'expense' ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/30 scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}>
                                        <ArrowUpIcon className="w-4 h-4"/> المصروفات
                                    </button>
                                    <button onClick={() => setActiveTab('income')} className={`flex-1 py-3 rounded-xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'income' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/30 scale-[1.02]' : 'text-slate-500 hover:text-slate-300'}`}>
                                        <ArrowDownIcon className="w-4 h-4"/> الإيرادات
                                    </button>
                                </div>

                                <div className="space-y-3">
                                    {activeCategories.length > 0 ? activeCategories.map((cat, i) => {
                                        const Icon = (cat.icon && iconMap[cat.icon]) ? iconMap[cat.icon] : TagIcon;
                                        return (
                                            <div key={i} className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-white/5 hover:bg-slate-800/40 transition-colors group">
                                                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: cat.color }}>
                                                    <Icon className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1.5">
                                                        <div className="flex items-center gap-2 overflow-hidden">
                                                            <span className="text-sm font-bold text-white truncate">{cat.name}</span>
                                                            <span className="shrink-0 text-[10px] font-black px-2 py-0.5 bg-white/5 rounded-full text-slate-500 border border-white/5">{cat.count} عملية</span>
                                                        </div>
                                                        <span className="text-sm font-black text-slate-200 shrink-0">{new Intl.NumberFormat('ar-LY').format(cat.amount)} د.ل</span>
                                                    </div>
                                                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                                        <div className="h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }) : (
                                        <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center gap-3">
                                            <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center">
                                                <ClipboardDocumentIcon className="w-6 h-6 text-slate-600" />
                                            </div>
                                            <p className="text-slate-600 text-xs font-bold">لا توجد سجلات لهذا القسم في {monthNames[month]}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
                <div className="pb-safe shrink-0"></div>
            </div>
        </div>
    );
};

const AnimatedCounter: React.FC<{ value: number; currency?: string }> = ({ value, currency = 'د.ل' }) => {
    const [displayValue, setDisplayValue] = useState(0);
    useEffect(() => {
        let start = displayValue; const end = value; if (start === end) return;
        let totalDuration = 1000; let startTime: number | null = null;
        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = currentTime - startTime;
            const percentage = Math.min(progress / totalDuration, 1);
            const ease = 1 - Math.pow(1 - percentage, 4);
            const current = start + (end - start) * ease;
            setDisplayValue(current);
            if (progress < totalDuration) requestAnimationFrame(animate); else setDisplayValue(end);
        };
        requestAnimationFrame(animate);
    }, [value]);
    return (
        <span className="tabular-nums">
            {new Intl.NumberFormat('ar-LY', { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(displayValue)}
            <span className="text-[0.4em] font-medium mr-1.5 opacity-60">{currency}</span>
        </span>
    );
};

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', currency);
};

const getDaysInfo = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const HomePage: React.FC<{ refreshTrigger: number; handleDatabaseChange: (description?: string) => void; setActivePage: (page: Page) => void; }> = ({ refreshTrigger, handleDatabaseChange, setActivePage }) => {
    const [stats, setStats] = useState({ netWorth: 0, debtsForYou: 0, debtsOnYou: 0 });
    const [lastTransactions, setLastTransactions] = useState<Transaction[]>([]);
    const [urgentDebts, setUrgentDebts] = useState<Debt[]>([]);
    const [recentActivities, setRecentActivities] = useState<any[]>([]);
    const [isActivitiesExpanded, setIsActivitiesExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [isMonthlyModalOpen, setIsMonthlyModalOpen] = useState(false);
    const [annualChartData, setAnnualChartData] = useState<{ income: number[], expense: number[] }>({ income: Array(12).fill(0), expense: Array(12).fill(0) });
    const chartRef = useRef<Chart | null>(null);
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const now = new Date();
                const yearStart = new Date(now.getFullYear(), 0, 1).toISOString();
                
                const [accRes, debtRes, lastTxRes, annualRes, urgentDebtsRes, activitiesRes] = await Promise.all([
                    supabase.from('accounts').select('*'),
                    supabase.from('debts').select('amount, type').eq('paid', false),
                    supabase.from('transactions').select('*, accounts:account_id(name, currency, type), categories(name, icon, color)').order('date', { ascending: false }).limit(5),
                    supabase.from('transactions').select('amount, type, date').gte('date', yearStart).in('type', ['income', 'expense']),
                    supabase.from('debts').select('*, contacts(name)').eq('paid', false).not('due_date', 'is', null).order('due_date', { ascending: true }),
                    supabase.from('activities').select('*').order('activity_date', { ascending: false }).order('activity_time', { ascending: false }).limit(10)
                ]);

                const totalBalance = (accRes.data || []).reduce((sum, acc) => sum + acc.balance, 0);
                const forYou = (debtRes.data || []).filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);
                const onYou = (debtRes.data || []).filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
                setStats({ netWorth: totalBalance + forYou - onYou, debtsForYou: forYou, debtsOnYou: onYou });
                setLastTransactions(lastTxRes.data as unknown as Transaction[] || []);
                setRecentActivities(activitiesRes.data || []);

                const incArr = Array(12).fill(0), expArr = Array(12).fill(0);
                annualRes.data?.forEach(tx => {
                    const month = new Date(tx.date).getMonth();
                    if (tx.type === 'income') incArr[month] += tx.amount;
                    else expArr[month] += tx.amount;
                });
                setAnnualChartData({ income: incArr, expense: expArr });

                const filteredUrgent = (urgentDebtsRes.data as unknown as Debt[] || []).filter(d => {
                    const days = getDaysInfo(d.due_date);
                    return days !== null && days <= 7;
                }).slice(0, 3);
                setUrgentDebts(filteredUrgent);

            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        fetchAllData();
    }, [refreshTrigger]);

    useEffect(() => {
        if (!canvasRef.current || loading) return;
        if (chartRef.current) chartRef.current.destroy();
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    { label: 'الإيرادات', data: annualChartData.income, backgroundColor: '#10b981', borderRadius: 4 },
                    { label: 'المصروفات', data: annualChartData.expense, backgroundColor: '#f43f5e', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { color: '#64748b', font: { family: 'Cairo', size: 10 } }, grid: { display: false } },
                    y: { display: false }
                }
            }
        });
    }, [annualChartData, loading]);

    // النشاطات المعروضة بناءً على حالة التوسيع
    const displayedActivities = isActivitiesExpanded ? recentActivities : recentActivities.slice(0, 1);

    return (
        <div className="space-y-6 pb-24 max-w-5xl mx-auto px-1 flex flex-col">
            
            {/* 1. Net Worth Card (Priority) */}
            <div className="relative overflow-hidden rounded-[2.5rem] p-7 text-white flex flex-col justify-between min-h-[12rem] shadow-2xl border border-white/5 bg-slate-900 order-1 animate-slide-up">
                <div className="absolute inset-0 opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-cyan-500/20 rounded-full blur-[60px]"></div>
                
                <div className="relative z-10">
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                         صافي الممتلكات <ScaleIcon className="w-3 h-3 opacity-50" />
                    </p>
                    <h2 className="text-4xl xs:text-5xl font-black tracking-tight leading-tight">
                        <AnimatedCounter value={stats.netWorth} />
                    </h2>
                </div>

                <div className="relative z-10 flex items-center justify-between mt-6">
                    <button onClick={() => setIsMonthlyModalOpen(true)} className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl flex items-center gap-2 transition active:scale-95">
                        <SparklesIcon className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-cyan-400">موجز الشهر</span>
                    </button>
                    <button onClick={() => setActivePage('accounts')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all active:scale-95 shadow-xl">
                        <WalletIcon className="w-6 h-6 text-cyan-400" />
                    </button>
                </div>
            </div>

            {/* 2. Stats Cards (Overview) - MOVED HERE */}
            <div className="grid grid-cols-2 gap-3 order-2 animate-fade-in">
                <button onClick={() => setActivePage('debts')} className="glass-card p-5 rounded-[1.5rem] flex flex-col items-start hover:bg-white/5 transition-all group border border-white/5 bg-slate-900/40 shadow-lg">
                    <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400 mb-3 group-hover:scale-110 transition-transform"><ArrowDownIcon className="w-5 h-5"/></div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase mb-1">ديون لك</span>
                    <span className="text-lg font-black text-white tabular-nums">{formatCurrency(stats.debtsForYou)}</span>
                </button>
                <button onClick={() => setActivePage('debts')} className="glass-card p-5 rounded-[1.5rem] flex flex-col items-start hover:bg-white/5 transition-all group border border-white/5 bg-slate-900/40 shadow-lg">
                    <div className="p-2.5 bg-rose-500/10 rounded-xl text-rose-400 mb-3 group-hover:scale-110 transition-transform"><ArrowUpIcon className="w-5 h-5"/></div>
                    <span className="text-slate-400 text-[10px] font-bold uppercase mb-1">ديون عليك</span>
                    <span className="text-lg font-black text-white tabular-nums">{formatCurrency(stats.debtsOnYou)}</span>
                </button>
            </div>

            {/* 3. Quick Actions (Ease of use) */}
            <div className="order-3">
                <QuickActions onActionSuccess={handleDatabaseChange} />
            </div>

            {/* 4. Activities Section - DEVELOPED (The "What just happened") */}
            <div className="space-y-4 animate-fade-in order-4">
                <div className="flex justify-between items-center px-1">
                    <h2 className="text-sm font-black text-white flex items-center gap-2 uppercase tracking-widest">
                        <ZapIcon className="w-4 h-4 text-amber-400" /> آخر نشاط مسجل
                    </h2>
                    {recentActivities.length > 1 && (
                        <button 
                            onClick={() => setIsActivitiesExpanded(!isActivitiesExpanded)} 
                            className="text-[10px] font-black text-cyan-500 flex items-center gap-1 bg-cyan-500/5 px-3 py-1 rounded-full border border-cyan-500/10 active:scale-95 transition-all"
                        >
                            {isActivitiesExpanded ? 'إخفاء' : 'سجل النشاطات (10)'}
                            <ChevronDownIcon className={`w-3 h-3 transition-transform duration-300 ${isActivitiesExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    )}
                </div>
                <div className="glass-card rounded-[2rem] border border-white/5 overflow-hidden transition-all duration-500 ease-in-out">
                    {loading ? (
                        <div className="p-6">
                            <div className="h-10 bg-slate-800/50 rounded-xl animate-pulse"></div>
                        </div>
                    ) : recentActivities.length > 0 ? (
                        <div className="divide-y divide-white/5">
                            {displayedActivities.map((act, index) => (
                                <div 
                                    key={act.id} 
                                    className={`p-4 flex items-start gap-4 hover:bg-white/5 transition-colors ${index === 0 && !isActivitiesExpanded ? 'bg-cyan-500/5' : ''} animate-slide-up`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border border-white/5 shadow-sm ${index === 0 ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                                        {index === 0 ? <SparklesIcon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-bold leading-snug mb-1 ${index === 0 ? 'text-white' : 'text-slate-300'}`}>{act.description}</p>
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                                            <span className="flex items-center gap-1"><CalendarDaysIcon className="w-3 h-3" /> {new Date(act.activity_date).toLocaleDateString('ar-LY')}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                                            <span className="flex items-center gap-1"><ClockIcon className="w-3 h-3" /> {act.activity_time}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-10 text-slate-600 font-bold">لا يوجد نشاط مسجل بعد</div>
                    )}
                </div>
            </div>

            {/* 5. Urgent Debts Section (Alerts) */}
            {urgentDebts.length > 0 && (
                <div className="space-y-3 animate-fade-in order-5">
                    <div className="flex justify-between items-center px-1">
                        <h2 className="text-sm font-black text-rose-500 flex items-center gap-2 uppercase tracking-wider">
                            <ExclamationTriangleIcon className="w-4 h-4 animate-pulse" /> استحقاقات عاجلة
                        </h2>
                        <button onClick={() => setActivePage('debts')} className="text-[10px] font-bold text-slate-500 bg-slate-800 px-3 py-1 rounded-full border border-white/5 transition active:scale-95">عرض الكل</button>
                    </div>
                    <div className="flex overflow-x-auto gap-3 pb-2 no-scrollbar snap-x">
                        {urgentDebts.map(debt => {
                            const days = getDaysInfo(debt.due_date);
                            const isOverdue = days !== null && days < 0;
                            const isToday = days === 0;
                            
                            return (
                                <button key={debt.id} onClick={() => setActivePage('debts')} className="flex-shrink-0 w-[80%] xs:w-[260px] snap-center glass-card p-4 rounded-[1.5rem] border border-white/5 bg-slate-900/60 flex flex-col justify-between h-32 relative overflow-hidden group active:scale-[0.98] transition-all">
                                    <div className={`absolute top-0 right-0 w-24 h-24 blur-3xl opacity-10 pointer-events-none rounded-full ${isOverdue ? 'bg-rose-600' : 'bg-amber-500'}`}></div>
                                    
                                    <div className="flex justify-between items-start relative z-10">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${isOverdue ? 'bg-rose-500' : 'bg-amber-500'}`}>
                                                <ClockIcon className="w-5 h-5" />
                                            </div>
                                            <div className="text-right">
                                                <p className="font-bold text-white text-xs truncate max-w-[120px]">{debt.contacts?.name || 'غير معروف'}</p>
                                                <p className="text-[9px] text-slate-500 font-bold">{debt.type === 'on_you' ? 'عليك' : 'لك'}</p>
                                            </div>
                                        </div>
                                        <div className="text-left">
                                            <p className={`font-black text-sm tabular-nums ${debt.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(debt.amount)}</p>
                                        </div>
                                    </div>

                                    <div className="mt-auto flex justify-between items-center relative z-10 pt-2 border-t border-white/5">
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${isOverdue ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : isToday ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-slate-800 text-slate-400'}`}>
                                            {isOverdue ? `متأخر منذ ${Math.abs(days)} يوم` : isToday ? 'مستحق اليوم' : `باقي ${days} يوم`}
                                        </div>
                                        <ChevronLeftIcon className="w-4 h-4 text-slate-600 group-hover:translate-x-[-2px] transition-transform" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* 6. Annual Performance Chart (Visual history) */}
            <div className="glass-card p-6 rounded-[2rem] border border-white/5 order-6 shadow-xl animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-white flex items-center gap-2 text-sm"><ChartBarSquareIcon className="w-5 h-5 text-cyan-400"/> الأداء المالي {new Date().getFullYear()}</h3>
                    <div className="flex items-center gap-4 text-[10px] font-bold">
                        <div className="flex items-center gap-1.5 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> دخل</div>
                        <div className="flex items-center gap-1.5 text-rose-400"><span className="w-2 h-2 rounded-full bg-rose-500"></span> صرف</div>
                    </div>
                </div>
                <div className="h-48 w-full">
                    {loading ? <div className="h-full w-full bg-slate-800/50 rounded-xl animate-pulse"></div> : <canvas ref={canvasRef}></canvas>}
                </div>
            </div>

            {/* 7. Recent Transactions (Details of flow) - MOVED TO END */}
            <div className="space-y-4 order-7 animate-fade-in">
                <div className="flex justify-between items-end px-1">
                    <h2 className="text-lg font-bold text-white">آخر المعاملات</h2>
                    <button onClick={() => setActivePage('transactions')} className="text-xs font-bold text-cyan-500">عرض الكل</button>
                </div>
                <div className="space-y-2">
                    {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-800/50 rounded-2xl animate-pulse"></div>) 
                    : lastTransactions.length > 0 ? lastTransactions.map(tx => {
                        const Icon = (tx.categories?.icon && iconMap[tx.categories.icon]) || (tx.type === 'income' ? ArrowDownIcon : ArrowUpIcon);
                        return (
                            <div key={tx.id} className="bg-slate-900/40 p-4 rounded-2xl flex items-center justify-between border border-white/5 active:bg-slate-800/60 transition-colors shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-inner" style={{ backgroundColor: tx.categories?.color || '#334155' }}><Icon className="w-5 h-5" /></div>
                                    <div>
                                        <p className="font-bold text-slate-200 text-sm line-clamp-1">{tx.notes || tx.categories?.name || 'معاملة'}</p>
                                        <p className="text-[10px] text-slate-500">{tx.accounts?.name}</p>
                                    </div>
                                </div>
                                <div className={`font-black text-sm tabular-nums ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                </div>
                            </div>
                        )
                    }) : <div className="text-center py-8 text-slate-600 border border-dashed border-slate-800 rounded-2xl text-xs">لا توجد سجلات</div>}
                </div>
            </div>

            {isMonthlyModalOpen && <MonthlyReportModal onClose={() => setIsMonthlyModalOpen(false)} />}
        </div>
    );
};

export default HomePage;
