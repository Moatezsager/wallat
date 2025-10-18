import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Category } from '../types';
import { PlusIcon, PencilSquareIcon, TrashIcon, XMarkIcon, iconMap } from './icons';

// Component for the Icon Picker
const IconPicker: React.FC<{ selectedIcon: string; onSelect: (iconName: string) => void; }> = ({ selectedIcon, onSelect }) => {
    const iconNames = Object.keys(iconMap);
    return (
        <div className="grid grid-cols-6 gap-2 bg-slate-700 p-2 rounded-lg">
            {iconNames.map(name => {
                const Icon = iconMap[name];
                return (
                    <button
                        key={name}
                        type="button"
                        onClick={() => onSelect(name)}
                        className={`p-2 rounded-md transition-colors ${selectedIcon === name ? 'bg-cyan-500' : 'hover:bg-slate-600'}`}
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
        '#f87171', '#fb923c', '#fbbf24', '#a3e635', '#34d399', '#22d3ee',
        '#60a5fa', '#818cf8', '#a78bfa', '#d946ef', '#f472b6', '#78716c'
    ];
    return (
        <div className="flex flex-wrap gap-2">
            {colors.map(color => (
                <button
                    key={color}
                    type="button"
                    onClick={() => onSelect(color)}
                    style={{ backgroundColor: color }}
                    className={`w-8 h-8 rounded-full transition-transform transform hover:scale-110 ${selectedColor === color ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-white' : ''}`}
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
    const [color, setColor] = useState(category?.color || '#34d399');
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
            <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ backgroundColor: color }}>
                    {IconComponent && <IconComponent className="w-8 h-8 text-white" />}
                </div>
                <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="اسم الفئة" required className="flex-grow bg-slate-700 border border-slate-600 rounded-md p-2 text-white text-lg" />
            </div>
            <div>
                 <label className="block text-sm font-medium text-slate-300 mb-2">اختر أيقونة</label>
                 <IconPicker selectedIcon={icon} onSelect={setIcon} />
            </div>
             <div>
                 <label className="block text-sm font-medium text-slate-300 mb-2">اختر لون</label>
                 <ColorPicker selectedColor={color} onSelect={setColor} />
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                <button type="submit" disabled={isSaving} className="py-2 px-4 bg-cyan-600 hover:bg-cyan-500 rounded-md transition disabled:bg-slate-500">
                    {isSaving ? 'جاري الحفظ...' : 'حفظ الفئة'}
                </button>
            </div>
        </form>
    );
};

const Modal: React.FC<{ children: React.ReactNode; title: string; onClose: () => void; }> = ({ children, title, onClose }) => (
    <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-slate-800 rounded-lg p-6 w-full max-w-md border border-slate-700 shadow-xl animate-slide-up">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold">{title}</h3>
                <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><XMarkIcon className="w-6 h-6" /></button>
            </div>
            {children}
        </div>
    </div>
);


const CategoriesPage: React.FC<{ key: number, refreshData: () => void }> = ({ key, refreshData }) => {
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
            setCategories(data as Category[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [fetchCategories, key]);

    const handleSave = () => {
        setModal({ type: null, category: null });
        refreshData();
    };

    const handleDelete = async () => {
        if (!modal.category) return;
        const { error } = await supabase.from('categories').delete().eq('id', modal.category.id);
        if (error) {
            console.error('Error deleting category', error.message);
            alert('لا يمكن حذف الفئة، قد تكون مرتبطة بمعاملات.');
        } else {
            handleSave();
        }
    };

    const filteredCategories = categories.filter(c => c.type === activeTab);

    return (
        <div className="relative">
            <div className="flex border-b border-slate-700 mb-4">
                <button
                    onClick={() => setActiveTab('expense')}
                    className={`w-1/2 py-3 text-center font-semibold transition-colors ${activeTab === 'expense' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
                >
                    فئات المصروفات
                </button>
                <button
                    onClick={() => setActiveTab('income')}
                    className={`w-1/2 py-3 text-center font-semibold transition-colors ${activeTab === 'income' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400'}`}
                >
                    فئات الإيرادات
                </button>
            </div>

            {loading ? (
                <p className="text-center text-slate-400 py-8">جاري تحميل الفئات...</p>
            ) : filteredCategories.length === 0 ? (
                <div className="text-center py-10">
                    <p className="text-slate-400 mb-4">لا توجد فئات في هذا القسم.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredCategories.map(cat => {
                        const Icon = iconMap[cat.icon || 'CurrencyDollarIcon'];
                        return (
                            <div key={cat.id} className="bg-slate-800 p-3 rounded-lg flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: cat.color || '#334155' }}>
                                        {Icon && <Icon className="w-6 h-6 text-white" />}
                                    </div>
                                    <span className="font-semibold">{cat.name}</span>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setModal({ type: 'edit', category: cat })} className="text-slate-400 hover:text-cyan-400 p-1"><PencilSquareIcon className="w-5 h-5"/></button>
                                    <button onClick={() => setModal({ type: 'delete', category: cat })} className="text-slate-400 hover:text-red-400 p-1"><TrashIcon className="w-5 h-5"/></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <button onClick={() => setModal({ type: 'add', category: null })} className="fixed bottom-20 right-4 h-14 w-14 bg-cyan-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-cyan-500 transition-transform transform active:scale-90 z-10">
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
                     <p className="text-slate-300 mb-2">هل أنت متأكد من حذف فئة "{modal.category.name}"؟</p>
                     <p className="text-sm text-slate-400 mb-6">لن يتم حذف المعاملات المرتبطة بهذه الفئة، ولكنها ستصبح "غير مصنفة".</p>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setModal({ type: null, category: null })} className="py-2 px-4 bg-slate-600 hover:bg-slate-500 rounded-md transition">إلغاء</button>
                        <button onClick={handleDelete} className="py-2 px-4 bg-red-600 hover:bg-red-500 rounded-md transition">تأكيد الحذف</button>
                    </div>
                </Modal>
            )}
        </div>
    );
};

export default CategoriesPage;