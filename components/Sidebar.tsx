
import React from 'react';
import { Page } from '../types';
import { 
    HomeIcon, AccountsIcon, TransactionsIcon, CurrencyDollarIcon, 
    ContactsIcon, CategoriesIcon, ReportsIcon, ClipboardDocumentIcon, 
    ChartPieIcon, WalletIcon, SparklesIcon, HeartPulseIcon, XMarkIcon,
    SquaresPlusIcon, ShoppingBagIcon, ScaleIcon, ClockIcon
} from './icons';
import { useLanguage } from '../App';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activePage: Page;
    setActivePage: (page: Page) => void;
}

const NavItem: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void; isActive: boolean; }> = ({ label, icon, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center w-full p-4 text-right rounded-2xl transition-all duration-300 group overflow-hidden active:scale-[0.97] mb-1 ${
            isActive 
            ? 'text-cyan-600 dark:text-cyan-50 shadow-lg shadow-cyan-900/5 dark:shadow-cyan-900/20' 
            : 'text-slate-500 dark:text-slate-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-200'
        }`}
    >
        {isActive && (
            <div className="absolute inset-0 bg-gradient-to-l from-cyan-600/10 to-blue-600/10 dark:from-cyan-600/30 dark:to-blue-600/20 backdrop-blur-xl rounded-2xl border border-cyan-500/20 dark:border-white/10" />
        )}
        
        <div className={`relative z-10 transition-all duration-300 ${isActive ? 'text-cyan-600 dark:text-cyan-400 scale-110' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300'}`}>
            {icon}
        </div>
        
        <span className={`relative z-10 mx-4 font-bold text-sm tracking-wide transition-colors ${isActive ? 'text-slate-900 dark:text-white' : ''}`}>
            {label}
        </span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activePage, setActivePage }) => {
    const { t, language } = useLanguage();
    const handleNavigation = (page: Page) => { 
        setActivePage(page); 
        onClose(); 
    }

    const mainNavItems = [
        { page: 'home', label: t.home, icon: <HomeIcon className="w-5 h-5" /> },
        { page: 'accounts', label: t.accounts, icon: <WalletIcon className="w-5 h-5" /> },
        { page: 'transactions', label: t.transactions, icon: <TransactionsIcon className="w-5 h-5" /> },
        { page: 'debts', label: t.debts, icon: <CurrencyDollarIcon className="w-5 h-5" /> },
        { page: 'categories', label: t.categories, icon: <CategoriesIcon className="w-5 h-5" /> },
        { page: 'reports', label: t.reports, icon: <ReportsIcon className="w-5 h-5" /> },
        { page: 'budgets', label: t.budgets, icon: <ChartPieIcon className="w-5 h-5" /> },
    ];
    
    const secondaryNavItems = [
        { page: 'recurring', label: t.recurring, icon: <ClockIcon className="w-5 h-5" /> },
        { page: 'shopping', label: t.shopping, icon: <ShoppingBagIcon className="w-5 h-5" /> },
        { page: 'investments', label: t.investments, icon: <SparklesIcon className="w-5 h-5" /> },
        { page: 'goals', label: t.goals, icon: <HeartPulseIcon className="w-5 h-5" /> },
        { page: 'contacts', label: t.contacts, icon: <ContactsIcon className="w-5 h-5" /> },
        { page: 'notes', label: t.notes, icon: <ClipboardDocumentIcon className="w-5 h-5" /> },
        { page: 'tools', label: t.tools, icon: <SquaresPlusIcon className="w-5 h-5" /> },
    ];

    const sidebarClass = `fixed top-0 bottom-0 z-[70] h-full w-[85%] max-w-[320px] bg-white dark:bg-slate-900/95 lg:bg-slate-50/40 dark:lg:bg-slate-900/40 backdrop-blur-3xl shadow-2xl lg:shadow-none transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) border-x border-black/5 dark:border-white/5 print-hidden flex flex-col ${
        language === 'ar' 
        ? (isOpen ? 'right-0 translate-x-0' : 'right-0 translate-x-full lg:translate-x-0') 
        : (isOpen ? 'left-0 translate-x-0' : 'left-0 -translate-x-full lg:translate-x-0')
    }`;

    return (
        <>
            <div className={`lg:hidden fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md transition-opacity duration-500 print-hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            
            <div className={sidebarClass}>
                <button onClick={onClose} className={`lg:hidden absolute top-6 p-2 bg-black/5 dark:bg-white/5 rounded-full text-slate-500 active:scale-90 transition-transform ${language === 'ar' ? 'left-4' : 'right-4'}`}>
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="p-6 flex flex-col h-full relative">
                    <div className="flex items-center gap-4 mt-4 mb-10 px-2">
                        <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-500/20 ring-1 ring-white/10">
                             <WalletIcon className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">محفظتي</h2>
                    </div>

                    <nav className="flex-1 flex flex-col overflow-y-auto no-scrollbar">
                        <div className="space-y-1">
                            {mainNavItems.map(item => (
                                <NavItem key={item.page} label={item.label} icon={item.icon} isActive={activePage === item.page} onClick={() => handleNavigation(item.page as Page)} />
                            ))}
                        </div>
                        <div className="relative py-6 flex items-center">
                            <div className="flex-grow h-px bg-black/5 dark:bg-white/5"></div>
                            <span className="flex-shrink mx-4 text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">{language === 'ar' ? 'أدوات إضافية' : 'Extra Tools'}</span>
                            <div className="flex-grow h-px bg-black/5 dark:bg-white/5"></div>
                        </div>
                        <div className="space-y-1">
                            {secondaryNavItems.map(item => (
                                <NavItem key={item.page} label={item.label} icon={item.icon} isActive={activePage === item.page} onClick={() => handleNavigation(item.page as Page)} />
                            ))}
                        </div>
                    </nav>
                    
                    <div className="mt-auto pt-6 border-t border-black/5 dark:border-white/5 pb-safe">
                         <div className="bg-slate-100 dark:bg-slate-950/40 rounded-2xl p-4 border border-black/5 dark:border-white/5 text-center transition-colors">
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 bg-emerald-500 rounded-md flex items-center justify-center text-[10px] font-black text-slate-900 shadow-lg">G</div>
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
