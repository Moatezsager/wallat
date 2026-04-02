
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Investment } from '../types';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { 
    PlusIcon, XMarkIcon, SparklesIcon, TrashIcon, 
    ArrowTrendingUp, ArrowTrendingDown, WalletIcon, 
    BanknoteIcon, BriefcaseIcon, CurrencyDollarIcon, TagIcon
} from './icons';
import { logActivity } from '../lib/logger';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل');
};

const TYPE_CONFIG: Record<string, { icon: any, color: string, gradient: string }> = {
    "ذهب": { icon: BanknoteIcon, color: "#f59e0b", gradient: "from-amber-400 to-orange-600" },
    "أسهم": { icon: ArrowTrendingUp, color: "#3b82f6", gradient: "from-blue-400 to-indigo-600" },
    "عملات": { icon: CurrencyDollarIcon, color: "#10b981", gradient: "from-emerald-400 to-teal-600" },
    "مدخرات": { icon: WalletIcon, color: "#8b5cf6", gradient: "from-violet-400 to-purple-600" },
    "أخرى": { icon: TagIcon, color: "#64748b", gradient: "from-slate-400 to-slate-600" }
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-900 rounded-[2rem] p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-500"></div>
            <div className="flex justify-between items-center mb-6 relative z-10">
                <h3 className="text-xl font-black text-white">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors active:scale-90">
                    <XMarkIcon className="w-5 h-5 text-slate-400" />
                </button>
            </div>
            <div className="relative z-10">
                {children}
            </div>
        </div>
    </div>
);

