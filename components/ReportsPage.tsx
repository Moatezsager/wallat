import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Transaction, Debt } from '../types';
import type { Chart, ChartConfiguration } from 'chart.js/auto';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD' }).format(amount).replace('LYD', 'د.ل');
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

        // Fix: In Chart.js, the 'cutout' property for a doughnut chart should be specified within the chart options.
        // By specifying the chart type in ChartConfiguration<'doughnut'>, TypeScript correctly infers the available options.
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
                        bodyFont: { family: 'Tajawal' },
                        titleFont: { family: 'Tajawal' },
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


const ReportsPage: React.FC<{ key: number }> = ({ key }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'expense' | 'income' | 'debt'>('expense');

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
        const expenseByCategory: { [key: string]: number } = {};
        const incomeByCategory: { [key: string]: number } = {};
        let totalExpenses = 0;
        let totalIncome = 0;

        transactions.forEach(tx => {
            const categoryName = tx.categories?.name || 'غير مصنف';
            if (tx.type === 'expense') {
                expenseByCategory[categoryName] = (expenseByCategory[categoryName] || 0) + tx.amount;
                totalExpenses += tx.amount;
            } else if (tx.type === 'income') {
                incomeByCategory[categoryName] = (incomeByCategory[categoryName] || 0) + tx.amount;
                totalIncome += tx.amount;
            }
        });

        const debtsOnYou = debts.filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
        const debtsForYou = debts.filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);

        return {
            expenses: {
                labels: Object.keys(expenseByCategory),
                data: Object.values(expenseByCategory),
                summary: Object.entries(expenseByCategory).sort(([, a], [, b]) => b - a),
                total: totalExpenses
            },
            income: {
                labels: Object.keys(incomeByCategory),
                data: Object.values(incomeByCategory),
                summary: Object.entries(incomeByCategory).sort(([, a], [, b]) => b - a),
                total: totalIncome
            },
            debts: {
                labels: ['ديون عليك', 'ديون لك'],
                data: [debtsOnYou, debtsForYou],
                totalOnYou: debtsOnYou,
                totalForYou: debtsForYou
            }
        };
    }, [transactions, debts]);
    
    const renderContent = () => {
        if (loading) return <div className="text-center p-8">جاري تحميل التقارير...</div>;

        switch (activeTab) {
            case 'expense':
                if (reportData.expenses.data.length === 0) return <p className="text-center p-8 text-slate-400">لا توجد بيانات للمصروفات.</p>;
                return <ReportSection data={reportData.expenses.data} labels={reportData.expenses.labels} summary={reportData.expenses.summary} total={reportData.expenses.total} color="text-red-400" />;
            case 'income':
                if (reportData.income.data.length === 0) return <p className="text-center p-8 text-slate-400">لا توجد بيانات للإيرادات.</p>;
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
            <div className="flex border-b border-slate-700 mb-4">
                <button onClick={() => setActiveTab('expense')} className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'expense' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>المصروفات</button>
                <button onClick={() => setActiveTab('income')} className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'income' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>الإيرادات</button>
                <button onClick={() => setActiveTab('debt')} className={`w-1/3 py-3 text-center font-semibold transition-colors ${activeTab === 'debt' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}>الديون</button>
            </div>
            {renderContent()}
        </div>
    );
};

export default ReportsPage;