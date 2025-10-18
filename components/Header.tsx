import React from 'react';
// Fix: Replaced non-existent MenuIcon with an alias for Bars3Icon.
import { Bars3Icon as MenuIcon } from './icons';
import { Page } from '../types';

interface HeaderProps {
    activePage: Page;
    onMenuClick: () => void;
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
        default: return 'مدير المال';
    }
}

const Header: React.FC<HeaderProps> = ({ activePage, onMenuClick }) => {
    return (
        <header className="sticky top-0 z-10 bg-slate-800/80 backdrop-blur-sm border-b border-slate-700">
            <div className="flex items-center justify-between h-16 px-4">
                <h1 className="text-xl font-bold text-cyan-400">{getPageTitle(activePage)}</h1>
                <button onClick={onMenuClick} className="text-slate-400 hover:text-cyan-400">
                    <MenuIcon className="w-6 h-6" />
                </button>
            </div>
        </header>
    );
};

export default Header;