
import React from 'react';
import { Page } from '../types';
import { 
    HomeIcon, AccountsIcon, TransactionsIcon, CurrencyDollarIcon, 
    ContactsIcon, CategoriesIcon, ReportsIcon, ClipboardDocumentIcon, 
    ChartPieIcon, WalletIcon, SparklesIcon, HeartPulseIcon, XMarkIcon 
} from './icons';

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
            ? 'text-cyan-50 shadow-lg shadow-cyan-900/20' 
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
    >
        {/* Active Background Effect */}
        {isActive && (
            <div className="absolute inset-0 bg-gradient-to-l from-cyan-600/30 to-blue-600/20 backdrop-blur-xl rounded-2xl border border-white/10" />
        )}
        
        <div className={`relative z-10 transition-all duration-300 ${isActive ? 'text-cyan-400 scale-110' : 'text-slate-500 group-hover:text-slate-300'}`}>
            {icon}
        </div>
        
        <span className={`relative z-10 mr-4 font-bold text-sm tracking-wide transition-colors ${isActive ? 'text-white' : ''}`}>
            {label}
        </span>
        
        {/* Active Indicator Glow */}
        {isActive && (
            <div className="absolute left-2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_12px_rgba(34,211,238,0.8)]"></div>
        )}
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activePage, setActivePage }) => {
    const handleNavigation = (page: Page) => { 
        setActivePage(page); 
        onClose(); 
    }

    const mainNavItems = [
        { page: 'home', label: 'الرئيسية', icon: <HomeIcon className="w-5 h-5" /> },
        { page: 'accounts', label: 'الحسابات', icon: <WalletIcon className="w-5 h-5" /> },
        { page: 'transactions', label: 'المعاملات', icon: <TransactionsIcon className="w-5 h-5" /> },
        { page: 'debts', label: 'الديون', icon: <CurrencyDollarIcon className="w-5 h-5" /> },
        { page: 'investments', label: 'الاستثمارات', icon: <SparklesIcon className="w-5 h-5" /> },
        { page: 'goals', label: 'أهداف الادخار', icon: <HeartPulseIcon className="w-5 h-5" /> },
        { page: 'contacts', label: 'جهات الاتصال', icon: <ContactsIcon className="w-5 h-5" /> },
    ];
    
    const secondaryNavItems = [
        { page: 'categories', label: 'الفئات', icon: <CategoriesIcon className="w-5 h-5" /> },
        { page: 'reports', label: 'التقارير', icon: <ChartPieIcon className="w-5 h-5" /> },
        { page: 'notes', label: 'الملاحظات', icon: <ClipboardDocumentIcon className="w-5 h-5" /> },
    ];

    return (
        <>
            {/* Backdrop Scrim */}
            <div 
                className={`lg:hidden fixed inset-0 z-[60] bg-slate-950/80 backdrop-blur-md transition-opacity duration-500 print-hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
                onClick={onClose} 
            />
            
            {/* Sidebar Main Container */}
            <div className={`fixed top-0 right-0 z-[70] h-full w-[85%] max-w-[320px] bg-slate-900/95 lg:bg-slate-900/40 backdrop-blur-3xl shadow-2xl lg:shadow-none transform transition-all duration-500 cubic-bezier(0.4, 0, 0.2, 1) border-l border-white/5 print-hidden flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                
                {/* Close button for mobile */}
                <button 
                    onClick={onClose}
                    className="lg:hidden absolute left-4 top-6 p-2 bg-white/5 rounded-full text-slate-400 active:scale-90 transition-transform"
                >
                    <XMarkIcon className="w-5 h-5" />
                </button>

                <div className="p-6 flex flex-col h-full relative">
                    {/* Background Decorative Glow */}
                    <div className="absolute top-0 right-0 w-full h-64 bg-gradient-to-b from-cyan-500/5 to-transparent pointer-events-none -z-10"></div>

                    {/* Branding Header */}
                    <div className="flex items-center gap-4 mt-4 mb-10 px-2">
                        <div className="w-12 h-12 bg-gradient-to-tr from-cyan-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-cyan-500/20 ring-1 ring-white/10">
                             <WalletIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight leading-none">محفظتي الإلكترونية</h2>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <nav className="flex-1 flex flex-col overflow-y-auto no-scrollbar pr-1 -mr-1">
                        <div className="space-y-1">
                            {mainNavItems.map(item => (
                                <NavItem 
                                    key={item.page} 
                                    label={item.label} 
                                    icon={item.icon} 
                                    isActive={activePage === item.page} 
                                    onClick={() => handleNavigation(item.page as Page)} 
                                />
                            ))}
                        </div>
                        
                        {/* Section Divider */}
                        <div className="relative py-6 flex items-center">
                            <div className="flex-grow h-px bg-white/5"></div>
                            <span className="flex-shrink mx-4 text-[10px] font-black text-slate-600 uppercase tracking-widest bg-slate-900 px-2 rounded-full">أدوات إضافية</span>
                            <div className="flex-grow h-px bg-white/5"></div>
                        </div>
                        
                        <div className="space-y-1">
                            {secondaryNavItems.map(item => (
                                <NavItem 
                                    key={item.page} 
                                    label={item.label} 
                                    icon={item.icon} 
                                    isActive={activePage === item.page} 
                                    onClick={() => handleNavigation(item.page as Page)} 
                                />
                            ))}
                        </div>
                    </nav>
                    
                    {/* Footer Branding */}
                    <div className="mt-auto pt-6 border-t border-white/5 pb-safe">
                         <div className="bg-slate-950/40 rounded-2xl p-4 border border-white/5 text-center">
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">تطوير وابتكار</p>
                            <div className="flex items-center justify-center gap-2">
                                <div className="w-5 h-5 bg-emerald-500 rounded-md flex items-center justify-center text-[10px] font-black text-slate-900 shadow-lg shadow-emerald-500/20">G</div>
                                <span className="text-xs font-black text-white tracking-tighter">GreenBox <span className="text-emerald-400">Tech</span></span>
                            </div>
                            <p className="text-[8px] text-slate-600 mt-2 font-medium">جميع الحقوق محفوظة 2025 ©</p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
