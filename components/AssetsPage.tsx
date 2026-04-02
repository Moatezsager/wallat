
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Asset } from '../types';
import { PlusIcon, ScaleIcon, XMarkIcon, TrashIcon, LandmarkIcon, CarIcon, HomeModernIcon, SmartphoneIcon } from './icons';
import { useToast } from './Toast';

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ar-LY', { style: 'currency', currency: 'LYD', minimumFractionDigits: 0 }).format(amount).replace('LYD', 'د.ل');
};

const ASSET_ICONS: Record<string, any> = {
    "عقار": HomeModernIcon,
    "سيارة": CarIcon,
    "ذهب": ScaleIcon,
    "أجهزة": SmartphoneIcon,
    "أخرى": LandmarkIcon
};

const AssetSkeleton = () => (
    <div className="glass-card p-5 rounded-3xl border border-white/5 flex items-center justify-between animate-pulse">
        <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-800 rounded-2xl"></div>
            <div className="space-y-2">
                <div className="h-4 w-24 bg-slate-800 rounded"></div>
                <div className="h-3 w-16 bg-slate-800/50 rounded"></div>
            </div>
        </div>
        <div className="h-6 w-20 bg-slate-800 rounded"></div>
    </div>
);

const AssetsPage: React.FC<{ refreshTrigger?: number }> = ({ refreshTrigger }) => {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const toast = useToast();

    // Form
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [value, setValue] = useState('');
    const [cat, setCat] = useState('أخرى');

    const fetchData = async () => {
        setLoading(true);
        const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
        setAssets(data || []);
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, [refreshTrigger]);

    const totalAssets = useMemo(() => assets.reduce((s, a) => s + a.current_value, 0), [assets]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('assets').insert({
            name, purchase_price: Number(price), current_value: Number(value) || Number(price), category: cat
        });
        if (!error) {
            toast.success('تمت إضافة الأصل');
            setShowModal(false);
            setName(''); setPrice(''); setValue('');
            fetchData();
        }
    };

    const handleDelete = async (id: string) => {
        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (!error) {
            toast.success('تم الحذف');
            fetchData();
        }
    };

    return (
        <div className="space-y-8 pb-20">
            <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 bg-slate-900/60 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-[60px]"></div>
                <div className="relative z-10">
                    <p className="text-slate-400 font-bold mb-1 text-xs uppercase tracking-widest">إجمالي قيمة ممتلكاتك</p>
                    {loading ? (
                        <div className="h-12 w-48 bg-slate-800 rounded-xl animate-pulse mt-2"></div>
                    ) : (
                        <h1 className="text-5xl font-black text-white">{formatCurrency(totalAssets)}</h1>
                    )}
                    <p className="text-slate-500 text-[10px] font-bold mt-2">القيمة التقديرية الحالية للأصول غير النقدية</p>
                </div>
            </div>

            <div className="flex justify-between items-center px-1">
                <h3 className="font-bold text-slate-400 text-sm">مقتنياتك</h3>
                <button onClick={() => setShowModal(true)} className="bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-xs shadow-lg hover:bg-slate-100 transition-colors">إضافة ممتلكات</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    [...Array(4)].map((_, i) => <AssetSkeleton key={i} />)
                ) : assets.length === 0 ? (
                    <div className="col-span-full py-20 text-center glass-card rounded-[2rem] border-dashed border-2 border-slate-800 bg-slate-900/20 text-slate-500">لا توجد أصول مسجلة.</div>
                ) : (
                    assets.map(a => {
                        const Icon = ASSET_ICONS[a.category] || LandmarkIcon;
                        return (
                            <div key={a.id} className="glass-card p-5 rounded-[2rem] border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all shadow-sm hover:shadow-xl hover:-translate-y-0.5">
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-slate-800 rounded-2xl flex items-center justify-center text-emerald-400 border border-white/5 shadow-inner group-hover:scale-110 transition-transform">
                                        <Icon className="w-7 h-7 drop-shadow-md" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm tracking-tight">{a.name}</h4>
                                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">قيمة الشراء: <span className="tabular-nums">{formatCurrency(a.purchase_price)}</span></p>
                                    </div>
                                </div>
                                <div className="text-left flex flex-col items-end gap-1">
                                    <p className="text-lg font-black text-white tabular-nums">{formatCurrency(a.current_value)}</p>
                                    <button onClick={() => handleDelete(a.id)} className="p-1.5 text-slate-600 hover:text-rose-500 hover:bg-white/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"><TrashIcon className="w-4 h-4"/></button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 bg-slate-950/90 flex items-center justify-center p-4 animate-fade-in">
                    <div className="glass-card bg-slate-900 w-full max-w-md p-6 rounded-[2.5rem] border border-white/10 animate-slide-up">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-white">إضافة ممتلكات جديدة</h3>
                            <button onClick={() => setShowModal(false)}><XMarkIcon className="w-6 h-6 text-slate-500"/></button>
                        </div>
                        <form onSubmit={handleAdd} className="space-y-4">
                            <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="اسم الغرض (مثلاً: سيارة تويوتا)" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none" />
                            <select value={cat} onChange={e => setCat(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none">
                                {Object.keys(ASSET_ICONS).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input type="number" value={price} onChange={e => setPrice(e.target.value)} required placeholder="سعر الشراء" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none" />
                            <input type="number" value={value} onChange={e => setValue(e.target.value)} placeholder="القيمة الحالية (اختياري)" className="w-full bg-slate-800 border border-slate-700 rounded-xl p-4 text-white focus:outline-none" />
                            <button type="submit" className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold shadow-xl active:scale-95 transition-all">حفظ في الممتلكات</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AssetsPage;
