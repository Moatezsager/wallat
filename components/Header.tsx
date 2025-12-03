import React from 'react';
import { Bars3Icon as MenuIcon, ArrowLeftIcon } from './icons';
import { Page } from '../types';

interface HeaderProps {
    activePage: Page;
    onMenuClick: () => void;
    isProfilePage?: boolean;
    profileName?: string;
    onBack?: () => void;
}

const getPageTitle = (page: Page) => {
    switch (page) {
        case 'home': return 'الرئيسية';
        case 'accounts': return 'الحسابات';
        case 'transactions': return 'المعاملات';
        case 'debts': return 'الديون';
        case 'contacts': return 'جهات الاتصال';
        case 'categories': return 'الفئات';
        case 'reports': return 'التقارير';
        case 'notes': return 'الملاحظات';
        default: return 'محفظتي';
    }
}

const Header: React.FC<HeaderProps> = ({ activePage, onMenuClick, isProfilePage, profileName, onBack }) => {
    return (
        <header className="sticky top-0 z-20 glass-strong">
            <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
                <div className="flex-1 flex justify-start">
                     <button onClick={onMenuClick} className="p-2 -mr-2 text-slate-300 hover:text-cyan-400 transition-colors rounded-xl hover:bg-white/5 active:scale-95">
                        <MenuIcon className="w-7 h-7" />
                    </button>
                </div>
                
                <div className="flex-1 flex justify-center">
                    <h1 className="text-lg font-bold text-white text-center whitespace-nowrap overflow-hidden text-ellipsis tracking-wide drop-shadow-sm">
                        {isProfilePage ? profileName : getPageTitle(activePage)}
                    </h1>
                </div>
                
                <div className="flex-1 flex justify-end">
                    {isProfilePage && onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 text-slate-300 hover:text-cyan-400 transition-colors rounded-xl hover:bg-white/5 active:scale-95">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;