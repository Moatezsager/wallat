import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Debt, Transaction, Page, Category } from '../types';
import QuickActions from './QuickActions';
import { 
    WalletIcon, ArrowDownIcon, ArrowUpIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, DocumentTextIcon
} from './icons';
import type { Chart, ChartConfiguration } from 'chart.js/auto';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD' }).format(amount).replace('LYD', currency);
};

const monthLabels = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const CHART_COLORS = {
    expense: '#f87171', // red-400
    income: '#34d399',  // emerald-400
};

const YearlyChart: React.FC<{ data: { income: number, expense: number }[] }> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !(window as any).Chart) return;

        if (chartRef.current) {
            chartRef.current.destroy();
        }

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        const chartConfig: ChartConfiguration<'bar'> = {
            type: 'bar',
            data: {
                labels: monthLabels,
                datasets: [
                    {
                        label: 'الإيرادات',
                        data: data.map(d => d.income),
                        backgroundColor: 'rgba(52, 211, 153, 0.5)',
                        borderColor: 'rgba(52, 211, 153, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                    },
                    {
                        label: 'المصروفات',
                        data: data.map(d => d.expense),
                        backgroundColor: 'rgba(248, 113, 113, 0.5)',
                        borderColor: 'rgba(248, 113, 113, 1)',
                        borderWidth: 1,
                        borderRadius: 4,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            color: '#94a3b8', // slate-400
                            font: {
                                family: 'Cairo, sans-serif'
                            }
                        }
                    },
                    tooltip: {
                        rtl: true,
                        bodyFont: { family: 'Cairo' },
                        titleFont: { family: 'Cairo' },
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#94a3b8',
                            font: { family: 'Cairo, sans-serif' }
                        },
                        grid: { color: 'rgba(71, 85, 105, 0.5)' }
                    },
                    y: {
                         ticks: {
                            color: '#94a3b8',
                            font: { family: 'Cairo, sans-serif' }
                        },
                        grid: { color: 'rgba(71, 85, 105, 0.5)' }
                    }
                }
            }
        };

        chartRef.current = new (window as any).Chart(ctx, chartConfig);

        return () => {
            chartRef.current?.destroy();
        };
    }, [data]);

    return <div className="h-64"><canvas ref={canvasRef}></canvas></div>;
};

