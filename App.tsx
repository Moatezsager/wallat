import React, { useState, useCallback, useEffect } from 'react';
import { Page } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import HomePage from './components/HomePage';
import AccountsPage from './components/AccountsPage';
import TransactionsPage from './components/TransactionsPage';
import DebtsPage from './components/DebtsPage';
import ContactsPage from './components/ContactsPage';
import ContactProfilePage from './components/ContactProfilePage'; // Import the new page
import CategoriesPage from './components/CategoriesPage';
import ReportsPage from './components/ReportsPage';
import BottomNav from './components/BottomNav';
import { supabase } from './lib/supabase';

function App() {
  const [activePage, setActivePage] = useState<Page>('home');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [key, setKey] = useState(0);
  const [debtNotificationCount, setDebtNotificationCount] = useState(0);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [activeContactName, setActiveContactName] = useState<string>('');
  
  const handleDatabaseChange = useCallback(async (description?: string) => {
    if (description) {
      const now = new Date();
      // Format date as YYYY-MM-DD
      const activity_date = now.toISOString().split('T')[0];
      // Format time as HH:MM:SS
      const activity_time = now.toTimeString().split(' ')[0];

      const { error } = await supabase.from('activities').upsert({
        id: 1, // Always update the first record as requested
        activity_date,
        activity_time,
        description,
      });

      if (error) {
        console.error("Error logging activity:", error.message);
      }
    }
    // This key change is what triggers re-fetching in child components
    setKey(prevKey => prevKey + 1);
  }, []);


  useEffect(() => {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  
  useEffect(() => {
      handleDatabaseChange("تم تحديث البيانات عند فتح التطبيق");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelectContact = async (contactId: string) => {
    setActiveContactId(contactId);
    try {
        const { data, error } = await supabase.from('contacts').select('name').eq('id', contactId).single();
        if (error) throw error;
        setActiveContactName(data?.name || 'ملف شخصي');
    } catch(e) {
        console.error("Error fetching contact name", e);
        setActiveContactName('ملف شخصي');
    }
  };

  const handleBackToContacts = () => {
    setActiveContactId(null);
    setActiveContactName('');
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
      case 'home':
        return <HomePage key={key} handleDatabaseChange={handleDatabaseChange} setActivePage={setActivePage} />;
      case 'accounts':
        return <AccountsPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'transactions':
        return <TransactionsPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'debts':
        return <DebtsPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'contacts':
        return <ContactsPage key={key} handleDatabaseChange={handleDatabaseChange} onSelectContact={handleSelectContact} />;
      case 'categories':
        return <CategoriesPage key={key} handleDatabaseChange={handleDatabaseChange} />;
      case 'reports':
        return <ReportsPage key={key} />;
      default:
        return <HomePage key={key} handleDatabaseChange={handleDatabaseChange} setActivePage={setActivePage}/>;
    }
  };

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans" dir="rtl">
      <Header 
        activePage={activePage} 
        onMenuClick={() => setSidebarOpen(true)}
        isProfilePage={!!activeContactId}
        profileName={activeContactName}
        onBack={handleBackToContacts}
      />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} activePage={activePage} setActivePage={setActivePage} />
      <main className="p-4 pb-20">
        {renderPage()}
      </main>
      <BottomNav activePage={activePage} setActivePage={setActivePage} debtNotificationCount={debtNotificationCount} />
    </div>
  );
}

export default App;