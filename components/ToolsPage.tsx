
import React, { useState, useMemo, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Contact } from '../types';
import { useToast } from './Toast';
import { 
    ShieldCheckIcon, EyeIcon, EyeOffIcon, UsersIcon, 
    ArrowTrendingUp, CurrencyDollarIcon, CheckCircleIcon,
    PlusIcon, XMarkIcon, ContactsIcon, ScaleIcon,
    PaintBrushIcon, SparklesIcon, MagnifyingGlassIcon
} from './icons';
import { logActivity } from '../lib/logger';
import { useLanguage, useTheme } from '../App';
import { Bell, Smartphone, Download, Wifi, Zap, MapPin, Camera } from 'lucide-react';

interface ToolsPageProps {
    isStealthMode: boolean;
    toggleStealthMode: () => void;
    handleDatabaseChange: (description?: string) => void;
    requestNotificationPermission: () => Promise<void>;
    requestGeolocationPermission: () => Promise<void>;
    requestCameraPermission: () => Promise<void>;
    canInstall: boolean;
    onInstall: () => void;
    isStandalone: boolean;
    isIOS: boolean;
}

const GlobeIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
);

const ToolsPage: React.FC<ToolsPageProps> = ({ 
    isStealthMode, toggleStealthMode, handleDatabaseChange, 
    requestNotificationPermission, requestGeolocationPermission, requestCameraPermission,
    canInstall, onInstall, isStandalone, isIOS 
}) => {
    const toast = useToast();
    const { t, language, setLanguage } = useLanguage();
    const { theme, toggleTheme } = useTheme();
    const [billAmount, setBillAmount] = useState('');
    const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [isSplitterOpen, setIsSplitterOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchContacts = async () => {
            const { data } = await supabase.from('contacts').select('*').order('name');
            if (data) setContacts(data as Contact[]);
        };
        fetchContacts();
    }, []);

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat(language === 'ar' ? 'ar-LY' : 'en-US', { 
            style: 'currency', 
            currency: 'LYD', 
            minimumFractionDigits: 0 
        }).format(amount).replace('LYD', t.currency);
    };

    const filteredContacts = useMemo(() => {
        return contacts.filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [contacts, searchTerm]);

    const perPerson = useMemo(() => {
        const total = Number(billAmount);
        const count = selectedContactIds.length;
        return count > 0 ? total / count : 0;
    }, [billAmount, selectedContactIds]);

    const handleSplitBill = async () => {
        if (!perPerson || selectedContactIds.length === 0) return;
        
        try {
            const debts = selectedContactIds.map(id => ({
                contact_id: id,
                amount: perPerson,
                type: 'for_you',
                description: language === 'ar' 
                    ? `تقسيم فاتورة (إجمالي ${formatCurrency(Number(billAmount))})`
                    : `Bill Split (Total ${formatCurrency(Number(billAmount))})`,
                paid: false
            }));

            const { error } = await supabase.from('debts').insert(debts);
            if (error) throw error;

            logActivity(`Bill split: ${formatCurrency(Number(billAmount))} for ${selectedContactIds.length} people`);
            toast.success(language === 'ar' 
                ? `تم تسجيل ${formatCurrency(perPerson)} كديون لـ ${selectedContactIds.length} أشخاص`
                : `${formatCurrency(perPerson)} added as debts for ${selectedContactIds.length} people`);
            
            setBillAmount('');
            setSelectedContactIds([]);
            setIsSplitterOpen(false);
            handleDatabaseChange();
        } catch (err) {
            toast.error(language === 'ar' ? 'حدث خطأ أثناء العملية' : 'An error occurred');
        }
    };

    const toggleContact = (id: string) => {
        setSelectedContactIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    return (
        <div className="space-y-8 pb-24 max-w-4xl mx-auto">
            {/* Header */}
            <div className="px-2">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{t.tools}</h1>
                <p className="text-slate-500 font-bold">{t.stealth_desc}</p>
            </div>

            {/* General Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Theme & Language Card */}
                <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 bg-slate-100/50 dark:bg-slate-900/40 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-500">
                            <PaintBrushIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{language === 'ar' ? 'المظهر واللغة' : 'Appearance & Language'}</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Theme Switch */}
                        <div className="flex items-center justify-between p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                {theme === 'dark' ? <EyeIcon className="w-5 h-5 text-slate-400" /> : <SparklesIcon className="w-5 h-5 text-amber-500" />}
                                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{theme === 'dark' ? t.theme_dark : t.theme_light}</span>
                            </div>
                            <button onClick={toggleTheme} className="relative inline-flex h-7 w-12 items-center rounded-full bg-slate-300 dark:bg-cyan-600 transition-colors">
                                <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${theme === 'dark' ? (language === 'ar' ? '-translate-x-6' : 'translate-x-6') : (language === 'ar' ? '-translate-x-1' : 'translate-x-1')}`} />
                            </button>
                        </div>

                        {/* Language Switch */}
                        <div className="flex items-center justify-between p-4 bg-white/40 dark:bg-black/20 rounded-2xl border border-black/5 dark:border-white/5">
                            <div className="flex items-center gap-3">
                                <GlobeIcon className="w-5 h-5 text-blue-500" />
                                <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{t.language}: {t.language_current}</span>
                            </div>
                            <button 
                                onClick={() => setLanguage(language === 'ar' ? 'en' : 'ar')}
                                className="px-4 py-1.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-white rounded-lg text-xs font-black border border-black/5 dark:border-white/5 hover:scale-105 transition-transform"
                            >
                                {language === 'ar' ? 'English' : 'العربية'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Privacy Card */}
                <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 bg-slate-100/50 dark:bg-slate-900/40 space-y-8">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500">
                            <ShieldCheckIcon className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{t.stealth_mode}</h3>
                    </div>

                    <div onClick={toggleStealthMode} className={`p-6 rounded-[2rem] border cursor-pointer transition-all ${isStealthMode ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-900/20' : 'bg-white/40 dark:bg-black/20 border-black/5 dark:border-white/5'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className={`p-2 rounded-xl ${isStealthMode ? 'bg-cyan-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-400'}`}>
                                {isStealthMode ? <EyeOffIcon className="w-6 h-6"/> : <EyeIcon className="w-6 h-6"/>}
                            </div>
                            <div className={`w-3 h-3 rounded-full ${isStealthMode ? 'bg-cyan-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-700'}`}></div>
                        </div>
                        <p className={`font-black text-sm ${isStealthMode ? 'text-cyan-400' : 'text-slate-500'}`}>{isStealthMode ? t.stealth_active : t.stealth_inactive}</p>
                    </div>
                </div>
            </div>

            {/* PWA & Notifications Card */}
            <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 bg-slate-100/50 dark:bg-slate-900/40 space-y-8">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white">{language === 'ar' ? 'تطبيق الويب (PWA)' : 'Web App (PWA)'}</h3>
                        <p className="text-[10px] font-bold text-slate-500">{language === 'ar' ? 'إعدادات الإشعارات والوضع غير المتصل' : 'Notification settings and offline mode'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Notifications Toggle */}
                    <button 
                        onClick={requestNotificationPermission}
                        className="flex flex-col items-center gap-3 p-6 bg-white/40 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5 hover:bg-amber-500/10 hover:border-amber-500/30 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform">
                            <Bell className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-sm text-slate-900 dark:text-white">{language === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications'}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'احصل على تنبيهات الديون' : 'Get debt alerts'}</p>
                        </div>
                    </button>

                    {/* Geolocation Toggle */}
                    <button 
                        onClick={requestGeolocationPermission}
                        className="flex flex-col items-center gap-3 p-6 bg-white/40 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5 hover:bg-blue-500/10 hover:border-blue-500/30 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-sm text-slate-900 dark:text-white">{language === 'ar' ? 'تفعيل الموقع' : 'Enable Location'}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'لتحديد أماكن المعاملات' : 'To tag transaction locations'}</p>
                        </div>
                    </button>

                    {/* Camera Toggle */}
                    <button 
                        onClick={requestCameraPermission}
                        className="flex flex-col items-center gap-3 p-6 bg-white/40 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all group"
                    >
                        <div className="w-12 h-12 rounded-2xl bg-rose-500/20 flex items-center justify-center text-rose-500 group-hover:scale-110 transition-transform">
                            <Camera className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-sm text-slate-900 dark:text-white">{language === 'ar' ? 'تفعيل الكاميرا' : 'Enable Camera'}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'لتصوير الفواتير والوصولات' : 'To scan bills and receipts'}</p>
                        </div>
                    </button>

                    {/* Install Button (Android/Windows) */}
                    {canInstall && !isStandalone && (
                        <button 
                            onClick={onInstall}
                            className="flex flex-col items-center gap-3 p-6 bg-cyan-500/10 border-cyan-500/30 rounded-[2rem] border hover:bg-cyan-500/20 transition-all group"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center text-cyan-500 group-hover:scale-110 transition-transform">
                                <Download className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                                <p className="font-black text-sm text-slate-900 dark:text-white">{language === 'ar' ? 'تثبيت كـتطبيق' : 'Install as App'}</p>
                                <p className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'ثبت التطبيق على جهازك' : 'Install on your device'}</p>
                            </div>
                        </button>
                    )}

                    {/* Already Installed State */}
                    {isStandalone && (
                        <div className="flex flex-col items-center gap-3 p-6 bg-emerald-500/10 border-emerald-500/30 rounded-[2rem] border">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                <CheckCircleIcon className="w-6 h-6" />
                            </div>
                            <div className="text-center">
                                <p className="font-black text-sm text-slate-900 dark:text-white">{language === 'ar' ? 'تم التثبيت بنجاح' : 'Installed Successfully'}</p>
                                <p className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'أنت تستخدم نسخة التطبيق' : 'You are using the app version'}</p>
                            </div>
                        </div>
                    )}

                    {/* Offline Info */}
                    <div className="flex flex-col items-center gap-3 p-6 bg-white/40 dark:bg-black/20 rounded-[2rem] border border-black/5 dark:border-white/5">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                            <Wifi className="w-6 h-6" />
                        </div>
                        <div className="text-center">
                            <p className="font-black text-sm text-slate-900 dark:text-white">{language === 'ar' ? 'وضع الأوفلاين' : 'Offline Mode'}</p>
                            <p className="text-[10px] text-slate-500 font-bold">{language === 'ar' ? 'التطبيق يعمل بدون إنترنت' : 'App works without internet'}</p>
                        </div>
                    </div>
                </div>

                {/* iOS Installation Guide */}
                {isIOS && !isStandalone && (
                    <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-500">
                                <Smartphone className="w-4 h-4" />
                            </div>
                            <p className="text-sm font-black text-slate-900 dark:text-white">{language === 'ar' ? 'تثبيت على آيفون (iOS)' : 'Install on iPhone (iOS)'}</p>
                        </div>
                        <div className="space-y-3 text-[11px] font-bold text-slate-600 dark:text-slate-400">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">1</div>
                                <p>{language === 'ar' ? 'اضغط على أيقونة "مشاركة" في متصفح Safari' : 'Tap the "Share" icon in Safari'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">2</div>
                                <p>{language === 'ar' ? 'اختر "إضافة إلى الشاشة الرئيسية"' : 'Select "Add to Home Screen"'}</p>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px]">3</div>
                                <p>{language === 'ar' ? 'اضغط على "إضافة" في الزاوية العلوية' : 'Tap "Add" in the top corner'}</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* PWA Benefits */}
                <div className="p-6 bg-amber-500/5 rounded-3xl border border-amber-500/10">
                    <div className="flex items-start gap-3">
                        <Zap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <p className="text-xs font-black text-amber-600 dark:text-amber-400">{language === 'ar' ? 'نصيحة احترافية' : 'Pro Tip'}</p>
                            <p className="text-[10px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                                {language === 'ar' 
                                    ? 'للحصول على أفضل تجربة، أضف التطبيق إلى شاشتك الرئيسية من خيارات المتصفح. سيعمل التطبيق تماماً مثل التطبيقات المثبتة.'
                                    : 'For the best experience, add the app to your home screen from browser options. It will work just like a native app.'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bill Splitter Tool */}
            <div className="glass-card rounded-[2.5rem] p-8 border border-white/5 bg-gradient-to-br from-indigo-600/10 to-blue-600/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 blur-[80px] opacity-10 bg-indigo-500"></div>
                
                <div className="flex justify-between items-start mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-xl">
                            <ScaleIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">{language === 'ar' ? 'مقسم الفواتير الذكي' : 'Smart Bill Splitter'}</h3>
                            <p className="text-slate-500 text-xs font-bold">{language === 'ar' ? 'وزع المصاريف المشتركة بين الأصدقاء بسهولة' : 'Split shared expenses easily among friends'}</p>
                        </div>
                    </div>
                    {!isSplitterOpen && (
                        <button onClick={() => setIsSplitterOpen(true)} className="px-6 py-3 bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all">
                            {language === 'ar' ? 'بدء التقسيم' : 'Start Splitting'}
                        </button>
                    )}
                </div>

                {isSplitterOpen && (
                    <div className="space-y-8 animate-fade-in relative z-10">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1 mb-2 block">{language === 'ar' ? 'إجمالي مبلغ الفاتورة' : 'Total Bill Amount'}</label>
                                    <div className="relative group">
                                        <input 
                                            type="number" 
                                            value={billAmount} 
                                            onChange={e => setBillAmount(e.target.value)}
                                            placeholder="0.00" 
                                            className="w-full bg-white/50 dark:bg-slate-950/50 border border-black/5 dark:border-white/10 rounded-2xl p-5 text-3xl font-black text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-all text-center tabular-nums" 
                                        />
                                        <span className="absolute left-6 top-1/2 -translate-y-1/2 font-bold text-slate-400">{t.currency}</span>
                                    </div>
                                </div>

                                <div className="bg-white/50 dark:bg-black/30 p-6 rounded-[2rem] border border-black/5 dark:border-white/5 text-center">
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">{language === 'ar' ? 'نصيب الفرد الواحد' : 'Amount Per Person'}</p>
                                    <p className="text-4xl font-black text-indigo-500 tabular-nums">
                                        {formatCurrency(perPerson)}
                                    </p>
                                    <p className="text-[10px] text-slate-400 font-bold mt-1">
                                        {language === 'ar' ? `على ${selectedContactIds.length} أشخاص` : `Between ${selectedContactIds.length} people`}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4 flex flex-col h-[400px]">
                                <div className="relative group">
                                    <MagnifyingGlassIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                    <input 
                                        type="text" 
                                        placeholder={t.search} 
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                        className="w-full bg-white/50 dark:bg-slate-950/50 border border-black/5 dark:border-white/10 rounded-2xl p-4 pr-12 text-sm text-slate-900 dark:text-white focus:outline-none" 
                                    />
                                </div>

                                <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pr-1">
                                    {filteredContacts.map(contact => (
                                        <button 
                                            key={contact.id} 
                                            onClick={() => toggleContact(contact.id)}
                                            className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between text-right ${selectedContactIds.includes(contact.id) ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/40 dark:bg-slate-800/40 border-black/5 dark:border-white/5 text-slate-700 dark:text-slate-400'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedContactIds.includes(contact.id) ? 'bg-white/20' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                                                    <ContactsIcon className="w-5 h-5" />
                                                </div>
                                                <span className="font-bold text-sm">{contact.name}</span>
                                            </div>
                                            {selectedContactIds.includes(contact.id) && <CheckCircleIcon className="w-5 h-5" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-4 pt-4 border-t border-black/5 dark:border-white/5">
                            <button onClick={() => setIsSplitterOpen(false)} className="flex-1 py-4 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-black text-lg active:scale-95 transition-all">{t.cancel}</button>
                            <button 
                                onClick={handleSplitBill}
                                disabled={!perPerson || selectedContactIds.length === 0}
                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-900/30 active:scale-95 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                                {language === 'ar' ? 'تأكيد وترحيل كديون' : 'Confirm & Log as Debts'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ToolsPage;
