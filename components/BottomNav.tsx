import React from 'react';
import { Page } from '../types';
import { HomeIcon, TransactionsIcon, DebtsIcon, AccountsIcon } from './icons';

interface BottomNavProps {
    activePage: Page;
    setActivePage: (page: Page) => void;
    debtNotificationCount: number;
}

const NavButton: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    notificationCount?: number;
}> = ({ label, icon, isActive, onClick, notificationCount }) => (
    <button onClick={onClick} className={`relative flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-cyan-400'}`}>
        {icon}
        <span className="text-xs mt-1">{label}</span>
        {notificationCount > 0 && (
            <span className="absolute top-1 right-1/2 translate-x-3/4 h-4 w-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-slate-800">
                {notificationCount}
            </span>
        )}
    </button>
);


const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage, debtNotificationCount }) => {
    const navItems = [
        { page: 'home', label: 'الرئيسية', icon: <HomeIcon className="w-6 h-6" /> },
        { page: 'transactions', label: 'المعاملات', icon: <TransactionsIcon className="w-6 h-6" /> },
        { page: 'debts', label: 'الديون', icon: <DebtsIcon className="w-6 h-6" /> },
        { page: 'accounts', label: 'الحسابات', icon: <AccountsIcon className="w-6 h-6" /> },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-800/80 backdrop-blur-sm border-t border-slate-700 z-10">
            <div className="flex justify-around items-center h-full max-w-md mx-auto">
                {navItems.map(item => (
                    <NavButton 
                        key={item.page}
                        label={item.label}
                        icon={item.icon}
                        isActive={activePage === item.page}
                        onClick={() => setActivePage(item.page as Page)}
                        notificationCount={item.page === 'debts' ? debtNotificationCount : undefined}
                    />
                ))}
            </div>
        </div>
    );
};

export default BottomNav;