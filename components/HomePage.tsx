
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Debt, Transaction, Page, Category } from '../types';
import QuickActions from './QuickActions';
import TransactionForm from './TransactionForm';
import { 
    ArrowDownIcon, ArrowUpIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon,
    PencilSquareIcon, TrashIcon, ArrowTrendingUp, iconMap, ExclamationTriangleIcon, CalendarDaysIcon, CheckCircleIcon, ChartBarSquareIcon, SparklesIcon
} from './icons';
import type { Chart, ChartConfiguration } from 'chart.js/auto';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    const options: Intl.NumberFormatOptions = { style: 'currency', currency: 'LYD' };
    if (amount % 1 === 0) { options.minimumFractionDigits = 0; options.maximumFractionDigits = 0; } 
    else { options.minimumFractionDigits = 2; options.maximumFractionDigits = 2; }
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', currency);
};

const numericMonthLabels = Array.from({ length: 12 }, (_, i) => String(i + 1));
const monthNames = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];

const getDaysRemaining = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

const YearlyChart: React.FC<{ data: { income: number, expense: number }[] }> = ({ data }) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const chartRef = useRef<Chart | null>(null);

    useEffect(() => {
        if (!canvasRef.current || !(window as any).Chart) return;
        if (chartRef.current) chartRef.current.destroy();

        const ctx = canvasRef.current.getContext('2d');
        if (!ctx) return;

        // Create gradients
        const gradientIncome = ctx.createLinearGradient(0, 0, 0, 300);
        gradientIncome.addColorStop(0, 'rgba(16, 185, 129, 0.5)'); // Emerald
        gradientIncome.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

        const gradientExpense = ctx.createLinearGradient(0, 0, 0, 300);
        gradientExpense.addColorStop(0, 'rgba(244, 63, 94, 0.5)'); // Rose
        gradientExpense.addColorStop(1, 'rgba(244, 63, 94, 0.0)');

        const chartConfig: ChartConfiguration<'bar'> = {
            type: 'bar',
            data: {
                labels: numericMonthLabels,
                datasets: [
                    {
                        label: 'الإيرادات',
                        data: data.map(d => d.income),
                        backgroundColor: '#10b981',
                        hoverBackgroundColor: '#34d399',
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    },
                    {
                        label: 'المصروفات',
                        data: data.map(d => d.expense),
                        backgroundColor: '#f43f5e', 
                        hoverBackgroundColor: '#fb7185',
                        borderRadius: 4,
                        barPercentage: 0.6,
                        categoryPercentage: 0.7
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { backgroundColor: 'rgba(15, 23, 42, 0.9)', padding: 12, cornerRadius: 12, bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo' }, displayColors: true } },
                scales: {
                    x: { ticks: { color: '#64748b', font: { family: 'Cairo' } }, grid: { display: false } },
                    y: { ticks: { color: '#64748b', font: { family: 'Cairo' } }, grid: { color: 'rgba(255, 255, 255, 0.03)', tickLength: 0 } } 
                }
            }
        };

        chartRef.current = new (window as any).Chart(ctx, chartConfig);
        return () => { chartRef.current?.destroy(); };
    }, [data]);

    return <div className="h-56 w-full"><canvas ref={canvasRef}></canvas></div>;
};

const DoughnutChart: React.FC<{ income: number, expense: number }> = ({ income, expense }) => {
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
                labels: ['الإيرادات', 'المصروفات'],
                datasets: [{
                    data: [income, expense],
                    backgroundColor: ['#10b981', '#f43f5e'],
                    borderColor: 'rgba(15, 23, 42, 1)', 
                    borderWidth: 0,
                    hoverOffset: 10,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '80%',
                plugins: { legend: { display: false } }
            }
        };
        chartRef.current = new (window as any).Chart(ctx, chartConfig);
        return () => chartRef.current?.destroy();
    }, [income, expense]);

    return <div className="h-full w-full"><canvas ref={canvasRef}></canvas></div>;
};


