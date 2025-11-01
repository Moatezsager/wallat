import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt, Category } from '../types';
import type { Chart, ChartConfiguration } from 'chart.js/auto';
import { GoogleGenAI } from '@google/genai';
import { SparklesIcon, ExclamationTriangleIcon, CheckCircleIcon, XMarkIcon } from './icons';


type Period = 'this_month' | 'last_month' | 'this_year';
type ActiveTab = 'expense' | 'income' | 'debt';

// FIX: Removed conflicting global declaration for window.aistudio.
// The type is likely already defined in the global scope.


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
            // Check for API key before proceeding
            const hasApiKey = await window.aistudio.hasSelectedApiKey();
            if (!hasApiKey) {
                await window.aistudio.openSelectKey();
                // After the user selects a key, we can assume it's available.
                // Re-checking isn't strictly necessary per guidelines, but we proceed.
            }
    
            // Initialize the GenAI client just-in-time
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

            const incomeByCategory: { [key: string]: number } = {};
            currentTxs.filter(tx => tx.type === 'income').forEach(tx => {
                const categoryName = (tx as any).categories?.name || 'غير مصنف';
                incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + tx.amount;
            });
            const incomeString = Object.entries(incomeByCategory).map(([name, amount]) => `- ${name}: ${formatCurrency(amount)}`).join('\n');

            const allExpenseCategories = categories.filter(c => c.type === 'expense').map(c => c.name).join('، ');
            const allIncomeCategories = categories.filter(c => c.type === 'income').map(c => c.name).join('، ');
    
            const debtsForYou = debts.filter(d => d.type === 'for_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
            const debtsOnYou = debts.filter(d => d.type === 'on_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
    
            const prompt = `
            أنت مستشار مالي شخصي خبير. مهمتك هي تحليل البيانات المالية للمستخدم باللغة العربية وتقديم رؤى عميقة ونصائح عملية لتحسين وضعه المالي.

            **البيانات المالية للشهر الحالي:**
            - إجمالي الدخل: ${formatCurrency(totalIncome)}
            - إجمالي المصروفات: ${formatCurrency(totalExpense)}
            - صافي التوفير (الدخل - المصروفات): ${formatCurrency(totalIncome - totalExpense)}
            - ديون لك (مستحقة): ${formatCurrency(debtsForYou)}
            - ديون عليك (مستحقة): ${formatCurrency(debtsOnYou)}

            **تفاصيل الدخل حسب الفئة:**
            ${incomeString || 'لا يوجد دخل مسجل هذا الشهر.'}

            **تفاصيل المصروفات حسب الفئة:**
            ${expensesString || 'لا يوجد مصروفات هذا الشهر.'}

            **معلومات إضافية عن الفئات المتاحة للمستخدم:**
            - كل فئات الدخل المتاحة: ${allIncomeCategories || 'لا يوجد'}
            - كل فئات المصروفات المتاحة: ${allExpenseCategories || 'لا يوجد'}

            **التعليمات:**
            1.  ابدأ بنظرة عامة سريعة على الوضع المالي للشهر.
            2.  حلل المصروفات بعمق:
                - ميّز بين المصاريف **الأساسية** (مثل: إيجار, فواتير, مواصلات) والمصاريف **الكمالية** (مثل: مطاعم, ترفيه, تسوق). استخدم قائمة الفئات المتاحة كدليل.
                - حدد أكبر 3 فئات إنفاق وعلق عليها. هل هي ضرورية؟ هل يمكن تقليلها؟
            3.  قدم ملاحظات إيجابية بناءً على البيانات (مثال: توفير جيد, سيطرة على مصاريف الترفيه).
            4.  قدم ملاحظات تحتاج إلى انتباه، مع التركيز على الإنفاق الزائد في الفئات الكمالية.
            5.  اختتم بخطة عمل من 2-3 خطوات واضحة وقابلة للتنفيذ للشهر القادم.

            **تنسيق الإخراج (مهم جداً):**
            استخدم التنسيق التالي بالضبط. لا تضف أي نص خارج هذه العلامات.

            [HEADER]عنوان جذاب ومختصر للتحليل[/HEADER]
            [OVERVIEW]فقرة موجزة تلخص الوضع المالي للشهر، بما في ذلك نسبة المصروفات إلى الدخل.[/OVERVIEW]
            [POSITIVE]عنوان للقسم الإيجابي (مثال: نقاط القوة هذا الشهر)[/POSITIVE]
            [ITEM]نقطة إيجابية أولى واضحة ومبنية على البيانات.[/ITEM]
            [ITEM]نقطة إيجابية ثانية (إن وجدت).[/ITEM]
            [NEGATIVE]عنوان لقسم التحسين (مثال: فرص للتحسين)[/NEGATIVE]
            [ITEM]أول ملاحظة للتحسين، مع الإشارة لنوع المصروف (أساسي/كمالي) وتحليل أكبر فئات الإنفاق.[/ITEM]
            [ITEM]ملاحظة ثانية للتحسين (إن وجدت).[/ITEM]
            [PLAN]عنوان للخطة المقترحة (مثال: خطتك للشهر القادم)[/PLAN]
            [ITEM]خطوة عملية أولى يمكن للمستخدم اتخاذها.[/ITEM]
            [ITEM]خطوة عملية ثانية.[/ITEM]
            `;
    
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
            });
    
            setAiAnalysisResult(response.text);
    
        } catch (error: any) {
            console.error('Error generating AI analysis:', error);
            const errorMessage = `
            [HEADER]حدث خطأ[/HEADER]
            [OVERVIEW]عذراً، لم نتمكن من إنشاء التحليل. قد يكون السبب عدم اختيار مفتاح API صالح أو مشكلة في الشبكة.[/OVERVIEW]
            [NEGATIVE]تفاصيل الخطأ[/NEGATIVE]
            [ITEM]${error.message}[/ITEM]
            `;
            setAiAnalysisResult(errorMessage);
        } finally {
            setIsAiLoading(false);
        }
    };

    const parsedAnalysis = useMemo(() => {
        if (!aiAnalysisResult) return null;
        const result: { [key: string]: any } = { positive_items: [], negative_items: [], plan_items: [] };
        
        const headerMatch = aiAnalysisResult.match(/\[HEADER\](.*?)\[\/HEADER\]/s);
        result.header = headerMatch ? headerMatch[1].trim() : "التحليل المالي";

        const overviewMatch = aiAnalysisResult.match(/\[OVERVIEW\](.*?)\[\/OVERVIEW\]/s);
        result.overview = overviewMatch ? overviewMatch[1].trim() : "إليك نظرة عامة على وضعك المالي.";
        
        const positiveTitleMatch = aiAnalysisResult.match(/\[POSITIVE\](.*?)\[\/POSITIVE\]/s);
        result.positive_title = positiveTitleMatch ? positiveTitleMatch[1].trim() : "نقاط إيجابية";

        const negativeTitleMatch = aiAnalysisResult.match(/\[NEGATIVE\](.*?)\[\/NEGATIVE\]/s);
        result.negative_title = negativeTitleMatch ? negativeTitleMatch[1].trim() : "نقاط تحتاج انتباه";
        
        const planTitleMatch = aiAnalysisResult.match(/\[PLAN\](.*?)\[\/PLAN\]/s);
        result.plan_title = planTitleMatch ? planTitleMatch[1].trim() : "الخطة المقترحة";

        const itemRegex = /\[ITEM\](.*?)\[\/ITEM\]/gs;
        
        const positiveSection = aiAnalysisResult.split('[POSITIVE]')[1]?.split('[NEGATIVE]')[0] || '';
        let match;
        while((match = itemRegex.exec(positiveSection)) !== null) {
            result.positive_items.push(match[1].trim());
        }

        const negativeSection = aiAnalysisResult.split('[NEGATIVE]')[1]?.split('[PLAN]')[0] || '';
        itemRegex.lastIndex = 0; // Reset regex index
        while((match = itemRegex.exec(negativeSection)) !== null) {
            result.negative_items.push(match[1].trim());
        }
        
        const planSection = aiAnalysisResult.split('[PLAN]')[1] || '';
        itemRegex.lastIndex = 0; // Reset regex index
        while((match = itemRegex.exec(planSection)) !== null) {
            result.plan_items.push(match[1].trim());
        }

        return result;
    }, [aiAnalysisResult]);


    const { expenseData, incomeData, debtData } = useMemo(() => {
        const { startDate, endDate } = getDatesForPeriod(period);
        const filteredTxs = transactions.filter(tx => {
            const txDate = new Date(tx.date);
            return txDate >= startDate && txDate <= endDate;
        });

        const processData = (type: 'expense' | 'income') => {
            const relevantTxs = filteredTxs.filter(tx => tx.type === type);
            const total = relevantTxs.reduce((sum, tx) => sum + tx.amount, 0);
            const byCategory: { [key: string]: number } = {};
            relevantTxs.forEach(tx => {
                const catName = (tx as any).categories?.name || 'غير مصنف';
                byCategory[catName] = (byCategory[catName] || 0) + tx.amount;
            });
            return {
                total,
                data: Object.entries(byCategory)
                    .map(([name, amount]) => {
                        const category = categories.find(c => c.name === name && c.type === type);
                        return { name, amount, color: category?.color || '#71717a', percentage: total > 0 ? (amount / total) * 100 : 0 };
                    })
                    .sort((a, b) => b.amount - a.amount)
            };
        };

        const expenseData = processData('expense');
        const incomeData = processData('income');

        const forYou = debts.filter(d => d.type === 'for_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
        const onYou = debts.filter(d => d.type === 'on_you' && !d.paid).reduce((sum, d) => sum + d.amount, 0);
        const debtData = { forYou, onYou, net: forYou - onYou };

        return { expenseData, incomeData, debtData };

    }, [period, transactions, debts, categories]);


    return (
        <div className="space-y-6">
            <div className="flex bg-slate-800 rounded-lg p-1 text-sm shadow-md">
                {(['this_month', 'last_month', 'this_year'] as Period[]).map(p => (
                    <button
                        key={p}
                        onClick={() => setPeriod(p)}
                        className={`w-full py-2 px-1 rounded-md transition-colors font-semibold ${period === p ? 'bg-slate-700 text-cyan-400' : 'text-slate-300 hover:bg-slate-700/50'}`}
                    >
                        { { this_month: 'هذا الشهر', last_month: 'الشهر الماضي', this_year: 'هذه السنة' }[p] }
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-sm text-green-400">إجمالي الإيرادات</p>
                    <h3 className="text-2xl font-extrabold text-white">
                        {formatCurrency(incomeData.total)}
                    </h3>
                </div>
                 <div className="bg-slate-800 p-3 rounded-xl text-center">
                    <p className="text-sm text-red-400">إجمالي المصروفات</p>
                    <h3 className="text-2xl font-extrabold text-white">
                        {formatCurrency(expenseData.total)}
                    </h3>
                </div>
            </div>
            
            <button 
                onClick={handleGenerateAnalysis}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-opacity"
                disabled={isAiLoading}
            >
                <SparklesIcon className="w-6 h-6"/>
                <span>تحليل بالذكاء الاصطناعي (بيانات هذا الشهر)</span>
            </button>


            <div className="flex border-b border-slate-700">
                <button onClick={() => setActiveTab('expense')} className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'expense' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>المصروفات</button>
                <button onClick={() => setActiveTab('income')} className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'income' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>الإيرادات</button>
                <button onClick={() => setActiveTab('debt')} className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'debt' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>الديون</button>
            </div>
            
             {loading ? <p className="text-center py-8">جاري تحميل التقارير...</p> : (
                <div>
                    {activeTab === 'expense' && <ReportView title="المصروفات حسب الفئة" data={expenseData.data} total={expenseData.total} />}
                    {activeTab === 'income' && <ReportView title="الإيرادات حسب الفئة" data={incomeData.data} total={incomeData.total} />}
                    {activeTab === 'debt' && <DebtReportView data={debtData} />}
                </div>
            )}

            {isAiModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-800 rounded-xl p-2 w-full max-w-2xl border border-slate-700 shadow-xl">
                         <div className="flex justify-between items-center p-4">
                             <h3 className="text-xl font-bold flex items-center gap-2 text-cyan-400"><SparklesIcon className="w-6 h-6"/> التحليل المالي الذكي</h3>
                             <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                         </div>
                         <div className="max-h-[70vh] overflow-y-auto p-4">
                            {isAiLoading ? (
                                <div className="text-center py-12">
                                    <div className="w-10 h-10 border-4 border-slate-600 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-slate-300">جاري تحليل بياناتك المالية...</p>
                                    <p className="text-sm text-slate-500">قد يستغرق هذا بضع ثوانٍ.</p>
                                </div>
                            ) : parsedAnalysis ? (
                                <div className="space-y-6">
                                    <div className="text-center border-b border-slate-700 pb-4">
                                        <h2 className="text-2xl font-extrabold text-white">{parsedAnalysis.header}</h2>
                                        <p className="text-slate-300 mt-2">{parsedAnalysis.overview}</p>
                                    </div>
                                    
                                    {parsedAnalysis.positive_items.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-green-400"><CheckCircleIcon className="w-5 h-5"/> {parsedAnalysis.positive_title}</h4>
                                            <ul className="space-y-2 list-inside">
                                                {parsedAnalysis.positive_items.map((item: string, i: number) => <li key={i} className="bg-green-500/10 p-3 rounded-lg text-green-300">{item}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {parsedAnalysis.negative_items.length > 0 && (
                                        <div>
                                            <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-amber-400"><ExclamationTriangleIcon className="w-5 h-5"/> {parsedAnalysis.negative_title}</h4>
                                             <ul className="space-y-2 list-inside">
                                                {parsedAnalysis.negative_items.map((item: string, i: number) => <li key={i} className="bg-amber-500/10 p-3 rounded-lg text-amber-300">{item}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                    {parsedAnalysis.plan_items.length > 0 && (
                                         <div>
                                            <h4 className="font-bold text-lg mb-3 flex items-center gap-2 text-cyan-400"><SparklesIcon className="w-5 h-5"/> {parsedAnalysis.plan_title}</h4>
                                             <ul className="space-y-2 list-inside">
                                                 {parsedAnalysis.plan_items.map((item: string, i: number) => <li key={i} className="bg-cyan-500/10 p-3 rounded-lg text-cyan-300">{item}</li>)}
                                            </ul>
                                        </div>
                                    )}

                                </div>
                            ) : (
                                <p className="text-center py-12 text-slate-400">لم يتمكن الذكاء الاصطناعي من إنشاء تحليل.</p>
                            )}
                         </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default ReportsPage;