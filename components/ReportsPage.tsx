import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '../lib/supabase';
import { Transaction, Debt } from '../types';
import type { Chart, ChartConfiguration } from 'chart.js/auto';
import { SparklesIcon, InformationCircleIcon, ArrowUpIcon, ArrowDownIcon, CheckCircleIcon } from './icons';

type FilterType = 'this_month' | 'last_month' | 'this_year' | 'all_time';

interface AiSummary {
    greeting: string;
    overallStatus: string;
    statusColor: 'green' | 'amber' | 'red';
    keyInsight: string;
    incomeAnalysis: string;
    spendingAnalysis: string;
    recommendations: string[];
}


const formatCurrency = (amount: number) => {
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'LYD',
    };
    if (amount % 1 === 0) {
        options.minimumFractionDigits = 0;
        options.maximumFractionDigits = 0;
    } else {
        options.minimumFractionDigits = 2;
        options.maximumFractionDigits = 2;
    }
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', 'د.ل');
};

const COLORS = [
    '#22d3ee', '#34d399', '#f87171', '#fbbf24', '#a78bfa', '#f472b6',
    '#60a5fa', '#818cf8', '#a3e635', '#2dd4bf', '#f97316', '#d946ef'
];

const DoughnutChart: React.FC<{ data: number[], labels: string[] }> = ({ data, labels }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !(window as any).Chart) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const chartConfig: ChartConfiguration<'doughnut'> = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: COLORS.slice(0, data.length),
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
                    legend: {
                        display: false
                    },
                    tooltip: {
                        rtl: true,
                        bodyFont: { family: 'Cairo' },
                        titleFont: { family: 'Cairo' },
                    }
                }
            }
        };

        chartRef.current = new (window as any).Chart(ctx, chartConfig);

        return () => {
            chartRef.current?.destroy();
        };
    }, [data, labels]);

    return <div className="h-48 w-48 mx-auto"><canvas ref={canvasRef}></canvas></div>;
};

