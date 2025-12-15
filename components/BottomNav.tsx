
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
        className={`relative flex flex-col items-center justify-center w-full h-full transition-all duration-300 group ${isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'}`}
    >
        <div className={`transition-all duration-300 p-2 rounded-xl relative ${isActive ? '-translate-y-2' : 'group-active:scale-95'}`}>
             {/* Active Glow */}
            {isActive && <div className="absolute inset-0 bg-cyan-400/20 blur-lg rounded-full opacity-60"></div>}
            
            <div className={`relative z-10 transition-transform ${isActive ? 'scale-110 drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]' : ''}`}>
                {icon}
            </div>
        </div>
        
        {/* Active Label & Dot */}
        <span className={`text-[10px] font-bold mt-0.5 transition-all duration-300 ${isActive ? 'opacity-100 translate-y-[-4px]' : 'opacity-0 translate-y-2 absolute bottom-1'}`}>
            {label}
        </span>
        
        {isActive && <span className="absolute bottom-2 w-1 h-1 bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(34,211,238,1)]"></span>}

        {notificationCount > 0 && (
            <span className="absolute top-2 right-1/2 translate-x-3 h-2.5 w-2.5 bg-rose-500 border border-slate-900 rounded-full flex items-center justify-center z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            </span>
        )}
    </button>
);


const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage, debtNotificationCount }) => {
    // Split items into left and right groups
    const leftItems = [
        { page: 'home', label: 'الرئيسية', icon: <HomeIcon className="w-6 h-6" /> },
        { page: 'transactions', label: 'المعاملات', icon: <ClipboardDocumentIcon className="w-6 h-6" /> },
    ];

    const rightItems = [
        { page: 'debts', label: 'الديون', icon: <CurrencyDollarIcon className="w-6 h-6" /> },
        { page: 'accounts', label: 'الحسابات', icon: <WalletIcon className="w-6 h-6" /> },
    ];

    return (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
            {/* Background Container */}
            <div className="relative h-20 w-full bg-slate-900/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pointer-events-auto flex items-center justify-between px-2 pb-2">
                
                {/* Left Items */}
                <div className="flex-1 flex justify-around items-center h-full">
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

                {/* Center Gap for FAB */}
                <div className="w-20 shrink-0 h-full relative">
                    {/* Visual connection for the FAB */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-slate-800/50 rounded-full blur-sm opacity-50"></div>
                </div>

                {/* Right Items */}
                <div className="flex-1 flex justify-around items-center h-full">
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
