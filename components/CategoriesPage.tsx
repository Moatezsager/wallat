import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, iconMap, CurrencyDollarIcon } from './icons';

// Component for the Icon Picker
const IconPicker: React.FC<{ selectedIcon: string; onSelect: (iconName: string) => void; }> = ({ selectedIcon, onSelect }) => {
    const iconNames = Object.keys(iconMap);
    return (
        <div className="grid grid-cols-6 gap-3 bg-slate-800 p-3 rounded-xl max-h-48 overflow-y-auto custom-scrollbar">
            {iconNames.map(name => {
                const Icon = iconMap[name];
                return (
                    <button
                        key={name}
                        type="button"
                        onClick={() => onSelect(name)}
                        className={`p-2 rounded-lg transition-all ${selectedIcon === name ? 'bg-cyan-500 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-700 hover:text-white'}`}
                    >
                        <Icon className="w-6 h-6 mx-auto" />
                    </button>
                );
            })}
        </div>
    );
};

// Component for the Color Picker
const ColorPicker: React.FC<{ selectedColor: string; onSelect: (color: string) => void; }> = ({ selectedColor, onSelect }) => {
    const colors = [
        '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4',
        '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
    ];
    return (
        <div className="flex flex-wrap gap-3 justify-center">
            {colors.map(color => (
                <button
                    key={color}
                    type="button"
                    onClick={() => onSelect(color)}
                    style={{ backgroundColor: color }}
                    className={`w-8 h-8 rounded-full transition-transform transform hover:scale-110 shadow-sm ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-white scale-110' : 'opacity-80 hover:opacity-100'}`}
                />
            ))}
        </div>
    );
};


const CategoryFormModal: React.FC<{
    category?: Category | null;
    type: 'income' | 'expense';
    onSave: () => void;
    onCancel: () => void;
}> = ({ category, type, onSave, onCancel }) => {
    const [name, setName] = useState(category?.name || '');
    const [color, setColor] = useState(category?.color || '#10b981');
    const [icon, setIcon] = useState(category?.icon || 'CurrencyDollarIcon');
    const [isSaving, setIsSaving] = useState(false);
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const categoryData = { name, color, icon, type };

        const { error } = category?.id
            ? await supabase.from('categories').update(categoryData).eq('id', category.id)
            : await supabase.from('categories').insert(categoryData);

        if (error) {
            console.error('Error saving category:', error.message);
            alert('حدث خطأ');
        } else {
            onSave();
        }
        setIsSaving(false);
    };
    
    const IconComponent = iconMap[icon];

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-2xl border border-white/5">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: color }}>
                    {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
                </div>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم الفئة" required className="flex-grow bg-transparent border-b-2 border-slate-700 p-2 text-white text-xl font-bold focus:border-cyan-500 focus:outline-none transition-colors placeholder-slate-600" />
            </div>
            <div>
                 <label className="block text-sm font-medium text-slate-400 mb-3">اختر أيقونة</label>
                 <IconPicker selectedIcon={icon} onSelect={setIcon} />
            </div>
             <div>
                 <label className="block text-sm font-medium text-slate-400 mb-3">اختر لون</label>
                 <ColorPicker selectedColor={color} onSelect={setColor} />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                <button type="button" onClick={onCancel} className="py-2 px-4 text-slate-400 hover:text-white font-bold transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-2 px-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition font-bold shadow-lg disabled:bg-slate-500">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الفئة'}
                </button>
            </div>
        </form>
    );
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
        <div className="glass-card bg-slate-900 rounded-3xl p-6 w-full max-w-md border border-white/10 shadow-2xl animate-slide-up">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">{title}</h3>
                <button onClick={onClose} className="p-2 rounded-full bg-slate-800 hover:bg-slate-700 transition-colors"><XMarkIcon className="w-5 h-5 text-slate-400" /></button>
            </div>
            {children}
        </div>
    </div>
);


