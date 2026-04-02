
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { 
    PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, 
    iconMap, CurrencyDollarIcon, MagnifyingGlassIcon,
    UtensilsIcon, CarIcon, ShoppingBagIcon, HomeModernIcon, HeartPulseIcon,
    SmartphoneIcon, WifiIcon, ZapIcon, BriefcaseIcon, PlaneIcon,
    Gamepad2Icon, GraduationCapIcon, ShirtIcon, GiftIcon, FuelIcon,
    ShoppingCartIcon, CoffeeIcon, ReceiptIcon, BusIcon, MovieIcon, SaladIcon, ShirtIcon2, PlaneIcon2, TrophyIcon
} from './icons';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from './Toast';

const FINANCE_ICONS = [ 
    { name: 'UtensilsIcon', label: 'طعام' }, 
    { name: 'SaladIcon', label: 'صحة' },
    { name: 'CoffeeIcon', label: 'مقهى' },
    { name: 'ShoppingCartIcon', label: 'تسوق' }, 
    { name: 'ShoppingBagIcon', label: 'أكياس' }, 
    { name: 'ReceiptIcon', label: 'فواتير' },
    { name: 'CarIcon', label: 'سيارة' }, 
    { name: 'BusIcon', label: 'حافلة' },
    { name: 'PlaneIcon2', label: 'سفر' },
    { name: 'FuelIcon', label: 'وقود' }, 
    { name: 'HomeModernIcon', label: 'منزل' }, 
    { name: 'ZapIcon', label: 'كهرباء' }, 
    { name: 'WifiIcon', label: 'انترنت' }, 
    { name: 'SmartphoneIcon', label: 'هاتف' }, 
    { name: 'MovieIcon', label: 'سينما' },
    { name: 'Gamepad2Icon', label: 'ترفيه' }, 
    { name: 'ShirtIcon2', label: 'ملابس' }, 
    { name: 'GraduationCapIcon', label: 'تعليم' },
    { name: 'TrophyIcon', label: 'رياضة' },
    { name: 'BriefcaseIcon', label: 'عمل' }, 
    { name: 'CurrencyDollarIcon', label: 'مال' }, 
    { name: 'BanknoteIcon', label: 'نقدي' }, 
    { name: 'GiftIcon', label: 'هدايا' }, 
    { name: 'TagIcon', label: 'عام' } 
];

const MODERN_COLORS = [ 
    '#10b981', '#059669', '#3b82f6', '#2563eb', '#06b6d4', '#0891b2', 
    '#8b5cf6', '#7c3aed', '#d946ef', '#f43f5e', '#ef4444', '#f97316', 
    '#f59e0b', '#eab308', '#64748b' 
];