const DoughnutChart: React.FC<{ data: number[], labels: string[], colors: string[] }> = ({ data, labels, colors }) => {
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
                                    // Use the generic formatCurrency without a specific currency symbol
                                    label += new Intl.NumberFormat('ar-LY').format(context.parsed);
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

interface MonthlySummary {
    month: number;
    income: number;
    expense: number;
    expenseByCategory: { name: string; amount: number; color: string }[];
}


const HomePage: React.FC<{ 
    key: number, 
    handleDatabaseChange: () => void, 
    lastUpdated: Date | null,
    setActivePage: (page: Page) => void;
}> = ({ handleDatabaseChange, lastUpdated, setActivePage }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalBalance: 0, debtsForYou: 0, debtsOnYou: 0 });
    const [loadingStats, setLoadingStats] = useState(true);
    const [chartData, setChartData] = useState<{ income: number, expense: number }[]>([]);
    const [loadingChart, setLoadingChart] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [monthlySummaryData, setMonthlySummaryData] = useState<MonthlySummary[]>([]);


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setLoadingStats(true);
            setLoadingChart(true);
            
            const transactionsPromise = supabase.from('transactions')
                .select('*, accounts:accounts!account_id(name, currency), categories(name)')
                .order('date', { ascending: false })
                .limit(5);

            const accountsPromise = supabase.from('accounts').select('balance');
            const debtsPromise = supabase.from('debts').select('amount, type').eq('paid', false);

            const yearStart = new Date(selectedYear, 0, 1).toISOString();
            const yearEnd = new Date(selectedYear, 11, 31, 23, 59, 59, 999).toISOString();
            const yearlyTransactionsPromise = supabase.from('transactions')
                .select('date, type, amount, categories(name, color)')
                .gte('date', yearStart)
                .lte('date', yearEnd);

            const [
                { data: transactionsData, error: txError }, 
                { data: accountsData, error: accError }, 
                { data: debtsData, error: debtError },
                { data: yearlyTxData, error: yearlyTxError }
            ] = await Promise.all([transactionsPromise, accountsPromise, debtsPromise, yearlyTransactionsPromise]);

            if (txError) console.error("Error fetching transactions:", txError.message);
            else setTransactions(transactionsData as unknown as Transaction[]);

            if (accError || debtError) {
                console.error("Error fetching stats:", (accError || debtError)?.message);
            } else {
                const totalBalance = (accountsData as Account[]).reduce((sum, acc) => sum + acc.balance, 0);
                const debtsForYou = (debtsData as Debt[]).filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);
                const debtsOnYou = (debtsData as Debt[]).filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
                setStats({ totalBalance, debtsForYou, debtsOnYou });
            }

            if (yearlyTxError) {
                console.error("Error fetching yearly transactions:", yearlyTxError.message);
            } else {
                 const monthsChart = Array(12).fill(0).map(() => ({ income: 0, expense: 0 }));
                 const monthlySummaries: MonthlySummary[] = Array(12).fill(null).map((_, i) => ({
                    month: i, income: 0, expense: 0, expenseByCategory: []
                }));
                const expenseCategoryMap: { [month: number]: { [categoryName: string]: { amount: number; color: string } } } = {};


                if (yearlyTxData) {
                     (yearlyTxData as (Transaction & { categories: { name: string; color: string | null } | null })[]).forEach(tx => {
                        const month = new Date(tx.date).getMonth();
                        if (tx.type === 'income') {
                            monthsChart[month].income += tx.amount;
                            monthlySummaries[month].income += tx.amount;
                        } else if (tx.type === 'expense') {
                            monthsChart[month].expense += tx.amount;
                            monthlySummaries[month].expense += tx.amount;
                            
                            if (!expenseCategoryMap[month]) {
                                expenseCategoryMap[month] = {};
                            }
                            const categoryName = tx.categories?.name || 'غير مصنف';
                            const categoryColor = tx.categories?.color || '#78716c';

                            if (!expenseCategoryMap[month][categoryName]) {
                                expenseCategoryMap[month][categoryName] = { amount: 0, color: categoryColor };
                            }
                            expenseCategoryMap[month][categoryName].amount += tx.amount;
                        }
                    });
                }
                
                for (let i = 0; i < 12; i++) {
                    if (expenseCategoryMap[i]) {
                        monthlySummaries[i].expenseByCategory = Object.entries(expenseCategoryMap[i])
                            .map(([name, { amount, color }]) => ({ name, amount, color }))
                            .sort((a, b) => b.amount - a.amount);
                    }
                }

                setChartData(monthsChart);
                setMonthlySummaryData(monthlySummaries);
            }
            
            setLoading(false);
            setLoadingStats(false);
            setLoadingChart(false);
        };
        fetchData();
    }, [selectedYear]);
    
    const formatLastUpdated = (date: Date | null): string => {
        if (!date) return 'جاري التحديث...';

        const today = new Date();
        const isToday = date.getDate() === today.getDate() &&
                        date.getMonth() === today.getMonth() &&
                        date.getFullYear() === today.getFullYear();
        
        const dayString = isToday ? 'اليوم' : date.toLocaleDateString('ar-LY');
        const timeString = date.toLocaleTimeString('ar-LY', { hour: 'numeric', minute: '2-digit', hour12: true });

        return `${dayString}، ${timeString}`;
    };

    return (
        <div className="space-y-6">
            {/* Overview Section */}
            <div className="bg-slate-800 p-4 rounded-xl shadow-lg">
                <h3 className="font-bold text-lg mb-4">نظرة عامة</h3>
                {loadingStats ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-28 bg-slate-700 rounded-2xl"></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-24 bg-slate-700 rounded-xl"></div>
                            <div className="h-24 bg-slate-700 rounded-xl"></div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <button onClick={() => setActivePage('accounts')} className="bg-gradient-to-br from-cyan-500 to-blue-600 p-5 rounded-2xl shadow-lg w-full text-right transition-transform hover:scale-105 active:scale-95">
                            <div className="flex items-center gap-3 text-white/90">
                                <WalletIcon className="w-7 h-7" />
                                <span className="text-lg font-semibold">إجمالي الأرصدة</span>
                            </div>
                            <p className="text-4xl font-extrabold mt-2 text-white tracking-tight">{formatCurrency(stats.totalBalance)}</p>
                        </button>
                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => setActivePage('debts')} className="bg-slate-700 p-4 rounded-xl shadow text-right w-full transition-transform hover:scale-105 active:scale-95">
                                <div className="flex items-center gap-2 text-green-400">
                                    <ArrowDownIcon className="w-5 h-5" />
                                    <span className="text-sm font-semibold">ديون لك</span>
                                </div>
                                <p className="text-2xl font-bold mt-1 text-green-400">{formatCurrency(stats.debtsForYou)}</p>
                            </button>
                            <button onClick={() => setActivePage('debts')} className="bg-slate-700 p-4 rounded-xl shadow text-right w-full transition-transform hover:scale-105 active:scale-95">
                                <div className="flex items-center gap-2 text-red-400">
                                    <ArrowUpIcon className="w-5 h-5" />
                                    <span className="text-sm font-semibold">ديون عليك</span>
                                </div>
                                <p className="text-2xl font-bold mt-1 text-red-400">{formatCurrency(stats.debtsOnYou)}</p>
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-4">
                    <ClockIcon className="w-4 h-4" />
                    <span>آخر تحديث: {formatLastUpdated(lastUpdated)}</span>
                </div>
            </div>

             {/* Yearly Overview Section */}
            <div className="bg-slate-800 p-4 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <h3 className="font-bold text-lg">نظرة عامة سنوية</h3>
                        <button onClick={() => setIsSummaryModalOpen(true)} className="flex items-center gap-1 text-xs bg-slate-700 hover:bg-slate-600 text-cyan-400 font-semibold py-1 px-3 rounded-md transition-colors">
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>الموجز</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setSelectedYear(y => y - 1)} className="p-1.5 rounded-full bg-slate-700 hover:bg-slate-600 transition-colors">
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                        <span className="font-bold text-lg w-16 text-center">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(y => y + 1)} disabled={selectedYear >= new Date().getFullYear()} className="p-1.5 rounded-full bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                {loadingChart ? (
                    <div className="h-64 bg-slate-700 rounded-md animate-pulse"></div>
                ) : (
                    <YearlyChart data={chartData} />
                )}
            </div>


            {/* Recent Transactions Section */}
            <div className="bg-slate-800 p-4 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-lg">آخر المعاملات</h3>
                    <button onClick={() => setActivePage('transactions')} className="text-sm text-cyan-400 hover:text-cyan-300">
                        عرض الكل
                    </button>
                </div>
                {loading ? (
                     <div className="space-y-3 animate-pulse">
                        <div className="h-12 bg-slate-700 rounded-md"></div>
                        <div className="h-12 bg-slate-700 rounded-md"></div>
                        <div className="h-12 bg-slate-700 rounded-md"></div>
                    </div>
                ) : transactions.length > 0 ? (
                    <div className="space-y-3">
                        {transactions.map(tx => (
                            <div key={tx.id} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg">
                                <div className="flex items-center gap-3">
                                     <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/20 text-green-400' : tx.type === 'expense' ? 'bg-red-500/20 text-red-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                                        {tx.type === 'income' ? <ArrowDownIcon className="w-5 h-5"/> : tx.type === 'expense' ? <ArrowUpIcon className="w-5 h-5"/> : <ArrowUpIcon className="w-5 h-5"/>}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-white">{tx.notes || tx.categories?.name || (tx.type === 'income' ? 'إيراد' : 'مصروف')}</p>
                                        <p className="text-xs text-slate-400">{new Date(tx.date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long' })}</p>
                                    </div>
                                </div>
                                <p className={`font-bold text-lg ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, tx.accounts?.currency || 'د.ل')}
                                </p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center text-slate-400 py-4">لا توجد معاملات لعرضها.</p>
                )}
            </div>
            
            <QuickActions onActionSuccess={handleDatabaseChange} />
            
            {isSummaryModalOpen && (
                <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-4xl border border-slate-700 shadow-2xl flex flex-col h-[90vh]">
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <h3 className="text-2xl font-bold text-white">الموجز الشهري لسنة {selectedYear}</h3>
                            <button onClick={() => setIsSummaryModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-7 h-7" /></button>
                        </div>
                        <div className="overflow-y-auto pr-2 -mr-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                {monthlySummaryData.map(monthData => {
                                    const hasData = monthData.income > 0 || monthData.expense > 0;
                                    return (
                                    <div key={monthData.month} className="bg-slate-800 p-4 rounded-xl">
                                        <h4 className="font-bold text-lg mb-4 text-cyan-400">{monthLabels[monthData.month]}</h4>
                                        {hasData ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-24 h-24 flex-shrink-0">
                                                        <DoughnutChart 
                                                            data={[monthData.expense, monthData.income]} 
                                                            labels={['المصروفات', 'الإيرادات']}
                                                            colors={[CHART_COLORS.expense, CHART_COLORS.income]}
                                                        />
                                                    </div>
                                                    <div className="flex-grow space-y-2">
                                                        <div className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: CHART_COLORS.income}}></span>
                                                                <span>الإيرادات</span>
                                                            </div>
                                                            <span className="font-bold text-green-400">{formatCurrency(monthData.income)}</span>
                                                        </div>
                                                        <div className="flex justify-between items-center text-sm">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: CHART_COLORS.expense}}></span>
                                                                <span>المصروفات</span>
                                                            </div>
                                                            <span className="font-bold text-red-400">{formatCurrency(monthData.expense)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {monthData.expense > 0 && monthData.expenseByCategory.length > 0 && (
                                                    <div>
                                                        <h5 className="text-sm font-semibold mb-2 text-slate-300 border-t border-slate-700 pt-3">أبرز المصروفات</h5>
                                                        <div className="space-y-2 text-xs">
                                                            {monthData.expenseByCategory.slice(0, 4).map(category => (
                                                                <div key={category.name} className="flex items-center justify-between">
                                                                    <div className="flex items-center gap-2 truncate">
                                                                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: category.color }}></span>
                                                                        <span className="text-slate-400 truncate">{category.name}</span>
                                                                    </div>
                                                                    <div className="font-semibold text-right flex-shrink-0 pl-1">
                                                                        <span>{formatCurrency(category.amount)}</span>
                                                                        <span className="text-slate-500 mr-1">({(category.amount / monthData.expense * 100).toFixed(0)}%)</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center h-24 text-slate-500">
                                                <p>لا توجد بيانات لهذا الشهر.</p>
                                            </div>
                                        )}
                                    </div>
                                 )})}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default HomePage;