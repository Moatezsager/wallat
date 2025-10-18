import React from 'react';
import { Page } from '../types';
import { HomeIcon, AccountsIcon, TransactionsIcon, DebtsIcon, ContactsIcon, CategoriesIcon, ReportsIcon } from './icons';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
    activePage: Page;
    setActivePage: (page: Page) => void;
}

const NavItem: React.FC<{
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    isActive: boolean;
}> = ({ label, icon, onClick, isActive }) => (
    <button
        onClick={onClick}
        className={`flex items-center w-full p-3 text-right rounded-lg transition-colors duration-200 ${
            isActive ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-300 hover:bg-slate-700'
        }`}
    >
        {icon}
        <span className="mr-3">{label}</span>
    </button>
);


const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, activePage, setActivePage }) => {

    const handleNavigation = (page: Page) => {
        setActivePage(page);
        onClose();
    }

    const mainNavItems = [
        { page: 'home', label: 'الرئيسية', icon: <HomeIcon className="w-6 h-6" /> },
        { page: 'accounts', label: 'الحسابات', icon: <AccountsIcon className="w-6 h-6" /> },
        { page: 'transactions', label: 'المعاملات', icon: <TransactionsIcon className="w-6 h-6" /> },
        { page: 'debts', label: 'الديون', icon: <DebtsIcon className="w-6 h-6" /> },
        { page: 'contacts', label: 'الأسماء', icon: <ContactsIcon className="w-6 h-6" /> },
    ];
    
    const secondaryNavItems = [
        { page: 'categories', label: 'الفئات', icon: <CategoriesIcon className="w-6 h-6" /> },
        { page: 'reports', label: 'التقارير', icon: <ReportsIcon className="w-6 h-6" /> },
    ];

    return (
        <>
            <div 
                className={`fixed inset-0 z-20 bg-black/50 transition-opacity ${
                    isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
                }`}
                onClick={onClose}
            />
            <div
                className={`fixed top-0 right-0 z-30 h-full w-64 bg-slate-800 shadow-lg transform transition-transform ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="p-4 flex flex-col h-full">
                    <h2 className="text-lg font-semibold text-white mb-4">القائمة</h2>
                    <nav className="flex flex-col space-y-2">
                        {mainNavItems.map(item => (
                             <NavItem 
                                key={item.page}
                                label={item.label}
                                icon={item.icon}
                                isActive={activePage === item.page}
                                onClick={() => handleNavigation(item.page as Page)} 
                            />
                        ))}
                         <hr className="border-slate-700 my-3" />
                         {secondaryNavItems.map(item => (
                             <NavItem 
                                key={item.page}
                                label={item.label}
                                icon={item.icon}
                                isActive={activePage === item.page}
                                onClick={() => handleNavigation(item.page as Page)} 
                            />
                        ))}
                    </nav>
                     <div className="mt-auto text-center text-xs text-slate-500 pb-2">
                        By GreenBox 2025
                    </div>
                </div>
            </div>
        </>
    );
};

export default Sidebar;
