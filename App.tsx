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

  const refreshData = useCallback(() => {
    setKey(prevKey => prevKey + 1);
    setLastUpdated(new Date());
  }, []);

  useEffect(() => {
    const fetchDebtNotifications = async () => {
      const { data, error } = await supabase
        .from('debts')
        .select('due_date')
        .eq('paid', false)
        .not('due_date', 'is', null);

      if (error || !data) {
        console.error("Error fetching debts for notifications", error?.message);
        setDebtNotificationCount(0);
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const sevenDaysFromNow = new Date();
      sevenDaysFromNow.setHours(23, 59, 59, 999);
      sevenDaysFromNow.setDate(today.getDate() + 7);

      const count = data.filter(debt => {
        const dueDate = new Date(debt.due_date!);
        // Overdue debts (date is in the past, not including today)
        if (dueDate < today) return true;
        // Due soon debts (from today up to 7 days in the future)
        if (dueDate >= today && dueDate <= sevenDaysFromNow) return true;
        return false;
      }).length;

      setDebtNotificationCount(count);
    };

    fetchDebtNotifications();
  }, [key]);

  useEffect(() => {
    refreshData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPage = () => {
    switch (activePage) {
      case 'home':
        return <HomePage key={key} refreshData={refreshData} lastUpdated={lastUpdated} setActivePage={setActivePage} />;
      case 'accounts':
        return <AccountsPage key={key} refreshData={refreshData} />;
      case 'transactions':
        return <TransactionsPage key={key} refreshData={refreshData} />;
      case 'debts':
        return <DebtsPage key={key} refreshData={refreshData} />;
      case 'contacts':
        return <ContactsPage key={key} refreshData={refreshData} />;
      case 'categories':
        return <CategoriesPage key={key} refreshData={refreshData} />;
      case 'reports':
        return <ReportsPage key={key} />;
      default:
        return <HomePage key={key} refreshData={refreshData} lastUpdated={lastUpdated} setActivePage={setActivePage}/>;
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