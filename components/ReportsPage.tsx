import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt, Category } from '../types';
import type { Chart, ChartConfiguration } from 'chart.js/auto';
import { 
    SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon, 
    ArrowTrendingUp, ArrowTrendingDown, KeyIcon 
} from './icons';
// Fix: Import GoogleGenAI and Type for Gemini API usage.
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
        if (!canvasRef.current || !(window as any).Chart) return;
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
                    borderColor: '#1e293b', 
                    borderWidth: 2,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        rtl: true,
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
        chartRef.current = new (window as any).Chart(ctx, chartConfig);
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
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4">{title}</h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                <div className="md:col-span-2 h-56 w-56 mx-auto">
                    {total > 0 ? (
                        <DoughnutChart data={chartData} labels={chartLabels} colors={chartColors} />
                    ) : (
                         <div className="flex items-center justify-center h-full w-full bg-slate-700/50 rounded-full text-slate-500">
                             لا توجد بيانات
                         </div>
                    )}
                </div>
                <div className="md:col-span-3 space-y-3">
                    {data.length > 0 ? data.map(item => (
                        <div key={item.name}>
                            <div className="flex justify-between items-center text-sm mb-1">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color || '#334155' }}></div>
                                    <span>{item.name}</span>
                                </div>
                                <span className="font-semibold">{formatCurrency(item.amount)}</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full" style={{ width: `${item.percentage}%`, backgroundColor: item.color || '#334155' }}></div>
                            </div>
                        </div>
                    )) : <p className="text-slate-500 text-center">لا توجد بيانات لهذه الفترة.</p>}
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
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4">ملخص الديون الحالية</h3>
            <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                    <p className="text-slate-400">ديون لك</p>
                    <p className="text-2xl font-bold text-green-400">{formatCurrency(summary.forYou)}</p>
                </div>
                <div>
                    <p className="text-slate-400">ديون عليك</p>
                    <p className="text-2xl font-bold text-red-400">{formatCurrency(summary.onYou)}</p>
                </div>
            </div>
        </div>
    );
};


