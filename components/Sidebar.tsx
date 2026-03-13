
import React, { useState } from 'react';
import { Page } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    Home, Wallet, ArrowLeftRight, Landmark, 
    PieChart, BarChart3, Target, TrendingUp, 
    Tags, Users, FileText, Settings,
    ChevronDown, ShoppingBag, History, Gem,
    X, LayoutGrid, ShieldCheck
} from 'lucide-react';
import { useLanguage } from '../App';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activePage: Page;
    setActivePage: (page: Page) => void;
}

interface NavGroupProps {
    title: string;
    items: { page: Page; label: string; icon: React.ReactNode }[];
    activePage: Page;
    onItemClick: (page: Page) => void;
    language: string;
}

const NavGroup: React.FC<NavGroupProps> = ({ title, items, activePage, onItemClick, language }) => {
    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <div className="mb-6">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`flex items-center justify-between w-full px-4 mb-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors ${language === 'ar' ? 'flex-row-reverse' : 'flex-row'}`}
            >
                <span>{title}</span>
                <ChevronDown className={`w-3 h-3 transition-transform duration-300 ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
            </button>
            
            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                        className="overflow-hidden space-y-1"
                    >
                        {items.map((item) => (
                            <button
                                key={item.page}
                                onClick={() => onItemClick(item.page)}
                                className={`group relative flex items-center w-full p-3 rounded-2xl transition-all duration-300 active:scale-[0.98] ${
                                    activePage === item.page 
                                    ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400' 
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
                                } ${language === 'ar' ? 'flex-row' : 'flex-row'}`}
                            >
                                {activePage === item.page && (
                                    <motion.div 
                                        layoutId="activeNav"
                                        className="absolute inset-0 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-2xl border border-cyan-500/20 dark:border-cyan-500/20"
                                    />
                                )}
                                
                                <div className={`relative z-10 transition-transform duration-300 ${activePage === item.page ? 'scale-110' : 'group-hover:scale-110'}`}>
                                    {item.icon}
                                </div>
                                
                                <span className={`relative z-10 mx-3 text-sm font-bold transition-colors ${activePage === item.page ? 'text-slate-900 dark:text-white' : ''}`}>
                                    {item.label}
                                </span>

                                {activePage === item.page && (
                                    <motion.div 
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className={`absolute w-1.5 h-1.5 bg-cyan-500 rounded-full shadow-[0_0_8px_rgba(6,182,212,0.6)] ${language === 'ar' ? 'left-4' : 'right-4'}`}
                                    />
                                )}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activePage, setActivePage }) => {
    const { t, language } = useLanguage();
    
    const handleNavigation = (page: Page) => { 
        setActivePage(page); 
        onClose(); 
    };

    const navGroups = [
        {
            title: language === 'ar' ? 'الرئيسية' : 'Main',
            items: [
                { page: 'home' as Page, label: t.home, icon: <Home className="w-5 h-5" /> },
                { page: 'accounts' as Page, label: t.accounts, icon: <Wallet className="w-5 h-5" /> },
                { page: 'transactions' as Page, label: t.transactions, icon: <ArrowLeftRight className="w-5 h-5" /> },
            ]
        },
        {
            title: language === 'ar' ? 'الإدارة المالية' : 'Finance',
            items: [
                { page: 'debts' as Page, label: t.debts, icon: <Landmark className="w-5 h-5" /> },
                { page: 'budgets' as Page, label: t.budgets, icon: <PieChart className="w-5 h-5" /> },
                { page: 'recurring' as Page, label: t.recurring, icon: <History className="w-5 h-5" /> },
                { page: 'shopping' as Page, label: t.shopping, icon: <ShoppingBag className="w-5 h-5" /> },
                { page: 'assets' as Page, label: t.assets, icon: <Gem className="w-5 h-5" /> },
            ]
        },
        {
            title: language === 'ar' ? 'التحليلات والأهداف' : 'Insights',
            items: [
                { page: 'reports' as Page, label: t.reports, icon: <BarChart3 className="w-5 h-5" /> },
                { page: 'goals' as Page, label: t.goals, icon: <Target className="w-5 h-5" /> },
                { page: 'investments' as Page, label: t.investments, icon: <TrendingUp className="w-5 h-5" /> },
            ]
        },
        {
            title: language === 'ar' ? 'أدوات وإعدادات' : 'Tools',
            items: [
                { page: 'categories' as Page, label: t.categories, icon: <Tags className="w-5 h-5" /> },
                { page: 'contacts' as Page, label: t.contacts, icon: <Users className="w-5 h-5" /> },
                { page: 'notes' as Page, label: t.notes, icon: <FileText className="w-5 h-5" /> },
                { page: 'tools' as Page, label: t.tools, icon: <LayoutGrid className="w-5 h-5" /> },
            ]
        }
    ];

    const sidebarClass = `fixed top-0 bottom-0 z-[70] h-full w-[85%] max-w-[300px] bg-white dark:bg-slate-950/95 lg:bg-slate-50/40 dark:lg:bg-slate-950/40 backdrop-blur-3xl shadow-2xl lg:shadow-none transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) border-x border-black/5 dark:border-white/5 print-hidden flex flex-col ${
        language === 'ar' 
        ? (isOpen ? 'right-0 translate-x-0' : 'right-0 translate-x-full lg:translate-x-0') 
        : (isOpen ? 'left-0 translate-x-0' : 'left-0 -translate-x-full lg:translate-x-0')
    }`;

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="lg:hidden fixed inset-0 z-[60] bg-slate-950/60 backdrop-blur-sm transition-opacity duration-500 print-hidden" 
                        onClick={onClose} 
                    />
                )}
            </AnimatePresence>
            
            <div className={sidebarClass}>
                <div className="p-6 flex flex-col h-full relative">
                    {/* Header with Logo & Close */}
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20 ring-1 ring-white/10">
                                 <Wallet className="w-5 h-5 text-white" />
                            </div>
                            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight leading-none">محفظتي</h2>
                        </div>
                        <button 
                            onClick={onClose} 
                            className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-full text-slate-500 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* User Profile Card */}
                    <div className="mb-8 p-4 rounded-2xl bg-slate-100 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-cyan-500/20 flex items-center justify-center text-cyan-600 dark:text-cyan-400 font-black text-sm border border-cyan-500/20">
                                M
                            </div>
                            <div className={`absolute bottom-0 ${language === 'ar' ? 'left-0' : 'right-0'} w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 ${navigator.onLine ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-white truncate">معتز صقر</p>
                            <p className="text-[10px] text-slate-500 dark:text-slate-500 truncate">moatez1999sager@gmail.com</p>
                        </div>
                    </div>

                    {/* Navigation Groups */}
                    <nav className="flex-1 overflow-y-auto no-scrollbar pr-1 -mr-1">
                        {navGroups.map((group) => (
                            <NavGroup 
                                key={group.title}
                                title={group.title}
                                items={group.items}
                                activePage={activePage}
                                onItemClick={handleNavigation}
                                language={language}
                            />
                        ))}
                    </nav>
                    
                    {/* Footer / Branding */}
                    <div className="mt-auto pt-6 border-t border-black/5 dark:border-white/5 pb-safe">
                         <div className="bg-slate-50 dark:bg-slate-900/40 rounded-2xl p-4 border border-black/5 dark:border-white/5 text-center transition-colors">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 bg-emerald-500 rounded-lg flex items-center justify-center text-[10px] font-black text-slate-900 shadow-lg shadow-emerald-500/20">G</div>
                                <span className="text-xs font-black text-slate-900 dark:text-white tracking-tighter">GreenBox <span className="text-emerald-500">Tech</span></span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
