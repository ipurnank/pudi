import { create } from 'zustand';

const API_URL = process.env.EXPO_PUBLIC_BACKEND_URL || '';

export interface Category {
  id: string;
  name: string;
  color: string;
  icon: string;
  created_at: string;
}

export interface Transaction {
  id: string;
  amount: number;
  category_id: string;
  category_name: string;
  type: 'expense' | 'income';
  date: string;
  note: string;
  is_recurring: boolean;
  created_at: string;
}

export interface Reminder {
  id: string;
  title: string;
  message: string;
  date: string;
  time: string;
  is_recurring: boolean;
  is_enabled: boolean;
  created_at: string;
}

export interface MonthlyAnalytics {
  year: number;
  month: number;
  total_income: number;
  total_expense: number;
  net_balance: number;
  savings_percentage: number;
  category_breakdown: Record<string, number>;
  transaction_count: number;
}

interface SixMonthData {
  month: string;
  year: number;
  income: number;
  expense: number;
}

interface StoreState {
  categories: Category[];
  transactions: Transaction[];
  reminders: Reminder[];
  monthlyAnalytics: MonthlyAnalytics | null;
  lastSixMonths: SixMonthData[];
  isLoading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  createCategory: (data: Partial<Category>) => Promise<void>;
  updateCategory: (id: string, data: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  fetchTransactions: (filters?: { type?: string; category_id?: string; start_date?: string; end_date?: string }) => Promise<void>;
  createTransaction: (data: Partial<Transaction>) => Promise<void>;
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  fetchReminders: () => Promise<void>;
  createReminder: (data: Partial<Reminder>) => Promise<void>;
  updateReminder: (id: string, data: Partial<Reminder>) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;
  fetchMonthlyAnalytics: (year: number, month: number) => Promise<void>;
  fetchLastSixMonths: () => Promise<void>;
  exportCSV: (start_date?: string, end_date?: string) => Promise<string>;
  resetAllData: () => Promise<void>;
}

export const useStore = create<StoreState>((set) => ({
  categories: [],
  transactions: [],
  reminders: [],
  monthlyAnalytics: null,
  lastSixMonths: [],
  isLoading: false,
  error: null,

  fetchCategories: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/categories`);
      const data = await response.json();
      set({ categories: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createCategory: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/categories`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const newCategory = await response.json();
      set((state) => ({ categories: [...state.categories, newCategory], isLoading: false }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateCategory: async (id, data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/categories/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const updated = await response.json();
      set((state) => ({ categories: state.categories.map((c) => (c.id === id ? updated : c)), isLoading: false }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteCategory: async (id) => {
    try {
      set({ isLoading: true, error: null });
      await fetch(`${API_URL}/api/categories/${id}`, { method: 'DELETE' });
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id), isLoading: false }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchTransactions: async (filters) => {
    try {
      set({ isLoading: true, error: null });
      const params = new URLSearchParams();
      if (filters?.type) params.append('type', filters.type);
      if (filters?.category_id) params.append('category_id', filters.category_id);
      if (filters?.start_date) params.append('start_date', filters.start_date);
      if (filters?.end_date) params.append('end_date', filters.end_date);
      const url = `${API_URL}/api/transactions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url);
      const data = await response.json();
      set({ transactions: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createTransaction: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/transactions`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const newTransaction = await response.json();
      set((state) => ({ transactions: [newTransaction, ...state.transactions], isLoading: false }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateTransaction: async (id, data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/transactions/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const updated = await response.json();
      set((state) => ({ transactions: state.transactions.map((t) => (t.id === id ? updated : t)), isLoading: false }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteTransaction: async (id) => {
    try {
      set({ isLoading: true, error: null });
      await fetch(`${API_URL}/api/transactions/${id}`, { method: 'DELETE' });
      set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id), isLoading: false }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchReminders: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/reminders`);
      const data = await response.json();
      set({ reminders: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  createReminder: async (data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/reminders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const newReminder = await response.json();
      set((state) => ({ reminders: [...state.reminders, newReminder], isLoading: false }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  updateReminder: async (id, data) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/reminders/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const updated = await response.json();
      set((state) => ({ reminders: state.reminders.map((r) => (r.id === id ? updated : r)), isLoading: false }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  deleteReminder: async (id) => {
    try {
      set({ isLoading: true, error: null });
      await fetch(`${API_URL}/api/reminders/${id}`, { method: 'DELETE' });
      set((state) => ({ reminders: state.reminders.filter((r) => r.id !== id), isLoading: false }));
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchMonthlyAnalytics: async (year, month) => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/analytics/monthly?year=${year}&month=${month}`);
      const data = await response.json();
      set({ monthlyAnalytics: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  fetchLastSixMonths: async () => {
    try {
      set({ isLoading: true, error: null });
      const response = await fetch(`${API_URL}/api/analytics/last-six-months`);
      const data = await response.json();
      set({ lastSixMonths: data, isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  exportCSV: async (start_date, end_date) => {
    const params = new URLSearchParams();
    if (start_date) params.append('start_date', start_date);
    if (end_date) params.append('end_date', end_date);
    const url = `${API_URL}/api/export/csv${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.csv_content;
  },

  resetAllData: async () => {
    try {
      set({ isLoading: true, error: null });
      await fetch(`${API_URL}/api/reset-all`, { method: 'DELETE' });
      set({ transactions: [], categories: [], reminders: [], monthlyAnalytics: null, lastSixMonths: [], isLoading: false });
    } catch (error) {
      set({ error: (error as Error).message, isLoading: false });
    }
  },
}));
