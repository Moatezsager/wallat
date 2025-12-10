
import React, { useState, useRef, useEffect } from 'react';
import { Bars3Icon as MenuIcon, ArrowLeftIcon, BellIcon, ClockIcon, ExclamationTriangleIcon } from './icons';
import { Page, Debt } from '../types';

interface HeaderProps {
    activePage: Page;
    onMenuClick: () => void;
    isProfilePage?: boolean;
    profileName?: string;
    onBack?: () => void;
    notifications?: Debt[];
    onNavigate?: (page: Page) => void;
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

const Header: React.FC<HeaderProps> = ({ activePage, onMenuClick, isProfilePage, profileName, onBack, notifications = [], onNavigate }) => {
    const [isNotifOpen, setIsNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleNotificationClick = () => {
        if (onNavigate) {
            onNavigate('debts');
            setIsNotifOpen(false);
        }
    };

    const overdueDebts = notifications.filter(d => getDebtStatus(d.due_date) === 'overdue');
    const upcomingDebts = notifications.filter(d => getDebtStatus(d.due_date) === 'due_soon');

    return (
        <header className="sticky top-0 z-20 glass-strong">
            <div className="max-w-5xl mx-auto flex items-center justify-between h-16 px-4 lg:px-8">
                <div className="flex-1 flex justify-start items-center gap-2">
                     <button onClick={onMenuClick} className="p-2 -mr-2 text-slate-300 hover:text-cyan-400 transition-colors rounded-xl hover:bg-white/5 active:scale-95">
                        <MenuIcon className="w-7 h-7" />
                    </button>
                </div>
                
                <div className="flex-1 flex justify-center">
                    <h1 className="text-lg font-bold text-white text-center whitespace-nowrap overflow-hidden text-ellipsis tracking-wide drop-shadow-sm">
                        {isProfilePage ? profileName : getPageTitle(activePage)}
                    </h1>
                </div>
                
                <div className="flex-1 flex justify-end items-center gap-2">
                    {/* Notification Bell */}
                    <div className="relative" ref={notifRef}>
                        <button 
                            onClick={() => setIsNotifOpen(!isNotifOpen)} 
                            className={`p-2 rounded-xl transition-all active:scale-95 relative ${isNotifOpen ? 'bg-white/10 text-white' : 'text-slate-300 hover:text-cyan-400 hover:bg-white/5'}`}
                        >
                            <BellIcon className={`w-6 h-6 ${notifications.length > 0 ? 'animate-[swing_2s_ease-in-out_infinite]' : ''}`} />
                            {notifications.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 border border-slate-900 rounded-full flex items-center justify-center">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                </span>
                            )}
                        </button>

                        {/* Dropdown Panel */}
                        {isNotifOpen && (
                            <div className="absolute top-full left-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-fade-in origin-top-left z-50">
                                <div className="p-4 border-b border-white/5 bg-slate-950/50">
                                    <h3 className="font-bold text-white text-sm">التنبيهات</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">لديك {notifications.length} تنبيهات نشطة</p>
                                </div>
                                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                                    {notifications.length === 0 ? (
                                        <div className="p-8 text-center text-slate-500">
                                            <BellIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-xs">لا توجد تنبيهات جديدة</p>
                                        </div>
                                    ) : (
                                        <div className="p-2 space-y-2">
                                            {overdueDebts.length > 0 && (
                                                <>
                                                    <p className="text-[10px] font-bold text-rose-400 px-2 mt-2 mb-1">متأخرة</p>
                                                    {overdueDebts.map(debt => (
                                                        <div key={debt.id} onClick={handleNotificationClick} className="p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl cursor-pointer transition-colors group">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-2">
                                                                    <ExclamationTriangleIcon className="w-4 h-4 text-rose-500 shrink-0" />
                                                                    <p className="text-sm font-bold text-slate-200">{debt.contacts?.name || 'غير معروف'}</p>
                                                                </div>
                                                                <span className="text-xs font-bold text-rose-400">{debt.amount} د.ل</span>
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-1 pr-6">
                                                                استحق في {new Date(debt.due_date!).toLocaleDateString('ar-LY')}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                            
                                            {upcomingDebts.length > 0 && (
                                                <>
                                                    <p className="text-[10px] font-bold text-amber-400 px-2 mt-2 mb-1">قريباً</p>
                                                    {upcomingDebts.map(debt => (
                                                        <div key={debt.id} onClick={handleNotificationClick} className="p-3 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl cursor-pointer transition-colors">
                                                            <div className="flex justify-between items-start">
                                                                <div className="flex items-center gap-2">
                                                                    <ClockIcon className="w-4 h-4 text-amber-500 shrink-0" />
                                                                    <p className="text-sm font-bold text-slate-200">{debt.contacts?.name || 'غير معروف'}</p>
                                                                </div>
                                                                <span className="text-xs font-bold text-amber-400">{debt.amount} د.ل</span>
                                                            </div>
                                                            <p className="text-xs text-slate-400 mt-1 pr-6">
                                                                يستحق في {new Date(debt.due_date!).toLocaleDateString('ar-LY')}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>
                                {notifications.length > 0 && (
                                    <div className="p-2 border-t border-white/5 bg-slate-950/30">
                                        <button onClick={handleNotificationClick} className="w-full py-2 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors">
                                            عرض كل الديون
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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
