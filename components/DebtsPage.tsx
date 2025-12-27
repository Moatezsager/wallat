
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Debt, Contact, Account, DebtPayment } from '../types';
import { useToast } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import { 
    PlusIcon, PencilSquareIcon, TrashIcon, CheckCircleIcon, ExclamationTriangleIcon, XMarkIcon, 
    ContactsIcon, CalendarDaysIcon, WhatsappIcon, WalletIcon, ArrowRightIcon, ClockIcon,
    ChevronDownIcon, ChevronUpIcon, ArrowDownIcon, ArrowUpIcon, ScaleIcon, SparklesIcon
} from './icons';
import { logActivity } from '../lib/logger';

const formatCurrency = (amount: number) => { 
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل'); 
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => ( 
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe"> 
        <div className="glass-card bg-slate-900 rounded-[2.5rem] p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up overflow-hidden relative"> 
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="flex justify-between items-center mb-6 relative z-10"> 
                <h3 className="text-xl font-bold text-white">{title}</h3> 
                <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"><XMarkIcon className="w-5 h-5 text-slate-400" /></button> 
            </div> 
            <div className="relative z-10">{children}</div>
        </div> 
    </div> 
);

const InstallmentModal: React.FC<{ 
    debt: Debt, 
    accounts: Account[], 
    onSuccess: () => void, 
    onCancel: () => void 
}> = ({ debt, accounts, onSuccess, onCancel }) => {
    const [mode, setMode] = useState<'months' | 'amount'>('months');
    const [months, setMonths] = useState('3');
    const [customAmount, setCustomAmount] = useState('');
    const [accId, setAccId] = useState(accounts[0]?.id || '');
    const [isSaving, setIsSaving] = useState(false);
    const toast = useToast();

    const calculatedAmount = useMemo(() => {
        if (mode === 'amount') return Number(customAmount);
        const m = parseInt(months) || 1;
        return debt.amount / m;
    }, [debt.amount, months, customAmount, mode]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (calculatedAmount <= 0 || calculatedAmount > debt.amount + 0.1) return toast.error('مبلغ غير صحيح');
        
        setIsSaving(true);
        try {
            await supabase.from('debt_payments').insert({
                debt_id: debt.id, amount: calculatedAmount, account_id: accId, payment_date: new Date().toISOString()
            });

            const { data: acc } = await supabase.from('accounts').select('balance').eq('id', accId).single();
            if (acc) {
                const sign = debt.type === 'on_you' ? -1 : 1;
                await supabase.from('accounts').update({ balance: acc.balance + (calculatedAmount * sign) }).eq('id', accId);
            }

            const newRemaining = debt.amount - calculatedAmount;
            const isFullyPaid = newRemaining <= 0.1;
            await supabase.from('debts').update({ 
                amount: Math.max(0, newRemaining), 
                paid: isFullyPaid, 
                paid_at: isFullyPaid ? new Date().toISOString() : null 
            }).eq('id', debt.id);

            await supabase.from('transactions').insert({
                account_id: accId,
                amount: calculatedAmount,
                type: debt.type === 'on_you' ? 'expense' : 'income',
                notes: `دفع قسط لدين: ${debt.description || 'بدون وصف'} (${debt.contacts?.name})`,
                date: new Date().toISOString()
            });

            logActivity(`تسجيل قسط بقيمة ${formatCurrency(calculatedAmount)} لـ ${debt.contacts?.name}`);
            onSuccess();
        } catch (err) {
            toast.error('حدث خطأ أثناء المعالجة');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex bg-slate-800 p-1 rounded-2xl mb-2 shadow-inner">
                <button type="button" onClick={() => setMode('months')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === 'months' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500'}`}>خطة أشهر</button>
                <button type="button" onClick={() => setMode('amount')} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${mode === 'amount' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-500'}`}>مبلغ يدوي</button>
            </div>

            <div className="text-center bg-slate-800/40 p-6 rounded-3xl border border-white/5 relative overflow-hidden">
                <p className="text-[10px] text-slate-500 font-black mb-2 uppercase tracking-widest">المبلغ المستحق للدفع</p>
                <div className="flex items-center justify-center gap-2">
                    {mode === 'months' ? (
                        <span className="text-4xl font-black text-cyan-400 tabular-nums">{formatCurrency(calculatedAmount)}</span>
                    ) : (
                        <div className="flex items-center gap-2">
                             <input type="number" step="0.01" value={customAmount} onChange={e => setCustomAmount(e.target.value)} required placeholder="0.00" className="w-full bg-transparent text-center text-5xl font-black text-cyan-400 focus:outline-none" />
                             <span className="text-xl font-bold text-cyan-600">د.ل</span>
                        </div>
                    )}
                </div>
                {mode === 'months' && (
                    <div className="mt-6 space-y-3">
                        <label className="text-[10px] text-slate-500 font-black uppercase tracking-widest">مدة التقسيط (أشهر)</label>
                        <div className="flex items-center justify-center gap-6">
                            <button type="button" onClick={() => setMonths(Math.max(1, parseInt(months)-1).toString())} className="w-12 h-12 rounded-2xl bg-slate-700 text-white text-2xl font-black transition-transform active:scale-90">-</button>
                            <span className="text-3xl font-black text-white w-12">{months}</span>
                            <button type="button" onClick={() => setMonths((parseInt(months)+1).toString())} className="w-12 h-12 rounded-2xl bg-slate-700 text-white text-2xl font-black transition-transform active:scale-90">+</button>
                        </div>
                    </div>
                )}
            </div>

            <div>
                <label className="text-xs font-bold text-slate-500 block mb-2 px-1">الحساب المالي للعملية</label>
                <select value={accId} onChange={e => setAccId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none">
                    {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                </select>
            </div>

            <button type="submit" disabled={isSaving} className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                {isSaving ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <><CheckCircleIcon className="w-6 h-6" /> تأكيد الدفعة</>}
            </button>
        </form>
    );
};

const DebtItem: React.FC<{ 
    debt: Debt, 
    onInstall: (d: Debt) => void, 
    onSettle: (d: Debt) => void,
    onSelectContact: (id: string) => void 
}> = ({ debt, onInstall, onSettle, onSelectContact }) => {
    const [showHistory, setShowHistory] = useState(false);
    const isForYou = debt.type === 'for_you';
    
    const paymentsSum = debt.payments?.reduce((s, p) => s + p.amount, 0) || 0;
    const totalOriginal = paymentsSum + debt.amount;
    const progress = totalOriginal > 0 ? (paymentsSum / totalOriginal) * 100 : 0;

    const handleWhatsApp = (e: React.MouseEvent) => {
        e.stopPropagation();
        
        const name = debt.contacts?.name || '';
        const remaining = formatCurrency(debt.amount);
        const registrationDate = new Date(debt.created_at).toLocaleDateString('ar-LY');
        const dueDateText = debt.due_date ? `الموعد المتفق عليه للسداد: ${new Date(debt.due_date).toLocaleDateString('ar-LY')}` : '';
        
        let message = `مرحباً ${name}، أتمنى أن تكون بخير.\n\n`;
        message += `تذكير ودي بخصوص المتبقي من الذمة المالية المسجلة بتاريخ ${registrationDate}.\n`;
        message += `المبلغ المتبقي حالياً: *${remaining}*.\n`;
        if (dueDateText) message += `${dueDateText}.\n`;
        message += `\nشكراً لك وتمنياتي بيوم سعيد.`;

        const encodedMsg = encodeURIComponent(message);
        const phone = debt.contacts?.phone ? debt.contacts.phone.replace(/\D/g,'') : '';
        
        // إذا لم يوجد رقم، يفتح واتساب ليختار المستخدم جهة الاتصال يدوياً
        const url = phone ? `https://wa.me/${phone}?text=${encodedMsg}` : `https://wa.me/?text=${encodedMsg}`;
        window.open(url, '_blank');
    };

    return (
        <div className={`glass-card p-5 rounded-[2.5rem] border border-white/5 transition-all relative overflow-hidden group ${debt.paid ? 'opacity-40 grayscale' : 'hover:border-white/10 shadow-lg'}`}>
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div className="flex items-center gap-4">
                    <button onClick={() => debt.contact_id && onSelectContact(debt.contact_id)} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white border border-white/10 active:scale-90 transition-transform ${isForYou ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                        <span className="text-xl font-black">{debt.contacts?.name?.charAt(0) || '?'}</span>
                    </button>
                    <div>
                        <h4 className="font-black text-white text-lg leading-tight">{debt.contacts?.name || 'غير معروف'}</h4>
                        <div className="flex items-center gap-2 mt-1">
                             <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${isForYou ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                {isForYou ? 'تحصيل لك' : 'سداد عليك'}
                            </span>
                            {debt.due_date && <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1"><ClockIcon className="w-3 h-3"/> {new Date(debt.due_date).toLocaleDateString('ar-LY')}</span>}
                        </div>
                    </div>
                </div>
                <div className="text-left">
                    <p className={`text-2xl font-black tabular-nums ${isForYou ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {formatCurrency(debt.amount)}
                    </p>
                    <p className="text-[10px] text-slate-500 font-bold max-w-[120px] truncate">{debt.description || 'بدون وصف'}</p>
                </div>
            </div>

            {/* Progress Bar */}
            {!debt.paid && (
                <div className="mb-5 space-y-1.5">
                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">
                        <span>النسبة المسددة: {progress.toFixed(0)}%</span>
                        <span>إجمالي الدين: {formatCurrency(totalOriginal)}</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden border border-white/5 shadow-inner">
                        <div className={`h-full rounded-full transition-all duration-1000 ${isForYou ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            <div className="flex gap-2 pt-2 border-t border-white/5 relative z-10">
                {!debt.paid ? (
                    <>
                        <button onClick={handleWhatsApp} className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-900/30 active:scale-95 transition-all flex items-center justify-center group/wa" title="إرسال تذكير ذكي">
                            <WhatsappIcon className="w-6 h-6 group-hover/wa:scale-110 transition-transform" />
                        </button>
                        <button onClick={() => onInstall(debt)} className="flex-1 py-3 bg-cyan-600/10 hover:bg-cyan-600/20 text-cyan-400 rounded-2xl text-[11px] font-black transition-all border border-cyan-500/20">تقسيط</button>
                        <button onClick={() => onSettle(debt)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl text-[11px] font-black transition-all border border-white/5">دفع كامل</button>
                    </>
                ) : (
                    <div className="w-full py-2.5 bg-emerald-500/10 rounded-2xl text-center text-xs font-black text-emerald-500 flex items-center justify-center gap-2">
                        <CheckCircleIcon className="w-5 h-5" /> تمت التسوية بنجاح
                    </div>
                )}
                
                <button onClick={() => setShowHistory(!showHistory)} className={`p-3 rounded-2xl transition-all ${showHistory ? 'bg-white/10 text-white' : 'bg-white/5 text-slate-500 hover:text-white'}`}>
                    {showHistory ? <ChevronUpIcon className="w-5 h-5" /> : <ChevronDownIcon className="w-5 h-5" />}
                </button>
            </div>

            {/* Payments History */}
            {showHistory && (
                <div className="mt-4 space-y-2 animate-fade-in border-t border-white/5 pt-4">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-2 mb-2">سجل الأقساط المسددة</p>
                    {debt.payments && debt.payments.length > 0 ? debt.payments.map(p => (
                        <div key={p.id} className="bg-black/20 p-3 rounded-2xl flex justify-between items-center border border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-500">
                                    <CalendarDaysIcon className="w-4 h-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-300">{new Date(p.payment_date).toLocaleDateString('ar-LY')}</p>
                                    <p className="text-[9px] text-slate-500">{p.accounts?.name || 'حساب غير معروف'}</p>
                                </div>
                            </div>
                            <span className="text-sm font-black text-cyan-400 tabular-nums">{formatCurrency(p.amount)}</span>
                        </div>
                    )) : (
                        <p className="text-[10px] text-center text-slate-700 py-6 italic border-2 border-dashed border-white/5 rounded-2xl">لا يوجد أقساط مسجلة بعد</p>
                    )}
                </div>
            )}
        </div>
    );
};

const DebtsPage: React.FC<{ refreshTrigger: number, handleDatabaseChange: (description?: string) => void, onSelectContact: (contactId: string) => void }> = ({ refreshTrigger, handleDatabaseChange, onSelectContact }) => {
    const [debts, setDebts] = useState<Debt[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'on_you' | 'for_you'>('for_you');
    const [installmentDebt, setInstallmentDebt] = useState<Debt | null>(null);
    const [settleDebt, setSettleDebt] = useState<Debt | null>(null);
    const toast = useToast();

    const fetchData = async () => {
        setLoading(true);
        const [dRes, aRes] = await Promise.all([
            supabase.from('debts').select('*, contacts(*), accounts(name), payments:debt_payments(*, accounts(name))').order('due_date'),
            supabase.from('accounts').select('*')
        ]);
        setDebts(dRes.data as unknown as Debt[] || []);
        setAccounts(aRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [refreshTrigger]);

    const stats = useMemo(() => {
        const active = debts.filter(d => !d.paid);
        return {
            forYou: active.filter(d => d.type === 'for_you').reduce((s, d) => s + d.amount, 0),
            onYou: active.filter(d => d.type === 'on_you').reduce((s, d) => s + d.amount, 0)
        };
    }, [debts]);

    const handleSettleFull = async () => {
        if (!settleDebt) return;
        const accId = accounts[0]?.id;
        if (!accId) return toast.error('يرجى إضافة حساب مالي أولاً لإتمام التسوية');

        try {
            await supabase.from('debts').update({ amount: 0, paid: true, paid_at: new Date().toISOString() }).eq('id', settleDebt.id);
            const { data: acc } = await supabase.from('accounts').select('balance').eq('id', accId).single();
            if (acc) {
                const sign = settleDebt.type === 'on_you' ? -1 : 1;
                await supabase.from('accounts').update({ balance: acc.balance + (settleDebt.amount * sign) }).eq('id', accId);
            }
            await supabase.from('transactions').insert({
                account_id: accId, amount: settleDebt.amount, type: settleDebt.type === 'on_you' ? 'expense' : 'income',
                notes: `إغلاق كامل لذمة مالية: ${settleDebt.description || 'بدون وصف'}`,
                date: new Date().toISOString()
            });
            logActivity(`إغلاق ذمة مالية بالكامل لـ ${settleDebt.contacts?.name}`);
            setSettleDebt(null);
            handleDatabaseChange();
            fetchData();
            toast.success('تم تسوية الذمة المالية بالكامل');
        } catch (err) {
            toast.error('خطأ غير متوقع أثناء التسوية');
        }
    };

    return (
        <div className="space-y-8 pb-32 max-w-4xl mx-auto px-1">
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setActiveTab('for_you')} className={`p-6 rounded-[2.5rem] border transition-all relative overflow-hidden group ${activeTab === 'for_you' ? 'bg-emerald-500/10 border-emerald-500/50 shadow-xl' : 'bg-slate-900/50 border-white/5 opacity-60'}`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-3xl rounded-full"></div>
                    <p className="text-[11px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2"><ArrowDownIcon className="w-4 h-4 text-emerald-500" /> ديون لك</p>
                    <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{formatCurrency(stats.forYou)}</p>
                </button>
                <button onClick={() => setActiveTab('on_you')} className={`p-6 rounded-[2.5rem] border transition-all relative overflow-hidden group ${activeTab === 'on_you' ? 'bg-rose-500/10 border-rose-500/50 shadow-xl' : 'bg-slate-900/50 border-white/5 opacity-60'}`}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-3xl rounded-full"></div>
                    <p className="text-[11px] font-black text-slate-500 uppercase mb-2 flex items-center gap-2"><ArrowUpIcon className="w-4 h-4 text-rose-500" /> ديون عليك</p>
                    <p className="text-3xl font-black text-white tabular-nums tracking-tighter">{formatCurrency(stats.onYou)}</p>
                </button>
            </div>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-44 bg-white/5 rounded-[2.5rem] animate-pulse border border-white/5"></div>)}
                </div>
            ) : (
                <div className="space-y-5">
                    {debts.filter(d => d.type === activeTab).length === 0 ? (
                        <div className="py-24 text-center glass-card rounded-[3rem] border-2 border-dashed border-slate-800 bg-slate-900/20">
                             <div className="w-20 h-20 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <CheckCircleIcon className="w-10 h-10 text-slate-700 opacity-20" />
                            </div>
                            <p className="text-slate-600 font-bold text-lg">لا توجد سجلات نشطة حالياً</p>
                        </div>
                    ) : (
                        debts.filter(d => d.type === activeTab).map(debt => (
                            <DebtItem 
                                key={debt.id} 
                                debt={debt} 
                                onInstall={setInstallmentDebt} 
                                onSettle={setSettleDebt}
                                onSelectContact={onSelectContact} 
                            />
                        ))
                    )}
                </div>
            )}

            {installmentDebt && (
                <Modal title="مساعد التقسيط المتقدم" onClose={() => setInstallmentDebt(null)}>
                    <InstallmentModal 
                        debt={installmentDebt} 
                        accounts={accounts} 
                        onSuccess={() => { setInstallmentDebt(null); handleDatabaseChange(); fetchData(); }} 
                        onCancel={() => setInstallmentDebt(null)} 
                    />
                </Modal>
            )}

            <ConfirmDialog 
                isOpen={!!settleDebt}
                title="تسوية كاملة للمبلغ"
                message={`هل أنت متأكد من رغبتك في إغلاق كامل الذمة لـ "${settleDebt?.contacts?.name}"؟ سيتم تسجيل مبلغ (${formatCurrency(settleDebt?.amount || 0)}) في حسابك المالي.`}
                confirmText="نعم، إغلاق الآن"
                onConfirm={handleSettleFull}
                onCancel={() => setSettleDebt(null)}
            />
        </div>
    );
};

export default DebtsPage;
