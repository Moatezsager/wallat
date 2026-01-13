
import React, { useState, useRef, useEffect } from 'react';
import { Bars3Icon as MenuIcon, ArrowLeftIcon, ArrowRightIcon, BellIcon, ClockIcon, ExclamationTriangleIcon, WifiIcon } from './icons';
import { Page, Debt } from '../types';
import { useLanguage } from '../App';

interface HeaderProps {
    activePage: Page;
    onMenuClick: () => void;
    isProfilePage?: boolean;
    profileName?: string;
    onBack?: () => void;
    notifications?: Debt[];
    onNavigate?: (page: Page) => void;
}

const Header: React.FC<HeaderProps> = ({ activePage, onMenuClick, isProfilePage, profileName, onBack, notifications = [], onNavigate }) => {
    const { t, language } = useLanguage();
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const handleNotificationClick = () => {
        if (onNavigate) {
            onNavigate('debts');
            setIsNotifOpen(false);
        }
    };

    const getPageTitle = (page: Page) => {
        return t[page] || t.home;
    };

    const getDebtStatus = (dueDate: string | null): 'ok' | 'due_soon' | 'overdue' => {
        if (!dueDate) return 'ok';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        const diffTime = due.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays < 0) return 'overdue';
        if (diffDays <= 7) return 'due_soon';
        return 'ok';
    };

    const overdueDebts = notifications.filter(d => getDebtStatus(d.due_date) === 'overdue');
    const upcomingDebts = notifications.filter(d => getDebtStatus(d.due_date) === 'due_soon');

    return (
        <header className="sticky top-0 z-20 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-md border-b border-black/5 dark:border-white/5 print-hidden transition-colors">
            <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
                <div className="flex-1 flex justify-start items-center gap-2">
                    {isProfilePage && onBack ? (
                        <button onClick={onBack} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors">
                            {language === 'ar' ? <ArrowRightIcon className="w-6 h-6" /> : <ArrowLeftIcon className="w-6 h-6" />}
                        </button>
                    ) : (
                        <button onClick={onMenuClick} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 transition-colors">
                            <MenuIcon className="w-7 h-7" />
                        </button>
                    )}
                    
                    {/* مؤشر حالة الإنترنت للأوفلاين */}
                    {!isOnline && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-amber-500/20 rounded-lg border border-amber-500/30 animate-pulse">
                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                            <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-tighter">Offline</span>
                        </div>
                    )}
                </div>
                
                <div className="flex-1 flex justify-center">
                    <h1 className="text-lg font-bold text-slate-900 dark:text-white text-center whitespace-nowrap overflow-hidden text-ellipsis tracking-wide">
                        {isProfilePage ? profileName : getPageTitle(activePage)}
                    </h1>
                </div>
                
                <div className="flex-1 flex justify-end items-center gap-2">
                    <div className="relative" ref={notifRef}>
                        <button 
                            onClick={() => setIsNotifOpen(!isNotifOpen)} 
                            className={`p-2 rounded-xl transition-all active:scale-95 relative ${isNotifOpen ? 'bg-black/5 dark:bg-white/10 text-cyan-600 dark:text-white' : 'text-slate-600 dark:text-slate-300 hover:text-cyan-500'}`}
                        >
                            <BellIcon className={`w-6 h-6 ${notifications.length > 0 ? 'animate-pulse' : ''}`} />
                            {notifications.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border border-white dark:border-slate-900 rounded-full"></span>
                            )}
                        </button>

                        {isNotifOpen && (
                            <div className={`absolute top-full mt-2 w-80 bg-white dark:bg-slate-900/95 backdrop-blur-xl border border-black/5 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in z-50 ${language === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}`}>
                                <div className="p-4 border-b border-black/5 dark:border-white/5 bg-slate-50 dark:bg-slate-950/50">
                                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">{language === 'ar' ? 'التنبيهات' : 'Notifications'}</h3>
                                    <p className="text-xs text-slate-500 mt-0.5">{language === 'ar' ? `لديك ${notifications.length} تنبيهات` : `You have ${notifications.length} alerts`}</p>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-400">
                                            <BellIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                            <p className="text-xs">{language === 'ar' ? 'لا توجد تنبيهات' : 'No notifications'}</p>
                                        </div>
                                    ) : (
                                        <div className="p-2 space-y-2">
                                            {overdueDebts.length > 0 && overdueDebts.map(debt => (
                                                <div key={debt.id} onClick={handleNotificationClick} className="p-3 bg-rose-500/5 dark:bg-rose-500/10 hover:bg-rose-500/10 dark:hover:bg-rose-500/20 border border-rose-500/20 rounded-xl cursor-pointer">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <ExclamationTriangleIcon className="w-4 h-4 text-rose-500 shrink-0" />
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{debt.contacts?.name}</p>
                                                        </div>
                                                        <span className="text-xs font-black text-rose-600 dark:text-rose-400">{debt.amount} {t.currency}</span>
                                                    </div>
                                                </div>
                                            ))}
                                            {upcomingDebts.length > 0 && upcomingDebts.map(debt => (
                                                <div key={debt.id} onClick={handleNotificationClick} className="p-3 bg-amber-500/5 dark:bg-amber-500/10 hover:bg-amber-500/10 dark:hover:bg-amber-500/20 border border-amber-500/20 rounded-xl cursor-pointer">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-center gap-2">
                                                            <ClockIcon className="w-4 h-4 text-amber-500 shrink-0" />
                                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{debt.contacts?.name}</p>
                                                        </div>
                                                        <span className="text-xs font-black text-amber-600 dark:text-amber-400">{debt.amount} {t.currency}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
