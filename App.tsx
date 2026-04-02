
import React, { useState, useEffect, createContext, useContext } from 'react';
import { Page, Debt } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import AccountsPage from './components/AccountsPage';
import TransactionsPage from './components/TransactionsPage';
import DebtsPage from './components/DebtsPage';
import ContactsPage from './components/ContactsPage';
import ContactProfilePage from './components/ContactProfilePage';
import CategoriesPage from './components/CategoriesPage';
import ReportsPage from './components/ReportsPage';
import NotesPage from './components/NotesPage';
import InvestmentsPage from './components/InvestmentsPage';
import SavingsGoalsPage from './components/SavingsGoalsPage';
import ToolsPage from './components/ToolsPage';
import BudgetsPage from './components/BudgetsPage';
import AssetsPage from './components/AssetsPage';
import ShoppingListPage from './components/ShoppingListPage';
import RecurringTransactionsPage from './components/RecurringTransactionsPage';
import BottomNav from './components/BottomNav';
import { ToastProvider } from './components/Toast';
import { supabase } from './lib/supabase';
import { WalletIcon, SparklesIcon } from './components/icons';
import { WifiOff, RefreshCw } from 'lucide-react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { translations, Language } from './lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';

// i18n Context
const LanguageContext = createContext<{
    language: Language;
    setLanguage: (l: Language) => void;
    t: any;
} | undefined>(undefined);

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (!context) throw new Error("useLanguage must be used within LanguageProvider");
    return context;
};

// Theme Context
const ThemeContext = createContext<{
    theme: 'light' | 'dark';
    toggleTheme: () => void;
} | undefined>(undefined);

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) throw new Error("useTheme must be used within ThemeProvider");
    return context;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, 
      gcTime: 1000 * 60 * 60, 
      refetchOnWindowFocus: false,
    },
  },
});

const AnimatedArabicText: React.FC<{ text: string }> = ({ text }) => {
  return (
    <div className="relative overflow-hidden px-4 animate-float">
      <span className="text-xs font-black tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-slate-600 via-cyan-400 to-slate-600 bg-[length:200%_auto] animate-shimmer-text">
        {text}
      </span>
    </div>
  );
};

