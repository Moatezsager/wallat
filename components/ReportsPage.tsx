
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt, Category } from '../types';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import { 
    SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon, 
    ArrowTrendingUp, ArrowTrendingDown, ChartBarSquareIcon,
    ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, TagIcon,
    ArrowDownIcon, ArrowUpIcon, iconMap, ScaleIcon, ClockIcon,
    ZapIcon, ShoppingBagIcon
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

// --- Enhanced Component: Spending Heatmap & Hourly Radar ---
const SpendingHeatmap: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
    const [viewDate, setViewDate] = useState(new Date());
    const [monthlyTransactions, setMonthlyTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(false);

    const dayNames = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];
    const fullDayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

    useEffect(() => {
        const fetchMonthData = async () => {
            setLoading(true);
            const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).toISOString();
            const endOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0, 23, 59, 59).toISOString();

            const { data } = await supabase
                .from('transactions')
                .select('*')
                .eq('type', 'expense')
                .gte('date', startOfMonth)
                .lte('date', endOfMonth);
            
            setMonthlyTransactions((data as any) || []);
            setLoading(false);
        };
        fetchMonthData();
    }, [viewDate, refreshTrigger]);

    const stats = useMemo(() => {
        const dayMap = new Map<number, number>();
        const weekDayMap = new Array(7).fill(0);
        const hourMap = new Array(24).fill(0);
        
        monthlyTransactions.forEach(t => {
            const date = new Date(t.date);
            const day = date.getDate();
            const weekDay = date.getDay();
            const hour = date.getHours();

            dayMap.set(day, (dayMap.get(day) || 0) + t.amount);
            weekDayMap[weekDay] += t.amount;
            hourMap[hour] += t.amount;
        });

        const maxSpentDay = Math.max(...Array.from(dayMap.values()), 1);
        const dangerousDayIdx = weekDayMap.indexOf(Math.max(...weekDayMap));
        const dangerousHour = hourMap.indexOf(Math.max(...hourMap));

        // التحليل بالفترات
        const periods = {
            'morning': hourMap.slice(5, 12).reduce((a, b) => a + b, 0),
            'afternoon': hourMap.slice(12, 17).reduce((a, b) => a + b, 0),
            'evening': hourMap.slice(17, 22).reduce((a, b) => a + b, 0),
            'night': [...hourMap.slice(22, 24), ...hourMap.slice(0, 5)].reduce((a, b) => a + b, 0),
        };
        const peakPeriod = Object.entries(periods).sort((a, b) => b[1] - a[1])[0];

        return { dayMap, maxSpentDay, dangerousDayIdx, dangerousHour, peakPeriod, weekDayTotal: weekDayMap[dangerousDayIdx] };
    }, [monthlyTransactions]);

    const calendarGrid = useMemo(() => {
        const grid = [];
        const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
        const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
        for (let i = 0; i < firstDay; i++) grid.push(null);
        for (let d = 1; d <= daysInMonth; d++) grid.push(d);
        return grid;
    }, [viewDate]);

    const getIntensityClass = (amount: number) => {
        if (!amount) return 'bg-slate-800/20 border-white/5';
        const ratio = amount / stats.maxSpentDay;
        if (ratio < 0.2) return 'bg-rose-500/10 border-rose-500/10 text-rose-200/50';
        if (ratio < 0.4) return 'bg-rose-500/30 border-rose-500/20 text-rose-100/70';
        if (ratio < 0.7) return 'bg-rose-500/60 border-rose-500/40 text-white';
        return 'bg-rose-600 border-rose-400 text-white shadow-[0_0_15px_rgba(225,29,72,0.4)] animate-pulse';
    };

    const changeMonth = (offset: number) => {
        const newDate = new Date(viewDate);
        newDate.setMonth(newDate.getMonth() + offset);
        setViewDate(newDate);
    };

    const getPeriodLabel = (key: string) => {
        switch(key) {
            case 'morning': return 'الصباح (5ص - 12ظ)';
            case 'afternoon': return 'الظهيرة (12ظ - 5م)';
            case 'evening': return 'المساء (5م - 10م)';
            case 'night': return 'الليل المتأخر (10م - 5ص)';
            default: return '';
        }
    };

    return (
        <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 bg-slate-900/40 relative overflow-hidden">
            {/* Header with Navigation */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/20 flex items-center justify-center">
                        <ClockIcon className="w-6 h-6 text-rose-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-white">رادار أيام وساعات الخطر</h3>
                        <p className="text-[10px] text-slate-500 font-bold">{monthNames[viewDate.getMonth()]} {viewDate.getFullYear()}</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => changeMonth(1)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400"><ChevronRightIcon className="w-4 h-4"/></button>
                    <button onClick={() => changeMonth(-1)} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400"><ChevronLeftIcon className="w-4 h-4"/></button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex flex-col items-center justify-center gap-3">
                    <div className="w-8 h-8 border-2 border-rose-500/20 border-t-rose-500 rounded-full animate-spin"></div>
                    <span className="text-[10px] text-slate-500 font-bold">جاري المسح الضوئي للمصاريف...</span>
                </div>
            ) : (
                <>
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1.5 mb-8">
                        {dayNames.map(d => (
                            <div key={d} className="text-center text-[9px] font-black text-slate-600 pb-2 uppercase">{d}</div>
                        ))}
                        {calendarGrid.map((day, idx) => {
                            const amount = day ? stats.dayMap.get(day) || 0 : 0;
                            return (
                                <div 
                                    key={idx} 
                                    className={`aspect-square rounded-lg border flex items-center justify-center text-[9px] font-bold transition-all relative group ${day ? getIntensityClass(amount) : 'opacity-0'}`}
                                >
                                    {day}
                                    {amount > 0 && (
                                        <div className="absolute bottom-full mb-2 hidden group-hover:block z-20 bg-slate-900 text-white text-[9px] p-2 rounded-lg whitespace-nowrap shadow-2xl border border-white/10">
                                            {formatCurrency(amount)}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Peak Insights */}
                    <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl flex items-start gap-3">
                                <div className="p-2 bg-rose-500/20 rounded-lg shrink-0">
                                    <ExclamationTriangleIcon className="w-4 h-4 text-rose-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-rose-400 font-black mb-0.5">يوم الذروة</p>
                                    <p className="text-xs text-white font-bold">{stats.weekDayTotal > 0 ? fullDayNames[stats.dangerousDayIdx] : 'لا توجد بيانات'}</p>
                                </div>
                            </div>
                            <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-2xl flex items-start gap-3">
                                <div className="p-2 bg-amber-500/20 rounded-lg shrink-0">
                                    <ZapIcon className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-amber-400 font-black mb-0.5">ساعة الخطر</p>
                                    <p className="text-xs text-white font-bold">{stats.weekDayTotal > 0 ? `حوالي الساعة ${stats.dangerousHour}:00` : 'لا توجد بيانات'}</p>
                                </div>
                            </div>
                        </div>

                        {stats.weekDayTotal > 0 && (
                            <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-2xl flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
                                    <ShoppingBagIcon className="w-5 h-5 text-indigo-400" />
                                </div>
                                <div>
                                    <h4 className="text-[11px] font-black text-indigo-300">أكثر فترة يتم فيها الصرف</h4>
                                    <p className="text-[10px] text-slate-400 font-bold">
                                        تتركز مشترياتك في <span className="text-white">{getPeriodLabel(stats.peakPeriod[0])}</span> بمجموع <span className="text-white">{formatCurrency(stats.peakPeriod[1])}</span>.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </>
            )}
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

    // --- Helper function for period dates ---
    const getDatesForPeriod = (p: Period) => {
        const now = new Date();
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
        }
        return { startDate, endDate, prevStartDate, prevEndDate };
    };

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

            {/* Heatmap Component */}
            <SpendingHeatmap refreshTrigger={refreshTrigger} />

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

// --- Sub-components ---

// Fix: Add missing MonthlyBreakdownChart component
const MonthlyBreakdownChart: React.FC<{ data: { income: number, expense: number }[] }> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current) return;
        if (chartRef.current) chartRef.current.destroy();
        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
        
        chartRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'الإيرادات',
                        data: data.map(d => d.income),
                        backgroundColor: '#10b981',
                        borderRadius: 6,
                    },
                    {
                        label: 'المصروفات',
                        data: data.map(d => d.expense),
                        backgroundColor: '#f43f5e',
                        borderRadius: 6,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#64748b', font: { family: 'Cairo', size: 10 } } },
                    y: { grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#64748b', font: { family: 'Cairo', size: 10 } } }
                }
            }
        });

        return () => chartRef.current?.destroy();
    }, [data]);

    return <div className="h-64 w-full"><canvas ref={canvasRef}></canvas></div>;
};