const IconPicker: React.FC<{ selectedIcon: string; onSelect: (iconName: string) => void; }> = ({ selectedIcon, onSelect }) => { 
    return ( 
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 bg-slate-800 p-4 rounded-2xl max-h-56 overflow-y-auto custom-scrollbar border border-white/5 shadow-inner"> 
            {FINANCE_ICONS.map(({ name, label }) => { 
                const Icon = iconMap[name] || CurrencyDollarIcon; 
                const isSelected = selectedIcon === name; 
                return ( 
                    <button key={name} type="button" onClick={() => onSelect(name)} className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200 group ${isSelected ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30 scale-105' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`} > 
                        <Icon className={`w-6 h-6 mb-1 ${isSelected ? 'animate-pulse-slow' : ''}`} /> 
                        <span className="text-[10px] font-medium opacity-80">{label}</span> 
                    </button> 
                ); 
            })} 
        </div> 
    ); 
};

const ColorPicker: React.FC<{ selectedColor: string; onSelect: (color: string) => void; }> = ({ selectedColor, onSelect }) => { 
    return ( 
        <div className="flex flex-wrap gap-3 justify-center p-2"> 
            {MODERN_COLORS.map(color => ( 
                <button key={color} type="button" onClick={() => onSelect(color)} style={{ backgroundColor: color }} className={`w-9 h-9 rounded-full transition-all duration-300 transform hover:scale-110 shadow-md ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110 shadow-lg' : 'opacity-80 hover:opacity-100'}`} /> 
            ))} 
        </div> 
    ); 
};

const CategoryFormModal: React.FC<{ category?: Category | null; type: 'income' | 'expense'; onSave: () => void; onCancel: () => void; }> = ({ category, type, onSave, onCancel }) => { 
    const [name, setName] = useState(category?.name || ''); 
    const [color, setColor] = useState(category?.color || MODERN_COLORS[0]); 
    const [icon, setIcon] = useState(category?.icon || 'TagIcon'); 
    const [isSaving, setIsSaving] = useState(false); 
    
    const handleSubmit = async (e: React.FormEvent) => { 
        e.preventDefault(); 
        setIsSaving(true); 
        const categoryData = { name, color, icon, type }; 
        const { error } = category?.id ? await supabase.from('categories').update(categoryData).eq('id', category.id) : await supabase.from('categories').insert(categoryData); 
        if (error) { 
            console.error('Error saving category:', error.message); 
            alert('حدث خطأ'); 
        } else { 
            onSave(); 
        } 
        setIsSaving(false); 
    }; 
    
    const IconComponent = iconMap[icon] || CurrencyDollarIcon; 
    
    return ( 
        <form onSubmit={handleSubmit} className="space-y-6"> 
            <div className="flex items-center gap-4 bg-gradient-to-r from-slate-800 to-slate-800/50 p-5 rounded-2xl border border-white/5 relative overflow-hidden group"> 
                <div className="absolute inset-0 opacity-20 transition-opacity duration-500" style={{ backgroundColor: color }}></div> 
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-xl transition-transform duration-300 transform group-hover:scale-105 shrink-0" style={{ backgroundColor: color }}> 
                    <IconComponent className="w-8 h-8 text-white drop-shadow-md" /> 
                </div> 
                <div className="flex-grow z-10"> 
                    <label className="text-xs text-slate-400 font-bold mb-1 block">اسم الفئة</label> 
                    <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: مطاعم، راتب..." required className="w-full bg-transparent border-b-2 border-slate-600 focus:border-white p-1 text-white text-xl font-bold focus:outline-none transition-colors placeholder-slate-600/50" /> 
                </div> 
            </div> 
            <div> 
                <label className="block text-sm font-bold text-slate-400 mb-3 px-1">اختر الأيقونة</label> 
                <IconPicker selectedIcon={icon} onSelect={setIcon} /> 
            </div> 
            <div> 
                <label className="block text-sm font-bold text-slate-400 mb-3 px-1">لون التمييز</label> 
                <ColorPicker selectedColor={color} onSelect={setColor} /> 
            </div> 
            <div className="flex gap-3 pt-4">
                <button type="button" onClick={onCancel} className="flex-1 py-4 bg-slate-800 text-slate-400 rounded-2xl font-black text-lg active:scale-95 transition-all">إلغاء</button>
                <button type="submit" disabled={isSaving} className="flex-[2] py-4 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-2xl font-black text-lg shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50">
                    {isSaving ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : (category ? 'حفظ التعديلات' : 'إنشاء الفئة')}
                </button>
            </div>
        </form> 
    ); 
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

const CategoryCard: React.FC<{ category: Category; onEdit: () => void; onDelete: () => void; }> = ({ category, onEdit, onDelete }) => { 
    const Icon = (category.icon && iconMap[category.icon]) ? iconMap[category.icon] : CurrencyDollarIcon; 
    const cardColor = category.color || '#334155';
    return ( 
        <div className="relative group overflow-hidden rounded-[2rem] transition-all duration-300 hover:-translate-y-1 shadow-sm hover:shadow-xl bg-slate-900/40 border border-white/5 hover:border-white/10 glass-card"> 
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 bg-gradient-to-br from-transparent to-white" style={{ background: `linear-gradient(135deg, ${cardColor}10 0%, transparent 100%)` }}></div> 
            <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10 transition-transform duration-500 group-hover:scale-150" style={{ backgroundColor: cardColor }}></div> 
            <div className="p-5 flex flex-col items-center text-center relative z-10 h-full"> 
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3" style={{ backgroundColor: cardColor }} > 
                    <Icon className="w-7 h-7 text-white drop-shadow-md" /> 
                </div> 
                <h3 className="font-bold text-white text-sm mb-1 truncate w-full tracking-tight">{category.name}</h3> 
                <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0"> 
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 rounded-xl bg-slate-800/90 text-cyan-400 hover:bg-cyan-500 hover:text-white transition shadow-lg backdrop-blur-sm"><PencilSquareIcon className="w-4 h-4"/></button> 
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 rounded-xl bg-slate-800/90 text-rose-400 hover:bg-rose-500 hover:text-white transition shadow-lg backdrop-blur-sm"><TrashIcon className="w-4 h-4"/></button> 
                </div> 
            </div> 
        </div> 
    ); 
};


const CategoriesPage: React.FC<{ refreshTrigger: number, handleDatabaseChange: (description?: string) => void }> = ({ refreshTrigger, handleDatabaseChange }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [searchTerm, setSearchTerm] = useState('');
    const [modal, setModal] = useState<{ type: 'add' | 'edit' | 'delete' | null, category: Category | null }>({ type: null, category: null });
    const toast = useToast();

    const fetchCategories = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase.from('categories').select('*').order('name');
        if (error) {
            console.error('Error fetching categories:', error.message);
        } else {
            setCategories(data as unknown as Category[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories, refreshTrigger]);

    const handleSave = () => {
        const description = modal.category ? `تم تحديث فئة "${modal.category.name}" بنجاح` : 'تم إنشاء الفئة الجديدة بنجاح';
        setModal({ type: null, category: null });
        handleDatabaseChange(description);
        toast.success(description);
    };

    const handleDelete = async () => {
        if (!modal.category) return;
        const { error } = await supabase.from('categories').delete().eq('id', modal.category.id);
        if (error) {
            console.error('Error deleting category:', error.message);
            toast.error('لا يمكن حذف الفئة لأنها مرتبطة بمعاملات سابقة. قم بتعديل المعاملات أولاً.');
        } else {
            handleDatabaseChange(`تم حذف فئة "${modal.category.name}" بنجاح`);
            toast.success("تم الحذف");
            setModal({ type: null, category: null });
        }
    };

    const filteredCategories = useMemo(() => {
        return categories.filter(c => 
            c.type === activeTab && 
            (searchTerm === '' || c.name.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [categories, activeTab, searchTerm]);

    const counts = useMemo(() => ({
        expense: categories.filter(c => c.type === 'expense').length,
        income: categories.filter(c => c.type === 'income').length
    }), [categories]);

    return (
        <div className="relative pb-24">
            {/* Search Bar */}
            <div className="relative mb-6 group">
                <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors pointer-events-none" />
                <input
                    type="text"
                    placeholder="ابحث عن فئة..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-900/50 p-3.5 pr-12 rounded-2xl text-white border border-slate-700 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 focus:outline-none transition shadow-inner"
                />
            </div>

            {/* Custom Tabs */}
            <div className="glass-card p-1.5 rounded-2xl flex mb-8 shadow-lg bg-slate-900/60 backdrop-blur-md">
                <button 
                    onClick={() => setActiveTab('expense')} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden ${activeTab === 'expense' ? 'text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    {activeTab === 'expense' && <div className="absolute inset-0 bg-gradient-to-r from-rose-500 to-pink-600 opacity-100 rounded-xl"></div>}
                    <span className="relative z-10">المصروفات</span>
                    <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'expense' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>{counts.expense}</span>
                </button>
                <button 
                    onClick={() => setActiveTab('income')} 
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-300 relative overflow-hidden ${activeTab === 'income' ? 'text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                >
                    {activeTab === 'income' && <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-teal-600 opacity-100 rounded-xl"></div>}
                    <span className="relative z-10">الإيرادات</span>
                    <span className={`relative z-10 text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === 'income' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}`}>{counts.income}</span>
                </button>
            </div>

            {/* Grid */}
            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-40 bg-slate-800/50 rounded-2xl animate-pulse border border-white/5"></div>)}
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="text-center py-20 glass-card rounded-[2rem] border-dashed border-2 border-slate-700 bg-slate-900/20">
                    <div className="w-16 h-16 mx-auto bg-slate-800 rounded-full flex items-center justify-center mb-4">
                        <MagnifyingGlassIcon className="w-8 h-8 text-slate-600" />
                    </div>
                    <p className="text-slate-400 text-lg font-medium">{searchTerm ? "لا توجد نتائج للبحث." : "لا توجد فئات في هذا القسم."}</p>
                    {!searchTerm && <p className="text-slate-500 text-sm mt-2">اضغط على زر + لإضافة فئة جديدة.</p>}
                </div>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {filteredCategories.map(category => (
                        <CategoryCard 
                            key={category.id} 
                            category={category} 
                            onEdit={() => setModal({ type: 'edit', category })}
                            onDelete={() => setModal({ type: 'delete', category })}
                        />
                    ))}
                </div>
            )}
            
            {/* FAB */}
            <button 
                onClick={() => setModal({ type: 'add', category: null })} 
                className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 h-16 w-16 bg-slate-900 rounded-full shadow-[0_0_20px_rgba(8,145,178,0.4)] flex items-center justify-center transition-all duration-300 border-4 border-slate-900 overflow-visible hover:scale-105 active:scale-95 group"
            >
                <div className="absolute inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full flex items-center justify-center">
                    <PlusIcon className="w-8 h-8 text-white transition-transform duration-300 group-hover:rotate-90"/>
                </div>
            </button>
            
            {/* Modals */}
            {(modal.type === 'add' || modal.type === 'edit') && (
                <Modal title={modal.type === 'add' ? 'إضافة فئة جديدة' : 'تعديل الفئة'} onClose={() => setModal({ type: null, category: null })}>
                    <CategoryFormModal 
                        category={modal.category}
                        type={activeTab}
                        onSave={handleSave}
                        onCancel={() => setModal({ type: null, category: null })}
                    />
                </Modal>
            )}

            <ConfirmDialog 
                isOpen={modal.type === 'delete' && !!modal.category}
                title="حذف الفئة"
                message={`هل أنت متأكد من حذف فئة "${modal.category?.name}"؟ انتبه، إذا كانت هناك معاملات مرتبطة بهذه الفئة فقد يتسبب الحذف في مشاكل أو سيتم منع الحذف.`}
                confirmText="نعم، احذف الفئة"
                onConfirm={handleDelete}
                onCancel={() => setModal({ type: null, category: null })}
            />
        </div>
    );
};

export default CategoriesPage;
