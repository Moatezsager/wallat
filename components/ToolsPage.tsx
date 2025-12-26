
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Contact } from '../types';
import { useToast } from './Toast';
import { 
    ShieldCheckIcon, EyeIcon, EyeOffIcon, UsersIcon, 
    ArrowTrendingUp, CurrencyDollarIcon, CheckCircleIcon,
    PlusIcon, XMarkIcon, ContactsIcon, ScaleIcon
} from './icons';
import { logActivity } from '../lib/logger';

interface ToolsPageProps {
    isStealthMode: boolean;
    toggleStealthMode: () => void;
    handleDatabaseChange: (description?: string) => void;
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل');
};

const ToolsPage: React.FC<ToolsPageProps> = ({ isStealthMode, toggleStealthMode, handleDatabaseChange }) => {
    const toast = useToast();
    const [billAmount, setBillAmount] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isSplitterOpen, setIsSplitterOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchContacts = async () => {
            const { data } = await supabase.from('contacts').select('*').order('name');
            if (data) setContacts(data as Contact[]);
        };
        fetchContacts();
    }, []);

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [contacts, searchTerm]);

    const perPerson = useMemo(() => {
        const total = Number(billAmount);
        const count = selectedContactIds.length;
        return count > 0 ? total / count : 0;
    }, [billAmount, selectedContactIds]);

    const handleSplitBill = async () => {
        if (!perPerson || selectedContactIds.length === 0) return;
        
        try {
            const debts = selectedContactIds.map(id => ({
                contact_id: id,
                amount: perPerson,
                type: 'for_you',
                description: `تقسيم فاتورة (إجمالي ${formatCurrency(Number(billAmount))})`,
                paid: false
            }));

            const { error } = await supabase.from('debts').insert(debts);
            if (error) throw error;

            logActivity(`تقسيم فاتورة بقيمة ${formatCurrency(Number(billAmount))} على ${selectedContactIds.length} أشخاص`);
            toast.success(`تم تحويل ${formatCurrency(perPerson)} إلى ديون لـ ${selectedContactIds.length} أشخاص`);
            
            // Reset
            setBillAmount('');
            setSelectedContactIds([]);
            setIsSplitterOpen(false);
            handleDatabaseChange();
        } catch (err) {
            toast.error('حدث خطأ أثناء تقسيم الفاتورة');
        }
    };

    const toggleContact = (id: string) => {
        setSelectedContactIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-8 pb-24 max-w-4xl mx-auto">
            {/* Header */}
            <div className="px-2">
                <h1 className="text-3xl font-black text-white mb-2">الأدوات الذكية</h1>
                <p className="text-slate-500 font-bold">أدوات متطورة لتحسين إدارتك المالية وخصوصيتك.</p>
            </div>

            {/* Stealth Mode Card */}
            <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 bg-slate-900/40 relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-20 pointer-events-none transition-colors ${isStealthMode ? 'bg-rose-500' : 'bg-emerald-500'}`}></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all ${isStealthMode ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                            <ShieldCheckIcon className="w-9 h-9" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white mb-1">رادار الخصوصية (Stealth)</h2>
                            <p className="text-slate-500 text-sm font-bold">إخفاء الأرقام والأرصدة بتموية ذكي عند التفعيل.</p>
                        </div>
                    </div>
                    <button 
                        onClick={toggleStealthMode}
                        className={`px-8 py-4 rounded-2xl font-black text-sm flex items-center gap-3 transition-all active:scale-95 shadow-xl ${isStealthMode ? 'bg-rose-600 text-white shadow-rose-900/30' : 'bg-emerald-600 text-white shadow-emerald-900/30'}`}
                    >
                        {isStealthMode ? <><EyeOffIcon className="w-5 h-5"/> وضع التخفي نشط</> : <><EyeIcon className="w-5 h-5"/> تفعيل وضع التخفي</>}
                    </button>
                </div>
            </div>

            {/* Bill Splitter Card */}
            <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 bg-slate-900/40 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 blur-[60px] opacity-10 pointer-events-none bg-indigo-500"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                            <UsersIcon className="w-9 h-9" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white mb-1">مقسم الفواتير الذكي</h2>
                            <p className="text-slate-500 text-sm font-bold">تقسيم التكاليف المشتركة وتحويلها لديون بضغطة واحدة.</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setIsSplitterOpen(true)}
                        className="px-8 py-4 rounded-2xl bg-white text-slate-900 font-black text-sm transition-all active:scale-95 shadow-xl shadow-white/5"
                    >
                        فتح الأداة
                    </button>
                </div>
            </div>

            {/* Analysis Stats (Teaser) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="glass-card rounded-3xl p-6 border border-white/5 bg-slate-900/40">
                    <div className="flex items-center gap-3 text-cyan-400 mb-4">
                        <ArrowTrendingUp className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">توقع الادخار القادم</span>
                    </div>
                    <p className="text-slate-500 text-sm font-bold leading-relaxed">أداة تحليل الأهداف: سيقوم التطبيق قريباً بتحليل سرعة ادخارك لإعطائك مواعيد دقيقة لتحقيق أحلامك.</p>
                </div>
                <div className="glass-card rounded-3xl p-6 border border-white/5 bg-slate-900/40">
                    <div className="flex items-center gap-3 text-amber-400 mb-4">
                        <CurrencyDollarIcon className="w-5 h-5" />
                        <span className="text-xs font-black uppercase tracking-widest">حاسبة القوة الشرائية</span>
                    </div>
                    <p className="text-slate-500 text-sm font-bold leading-relaxed">قريباً: قارن مشترياتك الكبيرة برصيدك الحالي لتعرف مدى تأثيرها الحقيقي على ميزانيتك الشهرية.</p>
                </div>
            </div>

            {/* Bill Splitter Modal */}
            {isSplitterOpen && (
                <div className="fixed inset-0 z-[110] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
                    <div className="relative w-full max-w-lg bg-slate-900 rounded-[2.5rem] shadow-2xl border border-white/10 flex flex-col max-h-[90vh] overflow-hidden animate-slide-up">
                        <div className="p-6 shrink-0 z-10 flex justify-between items-center border-b border-white/5">
                            <h3 className="text-xl font-black text-white">تقسيم فاتورة اجتماعية</h3>
                            <button onClick={() => setIsSplitterOpen(false)} className="p-2 bg-white/5 rounded-full text-slate-400"><XMarkIcon className="w-5 h-5" /></button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-8">
                            <div className="text-center space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">إجمالي مبلغ الفاتورة</label>
                                <input 
                                    type="number" 
                                    value={billAmount} 
                                    onChange={e => setBillAmount(e.target.value)} 
                                    placeholder="0" 
                                    autoFocus
                                    className="w-full bg-transparent text-center text-6xl font-black text-white focus:outline-none" 
                                />
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">اختر الأشخاص ({selectedContactIds.length})</label>
                                <div className="relative mb-2">
                                    <input 
                                        type="text" 
                                        placeholder="ابحث في الأسماء..." 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-cyan-500/50" 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-2 max-h-[30vh] overflow-y-auto no-scrollbar pr-1">
                                    {filteredContacts.map(c => {
                                        const isSelected = selectedContactIds.includes(c.id);
                                        return (
                                            <button 
                                                key={c.id} 
                                                onClick={() => toggleContact(c.id)}
                                                className={`p-3 rounded-2xl border transition-all text-right flex items-center gap-3 ${isSelected ? 'bg-cyan-500/10 border-cyan-500' : 'bg-slate-800/40 border-white/5 opacity-60'}`}
                                            >
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-slate-500'}`}>
                                                    {isSelected ? <CheckCircleIcon className="w-5 h-5"/> : <ContactsIcon className="w-5 h-5"/>}
                                                </div>
                                                <span className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-400'}`}>{c.name}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {selectedContactIds.length > 0 && (
                                <div className="bg-slate-800/80 p-6 rounded-[2rem] border border-white/5 text-center animate-fade-in">
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">نصيب الفرد الواحد</p>
                                    <p className="text-3xl font-black text-emerald-400">{formatCurrency(perPerson)}</p>
                                    <p className="text-[9px] text-slate-400 font-bold mt-2">سيتم إضافة هذا المبلغ كـ "دين لك" لكل شخص مختار.</p>
                                </div>
                            )}
                        </div>

                        <div className="p-6 border-t border-white/5">
                            <button 
                                onClick={handleSplitBill}
                                disabled={!perPerson || selectedContactIds.length === 0}
                                className="w-full py-4 bg-cyan-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-cyan-900/30 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all"
                            >
                                تأكيد وتحويل للديون
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ToolsPage;
