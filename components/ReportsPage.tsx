import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt, Category } from '../types';
import type { Chart, ChartConfiguration } from 'chart.js/auto';
import { GoogleGenAI } from '@google/genai';
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
                                <div className="font-semibold">
                                    <span>{formatCurrency(item.amount)}</span>
                                    <span className="text-slate-400 text-xs mr-2">({item.percentage.toFixed(1)}%)</span>
                                </div>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                                <div 
                                    className="h-2 rounded-full" 
                                    style={{ width: `${item.percentage}%`, backgroundColor: item.color || '#334155' }}
                                ></div>
                            </div>
                        </div>
                    )) : (
                        <p className="text-slate-500 text-center col-span-3 py-8">لا توجد بيانات لعرضها في هذه الفترة.</p>
                    )}
                </div>
            </div>
        </div>
    );
};

const DebtReportView: React.FC<{ data: any }> = ({ data }) => {
    return (
        <div className="bg-slate-800 p-4 rounded-xl shadow-lg space-y-4">
            <h3 className="text-xl font-bold mb-4">ملخص الديون</h3>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                 <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                    <p className="text-sm text-green-400">ديون لك (غير مسددة)</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(data.forYou)}</p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg text-center">
                    <p className="text-sm text-red-400">ديون عليك (غير مسددة)</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(data.onYou)}</p>
                </div>
                <div className={`p-4 rounded-lg text-center ${data.net > 0 ? 'bg-green-500/10 text-green-400' : data.net < 0 ? 'bg-red-500/10 text-red-400' : 'bg-slate-700 text-slate-400'}`}>
                    <p className="text-sm">صافي مركز الديون</p>
                    <p className="text-2xl font-bold text-white">{formatCurrency(data.net)}</p>
                </div>
            </div>
        </div>
    );
};


