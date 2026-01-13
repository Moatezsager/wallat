
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
import { WalletIcon } from './components/icons';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { translations, Language } from './lib/i18n';

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

function AppContent() {
  const { t, language } = useLanguage();
  const { theme } = useTheme();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [activePage, setActivePage] = useState<Page>('home');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isStealthMode, setIsStealthMode] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [activeContactName, setActiveContactName] = useState<string>('');
  
  useEffect(() => {
    if (localStorage.getItem('app_authenticated') === 'true') setIsAuthenticated(true);
    if (localStorage.getItem('stealth_mode') === 'true') setIsStealthMode(true);
  }, []);

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
      case 'tools': return <ToolsPage isStealthMode={isStealthMode} toggleStealthMode={toggleStealthMode} handleDatabaseChange={handleDatabaseChange} />;
      default: return <HomePage refreshTrigger={refreshTrigger} handleDatabaseChange={handleDatabaseChange} setActivePage={setActivePage} />;
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen font-sans flex items-center justify-center p-4 relative overflow-hidden" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="glass-card w-full max-sm p-8 rounded-3xl shadow-2xl text-center animate-slide-up relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-lg shadow-cyan-500/30 rotate-3">
             <WalletIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{t.welcome_back}</h1>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 text-slate-900 dark:text-white text-center text-2xl tracking-[0.5em] focus:outline-none" placeholder={t.password_placeholder} autoFocus />
            {authError && <p className="text-rose-400 text-sm">{authError}</p>}
            <button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg">{t.login}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen font-sans pb-24 md:pb-0 lg:flex ${language === 'ar' ? 'lg:flex-row-reverse' : 'lg:flex-row'} ${isStealthMode ? 'stealth-active' : ''}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <style>{`.stealth-active .tabular-nums, .stealth-active .text-4xl, .stealth-active .text-3xl, .stealth-active .text-5xl, .stealth-active .font-extrabold { filter: blur(8px); pointer-events: none; user-select: none; }`}</style>
        <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} activePage={activePage} setActivePage={setActivePage} />
        <div className={`flex-1 ${language === 'ar' ? 'lg:mr-80' : 'lg:ml-80'}`}>
            <Header activePage={activePage} onMenuClick={() => setSidebarOpen(true)} isProfilePage={!!activeContactId} profileName={activeContactName} onBack={handleBackToContacts} notifications={debtNotifications} onNavigate={(page) => setActivePage(page)} />
            <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8 animate-fade-in">{renderPage()}</main>
        </div>
        <BottomNav activePage={activePage} setActivePage={setActivePage} debtNotificationCount={debtNotifications.length} />
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
