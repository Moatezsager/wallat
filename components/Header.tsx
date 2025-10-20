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
        case 'contacts': return 'الأسماء';
        case 'categories': return 'الفئات';
        case 'reports': return 'التقارير';
        case 'notes': return 'الملاحظات';
        default: return 'محفظتي الاكترونية';
    }
}

const Header: React.FC<HeaderProps> = ({ activePage, onMenuClick, isProfilePage, profileName, onBack }) => {
    return (
        <header className="sticky top-0 z-10 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
            <div className="flex items-center justify-between h-16 px-4">
                <div className="flex-1 text-right">
                    {isProfilePage && onBack && (
                        <button onClick={onBack} className="text-slate-400 hover:text-cyan-400">
                            <ArrowLeftIcon className="w-6 h-6" />
                        </button>
                    )}
                </div>
                <h1 className="flex-1 text-xl font-bold text-cyan-400 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                    {isProfilePage ? profileName : getPageTitle(activePage)}
                </h1>
                <div className="flex-1 text-left">
                     <button onClick={onMenuClick} className="text-slate-400 hover:text-cyan-400">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