const AnalysisResultDisplay: React.FC<{ result: any }> = ({ result }) => {
    if (typeof result === 'string') {
        return <p className="text-center text-slate-400">{result}</p>;
    }

    const { summary, positives, improvements, comparison, actionPlan } = result;
    const comparisonItems = [
        { label: "الدخل", data: comparison.income, color: "text-green-400" },
        { label: "المصاريف", data: comparison.expense, color: "text-red-400" },
        { label: "الصافي", data: comparison.savings, color: "text-cyan-400" },
    ];

    return (
        <div className="space-y-6">
            <div className="text-center bg-slate-900/50 p-4 rounded-lg">
                <h3 className="text-xl font-bold text-cyan-300 mb-2">🇱🇾 ملخص وضعك المالي</h3>
                <p className="text-slate-300 leading-relaxed">{summary}</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg space-y-3">
                    <h4 className="font-bold text-lg text-green-400 flex items-center gap-2"><CheckCircleIcon className="w-6 h-6"/> نقاط القوة</h4>
                    {positives.map((item: any, i: number) => (
                        <div key={i} className="text-sm">
                            <p className="font-semibold text-slate-200">{item.title}</p>
                            <p className="text-slate-400">{item.description}</p>
                        </div>
                    ))}
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg space-y-3">
                    <h4 className="font-bold text-lg text-amber-400 flex items-center gap-2"><ExclamationTriangleIcon className="w-6 h-6"/> نقاط للتحسين</h4>
                    {improvements.map((item: any, i: number) => (
                         <div key={i} className="text-sm">
                            <p className="font-semibold text-slate-200">{item.title}</p>
                            <p className="text-slate-400">{item.description}</p>
                        </div>
                    ))}
                </div>
            </div>

             <div className="bg-slate-900/50 p-4 rounded-lg">
                <h4 className="font-bold text-lg text-cyan-400 mb-3">📊 مقارنة بالفترة الماضية</h4>
                <div className="grid grid-cols-3 gap-4 text-center">
                    {comparisonItems.map(item => (
                        <div key={item.label}>
                            <p className="text-sm text-slate-400">{item.label}</p>
                            <div className={`flex items-center justify-center gap-1 font-bold text-lg ${item.color}`}>
                                {item.data.trend === 'up' ? <ArrowTrendingUp className="w-5 h-5"/> : <ArrowTrendingDown className="w-5 h-5"/>}
                                <span>{formatCurrency(Math.abs(item.data.value))}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

             <div className="bg-slate-900/50 p-4 rounded-lg space-y-4">
                <h4 className="font-bold text-lg text-cyan-400">✨ خطة مقترحة ليك</h4>
                {actionPlan.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3">
                        <div className="bg-cyan-900/50 text-cyan-300 rounded-full h-8 w-8 flex-shrink-0 flex items-center justify-center mt-1">
                            <KeyIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="font-bold text-slate-200">{item.title}</p>
                            <p className="text-sm text-slate-400 leading-relaxed">{item.description}</p>
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
    const [categories, setCategories] = useState<Category[]>([]);
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
                .select('amount, type, categories(name)')
                .gte('date', prevStartDate.toISOString())
                .lte('date', prevEndDate.toISOString())
                .in('type', ['income', 'expense']);
            
            const debtPromise = supabase.from('debts').select('*');
            const catPromise = supabase.from('categories').select('*');

            const [
                { data: txData, error: txError },
                { data: prevTxData, error: prevTxError },
                { data: debtData, error: debtError },
                { data: catData, error: catError }
            ] = await Promise.all([txPromise, prevTxPromise, debtPromise, catPromise]);

            if (txError) console.error("Error fetching transactions:", txError.message);
            else setTransactions((txData as any) || []);

            if (prevTxError) console.error("Error fetching previous transactions:", prevTxError.message);
            else setPreviousTransactions(prevTxData || []);

            if (debtError) console.error("Error fetching debts:", debtError.message);
            else setDebts(debtData || []);
            
            if (catError) console.error("Error fetching categories:", catError.message);
            else setCategories(catData || []);

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

        const simplifiedCurrentData = transactions
            .filter(tx => tx.type !== 'transfer')
            .map(tx => ({
                type: tx.type,
                amount: tx.amount,
                category: (tx.categories as any)?.name || 'غير مصنف'
            }));
            
        const simplifiedPrevData = previousTransactions.map(tx => ({
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

            **إرشادات هامة:**
            - قدم 2 نقاط قوة و 2 نقاط للتحسين.
            - قدم خطة عمل من 3 خطوات واضحة وقابلة للتنفيذ.
            - كن دقيقاً في تحليلك، وفرّق بين المصاريف الأساسية والكمالية.
            - إذا كانت المصاريف أعلى من الدخل، اجعلها نقطة تحسين رئيسية.
            - حافظ على اللهجة الليبية والأسلوب الإيجابي والمشجع.
        `;

        // Fix: Replace OpenRouter API call with Google Gemini API call
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
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ['title', 'description']
                        }
                    },
                    improvements: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ['title', 'description']
                        }
                    },
                    comparison: {
                        type: Type.OBJECT,
                        properties: {
                            income: {
                                type: Type.OBJECT,
                                properties: {
                                    value: { type: Type.NUMBER },
                                    trend: { type: Type.STRING }
                                },
                                required: ['value', 'trend']
                            },
                            expense: {
                                type: Type.OBJECT,
                                properties: {
                                    value: { type: Type.NUMBER },
                                    trend: { type: Type.STRING }
                                },
                                required: ['value', 'trend']
                            },
                            savings: {
                                type: Type.OBJECT,
                                properties: {
                                    value: { type: Type.NUMBER },
                                    trend: { type: Type.STRING }
                                },
                                required: ['value', 'trend']
                            }
                        },
                        required: ['income', 'expense', 'savings']
                    },
                    actionPlan: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                description: { type: Type.STRING }
                            },
                            required: ['title', 'description']
                        }
                    }
                },
                 required: ['summary', 'positives', 'improvements', 'comparison', 'actionPlan']
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-pro', // Using a more capable model for structured JSON output
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
        <div className="space-y-6">
            <div className="flex bg-slate-800 rounded-lg p-1 text-sm shadow">
                {(['this_month', 'last_month', 'this_year'] as Period[]).map(p => (
                    <button key={p} onClick={() => setPeriod(p)} className={`w-full py-2 px-1 rounded-md transition-colors font-semibold ${period === p ? 'bg-slate-700 text-cyan-400' : 'text-slate-300 hover:bg-slate-700/50'}`}>
                        {{ 'this_month': 'هذا الشهر', 'last_month': 'الشهر الماضي', 'this_year': 'هذه السنة' }[p]}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-sm text-green-400">إجمالي الدخل</p>
                    <p className="font-bold text-lg">{formatCurrency(reportData.totalIncome)}</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-sm text-red-400">إجمالي المصروف</p>
                    <p className="font-bold text-lg">{formatCurrency(reportData.totalExpense)}</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-sm text-slate-400">الصافي</p>
                    <p className="font-bold text-lg">{formatCurrency(reportData.totalIncome - reportData.totalExpense)}</p>
                </div>
            </div>

            <div className="flex border-b border-slate-700">
                {(['expense', 'income', 'debt'] as ActiveTab[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} className={`w-1/2 py-3 text-center font-semibold transition-colors ${activeTab === tab ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>
                        {{ 'expense': 'المصروفات', 'income': 'الإيرادات', 'debt': 'الديون' }[tab]}
                    </button>
                ))}
            </div>

            {loading ? <div className="h-64 bg-slate-800 rounded-xl animate-pulse"></div> : (
                <>
                    {activeTab === 'expense' && <ReportView title="تحليل المصروفات" data={reportData.expenses} total={reportData.totalExpense} />}
                    {activeTab === 'income' && <ReportView title="تحليل الإيرادات" data={reportData.incomes} total={reportData.totalIncome} />}
                    {activeTab === 'debt' && <DebtSummary debts={debts} />}
                </>
            )}
            
            <button 
                onClick={() => { setAnalysisModalOpen(true); handleAnalysis(); }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg transition-colors border border-slate-700"
            >
                <SparklesIcon className="w-6 h-6" />
                تحليل مالي بالذكاء الاصطناعي
            </button>
            
            {isAnalysisModalOpen && (
                 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-800 rounded-xl p-1 w-full max-w-2xl border border-slate-700 shadow-xl animate-slide-up flex flex-col">
                        <div className="flex justify-between items-center p-4">
                            <h3 className="text-xl font-bold flex items-center gap-2 text-cyan-300"><SparklesIcon className="w-6 h-6" /> التحليل المالي الذكي</h3>
                            <button onClick={() => setAnalysisModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="max-h-[70vh] overflow-y-auto p-4 bg-slate-900/50 rounded-b-lg">
                            {analysisLoading ? (
                                <div className="space-y-6 animate-pulse p-4">
                                     <div className="space-y-2">
                                        <div className="h-5 w-1/3 bg-slate-700 rounded"></div>
                                        <div className="h-4 w-full bg-slate-700 rounded"></div>
                                        <div className="h-4 w-5/6 bg-slate-700 rounded"></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <div className="h-5 w-1/2 bg-slate-700 rounded"></div>
                                            <div className="h-4 w-full bg-slate-700 rounded"></div>
                                        </div>
                                         <div className="space-y-2">
                                            <div className="h-5 w-1/2 bg-slate-700 rounded"></div>
                                            <div className="h-4 w-full bg-slate-700 rounded"></div>
                                        </div>
                                    </div>
                                     <div className="space-y-2">
                                        <div className="h-5 w-1/3 bg-slate-700 rounded"></div>
                                        <div className="h-8 w-full bg-slate-700 rounded"></div>
                                    </div>
                                </div>
                            ) : (
                                <AnalysisResultDisplay result={analysisResult} />
                            )}
                        </div>
                    </div>
                 </div>
            )}

        </div>
    );
};

export default ReportsPage;
