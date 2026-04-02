
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { RecurringTransaction, Account, Category } from '../types';
import { PlusIcon, XMarkIcon, ClockIcon, TrashIcon, TagIcon, WalletIcon } from './icons';
import { useToast } from './Toast';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل');
};

const RecurringTransactionsPage: React.FC<{ refreshTrigger: number }> = ({ refreshTrigger }) => {
    const [tasks, setTasks] = useState<RecurringTransaction[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const toast = useToast();

    // Form
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'income' | 'expense'>('expense');
    const [accId, setAccId] = useState('');
    const [catId, setCatId] = useState('');
    const [freq, setFreq] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
    const [nextDate, setNextDate] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const [taskRes, accRes, catRes] = await Promise.all([
            supabase.from('recurring_transactions').select('*, categories(name), accounts(name)'),
            supabase.from('accounts').select('*'),
            supabase.from('categories').select('*')
        ]);
        setTasks(taskRes.data || []);
        setAccounts(accRes.data || []);
        setCategories(catRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [refreshTrigger]);

    const handleAddTask = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('recurring_transactions').insert({
            amount: Number(amount), type, account_id: accId, category_id: catId || null, frequency: freq, next_date: nextDate, is_active: true
        });
        if (!error) {
            toast.success('تمت جدولة المعاملة');
            setShowAddModal(false);
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        await supabase.from('recurring_transactions').delete().eq('id', id);
        fetchData();
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                    <ClockIcon className="w-7 h-7 text-amber-500" /> المعاملات المتكررة
                </h2>
                <button onClick={() => setShowAddModal(true)} className="p-3 bg-amber-600 text-white rounded-xl shadow-lg transition-all active:scale-95">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>

            {loading ? <div className="h-40 animate-pulse bg-slate-800 rounded-3xl"></div> : (
                <div className="space-y-3">
                    {tasks.length === 0 ? (
                        <div className="py-20 text-center bg-slate-900/40 rounded-[2rem] border-2 border-dashed border-slate-800 text-slate-500">
                            لا توجد التزامات مجدولة حالياً.
                        </div>
                    ) : tasks.map(task => (
                        <div key={task.id} className="glass-card p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all shadow-sm hover:shadow-xl hover:-translate-y-0.5">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform ${task.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    <ClockIcon className="w-6 h-6 drop-shadow-md" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-white text-sm">{task.categories?.name || 'بدون فئة'}</h4>
                                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                        كل {task.frequency === 'monthly' ? 'شهر' : task.frequency === 'weekly' ? 'أسبوع' : 'سنة'} • {task.accounts?.name}
                                    </p>
                                </div>
                            </div>
                            <div className="text-left flex items-center gap-4">
                                <div>
                                    <p className={`text-lg font-black tabular-nums ${task.type === 'income' ? 'text-emerald-400' : 'text-rose-400'}`}>{formatCurrency(task.amount)}</p>
                                    <p className="text-[9px] text-slate-600 font-bold tracking-widest mt-0.5">الموعد: {new Date(task.next_date).toLocaleDateString('ar-LY')}</p>
                                </div>
                                <button onClick={() => handleDelete(task.id)} className="p-2 text-slate-600 hover:text-rose-500 hover:bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                    <TrashIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card bg-slate-900 w-full max-w-md p-6 rounded-[2.5rem] border border-white/10 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">جدولة معاملة دورية</h3>
                            <button onClick={() => setShowAddModal(false)}><XMarkIcon className="w-6 h-6 text-slate-500"/></button>
                        </div>
                        <form onSubmit={handleAddTask} className="space-y-4">
                            <div className="flex bg-slate-800 p-1 rounded-xl">
                                <button type="button" onClick={() => setType('expense')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'expense' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}>مصروف</button>
                                <button type="button" onClick={() => setType('income')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === 'income' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>إيراد</button>
                            </div>
                            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} required placeholder="المبلغ الثابت" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none" />
                            <div className="grid grid-cols-2 gap-4">
                                <select value={accId} onChange={e => setAccId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none">
                                    <option value="">الحساب...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                                </select>
                                <select value={freq} onChange={e => setFreq(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white">
                                    <option value="daily">يومياً</option>
                                    <option value="weekly">أسبوعياً</option>
                                    <option value="monthly">شهرياً</option>
                                    <option value="yearly">سنوياً</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase px-2 mb-1 block">تاريخ البدء القادم</label>
                                <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none" />
                            </div>
                            <button type="submit" className="w-full py-4 bg-amber-600 text-white rounded-2xl font-bold shadow-xl">بدء الجدولة</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RecurringTransactionsPage;
