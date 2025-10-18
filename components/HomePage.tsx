import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Account, Debt, Transaction, Page } from '../types';
import QuickActions from './QuickActions';
import { 
    WalletIcon, ArrowDownIcon, ArrowUpIcon, ClockIcon, ScaleIcon 
} from './icons';

const formatCurrency = (amount: number, currency: string = 'د.ل') => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD' }).format(amount).replace('LYD', currency);
};

const HomePage: React.FC<{ 
    key: number, 
    refreshData: () => void, 
    lastUpdated: Date | null,
    setActivePage: (page: Page) => void;
}> = ({ refreshData, lastUpdated, setActivePage }) => {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({ totalBalance: 0, debtsForYou: 0, debtsOnYou: 0 });
    const [loadingStats, setLoadingStats] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            setLoadingStats(true);
            
            const transactionsPromise = supabase.from('transactions')
                .select('*, accounts:accounts!account_id(name, currency), categories(name)')
                .order('date', { ascending: false })
                .limit(5);

            const accountsPromise = supabase.from('accounts').select('balance');
            const debtsPromise = supabase.from('debts').select('amount, type').eq('paid', false);

            const [
                { data: transactionsData, error: txError }, 
                { data: accountsData, error: accError }, 
                { data: debtsData, error: debtError }
            ] = await Promise.all([transactionsPromise, accountsPromise, debtsPromise]);

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
            
            setLoading(false);
            setLoadingStats(false);
        };
        fetchData();
    }, []);
    
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

    const netWorth = useMemo(() => stats.totalBalance - stats.debtsOnYou, [stats]);

    return (
        <div className="space-y-6">
            {/* Stats Section */}
            <div>
                {loadingStats ? (
                    <div className="space-y-4 animate-pulse">
                        <div className="h-24 bg-slate-800 rounded-2xl"></div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-20 bg-slate-800 rounded-xl"></div>
                            <div className="h-20 bg-slate-800 rounded-xl"></div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Net Worth Card */}
                        <div className="bg-slate-800 p-4 rounded-xl shadow-lg text-center">
                             <div className="flex items-center justify-center gap-2 text-sm text-slate-400">
                                <ScaleIcon className="w-5 h-5" />
                                <span>صافي الثروة</span>
                            </div>
                            <p className="text-3xl font-bold mt-1 text-cyan-300">{formatCurrency(netWorth)}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            {/* Total Balance Card */}
                             <button onClick={() => setActivePage('accounts')} className="bg-slate-800 p-4 rounded-xl shadow text-right w-full transition-transform hover:scale-105 active:scale-95">
                                <div className="flex items-center gap-2 text-slate-300">
                                    <WalletIcon className="w-5 h-5" />
                                    <span className="text-sm">إجمالي الأرصدة</span>
                                </div>
                                <p className="text-2xl font-bold mt-1 text-white">{formatCurrency(stats.totalBalance)}</p>
                            </button>
                            {/* Debts Card (Combined) */}
                             <button onClick={() => setActivePage('debts')} className="bg-slate-800 p-4 rounded-xl shadow w-full transition-transform hover:scale-105 active:scale-95">
                                <div className="space-y-2">
                                     <div className="flex justify-between items-center">
                                        <span className="text-sm text-green-400">ديون لك</span>
                                        <p className="text-lg font-bold text-green-400">{formatCurrency(stats.debtsForYou)}</p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-red-400">ديون عليك</span>
                                        <p className="text-lg font-bold text-red-400">{formatCurrency(stats.debtsOnYou)}</p>
                                    </div>
                                </div>
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-center gap-2 text-xs text-slate-500 mt-4">
                    <ClockIcon className="w-4 h-4" />
                    <span>آخر تحديث: {formatLastUpdated(lastUpdated)}</span>
                </div>
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
            
            <QuickActions onActionSuccess={refreshData} />
        </div>
    );
};

export default HomePage;