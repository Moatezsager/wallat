
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt, Category } from '../types';
import Chart from 'chart.js/auto';
import type { ChartConfiguration } from 'chart.js/auto';
import { 
    SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon, 
    ArrowTrendingUp, ArrowTrendingDown
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

const DoughnutChart: React.FC<{ data: number[], colors: string[], labels: string[] }> = ({ data, colors, labels }) => {
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
                    borderColor: 'rgba(30, 41, 59, 1)', 
                    borderWidth: 0,
                    hoverOffset: 10,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
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
                                if (label) {
                                    label += ': ';
                                }
                                if (context.parsed !== null) {
                                    label += formatCurrency(context.parsed);
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        };
        chartRef.current = new Chart(ctx, chartConfig);
        return () => chartRef.current?.destroy();
    }, [data, labels, colors]);

    return <div className="h-full w-full"><canvas ref={canvasRef}></canvas></div>;
};

const ReportView: React.FC<{ 
    title: string;
    data: { name: string; color: string | null; amount: number; percentage: number }[];
    total: number;
}> = ({ title, data, total }) => {
    const chartData = data.map(d => d.amount);
    const chartLabels = data.map(d => d.name);
    const chartColors = data.map(d => d.color || '#334155');

    return (
        <div className="glass-card p-6 rounded-3xl shadow-2xl border border-white/5">
            <h3 className="text-xl font-bold mb-6 text-white">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-8 items-center">
                <div className="md:col-span-2 h-64 w-64 mx-auto relative">
                    {total > 0 ? (
                        <>
                           <DoughnutChart data={chartData} labels={chartLabels} colors={chartColors} />
                           <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                               <span className="text-sm text-slate-400">الإجمالي</span>
                               <span className="text-xl font-bold text-white">{formatCurrency(total)}</span>
                           </div>
                        </>
                    ) : (
                         <div className="flex items-center justify-center h-full w-full bg-slate-800/30 rounded-full text-slate-500 border-2 border-dashed border-slate-700">
                             لا توجد بيانات
                         </div>
                    )}
                </div>
                <div className="md:col-span-3 space-y-4">
                    {data.length > 0 ? data.map(item => (
                        <div key={item.name} className="group">
                            <div className="flex justify-between items-center text-sm mb-2">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: item.color || '#334155' }}></div>
                                    <span className="font-medium text-slate-200">{item.name}</span>
                                </div>
                                <div className="text-right">
                                    <span className="font-bold text-white block">{formatCurrency(item.amount)}</span>
                                    <span className="text-xs text-slate-500">{item.percentage.toFixed(1)}%</span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className="h-2 rounded-full transition-all duration-1000 ease-out" style={{ width: `${item.percentage}%`, backgroundColor: item.color || '#334155' }}></div>
                            </div>
                        </div>
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
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                    <p className="text-slate-400 mb-2 font-medium">ديون لك</p>
                    <p className="text-3xl font-extrabold text-emerald-400 drop-shadow-md">{formatCurrency(summary.forYou)}</p>
                </div>
                <div className="bg-slate-800/50 p-6 rounded-2xl border border-white/5">
                    <p className="text-slate-400 mb-2 font-medium">ديون عليك</p>
                    <p className="text-3xl font-extrabold text-rose-400 drop-shadow-md">{formatCurrency(summary.onYou)}</p>
                </div>
            </div>
        </div>
    );
};

const AnalysisResultDisplay: React.FC<{ result: any }> = ({ result }) => {
    if (typeof result === 'string') {
        return <p className="text-center text-slate-400">{result}</p>;
    }

    if (!result || typeof result !== 'object' || !result.summary || !result.positives || !result.improvements || !result.comparison || !result.actionPlan) {
        return <p className="text-center text-slate-400">حدث خطأ في عرض التحليل.</p>;
    }

    const { summary, positives, improvements, comparison, actionPlan } = result;
    const comparisonItems = [
        { label: "الدخل", data: comparison.income, color: "text-emerald-400" },
        { label: "المصاريف", data: comparison.expense, color: "text-rose-400" },
        { label: "الصافي", data: comparison.savings, color: "text-cyan-400" },
    ];

    return (
        <div className="space-y-6">
            <div className="text-center bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-2xl border border-white/10 shadow-lg">
                <h3 className="text-xl font-bold text-cyan-300 mb-3">🇱🇾 ملخص وضعك المالي</h3>
                <p className="text-slate-200 leading-relaxed text-lg">{summary}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="font-bold text-lg text-emerald-400 flex items-center gap-2 border-b border-white/5 pb-2"><CheckCircleIcon className="w-6 h-6"/> نقاط القوة</h4>
                    {positives.map((item: any, i: number) => (
                        <div key={i} className="text-sm">
                            <p className="font-bold text-white mb-1">{item.title}</p>
                            <p className="text-slate-400">{item.description}</p>
                        </div>
                    ))}
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5 space-y-4">
                    <h4 className="font-bold text-lg text-amber-400 flex items-center gap-2 border-b border-white/5 pb-2"><ExclamationTriangleIcon className="w-6 h-6"/> نقاط للتحسين</h4>
                    {improvements.map((item: any, i: number) => (
                         <div key={i} className="text-sm">
                            <p className="font-bold text-white mb-1">{item.title}</p>
                            <p className="text-slate-400">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>

             <div className="bg-slate-900/60 p-5 rounded-2xl border border-white/5">
                <h4 className="font-bold text-lg text-cyan-400 mb-4 text-center">📊 مقارنة بالفترة الماضية</h4>
                <div className="grid grid-cols-3 gap-4 text-center divide-x divide-x-reverse divide-white/10">
                    {comparisonItems.map(item => (
                        <div key={item.label} className="px-2">
                            <p className="text-sm text-slate-400 mb-1">{item.label}</p>
                            <div className={`flex flex-col items-center justify-center font-bold text-lg ${item.color}`}>
                                <span className="text-xl">{formatCurrency(Math.abs(item.data.value))}</span>
                                {item.data.trend === 'up' ? <ArrowTrendingUp className="w-5 h-5 mt-1"/> : <ArrowTrendingDown className="w-5 h-5 mt-1"/>}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

             <div className="bg-gradient-to-br from-cyan-900/30 to-blue-900/30 p-6 rounded-2xl border border-cyan-500/20 space-y-4">
                <h4 className="font-bold text-lg text-cyan-300 flex items-center gap-2"><SparklesIcon className="w-5 h-5"/> خطة مقترحة ليك</h4>
                {actionPlan.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-4 bg-slate-900/40 p-3 rounded-xl">
                        <div className="bg-cyan-500 text-slate-900 rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center font-bold shadow-lg shadow-cyan-500/30">
                            {i + 1}
                        </div>
                        <div>
                            <p className="font-bold text-white mb-1">{item.title}</p>
                            <p className="text-sm text-slate-300 leading-relaxed">{item.description}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const ReportsPage: React.FC<{ key: number }> = ({ key }) => {
    const [period, setPeriod] = useState<Period>('this_month');
    const [activeTab, setActiveTab] = useState<ActiveTab>('expense');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [previousTransactions, setPreviousTransactions] = useState<any[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    
    // AI Analysis State
    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<any | string>('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { startDate, endDate, prevStartDate, prevEndDate } = getDatesForPeriod(period);

            const txPromise = supabase.from('transactions')
                .select('*, categories(*)')
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString());

            const prevTxPromise = supabase.from('transactions')
                .select('amount, type, categories(name), date')
                .gte('date', prevStartDate.toISOString())
                .lte('date', prevEndDate.toISOString())
                .in('type', ['income', 'expense']);
            
            const debtPromise = supabase.from('debts').select('*');

            const [
                { data: txData, error: txError },
                { data: prevTxData, error: prevTxError },
                { data: debtData, error: debtError }
            ] = await Promise.all([txPromise, prevTxPromise, debtPromise]);

            if (txError) console.error("Error fetching transactions:", txError.message);
            else setTransactions((txData as any) || []);

            if (prevTxError) console.error("Error fetching previous transactions:", prevTxError.message);
            else setPreviousTransactions(prevTxData || []);

            if (debtError) console.error("Error fetching debts:", debtError.message);
            else setDebts(debtData as unknown as Debt[] || []);

            setLoading(false);
        };
        fetchData();
    }, [key, period]);

    const reportData = useMemo(() => {
        const expenseData = new Map<string, { amount: number, color: string | null }>();
        const incomeData = new Map<string, { amount: number, color: string | null }>();

        transactions.forEach(tx => {
            const categoryName = (tx.categories as any)?.name || 'غير مصنف';
            const categoryColor = (tx.categories as any)?.color || '#78716c'; // stone-500
            
            if (tx.type === 'expense') {
                const current = expenseData.get(categoryName) || { amount: 0, color: categoryColor };
                expenseData.set(categoryName, { ...current, amount: current.amount + tx.amount });
            } else if (tx.type === 'income') {
                const current = incomeData.get(categoryName) || { amount: 0, color: categoryColor };
                incomeData.set(categoryName, { ...current, amount: current.amount + tx.amount });
            }
        });

        const totalExpense = Array.from(expenseData.values()).reduce((sum, { amount }) => sum + amount, 0);
        const totalIncome = Array.from(incomeData.values()).reduce((sum, { amount }) => sum + amount, 0);

        const processMap = (map: Map<string, { amount: number, color: string | null }>, total: number) => {
            return Array.from(map.entries())
                .map(([name, { amount, color }]) => ({ name, amount, color, percentage: total > 0 ? (amount / total) * 100 : 0 }))
                .sort((a, b) => b.amount - a.amount);
        };

        return {
            expenses: processMap(expenseData, totalExpense),
            incomes: processMap(incomeData, totalIncome),
            totalExpense,
            totalIncome
        };
    }, [transactions]);
    
    const handleAnalysis = async () => {
        setAnalysisLoading(true);
        setAnalysisResult('');

        if (transactions.length === 0) {
            setAnalysisResult('مافيش بيانات كافية للتحليل. ضيف معاملاتك وارجع جرب مرة تانية.');
            setAnalysisLoading(false);
            return;
        }

        const sortedCurrentTransactions = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const sortedPreviousTransactions = [...previousTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const simplifiedCurrentData = sortedCurrentTransactions
            .slice(0, 150)
            .filter(tx => tx.type !== 'transfer')
            .map(tx => ({
                type: tx.type,
                amount: tx.amount,
                category: (tx.categories as any)?.name || 'غير مصنف'
            }));
            
        const simplifiedPrevData = sortedPreviousTransactions
            .slice(0, 150)
            .map(tx => ({
                type: tx.type,
                amount: tx.amount,
                category: tx.categories?.name || 'غير مصنف'
            }));
        
        const totalIncome = reportData.totalIncome;
        const totalExpense = reportData.totalExpense;
        const prevTotalIncome = previousTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
        const prevTotalExpense = previousTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);

        const essentialCategories = ['إيجار', 'فواتير', 'بقالة', 'صحة', 'مواصلات', 'تعليم', 'اتصالات', 'وقود', 'أسرة', 'صيانة'];

        const prompt = `
            أنت مستشار مالي خبير ومحفز من ليبيا. مهمتك هي تحليل البيانات المالية للمستخدم وتقديم تقرير احترافي بصيغة JSON. خاطب المستخدم مباشرة بلهجة ليبية ودودة وبسيطة.

            **بيانات الفترة الحالية:**
            ${JSON.stringify(simplifiedCurrentData)}
            
            **بيانات الفترة السابقة للمقارنة:**
            ${JSON.stringify(simplifiedPrevData)}

            **الفئات التي تعتبر أساسية:**
            ${JSON.stringify(essentialCategories)}

            **المطلوب منك:**
            حلل البيانات وأرجع **فقط كائن JSON صالح** بالهيكل التالي، بدون أي نص قبله أو بعده.

            {
              "summary": "ملخص عام ومحفز للوضع المالي باللهجة الليبية (جملتين أو ثلاثة).",
              "positives": [
                { "title": "عنوان نقطة قوة (مثال: 'تحكم ممتاز في المصاريف')", "description": "شرح بسيط للنقطة الإيجابية." }
              ],
              "improvements": [
                { "title": "عنوان نقطة للتحسين (مثال: 'مصاريف المطاعم عالية شوية')", "description": "اقتراح لطيف وبناء للتحسين." }
              ],
              "comparison": {
                "income": { "value": ${totalIncome - prevTotalIncome}, "trend": "${totalIncome >= prevTotalIncome ? 'up' : 'down'}" },
                "expense": { "value": ${totalExpense - prevTotalExpense}, "trend": "${totalExpense > prevTotalExpense ? 'up' : 'down'}" },
                "savings": { "value": ${(totalIncome - totalExpense) - (prevTotalIncome - prevTotalExpense)}, "trend": "${(totalIncome - totalExpense) >= (prevTotalIncome - prevTotalExpense) ? 'up' : 'down'}" }
              },
              "actionPlan": [
                { "title": "عنوان الخطوة الأولى", "description": "شرح واضح ومبسط للخطوة الأولى باللهجة الليبية." },
                { "title": "عنوان الخطوة الثانية", "description": "شرح واضح ومبسط للخطوة الثانية." },
                { "title": "عنوان الخطوة الثالثة", "description": "شرح واضح ومبسط للخطوة الثالثة." }
              ]
            }
        `;

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    summary: { type: Type.STRING },
                    positives: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
                            required: ['title', 'description']
                        }
                    },
                    improvements: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
                            required: ['title', 'description']
                        }
                    },
                    comparison: {
                        type: Type.OBJECT,
                        properties: {
                            income: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, trend: { type: Type.STRING } }, required: ['value', 'trend'] },
                            expense: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, trend: { type: Type.STRING } }, required: ['value', 'trend'] },
                            savings: { type: Type.OBJECT, properties: { value: { type: Type.NUMBER }, trend: { type: Type.STRING } }, required: ['value', 'trend'] }
                        },
                        required: ['income', 'expense', 'savings']
                    },
                    actionPlan: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: { title: { type: Type.STRING }, description: { type: Type.STRING } },
                            required: ['title', 'description']
                        }
                    }
                },
                 required: ['summary', 'positives', 'improvements', 'comparison', 'actionPlan']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });

            const content = response.text;
            
            try {
                const parsedResult = JSON.parse(content);
                setAnalysisResult(parsedResult);
            } catch (parseError) {
                console.error("Failed to parse AI response as JSON:", content);
                setAnalysisResult('للأسف، شكل الرد من السيرفر غير متوقع. جرب مرة تانية.');
            }

        } catch (err: any) {
            console.error("Error during AI analysis:", err);
            setAnalysisResult('عذرًا، صارت مشكلة في تحليل بياناتك. تأكد من اتصالك بالإنترنت وجرب مرة أخرى.');
        } finally {
            setAnalysisLoading(false);
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="glass-card p-1 rounded-xl flex shadow-lg">
                {(['this_month', 'last_month', 'this_year'] as Period[]).map(p => (
                    <button key={p} onClick={() => setPeriod(p)} className={`w-full py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${period === p ? 'bg-slate-800 text-cyan-400 shadow-inner' : 'text-slate-400 hover:text-white'}`}>
                        {{ 'this_month': 'هذا الشهر', 'last_month': 'الشهر الماضي', 'this_year': 'هذه السنة' }[p]}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-4 text-center">
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-emerald-400 font-bold mb-1">الدخل</p>
                    <p className="font-extrabold text-lg text-white tracking-tight">{formatCurrency(reportData.totalIncome)}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-rose-400 font-bold mb-1">المصروف</p>
                    <p className="font-extrabold text-lg text-white tracking-tight">{formatCurrency(reportData.totalExpense)}</p>
                </div>
                <div className="glass-card p-4 rounded-2xl border border-white/5">
                    <p className="text-xs text-cyan-400 font-bold mb-1">الصافي</p>
                    <p className="font-extrabold text-lg text-white tracking-tight">{formatCurrency(reportData.totalIncome - reportData.totalExpense)}</p>
                </div>
            </div>

            <div className="flex border-b border-slate-800">
                {(['expense', 'income', 'debt'] as ActiveTab[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-3 text-center font-bold transition-colors ${activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>
                        {{ 'expense': 'المصاريف', 'income': 'الإيرادات', 'debt': 'الديون' }[tab]}
                    </button>
                ))}
            </div>

            <div className="pt-6">
                {activeTab === 'expense' && <ReportView title="توزيع المصاريف" data={reportData.expenses} total={reportData.totalExpense} />}
                {activeTab === 'income' && <ReportView title="مصادر الدخل" data={reportData.incomes} total={reportData.totalIncome} />}
                {activeTab === 'debt' && <DebtSummary debts={debts} />}
            </div>
            
            <div className="mt-8 text-center">
                 <button onClick={() => { setAnalysisModalOpen(true); if(!analysisResult) handleAnalysis(); }} className="w-full md:w-auto py-4 px-8 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 text-white rounded-2xl font-bold shadow-xl shadow-fuchsia-900/20 transition-transform hover:scale-105 flex items-center justify-center gap-3 mx-auto">
                    <SparklesIcon className="w-6 h-6 animate-pulse" />
                    <span>طلب تحليل ذكي (AI)</span>
                </button>
            </div>

            {isAnalysisModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 rounded-3xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl animate-slide-up relative custom-scrollbar">
                         <button onClick={() => setAnalysisModalOpen(false)} className="absolute top-4 left-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors z-10">
                            <XMarkIcon className="w-6 h-6 text-slate-400" />
                        </button>
                        
                        <div className="text-center mb-8">
                            <div className="w-16 h-16 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-fuchsia-500/20">
                                <SparklesIcon className="w-8 h-8 text-white" />
                            </div>
                            <h2 className="text-2xl font-bold text-white">المستشار المالي الذكي</h2>
                            <p className="text-slate-400 mt-2">تحليل فوري لبياناتك المالية باستخدام الذكاء الاصطناعي</p>
                        </div>

                        {analysisLoading ? (
                            <div className="py-12 text-center space-y-4">
                                <div className="w-16 h-16 border-4 border-fuchsia-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                <p className="text-slate-300 animate-pulse">جاري تحليل بياناتك المالية...</p>
                            </div>
                        ) : (
                             <AnalysisResultDisplay result={analysisResult} />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
