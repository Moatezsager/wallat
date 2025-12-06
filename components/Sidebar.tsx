
import React from 'react';
import { Page } from '../types';
import { HomeIcon, AccountsIcon, TransactionsIcon, CurrencyDollarIcon, ContactsIcon, CategoriesIcon, ReportsIcon, ClipboardDocumentIcon, ChartPieIcon, WalletIcon } from './icons';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activePage: Page;
    setActivePage: (page: Page) => void;
}

const NavItem: React.FC<{ label: string; icon: React.ReactNode; onClick: () => void; isActive: boolean; }> = ({ label, icon, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`relative flex items-center w-full p-3.5 text-right rounded-2xl transition-all duration-200 group overflow-hidden ${
            isActive ? 'bg-cyan-500/10 text-cyan-400 shadow-lg shadow-cyan-500/5 border border-cyan-500/20' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`}
    >
        {isActive && <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent opacity-50" />}
        <div className={`relative z-10 transition-transform group-hover:scale-110 ${isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
            {icon}
        </div>
        <span className="relative z-10 mr-4 font-medium">{label}</span>
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activePage, setActivePage }) => {
    const handleNavigation = (page: Page) => { setActivePage(page); onClose(); }

    const mainNavItems = [
        { page: 'home', label: 'الرئيسية', icon: <HomeIcon className="w-6 h-6" /> },
        { page: 'accounts', label: 'الحسابات', icon: <AccountsIcon className="w-6 h-6" /> },
        { page: 'transactions', label: 'المعاملات', icon: <TransactionsIcon className="w-6 h-6" /> },
        { page: 'debts', label: 'الديون', icon: <CurrencyDollarIcon className="w-6 h-6" /> },
        { page: 'contacts', label: 'جهات الاتصال', icon: <ContactsIcon className="w-6 h-6" /> },
    ];
    
    const secondaryNavItems = [
        { page: 'categories', label: 'الفئات', icon: <CategoriesIcon className="w-6 h-6" /> },
        { page: 'reports', label: 'التقارير', icon: <ChartPieIcon className="w-6 h-6" /> },
        { page: 'notes', label: 'الملاحظات', icon: <ClipboardDocumentIcon className="w-6 h-6" /> },
    ];

    return (
        <>
            <div className={`fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={onClose} />
            <div className={`fixed top-0 right-0 z-[60] h-full w-80 bg-slate-900/90 backdrop-blur-2xl shadow-2xl transform transition-transform duration-300 ease-out border-l border-white/5 ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 flex flex-col h-full relative">
                     {/* Decorative blur */}
                    <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-cyan-500/10 to-transparent pointer-events-none"></div>

                    <div className="flex items-center gap-4 mb-10 px-2 relative z-10">
                        <div className="w-10 h-10 bg-gradient-to-tr from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-cyan-500/20">
                             <WalletIcon className="w-6 h-6 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">محفظتي</h2>
                    </div>

                    <nav className="flex flex-col space-y-1.5 relative z-10">
                        {mainNavItems.map(item => <NavItem key={item.page} label={item.label} icon={item.icon} isActive={activePage === item.page} onClick={() => handleNavigation(item.page as Page)} />)}
                        
                        <div className="my-6 border-t border-white/5 mx-2 relative">
                            <span className="absolute left-1/2 -top-3 -translate-x-1/2 bg-slate-900 px-2 text-xs text-slate-600">أدوات</span>
                        </div>
                        
                        {secondaryNavItems.map(item => <NavItem key={item.page} label={item.label} icon={item.icon} isActive={activePage === item.page} onClick={() => handleNavigation(item.page as Page)} />)}
                    </nav>
                    
                    <div className="mt-auto pt-6 border-t border-white/5 text-center relative z-10">
                         <div className="inline-block relative group cursor-default">
                            {/* Subtle Glow Background */}
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-lg blur opacity-10 group-hover:opacity-30 transition duration-1000 group-hover:duration-200"></div>
                            
                            {/* Text Container */}
                            <p className="relative text-[10px] text-slate-400 font-medium tracking-wide bg-slate-900/50 rounded-lg px-3 py-1.5 ring-1 ring-white/5 backdrop-blur-sm transition-all hover:ring-white/10">
                                جميع الحقوق محفوظة © <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 text-transparent bg-clip-text font-bold text-xs">GreenBox 2025</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