const SplashScreen: React.FC = () => {
  const phrases = [
    "نؤمن بياناتك المالية",
    "نحلل ميزانيتك بذكاء",
    "نجهز محفظتك الرقمية",
    "ندير التزاماتك بدقة"
  ];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % phrases.length);
    }, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-[1000] bg-black flex flex-col items-center justify-center animate-fade-in overflow-hidden">
      {/* هالة ضوئية خلفية خافتة جداً */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-cyan-500/5 blur-[120px] rounded-full"></div>

      <div className="relative mb-12 animate-float">
        <img 
          src="https://j.top4top.io/p_3698bbu8u0.gif" 
          alt="Logo" 
          className="w-28 h-28 md:w-32 md:h-32 object-contain relative z-10"
        />
        <div className="absolute inset-0 bg-white/5 blur-xl rounded-full scale-50"></div>
      </div>

      <div className="flex flex-col items-center gap-6 relative z-10 w-full max-w-[240px]">
        {/* شريط تحميل نحيف جداً وأنيق */}
        <div className="h-[1px] w-32 bg-slate-900 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent w-full animate-shimmer-bar"></div>
        </div>
        
        {/* النص المتغير مع تأثير الشيمر */}
        <div className="h-6 flex items-center justify-center transition-all duration-700 animate-fade-in" key={index}>
          <AnimatedArabicText text={phrases[index]} />
        </div>
      </div>

      <div className="absolute bottom-12 text-center opacity-30">
        <p className="text-[7px] font-black text-slate-500 uppercase tracking-[0.6em] mb-1">Advanced Financial Ecosystem</p>
        <div className="flex justify-center gap-1">
          <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse"></div>
          <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse [animation-delay:0.2s]"></div>
          <div className="w-1 h-1 rounded-full bg-cyan-500 animate-pulse [animation-delay:0.4s]"></div>
        </div>
      </div>
      
      <style>{`
        @keyframes shimmer-text {
          0% { background-position: 100% center; }
          100% { background-position: -100% center; }
        }
        @keyframes shimmer-bar {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-5px); }
        }
        .animate-shimmer-text {
          animation: shimmer-text 3s linear infinite;
        }
        .animate-shimmer-bar {
          animation: shimmer-bar 1.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

function AppContent() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [activePage, setActivePage] = useState<Page>('home');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showUpdateBanner, setShowUpdateBanner] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [activeContactName, setActiveContactName] = useState<string>('');
  
  const [showGlobalInstall, setShowGlobalInstall] = useState(false);
  
  useEffect(() => {
    // إخفاء شاشة التحميل بعد 4 ثواني للتأكد من رؤية العبارات
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 4000);

    if (localStorage.getItem('app_authenticated') === 'true') setIsAuthenticated(true);
    if (localStorage.getItem('stealth_mode') === 'true') setIsStealthMode(true);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleSWUpdate = (e: any) => {
      setShowUpdateBanner(true);
      if (e.detail && e.detail.updateSW) {
        (window as any).updateSW = e.detail.updateSW;
      }
    };
    
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show global install prompt if not dismissed recently
      if (localStorage.getItem('install_prompt_dismissed') !== 'true') {
        setShowGlobalInstall(true);
      }
    };

    const checkStandalone = () => {
      const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone || document.referrer.includes('android-app://');
      setIsStandalone(!!isStandaloneMode);
    };

    const checkIOS = () => {
      const userAgent = window.navigator.userAgent.toLowerCase();
      const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
      setIsIOS(isIOSDevice);
      
      // Show iOS install prompt if not standalone and not dismissed
      if (isIOSDevice && !isStandalone && localStorage.getItem('install_prompt_dismissed') !== 'true') {
        setShowGlobalInstall(true);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('swUpdated', handleSWUpdate);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    checkStandalone();
    checkIOS();

    return () => {
      clearTimeout(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('swUpdated', handleSWUpdate);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, [isStandalone]);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowGlobalInstall(false);
      }
    }
  };

  const dismissInstallPrompt = () => {
    setShowGlobalInstall(false);
    localStorage.setItem('install_prompt_dismissed', 'true');
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        new Notification(language === 'ar' ? 'تم تفعيل الإشعارات' : 'Notifications Enabled', {
          body: language === 'ar' ? 'ستصلك تنبيهات هامة من تطبيق محفظتي' : 'You will receive important alerts from My Wallet app',
          icon: 'https://vgosloxhrahixrduuzkt.supabase.co/storage/v1/object/public/assets/icon-192.png'
        });
      }
    }
  };

  const requestGeolocationPermission = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Success - permission granted
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  };

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
    } catch (err) {
      console.error('Camera error:', err);
    }
  };

  const handleUpdateApp = () => {
    if ((window as any).updateSW) {
      (window as any).updateSW(true);
    } else {
      window.location.reload();
    }
  };

  const toggleStealthMode = () => {
    const newVal = !isStealthMode;
    setIsStealthMode(newVal);
    localStorage.setItem('stealth_mode', newVal.toString());
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '9991') {
      localStorage.setItem('app_authenticated', 'true');
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError(language === 'ar' ? 'كلمة المرور غير صحيحة' : 'Incorrect password');
      setPasswordInput('');
    }
  };

  const handleDatabaseChange = (description?: string) => {
      setRefreshTrigger(prev => prev + 1);
      queryClient.invalidateQueries();
  };

  const { data: debtNotifications = [] } = useQuery<Debt[]>({
    queryKey: ['debtNotifications', refreshTrigger],
    queryFn: async () => {
        const { data: debtData } = await supabase.from('debts').select('*, contacts(name)').eq('paid', false).not('due_date', 'is', null);
        if (!debtData) return [];
        const today = new Date(); today.setHours(0,0,0,0);
        const soon = new Date(); soon.setDate(today.getDate() + 7);
        return (debtData as unknown as Debt[]).filter(d => {
            const due = new Date(d.due_date!);
            return due < soon;
        });
    },
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  const handleSelectContact = async (contactId: string) => {
    setActiveContactId(contactId);
    try {
        const { data } = await supabase.from('contacts').select('name').eq('id', contactId).single();
        setActiveContactName(data?.name || (language === 'ar' ? 'ملف شخصي' : 'Profile'));
        setActivePage('contacts');
    } catch(e) {
        setActiveContactName(language === 'ar' ? 'ملف شخصي' : 'Profile');
        setActivePage('contacts');
    }
  };

  const handleBackToContacts = () => {
    setActiveContactId(null);
    setActiveContactName('');
    setActivePage('contacts');
  };

  const renderPage = () => {
    if (activePage === 'contacts' && activeContactId) {
        return <ContactProfilePage contactId={activeContactId} onBack={handleBackToContacts} handleDatabaseChange={handleDatabaseChange} />;
    }

    switch (activePage) {
      case 'home': return <HomePage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} setActivePage={setActivePage} />;
      case 'accounts': return <AccountsPage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} />;
      case 'transactions': return <TransactionsPage />;
      case 'debts': return <DebtsPage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} onSelectContact={handleSelectContact} />;
      case 'contacts': return <ContactsPage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} onSelectContact={handleSelectContact} />;
      case 'categories': return <CategoriesPage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} />;
      case 'reports': return <ReportsPage refreshTrigger={refreshTrigger} />;
      case 'notes': return <NotesPage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} />;
      case 'investments': return <InvestmentsPage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} />;
      case 'goals': return <SavingsGoalsPage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} />;
      case 'budgets': return <BudgetsPage refreshTrigger={refreshTrigger} />;
      case 'assets': return <AssetsPage refreshTrigger={refreshTrigger} />;
      case 'shopping': return <ShoppingListPage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} />;
      case 'recurring': return <RecurringTransactionsPage refreshTrigger={refreshTrigger} />;
      case 'tools': return <ToolsPage 
        isStealthMode={isStealthMode} 
        toggleStealthMode={toggleStealthMode} 
        handleDatabaseChange={handleDatabaseChange} 
        requestNotificationPermission={requestNotificationPermission}
        requestGeolocationPermission={requestGeolocationPermission}
        requestCameraPermission={requestCameraPermission}
        canInstall={!!deferredPrompt}
        onInstall={handleInstallApp}
        isStandalone={isStandalone}
        isIOS={isIOS}
      />;
      default: return <HomePage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} setActivePage={setActivePage} />;
    }
  };
  
  if (showSplash) {
    return <SplashScreen />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen font-sans flex items-center justify-center p-4 relative overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="glass-card w-full max-sm p-8 rounded-3xl shadow-2xl text-center animate-slide-up relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-lg shadow-cyan-500/30 rotate-3 transition-transform hover:rotate-0 duration-300">
             <WalletIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t.welcome_back}</h1>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 text-slate-900 dark:text-white text-center text-2xl tracking-[0.5em] focus:outline-none" placeholder={t.password_placeholder} autoFocus />
            {authError && <p className="text-rose-400 text-sm">{authError}</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg transition-all active:scale-95">
              {t.login}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans pb-24 md:pb-0 lg:flex ${language === 'ar' ? 'lg:flex-row-reverse' : 'lg:flex-row'} ${isStealthMode ? 'stealth-active' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <style>{`.stealth-active .tabular-nums, .stealth-active .text-4xl, .stealth-active .text-3xl, .stealth-active .text-5xl, .stealth-active .font-extrabold { filter: blur(8px); pointer-events: none; user-select: none; }`}</style>
        
        {/* Offline Indicator */}
        <AnimatePresence>
          {!isOnline && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="fixed top-0 left-0 right-0 z-[100] bg-rose-500 text-white text-[10px] font-black py-1 px-4 flex items-center justify-center gap-2 shadow-lg"
            >
              <WifiOff className="w-3 h-3" />
              <span>{language === 'ar' ? 'أنت تعمل في وضع الأوفلاين - قد لا تتوفر بعض الميزات' : 'You are offline - some features may be unavailable'}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Update Banner */}
        <AnimatePresence>
          {showUpdateBanner && (
            <motion.div 
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              className="fixed bottom-24 md:bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-80 z-[100] bg-cyan-600 text-white p-4 rounded-2xl shadow-2xl flex flex-col gap-3 border border-white/20 backdrop-blur-xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin-slow" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{language === 'ar' ? 'تحديث جديد متاح' : 'New Update Available'}</p>
                  <p className="text-[10px] opacity-80">{language === 'ar' ? 'قم بتحديث التطبيق للحصول على آخر المميزات' : 'Update the app to get the latest features'}</p>
                </div>
              </div>
              <button 
                onClick={handleUpdateApp}
                className="w-full py-2 bg-white text-cyan-600 rounded-xl text-xs font-black active:scale-95 transition-transform"
              >
                {language === 'ar' ? 'تحديث الآن' : 'Update Now'}
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} activePage={activePage} setActivePage={setActivePage} />
        <div className={`flex-1 flex flex-col min-h-screen ${language === 'ar' ? 'lg:mr-80' : 'lg:ml-80'}`}>
            <Header activePage={activePage} onMenuClick={() => setSidebarOpen(true)} isProfilePage={!!activeContactId} profileName={activeContactName} onBack={handleBackToContacts} notifications={debtNotifications} onNavigate={(page) => setActivePage(page)} />
            <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8 relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activePage + (activeContactId || '')}
                  initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="w-full h-full"
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </main>
        </div>
        <BottomNav activePage={activePage} setActivePage={setActivePage} debtNotificationCount={debtNotifications.length} />

        {/* Global Install Banner */}
        <AnimatePresence>
          {showGlobalInstall && !isStandalone && (
            <motion.div 
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -100, opacity: 0 }}
              className="fixed top-4 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[110] bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col gap-4"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center shrink-0">
                  <img src="https://vgosloxhrahixrduuzkt.supabase.co/storage/v1/object/public/assets/icon-192.png" alt="App Icon" className="w-8 h-8 rounded-xl" />
                </div>
                <div className="flex-1">
                  <h3 className="font-black text-slate-900 dark:text-white text-sm">{language === 'ar' ? 'تثبيت تطبيق محفظتي' : 'Install My Wallet'}</h3>
                  <p className="text-xs text-slate-500 font-bold mt-1 leading-relaxed">
                    {language === 'ar' 
                      ? (isIOS ? 'اضغط على زر المشاركة ثم "إضافة إلى الشاشة الرئيسية" لتجربة أفضل' : 'قم بتثبيت التطبيق للوصول السريع والعمل بدون إنترنت')
                      : (isIOS ? 'Tap Share then "Add to Home Screen" for a better experience' : 'Install the app for quick access and offline support')}
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={dismissInstallPrompt}
                  className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-xs font-black active:scale-95 transition-transform"
                >
                  {language === 'ar' ? 'لاحقاً' : 'Later'}
                </button>
                {!isIOS && !!deferredPrompt && (
                  <button 
                    onClick={handleInstallApp}
                    className="flex-1 py-2.5 bg-cyan-500 text-white rounded-xl text-xs font-black active:scale-95 transition-transform shadow-lg shadow-cyan-500/30"
                  >
                    {language === 'ar' ? 'تثبيت الآن' : 'Install Now'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Global FAB for Add Transaction (Desktop Only) */}
        {activePage !== 'transactions' && (
          <button 
            onClick={() => setActivePage('transactions')}
            className="hidden md:flex fixed bottom-8 left-8 w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full shadow-2xl shadow-cyan-500/40 items-center justify-center text-white z-50 hover:scale-110 active:scale-95 transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>
        )}
    </div>
  );
}

function App() {
    const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('app_lang') as Language) || 'ar');
    const [theme, setTheme] = useState<'light' | 'dark'>(() => (localStorage.getItem('app_theme') as 'light' | 'dark') || 'dark');

    useEffect(() => {
        const root = document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('app_theme', theme);
        // تحديث لون شريط الحالة للموبايل
        const metaTheme = document.getElementById('meta-theme-color');
        if (metaTheme) metaTheme.setAttribute('content', theme === 'dark' ? '#020617' : '#f8fafc');
    }, [theme]);

    useEffect(() => {
        const root = document.documentElement;
        root.setAttribute('lang', language);
        root.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr');
        localStorage.setItem('app_lang', language);
    }, [language]);

    const toggleTheme = () => setTheme(prev => prev === 'dark' ? 'light' : 'dark');

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t: translations[language] }}>
            <ThemeContext.Provider value={{ theme, toggleTheme }}>
                <QueryClientProvider client={queryClient}>
                    <ToastProvider>
                        <AppContent />
                    </ToastProvider>
                </QueryClientProvider>
            </ThemeContext.Provider>
        </LanguageContext.Provider>
    )
}

export default App;
