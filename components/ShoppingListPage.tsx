
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { ShoppingItem, Account, Category } from '../types';
import { PlusIcon, XMarkIcon, ShoppingBagIcon, TrashIcon, CheckCircleIcon, WalletIcon } from './icons';
import { useToast } from './Toast';
import { logActivity } from '../lib/logger';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل');
};

const ShoppingListPage: React.FC<{ refreshTrigger: number, handleDatabaseChange: (desc?: string) => void }> = ({ refreshTrigger, handleDatabaseChange }) => {
    const [items, setItems] = useState<ShoppingItem[]>([]);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [buyItem, setBuyItem] = useState<ShoppingItem | null>(null);
    const toast = useToast();

    // Form states
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [priority, setPriority] = useState<'high' | 'medium' | 'low'>('medium');
    
    // Buying form states
    const [accId, setAccId] = useState('');
    const [catId, setCatId] = useState('');

    const fetchData = async () => {
        setLoading(true);
        const [itemsRes, accsRes, catsRes] = await Promise.all([
            supabase.from('shopping_lists').select('*').order('is_bought', { ascending: true }).order('created_at', { ascending: false }),
            supabase.from('accounts').select('*').order('name'),
            supabase.from('categories').select('*').eq('type', 'expense').order('name')
        ]);
        setItems(itemsRes.data || []);
        setAccounts(accsRes.data || []);
        setCategories(catsRes.data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [refreshTrigger]);

    const handleAddItem = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('shopping_lists').insert({
            item_name: name, estimated_price: price ? Number(price) : null, priority
        });
        if (!error) {
            toast.success('تمت الإضافة للقائمة');
            setShowAddModal(false);
            setName(''); setPrice('');
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        await supabase.from('shopping_lists').delete().eq('id', id);
        fetchData();
    };

    const handleConfirmBuy = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!buyItem || !accId) return;

        const amount = buyItem.estimated_price || 0;
        
        // 1. Mark as bought
        await supabase.from('shopping_lists').update({ is_bought: true }).eq('id', buyItem.id);
        
        // 2. Create transaction if price exists
        if (amount > 0) {
            const { data: acc } = await supabase.from('accounts').select('balance').eq('id', accId).single();
            if (acc) {
                await supabase.from('accounts').update({ balance: acc.balance - amount }).eq('id', accId);
                await supabase.from('transactions').insert({
                    amount, type: 'expense', account_id: accId, category_id: catId || null,
                    notes: `شراء من القائمة: ${buyItem.item_name}`, date: new Date().toISOString()
                });
            }
        }

        logActivity(`إتمام شراء: ${buyItem.item_name}`);
        setBuyItem(null);
        handleDatabaseChange();
        fetchData();
        toast.success('تم تسجيل الشراء بنجاح');
    };

    return (
        <div className="space-y-6 pb-24">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-black text-white flex items-center gap-3">
                    <ShoppingBagIcon className="w-7 h-7 text-indigo-400" /> قائمة التسوق
                </h2>
                <button onClick={() => setShowAddModal(true)} className="p-3 bg-indigo-600 text-white rounded-xl shadow-lg active:scale-95 transition-all">
                    <PlusIcon className="w-5 h-5" />
                </button>
            </div>

            {loading ? <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-slate-800 animate-pulse rounded-2xl"></div>)}</div> : (
                <div className="space-y-3">
                    {items.map(item => (
                        <div key={item.id} className={`glass-card p-4 rounded-[2rem] border border-white/5 flex items-center justify-between group transition-all shadow-sm hover:shadow-xl hover:-translate-y-0.5 hover:border-white/10 ${item.is_bought ? 'opacity-50 grayscale' : ''}`}>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => !item.is_bought && setBuyItem(item)}
                                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${item.is_bought ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 hover:border-indigo-500 hover:scale-110'}`}
                                >
                                    {item.is_bought ? <CheckCircleIcon className="w-6 h-6 drop-shadow-md" /> : <div className="w-2 h-2 rounded-full bg-slate-700" />}
                                </button>
                                <div>
                                    <h4 className={`font-bold text-white text-sm ${item.is_bought ? 'line-through text-slate-500' : ''}`}>{item.item_name}</h4>
                                    <div className="flex gap-2 items-center mt-1">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                                            item.priority === 'high' ? 'bg-rose-500/20 text-rose-500' : 
                                            item.priority === 'medium' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-700 text-slate-400'
                                        }`}>
                                            {item.priority === 'high' ? 'عاجل' : item.priority === 'medium' ? 'متوسط' : 'عادي'}
                                        </span>
                                        {item.estimated_price && <span className="text-[10px] text-slate-500 font-bold tabular-nums">{formatCurrency(item.estimated_price)}</span>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-600 hover:text-rose-500 hover:bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
                    <div className="relative w-full max-w-md bg-slate-900 rounded-[2rem] shadow-2xl border border-white/10 p-8 animate-slide-up overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500"></div>
                        <div className="flex justify-between items-center mb-8 relative z-10">
                            <h3 className="text-2xl font-black text-white tracking-tight">إضافة غرض للقائمة</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-colors active:scale-90">
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddItem} className="space-y-5 relative z-10">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2 block">ماذا تريد أن تشتري؟</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="مثال: حليب، خبز..." className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2 block">السعر المتوقع (اختياري)</label>
                                    <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="0.00" className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold tabular-nums" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2 block">الأهمية</label>
                                    <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all font-bold appearance-none">
                                        <option value="high">عاجل جداً</option>
                                        <option value="medium">أهمية متوسطة</option>
                                        <option value="low">يمكن التأجيل</option>
                                    </select>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white rounded-2xl font-black shadow-lg shadow-indigo-900/20 transition-all active:scale-[0.98] mt-4">
                                إضافة للقائمة
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {buyItem && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in pt-safe pb-safe">
                    <div className="relative w-full max-w-md bg-slate-900 rounded-[2rem] shadow-2xl border border-white/10 p-8 animate-slide-up overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-teal-500"></div>
                        <div className="text-center mb-8 relative z-10">
                            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]">
                                <CheckCircleIcon className="w-10 h-10 text-emerald-400" />
                            </div>
                            <h3 className="text-2xl font-black text-white tracking-tight mb-2">تأكيد شراء</h3>
                            <p className="text-emerald-400 font-bold text-lg">{buyItem.item_name}</p>
                            <p className="text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-widest">سيتم تحويل هذا الغرض إلى مصروف فعلي</p>
                        </div>
                        <form onSubmit={handleConfirmBuy} className="space-y-5 relative z-10">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2 block">الحساب المستخدم</label>
                                <select value={accId} onChange={e => setAccId(e.target.value)} required className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-bold appearance-none">
                                    <option value="">اختر حساب...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2 block">الفئة</label>
                                <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full bg-slate-950/50 border border-white/10 rounded-2xl p-4 text-white focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/50 transition-all font-bold appearance-none">
                                    <option value="">بدون فئة</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="bg-slate-950/50 p-5 rounded-2xl text-center border border-white/10">
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-2">المبلغ المراد خصمه</p>
                                <p className="text-3xl font-black text-white tabular-nums">{formatCurrency(buyItem.estimated_price || 0)}</p>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setBuyItem(null)} className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-2xl font-bold transition-all active:scale-[0.98]">إلغاء</button>
                                <button type="submit" className="flex-[2] py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-2xl font-black shadow-lg shadow-emerald-900/20 transition-all active:scale-[0.98]">تأكيد الشراء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShoppingListPage;
