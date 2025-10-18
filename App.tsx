import React, { useState, useCallback, useEffect } from 'react';
import { Page } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import AccountsPage from './components/AccountsPage';
import TransactionsPage from './components/TransactionsPage';
import DebtsPage from './components/DebtsPage';
import ContactsPage from './components/ContactsPage';
import CategoriesPage from './components/CategoriesPage';
import ReportsPage from './components/ReportsPage';
import BottomNav from './components/BottomNav';
import { supabase } from './lib/supabase';

function App() {
  const [activePage, setActivePage] = useState<Page>('home');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [debtNotificationCount, setDebtNotificationCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const handleDatabaseChange = useCallback(() => {
    const now = new Date();
    // Persist the timestamp to localStorage
    localStorage.setItem('lastUpdatedTimestamp', now.toISOString());
    // Update the state to reflect the change immediately
    setLastUpdated(now);
    // Increment key to trigger a refetch of all app data
    setKey(prevKey => prevKey + 1);
  }, []);

  useEffect(() => {
    const fetchAppData = async () => {
      // Fetch debt notifications
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

      // Fetch last updated timestamp from localStorage instead of the database
      const storedTimestamp = localStorage.getItem('lastUpdatedTimestamp');
      if (storedTimestamp) {
        setLastUpdated(new Date(storedTimestamp));
      }
    };

    fetchAppData();
  // We only want this to run when the key changes. handleDatabaseChange is stable.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  
  // Initial data load
  useEffect(() => {
      setKey(k => k + 1);
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage key={key} handleDatabaseChange={handleDatabaseChange} lastUpdated={lastUpdated} setActivePage={setActivePage} />;
      case 'accounts':
        return <AccountsPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'transactions':
        return <TransactionsPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'debts':
        return <DebtsPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'contacts':
        return <ContactsPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'categories':
        return <CategoriesPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'reports':
        return <ReportsPage key={key} />;
      default:
        return <HomePage key={key} handleDatabaseChange={handleDatabaseChange} lastUpdated={lastUpdated} setActivePage={setActivePage}/>;
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans" dir="rtl">
      <Header activePage={activePage} onMenuClick={() => setSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} activePage={activePage} setActivePage={setActivePage} />
      <main className="p-4 pb-20">
        {renderPage()}
      </main>
      <BottomNav activePage={activePage} setActivePage={setActivePage} debtNotificationCount={debtNotificationCount} />
    </div>
  );
}

export default App;