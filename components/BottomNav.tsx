
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
        className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 group ${isActive ? 'text-cyan-400' : 'text-slate-400'}`}
    >
        <div className={`transition-all duration-300 p-2 rounded-xl relative ${isActive ? '-translate-y-1' : 'active:scale-90'}`}>
            {isActive && <div className="absolute inset-0 bg-cyan-400/10 blur-md rounded-full opacity-60"></div>}
            <div className={`relative z-10 transition-transform ${isActive ? 'scale-110' : ''}`}>
                {icon}
            </div>
        </div>
        <span className={`text-[9px] font-bold mt-0.5 transition-all duration-300 ${isActive ? 'opacity-100' : 'opacity-60'}`}>
            {label}
        </span>
        {notificationCount > 0 && (
            <span className="absolute top-2 right-1/2 translate-x-3 h-2 w-2 bg-rose-500 rounded-full z-20 shadow-[0_0_5px_rgba(244,63,94,0.5)]"></span>
        )}
    </button>
);

const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage, debtNotificationCount }) => {
    const leftItems = [
        { page: 'home', label: 'الرئيسية', icon: <HomeIcon className="w-6 h-6" /> },
        { page: 'transactions', label: 'المعاملات', icon: <ClipboardDocumentIcon className="w-6 h-6" /> },
    ];

    const rightItems = [
        { page: 'debts', label: 'الديون', icon: <CurrencyDollarIcon className="w-6 h-6" /> },
        { page: 'accounts', label: 'الحسابات', icon: <WalletIcon className="w-6 h-6" /> },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 print-hidden">
            {/* Safe Area Spacer Background */}
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_30px_rgba(0,0,0,0.4)]"></div>
            
            <div className="relative flex items-center justify-between px-2 pb-safe h-[calc(4.5rem+env(safe-area-inset-bottom))]">
                <div className="flex-1 flex justify-around items-center h-16">
                    {leftItems.map(item => (
                        <NavButton 
                            key={item.page}
                            label={item.label}
                            icon={item.icon}
                            isActive={activePage === item.page}
                            onClick={() => setActivePage(item.page as Page)}
                        />
                    ))}
                </div>

                {/* FAB Placeholder */}
                <div className="w-16 shrink-0 h-16"></div>

                <div className="flex-1 flex justify-around items-center h-16">
                    {rightItems.map(item => (
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
        </div>
    );
};

export default BottomNav;
