
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Debt, Transaction, Page, Category } from '../types';
import QuickActions from './QuickActions';
import TransactionForm from './TransactionForm';
import { 
    ArrowDownIcon, ArrowUpIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
    PencilSquareIcon, TrashIcon, ArrowTrendingUp, iconMap, ExclamationTriangleIcon, CalendarDaysIcon, CheckCircleIcon, ChartBarSquareIcon, SparklesIcon,
    LandmarkIcon, BanknoteIcon, BriefcaseIcon, WalletIcon, TagIcon, ArrowTrendingDown, ScaleIcon, AccountsIcon, ClipboardDocumentIcon, ZapIcon,
    ChevronDownIcon, ArrowLeftIcon, ArrowRightIcon
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
        
        const hasData = data.some(v => v > 0);
        const chartData = hasData ? data : [1];
        const chartColors = hasData ? colors : ['#1e293b'];

        chartRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: hasData ? labels : ['لا توجد بيانات'],
                datasets: [{ 
                    data: chartData, 
                    backgroundColor: chartColors, 
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

const MonthDetailView: React.FC<{ 
    year: number; 
    month: number; 
    monthName: string;
    onBack: () => void;
}> = ({ year, month, monthName, onBack }) => {
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState<{ totalIncome: number; totalExpense: number; incomeCategories: any[]; expenseCategories: any[]; }>({
        totalIncome: 0, totalExpense: 0, incomeCategories: [], expenseCategories: []
    });

    useEffect(() => {
        const fetchDetails = async () => {
            setLoading(true);
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);
            
            const { data: txs } = await supabase
                .from('transactions')
                .select('amount, type, categories(name, color, icon)')
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString())
                .in('type', ['income', 'expense']);
            
            let tIncome = 0, tExpense = 0;
            const incMap = new Map<string, any>(), expMap = new Map<string, any>();
            
            txs?.forEach((tx: any) => {
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

            setData({ 
                totalIncome: tIncome, 
                totalExpense: tExpense, 
                incomeCategories: process(incMap, tIncome), 
                expenseCategories: process(expMap, tExpense) 
            });
            setLoading(false);
        };
        fetchDetails();
    }, [year, month]);

    const activeCategories = activeTab === 'expense' ? data.expenseCategories : data.incomeCategories;
    const netResult = data.totalIncome - data.totalExpense;

    return (
        <div className="space-y-6 animate-fade-in pb-10">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4">
                    <button onClick={onBack} className="p-2.5 bg-slate-800 rounded-2xl text-slate-400 hover:text-white transition shadow-lg active:scale-90">
                        <ArrowRightIcon className="w-5 h-5" />
                    </button>
                    <div>
                        <h4 className="text-xl font-black text-white">شهر {monthName}</h4>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{year}</p>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-2xl border font-black text-sm tabular-nums ${netResult >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                    {netResult >= 0 ? '+' : ''}{new Intl.NumberFormat('ar-LY').format(netResult)}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-3xl">
                    <p className="text-[10px] font-black text-emerald-500/50 uppercase mb-1">إجمالي الدخل</p>
                    <p className="text-lg font-black text-white tabular-nums">{new Intl.NumberFormat('ar-LY').format(data.totalIncome)} <span className="text-[10px] opacity-40">د.ل</span></p>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-3xl">
                    <p className="text-[10px] font-black text-rose-500/50 uppercase mb-1">إجمالي الصرف</p>
                    <p className="text-lg font-black text-white tabular-nums">{new Intl.NumberFormat('ar-LY').format(data.totalExpense)} <span className="text-[10px] opacity-40">د.ل</span></p>
                </div>
            </div>

            <div className="flex bg-slate-800/60 p-1.5 rounded-[1.5rem] border border-white/5 shadow-inner">
                <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'expense' ? 'bg-rose-600 text-white shadow-xl shadow-rose-900/20' : 'text-slate-500'}`}>
                    <ArrowUpIcon className="w-4 h-4"/> المصروفات
                </button>
                <button onClick={() => setActiveTab('income')} className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'income' ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/20' : 'text-slate-500'}`}>
                    <ArrowDownIcon className="w-4 h-4"/> الإيرادات
                </button>
            </div>

            {loading ? (
                <div className="space-y-3">
                    {[1,2,3].map(i => <div key={i} className="h-24 bg-slate-800/30 rounded-[2rem] animate-pulse border border-white/5"></div>)}
                </div>
            ) : activeCategories.length > 0 ? (
                <div className="space-y-3">
                    {activeCategories.map((cat, i) => {
                        const Icon = (cat.icon && iconMap[cat.icon]) ? iconMap[cat.icon] : TagIcon;
                        return (
                            <div key={i} className="bg-slate-900/60 p-5 rounded-[2rem] border border-white/5 transition-all hover:border-white/10 group">
                                <div className="flex items-center gap-5 mb-4">
                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-2xl transition-transform group-hover:scale-105" style={{ backgroundColor: cat.color }}>
                                        <Icon className="w-7 h-7 drop-shadow-md" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-end mb-1">
                                            <span className="text-base font-black text-white truncate">{cat.name}</span>
                                            <span className="text-base font-black text-white tabular-nums">{new Intl.NumberFormat('ar-LY').format(cat.amount)} <span className="text-[10px] text-slate-500">د.ل</span></span>
                                        </div>
                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <span>{cat.count} عمليات</span>
                                            <span>{cat.percentage.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5 shadow-inner">
                                    <div className="h-full transition-all duration-1000 ease-out rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-slate-900/10 rounded-[2.5rem] border-2 border-dashed border-slate-800 text-slate-600 font-bold">
                    لا توجد بيانات مسجلة لهذا القسم في {monthName}
                </div>
            )}
        </div>
    );
};

const MonthlyReportModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
    const [yearData, setYearData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    useEffect(() => {
        const fetchYearlySummaries = async () => {
            setLoading(true);
            const startOfYear = new Date(year, 0, 1).toISOString();
            const endOfYear = new Date(year, 11, 31, 23, 59, 59).toISOString();
            
            const { data } = await supabase
                .from('transactions')
                .select('amount, type, date')
                .gte('date', startOfYear)
                .lte('date', endOfYear)
                .in('type', ['income', 'expense']);
            
            const months = Array(12).fill(null).map((_, i) => ({
                month: i,
                name: monthNames[i],
                income: 0,
                expense: 0
            }));

            data?.forEach(tx => {
                const m = new Date(tx.date).getMonth();
                if (tx.type === 'income') months[m].income += tx.amount;
                else months[m].expense += tx.amount;
            });

            setYearData(months);
            setLoading(false);
        };
        fetchYearlySummaries();
    }, [year]);

    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
            <div className="relative w-full max-w-lg bg-slate-900 rounded-[3rem] shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
                <div className="p-7 pb-4 shrink-0 z-10 flex justify-between items-start border-b border-white/5 bg-slate-900/50 backdrop-blur-md">
                    <div>
                        <h3 className="text-2xl font-black text-white flex items-center gap-3">
                             الموجز المالي <ScaleIcon className="w-6 h-6 text-cyan-500 opacity-50" />
                        </h3>
                        <div className="flex items-center gap-3 mt-2 bg-slate-800/80 w-fit px-3 py-1 rounded-xl border border-white/5">
                            <button onClick={() => setYear(y => y - 1)} className="p-1 text-slate-500 hover:text-cyan-400 transition active:scale-75"><ChevronRightIcon className="w-4 h-4"/></button>
                            <span className="text-xs font-black text-cyan-400 tracking-[0.2em]">{year}</span>
                            <button onClick={() => setYear(y => y + 1)} className="p-1 text-slate-500 hover:text-cyan-400 transition active:scale-75"><ChevronLeftIcon className="w-4 h-4"/></button>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-2xl bg-white/5 text-slate-400 border border-white/5 hover:text-white transition-colors active:scale-90">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                    {selectedMonth !== null ? (
                        <MonthDetailView 
                            year={year} 
                            month={selectedMonth} 
                            monthName={monthNames[selectedMonth]} 
                            onBack={() => setSelectedMonth(null)} 
                        />
                    ) : loading ? (
                        <div className="py-32 flex flex-col items-center justify-center gap-6">
                            <div className="relative w-16 h-16">
                                <div className="absolute inset-0 border-4 border-slate-800 border-t-cyan-500 rounded-full animate-spin"></div>
                                <div className="absolute inset-2 border-4 border-slate-800 border-b-violet-500 rounded-full animate-spin [animation-duration:1.5s]"></div>
                            </div>
                            <p className="text-slate-500 font-black animate-pulse text-sm uppercase tracking-widest">تحليل السنة مالياً...</p>
                        </div>
                    ) : (
                        <div className="space-y-4 animate-fade-in">
                            {yearData.map((m) => {
                                const net = m.income - m.expense;
                                const hasData = (m.income + m.expense) > 0;
                                return (
                                    <div 
                                        key={m.month} 
                                        onClick={() => setSelectedMonth(m.month)}
                                        className="glass-card p-5 rounded-[2.5rem] border border-white/5 flex items-center justify-between group hover:bg-white/[0.03] hover:border-white/10 transition-all cursor-pointer active:scale-[0.98]"
                                    >
                                        <div className="flex items-center gap-6">
                                            <div className="h-16 w-16 shrink-0 relative">
                                                <DoughnutChart 
                                                    data={[m.income || (hasData ? 0 : 1), m.expense || 0]} 
                                                    labels={['دخل', 'صرف']} 
                                                    colors={['#10b981', '#f43f5e']} 
                                                    cutout="75%"
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center">
                                                    <span className="text-[11px] font-black text-white/10">{m.month + 1}</span>
                                                </div>
                                            </div>
                                            <div>
                                                <h4 className="font-black text-white text-xl group-hover:text-cyan-400 transition-colors">{m.name}</h4>
                                                <div className="flex gap-4 mt-1.5">
                                                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg border tabular-nums text-[10px] font-black ${net >= 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
                                                        {net >= 0 ? <ArrowTrendingUp className="w-3 h-3"/> : <ArrowTrendingDown className="w-3 h-3"/>}
                                                        {new Intl.NumberFormat('ar-LY').format(Math.abs(net))}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 opacity-30">
                                                        <span className="text-[10px] font-bold text-slate-400">{(m.income + m.expense) > 0 ? 'نشط' : 'فارغ'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="bg-slate-800/50 p-2.5 rounded-2xl text-slate-500 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                                            <ChevronLeftIcon className="w-5 h-5" />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
                
                <div className="p-4 bg-slate-950/20 border-t border-white/5 text-center shrink-0">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em]">GreenBox Financial Assistant</p>
                </div>
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
                    // استثناء الحسابات المؤرشفة من حساب صافي الممتلكات
                    supabase.from('accounts').select('*').eq('is_archived', false),
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

    const displayedActivities = isActivitiesExpanded ? recentActivities : recentActivities.slice(0, 1);

    return (
        <div className="space-y-6 pb-24 max-w-5xl mx-auto px-1 flex flex-col">
            <div className="relative overflow-hidden rounded-[2.5rem] p-7 text-white flex flex-col justify-between min-h-[12rem] shadow-2xl border border-white/5 bg-slate-900 order-1 animate-slide-up">
                <div className="absolute inset-0 opacity-5 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                <div className="absolute -top-10 -right-10 w-48 h-48 bg-cyan-500/20 rounded-full blur-[60px]"></div>
                
                <div className="relative z-10">
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mb-2 flex items-center gap-2">
                         صافي الممتلكات النشطة <ScaleIcon className="w-3 h-3 opacity-50" />
                    </p>
                    <h2 className="text-4xl xs:text-5xl font-black tracking-tight leading-tight">
                        <AnimatedCounter value={stats.netWorth} />
                    </h2>
                </div>

                <div className="relative z-10 flex items-center justify-between mt-6">
                    <button onClick={() => setIsMonthlyModalOpen(true)} className="bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-xl flex items-center gap-2 transition active:scale-95">
                        <SparklesIcon className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-cyan-400">موجز السنة</span>
                    </button>
                    <button onClick={() => setActivePage('accounts')} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all active:scale-95 shadow-xl">
                        <WalletIcon className="w-6 h-6 text-cyan-400" />
                    </button>
                </div>
            </div>

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

            <div className="order-3">
                <QuickActions onActionSuccess={handleDatabaseChange} />
            </div>

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
                                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[9px] font-black uppercase ${isOverdue ? `متأخر منذ ${Math.abs(days)} يوم` : isToday ? 'مستحق اليوم' : `باقي ${days} يوم`}`}>
                                            {isOverdue ? `متأخر ${Math.abs(days)} يوم` : isToday ? 'مستحق اليوم' : `باقي ${days} يوم`}
                                        </div>
                                        <ChevronLeftIcon className="w-4 h-4 text-slate-600 group-hover:translate-x-[-2px] transition-transform" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

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
