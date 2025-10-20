// Fix: Define the Page type as a union of string literals to avoid circular dependency.
export type Page = 'home' | 'accounts' | 'transactions' | 'debts' | 'contacts' | 'categories' | 'reports' | 'notes';

// From user prompt:
// accounts: id(uuid), name(text), type(text), balance(numeric), currency(text)
export interface Account {
  id: string;
  name: string;
  type: string; // "نقدي", "بنكي", "مخصص"
  balance: number;
  currency: string;
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
  // For display purposes after joining
  accounts?: { name: string; currency: string } | null;
  categories?: { name: string } | null;
  to_accounts?: { name: string } | null;
}

// contacts: id(uuid), name(text), phone(text), address(text)
export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
}

// debts: id(uuid), contact_id(uuid), amount(numeric), due_date(date), paid(boolean), type('for_you' | 'on_you'), description(text)
export interface Debt {
  id: string;
  contact_id: string | null;
  amount: number;
  due_date: string | null; // Date string
  paid: boolean;
  type: 'for_you' | 'on_you';
  description: string | null;
  // For display
  contacts?: { name: string } | null;
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