const DateFilter: React.FC<{
    activeFilter: FilterType;
    onFilterChange: (filter: FilterType) => void;
}> = ({ activeFilter, onFilterChange }) => {
    const filters: { key: FilterType, label: string }[] = [
        { key: 'this_month', label: 'هذا الشهر' },
        { key: 'last_month', label: 'الشهر الماضي' },
        { key: 'this_year', label: 'هذه السنة' },
        { key: 'all_time', label: 'كل الأوقات' },
    ];
    return (
        <div className="mb-4">
            <div className="flex bg-slate-800 rounded-lg p-1 text-sm">
                {filters.map(f => (
                    <button
                        key={f.key}
                        onClick={() => onFilterChange(f.key)}
                        className={`w-full py-2 px-1 rounded-md transition-colors font-semibold ${activeFilter === f.key ? 'bg-slate-700 text-cyan-400' : 'text-slate-400 hover:bg-slate-700/50'}`}
                    >
                        {f.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

const AIAnalysis: React.FC<{
    summary: AiSummary | null,
    isAnalyzing: boolean,
    error: string,
}> = ({ summary, isAnalyzing, error }) => {
    if (!summary && !isAnalyzing && !error) {
        return null; // Don't show anything until analysis is requested
    }

    if (isAnalyzing) {
        return (
            <div className="text-center p-4 bg-slate-800 rounded-lg animate-pulse">
                <p>جاري تحليل بياناتك المالية...</p>
                <p className="text-sm text-slate-400">قد يستغرق هذا بضع ثوان.</p>
            </div>
        );
    }
    
    if (error) {
        return <div className="text-center p-4 bg-red-900/50 text-red-400 rounded-lg">{error}</div>;
    }
    
    if (!summary) return null;

    const statusClasses = {
        green: 'bg-green-500/10 text-green-400',
        amber: 'bg-amber-500/10 text-amber-400',
        red: 'bg-red-500/10 text-red-400',
    }

    return (
        <div className="bg-slate-800 p-4 rounded-lg space-y-4 border border-violet-500/50 animate-fade-in">
            <h3 className="font-bold text-lg text-violet-400">{summary.greeting}</h3>
            
            <div className={`inline-block px-3 py-1 text-sm font-semibold rounded-full ${statusClasses[summary.statusColor]}`}>
                {summary.overallStatus}
            </div>

            <p><span className="font-semibold">أهم ملاحظة:</span> {summary.keyInsight}</p>
            <p><span className="font-semibold">تحليل الدخل:</span> {summary.incomeAnalysis}</p>
            <p><span className="font-semibold">تحليل المصروفات:</span> {summary.spendingAnalysis}</p>

            <div>
                <h4 className="font-semibold mb-2">توصيات نبيه لك:</h4>
                <ul className="list-none space-y-2">
                    {summary.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5"/>
                            <span>{rec}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
};


const ReportsPage: React.FC<{ key: number }> = ({ key }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'debt'>('expense');
    const [filter, setFilter] = useState<FilterType>('this_month');
    const [aiSummary, setAiSummary] = useState<AiSummary | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
    const [analysisError, setAnalysisError] = useState<string>('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const txPromise = supabase.from('transactions').select('*, categories(name)');
            const debtPromise = supabase.from('debts').select('*').eq('paid', false);

            const [{ data: txData, error: txError }, { data: debtData, error: debtError }] = await Promise.all([txPromise, debtPromise]);
            
            if (txError) console.error("Error fetching transactions:", txError.message);
            else setTransactions(txData as unknown as Transaction[]);

            if (debtError) console.error("Error fetching debts:", debtError.message);
            else setDebts(debtData as Debt[]);
            
            setLoading(false);
        };
        fetchData();
    }, [key]);

    const reportData = useMemo(() => {
        const now = new Date();
        let startDate: Date | null = null;
        let endDate: Date | null = null;
    
        switch (filter) {
            case 'this_month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
                break;
            case 'last_month':
                startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
                break;
            case 'this_year':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
                break;
            case 'all_time':
            default:
                break;
        }

        const filteredTransactions = transactions.filter(tx => {
            if (filter === 'all_time' || !startDate || !endDate) return true;
            const txDate = new Date(tx.date);
            return txDate >= startDate && txDate <= endDate;
        });

        const expenseByCategory: { [key: string]: number } = {};
        const incomeByCategory: { [key: string]: number } = {};
        let totalExpenses = 0;
        let totalIncome = 0;

        filteredTransactions.forEach(tx => {
            const categoryName = tx.categories?.name || 'غير مصنف';
            if (tx.type === 'expense') {
                expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + tx.amount;
                totalExpenses += tx.amount;
            } else if (tx.type === 'income') {
                incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + tx.amount;
                totalIncome += tx.amount;
            }
        });

        const expenseSummary = Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a);
        const incomeSummary = Object.entries(incomeByCategory).sort(([, a], [, b]) => b - a);

        const debtsOnYou = debts.filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
        const debtsForYou = debts.filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);

        return {
            expenses: {
                labels: expenseSummary.map(([label, _]) => label),
                data: expenseSummary.map(([_, amount]) => amount),
                summary: expenseSummary,
                total: totalExpenses
            },
            income: {
                labels: incomeSummary.map(([label, _]) => label),
                data: incomeSummary.map(([_, amount]) => amount),
                summary: incomeSummary,
                total: totalIncome
            },
            debts: {
                labels: ['ديون عليك', 'ديون لك'],
                data: [debtsOnYou, debtsForYou],
                totalOnYou: debtsOnYou,
                totalForYou: debtsForYou
            }
        };
    }, [transactions, debts, filter]);
    
    const handleAiAnalysis = async () => {
        setIsAnalyzing(true);
        setAiSummary(null);
        setAnalysisError('');

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

            const { expenses, income } = reportData;
            const netResult = income.total - expenses.total;
            
            const filterLabels = {
                'this_month': 'هذا الشهر',
                'last_month': 'الشهر الماضي',
                'this_year': 'هذه السنة',
                'all_time': 'كل الأوقات'
            };
            const periodName = filterLabels[filter];

            const prompt = `
أنت مستشار مالي شخصي وودود اسمك 'نبيه'. قم بتحليل البيانات المالية للمستخدم عن فترة "${periodName}" وقدم ملخصًا موجزًا ومفيدًا باللغة العربية.

البيانات:
- إجمالي الدخل: ${formatCurrency(income.total)}
- إجمالي المصروفات: ${formatCurrency(expenses.total)}
- صافي النتيجة: ${formatCurrency(netResult)}
- تفاصيل المصروفات: ${JSON.stringify(expenses.summary.slice(0, 5))}
- تفاصيل الدخل: ${JSON.stringify(income.summary.slice(0, 5))}

مهمتك هي ملء كائن JSON بالكامل بناءً على هذه البيانات. يجب أن يكون التحليل واضحًا وعصريًا ومختصرًا.
`;
            
             const responseSchema = {
                type: Type.OBJECT,
                properties: {
                    greeting: { type: Type.STRING, description: "تحية ودية وموجزة للمستخدم تبدأ بـ 'أهلاً بك! أنا نبيه...'." },
                    overallStatus: { type: Type.STRING, description: "تقييم عام للحالة المالية بكلمة واحدة أو كلمتين (مثل 'ممتاز', 'جيد جدًا', 'يحتاج لتحسين')." },
                    statusColor: { type: Type.STRING, description: "لون يمثل الحالة: 'green' للممتاز/الجيد، 'amber' للمتوسط، 'red' للسيء.", enum: ['green', 'amber', 'red'] },
                    keyInsight: { type: Type.STRING, description: "أهم ملاحظة أو استنتاج رئيسي يمكن للمستخدم استخلاصه." },
                    incomeAnalysis: { type: Type.STRING, description: "تحليل موجز لمصادر الدخل." },
                    spendingAnalysis: { type: Type.STRING, description: "تحليل موجز لعادات الإنفاق، مع التركيز على الفئات الأعلى." },
                    recommendations: {
                        type: Type.ARRAY,
                        description: "قائمة من 2 إلى 3 نصائح عملية وقابلة للتنفيذ.",
                        items: { type: Type.STRING }
                    }
                },
                required: ["greeting", "overallStatus", "statusColor", "keyInsight", "incomeAnalysis", "spendingAnalysis", "recommendations"]
            };

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: responseSchema,
                },
            });
            
            const summaryObject = JSON.parse(response.text);
            setAiSummary(summaryObject);

        } catch (error) {
            console.error("Error generating AI summary:", error);
            setAnalysisError("عذرًا، حدث خطأ أثناء محاولة تحليل بياناتك. يرجى المحاولة مرة أخرى.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const renderContent = () => {
        if (loading) return <div className="text-center p-8">جاري تحميل التقارير...</div>;

        switch (activeTab) {
            case 'expense':
                if (reportData.expenses.data.length === 0) return <p className="text-center p-8 text-slate-400">لا توجد بيانات للمصروفات في هذه الفترة.</p>;
                return <ReportSection data={reportData.expenses.data} labels={reportData.expenses.labels} summary={reportData.expenses.summary} total={reportData.expenses.total} color="text-red-400" />;
            case 'income':
                if (reportData.income.data.length === 0) return <p className="text-center p-8 text-slate-400">لا توجد بيانات للإيرادات في هذه الفترة.</p>;
                return <ReportSection data={reportData.income.data} labels={reportData.income.labels} summary={reportData.income.summary} total={reportData.income.total} color="text-green-400" />;
            case 'debt':
                 if (reportData.debts.data.every(d => d === 0)) return <p className="text-center p-8 text-slate-400">لا توجد ديون غير مسددة.</p>;
                 return (
                    <div className="bg-slate-800 p-4 rounded-lg">
                        <DoughnutChart data={reportData.debts.data} labels={reportData.debts.labels} />
                        <div className="mt-4 space-y-2">
                             <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-md">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[0] }}></div>
                                    <span>ديون عليك</span>
                                </div>
                                <span className="font-bold text-red-400">{formatCurrency(reportData.debts.totalOnYou)}</span>
                            </div>
                             <div className="flex justify-between items-center p-2 bg-slate-700/50 rounded-md">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[1] }}></div>
                                    <span>ديون لك</span>
                                </div>
                                <span className="font-bold text-green-400">{formatCurrency(reportData.debts.totalForYou)}</span>
                            </div>
                        </div>
                    </div>
                 );
        }
    };
    
    const ReportSection: React.FC<{data: number[], labels: string[], summary: [string, number][], total: number, color: string}> = ({data, labels, summary, total, color}) => (
        <div className="bg-slate-800 p-4 rounded-lg">
            <DoughnutChart data={data} labels={labels} />
            <div className="text-center my-4">
                <p className="text-slate-400">الإجمالي</p>
                <p className={`text-2xl font-bold ${color}`}>{formatCurrency(total)}</p>
            </div>
            <div className="space-y-2">
                {summary.map(([label, amount], i) => (
                    <div key={label} className="flex justify-between items-center p-2 bg-slate-700/50 rounded-md">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                            <span>{label}</span>
                        </div>
                        <div className="text-right">
                           <span className="font-bold">{formatCurrency(amount)}</span>
                           <span className="text-xs text-slate-400 block">{((amount / total) * 100).toFixed(1)}%</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div>
            <DateFilter activeFilter={filter} onFilterChange={setFilter} />
            
            <div className="my-4">
                <button 
                    onClick={handleAiAnalysis} 
                    disabled={isAnalyzing || loading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-violet-600 text-white font-bold rounded-lg shadow-lg hover:bg-violet-500 transition-all duration-300 disabled:bg-violet-800 disabled:cursor-not-allowed transform hover:scale-105"
                >
                    <SparklesIcon className="w-6 h-6" />
                    {isAnalyzing ? 'جاري التحليل...' : 'تحليل مالي بالذكاء الاصطناعي'}
                </button>
            </div>

            <AIAnalysis
                summary={aiSummary}
                isAnalyzing={isAnalyzing}
                error={analysisError}
            />

            <div className="flex border-b border-slate-700 mt-6 mb-4">
                <button onClick={() => setActiveTab('expense')} className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'expense' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>
                    المصروفات
                </button>
                <button onClick={() => setActiveTab('income')} className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'income' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>
                    الإيرادات
                </button>
                <button onClick={() => setActiveTab('debt')} className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'debt' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>
                    الديون
                </button>
            </div>

            {renderContent()}
        </div>
    );
};

export default ReportsPage;
