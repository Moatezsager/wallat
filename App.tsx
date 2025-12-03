import React, { useState, useCallback, useEffect } from 'react';
import { Page } from './types';
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
import BottomNav from './components/BottomNav';
import { supabase } from './lib/supabase';
import { WalletIcon } from './components/icons';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  
  const [activePage, setActivePage] = useState<Page>('home');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [debtNotificationCount, setDebtNotificationCount] = useState(0);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [activeContactName, setActiveContactName] = useState<string>('');
  
  useEffect(() => {
    if (localStorage.getItem('app_authenticated') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === '9991') {
      localStorage.setItem('app_authenticated', 'true');
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('كلمة المرور غير صحيحة');
      setPasswordInput('');
    }
  };


  const handleDatabaseChange = useCallback(async (description?: string) => {
    if (description) {
      const now = new Date();
      const activity_date = now.toISOString().split('T')[0];
      const activity_time = now.toTimeString().split(' ')[0];

      const { error } = await supabase.from('activities').upsert({
        id: 1,
        activity_date,
        activity_time,
        description,
      });

      if (error) {
        console.error("Error logging activity:", error.message);
      }
    }
    setKey(prevKey => prevKey + 1);
  }, []);


  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchAppData = async () => {
      const { data: debtData, error: debtError } = await supabase
        .from('debts')
        .select('due_date')
        .eq('paid', false)
        .not('due_date', 'is', null);

      if (debtError || !debtData) {
        console.error("Error fetching debts for notifications", debtError?.message);
        setDebtNotificationCount(0);
      } else {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setHours(23, 59, 59, 999);
        sevenDaysFromNow.setDate(today.getDate() + 7);

        const count = debtData.filter(debt => {
          const dueDate = new Date(debt.due_date!);
          if (dueDate < today) return true;
          if (dueDate >= today && dueDate <= sevenDaysFromNow) return true;
          return false;
        }).length;
        setDebtNotificationCount(count);
      }
    };

    fetchAppData();
  }, [key, isAuthenticated]);

  const handleSelectContact = async (contactId: string) => {
    setActiveContactId(contactId);
    try {
        const { data, error } = await supabase.from('contacts').select('name').eq('id', contactId).single();
        if (error) throw error;
        setActiveContactName(data?.name || 'ملف شخصي');
        setActivePage('contacts');
    } catch(e) {
        console.error("Error fetching contact name", e);
        setActiveContactName('ملف شخصي');
        setActivePage('contacts');
    }
  };

  const handleBackToContacts = () => {
    setActiveContactId(null);
    setActiveContactName('');
    setActivePage('contacts');
    handleDatabaseChange();
  };

  const renderPage = () => {
    if (activePage === 'contacts' && activeContactId) {
        return <ContactProfilePage 
            key={activeContactId} 
            contactId={activeContactId} 
            onBack={handleBackToContacts} 
            handleDatabaseChange={handleDatabaseChange} 
        />;
    }

    switch (activePage) {
      case 'home': return <HomePage key={key} handleDatabaseChange={handleDatabaseChange} setActivePage={setActivePage} />;
      case 'accounts': return <AccountsPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'transactions': return <TransactionsPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'debts': return <DebtsPage key={key} handleDatabaseChange={handleDatabaseChange} onSelectContact={handleSelectContact} />;
      case 'contacts': return <ContactsPage key={key} handleDatabaseChange={handleDatabaseChange} onSelectContact={handleSelectContact} />;
      case 'categories': return <CategoriesPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'reports': return <ReportsPage key={key} />;
      case 'notes': return <NotesPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      default: return <HomePage key={key} handleDatabaseChange={handleDatabaseChange} setActivePage={setActivePage}/>;
    }
  };
  
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen font-sans flex items-center justify-center p-4 relative overflow-hidden" dir="rtl">
         {/* Ambient background elements */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px] animate-pulse-slow"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse-slow" style={{animationDelay: '2s'}}></div>

        <div className="glass-card w-full max-w-sm p-8 rounded-3xl shadow-2xl text-center animate-slide-up relative z-10">
          <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl mx-auto mb-8 flex items-center justify-center shadow-lg shadow-cyan-500/30 rotate-3 hover:rotate-0 transition-transform duration-500">
             <WalletIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">أهلاً بعودتك</h1>
          <p className="text-slate-400 mb-8 text-sm font-medium">أدخل رمز المرور للمتابعة</p>
          <form onSubmit={handlePasswordSubmit} className="space-y-6">
            <div className="relative group">
                <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-2xl p-4 text-white text-center text-2xl tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all placeholder-slate-700 group-hover:border-slate-600"
                placeholder="••••"
                autoFocus
                />
            </div>
            {authError && <p className="text-rose-400 text-sm font-medium animate-bounce bg-rose-500/10 py-2 rounded-lg border border-rose-500/20">{authError}</p>}
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 rounded-2xl transition-all transform active:scale-95 shadow-lg shadow-cyan-500/20"
            >
              دخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans pb-24 md:pb-0" dir="rtl">
      <Header 
        activePage={activePage} 
        onMenuClick={() => setSidebarOpen(true)}
        isProfilePage={!!activeContactId}
        profileName={activeContactName}
        onBack={handleBackToContacts}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} activePage={activePage} setActivePage={setActivePage} />
      <main className="max-w-5xl mx-auto p-4 md:p-6 animate-fade-in">
        {renderPage()}
      </main>
      <BottomNav activePage={activePage} setActivePage={setActivePage} debtNotificationCount={debtNotificationCount} />
    </div>
  );
}

export default App;