const MonthlySummaryModal: React.FC<{ 
    isOpen: boolean; 
    onClose: () => void; 
    year: number; 
    setActivePage: (page: Page) => void; 
}> = ({ isOpen, onClose, year, setActivePage }) => {
    const [month, setMonth] = useState(new Date().getMonth());
    const [stats, setStats] = useState({ income: 0, expense: 0, topCategories: [] as any[] });
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async () => {
            setLoading(true);
            const startDate = new Date(year, month, 1);
            const endDate = new Date(year, month + 1, 0, 23, 59, 59);

            const { data, error } = await supabase
                .from('transactions')
                .select('amount, type, categories(name, color, icon)')
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString());

            if (error) {
                console.error(error);
                setLoading(false);
                return;
            }

            let inc = 0, exp = 0;
            const categoryMap = new Map<string, any>();

            data.forEach((tx: any) => {
                if (tx.type === 'income') inc += tx.amount;
                else if (tx.type === 'expense') exp += tx.amount;

                // Group for top list
                if (tx.type === activeTab) {
                    const catName = tx.categories?.name || 'غير مصنف';
                    const current = categoryMap.get(catName) || { 
                        name: catName, 
                        amount: 0, 
                        color: tx.categories?.color || '#64748b',
                        icon: tx.categories?.icon
                    };
                    current.amount += tx.amount;
                    categoryMap.set(catName, current);
                }
            });

            const topCats = Array.from(categoryMap.values())
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 4);

            setStats({ income: inc, expense: exp, topCategories: topCats });
            setLoading(false);
        };

        fetchData();
    }, [isOpen, month, year, activeTab]);

    if (!isOpen) return null;

    const net = stats.income - stats.expense;
    const totalForTab = activeTab === 'expense' ? stats.expense : stats.income;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
            <div className="glass-card bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl animate-slide-up border border-white/10 flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex justify-between items-center shrink-0">
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <ChartBarSquareIcon className="w-6 h-6 text-cyan-400" />
                        الموجز الشهري {year}
                    </h3>
                    <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors">
                        <XMarkIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto custom-scrollbar flex-grow p-6 space-y-6">
                    
                    {/* Month Selector */}
                    <div className="flex overflow-x-auto gap-2 pb-2 custom-scrollbar snap-x">
                        {monthNames.map((m, i) => (
                            <button 
                                key={i} 
                                onClick={() => setMonth(i)} 
                                className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all snap-center ${
                                    month === i 
                                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20' 
                                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white'
                                }`}
                            >
                                {m}
                            </button>
                        ))}
                    </div>

                    {loading ? (
                        <div className="py-12 flex justify-center"><div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div></div>
                    ) : (
                        <>
                            {/* Chart */}
                            <div className="h-64 w-64 mx-auto relative">
                                {stats.income === 0 && stats.expense === 0 ? (
                                    <div className="absolute inset-0 flex items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-full">لا توجد بيانات</div>
                                ) : (
                                    <>
                                        <DoughnutChart income={stats.income} expense={stats.expense} />
                                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                            <span className="text-xs text-slate-400 font-medium">الصافي</span>
                                            <span className={`text-xl font-bold ${net >= 0 ? 'text-cyan-400' : 'text-rose-400'}`}>{formatCurrency(net)}</span>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-800/50 p-3 rounded-2xl text-center border border-white/5">
                                    <p className="text-xs text-emerald-400 mb-1">الإيرادات</p>
                                    <p className="font-bold text-white">{formatCurrency(stats.income)}</p>
                                </div>
                                <div className="bg-slate-800/50 p-3 rounded-2xl text-center border border-white/5">
                                    <p className="text-xs text-rose-400 mb-1">المصروفات</p>
                                    <p className="font-bold text-white">{formatCurrency(stats.expense)}</p>
                                </div>
                            </div>

                            {/* Top Categories */}
                            <div>
                                <div className="flex bg-slate-800 p-1 rounded-xl mb-4">
                                    <button onClick={() => setActiveTab('expense')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'expense' ? 'bg-rose-500/20 text-rose-400' : 'text-slate-400'}`}>أبرز المصروفات</button>
                                    <button onClick={() => setActiveTab('income')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'income' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400'}`}>أبرز الإيرادات</button>
                                </div>

                                <div className="space-y-4">
                                    {stats.topCategories.length > 0 ? stats.topCategories.map((cat, idx) => {
                                         const percentage = totalForTab > 0 ? (cat.amount / totalForTab) * 100 : 0;
                                         const Icon = cat.icon && iconMap[cat.icon] ? iconMap[cat.icon] : null;
                                         
                                         return (
                                            <div key={idx}>
                                                <div className="flex justify-between items-center text-sm mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color }}>
                                                            {Icon && <Icon className="w-4 h-4 text-white" />}
                                                        </div>
                                                        <span className="font-bold text-white">{cat.name}</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="font-bold block">{formatCurrency(cat.amount)}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: cat.color }}></div>
                                                </div>
                                            </div>
                                         )
                                    }) : <p className="text-center text-slate-500 text-sm py-4">لا توجد بيانات لهذا التصنيف.</p>}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 shrink-0">
                    <button onClick={() => { onClose(); setActivePage('reports'); }} className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl font-bold transition flex items-center justify-center gap-2 group">
                        عرض المزيد من التفاصيل
                        <ChevronLeftIcon className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>

            </div>
        </div>
    );
};