const CategoriesPage: React.FC<{ key: number, handleDatabaseChange: (description?: string) => void }> = ({ key, handleDatabaseChange }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
    const [modal, setModal] = useState<{ type: 'add' | 'edit' | 'delete' | null, category: Category | null }>({ type: null, category: null });

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
    }, [fetchCategories, key]);

    const handleSave = () => {
        const description = modal.category ? `تم تعديل فئة "${modal.category.name}"` : 'تم إضافة فئة جديدة';
        setModal({ type: null, category: null });
        handleDatabaseChange(description);
    };

    const handleDelete = async () => {
        if (!modal.category) return;
        const description = `تم حذف فئة "${modal.category.name}"`;
        const { error } = await supabase.from('categories').delete().eq('id', modal.category.id);
        if (error) {
            console.error('Error deleting category:', error.message);
            alert('لا يمكن حذف الفئة لارتباطها بمعاملات.');
        } else {
            setModal({ type: null, category: null });
            handleDatabaseChange(description);
        }
    };

    const filteredCategories = categories.filter(c => c.type === activeTab);

    return (
        <div className="relative">
            <div className="glass-card p-1 rounded-xl flex mb-6">
                <button 
                    onClick={() => setActiveTab('expense')} 
                    className={`w-1/2 py-2.5 rounded-lg text-center font-bold transition-all duration-300 ${activeTab === 'expense' ? 'bg-rose-500/20 text-rose-400 shadow-inner' : 'text-slate-400 hover:text-white'}`}
                >
                    المصروفات
                </button>
                <button 
                    onClick={() => setActiveTab('income')} 
                    className={`w-1/2 py-2.5 rounded-lg text-center font-bold transition-all duration-300 ${activeTab === 'income' ? 'bg-emerald-500/20 text-emerald-400 shadow-inner' : 'text-slate-400 hover:text-white'}`}
                >
                    الإيرادات
                </button>
            </div>

            {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => <div key={i} className="h-28 bg-slate-800/50 rounded-2xl animate-pulse"></div>)}
                </div>
            ) : filteredCategories.length === 0 ? (
                <div className="text-center py-16 glass-card rounded-3xl border-dashed border-2 border-slate-700">
                    <p className="text-slate-500 mb-4 text-lg">لا توجد فئات في هذا القسم.</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-20">
                    {filteredCategories.map(category => {
                        const iconName = category.icon || 'CurrencyDollarIcon';
                        const Icon = iconMap[iconName] || CurrencyDollarIcon;
                        return (
                            <div key={category.id} className="glass-card p-5 rounded-2xl flex flex-col items-center justify-center text-center relative group hover:bg-white/5 transition-all border border-white/5 hover:border-white/10">
                                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-lg transition-transform group-hover:scale-110" style={{ backgroundColor: category.color || '#334155' }}>
                                    <Icon className="w-7 h-7 text-white" />
                                </div>
                                <p className="font-bold text-sm break-words text-slate-200">{category.name}</p>
                                
                                {/* Actions Overlay */}
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 bg-black/60 backdrop-blur-md rounded-full p-1">
                                    <button onClick={() => setModal({ type: 'edit', category })} className="p-1.5 rounded-full hover:bg-white/20 transition"><PencilSquareIcon className="w-4 h-4 text-cyan-400"/></button>
                                    <button onClick={() => setModal({ type: 'delete', category })} className="p-1.5 rounded-full hover:bg-white/20 transition"><TrashIcon className="w-4 h-4 text-rose-400"/></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            
            <button 
                onClick={() => setModal({ type: 'add', category: null })} 
                className="fixed bottom-24 md:bottom-10 left-6 h-16 w-16 bg-gradient-to-r from-blue-600 to-cyan-500 text-white rounded-[24px] shadow-2xl shadow-cyan-500/30 flex items-center justify-center hover:scale-110 transition-all z-30 border border-white/20"
            >
                <PlusIcon className="w-8 h-8"/>
            </button>
            
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

            {modal.type === 'delete' && modal.category && (
                 <Modal title="تأكيد الحذف" onClose={() => setModal({ type: null, category: null })}>
                    <p className="text-slate-300 mb-8 text-lg">هل أنت متأكد من حذف فئة "<span className="font-bold text-white">{modal.category.name}</span>"؟</p>
                    <div className="flex justify-end gap-4">
                        <button onClick={() => setModal({ type: null, category: null })} className="py-3 px-6 text-slate-400 font-bold hover:text-white transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-3 px-6 bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition font-bold shadow-lg">تأكيد الحذف</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CategoriesPage;