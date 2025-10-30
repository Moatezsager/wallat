import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt } from '../types';
import type { Chart, ChartConfiguration } from 'chart.js/auto';

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
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<Period>('this_month');
    const [activeTab, setActiveTab] = useState<ActiveTab>('expense');


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const txPromise = supabase.from('transactions').select('*, categories(name, color)');
            const debtPromise = supabase.from('debts').select('*');

            const [{ data: txData }, { data: debtData }] = await Promise.all([txPromise, debtPromise]);
            
            setTransactions(txData as any[] || []);
            setDebts(debtData || []);
            setLoading(false);
        };
        fetchData();
    }, [key]);

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

        </div>
    );
};

export default ReportsPage;
