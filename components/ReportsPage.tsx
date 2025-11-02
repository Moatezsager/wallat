import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt, Category } from '../types';
import type { Chart, ChartConfiguration } from 'chart.js/auto';
import { SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon } from './icons';


type Period = 'this_month' | 'last_month' | 'this_year';
type ActiveTab = 'expense' | 'income' | 'debt';

const formatCurrency = (amount: number) => {
    const options: Intl.NumberFormatOptions = {
        style: 'currency',
        currency: 'LYD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    };
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', 'د.ل');
};

const getDatesForPeriod = (period: Period) => {
    const now = new Date();
    let startDate: Date, endDate: Date;

    switch (period) {
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
    }
    return { startDate, endDate };
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

const ReportsPage: React.FC<{ key: number }> = ({ key }) => {
    const [period, setPeriod] = useState<Period>('this_month');
    const [activeTab, setActiveTab] = useState<ActiveTab>('expense');
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    
    // AI Analysis State
    const [isAnalysisModalOpen, setAnalysisModalOpen] = useState(false);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const { startDate, endDate } = getDatesForPeriod(period);

            const txPromise = supabase.from('transactions')
                .select('*, categories(*)')
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString());
            
            const debtPromise = supabase.from('debts').select('*');
            const catPromise = supabase.from('categories').select('*');

            const [
                { data: txData, error: txError },
                { data: debtData, error: debtError },
                { data: catData, error: catError }
            ] = await Promise.all([txPromise, debtPromise, catPromise]);

            if (txError) console.error("Error fetching transactions:", txError.message);
            else setTransactions((txData as any) || []);

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

        const { startDate, endDate } = getDatesForPeriod(period);

        const { data: reportData, error } = await supabase
            .from('transactions')
            .select('amount, type, categories(name)')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .in('type', ['income', 'expense']);

        if (error || !reportData) {
            setAnalysisResult('حدث خطأ أثناء جلب البيانات للتحليل.');
            setAnalysisLoading(false);
            return;
        }
        
        const OPENROUTER_API_KEY = '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';

        const simplifiedData = reportData.map(tx => ({
            type: tx.type,
            amount: tx.amount,
            category: (tx.categories as any)?.name || 'غير مصنف'
        }));

        const prompt = `
            باللغة العربية، قم بتحليل البيانات المالية التالية للمستخدم. قدم ملخصًا موجزًا (2-3 جمل) عن الوضع المالي العام.
            ثم قدم 3-5 نقاط رئيسية كقائمة من النصائح أو الملاحظات القابلة للتنفيذ.
            كن إيجابيًا ومحفزًا. اجعل التحليل بسيطًا وسهل الفهم لشخص غير خبير ماليًا.
            
            البيانات:
            ${JSON.stringify(simplifiedData)}
        `;

        try {
            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    "model": "openai/gpt-3.5-turbo",
                    "messages": [
                        { "role": "user", "content": prompt }
                    ]
                })
            });

            if (!response.ok) {
                const errorBody = await response.json();
                console.error("OpenRouter API Error:", errorBody);
                throw new Error(`API request failed with status ${response.status}`);
            }

            const data = await response.json();
            setAnalysisResult(data.choices[0].message.content);
        } catch (err: any) {
            console.error(err);
            setAnalysisResult('عذرًا، حدث خطأ أثناء تحليل بياناتك. يرجى المحاولة مرة أخرى.');
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
                onClick={() => { setAnalysisResult(''); setAnalysisModalOpen(true); handleAnalysis(); }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg transition-colors border border-slate-700"
            >
                <SparklesIcon className="w-6 h-6" />
                تحليل مالي بالذكاء الاصطناعي
            </button>
            
            {isAnalysisModalOpen && (
                 <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-800 rounded-lg p-6 w-full max-w-lg border border-slate-700 shadow-xl animate-slide-up">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-cyan-400" /> التحليل المالي</h3>
                            <button onClick={() => setAnalysisModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="max-h-[60vh] overflow-y-auto pr-2 text-slate-300">
                            {analysisLoading ? (
                                <div className="space-y-4">
                                    <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse"></div>
                                    <div className="h-4 bg-slate-700 rounded w-1/2 animate-pulse"></div>
                                    <div className="h-4 bg-slate-700 rounded w-5/6 animate-pulse mt-6"></div>
                                    <div className="h-4 bg-slate-700 rounded w-full animate-pulse"></div>
                                </div>
                            ) : (
                                <div className="prose prose-invert max-w-none prose-p:my-2 prose-ul:my-2 prose-headings:text-cyan-400" dangerouslySetInnerHTML={{ __html: analysisResult.replace(/\n/g, '<br />') }}></div>
                            )}
                        </div>
                    </div>
                 </div>
            )}

        </div>
    );
};

export default ReportsPage;