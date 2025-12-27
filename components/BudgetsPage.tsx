
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Budget, Category, Transaction } from '../types';
import { PlusIcon, XMarkIcon, ChartPieIcon, TrashIcon, iconMap, TagIcon } from './icons';
import { useToast } from './Toast';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل');
};

const BudgetsPage: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [expenses, setExpenses] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const toast = useToast();

    // Form state
    const [selectedCat, setSelectedCat] = useState('');
    const [limit, setLimit] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        const [budRes, catRes, expRes] = await Promise.all([
            supabase.from('budgets').select('*, categories(*)'),
            supabase.from('categories').select('*').eq('type', 'expense'),
            supabase.from('transactions').select('amount, category_id').eq('type', 'expense').gte('date', startOfMonth)
        ]);

        setBudgets(budRes.data || []);
        setCategories(catRes.data || []);
        setExpenses(expRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [refreshTrigger]);

    const budgetStats = useMemo(() => {
        return budgets.map(b => {
            const spent = expenses.filter(e => e.category_id === b.category_id).reduce((s, e) => s + e.amount, 0);
            return { ...b, spent, percentage: (spent / b.amount_limit) * 100 };
        });
    }, [budgets, expenses]);

    const handleAddBudget = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('budgets').insert({
            category_id: selectedCat,
            amount_limit: Number(limit)
        });
        if (!error) {
            toast.success('تمت إضافة الميزانية');
            setShowAddModal(false);
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('budgets').delete().eq('id', id);
        if (!error) {
            toast.success('تم الحذف');
            fetchData();
        }
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                    <ChartPieIcon className="w-7 h-7 text-cyan-500" /> ميزانيات الفئات
                </h2>
                <button onClick={() => setShowAddModal(true)} className="p-3 bg-cyan-600 text-white rounded-xl shadow-lg active:scale-95 transition-all">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>

            {loading ? <div className="h-40 bg-slate-800 animate-pulse rounded-3xl"></div> : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {budgetStats.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-slate-900/40 rounded-[2rem] border-2 border-dashed border-slate-800 text-slate-500 font-bold">
                            لم تقم بتعيين حدود صرف للفئات بعد.
                        </div>
                    ) : budgetStats.map(b => {
                        const Icon = (b.categories?.icon && iconMap[b.categories.icon]) ? iconMap[b.categories.icon] : TagIcon;
                        const isExceeded = b.spent > b.amount_limit;
                        return (
                            <div key={b.id} className="glass-card p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white" style={{ backgroundColor: b.categories?.color }}>
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{b.categories?.name}</h3>
                                            <p className="text-[10px] text-slate-500 font-black">ميزانية شهرية</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(b.id)} className="text-slate-600 hover:text-rose-500"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-slate-400 font-bold">المصروف: {formatCurrency(b.spent)}</span>
                                        <span className={`font-black ${isExceeded ? 'text-rose-500' : 'text-emerald-400'}`}>{b.percentage.toFixed(0)}%</span>
                                    </div>
                                    <div className="h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                                        <div 
                                            className={`h-full rounded-full transition-all duration-1000 ${isExceeded ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' : 'bg-cyan-500'}`}
                                            style={{ width: `${Math.min(b.percentage, 100)}%` }}
                                        ></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-500">
                                        <span>باقي: {formatCurrency(Math.max(0, b.amount_limit - b.spent))}</span>
                                        <span>الحد: {formatCurrency(b.amount_limit)}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card bg-slate-900 w-full max-w-md p-6 rounded-[2.5rem] border border-white/10 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">تحديد سقف صرف</h3>
                            <button onClick={() => setShowAddModal(false)}><XMarkIcon className="w-6 h-6 text-slate-500"/></button>
                        </div>
                        <form onSubmit={handleAddBudget} className="space-y-6">
                            <div>
                                <label className="text-xs text-slate-500 font-bold block mb-2">الفئة</label>
                                <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none">
                                    <option value="">اختر فئة...</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-bold block mb-2">الحد الأقصى للمصروفات</label>
                                <input type="number" value={limit} onChange={e => setLimit(e.target.value)} required placeholder="0.00" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white text-center text-3xl font-black focus:outline-none" />
                            </div>
                            <button type="submit" className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-bold active:scale-95 transition-all shadow-xl">تأكيد الميزانية</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default BudgetsPage;
