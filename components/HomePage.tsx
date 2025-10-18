import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Debt, Transaction, Page, Category } from '../types';
import QuickActions from './QuickActions';
import TransactionForm from './TransactionForm'; // Import the shared form
import { 
    WalletIcon, ArrowDownIcon, ArrowUpIcon, ClockIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon, DocumentTextIcon,
    PencilSquareIcon, TrashIcon
} from './icons';
import type { Chart, ChartConfiguration } from 'chart.js/auto';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
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
    return new Intl.NumberFormat('ar-LY', options).format(amount).replace('LYD', currency);
};

const monthLabels = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

const numericMonthLabels = Array.from({ length: 12 }, (_, i) => String(i + 1));

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
                labels: numericMonthLabels,
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
                            color: '#94a3b8',
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

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700 shadow-xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            {children}
        </div>
    </div>
);

const TransactionDetailContent: React.FC<{
    transaction: Transaction;
    onEdit: () => void;
    onDelete: () => void;
}> = ({ transaction, onEdit, onDelete }) => {
    const details = [
        { label: 'المبلغ', value: formatCurrency(transaction.amount, transaction.accounts?.currency), color: transaction.type === 'income' ? 'text-green-400' : 'text-red-400' },
        { label: 'النوع', value: transaction.type === 'income' ? 'إيراد' : 'مصروف' },
        { label: 'الحساب', value: transaction.accounts?.name || 'N/A' },
        { label: 'الفئة', value: transaction.categories?.name || 'غير مصنف' },
        { label: 'التاريخ', value: new Date(transaction.date).toLocaleDateString('ar-LY', { day: 'numeric', month: 'long', year: 'numeric' }) },
        { label: 'ملاحظات', value: transaction.notes || '-' },
    ];

    return (
        <div className="space-y-3">
            {details.map(item => (
                <div key={item.label} className="flex justify-between items-center text-sm">
                    <span className="text-slate-400">{item.label}</span>
                    <span className={`font-semibold ${item.color || 'text-white'}`}>{item.value}</span>
                </div>
            ))}
            <div className="flex justify-end gap-3 pt-4">
                <button onClick={onDelete} className="py-2 px-4 bg-red-600/20 text-red-400 hover:bg-red-600/40 rounded-md transition flex items-center gap-2">
                    <TrashIcon className="w-5 h-5"/> حذف
                </button>
                <button onClick={onEdit} className="py-2 px-4 bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/40 rounded-md transition flex items-center gap-2">
                    <PencilSquareIcon className="w-5 h-5"/> تعديل
                </button>
            </div>
        </div>
    );
};


