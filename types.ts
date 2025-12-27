
// Fix: Define the Page type as a union of string literals to avoid circular dependency.
export type Page = 'home' | 'accounts' | 'transactions' | 'debts' | 'contacts' | 'categories' | 'reports' | 'notes' | 'investments' | 'goals' | 'tools' | 'budgets' | 'assets' | 'shopping' | 'recurring';

export interface Account {
  id: string;
  name: string;
  type: string; 
  balance: number;
  currency: string;
  theme?: string; 
  card_pattern?: string;
  custom_icon?: string;
  style_preset?: string;
  pattern_type?: string;
  is_archived: boolean;
}

export interface Transaction {
  id: string;
  account_id: string | null;
  amount: number;
  date: string; 
  category_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  notes: string | null;
  to_account_id: string | null;
  created_at?: string;
  accounts?: { name: string; currency: string } | null;
  categories?: { name: string; color?: string | null; icon?: string | null; } | null;
  to_accounts?: { name: string } | null;
}

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

export interface Debt {
  id: string;
  contact_id: string | null;
  amount: number;
  due_date: string | null; 
  paid: boolean;
  paid_at: string | null;
  type: 'for_you' | 'on_you';
  description: string | null;
  linked_transaction_id: string | null;
  created_at: string;
  account_id: string | null;
  contacts?: { name: string; phone?: string | null } | null;
  accounts?: { name: string } | null;
  payments?: DebtPayment[];
}

export interface DebtPayment {
    id: string;
    debt_id: string;
    amount: number;
    payment_date: string;
    account_id: string;
    accounts?: { name: string };
}

export interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  type: 'income' | 'expense';
}

export interface Budget {
    id: string;
    category_id: string;
    amount_limit: number;
    period: 'monthly' | 'weekly';
    start_date: string;
    categories?: { name: string; color: string; icon: string };
}

export interface Asset {
    id: string;
    name: string;
    purchase_price: number;
    current_value: number;
    category: string;
    purchase_date: string | null;
    created_at: string;
}

export interface ShoppingItem {
    id: string;
    item_name: string;
    estimated_price: number | null;
    priority: 'high' | 'medium' | 'low';
    is_bought: boolean;
    created_at: string;
}

export interface RecurringTransaction {
    id: string;
    amount: number;
    type: 'income' | 'expense';
    category_id: string;
    account_id: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    next_date: string;
    is_active: boolean;
    notes: string | null;
    categories?: { name: string };
    accounts?: { name: string };
}

export interface Note {
  id: string;
  note_text: string;
  color: string;
  is_pinned: boolean;
  is_code: boolean;
  language: string | null;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  name: string;
  type: string; 
  amount: number; 
  current_value: number;
  created_at: string;
}

export interface Goal {
  id: string;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  color: string;
  icon: string;
  created_at: string;
}
