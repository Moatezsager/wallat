
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt, Category } from '../types';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import { 
    SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon, 
    ArrowTrendingUp, ArrowTrendingDown, ChartBarSquareIcon,
    ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, TagIcon,
    ArrowDownIcon, ArrowUpIcon, iconMap, ScaleIcon, ClockIcon
} from './icons';
import { GoogleGenAI, Type } from "@google/genai";

type Period = 'this_month' | 'last_month' | 'this_year';
type ActiveTab = 'expense' | 'income' | 'debt';

const formatCurrency = (amount: number, options?: Intl.NumberFormatOptions) => {
    const defaultOptions: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'LYD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
        ...options,
    };
    return new Intl.NumberFormat('ar-LY', defaultOptions).format(amount).replace('LYD', 'د.ل');
};

// --- New Component: Spending Heatmap ---
const SpendingHeatmap: React.FC<{ transactions: Transaction[], startDate: Date, endDate: Date }> = ({ transactions, startDate, endDate }) => {
    const dayNames = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
    const fullDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    const dailyData = useMemo(() => {
        const expenses = transactions.filter(t => t.type === 'expense');
        const map = new Map<number, number>();
        
        // Group by day of month
        expenses.forEach(t => {
            const date = new Date(t.date);
            const day = date.getDate();
            map.set(day, (map.get(day) || 0) + t.amount);
        });

        // Group by day of week for behavioral analysis
        const weekDayMap = new Array(7).fill(0);
        expenses.forEach(t => {
            const date = new Date(t.date);
            weekDayMap[date.getDay()] += t.amount;
        });

        const maxSpent = Math.max(...Array.from(map.values()), 1);
        const dangerousDayIndex = weekDayMap.indexOf(Math.max(...weekDayMap));
        
        return { map, maxSpent, dangerousDayIndex, weekDayTotal: weekDayMap[dangerousDayIndex] };
    }, [transactions]);

    // Generate calendar grid
    const calendarGrid = useMemo(() => {
        const grid = [];
        const firstDay = new Date(startDate.getFullYear(), startDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
        
        // Empty slots
        for (let i = 0; i < firstDay; i++) grid.push(null);
        // Month days
        for (let d = 1; d <= daysInMonth; d++) grid.push(d);
        
        return grid;
    }, [startDate]);

    const getIntensityClass = (amount: number) => {
        if (!amount) return 'bg-slate-800/20 border-white/5';
        const ratio = amount / dailyData.maxSpent;
        if (ratio < 0.2) return 'bg-rose-500/10 border-rose-500/10 text-rose-200/50';
        if (ratio < 0.4) return 'bg-rose-500/30 border-rose-500/20 text-rose-100/70';
        if (ratio < 0.7) return 'bg-rose-500/60 border-rose-500/40 text-white';
        return 'bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] animate-pulse';
    };

    return (
        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 bg-slate-900/40">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                    <ClockIcon className="w-6 h-6 text-rose-500" /> رادار أيام الخطر
                </h3>
                <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold text-slate-500">منخفض</span>
                    <div className="flex gap-0.5">
                        <div className="w-2 h-2 rounded-sm bg-rose-500/20"></div>
                        <div className="w-2 h-2 rounded-sm bg-rose-500/50"></div>
                        <div className="w-2 h-2 rounded-sm bg-rose-500/80"></div>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500">مرتفع</span>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2 mb-6">
                {dayNames.map(d => (
                    <div key={d} className="text-center text-[10px] font-black text-slate-600 pb-2">{d}</div>
                ))}
                {calendarGrid.map((day, idx) => {
                    const amount = day ? dailyData.map.get(day) || 0 : 0;
                    return (
                        <div 
                            key={idx} 
                            className={`aspect-square rounded-xl border flex items-center justify-center text-[10px] font-bold transition-all relative group ${day ? getIntensityClass(amount) : 'opacity-0'}`}
                        >
                            {day}
                            {amount > 0 && (
                                <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 bg-slate-800 text-white text-[9px] p-2 rounded-lg whitespace-nowrap shadow-2xl border border-white/10">
                                    {formatCurrency(amount)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Behavioral Insight Card */}
            {dailyData.weekDayTotal > 0 && (
                <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center shrink-0">
                        <ExclamationTriangleIcon className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-rose-400 mb-0.5">اكتشاف نمط: "خطر {fullDayNames[dailyData.dangerousDayIndex]}"</h4>
                        <p className="text-[11px] text-slate-400 font-bold leading-relaxed">
                            تتركز معظم مصاريفك في يوم <span className="text-white">{fullDayNames[dailyData.dangerousDayIndex]}</span> بإجمالي <span className="text-white">{formatCurrency(dailyData.weekDayTotal)}</span>. حاول تجنب التسوق أو المشتريات الكبيرة في هذا اليوم.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

const getDatesForPeriod = (period: Period) => {
    const now = new Date();
    let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date;

    switch (period) {
        case 'this_month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            prevEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            break;
        case 'last_month':
            startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            prevStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1);
            prevEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59);
            break;
        case 'this_year':
            startDate = new Date(now.getFullYear(), 0, 1);
            endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            prevStartDate = new Date(now.getFullYear() - 1, 0, 1);
            prevEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59);
            break;
    }
    return { startDate, endDate, prevStartDate, prevEndDate };
};

const DoughnutChart: React.FC<{ data: number[], colors: string[], labels: string[], cutout?: string }> = ({ data, colors, labels, cutout = '75%' }) => {
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
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: 'rgba(15, 23, 42, 1)', 
                    borderWidth: 2,
                    hoverOffset: 10,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: cutout,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        rtl: true,
                        backgroundColor: 'rgba(15, 23, 42, 0.9)',
                        padding: 12,
                        cornerRadius: 12,
                        bodyFont: { family: 'Cairo' },
                        titleFont: { family: 'Cairo' },
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) { label += ': '; }
                                if (context.parsed !== null) { label += formatCurrency(context.parsed); }
                                return label;
                            }
                        }
                    }
                }
            }
        };
        chartRef.current = new Chart(ctx, chartConfig);
        return () => chartRef.current?.destroy();
    }, [data, labels, colors, cutout]);

    return <div className="h-full w-full"><canvas ref={canvasRef}></canvas></div>;
};

