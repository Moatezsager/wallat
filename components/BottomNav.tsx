import React from 'react';
import { Page } from '../types';
import { HomeIcon, ClipboardDocumentIcon, CurrencyDollarIcon, WalletIcon } from './icons';

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
    <button 
        onClick={onClick} 
        className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 ${isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
    >
        <div className={`transition-all duration-300 p-1 rounded-xl ${isActive ? 'bg-cyan-500/10 -translate-y-1' : ''}`}>
             {/* Glow effect */}
            {isActive && <div className="absolute inset-0 bg-cyan-400/20 blur-lg rounded-full"></div>}
            <div className="relative z-10">
                {icon}
            </div>
        </div>
        <span className={`text-[10px] font-bold mt-1 transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>{label}</span>
        {notificationCount > 0 && (
            <span className="absolute top-2 right-1/2 translate-x-3 h-2.5 w-2.5 bg-rose-500 border border-slate-900 rounded-full flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            </span>
        )}
    </button>
);


const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage, debtNotificationCount }) => {
    const navItems = [
        { page: 'home', label: 'الرئيسية', icon: <HomeIcon className="w-6 h-6" /> },
        { page: 'transactions', label: 'المعاملات', icon: <ClipboardDocumentIcon className="w-6 h-6" /> },
        { page: 'debts', label: 'الديون', icon: <CurrencyDollarIcon className="w-6 h-6" /> },
        { page: 'accounts', label: 'الحسابات', icon: <WalletIcon className="w-6 h-6" /> },
    ];

    return (
        <div className="md:hidden fixed bottom-5 left-4 right-4 z-30 flex justify-center pointer-events-none">
            <div className="glass-strong rounded-3xl h-18 w-full max-w-sm shadow-2xl shadow-black/50 flex justify-around items-center overflow-visible px-2 pointer-events-auto border border-white/10 py-2 backdrop-blur-xl">
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