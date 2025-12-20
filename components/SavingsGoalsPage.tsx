
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Goal, Account } from '../types';
import { useToast } from './Toast';
import { 
    PlusIcon, XMarkIcon, HeartPulseIcon, TrashIcon, 
    CheckCircleIcon, ArrowUpIcon, ArrowDownIcon,
    WalletIcon, BanknoteIcon, ShoppingBagIcon, CarIcon, HomeModernIcon
} from './icons';
import { logActivity } from '../lib/logger';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل');
};

const GOAL_ICONS = [
    { id: 'WalletIcon', icon: WalletIcon },
    { id: 'BanknoteIcon', icon: BanknoteIcon },
    { id: 'ShoppingBagIcon', icon: ShoppingBagIcon },
    { id: 'CarIcon', icon: CarIcon },
    { id: 'HomeModernIcon', icon: HomeModernIcon },
];

const COLORS = ['#06b6d4', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#3b82f6'];

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
        <div className="glass-card bg-slate-900 rounded-[2.5rem] p-8 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up relative">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
            </div>
            {children}
        </div>
    </div>
);

const SavingsGoalsPage: React.FC<{ refreshTrigger: number, handleDatabaseChange: (description?: string) => void }> = ({ refreshTrigger, handleDatabaseChange }) => {
    const [goals, setGoals] = useState<Goal[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isDepositModalOpen, setIsDepositModalOpen] = useState<Goal | null>(null);
    const toast = useToast();

    // New Goal Form State
    const [newName, setNewName] = useState('');
    const [newTarget, setNewTarget] = useState('');
    const [newIcon, setNewIcon] = useState('WalletIcon');
    const [newColor, setNewColor] = useState(COLORS[0]);

    // Deposit Form State
    const [depositAmount, setDepositAmount] = useState('');
    const [selectedAccountId, setSelectedAccountId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const [goalsRes, accsRes] = await Promise.all([
            supabase.from('goals').select('*').order('created_at', { ascending: false }),
            supabase.from('accounts').select('*').order('name')
        ]);
        if (!goalsRes.error) setGoals(goalsRes.data || []);
        if (!accsRes.error) {
            setAccounts(accsRes.data || []);
            if (accsRes.data?.length) setSelectedAccountId(accsRes.data[0].id);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [refreshTrigger]);

    const handleAddGoal = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('goals').insert({
            name: newName,
            target_amount: Number(newTarget),
            current_amount: 0,
            icon: newIcon,
            color: newColor
        });
        if (!error) {
            logActivity(`إنشاء هدف ادخار جديد: ${newName}`);
            setIsAddModalOpen(false);
            setNewName(''); setNewTarget('');
            fetchData();
            toast.success('تم إنشاء الهدف بنجاح');
        }
    };

    const handleDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isDepositModalOpen) return;
        const amount = Number(depositAmount);
        
        // 1. Update Account Balance
        const account = accounts.find(a => a.id === selectedAccountId);
        if (!account || account.balance < amount) {
            toast.error('الرصيد غير كافٍ في الحساب المختار');
            return;
        }

        const { error: accError } = await supabase.from('accounts').update({ balance: account.balance - amount }).eq('id', selectedAccountId);
        if (accError) return;

        // 2. Update Goal Amount
        const { error: goalError } = await supabase.from('goals').update({ current_amount: isDepositModalOpen.current_amount + amount }).eq('id', isDepositModalOpen.id);
        
        // 3. Log Transaction
        await supabase.from('transactions').insert({
            amount,
            type: 'expense',
            account_id: selectedAccountId,
            notes: `تحويل إلى هدف الادخار: ${isDepositModalOpen.name}`,
            date: new Date().toISOString()
        });

        if (!goalError) {
            logActivity(`إيداع مبلغ ${formatCurrency(amount)} في هدف: ${isDepositModalOpen.name}`);
            setIsDepositModalOpen(null);
            setDepositAmount('');
            handleDatabaseChange();
            fetchData();
            toast.success('تم الإيداع بنجاح');
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`هل أنت متأكد من حذف الهدف "${name}"؟ ستفقد سجل التقدم.`)) return;
        const { error } = await supabase.from('goals').delete().eq('id', id);
        if (!error) {
            toast.success('تم حذف الهدف');
            fetchData();
        }
    };

    return (
        <div className="space-y-8 pb-24">
            <div className="flex justify-between items-end px-2">
                <div>
                    <h1 className="text-2xl font-black text-white flex items-center gap-3">
                        <HeartPulseIcon className="w-8 h-8 text-rose-500" /> أهداف الادخار
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">وفر بذكاء للوصول إلى أحلامك</p>
                </div>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-white text-slate-900 px-6 py-3 rounded-2xl font-bold text-sm hover:bg-cyan-50 transition-all flex items-center gap-2 shadow-xl shadow-white/5">
                    <PlusIcon className="w-5 h-5" /> هدف جديد
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1,2].map(i => <div key={i} className="h-48 bg-slate-800/50 rounded-[2.5rem] animate-pulse"></div>)}
                </div>
            ) : goals.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/20 rounded-[2.5rem] border-2 border-dashed border-slate-800">
                    <p className="text-slate-500">ابدأ الآن بتحديد أول أهدافك المالية</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {goals.map(goal => {
                        const progress = Math.min((goal.current_amount / goal.target_amount) * 100, 100);
                        const isCompleted = progress === 100;
                        const Icon = GOAL_ICONS.find(i => i.id === goal.icon)?.icon || WalletIcon;

                        return (
                            <div key={goal.id} className="glass-card rounded-[2.5rem] p-8 border border-white/5 relative overflow-hidden group">
                                <div className="absolute top-0 right-0 w-32 h-32 opacity-10 blur-3xl pointer-events-none" style={{ backgroundColor: goal.color }}></div>
                                
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg" style={{ backgroundColor: goal.color }}>
                                            <Icon className="w-7 h-7" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-bold text-white">{goal.name}</h3>
                                            <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">المتبقي: {formatCurrency(Math.max(0, goal.target_amount - goal.current_amount))}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => handleDelete(goal.id, goal.name)} className="p-2 text-slate-700 hover:text-rose-500 transition-colors">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-xs text-slate-500 mb-1">التقدم المحرز</p>
                                            <p className="text-3xl font-black text-white">{progress.toFixed(0)}%</p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-bold text-white">{formatCurrency(goal.current_amount)}</p>
                                            <p className="text-[10px] text-slate-500 font-bold">من أصل {formatCurrency(goal.target_amount)}</p>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden border border-white/5 p-0.5">
                                        <div 
                                            className="h-full rounded-full transition-all duration-1000 ease-out shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                            style={{ width: `${progress}%`, backgroundColor: goal.color }}
                                        ></div>
                                    </div>

                                    <div className="pt-4 flex gap-3">
                                        {isCompleted ? (
                                            <div className="w-full bg-emerald-500/20 border border-emerald-500/30 py-3 rounded-2xl flex items-center justify-center gap-2 text-emerald-400 font-bold animate-fade-in">
                                                <CheckCircleIcon className="w-5 h-5" /> هدف مكتمل!
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => setIsDepositModalOpen(goal)}
                                                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 py-3 rounded-2xl flex items-center justify-center gap-2 text-white font-bold transition-all"
                                            >
                                                <ArrowUpIcon className="w-4 h-4" /> إضافة مبالغ
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modals */}
            {isAddModalOpen && (
                <Modal title="إنشاء هدف جديد" onClose={() => setIsAddModalOpen(false)}>
                    <form onSubmit={handleAddGoal} className="space-y-6">
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">ما هو هدفك؟</label>
                            <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="مثلاً: شراء سيارة" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-500" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">المبلغ المستهدف</label>
                            <input type="number" value={newTarget} onChange={e => setNewTarget(e.target.value)} placeholder="0.00" required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none focus:border-cyan-500" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">الأيقونة واللون</label>
                            <div className="flex gap-2 flex-wrap mb-4">
                                {GOAL_ICONS.map(i => (
                                    <button key={i.id} type="button" onClick={() => setNewIcon(i.id)} className={`p-3 rounded-xl border transition-all ${newIcon === i.id ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400' : 'bg-slate-800 border-transparent text-slate-500'}`}>
                                        <i.icon className="w-6 h-6" />
                                    </button>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                {COLORS.map(c => (
                                    <button key={c} type="button" onClick={() => setNewColor(c)} className={`w-8 h-8 rounded-full border-2 ${newColor === c ? 'border-white scale-110' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-bold shadow-lg shadow-cyan-900/20 transition hover:bg-cyan-500">إنشاء الهدف</button>
                    </form>
                </Modal>
            )}

            {isDepositModalOpen && (
                <Modal title={`إيداع في: ${isDepositModalOpen.name}`} onClose={() => setIsDepositModalOpen(null)}>
                    <form onSubmit={handleDeposit} className="space-y-6">
                        <div className="text-center">
                            <p className="text-xs text-slate-500 mb-2">أدخل المبلغ المراد ادخاره</p>
                            <input type="number" step="0.01" value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="0.00" autoFocus required className="w-full bg-transparent text-center text-5xl font-black text-white focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 mb-2 block">الخصم من حساب</label>
                            <select value={selectedAccountId} onChange={e => setSelectedAccountId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none">
                                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>)}
                            </select>
                        </div>
                        <button type="submit" className="w-full py-4 bg-white text-slate-900 rounded-2xl font-bold transition hover:bg-cyan-50">تأكيد الإيداع</button>
                    </form>
                </Modal>
            )}
        </div>
    );
};

export default SavingsGoalsPage;