const MonthlyReportModal: React.FC<{ onClose: () => void; }> = ({ onClose }) => {
    const [year, setYear] = useState(new Date().getFullYear());
    const [month, setMonth] = useState(new Date().getMonth());
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
    const [loading, setLoading] = useState(false);
    
    const [monthlyData, setMonthlyData] = useState<{
        totalIncome: number;
        totalExpense: number;
        incomeCategories: any[];
        expenseCategories: any[];
    }>({
        totalIncome: 0,
        totalExpense: 0,
        incomeCategories: [],
        expenseCategories: []
    });
    
    const scrollRef = useRef<HTMLDivElement>(null);
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

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
        const fetchMonthlyData = async () => {
            setLoading(true);
            try {
                const startDate = new Date(year, month, 1);
                const endDate = new Date(year, month + 1, 0, 23, 59, 59);

                const { data, error } = await supabase
                    .from('transactions')
                    .select('amount, type, categories(name, color, icon)')
                    .gte('date', startDate.toISOString())
                    .lte('date', endDate.toISOString())
                    .in('type', ['income', 'expense']);

                if (error) throw error;

                let tIncome = 0;
                let tExpense = 0;
                const incMap = new Map<string, any>();
                const expMap = new Map<string, any>();

                data?.forEach((tx: any) => {
                    const catName = tx.categories?.name || 'غير مصنف';
                    const catColor = tx.categories?.color || '#64748b';
                    const catIcon = tx.categories?.icon;

                    if (tx.type === 'income') {
                        tIncome += tx.amount;
                        const current = incMap.get(catName) || { name: catName, amount: 0, count: 0, color: catColor, icon: catIcon };
                        current.amount += tx.amount;
                        current.count += 1;
                        incMap.set(catName, current);
                    } else if (tx.type === 'expense') {
                        tExpense += tx.amount;
                        const current = expMap.get(catName) || { name: catName, amount: 0, count: 0, color: catColor, icon: catIcon };
                        current.amount += tx.amount;
                        current.count += 1;
                        expMap.set(catName, current);
                    }
                });

                const processCategories = (map: Map<string, any>, total: number) => {
                    return Array.from(map.values())
                        .map(c => ({ ...c, percentage: total > 0 ? (c.amount / total) * 100 : 0 }))
                        .sort((a, b) => b.amount - a.amount);
                };

                setMonthlyData({
                    totalIncome: tIncome,
                    totalExpense: tExpense,
                    incomeCategories: processCategories(incMap, tIncome),
                    expenseCategories: processCategories(expMap, tExpense)
                });

            } catch (err) {
                console.error("Error fetching monthly data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchMonthlyData();
    }, [year, month]);

    const activeCategories = activeTab === 'expense' ? monthlyData.expenseCategories : monthlyData.incomeCategories;
    const activeTotal = activeTab === 'expense' ? monthlyData.totalExpense : monthlyData.totalIncome;

    return (
        <div className="fixed inset-0 z-[60] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-lg bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/5 flex flex-col max-h-[95vh] overflow-hidden animate-slide-up">
                <div className="pt-6 px-6 pb-2 shrink-0 z-10 flex justify-between items-center bg-slate-900">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button onClick={() => setYear(y => y - 1)} className="p-1 text-slate-500 hover:text-white transition"><ChevronRightIcon className="w-3 h-3"/></button>
                            <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase">{year}</span>
                            <button onClick={() => setYear(y => y + 1)} className="p-1 text-slate-500 hover:text-white transition"><ChevronLeftIcon className="w-3 h-3"/></button>
                        </div>
                        <h3 className="text-xl font-black text-white">الموجز الشهري</h3>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex items-center justify-center group">
                        <XMarkIcon className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                    <div className="relative my-4 group">
                        <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
                        <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>
                        <div ref={scrollRef} className="flex overflow-x-auto gap-2 pb-2 px-4 custom-scrollbar snap-x cursor-grab active:cursor-grabbing no-scrollbar">
                            {monthNames.map((m, i) => (
                                <button key={i} onClick={() => setMonth(i)} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 snap-center ${month === i ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>
                                    {m}
                                </button>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-500">
                            <div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div>
                            <span className="text-xs animate-pulse">جاري جلب البيانات...</span>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-fade-in">
                            {(monthlyData.totalIncome > 0 || monthlyData.totalExpense > 0) && (
                                <div className="glass-card p-4 rounded-3xl border border-white/5 bg-slate-800/40 relative overflow-hidden">
                                    <h4 className="text-xs text-slate-400 font-bold mb-4 flex items-center gap-2"><ScaleIcon className="w-4 h-4"/> الميزانية الشهرية</h4>
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="space-y-3 flex-1">
                                            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-xs text-slate-300 font-bold">الدخل</span></div><span className="text-xs font-mono text-emerald-400 font-bold">{formatCurrency(monthlyData.totalIncome)}</span></div>
                                            <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span className="text-xs text-slate-300 font-bold">المصروف</span></div><span className="text-xs font-mono text-rose-400 font-bold">{formatCurrency(monthlyData.totalExpense)}</span></div>
                                            <div className="pt-2 border-t border-white/5 flex justify-between items-center"><span className="text-[10px] text-slate-500 font-bold">الصافي</span><span className={`text-sm font-bold ${monthlyData.totalIncome - monthlyData.totalExpense >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>{formatCurrency(monthlyData.totalIncome - monthlyData.totalExpense)}</span></div>
                                        </div>
                                        <div className="h-28 w-28 relative">
                                            <DoughnutChart data={[monthlyData.totalIncome, monthlyData.totalExpense]} labels={['الدخل', 'المصروف']} colors={['#10b981', '#f43f5e']} cutout="70%"/>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
                            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
                                <button onClick={() => setActiveTab('expense')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'expense' ? 'bg-rose-500 text-white shadow-lg shadow-rose-900/20' : 'text-slate-400 hover:text-white'}`}><ArrowUpIcon className="w-4 h-4"/> المصروفات</button>
                                <button onClick={() => setActiveTab('income')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center justify-center gap-2 ${activeTab === 'income' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-900/20' : 'text-slate-400 hover:text-white'}`}><ArrowDownIcon className="w-4 h-4"/> الإيرادات</button>
                            </div>
                            <div className="space-y-6">
                                <div className="relative h-56 w-56 mx-auto">
                                    {activeTotal === 0 ? <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-800 rounded-full bg-slate-900/50"><span className="text-xs">لا توجد بيانات</span></div> :
                                    <><DoughnutChart data={activeCategories.map(c => c.amount)} labels={activeCategories.map(c => c.name)} colors={activeCategories.map(c => c.color)} cutout="65%"/><div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">الإجمالي</span><span className={`text-xl font-black ${activeTab === 'expense' ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(activeTotal)}</span></div></>}
                                </div>
                                <div className="space-y-3">
                                    {activeCategories.map((cat, idx) => {
                                        const Icon = (cat.icon && iconMap[cat.icon]) ? iconMap[cat.icon] : TagIcon;
                                        return (
                                            <div key={idx} className="bg-slate-800/30 p-3 rounded-2xl border border-white/5 flex items-center gap-3 group hover:bg-slate-800/50 transition-colors">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm shrink-0" style={{ backgroundColor: cat.color }}><Icon className="w-5 h-5"/></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-center mb-1"><span className="font-bold text-slate-200 text-sm">{cat.name}</span><span className="font-bold text-white text-sm">{formatCurrency(cat.amount)}</span></div>
                                                    <div className="relative w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div className="absolute top-0 right-0 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}></div></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const MonthlyBreakdownChart: React.FC<{ data: { income: number, expense: number }[] }> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;
        const gradientIncome = ctx.createLinearGradient(0, 0, 0, 300);
        gradientIncome.addColorStop(0, 'rgba(16, 185, 129, 0.8)');
        gradientIncome.addColorStop(1, 'rgba(16, 185, 129, 0.1)');
        const gradientExpense = ctx.createLinearGradient(0, 0, 0, 300);
        gradientExpense.addColorStop(0, 'rgba(244, 63, 94, 0.8)');
        gradientExpense.addColorStop(1, 'rgba(244, 63, 94, 0.1)');
        const chartConfig: ChartConfiguration<'bar'> = {
            type: 'bar',
            data: { labels: monthNames, datasets: [{ label: 'الإيرادات', data: data.map(d => d.income), backgroundColor: gradientIncome, borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 }, { label: 'المصروفات', data: data.map(d => d.expense), backgroundColor: gradientExpense, borderRadius: 4, barPercentage: 0.6, categoryPercentage: 0.8 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8', font: { family: 'Cairo' } } }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.95)', padding: 12, cornerRadius: 12, bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo' }, rtl: true } }, scales: { x: { ticks: { color: '#64748b', font: { family: 'Cairo' } }, grid: { display: false } }, y: { ticks: { color: '#64748b', font: { family: 'Cairo' } }, grid: { color: 'rgba(255, 255, 255, 0.05)' } } } }
        };
        chartRef.current = new Chart(ctx, chartConfig);
        return () => { chartRef.current?.destroy(); };
    }, [data]);

    return <div className="h-64 w-full"><canvas ref={canvasRef}></canvas></div>;
};

const ReportView: React.FC<{ title: string; data: { name: string; color: string | null; amount: number; percentage: number }[]; total: number; }> = ({ title, data, total }) => {
    const chartData = data.map(d => d.amount);
    const chartLabels = data.map(d => d.name);
    const chartColors = data.map(d => d.color || '#334155');
    return (
        <div className="glass-card p-6 rounded-3xl shadow-2xl border border-white/5">
            <h3 className="text-xl font-bold mb-6 text-white">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
                <div className="md:col-span-2 h-64 w-64 mx-auto relative">
                    {total > 0 ? <><DoughnutChart data={chartData} labels={chartLabels} colors={chartColors} /><div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none"><span className="text-sm text-slate-400">الإجمالي</span><span className="text-xl font-bold text-white">{formatCurrency(total)}</span></div></> : <div className="flex items-center justify-center h-full w-full bg-slate-800/30 rounded-full text-slate-500 border-2 border-dashed border-slate-700">لا توجد بيانات</div>}
                </div>
                <div className="md:col-span-3 space-y-4">
                    {data.length > 0 ? data.map(item => (
                        <div key={item.name} className="group"><div className="flex justify-between items-center text-sm mb-2"><div className="flex items-center gap-3"><div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color || '#334155' }}></div><span className="font-medium text-slate-200">{item.name}</span></div><div className="text-right"><span className="font-bold text-white block">{formatCurrency(item.amount)}</span><span className="text-xs text-slate-500">{item.percentage.toFixed(1)}%</span></div></div><div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden"><div className="h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${item.percentage}%`, backgroundColor: item.color || '#334155' }}></div></div></div>
                    )) : <p className="text-slate-500 text-center py-10">لا توجد بيانات لهذه الفترة.</p>}
                </div>
            </div>
        </div>
    );
};

const DebtSummary: React.FC<{ debts: Debt[] }> = ({ debts }) => {
    const summary = useMemo(() => {
        const forYou = debts.filter(d => d.type === 'for_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
        const onYou = debts.filter(d => d.type === 'on_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
        return { forYou, onYou };
    }, [debts]);
    return (
        <div className="glass-card p-6 rounded-3xl shadow-2xl border border-white/5">
            <h3 className="text-xl font-bold mb-6 text-white">ملخص الديون الحالية</h3>
            <div className="grid grid-cols-2 gap-6 text-center">
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5"><p className="text-slate-400 mb-2 font-medium">ديون لك</p><p className="text-3xl font-extrabold text-emerald-400 drop-shadow-md">{formatCurrency(summary.forYou)}</p></div>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5"><p className="text-slate-400 mb-2 font-medium">ديون عليك</p><p className="text-3xl font-extrabold text-rose-400 drop-shadow-md">{formatCurrency(summary.onYou)}</p></div>
            </div>
        </div>
    );
};

const AnalysisResultDisplay: React.FC<{ result: any }> = ({ result }) => {
    if (typeof result === 'string') return <p className="text-center text-slate-400">{result}</p>;
    if (!result || typeof result !== 'object' || !result.summary) return <p className="text-center text-slate-400">حدث خطأ في عرض التحليل.</p>;
    const { summary, positives, improvements, comparison, actionPlan } = result;
    return (
        <div className="space-y-6">
            <div className="text-center bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-white/10 shadow-lg"><h3 className="text-xl font-bold text-cyan-300 mb-3">🇱🇾 ملخص وضعك المالي</h3><p className="text-slate-200 leading-relaxed text-lg">{summary}</p></div>
            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5 space-y-4"><h4 className="font-bold text-lg text-emerald-400 flex items-center gap-2 border-b border-white/5 pb-2"><CheckCircleIcon className="w-6 h-6"/> نقاط القوة</h4>{positives.map((item: any, i: number) => (<div key={i} className="text-sm"><p className="font-bold text-white mb-1">{item.title}</p><p className="text-slate-400">{item.description}</p></div>))}</div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5 space-y-4"><h4 className="font-bold text-lg text-amber-400 flex items-center gap-2 border-b border-white/5 pb-2"><ExclamationTriangleIcon className="w-6 h-6"/> نقاط للتحسين</h4>{improvements.map((item: any, i: number) => (<div key={i} className="text-sm"><p className="font-bold text-white mb-1">{item.title}</p><p className="text-slate-400">{item.description}</p></div>))}</div>
            </div>
            <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5"><h4 className="font-bold text-lg text-cyan-400 mb-4 text-center">📊 مقارنة بالفترة الماضية</h4><div className="grid grid-cols-3 gap-4 text-center divide-x divide-x-reverse divide-white/10">{[{ label: "الدخل", data: comparison.income, color: "text-emerald-400" }, { label: "المصاريف", data: comparison.expense, color: "text-rose-400" }, { label: "الصافي", data: comparison.savings, color: "text-cyan-400" }].map(item => (<div key={item.label} className="px-2"><p className="text-sm text-slate-400 mb-1">{item.label}</p><div className={`flex flex-col items-center justify-center font-bold text-lg ${item.color}`}><span className="text-xl">{formatCurrency(Math.abs(item.data.value))}</span>{item.data.trend === 'up' ? <ArrowTrendingUp className="w-5 h-5 mt-1"/> : <ArrowTrendingDown className="w-5 h-5 mt-1"/>}</div></div>))}</div></div>
             <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 p-6 rounded-2xl border border-cyan-500/20 space-y-4"><h4 className="font-bold text-lg text-cyan-300 flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> خطة مقترحة ليك</h4>{actionPlan.map((item: any, i: number) => (<div key={i} className="flex items-start gap-4 bg-slate-900/40 p-3 rounded-xl"><div className="bg-cyan-500 text-slate-900 rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/30">{i + 1}</div><div><p className="font-bold text-white mb-1">{item.title}</p><p className="text-sm text-slate-300 leading-relaxed">{item.description}</p></div></div>))}</div>
        </div>
    );
};

const ReportsPage: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
    const [period, setPeriod] = useState<Period>('this_month');
    const [activeTab, setActiveTab] = useState<ActiveTab>('expense');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [previousTransactions, setPreviousTransactions] = useState<any[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [isMonthlyReportOpen, setIsMonthlyReportOpen] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any | string>('');

    const periodDates = useMemo(() => getDatesForPeriod(period), [period]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { startDate, endDate, prevStartDate, prevEndDate } = periodDates;
            const txPromise = supabase.from('transactions').select('*, categories(*)').gte('date', startDate.toISOString()).lte('date', endDate.toISOString());
            const prevTxPromise = supabase.from('transactions').select('amount, type, categories(name), date').gte('date', prevStartDate.toISOString()).lte('date', prevEndDate.toISOString()).in('type', ['income', 'expense']);
            const debtPromise = supabase.from('debts').select('*');
            const [{ data: txData }, { data: prevTxData }, { data: debtData }] = await Promise.all([txPromise, prevTxPromise, debtPromise]);
            setTransactions((txData as any) || []);
            setPreviousTransactions(prevTxData || []);
            setDebts(debtData as unknown as Debt[] || []);
            setLoading(false);
        };
        fetchData();
    }, [refreshTrigger, periodDates]);

    const reportData = useMemo(() => {
        const expenseData = new Map<string, { amount: number, color: string | null }>();
        const incomeData = new Map<string, { amount: number, color: string | null }>();
        transactions.forEach(tx => {
            const categoryName = (tx.categories as any)?.name || 'غير مصنف';
            const categoryColor = (tx.categories as any)?.color || '#78716c';
            if (tx.type === 'expense') { const current = expenseData.get(categoryName) || { amount: 0, color: categoryColor }; expenseData.set(categoryName, { ...current, amount: current.amount + tx.amount }); }
            else if (tx.type === 'income') { const current = incomeData.get(categoryName) || { amount: 0, color: categoryColor }; incomeData.set(categoryName, { ...current, amount: current.amount + tx.amount }); }
        });
        const totalExpense = Array.from(expenseData.values()).reduce((sum, { amount }) => sum + amount, 0);
        const totalIncome = Array.from(incomeData.values()).reduce((sum, { amount }) => sum + amount, 0);
        const processMap = (map: Map<string, { amount: number, color: string | null }>, total: number) => { return Array.from(map.entries()).map(([name, { amount, color }]) => ({ name, amount, color, percentage: total > 0 ? (amount / total) * 100 : 0 })).sort((a, b) => b.amount - a.amount); };
        return { expenses: processMap(expenseData, totalExpense), incomes: processMap(incomeData, totalIncome), totalExpense, totalIncome };
    }, [transactions]);

    const monthlyStats = useMemo(() => {
        const stats = Array.from({ length: 12 }, () => ({ income: 0, expense: 0 }));
        transactions.forEach(tx => { const d = new Date(tx.date); if (tx.type === 'income') stats[d.getMonth()].income += tx.amount; if (tx.type === 'expense') stats[d.getMonth()].expense += tx.amount; });
        return stats;
    }, [transactions]);
    
    const handleAnalysis = async () => {
        setAnalysisLoading(true);
        setAnalysisResult('');
        if (transactions.length === 0) { setAnalysisResult('مافيش بيانات كافية للتحليل. ضيف معاملاتك وارجع جرب مرة تانية.'); setAnalysisLoading(false); return; }
        const simplifiedCurrentData = transactions.slice(0, 150).filter(tx => tx.type !== 'transfer').map(tx => ({ type: tx.type, amount: tx.amount, category: (tx.categories as any)?.name || 'غير مصنف' }));
        const simplifiedPrevData = previousTransactions.slice(0, 150).map(tx => ({ type: tx.type, amount: tx.amount, category: tx.categories?.name || 'غير مصنف' }));
        const totalIncome = reportData.totalIncome;
        const totalExpense = reportData.totalExpense;
        const prevTotalIncome = previousTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const prevTotalExpense = previousTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
        const prompt = `أنت مستشار مالي خبير من ليبيا. حلل البيانات المالية: الحالية: ${JSON.stringify(simplifiedCurrentData)}, السابقة: ${JSON.stringify(simplifiedPrevData)}. أرجع JSON بالهيكل التالي فقط: { "summary": "...", "positives": [{"title": "...", "description": "..."}], "improvements": [...], "comparison": {"income": {"value": ${totalIncome - prevTotalIncome}, "trend": "..."}, "expense": {"value": ${totalExpense - prevTotalExpense}, "trend": "..."}, "savings": {"value": ${(totalIncome-totalExpense)-(prevTotalIncome-prevTotalExpense)}, "trend": "..."}}, "actionPlan": [...] }`;
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });
            setAnalysisResult(JSON.parse(response.text || '{}'));
        } catch (err) { console.error(err); setAnalysisResult('عذرًا، صارت مشكلة في التحليل. جرب مرة ثانية.'); } finally { setAnalysisLoading(false); }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div className="glass-card p-1 rounded-xl flex shadow-lg">{(['this_month', 'last_month', 'this_year'] as Period[]).map(p => (<button key={p} onClick={() => setPeriod(p)} className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${period === p ? 'bg-slate-800 text-cyan-400 shadow-inner' : 'text-slate-400 hover:text-white'}`}>{{ 'this_month': 'هذا الشهر', 'last_month': 'الشهر الماضي', 'this_year': 'هذه السنة' }[p]}</button>)) }</div>
                <button onClick={() => setIsMonthlyReportOpen(true)} className="p-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition shadow-lg border border-slate-700"><CalendarDaysIcon className="w-5 h-5" /></button>
            </div>

            {/* Spending Heatmap - Behavioral Analysis */}
            {(period === 'this_month' || period === 'last_month') && (
                <SpendingHeatmap 
                    transactions={transactions} 
                    startDate={periodDates.startDate} 
                    endDate={periodDates.endDate} 
                />
            )}

            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="glass-card p-4 rounded-2xl border border-white/5"><p className="text-xs text-emerald-400 font-bold mb-1">الدخل</p><p className="font-extrabold text-lg text-white tracking-tight">{formatCurrency(reportData.totalIncome)}</p></div>
                <div className="glass-card p-4 rounded-2xl border border-white/5"><p className="text-xs text-rose-400 font-bold mb-1">المصروف</p><p className="font-extrabold text-lg text-white tracking-tight">{formatCurrency(reportData.totalExpense)}</p></div>
                <div className="glass-card p-4 rounded-2xl border border-white/5"><p className="text-xs text-cyan-400 font-bold mb-1">الصافي</p><p className="font-extrabold text-lg text-white tracking-tight">{formatCurrency(reportData.totalIncome - reportData.totalExpense)}</p></div>
            </div>
            {period === 'this_year' && (<div className="glass-card p-6 rounded-3xl shadow-2xl border border-white/5"><div className="flex items-center gap-2 mb-6 border-b border-white/5 pb-4"><ChartBarSquareIcon className="w-6 h-6 text-cyan-400" /><h3 className="text-xl font-bold text-white">التحليل الشهري</h3></div><MonthlyBreakdownChart data={monthlyStats} /></div>)}
            <div className="flex border-b border-slate-800">{(['expense', 'income', 'debt'] as ActiveTab[]).map(tab => (<button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-center font-bold transition-colors ${activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>{{ 'expense': 'المصاريف', 'income': 'الإيرادات', 'debt': 'الديون' }[tab]}</button>))}</div>
            <div className="pt-6">
                {activeTab === 'expense' && <ReportView title="توزيع المصاريف" data={reportData.expenses} total={reportData.totalExpense} />}
                {activeTab === 'income' && <ReportView title="مصادر الدخل" data={reportData.incomes} total={reportData.totalIncome} />}
                {activeTab === 'debt' && <DebtSummary debts={debts} />}
            </div>
            <div className="mt-8 text-center"><button onClick={() => { setAnalysisModalOpen(true); if(!analysisResult) handleAnalysis(); }} className="w-full md:w-auto py-4 px-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-2xl font-bold shadow-xl shadow-fuchsia-900/20 transition-transform hover:scale-105 flex items-center justify-center gap-3 mx-auto"><SparklesIcon className="w-6 h-6 animate-pulse" /><span>طلب تحليل ذكي (AI)</span></button></div>
            {isAnalysisModalOpen && (<div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"><div className="bg-slate-900 rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl animate-slide-up relative custom-scrollbar"><button onClick={() => setAnalysisModalOpen(false)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors z-10"><XMarkIcon className="w-6 h-6 text-slate-400" /></button><div className="text-center mb-8"><div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-4"><SparklesIcon className="w-8 h-8 text-white" /></div><h2 className="text-2xl font-bold text-white">المستشار المالي الذكي</h2></div>{analysisLoading ? <div className="py-12 text-center space-y-4"><div className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto"></div><p className="text-slate-300 animate-pulse">جاري تحليل بياناتك...</p></div> : <AnalysisResultDisplay result={analysisResult} />}</div></div>)}
            {isMonthlyReportOpen && <MonthlyReportModal onClose={() => setIsMonthlyReportOpen(false)} />}
        </div>
    );
};

export default ReportsPage;