const HomePage: React.FC<{ key: number; handleDatabaseChange: (description?: string) => void; setActivePage: (page: Page) => void; }> = ({ key, handleDatabaseChange, setActivePage }) => {
    const [stats, setStats] = useState({ totalBalance: 0, debtsForYou: 0, debtsOnYou: 0 });
    const [lastTransactions, setLastTransactions] = useState<Transaction[]>([]);
    const [yearlyData, setYearlyData] = useState<{ income: number[], expense: number[] }>({ income: [], expense: [] });
    const [loading, setLoading] = useState(true);
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [isSummaryModalOpen, setSummaryModalOpen] = useState(false);
    const [monthlySummary, setMonthlySummary] = useState<any[]>([]);

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [lastActivity, setLastActivity] = useState<{ description: string; time: string; date: string } | null>(null);

    useEffect(() => {
        const fetchDataForForm = async () => {
            if (!isEditModalOpen) return;
            const accPromise = supabase.from('accounts').select('*');
            const catPromise = supabase.from('categories').select('*');
            const [{ data: accData }, { data: catData }] = await Promise.all([accPromise, catPromise]);
            setAccounts(accData || []);
            setCategories(catData || []);
        };
        fetchDataForForm();
    }, [isEditModalOpen]);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            try {
                const accountsPromise = supabase.from('accounts').select('balance');
                const debtsPromise = supabase.from('debts').select('amount, type').eq('paid', false);
                const lastTransactionsPromise = supabase.from('transactions').select('*, accounts:account_id(name, currency), categories(name)').order('created_at', { ascending: false }).limit(5);

                const yearStart = new Date(currentYear, 0, 1).toISOString();
                const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999).toISOString();
                const yearlyTransactionsPromise = supabase
                    .from('transactions')
                    .select('amount, date, type, categories(name)')
                    .in('type', ['income', 'expense'])
                    .gte('date', yearStart)
                    .lte('date', yearEnd);
                
                const activityPromise = supabase.from('activities').select('description, activity_date, activity_time').eq('id', 1).single();

                const [
                    { data: accountsData, error: accError },
                    { data: debtsData, error: debtError },
                    { data: lastTransactionsData, error: txError },
                    { data: yearlyTransactions, error: yearlyError },
                    { data: activityData, error: activityError }
                ] = await Promise.all([accountsPromise, debtsPromise, lastTransactionsPromise, yearlyTransactionsPromise, activityPromise]);

                if (accError) throw accError;
                if (debtError) throw debtError;
                if (txError) throw txError;
                if (yearlyError) throw yearlyError;
                if (activityError && activityError.code !== 'PGRST116') { // Ignore 'Range not satisfactory' for single()
                     console.error("Error fetching activity", activityError.message);
                }

                const totalBalance = (accountsData || []).reduce((sum, acc) => sum + acc.balance, 0);
                const debtsForYou = (debtsData || []).filter(d => d.type === 'for_you').reduce((sum, d) => sum + d.amount, 0);
                const debtsOnYou = (debtsData || []).filter(d => d.type === 'on_you').reduce((sum, d) => sum + d.amount, 0);
                setStats({ totalBalance, debtsForYou, debtsOnYou });
                setLastTransactions(lastTransactionsData as unknown as Transaction[] || []);
                
                if (activityData) {
                    setLastActivity({ 
                        description: activityData.description, 
                        date: activityData.activity_date,
                        time: activityData.activity_time 
                    });
                }
                
                // Process yearly transactions for both yearly chart and monthly summary
                const incomeByMonth = Array(12).fill(0);
                const expenseByMonth = Array(12).fill(0);
                const summaryByMonth: { [key: number]: { total_income: number; total_expense: number; expenses_by_category: { [key: string]: number; }; } } = {};

                if (yearlyTransactions) {
                    (yearlyTransactions as any[]).forEach(tx => {
                        const month = new Date(tx.date).getMonth(); // 0-indexed month

                        if (!summaryByMonth[month]) {
                            summaryByMonth[month] = { total_income: 0, total_expense: 0, expenses_by_category: {} };
                        }

                        if (tx.type === 'income') {
                            incomeByMonth[month] += tx.amount;
                            summaryByMonth[month].total_income += tx.amount;
                        } else if (tx.type === 'expense') {
                            expenseByMonth[month] += tx.amount;
                            summaryByMonth[month].total_expense += tx.amount;
                            
                            const categoryName = tx.categories?.name || 'غير مصنف';
                            if (!summaryByMonth[month].expenses_by_category[categoryName]) {
                                summaryByMonth[month].expenses_by_category[categoryName] = 0;
                            }
                            summaryByMonth[month].expenses_by_category[categoryName] += tx.amount;
                        }
                    });
                }
                
                setYearlyData({ income: incomeByMonth, expense: expenseByMonth });

                const monthlySummaryData = Object.entries(summaryByMonth).map(([month, data]) => ({
                    month: Number(month) + 1, // 1-indexed month for display
                    total_income: data.total_income,
                    total_expense: data.total_expense,
                    expenses_by_category: Object.entries(data.expenses_by_category)
                        .map(([category_name, total]) => ({ category_name, total }))
                        .sort((a, b) => b.total - a.total),
                }));
                setMonthlySummary(monthlySummaryData);

            } catch (error: any) {
                console.error("Error fetching homepage data:", error.message);
            } finally {
                setLoading(false);
            }
        };

        fetchAllData();
    }, [key, currentYear]);

    const netWorth = useMemo(() => stats.totalBalance + stats.debtsForYou - stats.debtsOnYou, [stats]);

    const openSummaryModal = () => {
        setSummaryModalOpen(true);
    };
    
    const handleOpenDetailModal = (tx: Transaction) => {
        setSelectedTransaction(tx);
        setIsDetailModalOpen(true);
    };

    const handleOpenEditModal = () => {
        setIsDetailModalOpen(false);
        setIsEditModalOpen(true);
    };

    const handleOpenDeleteConfirm = () => {
        setIsDetailModalOpen(false);
        setIsDeleteConfirmOpen(true);
    };

    const closeAllModals = () => {
        setSelectedTransaction(null);
        setIsDetailModalOpen(false);
        setIsEditModalOpen(false);
        setIsDeleteConfirmOpen(false);
    };

    const handleSaveTransaction = () => {
        closeAllModals();
        handleDatabaseChange(isEditModalOpen ? `تعديل معاملة` : 'إضافة معاملة جديدة');
    };

    const handleDeleteTransaction = async () => {
        if (!selectedTransaction || !selectedTransaction.account_id || selectedTransaction.type === 'transfer') {
            alert('لا يمكن حذف التحويلات من هنا.');
            return;
        }
        try {
            // 1. Get the current account balance
            const { data: account, error: accError } = await supabase
                .from('accounts')
                .select('balance')
                .eq('id', selectedTransaction.account_id)
                .single();
    
            if (accError || !account) throw accError || new Error("Account not found");
    
            // 2. Calculate the new balance
            const balanceChange = selectedTransaction.type === 'income' 
                ? -selectedTransaction.amount 
                : selectedTransaction.amount;
            const newBalance = account.balance + balanceChange;
    
            // 3. Update the account balance
            const { error: updateError } = await supabase
                .from('accounts')
                .update({ balance: newBalance })
                .eq('id', selectedTransaction.account_id);
    
            if (updateError) throw updateError;
            
            // 4. Delete the transaction
            const { error: deleteError } = await supabase
                .from('transactions')
                .delete()
                .eq('id', selectedTransaction.id);
    
            if (deleteError) {
                // Attempt to revert the balance change
                await supabase
                    .from('accounts')
                    .update({ balance: account.balance })
                    .eq('id', selectedTransaction.account_id);
                throw deleteError;
            }
    
            handleDatabaseChange(`حذف معاملة "${selectedTransaction.notes || 'غير مسجلة'}"`);
        } catch (error: any) {
            console.error('Error deleting transaction', error.message);
            alert('حدث خطأ أثناء الحذف.');
        } finally {
            closeAllModals();
        }
    };


    return (
        <div className="space-y-6">
            <QuickActions onActionSuccess={handleDatabaseChange} />

            <div>
                <h2 className="text-xl font-bold mb-3">نظرة عامة</h2>
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setActivePage('accounts')} className="col-span-2 bg-slate-800 p-4 rounded-xl shadow-lg hover:bg-slate-700/50 transition-colors text-center">
                        <div className="flex justify-center items-center gap-2">
                            <WalletIcon className="w-6 h-6 text-cyan-400" />
                            <h3 className="text-lg font-semibold text-slate-300">إجمالي الأرصدة</h3>
                        </div>
                        <p className="text-3xl font-extrabold text-cyan-300 mt-2">{formatCurrency(stats.totalBalance)}</p>
                    </button>
                    <button onClick={() => setActivePage('debts')} className="bg-slate-800 p-4 rounded-xl shadow-lg hover:bg-slate-700/50 transition-colors text-center">
                        <h3 className="text-base text-slate-400">ديون لك</h3>
                        <p className="text-2xl font-bold text-green-400 mt-1">{formatCurrency(stats.debtsForYou)}</p>
                    </button>
                    <button onClick={() => setActivePage('debts')} className="bg-slate-800 p-4 rounded-xl shadow-lg hover:bg-slate-700/50 transition-colors text-center">
                        <h3 className="text-base text-slate-400">ديون عليك</h3>
                        <p className="text-2xl font-bold text-red-400 mt-1">{formatCurrency(stats.debtsOnYou)}</p>
                    </button>
                </div>
                 {lastActivity && (
                    <p className="text-xs text-slate-500 mt-3 flex items-center justify-center gap-1 text-center">
                        <ClockIcon className="w-3 h-3 flex-shrink-0"/>
                        آخر تحديث: {lastActivity.description} (
                        {new Date(lastActivity.date + 'T' + lastActivity.time).toLocaleString('ar-LY', { 
                            day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' 
                        })}
                        )
                    </p>
                )}
            </div>

            <div className="bg-slate-800 p-4 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                        <button onClick={() => setCurrentYear(y => y - 1)} className="p-1 rounded-full hover:bg-slate-700"><ChevronRightIcon className="w-5 h-5"/></button>
                        <h2 className="text-xl font-bold">نظرة عامة سنوية {currentYear}</h2>
                        <button onClick={() => setCurrentYear(y => y + 1)} className="p-1 rounded-full hover:bg-slate-700"><ChevronLeftIcon className="w-5 h-5"/></button>
                    </div>
                    <button onClick={openSummaryModal} className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                        <DocumentTextIcon className="w-4 h-4"/> الموجز
                    </button>
                </div>
                <YearlyChart data={Array.from({ length: 12 }, (_, i) => ({ income: yearlyData.income[i] || 0, expense: yearlyData.expense[i] || 0}))} />
            </div>

            <div className="mt-6">
                <h2 className="text-xl font-bold mb-3">آخر المعاملات</h2>
                {loading ? (
                    <div className="space-y-2">
                        {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-800 rounded-lg animate-pulse"></div>)}
                    </div>
                ) : lastTransactions.length > 0 ? (
                    <div className="space-y-2">
                        {lastTransactions.map(tx => (
                             <button key={tx.id} onClick={() => handleOpenDetailModal(tx)} className="w-full text-right bg-slate-800 p-3 rounded-lg flex justify-between items-center hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        {tx.type === 'income' ? <ArrowDownIcon className="w-6 h-6"/> : <ArrowUpIcon className="w-6 h-6"/>}
                                    </div>
                                    <div>
                                        <p className="font-semibold">{tx.notes || (tx.categories?.name || (tx.type === 'income' ? 'إيراد' : 'مصروف'))}</p>
                                        <p className="text-sm text-slate-400">{tx.accounts?.name || 'حساب محذوف'}</p>
                                    </div>
                                </div>
                                <div className="text-left">
                                    <p className={`font-bold text-lg ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{formatCurrency(tx.amount, tx.accounts?.currency)}</p>
                                    <p className="text-xs text-slate-500">{new Date(tx.date).toLocaleDateString()}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-400 text-center py-4">لا توجد معاملات لعرضها.</p>
                )}
            </div>
            
            {isSummaryModalOpen && (
                 <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-slate-800 rounded-xl p-2 w-full max-w-4xl border border-slate-700 shadow-xl">
                        <div className="flex justify-between items-center p-4">
                             <h3 className="text-xl font-bold">الموجز الشهري لعام {currentYear}</h3>
                             <button onClick={() => setSummaryModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
                         </div>
                         <div className="max-h-[80vh] overflow-y-auto p-4 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {monthLabels.map((monthName, index) => {
                                const month = index + 1;
                                const summary = monthlySummary.find(m => m.month === month);
                                if (!summary || (!summary.total_income && !summary.total_expense)) {
                                    return (
                                        <div key={month} className="bg-slate-900/50 p-4 rounded-lg">
                                            <h4 className="font-bold text-lg mb-2">{monthName}</h4>
                                            <p className="text-slate-500 text-center py-8">لا توجد بيانات</p>
                                        </div>
                                    );
                                }
                                const chartData = [summary.total_income || 0, summary.total_expense || 0];
                                const expensesByCategory = summary.expenses_by_category || [];
                                
                                return (
                                     <div key={month} className="bg-slate-900 p-4 rounded-lg">
                                        <h4 className="font-bold text-lg mb-3">{monthName}</h4>
                                        <div className="grid grid-cols-2 gap-4 items-center mb-4">
                                            <div className="h-28 w-28 mx-auto">
                                                 <DoughnutChart data={chartData} labels={['الإيرادات', 'المصروفات']} colors={[CHART_COLORS.income, CHART_COLORS.expense]} />
                                            </div>
                                            <div className="space-y-2 text-sm">
                                                <div>
                                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-emerald-400"></div><p>الإيرادات</p></div>
                                                    <p className="font-bold text-emerald-400">{formatCurrency(summary.total_income || 0)}</p>
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-red-400"></div><p>المصروفات</p></div>
                                                     <p className="font-bold text-red-400">{formatCurrency(summary.total_expense || 0)}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <h5 className="font-semibold mb-2 text-sm">أبرز المصروفات</h5>
                                            <div className="space-y-1 text-xs">
                                                {expensesByCategory.length > 0 ? expensesByCategory.map((cat: any) => (
                                                    <div key={cat.category_name} className="flex justify-between bg-slate-800/50 p-2 rounded">
                                                        <span>{cat.category_name}</span>
                                                        <span className="font-semibold">{formatCurrency(cat.total)} <span className="text-slate-500">({((cat.total / summary.total_expense) * 100).toFixed(0)}%)</span></span>
                                                    </div>
                                                )) : <p className="text-slate-500 text-center py-2">لا توجد مصروفات</p>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>
                        </div>
                    </div>
                 </div>
            )}

            {isDetailModalOpen && selectedTransaction && (
                <Modal title="تفاصيل المعاملة" onClose={closeAllModals}>
                    <TransactionDetailContent
                        transaction={selectedTransaction}
                        onEdit={handleOpenEditModal}
                        onDelete={handleOpenDeleteConfirm}
                    />
                </Modal>
            )}
            {isEditModalOpen && selectedTransaction && (
                <Modal title="تعديل المعاملة" onClose={closeAllModals}>
                    <TransactionForm
                        transaction={selectedTransaction}
                        onSave={handleSaveTransaction}
                        onCancel={closeAllModals}
                        accounts={accounts}
                        categories={categories}
                    />
                </Modal>
            )}
            {isDeleteConfirmOpen && selectedTransaction && (
                <Modal title="تأكيد الحذف" onClose={closeAllModals}>
                    <p className="text-slate-300 mb-6">هل أنت متأكد من حذف هذه المعاملة؟ سيتم التراجع عن تأثيرها على رصيد الحساب.</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={closeAllModals} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                        <button onClick={handleDeleteTransaction} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default HomePage;