const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
        <div className="glass-card bg-slate-900 rounded-3xl p-6 w-full max-w-md shadow-2xl animate-slide-up border border-white/10">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            {children}
        </div>
    </div>
);

const TransactionDetailContent: React.FC<{ transaction: Transaction; onEdit: () => void; onDelete: () => void; }> = ({ transaction, onEdit, onDelete }) => {
    const details = [
        { label: 'المبلغ', value: formatCurrency(transaction.amount, transaction.accounts?.currency), color: transaction.type === 'income' ? 'text-emerald-400' : 'text-rose-400' },
        { label: 'النوع', value: transaction.type === 'income' ? 'إيراد' : 'مصروف' },
        { label: 'الحساب', value: transaction.accounts?.name || 'N/A' },
        { label: 'الفئة', value: transaction.categories?.name || 'غير مصنف' },
        { label: 'التاريخ', value: new Date(transaction.date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' }) },
    ];

    return (
        <div className="space-y-6">
            <div className="bg-slate-800/50 rounded-2xl p-5 space-y-4 border border-white/5">
                {details.map(item => (
                    <div key={item.label} className="flex justify-between items-center text-sm">
                        <span className="text-slate-400 font-medium">{item.label}</span>
                        <span className={`font-bold text-base ${item.color || 'text-slate-200'}`}>{item.value}</span>
                    </div>
                ))}
                {transaction.notes && (
                    <div className="pt-4 border-t border-white/5">
                        <p className="text-xs text-slate-500 mb-2 font-bold">ملاحظات</p>
                        <p className="text-sm text-slate-300 bg-black/20 p-3 rounded-xl">{transaction.notes}</p>
                    </div>
                )}
            </div>
            <div className="flex justify-end gap-3">
                <button onClick={onDelete} className="flex-1 py-3 px-4 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-xl transition flex items-center justify-center gap-2 font-bold">
                    <TrashIcon className="w-5 h-5"/> حذف
                </button>
                <button onClick={onEdit} className="flex-1 py-3 px-4 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 rounded-xl transition flex items-center justify-center gap-2 font-bold">
                    <PencilSquareIcon className="w-5 h-5"/> تعديل
                </button>
            </div>
        </div>
    );
};

const HomePage: React.FC<{ key: number; handleDatabaseChange: (description?: string) => void; setActivePage: (page: Page) => void; }> = ({ key, handleDatabaseChange, setActivePage }) => {
    const [stats, setStats] = useState({ totalBalance: 0, debtsForYou: 0, debtsOnYou: 0 });
    const [lastTransactions, setLastTransactions] = useState<Transaction[]>([]);
    const [upcomingDebts, setUpcomingDebts] = useState<Debt[]>([]);
    const [yearlyData, setYearlyData] = useState<{ income: number[], expense: number[] }>({ income: [], expense: [] });
    const [loading, setLoading] = useState(true);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [lastActivity, setLastActivity] = useState<{ description: string; time: string; date: string } | null>(null);

    // Modals State
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isSummaryModalOpen, setIsSummaryModalOpen] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const [accRes, debtRes, lastTxRes, yearlyRes, activityRes, catRes, upcomingDebtsRes] = await Promise.all([
                    supabase.from('accounts').select('*'),
                    supabase.from('debts').select('amount, type').eq('paid', false),
                    supabase.from('transactions').select('*, accounts:account_id(name, currency), categories(name, icon, color)').order('date', { ascending: false }).limit(5),
                    supabase.from('transactions').select('amount, date, type').in('type', ['income', 'expense']).gte('date', new Date(currentYear, 0, 1).toISOString()).lte('date', new Date(currentYear, 11, 31, 23, 59, 59).toISOString()),
                    supabase.from('activities').select('description, activity_date, activity_time').eq('id', 1).single(),
                    supabase.from('categories').select('*'),
                    supabase.from('debts').select('*, contacts(name)').eq('paid', false).not('due_date', 'is', null).order('due_date', { ascending: true }).limit(5)
                ]);

                setAccounts(accRes.data || []);
                setCategories(catRes.data || []);

                const totalBalance = (accRes.data || []).reduce((sum, acc) => sum + acc.balance, 0);
                const debtsForYou = (debtRes.data || []).filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);
                const debtsOnYou = (debtRes.data || []).filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
                setStats({ totalBalance, debtsForYou, debtsOnYou });
                
                setLastTransactions(lastTxRes.data as unknown as Transaction[] || []);
                setUpcomingDebts(upcomingDebtsRes.data as unknown as Debt[] || []);

                if (activityRes.data) setLastActivity({ description: activityRes.data.description, date: activityRes.data.activity_date, time: activityRes.data.activity_time });

                const incomeByMonth = Array(12).fill(0);
                const expenseByMonth = Array(12).fill(0);
                (yearlyRes.data || []).forEach((tx: any) => {
                    const month = new Date(tx.date).getMonth();
                    if (tx.type === 'income') incomeByMonth[month] += tx.amount;
                    else if (tx.type === 'expense') expenseByMonth[month] += tx.amount;
                });
                setYearlyData({ income: incomeByMonth, expense: expenseByMonth });

            } catch (error) { console.error(error); } finally { setLoading(false); }
        };
        fetchAllData();
    }, [key, currentYear]);

    return (
        <div className="space-y-6 pb-20">
            <QuickActions onActionSuccess={handleDatabaseChange} />

            {/* Top Status Bar: Last Activity */}
            {lastActivity && (
                <div className="glass-card rounded-2xl p-2.5 px-4 flex items-center justify-between border border-white/5 bg-slate-900/60 backdrop-blur-md shadow-sm">
                     <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse shrink-0"></div>
                        <p className="text-xs md:text-sm text-slate-300 truncate font-medium">
                            <span className="text-slate-500 ml-2">آخر نشاط:</span>
                            {lastActivity.description}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-[10px] text-slate-400 font-mono">
                         <div className="flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded-lg border border-white/5 shadow-sm">
                            <CalendarDaysIcon className="w-3 h-3 text-cyan-500/70" />
                            <span className="tracking-tighter">{new Date(lastActivity.date).toLocaleDateString('ar-LY')}</span>
                        </div>
                        <div className="flex items-center gap-1 bg-slate-800/50 px-2 py-1 rounded-lg border border-white/5 shadow-sm">
                            <ClockIcon className="w-3 h-3 text-cyan-500/70" />
                            <span>{lastActivity.time.slice(0, 5)}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Dashboard Grid: Total Balance & Debts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Hero Card - Premium Metal Look */}
                <div className="md:col-span-2 relative overflow-hidden rounded-[2rem] p-8 text-white flex flex-col justify-between min-h-[14rem] shadow-2xl group border border-white/10"
                    style={{ 
                        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                        boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
                    }}>
                    
                    {/* Texture Overlay */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
                    
                    {/* Gradient Orbs */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-[80px]"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px]"></div>

                    <div className="relative z-10 flex justify-between items-start">
                        <div>
                            <p className="text-slate-400 font-medium text-sm mb-1 tracking-wider uppercase">إجمالي الرصيد</p>
                            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white drop-shadow-sm">{formatCurrency(stats.totalBalance)}</h2>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center backdrop-blur-sm">
                             <img src="https://cdn-icons-png.flaticon.com/512/6404/6404078.png" alt="Chip" className="w-6 h-6 opacity-60 invert" />
                        </div>
                    </div>
                    
                    <div className="relative z-10 flex items-end justify-between mt-6">
                        <div className="flex flex-col gap-1">
                             <p className="text-xs text-slate-500 font-mono tracking-widest">**** **** **** 8842</p>
                             <span className="text-xs font-bold text-slate-400">المحفظة الرئيسية</span>
                        </div>
                        <button onClick={() => setActivePage('accounts')} className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl text-xs font-bold transition flex items-center gap-2 border border-white/5">
                            إدارة الحسابات <ChevronLeftIcon className="w-3 h-3" />
                        </button>
                    </div>
                </div>

                {/* Debt Summary Cards - Stacked */}
                <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
                    <button onClick={() => setActivePage('debts')} className="glass-card p-5 rounded-[2rem] flex flex-col justify-center items-start hover:bg-white/5 transition-all group relative overflow-hidden border border-white/5 h-full">
                        <div className="absolute right-0 top-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20"><ArrowDownIcon className="w-4 h-4"/></div>
                            <span className="text-slate-400 text-xs font-bold">ديون لك</span>
                        </div>
                        <span className="text-xl md:text-2xl font-bold text-white tracking-wide">{formatCurrency(stats.debtsForYou)}</span>
                    </button>

                    <button onClick={() => setActivePage('debts')} className="glass-card p-5 rounded-[2rem] flex flex-col justify-center items-start hover:bg-white/5 transition-all group relative overflow-hidden border border-white/5 h-full">
                        <div className="absolute right-0 top-0 w-20 h-20 bg-rose-500/10 rounded-full blur-xl group-hover:bg-rose-500/20 transition-all"></div>
                        <div className="flex items-center gap-2 mb-2">
                             <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20"><ArrowUpIcon className="w-4 h-4"/></div>
                            <span className="text-slate-400 text-xs font-bold">ديون عليك</span>
                        </div>
                        <span className="text-xl md:text-2xl font-bold text-white tracking-wide">{formatCurrency(stats.debtsOnYou)}</span>
                    </button>
                </div>
            </div>

            {/* Urgent: Upcoming Debts */}
            {upcomingDebts.length > 0 && (
                <div className="animate-fade-in">
                    <div className="flex justify-between items-center mb-3 px-1">
                        <h2 className="text-base font-bold text-slate-300 flex items-center gap-2">
                            <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />
                            تنبيهات الاستحقاق
                        </h2>
                         <button onClick={() => setActivePage('debts')} className="text-xs text-cyan-500 font-bold hover:underline">عرض الجدول</button>
                    </div>
                    <div className="flex overflow-x-auto gap-4 pb-2 -mx-4 px-4 custom-scrollbar snap-x">
                        {upcomingDebts.map(debt => {
                            const daysRemaining = getDaysRemaining(debt.due_date!);
                            const isOverdue = daysRemaining < 0;
                            const isDueSoon = daysRemaining >= 0 && daysRemaining <= 7;
                            
                            return (
                                <div key={debt.id} className="min-w-[240px] glass-card p-4 rounded-2xl border border-white/5 relative overflow-hidden snap-center flex flex-col justify-between h-28">
                                    <div className={`absolute top-0 right-0 w-1 h-full ${isOverdue ? 'bg-rose-500' : isDueSoon ? 'bg-amber-500' : 'bg-cyan-500'}`}></div>
                                    <div className="flex justify-between items-start pl-2">
                                        <div>
                                            <p className="font-bold text-white text-sm truncate max-w-[120px]">{debt.contacts?.name || 'دين'}</p>
                                            <p className="text-xs text-slate-500">{new Date(debt.due_date!).toLocaleDateString('ar-LY')}</p>
                                        </div>
                                        <div className={`text-sm font-bold ${debt.type === 'on_you' ? 'text-rose-400' : 'text-emerald-400'}`}>{formatCurrency(debt.amount)}</div>
                                    </div>
                                    
                                    <div className="mt-2">
                                         <span className={`text-[10px] px-2 py-1 rounded-md font-bold flex items-center gap-1 w-fit ${isOverdue ? 'bg-rose-500/10 text-rose-400' : isDueSoon ? 'bg-amber-500/10 text-amber-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
                                            <ClockIcon className="w-3 h-3" />
                                            {isOverdue ? `متأخر ${Math.abs(daysRemaining)} يوم` : daysRemaining === 0 ? 'اليوم' : `باقي ${daysRemaining} يوم`}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Financial Flow Chart */}
            <div className="glass-card rounded-[2rem] p-6 relative border border-white/5">
                <div className="flex justify-between items-center mb-6">
                    <div>
                         <h2 className="text-lg font-bold text-white">التدفق المالي</h2>
                    </div>
                    <div className="flex items-center gap-2">
                         <button 
                            onClick={() => setIsSummaryModalOpen(true)}
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center gap-1 border border-white/5"
                        >
                            <ChartBarSquareIcon className="w-4 h-4" />
                            الموجز
                        </button>
                        <div className="flex items-center gap-1 bg-slate-900/50 rounded-lg p-0.5 border border-white/5">
                             <button onClick={() => setCurrentYear(y => y - 1)} className="p-1 text-slate-500 hover:text-white transition"><ChevronRightIcon className="w-3 h-3"/></button>
                             <span className="text-xs font-bold px-2 text-slate-300">{currentYear}</span>
                             <button onClick={() => setCurrentYear(y => y + 1)} className="p-1 text-slate-500 hover:text-white transition"><ChevronLeftIcon className="w-3 h-3"/></button>
                        </div>
                    </div>
                </div>
                <YearlyChart data={Array.from({ length: 12 }, (_, i) => ({ income: yearlyData.income[i] || 0, expense: yearlyData.expense[i] || 0}))} />
            </div>

            {/* Recent Transactions List */}
            <div>
                <div className="flex justify-between items-end mb-4 px-1">
                    <h2 className="text-lg font-bold text-white">آخر المعاملات</h2>
                    <button onClick={() => setActivePage('transactions')} className="text-xs font-bold text-slate-400 hover:text-white transition-colors">عرض السجل كامل</button>
                </div>
                <div className="space-y-3">
                    {loading ? [...Array(3)].map((_, i) => <div key={i} className="h-20 bg-slate-800/50 rounded-2xl animate-pulse"></div>) 
                    : lastTransactions.length > 0 ? lastTransactions.map(tx => {
                        const Icon = (tx.categories?.icon && iconMap[tx.categories.icon]) || (tx.type === 'income' ? ArrowDownIcon : ArrowUpIcon);
                        const bgColor = tx.categories?.color || (tx.type === 'income' ? '#10b981' : '#f43f5e');
                        
                        return (
                            <div key={tx.id} onClick={() => { setSelectedTransaction(tx); setIsDetailModalOpen(true); }} 
                                className="group relative bg-slate-900/40 backdrop-blur-md p-3.5 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-800/60 transition-all border border-white/5 hover:border-white/10 overflow-hidden">
                                
                                <div className="flex items-center gap-4 relative z-10">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg shadow-black/20" style={{ backgroundColor: bgColor }}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-200 text-base mb-0.5 group-hover:text-white transition-colors">{tx.notes || tx.categories?.name || 'معاملة'}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                                             <span>{new Date(tx.date).toLocaleDateString('ar-LY', {day: 'numeric', month: 'short'})}</span>
                                             <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                                             <span>{tx.accounts?.name}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right relative z-10">
                                    <p className={`font-bold text-base ${tx.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                                    </p>
                                </div>
                            </div>
                        )
                    }) : <div className="text-center py-10 text-slate-500 bg-slate-900/20 rounded-2xl border border-dashed border-slate-800">لا توجد معاملات حديثة</div>}
                </div>
            </div>

            {/* Modals */}
            {isDetailModalOpen && selectedTransaction && (
                <Modal title="تفاصيل المعاملة" onClose={() => setIsDetailModalOpen(false)}>
                    <TransactionDetailContent transaction={selectedTransaction} onEdit={() => { setIsDetailModalOpen(false); setIsEditModalOpen(true); }} onDelete={() => { /* Logic handled in parent typically, simplistic here */ }} />
                </Modal>
            )}
             {isEditModalOpen && selectedTransaction && (
                <Modal title="تعديل المعاملة" onClose={() => setIsEditModalOpen(false)}>
                    <TransactionForm transaction={selectedTransaction} onSave={() => { setIsEditModalOpen(false); handleDatabaseChange('تعديل معاملة'); }} onCancel={() => setIsEditModalOpen(false)} accounts={accounts} categories={categories} />
                </Modal>
            )}
             <MonthlySummaryModal 
                isOpen={isSummaryModalOpen} 
                onClose={() => setIsSummaryModalOpen(false)} 
                year={currentYear}
                setActivePage={setActivePage}
            />
        </div>
    );
};

export default HomePage;