// Fix: Add missing ReportView component
const ReportView: React.FC<{ title: string, data: any[], total: number }> = ({ title, data, total }) => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest">{title}</h3>
                <span className="text-xs font-black text-white">{formatCurrency(total)}</span>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
                {data.length > 0 ? data.map((item, idx) => {
                    const Icon = (item.icon && iconMap[item.icon]) ? iconMap[item.icon] : TagIcon;
                    return (
                        <div key={idx} className="bg-slate-900/40 p-4 rounded-3xl border border-white/5 flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg group-hover:scale-110 transition-transform" style={{ backgroundColor: item.color || '#334155' }}>
                                <Icon className="w-6 h-6" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-center mb-1.5">
                                    <span className="text-sm font-bold text-white truncate">{item.name}</span>
                                    <span className="text-sm font-black text-slate-200 tabular-nums">{formatCurrency(item.amount)}</span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: `${item.percentage}%`, backgroundColor: item.color || '#334155' }}
                                    ></div>
                                </div>
                                <div className="mt-1 text-left">
                                    <span className="text-[10px] font-black text-slate-500">{item.percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-[2rem] text-slate-600 font-bold">
                        لا توجد بيانات متاحة لهذا القسم
                    </div>
                )}
            </div>
        </div>
    );
};

