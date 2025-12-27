
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
                        <div key={item.id} className={`glass-card p-4 rounded-3xl border border-white/5 flex items-center justify-between group transition-all ${item.is_bought ? 'opacity-50 grayscale' : ''}`}>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => !item.is_bought && setBuyItem(item)}
                                    className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${item.is_bought ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-700 hover:border-indigo-500'}`}
                                >
                                    {item.is_bought ? <CheckCircleIcon className="w-6 h-6" /> : <div className="w-2 h-2 rounded-full bg-slate-700" />}
                                </button>
                                <div>
                                    <h4 className={`font-bold text-white ${item.is_bought ? 'line-through text-slate-500' : ''}`}>{item.item_name}</h4>
                                    <div className="flex gap-2 items-center mt-1">
                                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                                            item.priority === 'high' ? 'bg-rose-500/20 text-rose-500' : 
                                            item.priority === 'medium' ? 'bg-amber-500/20 text-amber-500' : 'bg-slate-700 text-slate-400'
                                        }`}>
                                            {item.priority === 'high' ? 'عاجل' : item.priority === 'medium' ? 'متوسط' : 'عادي'}
                                        </span>
                                        {item.estimated_price && <span className="text-[10px] text-slate-500 font-bold">{formatCurrency(item.estimated_price)}</span>}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-700 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {showAddModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card bg-slate-900 w-full max-w-md p-6 rounded-[2.5rem] border border-white/10 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">إضافة غرض للقائمة</h3>
                            <button onClick={() => setShowAddModal(false)}><XMarkIcon className="w-6 h-6 text-slate-500"/></button>
                        </div>
                        <form onSubmit={handleAddItem} className="space-y-4">
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="ماذا تريد أن تشتري؟" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none" />
                            <div className="grid grid-cols-2 gap-4">
                                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="السعر المتوقع (اختياري)" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none" />
                                <select value={priority} onChange={e => setPriority(e.target.value as any)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white">
                                    <option value="high">عاجل جداً</option>
                                    <option value="medium">أهمية متوسطة</option>
                                    <option value="low">يمكن التأجيل</option>
                                </select>
                            </div>
                            <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold">إضافة للقائمة</button>
                        </form>
                    </div>
                </div>
            )}

            {buyItem && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card bg-slate-900 w-full max-w-md p-6 rounded-[2.5rem] border border-white/10 animate-slide-up">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircleIcon className="w-8 h-8 text-emerald-500" />
                            </div>
                            <h3 className="text-xl font-bold text-white">تأكيد شراء: {buyItem.item_name}</h3>
                            <p className="text-slate-500 text-xs mt-1">سيتم تحويل هذا الغرض إلى مصروف فعلي</p>
                        </div>
                        <form onSubmit={handleConfirmBuy} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase px-2 mb-1 block">الحساب المستخدم</label>
                                <select value={accId} onChange={e => setAccId(e.target.value)} required className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none">
                                    <option value="">اختر حساب...</option>
                                    {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase px-2 mb-1 block">الفئة</label>
                                <select value={catId} onChange={e => setCatId(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none">
                                    <option value="">بدون فئة</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="bg-slate-800/50 p-4 rounded-2xl text-center border border-white/5">
                                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">المبلغ المراد خصمه</p>
                                <p className="text-2xl font-black text-white">{formatCurrency(buyItem.estimated_price || 0)}</p>
                            </div>
                            <div className="flex gap-3">
                                <button type="button" onClick={() => setBuyItem(null)} className="flex-1 py-4 text-slate-400 font-bold">إلغاء</button>
                                <button type="submit" className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-lg">تأكيد الشراء</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShoppingListPage;
