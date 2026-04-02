
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt, Category, Goal } from '../types';
import Chart from 'chart.js/auto';
import { 
    SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon, 
    ArrowTrendingUp, ArrowTrendingDown, ChartBarSquareIcon,
    ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, TagIcon,
    ArrowDownIcon, ArrowUpIcon, iconMap, ScaleIcon, ClockIcon,
    ZapIcon, ShoppingBagIcon, ClipboardDocumentIcon, WalletIcon
} from './icons';
import { GoogleGenAI, Type } from "@google/genai";

type Period = 'this_month' | 'last_month' | 'this_year' | 'custom_year';
type ActiveTab = 'expense' | 'income' | 'debt';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', {
        style: 'currency',
        currency: 'LYD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(amount).replace('LYD', 'د.ل');
};

// --- المكونات الفرعية للعرض الجرافيكي ---

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

const MonthlyTrendsChart: React.FC<{ data: { month: string, income: number, expense: number }[] }> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: data.map(d => d.month),
                datasets: [
                    {
                        label: 'الدخل',
                        data: data.map(d => d.income),
                        backgroundColor: 'rgba(16, 185, 129, 0.8)',
                        borderRadius: 8,
                        borderSkipped: false,
                        barThickness: 12,
                    },
                    {
                        label: 'المصروف',
                        data: data.map(d => d.expense),
                        backgroundColor: 'rgba(244, 63, 94, 0.8)',
                        borderRadius: 8,
                        borderSkipped: false,
                        barThickness: 12,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: true,
                        position: 'top',
                        align: 'end',
                        labels: {
                            color: '#94a3b8',
                            font: { size: 10, weight: 'bold' },
                            usePointStyle: true,
                            pointStyle: 'circle',
                            padding: 20
                        }
                    },
                    tooltip: {
                        backgroundColor: '#0f172a',
                        titleColor: '#f8fafc',
                        bodyColor: '#f8fafc',
                        padding: 12,
                        cornerRadius: 12,
                        displayColors: true,
                        boxPadding: 6
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#64748b', font: { size: 10, weight: 'bold' } }
                    },
                    y: {
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        ticks: {
                            color: '#64748b',
                            font: { size: 10, weight: 'bold' },
                            callback: (value) => formatCurrency(value as number)
                        }
                    }
                }
            }
        });
        return () => chartRef.current?.destroy();
    }, [data]);

    return <div className="h-64 w-full"><canvas ref={canvasRef}></canvas></div>;
};