const ReportsPage: React.FC<{ key: number }> = ({ key }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<Period>('this_month');
    const [activeTab, setActiveTab] = useState<ActiveTab>('expense');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState('');


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const txPromise = supabase.from('transactions').select('*, categories(name, color)');
            const debtPromise = supabase.from('debts').select('*');
            const catPromise = supabase.from('categories').select('*');

            const [{ data: txData }, { data: debtData }, {data: catData}] = await Promise.all([txPromise, debtPromise, catPromise]);
            
            setTransactions(txData as any[] || []);
            setDebts(debtData || []);
            setCategories(catData || []);
            setLoading(false);
        };
        fetchData();
    }, [key]);

    const handleGenerateAnalysis = async () => {
        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiAnalysisResult('');
    
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
            const { startDate, endDate } = getDatesForPeriod('this_month');
            const currentTxs = transactions.filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= startDate && txDate <= endDate;
            });
    
            const totalIncome = currentTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
            const totalExpense = currentTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
            
            const expensesByCategory: { [key: string]: number } = {};
            currentTxs.filter(tx => tx.type === 'expense').forEach(tx => {
                const categoryName = (tx as any).categories?.name || 'غير مصنف';
                expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + tx.amount;
            });
            const expensesString = Object.entries(expensesByCategory).map(([name, amount]) => `- ${name}: ${formatCurrency(amount)}`).join('\n');

            const allExpenseCategories = categories.filter(c => c.type === 'expense').map(c => c.name).join('، ');
    
            const debtsForYou = debts.filter(d => d.type === 'for_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
            const debtsOnYou = debts.filter(d => d.type === 'on_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
    
            const prompt = `
            حلل البيانات المالية التالية للشهر الحالي وقدم تحليل بسيط وواضح، مع ملاحظات وخطة مقترحة.
            استخدم فهمك للفئات المالية لتقديم تحليل أعمق. على سبيل المثال، ميز بين المصاريف الأساسية (مثل الإيجار، الفواتير) والمصاريف الكمالية (مثل الترفيه، المطاعم).

            البيانات المالية للشهر الحالي:
            - إجمالي الإيرادات: ${formatCurrency(totalIncome)}
            - إجمالي المصروفات: ${formatCurrency(totalExpense)}
            - إجمالي الديون اللي ليك (مستحقة): ${formatCurrency(debtsForYou)}
            - إجمالي الديون اللي عليك (مستحقة): ${formatCurrency(debtsOnYou)}
            
            قائمة بكل فئات المصروفات المتاحة في التطبيق:
            ${allExpenseCategories || 'لا توجد فئات مصروفات معرفة.'}

            تفصيل المصروفات لهذا الشهر:
            ${expensesString || 'لا يوجد مصروفات هذا الشهر.'}

            الرجاء تقديم التحليل بالتنسيق التالي بالضبط، بدون أي نص إضافي خارجه:
            [HEADER]عنوان رئيسي جذاب للتحليل[/HEADER]
            [OVERVIEW]فقرة قصيرة كنظرة عامة على الوضع المالي للشهر، مع الإشارة إلى نسبة المصروفات من الدخل.[/OVERVIEW]
            [POSITIVE]عنوان لنقاط إيجابية (مثال: حاجات باهية درتها)[/POSITIVE]
            [ITEM]نص النقطة الإيجابية الأولى.[/ITEM]
            [ITEM]نص النقطة الإيجابية الثانية (إذا وجدت).[/ITEM]
            [NEGATIVE]عنوان لنقاط تحتاج انتباه (مثال: حاجات ركز عليها)[/NEGATIVE]
            [ITEM]نص نقطة الانتباه الأولى، مع تحليل نوع المصاريف (أساسية أو كمالية).[/ITEM]
            [ITEM]نص نقطة الانتباه الثانية (إذا وجدت).[/ITEM]
            [PLAN]عنوان للخطة المقترحة (مثال: خطة بسيطة للشهر الجاي)[/PLAN]
            [ITEM]نص الخطوة الأولى في الخطة.[/ITEM]
            [ITEM]نص الخطوة الثانية في الخطة.[/ITEM]
            `;
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: "أنت مستشار مالي خبير من ليبيا. لهجتك ليبية بسيطة وودودة. هدفك هو مساعدة المستخدم على فهم وضعه المالي وتقديم نصائح عملية ومُشجعة.",
                }
            });
    
            setAiAnalysisResult(response.text);
    
        } catch (error) {
            console.error("Error generating AI analysis:", error);
            setAiAnalysisResult("[ERROR]صارت مشكلة في الاتصال بالذكاء الاصطناعي. عاود مرة تانية.[/ERROR]");
        } finally {
            setIsAiLoading(false);
        }
    };

    const processedData = useMemo(() => {
        const { startDate, endDate } = getDatesForPeriod(period);

        const currentTxs = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= startDate && txDate <= endDate;
        });

        const processCategoricalData = (type: 'income' | 'expense') => {
            const byCategory: { [key: string]: { name: string, color: string | null, amount: number } } = {};
            let total = 0;

            currentTxs.filter(tx => tx.type === type).forEach(tx => {
                total += tx.amount;
                const category = (tx as any).categories;
                const catName = category?.name || 'غير مصنف';
                const catColor = category?.color || '#78716c';
                
                if (!byCategory[catName]) {
                    byCategory[catName] = { name: catName, color: catColor, amount: 0 };
                }
                byCategory[catName].amount += tx.amount;
            });
            
            return {
                total,
                byCategory: Object.values(byCategory)
                    .map(c => ({ ...c, percentage: total > 0 ? (c.amount / total) * 100 : 0 }))
                    .sort((a, b) => b.amount - a.amount),
            };
        };
        
        const debtStats = {
            forYou: debts.filter(d => d.type === 'for_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0),
            onYou: debts.filter(d => d.type === 'on_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0),
        };
        const debtData = { ...debtStats, net: debtStats.forYou - debtStats.onYou };

        return {
            expenseData: processCategoricalData('expense'),
            incomeData: processCategoricalData('income'),
            debtData,
        };
    }, [transactions, debts, period]);

    
    if (loading) return <div className="text-center p-8 text-slate-400">جاري تحميل التقارير...</div>;


    return (
        <div className="space-y-6">
            <div className="bg-slate-800 p-4 rounded-xl shadow-lg space-y-4">
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">التقارير المالية</h2>
                    <button onClick={handleGenerateAnalysis} className="flex items-center gap-2 bg-cyan-600/10 text-cyan-400 font-semibold py-2 px-4 rounded-lg hover:bg-cyan-600/20 transition-colors">
                        <SparklesIcon className="w-5 h-5"/>
                        تحليل بالذكاء الاصطناعي
                    </button>
                </div>
                <div className="flex bg-slate-700/50 rounded-lg p-1 text-sm">
                    {(['this_month', 'last_month', 'this_year'] as Period[]).map(p => (
                        <button
                            key={p}
                            onClick={() => setPeriod(p)}
                            className={`w-full py-2 px-1 rounded-md transition-colors font-semibold ${period === p ? 'bg-slate-600 text-cyan-400' : 'text-slate-400 hover:bg-slate-700/50'}`}
                        >
                            { {this_month: 'هذا الشهر', last_month: 'الشهر الماضي', this_year: 'هذه السنة'}[p] }
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex border-b border-slate-700">
                <button
                    onClick={() => setActiveTab('expense')}
                    className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'expense' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
                >
                    المصروفات
                </button>
                <button
                    onClick={() => setActiveTab('income')}
                    className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'income' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
                >
                    الإيرادات
                </button>
                <button
                    onClick={() => setActiveTab('debt')}
                    className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'debt' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
                >
                    الديون
                </button>
            </div>

            <div className="animate-fade-in-fast">
                {activeTab === 'expense' && (
                    <ReportView title="توزيع المصروفات" data={processedData.expenseData.byCategory} total={processedData.expenseData.total} />
                )}
                {activeTab === 'income' && (
                    <ReportView title="توزيع الإيرادات" data={processedData.incomeData.byCategory} total={processedData.incomeData.total} />
                )}
                {activeTab === 'debt' && (
                    <DebtReportView data={processedData.debtData} />
                )}
            </div>
            
            <AiAnalysisModal
                isOpen={isAiModalOpen}
                isLoading={isAiLoading}
                result={aiAnalysisResult}
                onClose={() => setIsAiModalOpen(false)}
            />
        </div>
    );
};


const AiAnalysisModal: React.FC<{
    isOpen: boolean;
    isLoading: boolean;
    result: string;
    onClose: () => void;
}> = ({ isOpen, isLoading, result, onClose }) => {
    
    const parseAndRenderAnalysis = (text: string) => {
        if (!text) return null;

        if (text.startsWith('[ERROR]')) {
             return (
                <div className="text-center text-red-400 space-y-4">
                    <ExclamationTriangleIcon className="w-16 h-16 mx-auto" />
                    <p className="font-semibold">{text.replace(/\[ERROR\]|\[\/ERROR\]/g, '')}</p>
                </div>
            );
        }

        const getSection = (tag: string) => text.match(new RegExp(`\\[${tag}\\](.*?)\\[\\/${tag}\\]`, 's'))?.[1]?.trim() || '';
        
        const positiveSection = text.split('[POSITIVE]')[1]?.split('[NEGATIVE]')[0] || '';
        const positiveTitle = positiveSection.split('[/POSITIVE]')[0].trim();
        const positiveItems = (positiveSection.split('[/POSITIVE]')[1] || '').match(/\[ITEM\](.*?)\[\/ITEM\]/gs)?.map(item => item.replace(/\[\/?ITEM\]/g, '').trim()).filter(Boolean) || [];

        const negativeSection = text.split('[NEGATIVE]')[1]?.split('[PLAN]')[0] || '';
        const negativeTitle = negativeSection.split('[/NEGATIVE]')[0].trim();
        const negativeItems = (negativeSection.split('[/NEGATIVE]')[1] || '').match(/\[ITEM\](.*?)\[\/ITEM\]/gs)?.map(item => item.replace(/\[\/?ITEM\]/g, '').trim()).filter(Boolean) || [];

        const planSection = text.split('[PLAN]')[1] || '';
        const planTitle = planSection.split('[/PLAN]')[0].trim();
        const planItems = (planSection.split('[/PLAN]')[1] || '').match(/\[ITEM\](.*?)\[\/ITEM\]/gs)?.map(item => item.replace(/\[\/?ITEM\]/g, '').trim()).filter(Boolean) || [];


        return (
            <div className="space-y-6 text-right">
                <p className="text-slate-300 leading-relaxed">{getSection('OVERVIEW')}</p>
                
                {positiveTitle && positiveItems.length > 0 && (
                    <div className="bg-green-500/10 border-r-4 border-green-500 p-4 rounded-r-lg">
                        <h4 className="font-bold text-green-400 mb-2">{positiveTitle}</h4>
                        <ul className="space-y-2 list-none">
                            {positiveItems.map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <CheckCircleIcon className="w-5 h-5 mt-1 text-green-500 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                
                {negativeTitle && negativeItems.length > 0 && (
                    <div className="bg-amber-500/10 border-r-4 border-amber-500 p-4 rounded-r-lg">
                        <h4 className="font-bold text-amber-400 mb-2">{negativeTitle}</h4>
                        <ul className="space-y-2 list-none">
                            {negativeItems.map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <ExclamationTriangleIcon className="w-5 h-5 mt-1 text-amber-500 flex-shrink-0" />
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {planTitle && planItems.length > 0 && (
                     <div className="bg-cyan-500/10 border-r-4 border-cyan-500 p-4 rounded-r-lg">
                        <h4 className="font-bold text-cyan-400 mb-2">{planTitle}</h4>
                        <ul className="space-y-2 list-none">
                            {planItems.map((item, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="w-5 h-5 mt-1 bg-cyan-500 text-slate-900 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0">{i+1}</div>
                                    <span>{item}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        );
    };
    
    const header = result.match(/\[HEADER\](.*?)\[\/HEADER\]/)?.[1] || 'التحليل المالي';

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-800 rounded-xl p-2 w-full max-w-2xl border border-slate-700 shadow-xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b border-slate-700">
                    <div className="flex items-center gap-2">
                         <SparklesIcon className="w-6 h-6 text-cyan-400"/>
                         <h3 className="text-xl font-bold">{isLoading ? 'جاري التحليل...' : header}</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                </div>
                <div className="overflow-y-auto p-6">
                    {isLoading ? (
                         <div className="flex flex-col items-center justify-center gap-4 py-16 text-slate-400">
                            <div className="w-12 h-12 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
                            <p>لحظات... الذكاء الاصطناعي يحلل بياناتك المالية</p>
                         </div>
                    ) : parseAndRenderAnalysis(result)}
                </div>
            </div>
        </div>
    );
};


export default ReportsPage;