// Fix: Add missing DebtSummary component
const DebtSummary: React.FC<{ debts: Debt[] }> = ({ debts }) => {
    const unpaid = debts.filter(d => !d.paid);
    const forYou = unpaid.filter(d => d.type === 'for_you').reduce((s, d) => s + d.amount, 0);
    const onYou = unpaid.filter(d => d.type === 'on_you').reduce((s, d) => s + d.amount, 0);

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-500/5 border border-emerald-500/10 p-6 rounded-3xl text-center">
                    <p className="text-xs text-emerald-500 font-bold mb-1 uppercase">ديون لك</p>
                    <p className="text-3xl font-black text-white">{formatCurrency(forYou)}</p>
                </div>
                <div className="bg-rose-500/5 border border-rose-500/10 p-6 rounded-3xl text-center">
                    <p className="text-xs text-rose-500 font-bold mb-1 uppercase">ديون عليك</p>
                    <p className="text-3xl font-black text-white">{formatCurrency(onYou)}</p>
                </div>
            </div>
            
            <div className="bg-slate-900/40 p-6 rounded-3xl border border-white/5 flex items-center justify-between">
                <div>
                    <h4 className="text-sm font-bold text-slate-400 mb-1">الرصيد الصافي للديون</h4>
                    <p className={`text-2xl font-black ${forYou - onYou >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(Math.abs(forYou - onYou))}
                        <span className="text-xs font-bold mr-2 opacity-50">{forYou - onYou >= 0 ? '(فائض)' : '(عجز)'}</span>
                    </p>
                </div>
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-slate-400">
                    <ScaleIcon className="w-6 h-6" />
                </div>
            </div>
        </div>
    );
};

// Fix: Add missing AnalysisResultDisplay component
const AnalysisResultDisplay: React.FC<{ result: any }> = ({ result }) => {
    if (!result) return null;
    if (typeof result === 'string') return <div className="p-6 text-white bg-slate-800 rounded-2xl">{result}</div>;

    return (
        <div className="space-y-8 animate-fade-in text-right">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                <h3 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" /> ملخص المستشار
                </h3>
                <p className="text-slate-200 leading-relaxed">{result.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest px-2">النقاط الإيجابية</h3>
                    {result.positives?.map((item: any, i: number) => (
                        <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                            <h4 className="font-bold text-white text-sm mb-1">{item.title}</h4>
                            <p className="text-xs text-slate-400">{item.description}</p>
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    <h3 className="text-sm font-black text-rose-400 uppercase tracking-widest px-2">فرص التحسين</h3>
                    {result.improvements?.map((item: string, i: number) => (
                        <div key={i} className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] shrink-0 font-bold">{i+1}</span>
                            <p className="text-xs text-slate-300 font-bold">{item}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-slate-800/40 p-6 rounded-3xl border border-white/5">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 px-2">مقارنة مع الشهر السابق</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold mb-1">الدخل</p>
                        <p className={`text-sm font-black ${result.comparison?.income?.value >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {result.comparison?.income?.value >= 0 ? '+' : ''}{formatCurrency(result.comparison?.income?.value || 0)}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-1">{result.comparison?.income?.trend}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold mb-1">المصاريف</p>
                        <p className={`text-sm font-black ${result.comparison?.expense?.value <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                             {result.comparison?.expense?.value > 0 ? '+' : ''}{formatCurrency(result.comparison?.expense?.value || 0)}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-1">{result.comparison?.expense?.trend}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] text-slate-500 font-bold mb-1">الادخار</p>
                        <p className={`text-sm font-black ${result.comparison?.savings?.value >= 0 ? 'text-cyan-400' : 'text-amber-400'}`}>
                            {result.comparison?.savings?.value >= 0 ? '+' : ''}{formatCurrency(result.comparison?.savings?.value || 0)}
                        </p>
                        <p className="text-[9px] text-slate-600 mt-1">{result.comparison?.savings?.trend}</p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest px-2">خطة العمل المقترحة</h3>
                <div className="space-y-2">
                    {result.actionPlan?.map((step: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-slate-800/80 rounded-2xl border border-white/5">
                            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black text-xs shrink-0">{i+1}</div>
                            <p className="text-xs text-white font-bold leading-relaxed">{step}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

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
                responsive: true, maintainAspectRatio: false, cutout: cutout,
                plugins: { legend: { display: false }, tooltip: { rtl: true, backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 12, bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo' } } }
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
    const [monthlyData, setMonthlyData] = useState<{ totalIncome: number; totalExpense: number; incomeCategories: any[]; expenseCategories: any[]; }>({ totalIncome: 0, totalExpense: 0, incomeCategories: [], expenseCategories: [] });
    const scrollRef = useRef<HTMLDivElement>(null);
    const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    useEffect(() => {
        const fetchMonthlyData = async () => {
            setLoading(true);
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);
            const { data } = await supabase.from('transactions').select('amount, type, categories(name, color, icon)').gte('date', startDate.toISOString()).lte('date', endDate.toISOString()).in('type', ['income', 'expense']);
            let tIncome = 0, tExpense = 0;
            const incMap = new Map<string, any>(), expMap = new Map<string, any>();
            data?.forEach((tx: any) => {
                const catName = tx.categories?.name || 'غير مصنف';
                const catColor = tx.categories?.color || '#64748b';
                if (tx.type === 'income') {
                    tIncome += tx.amount;
                    const cur = incMap.get(catName) || { name: catName, amount: 0, count: 0, color: catColor };
                    cur.amount += tx.amount; cur.count += 1; incMap.set(catName, cur);
                } else {
                    tExpense += tx.amount;
                    const cur = expMap.get(catName) || { name: catName, amount: 0, count: 0, color: catColor };
                    cur.amount += tx.amount; cur.count += 1; expMap.set(catName, cur);
                }
            });
            const proc = (m: Map<string, any>, t: number) => Array.from(m.values()).map(c => ({ ...c, percentage: t > 0 ? (c.amount / t) * 100 : 0 })).sort((a, b) => b.amount - a.amount);
            setMonthlyData({ totalIncome: tIncome, totalExpense: tExpense, incomeCategories: proc(incMap, tIncome), expenseCategories: proc(expMap, tExpense) });
            setLoading(false);
        };
        fetchMonthlyData();
    }, [year, month]);
    return (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-lg bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/5 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
                <div className="pt-6 px-6 pb-2 shrink-0 flex justify-between items-center bg-slate-900">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <button onClick={() => setYear(y => y - 1)} className="p-1 text-slate-500 hover:text-white transition"><ChevronRightIcon className="w-3 h-3"/></button>
                            <span className="text-xs text-cyan-400 font-bold tracking-widest uppercase">{year}</span>
                            <button onClick={() => setYear(y => y + 1)} className="p-1 text-slate-500 hover:text-white transition"><ChevronLeftIcon className="w-3 h-3"/></button>
                        </div>
                        <h3 className="text-xl font-black text-white">الموجز الشهري</h3>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/5 flex items-center justify-center"><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6">
                    <div ref={scrollRef} className="flex overflow-x-auto gap-2 py-4 no-scrollbar">
                        {monthNames.map((m, i) => (
                            <button key={i} onClick={() => setMonth(i)} className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all ${month === i ? 'bg-cyan-500 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}>{m}</button>
                        ))}
                    </div>
                    {loading ? <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-500"><div className="w-10 h-10 border-4 border-slate-700 border-t-cyan-500 rounded-full animate-spin"></div><span className="text-xs">جاري جلب البيانات...</span></div> : (
                        <div className="space-y-6">
                            <div className="glass-card p-4 rounded-3xl border border-white/5 bg-slate-800/40">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="space-y-3 flex-1">
                                        <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-xs text-slate-300 font-bold">الدخل</span></div><span className="text-xs font-mono text-emerald-400 font-bold">{formatCurrency(monthlyData.totalIncome)}</span></div>
                                        <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-rose-500"></span><span className="text-xs text-slate-300 font-bold">المصروف</span></div><span className="text-xs font-mono text-rose-400 font-bold">{formatCurrency(monthlyData.totalExpense)}</span></div>
                                    </div>
                                    <div className="h-24 w-24 relative"><DoughnutChart data={[monthlyData.totalIncome || 1, monthlyData.totalExpense || 0]} labels={['الدخل', 'المصروف']} colors={['#10b981', '#f43f5e']} cutout="70%"/></div>
                                </div>
                            </div>
                            <div className="flex bg-slate-800/50 p-1 rounded-xl border border-white/5">
                                <button onClick={() => setActiveTab('expense')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'expense' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>المصروفات</button>
                                <button onClick={() => setActiveTab('income')} className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'income' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>الإيرادات</button>
                            </div>
                            <div className="space-y-3">
                                {(activeTab === 'expense' ? monthlyData.expenseCategories : monthlyData.incomeCategories).map((cat, idx) => (
                                    <div key={idx} className="bg-slate-800/30 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ backgroundColor: cat.color }}><TagIcon className="w-5 h-5"/></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-center mb-1"><span className="font-bold text-slate-200 text-sm">{cat.name}</span><span className="font-bold text-white text-sm">{formatCurrency(cat.amount)}</span></div>
                                            <div className="relative w-full h-1.5 bg-slate-900 rounded-full overflow-hidden"><div className="absolute top-0 right-0 h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color }}></div></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
