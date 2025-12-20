
// Fix: Define the Page type as a union of string literals to avoid circular dependency.
export type Page = 'home' | 'accounts' | 'transactions' | 'debts' | 'contacts' | 'categories' | 'reports' | 'notes' | 'investments' | 'goals';

// From user prompt:
// accounts: id(uuid), name(text), type(text), balance(numeric), currency(text)
export interface Account {
  id: string;
  name: string;
  type: string; // "نقدي", "بنكي", "مخصص"
  balance: number;
  currency: string;
  theme?: string; // New property for custom card appearance
}

// transactions: id(uuid), account_id(uuid), amount(numeric), date(timestamptz), category_id(uuid), type(text), notes(text), to_account_id(uuid)
export interface Transaction {
  id: string;
  account_id: string | null;
  amount: number;
  date: string; // ISO string
  category_id: string | null;
  type: 'income' | 'expense' | 'transfer';
  notes: string | null;
  to_account_id: string | null;
  created_at?: string;
  // For display purposes after joining
  accounts?: { name: string; currency: string } | null;
  // Fix: Add optional color and icon to categories to match more detailed queries.
  categories?: { name: string; color?: string | null; icon?: string | null; } | null;
  to_accounts?: { name: string } | null;
}

// contacts: id(uuid), name(text), phone(text), address(text)
export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

// debts: id(uuid), contact_id(uuid), amount(numeric), due_date(date), paid(boolean), type('for_you' | 'on_you'), description(text), linked_transaction_id(uuid), created_at(timestamptz), paid_at(timestamptz)
export interface Debt {
  id: string;
  contact_id: string | null;
  amount: number;
  due_date: string | null; // Date string
  paid: boolean;
  paid_at: string | null;
  type: 'for_you' | 'on_you';
  description: string | null;
  linked_transaction_id: string | null;
  created_at: string;
  account_id: string | null;
  // For display
  contacts?: { name: string } | null;
  accounts?: { name: string } | null;
}

// categories: id(uuid), name(text), color(text), icon(text), type('income' | 'expense')
export interface Category {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  type: 'income' | 'expense';
}

// notes: id(uuid), note_text(text), color(varchar), is_pinned(bool), is_code(bool), language(varchar), created_at(timestamptz), updated_at(timestamptz)
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

// investments: id(uuid), name(text), amount(numeric), type(text), current_value(numeric), created_at(timestamptz)
export interface Investment {
  id: string;
  name: string;
  type: string; // "ذهب", "أسهم", "عملات", "مدخرات"
  amount: number; // Purchase price
  current_value: number;
  created_at: string;
}

// goals: id(uuid), name(text), target_amount(numeric), current_amount(numeric), deadline(date), color(text), icon(text)
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
