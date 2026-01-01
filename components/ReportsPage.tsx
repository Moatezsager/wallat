
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt, Category } from '../types';
import Chart from 'chart.js/auto';
import { 
    SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon, 
    ArrowTrendingUp, ArrowTrendingDown, ChartBarSquareIcon,
    ChevronLeftIcon, ChevronRightIcon, CalendarDaysIcon, TagIcon,
    ArrowDownIcon, ArrowUpIcon, iconMap, ScaleIcon, ClockIcon,
    ZapIcon, ShoppingBagIcon, ClipboardDocumentIcon
} from './icons';
import { GoogleGenAI, Type } from "@google/genai";

type Period = 'this_month' | 'last_month' | 'this_year';
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
                    <div key={i} className="flex items-center gap-4 bg-slate-900/40 p-4 rounded-3xl border border-white/5 hover:bg-slate-800/40 transition-colors group">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: cat.color || '#334155' }}>
                            <Icon className="w-6 h-6" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1.5">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span className="text-sm font-bold text-white truncate">{cat.name}</span>
                                    <span className="shrink-0 text-[10px] font-black px-2 py-0.5 bg-white/5 rounded-full text-slate-500 border border-white/5">{cat.count} عملية</span>
                                </div>
                                <span className="text-sm font-black text-slate-200 shrink-0">{formatCurrency(cat.amount)}</span>
                            </div>
                            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full transition-all duration-1000 ease-out rounded-full" style={{ width: `${cat.percentage}%`, backgroundColor: cat.color || '#334155' }}></div>
                            </div>
                            <div className="flex justify-between mt-1">
                                <span className="text-[9px] font-black text-slate-500 uppercase">{cat.percentage.toFixed(1)}% من الإجمالي</span>
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
    if (typeof result === 'string') return <div className="p-6 text-white bg-slate-800 rounded-2xl">{result}</div>;

    return (
        <div className="space-y-8 animate-fade-in text-right">
            <div className="bg-white/5 p-6 rounded-3xl border border-white/10">
                <h3 className="text-lg font-bold text-cyan-400 mb-3 flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5" /> ملخص المستشار المالي
                </h3>
                <p className="text-slate-200 leading-relaxed text-sm">{result.summary}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest px-2">النقاط الإيجابية</h3>
                    {result.positives?.map((item: any, i: number) => (
                        <div key={i} className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl">
                            <h4 className="font-bold text-white text-xs mb-1">{item.title}</h4>
                            <p className="text-[10px] text-slate-400 leading-relaxed">{item.description}</p>
                        </div>
                    ))}
                </div>
                <div className="space-y-4">
                    <h3 className="text-[10px] font-black text-rose-400 uppercase tracking-widest px-2">نصائح للتحسين</h3>
                    {result.improvements?.map((item: string, i: number) => (
                        <div key={i} className="bg-rose-500/5 border border-rose-500/10 p-4 rounded-2xl flex items-start gap-3">
                            <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-[10px] shrink-0 font-bold">{i+1}</span>
                            <p className="text-[11px] text-slate-300 font-bold leading-relaxed">{item}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest px-2">خطة العمل المقترحة</h3>
                <div className="space-y-2">
                    {result.actionPlan?.map((step: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-2xl border border-white/5">
                            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-black text-[10px] shrink-0">{i+1}</div>
                            <p className="text-[11px] text-white font-bold leading-relaxed">{step}</p>
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
    const [activeTab, setActiveTab] = useState<ActiveTab>('expense');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [previousTransactions, setPreviousTransactions] = useState<any[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    
    // AI Analysis States
    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any>(null);

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
            
            const [txRes, prevTxRes, debtRes] = await Promise.all([
                supabase.from('transactions').select('*, categories(*)').gte('date', startDate.toISOString()).lte('date', endDate.toISOString()),
                supabase.from('transactions').select('amount, type, categories(name), date').gte('date', prevStartDate.toISOString()).lte('date', prevEndDate.toISOString()).in('type', ['income', 'expense']),
                supabase.from('debts').select('*').eq('paid', false)
            ]);

            setTransactions((txRes.data as any) || []);
            setPreviousTransactions(prevTxRes.data || []);
            setDebts(debtRes.data as unknown as Debt[] || []);
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

        return {
            expenses: processMap(expenseMap, totalExp),
            incomes: processMap(incomeMap, totalInc),
            totalExpense: totalExp,
            totalIncome: totalInc
        };
    }, [transactions]);

    const handleSmartAnalysis = async () => {
        setAnalysisModalOpen(true);
        if (analysisResult) return;
        
        setAnalysisLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            const currentDataSummary = transactions.slice(0, 100).map(t => ({
                type: t.type,
                amount: t.amount,
                category: (t.categories as any)?.name
            }));

            const prompt = `أنت مستشار مالي خبير من ليبيا، حلل هذه البيانات المالية للمستخدم.
            البيانات الحالية: ${JSON.stringify(currentDataSummary)}. 
            إجمالي الدخل: ${reportData.totalIncome}، إجمالي المصروف: ${reportData.totalExpense}.
            أرجع تقرير JSON بالهيكل التالي فقط:
            {
              "summary": "ملخص عام بلهجة ليبية محببة",
              "positives": [{"title": "...", "description": "..."}],
              "improvements": ["...", "..."],
              "actionPlan": ["...", "..."]
            }`;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
                config: { responseMimeType: "application/json" },
            });
            
            setAnalysisResult(JSON.parse(response.text || '{}'));
        } catch (err) {
            console.error(err);
            setAnalysisResult("عذراً، تعذر إجراء التحليل في الوقت الحالي.");
        } finally {
            setAnalysisLoading(false);
        }
    };

    const currentTabCategories = activeTab === 'expense' ? reportData.expenses : reportData.incomes;
    const currentTabTotal = activeTab === 'expense' ? reportData.totalExpense : reportData.totalIncome;

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
                
                <div className="glass-card p-1 rounded-2xl flex shadow-lg bg-slate-900/60">
                    {(['this_month', 'last_month', 'this_year'] as Period[]).map(p => (
                        <button 
                            key={p} 
                            onClick={() => { setPeriod(p); setAnalysisResult(null); }}
                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${period === p ? 'bg-slate-800 text-cyan-400 shadow-inner' : 'text-slate-500 hover:text-white'}`}
                        >
                            {{ 'this_month': 'هذا الشهر', 'last_month': 'الشهر الماضي', 'this_year': 'هذه السنة' }[p]}
                        </button>
                    ))}
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

            {/* 4. Monthly Performance (Teaser/Mini Chart) */}
            <div className="glass-card p-6 rounded-[2.5rem] border border-white/5 bg-slate-900/40">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black text-white flex items-center gap-2">
                        <ArrowTrendingUp className="w-4 h-4 text-emerald-500" /> الاتجاه المالي
                    </h3>
                </div>
                <div className="h-40 flex items-end gap-2 px-2">
                    {/* Simplified placeholder bar chart for monthly visual */}
                    {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                            <div className="w-full bg-cyan-500/20 rounded-t-lg relative group" style={{ height: `${h}%` }}>
                                <div className="absolute inset-0 bg-cyan-500 opacity-20 group-hover:opacity-60 transition-opacity rounded-t-lg"></div>
                            </div>
                            <span className="text-[8px] font-black text-slate-700">W{i+1}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* AI Analysis Modal */}
            {isAnalysisModalOpen && (
                <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
                    <div className="relative w-full max-w-lg bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col max-h-[85vh] overflow-hidden animate-slide-up">
                        <div className="p-6 shrink-0 z-10 flex justify-between items-center border-b border-white/5">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <SparklesIcon className="w-6 h-6 text-violet-400" /> تحليل المستشار الذكي
                            </h3>
                            <button onClick={() => setAnalysisModalOpen(false)} className="p-2 bg-white/5 rounded-full text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                            {analysisLoading ? (
                                <div className="py-20 flex flex-col items-center justify-center gap-4">
                                    <div className="w-16 h-16 border-4 border-slate-800 border-t-violet-500 rounded-full animate-spin"></div>
                                    <p className="text-slate-400 font-bold animate-pulse text-sm">جاري تحليل بياناتك بعمق...</p>
                                </div>
                            ) : (
                                <AnalysisResultDisplay result={analysisResult} />
                            )}
                        </div>
                        <div className="p-6 border-t border-white/5 text-center">
                             <p className="text-[9px] text-slate-600 font-bold">هذا التحليل يتم بواسطة الذكاء الاصطناعي (Gemini) بناءً على معاملاتك الأخيرة.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