const InvestmentForm: React.FC<{ onSuccess: () => void; onCancel: () => void; }> = ({ onSuccess, onCancel }) => {
    const [name, setName] = useState('');
    const [type, setType] = useState('ذهب');
    const [amount, setAmount] = useState('');
    const [currentValue, setCurrentValue] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const invData = { name, type, amount: Number(amount), current_value: Number(currentValue) || Number(amount) };
        const { error } = await supabase.from('investments').insert(invData);
        if (error) {
            toast.error('حدث خطأ أثناء الحفظ');
        } else {
            logActivity(`تسجيل استثمار جديد: ${name} بقيمة ${formatCurrency(Number(amount))}`);
            onSuccess();
        }
        setIsSaving(false);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
                <div className="relative group">
                    <input type="text" placeholder="اسم الاستثمار (مثلاً: سبيكة ذهب)" value={name} onChange={e => setName(e.target.value)} required className="w-full bg-slate-800/50 border border-white/5 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-cyan-500/50 transition-all" />
                </div>
                
                <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block px-1">نوع الاستثمار</label>
                    <div className="grid grid-cols-5 gap-2">
                        {Object.entries(TYPE_CONFIG).map(([t, config]) => {
                            const Icon = config.icon;
                            const isSelected = type === t;
                            return (
                                <button key={t} type="button" onClick={() => setType(t)} className={`p-2 rounded-2xl border transition-all flex flex-col items-center gap-2 ${isSelected ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-900/20' : 'bg-slate-800/30 border-white/5'}`}>
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isSelected ? 'text-white' : 'text-slate-400'}`} style={{ backgroundColor: isSelected ? config.color : 'transparent' }}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <span className={`text-[9px] font-bold ${isSelected ? 'text-white' : 'text-slate-400'}`}>{t}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">سعر الشراء</label>
                        <div className="flex items-center gap-2">
                            <input type="number" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)} required className="w-full bg-transparent text-white focus:outline-none font-black tabular-nums text-xl" />
                            <span className="text-sm font-bold text-cyan-600">د.ل</span>
                        </div>
                    </div>
                    <div className="bg-slate-900/50 p-4 rounded-2xl border border-white/5">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block px-1">القيمة الحالية</label>
                        <div className="flex items-center gap-2">
                            <input type="number" placeholder="0.00" value={currentValue} onChange={e => setCurrentValue(e.target.value)} className="w-full bg-transparent text-white focus:outline-none font-black tabular-nums text-xl" />
                            <span className="text-sm font-bold text-cyan-600">د.ل</span>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-lg active:scale-95 transition-all">إلغاء</button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSaving ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : 'حفظ الاستثمار'}
                </button>
            </div>
        </form>
    );
};

const InvestmentsPage: React.FC<{ refreshTrigger: number, handleDatabaseChange: (description?: string) => void }> = ({ refreshTrigger, handleDatabaseChange }) => {
    const [investments, setInvestments] = useState<Investment[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string, name: string }>({ isOpen: false, id: '', name: '' });
    const toast = useToast();

    const fetchInvestments = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('investments').select('*').order('created_at', { ascending: false });
        if (!error) setInvestments(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchInvestments(); }, [refreshTrigger]);

    const stats = useMemo(() => {
        const totalInvested = investments.reduce((s, i) => s + i.amount, 0);
        const totalCurrent = investments.reduce((s, i) => s + i.current_value, 0);
        return { totalInvested, totalCurrent, profit: totalCurrent - totalInvested };
    }, [investments]);

    const handleDelete = async () => {
        const { id, name } = deleteModal;
        const { error } = await supabase.from('investments').delete().eq('id', id);
        if (!error) {
            handleDatabaseChange(`تم حذف استثمار ${name}`);
            toast.success('تم الحذف بنجاح');
            fetchInvestments();
        }
        setDeleteModal({ isOpen: false, id: '', name: '' });
    };

    return (
        <div className="space-y-8 pb-24">
            {/* Header Card */}
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px]"></div>
                <div className="relative z-10">
                    <p className="text-slate-400 font-bold mb-2 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-cyan-400" /> إجمالي قيمة المحفظة الاستثمارية</p>
                    <h1 className="text-5xl font-black text-white">{formatCurrency(stats.totalCurrent)}</h1>
                    <div className="flex gap-4 mt-6">
                        <div className="bg-white/5 border border-white/5 px-4 py-2 rounded-xl">
                            <span className="text-xs text-slate-500 block">إجمالي المستثمر</span>
                            <span className="text-lg font-bold text-white">{formatCurrency(stats.totalInvested)}</span>
                        </div>
                        <div className={`px-4 py-2 rounded-xl border ${stats.profit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                            <span className="text-xs text-slate-500 block">الربح / الخسارة</span>
                            <span className={`text-lg font-bold ${stats.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {stats.profit >= 0 ? '+' : ''}{formatCurrency(stats.profit)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-800/50 rounded-3xl animate-pulse"></div>)}
                </div>
            ) : investments.length === 0 ? (
                <div className="text-center py-20 bg-slate-900/20 rounded-[2rem] border-2 border-dashed border-slate-800">
                    <p className="text-slate-500">لا توجد استثمارات مسجلة حالياً.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {investments.map(inv => {
                        const config = TYPE_CONFIG[inv.type] || TYPE_CONFIG["أخرى"];
                        const Icon = config.icon;
                        const profit = inv.current_value - inv.amount;
                        const profitPercent = (profit / inv.amount) * 100;

                        return (
                            <div key={inv.id} className="glass-card rounded-[2rem] p-6 border border-white/5 relative overflow-hidden group hover:border-white/10 transition-all shadow-sm hover:shadow-xl hover:-translate-y-1">
                                <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${config.gradient}`}></div>
                                <div className="absolute top-0 right-0 w-32 h-32 opacity-5 blur-3xl pointer-events-none transition-opacity group-hover:opacity-10" style={{ backgroundColor: config.color }}></div>
                                <div className="flex justify-between items-start mb-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-inner group-hover:scale-110 transition-transform" style={{ backgroundColor: config.color }}>
                                            <Icon className="w-5 h-5 drop-shadow-md" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white tracking-tight">{inv.name}</h3>
                                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{inv.type}</span>
                                        </div>
                                    </div>
                                    <button onClick={() => setDeleteModal({ isOpen: true, id: inv.id, name: inv.name })} className="p-2 text-slate-600 hover:text-rose-400 hover:bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">القيمة الحالية</p>
                                            <p className="text-2xl font-black text-white tabular-nums">{formatCurrency(inv.current_value)}</p>
                                        </div>
                                        <div className="text-left">
                                            <p className={`text-sm font-black tabular-nums ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                {profit >= 0 ? '+' : ''}{profitPercent.toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t border-white/5 flex justify-between text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                                        <span>سعر الشراء: <span className="tabular-nums">{formatCurrency(inv.amount)}</span></span>
                                        <span className="tabular-nums">{new Date(inv.created_at).toLocaleDateString('ar-LY')}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* FAB */}
            <button 
                onClick={() => setIsModalOpen(true)} 
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 h-16 w-16 bg-slate-900 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-300 border-4 border-slate-900 overflow-visible hover:scale-105 active:scale-95 group"
            >
                <div className="absolute inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <PlusIcon className="w-8 h-8 text-white transition-transform duration-300 group-hover:rotate-90"/>
                </div>
            </button>

            {isModalOpen && (
                <Modal title="إضافة استثمار جديد" onClose={() => setIsModalOpen(false)}>
                    <InvestmentForm onSuccess={() => { setIsModalOpen(false); handleDatabaseChange(); fetchInvestments(); }} onCancel={() => setIsModalOpen(false)} />
                </Modal>
            )}

            <ConfirmDialog 
                isOpen={deleteModal.isOpen} 
                title="حذف الاستثمار" 
                message={`هل أنت متأكد من حذف استثمار "${deleteModal.name}"؟`} 
                confirmText="نعم، حذف" 
                onConfirm={handleDelete} 
                onCancel={() => setDeleteModal({ isOpen: false, id: '', name: '' })} 
            />
        </div>
    );
};

export default InvestmentsPage;