const CategoryBreakdown: React.FC<{ data: any[], total: number }> = ({ data, total }) => {
    if (data.length === 0) {
        return (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-[2rem] flex flex-col items-center gap-3">
                <div className="w-12 h-12 bg-slate-800/50 rounded-full flex items-center justify-center">
                    <ClipboardDocumentIcon className="w-6 h-6 text-slate-600" />
                </div>
                <p className="text-slate-600 text-xs font-bold">لا توجد بيانات مسجلة لهذه الفترة</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {data.map((cat, i) => {
                const Icon = (cat.icon && iconMap[cat.icon]) ? iconMap[cat.icon] : TagIcon;
                return (
                    <div key={i} className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-[2rem] border border-white/5 hover:bg-slate-800/40 transition-all group shadow-sm hover:shadow-xl hover:-translate-y-0.5">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-110 transition-transform" style={{ backgroundColor: cat.color || '#334155' }}>
                            <Icon className="w-6 h-6 drop-shadow-md" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-sm font-bold text-white truncate tracking-tight">{cat.name}</span>
                                    <span className="shrink-0 text-[10px] font-black px-2 py-0.5 bg-white/5 rounded-full text-slate-500 border border-white/5 tracking-widest">{cat.count} عملية</span>
                                </div>
                                <span className="text-sm font-black text-slate-200 shrink-0 tabular-nums">{formatCurrency(cat.amount)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full transition-all duration-1000 ease-out rounded-full shadow-sm" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color || '#334155' }}></div>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest tabular-nums">{cat.percentage.toFixed(1)}% من الإجمالي</span>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

const AnalysisResultDisplay: React.FC<{ result: any }> = ({ result }) => {
    if (!result) return null;
    if (typeof result === 'string') return (
        <div className="p-8 text-white bg-slate-800/50 rounded-[2rem] border border-white/5 flex flex-col items-center gap-4 text-center">
            <ExclamationTriangleIcon className="w-12 h-12 text-amber-500" />
            <p className="font-bold leading-relaxed">{result}</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-fade-in text-right">
            {/* Summary Section */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-cyan-600 rounded-[2.5rem] blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-slate-900 p-8 rounded-[2rem] border border-white/10 shadow-2xl">
                    <h3 className="text-xl font-black text-cyan-400 mb-4 flex items-center gap-3">
                        <SparklesIcon className="w-6 h-6" /> ملخص المستشار المالي
                    </h3>
                    <p className="text-slate-200 leading-relaxed text-lg font-medium">{result.summary}</p>
                </div>
            </div>

            {/* Positives & Improvements Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest px-4 flex items-center gap-2">
                        <CheckCircleIcon className="w-4 h-4" /> النقاط الإيجابية
                    </h3>
                    <div className="space-y-3">
                        {result.positives?.map((item: any, i: number) => (
                            <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-3xl hover:bg-emerald-500/10 transition-colors">
                                <h4 className="font-black text-white text-sm mb-2">{item.title}</h4>
                                <p className="text-xs text-slate-400 leading-relaxed font-bold">{item.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="space-y-4">
                    <h3 className="text-xs font-black text-rose-400 uppercase tracking-widest px-4 flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-4 h-4" /> نصائح للتحسين
                    </h3>
                    <div className="space-y-3">
                        {result.improvements?.map((item: string, i: number) => (
                            <div key={i} className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-3xl flex items-start gap-4 hover:bg-rose-500/10 transition-colors">
                                <span className="w-6 h-6 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs shrink-0 font-black">{i+1}</span>
                                <p className="text-xs text-slate-300 font-bold leading-relaxed">{item}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Debt & Savings Advice */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {result.debtAdvice && (
                    <div className="bg-amber-500/5 border border-amber-500/10 p-6 rounded-[2rem]">
                        <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <ScaleIcon className="w-4 h-4" /> نصيحة الديون
                        </h3>
                        <p className="text-xs text-slate-300 font-bold leading-relaxed">{result.debtAdvice}</p>
                    </div>
                )}
                {result.savingsAdvice && (
                    <div className="bg-cyan-500/5 border border-cyan-500/10 p-6 rounded-[2rem]">
                        <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <WalletIcon className="w-4 h-4" /> نصيحة الادخار
                        </h3>
                        <p className="text-xs text-slate-300 font-bold leading-relaxed">{result.savingsAdvice}</p>
                    </div>
                )}
            </div>

            {/* Action Plan */}
            <div className="space-y-4">
                <h3 className="text-xs font-black text-violet-400 uppercase tracking-widest px-4 flex items-center gap-2">
                    <ZapIcon className="w-4 h-4" /> خطة العمل المقترحة
                </h3>
                <div className="grid grid-cols-1 gap-3">
                    {result.actionPlan?.map((step: string, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-5 bg-slate-900/60 rounded-3xl border border-white/5 hover:border-violet-500/30 transition-all group">
                            <div className="w-10 h-10 rounded-2xl bg-violet-500/10 text-violet-400 flex items-center justify-center font-black text-sm shrink-0 group-hover:scale-110 transition-transform">{i+1}</div>
                            <p className="text-sm text-white font-bold leading-relaxed">{step}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// --- الصفحة الرئيسية ---

const ReportsPage: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
    const [period, setPeriod] = useState<Period>('this_month');
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [showYearPicker, setShowYearPicker] = useState(false);
    const [activeTab, setActiveTab] = useState<ActiveTab>('expense');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [previousTransactions, setPreviousTransactions] = useState<any[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [loading, setLoading] = useState(true);
    
    // AI Analysis States
    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

    const getDatesForPeriod = (p: Period, year?: number) => {
        const now = new Date();
        const targetYear = year || now.getFullYear();
        let startDate: Date, endDate: Date, prevStartDate: Date, prevEndDate: Date;
        switch (p) {
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
            case 'custom_year':
                startDate = new Date(targetYear, 0, 1);
                endDate = new Date(targetYear, 11, 31, 23, 59, 59);
                prevStartDate = new Date(targetYear - 1, 0, 1);
                prevEndDate = new Date(targetYear - 1, 11, 31, 23, 59, 59);
                break;
        }
        return { startDate, endDate, prevStartDate, prevEndDate };
    };

    const periodDates = useMemo(() => getDatesForPeriod(period, selectedYear), [period, selectedYear]);

    useEffect(() => {
        const fetchAvailableYears = async () => {
            const { data } = await supabase.from('transactions').select('date');
            if (data) {
                const years = Array.from(new Set(data.map(t => new Date(t.date).getFullYear()))).sort((a, b) => b - a);
                setAvailableYears(years);
            }
        };
        fetchAvailableYears();
    }, [refreshTrigger]);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { startDate, endDate, prevStartDate, prevEndDate } = periodDates;
            
            const [txRes, prevTxRes, debtRes, goalsRes] = await Promise.all([
                supabase.from('transactions').select('*, categories(*)').gte('date', startDate.toISOString()).lte('date', endDate.toISOString()),
                supabase.from('transactions').select('amount, type, categories(name), date').gte('date', prevStartDate.toISOString()).lte('date', prevEndDate.toISOString()).in('type', ['income', 'expense']),
                supabase.from('debts').select('*, contacts(name)').eq('paid', false),
                supabase.from('goals').select('*')
            ]);

            setTransactions((txRes.data as any) || []);
            setPreviousTransactions(prevTxRes.data || []);
            setDebts(debtRes.data as unknown as Debt[] || []);
            setGoals(goalsRes.data as unknown as Goal[] || []);
            setLoading(false);
        };
        fetchData();
    }, [refreshTrigger, periodDates]);

    const reportData = useMemo(() => {
        const expenseMap = new Map<string, any>();
        const incomeMap = new Map<string, any>();
        
        let totalExp = 0;
        let totalInc = 0;

        transactions.forEach(tx => {
            const catName = (tx.categories as any)?.name || 'غير مصنف';
            const catColor = (tx.categories as any)?.color || '#64748b';
            const catIcon = (tx.categories as any)?.icon;

            if (tx.type === 'expense') {
                totalExp += tx.amount;
                const cur = expenseMap.get(catName) || { name: catName, amount: 0, count: 0, color: catColor, icon: catIcon };
                cur.amount += tx.amount;
                cur.count += 1;
                expenseMap.set(catName, cur);
            } else if (tx.type === 'income') {
                totalInc += tx.amount;
                const cur = incomeMap.get(catName) || { name: catName, amount: 0, count: 0, color: catColor, icon: catIcon };
                cur.amount += tx.amount;
                cur.count += 1;
                incomeMap.set(catName, cur);
            }
        });

        const processMap = (map: Map<string, any>, total: number) => 
            Array.from(map.values())
                .map(c => ({ ...c, percentage: total > 0 ? (c.amount / total) * 100 : 0 }))
                .sort((a, b) => b.amount - a.amount);

        // Calculate Trend Data
        const monthlyTrends: { month: string, income: number, expense: number }[] = Array.from({ length: 12 }, (_, i) => {
            const monthName = new Intl.DateTimeFormat('ar-LY', { month: 'short' }).format(new Date(selectedYear, i));
            return { month: monthName, income: 0, expense: 0 };
        });

        const isYearly = period === 'this_year' || period === 'custom_year';
        const trendData: { label: string, value: number }[] = [];

        if (isYearly) {
            transactions.forEach(tx => {
                const monthIdx = new Date(tx.date).getMonth();
                if (tx.type === 'income') monthlyTrends[monthIdx].income += tx.amount;
                if (tx.type === 'expense') monthlyTrends[monthIdx].expense += tx.amount;
            });
            monthlyTrends.forEach(m => trendData.push({ label: m.month, value: activeTab === 'expense' ? m.expense : m.income }));
        } else {
            // Weeks of the month
            const weeksCount = 5; 
            const weekMap = new Map<number, number>();
            for (let i = 1; i <= weeksCount; i++) weekMap.set(i, 0);

            transactions.forEach(tx => {
                if (tx.type !== activeTab) return;
                const date = new Date(tx.date);
                const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
                const weekNum = Math.ceil((date.getDate() + startOfMonth.getDay()) / 7);
                if (weekMap.has(weekNum)) {
                    weekMap.set(weekNum, (weekMap.get(weekNum) || 0) + tx.amount);
                }
            });

            for (let i = 1; i <= weeksCount; i++) {
                trendData.push({ label: `أسبوع ${i}`, value: weekMap.get(i) || 0 });
            }
        }

        return {
            expenses: processMap(expenseMap, totalExp),
            incomes: processMap(incomeMap, totalInc),
            totalExpense: totalExp,
            totalIncome: totalInc,
            trend: trendData,
            monthlyTrends
        };
    }, [transactions, period, activeTab, periodDates, selectedYear]);

    const handleSmartAnalysis = async () => {
        setAnalysisModalOpen(true);
        if (analysisResult) return;
        
        setAnalysisLoading(true);
        try {
            const apiKey = process.env.GEMINI_API_KEY;
            if (!apiKey) {
                throw new Error("API_KEY_MISSING");
            }
            const ai = new GoogleGenAI({ apiKey });
            
            const currentDataSummary = transactions.slice(0, 50).map(t => ({
                type: t.type,
                amount: t.amount,
                category: (t.categories as any)?.name,
                date: t.date
            }));

            const debtSummary = debts.map(d => ({
                type: d.type,
                amount: d.amount,
                person: d.contacts?.name || 'غير معروف'
            }));

            const goalsSummary = goals.map(g => ({
                name: g.name,
                target: g.target_amount,
                current: g.current_amount
            }));

            const prompt = `أنت مستشار مالي خبير من ليبيا، حلل هذه البيانات المالية للمستخدم وقدم نصائح عملية بلهجة ليبية محببة.
            البيانات الحالية (آخر 50 معاملة): ${JSON.stringify(currentDataSummary)}. 
            الديون الحالية: ${JSON.stringify(debtSummary)}.
            أهداف الادخار: ${JSON.stringify(goalsSummary)}.
            إجمالي الدخل لهذه الفترة: ${reportData.totalIncome}، إجمالي المصروف: ${reportData.totalExpense}.
            
            أرجع تقرير JSON بالهيكل التالي فقط:
            {
              "summary": "ملخص عام بلهجة ليبية محببة (مثلاً: يا غالي وضعك باهي لكن...)",
              "positives": [{"title": "...", "description": "..."}],
              "improvements": ["...", "..."],
              "actionPlan": ["...", "..."],
              "debtAdvice": "نصيحة بخصوص الديون إذا وجدت",
              "savingsAdvice": "نصيحة بخصوص أهداف الادخار"
            }`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });
            
            setAnalysisResult(JSON.parse(response.text || '{}'));
        } catch (err: any) {
            console.error(err);
            if (err.message === "API_KEY_MISSING") {
                setAnalysisResult("عذراً، مفتاح Gemini API غير متوفر. يرجى التأكد من إعداده في المتصفح.");
            } else {
                setAnalysisResult("عذراً، تعذر إجراء التحليل في الوقت الحالي. يرجى المحاولة لاحقاً.");
            }
        } finally {
            setAnalysisLoading(false);
        }
    };

    const currentTabCategories = activeTab === 'expense' ? reportData.expenses : reportData.incomes;
    const currentTabTotal = activeTab === 'expense' ? reportData.totalExpense : reportData.totalIncome;
    const isYearly = period === 'this_year' || period === 'custom_year';

    return (
        <div className="space-y-6 pb-24 max-w-4xl mx-auto px-1">
            
            {/* 1. Header & Period Selector */}
            <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                        <ChartBarSquareIcon className="w-6 h-6 text-cyan-500" /> التقارير والتحليلات
                    </h2>
                    <button onClick={handleSmartAnalysis} className="p-2.5 bg-violet-600/10 text-violet-400 rounded-xl border border-violet-500/20 active:scale-95 transition-all">
                        <SparklesIcon className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="flex gap-2">
                    <div className="glass-card p-1 rounded-2xl flex shadow-lg bg-slate-900/60 flex-1">
                        {(['this_month', 'last_month', 'this_year'] as Period[]).map(p => (
                            <button 
                                key={p} 
                                onClick={() => { setPeriod(p); setAnalysisResult(null); setShowYearPicker(false); }}
                                className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${period === p ? 'bg-slate-800 text-cyan-400 shadow-inner' : 'text-slate-500 hover:text-white'}`}
                            >
                                {{ 'this_month': 'هذا الشهر', 'last_month': 'الشهر الماضي', 'this_year': 'هذه السنة', 'custom_year': 'سنة مخصصة' }[p]}
                            </button>
                        ))}
                    </div>
                    <div className="relative">
                        <button 
                            onClick={() => setShowYearPicker(!showYearPicker)}
                            className={`px-4 py-3 rounded-2xl text-xs font-black transition-all flex items-center gap-2 ${period === 'custom_year' ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30' : 'bg-slate-900/60 text-slate-500 border border-white/5'}`}
                        >
                            <CalendarDaysIcon className="w-4 h-4" />
                            {period === 'custom_year' ? selectedYear : 'سنة أخرى'}
                        </button>
                        
                        {showYearPicker && (
                            <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl p-2 min-w-[120px] animate-slide-down">
                                <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-1">
                                    {availableYears.length > 0 ? availableYears.map(year => (
                                        <button 
                                            key={year}
                                            onClick={() => {
                                                setSelectedYear(year);
                                                setPeriod('custom_year');
                                                setShowYearPicker(false);
                                                setAnalysisResult(null);
                                            }}
                                            className={`w-full p-3 rounded-xl text-right text-xs font-bold transition-all ${selectedYear === year && period === 'custom_year' ? 'bg-cyan-500/10 text-cyan-400' : 'text-slate-400 hover:bg-white/5'}`}
                                        >
                                            سنة {year}
                                        </button>
                                    )) : (
                                        <p className="text-[10px] text-slate-600 p-3 text-center">لا توجد سنوات سابقة</p>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
                <div className="glass-card p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[10px] text-emerald-500 font-black mb-1 uppercase">الدخل</p>
                    <p className="font-black text-sm text-white tabular-nums">{formatCurrency(reportData.totalIncome)}</p>
                </div>
                <div className="glass-card p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[10px] text-rose-500 font-black mb-1 uppercase">المصروف</p>
                    <p className="font-black text-sm text-white tabular-nums">{formatCurrency(reportData.totalExpense)}</p>
                </div>
                <div className="glass-card p-4 rounded-3xl border border-white/5 text-center">
                    <p className="text-[10px] text-cyan-500 font-black mb-1 uppercase">الصافي</p>
                    <p className={`font-black text-sm tabular-nums ${reportData.totalIncome - reportData.totalExpense >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>
                        {formatCurrency(Math.abs(reportData.totalIncome - reportData.totalExpense))}
                    </p>
                </div>
            </div>

            {/* 3. Main Chart & Tabs */}
            <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 bg-slate-900/40">
                <div className="flex bg-slate-800/80 p-1 rounded-2xl mb-8">
                    <button onClick={() => setActiveTab('expense')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'expense' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}>
                        <ArrowUpIcon className="w-4 h-4"/> المصروفات
                    </button>
                    <button onClick={() => setActiveTab('income')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'income' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>
                        <ArrowDownIcon className="w-4 h-4"/> الإيرادات
                    </button>
                    <button onClick={() => setActiveTab('debt')} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'debt' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}>
                        <ScaleIcon className="w-4 h-4"/> الديون
                    </button>
                </div>

                {activeTab !== 'debt' ? (
                    <div className="space-y-8">
                        {/* Chart Area */}
                        <div className="h-64 relative">
                            <DoughnutChart 
                                data={currentTabCategories.map(c => c.amount)} 
                                colors={currentTabCategories.map(c => c.color || '#64748b')} 
                                labels={currentTabCategories.map(c => c.name)}
                                cutout="75%"
                            />
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">إجمالي {activeTab === 'expense' ? 'الصرف' : 'الإيراد'}</span>
                                <span className="text-xl font-black text-white tabular-nums">{formatCurrency(currentTabTotal)}</span>
                            </div>
                        </div>

                        {/* Details Area */}
                        <div className="pt-4 border-t border-white/5">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 px-2">تفصيل الفئات</h3>
                            {loading ? (
                                <div className="space-y-3">
                                    {[1,2,3].map(i => <div key={i} className="h-16 bg-white/5 rounded-2xl animate-pulse"></div>)}
                                </div>
                            ) : (
                                <CategoryBreakdown data={currentTabCategories} total={currentTabTotal} />
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-3xl text-center">
                                <p className="text-[10px] text-emerald-500 font-black mb-1 uppercase">ديون لك</p>
                                <p className="text-2xl font-black text-white">{formatCurrency(debts.filter(d => d.type === 'for_you').reduce((s, d) => s + d.amount, 0))}</p>
                            </div>
                            <div className="bg-rose-500/5 border border-rose-500/10 p-5 rounded-3xl text-center">
                                <p className="text-[10px] text-rose-500 font-black mb-1 uppercase">ديون عليك</p>
                                <p className="text-2xl font-black text-white">{formatCurrency(debts.filter(d => d.type === 'on_you').reduce((s, d) => s + d.amount, 0))}</p>
                            </div>
                        </div>
                        <p className="text-center text-[10px] text-slate-500 font-bold px-8 leading-relaxed italic">
                            يتم احتساب الديون النشطة (غير المسددة) فقط في هذا الموجز.
                        </p>
                    </div>
                )}
            </div>

            {/* 4. Financial Trend */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/40 shadow-2xl">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                            <ArrowTrendingUp className="w-6 h-6 text-emerald-500" /> 
                            {isYearly ? 'تحليل التوجهات السنوية' : `الاتجاه المالي (${activeTab === 'expense' ? 'المصروفات' : 'الإيرادات'})`}
                        </h3>
                        <p className="text-slate-500 text-xs font-bold mt-1">
                            {isYearly ? 'مقارنة الدخل والمصروفات على مدار العام' : 'تتبع حركة الأموال خلال الفترة المختارة'}
                        </p>
                    </div>
                    <div className="w-12 h-12 bg-violet-500/10 rounded-2xl flex items-center justify-center">
                        <ChartBarSquareIcon className="w-6 h-6 text-violet-400" />
                    </div>
                </div>
                
                {isYearly ? (
                    <MonthlyTrendsChart data={reportData.monthlyTrends} />
                ) : (
                    reportData.trend.length > 0 ? (
                        <div className="h-48 flex items-end gap-2 px-2">
                            {(() => {
                                const maxVal = Math.max(...reportData.trend.map(t => t.value), 1);
                                return reportData.trend.map((item, i) => {
                                    const height = (item.value / maxVal) * 100;
                                    return (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                                            <div className="w-full bg-cyan-500/10 rounded-t-xl relative group min-h-[4px]" style={{ height: `${height}%` }}>
                                                <div className="absolute inset-0 bg-gradient-to-t from-cyan-600 to-cyan-400 opacity-40 group-hover:opacity-100 transition-all rounded-t-xl shadow-[0_0_15px_rgba(34,211,238,0.2)]"></div>
                                                
                                                {/* Tooltip on hover */}
                                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none border border-white/10 shadow-xl">
                                                    {formatCurrency(item.value)}
                                                </div>
                                            </div>
                                            <span className="text-[8px] font-black text-slate-500 truncate w-full text-center">{item.label}</span>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    ) : (
                        <div className="h-40 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-800 rounded-3xl">
                            <ClockIcon className="w-6 h-6 text-slate-700" />
                            <p className="text-[10px] text-slate-600 font-bold">لا توجد بيانات كافية لعرض الاتجاه</p>
                        </div>
                    )
                )}
            </div>

            {/* AI Analysis Modal */}
            {isAnalysisModalOpen && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
                    <div className="relative w-full max-w-lg bg-slate-900 rounded-[2rem] shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
                        <div className="p-6 shrink-0 z-10 flex justify-between items-center border-b border-white/5 relative">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <SparklesIcon className="w-6 h-6 text-violet-400" /> تحليل المستشار الذكي
                            </h3>
                            <button onClick={() => setAnalysisModalOpen(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-colors active:scale-90">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 relative z-10">
                            {analysisLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <div className="w-16 h-16 border-4 border-slate-800 border-t-violet-500 rounded-full animate-spin"></div>
                                    <p className="text-slate-400 font-bold animate-pulse text-sm">جاري تحليل بياناتك بعمق...</p>
                                </div>
                            ) : (
                                <AnalysisResultDisplay result={analysisResult} />
                            )}
                        </div>
                        <div className="p-6 border-t border-white/5 text-center relative z-10">
                             <p className="text-[9px] text-slate-600 font-bold">هذا التحليل يتم بواسطة الذكاء الاصطناعي (Gemini) بناءً على معاملاتك الأخيرة.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
