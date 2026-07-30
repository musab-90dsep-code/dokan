/**
 * Centralized Dokan ERP API Client Module.
 * Changing API_BASE_URL or configuration here instantly updates API routing across the entire web application.
 */

const rawUrl = process.env.NEXT_PUBLIC_API_URL || '';
export const API_BASE_URL = rawUrl ? (rawUrl.endsWith('/api') ? rawUrl : (rawUrl.endsWith('/') ? `${rawUrl}api` : `${rawUrl}/api`)) : '';

export interface ShopSettingsData {
  id?: number;
  business_name: string;
  phone: string;
  email?: string;
  address?: string;
  tax_number?: string;
  currency: string;
  logo_url?: string;
  receipt_footer?: string;
}

export interface PartyData {
  id?: string | number;
  party_type: 'customer' | 'supplier' | 'both';
  name: string;
  business_name?: string;
  customer_type?: string;
  supply_type?: string;
  phone: string;
  alt_phone?: string;
  email?: string;
  country?: string;
  division?: string;
  district?: string;
  thana?: string;
  address?: string;
  postcode?: string;
  id_type?: string;
  nid?: string;
  tin_number?: string;
  opening_balance?: number;
  credit_limit?: number;
  credit_days?: number;
  discount_percent?: number;
  total_due?: number;
  total_purchases?: number;
  total_sales?: number;
  joined_date?: string;
  note?: string;
  photo_url?: string;
}

export interface ProductData {
  id?: string | number;
  name: string;
  sku?: string;
  category?: number | null;
  category_name?: string;
  stock?: number;
  min_stock?: number;
  unit?: string;
  purchase_price: number;
  sell_price: number;
  brand?: string;
  description?: string;
  image_url?: string;
}

export interface TransactionItemData {
  id?: number;
  product?: number | null;
  product_name: string;
  quantity: number;
  price: number;
  unit?: string;
  total: number;
}

export interface TransactionData {
  id?: string | number;
  invoice_no?: string;
  party?: number | null;
  party_name?: string;
  party_phone?: string;
  transaction_type: 'sale' | 'purchase' | 'sale_return' | 'purchase_return' | 'payment_in' | 'payment_out';
  status?: string;
  subtotal?: number;
  discount?: number;
  tax?: number;
  total_amount: number;
  paid_amount: number;
  due_amount: number;
  payment_method?: string;
  bank_account?: number | null;
  cheque_number?: string;
  cheque_bank?: string;
  cheque_due_date?: string;
  cheque_status?: 'pending' | 'cleared' | 'bounced';
  notes?: string;
  created_at?: string;
  items?: TransactionItemData[];
}

export interface ExpenseData {
  id?: string | number;
  category?: number | null;
  category_name?: string;
  title: string;
  amount: number;
  date?: string;
  payment_method?: string;
  bank_account?: number | null;
  reference_no?: string;
  notes?: string;
}

export interface BankData {
  id?: number;
  name: string;
  bank_name?: string;
  account_number?: string;
  branch?: string;
  balance?: number;
  created_at?: string;
}

export interface WeeklyStatItem {
  name: string;
  বিক্রয়: number;
  ক্রয়: number;
}

export interface DashboardStats {
  totalSales: number;
  monthlySales: number;
  totalPurchases: number;
  monthlyPurchases: number;
  totalDues: number;
  totalExpenses: number;
  monthlyExpenses: number;
  totalCash: number;
  totalBank: number;
  lowStockCount: number;
  totalProductsCount: number;
  weeklyData?: WeeklyStatItem[];
  recentTransactions: TransactionData[];
}

// Request Helper
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(options.headers || {}),
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API Error [${response.status} ${response.statusText}]: ${errorText}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  } catch (err: any) {
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      throw new Error(`Django ব্যাকএন্ড সার্ভারের সাথে সংযোগ করা যায়নি (${API_BASE_URL})। অনুগ্রহ করে ব্যাকএন্ড সার্ভার চালু রাখুন: python backend/manage.py runserver 8000`);
    }
    throw err;
  }
}

// Export Centralized API Methods
export const api = {
  // Settings
  settings: {
    get: async (): Promise<ShopSettingsData> => {
      try {
        const list: any = await request<ShopSettingsData[]>('/settings/');
        const arr = Array.isArray(list) ? list : (list?.results || []);
        return arr.length > 0 ? arr[0] : {
          business_name: 'Dokan ERP',
          phone: '01700000000',
          currency: '৳'
        };
      } catch (e) {
        return {
          business_name: 'Dokan ERP',
          phone: '01700000000',
          currency: '৳'
        };
      }
    },
    update: async (id: number, data: Partial<ShopSettingsData>): Promise<ShopSettingsData> => {
      return request<ShopSettingsData>(`/settings/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    }
  },

  // Parties (Customers & Suppliers)
  parties: {
    list: async (params?: { party_type?: 'customer' | 'supplier'; search?: string }): Promise<PartyData[]> => {
      try {
        const query = new URLSearchParams();
        if (params?.party_type) query.append('party_type', params.party_type);
        if (params?.search) query.append('search', params.search);
        const queryStr = query.toString() ? `?${query.toString()}` : '';
        const res: any = await request<PartyData[]>(`/parties/${queryStr}`);
        const arr = Array.isArray(res) ? res : (res?.results || []);
        return arr.map((p: any) => ({
          ...p,
          opening_balance: Number(p.opening_balance || 0),
          credit_limit: Number(p.credit_limit || 0),
          credit_days: Number(p.credit_days || 30),
          discount_percent: Number(p.discount_percent || 0),
          total_due: Number(p.total_due || 0),
          total_purchases: Number(p.total_purchases || 0),
          total_sales: Number(p.total_sales || 0),
        }));
      } catch (e) {
        console.error('parties.list error:', e);
        return [];
      }
    },
    get: async (id: string | number): Promise<PartyData> => {
      const p: any = await request<PartyData>(`/parties/${id}/`);
      return {
        ...p,
        opening_balance: Number(p.opening_balance || 0),
        credit_limit: Number(p.credit_limit || 0),
        credit_days: Number(p.credit_days || 30),
        discount_percent: Number(p.discount_percent || 0),
        total_due: Number(p.total_due || 0),
        total_purchases: Number(p.total_purchases || 0),
        total_sales: Number(p.total_sales || 0),
      };
    },
    create: async (data: PartyData): Promise<PartyData> => {
      return request<PartyData>('/parties/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<PartyData>): Promise<PartyData> => {
      return request<PartyData>(`/parties/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/parties/${id}/`, { method: 'DELETE' });
    }
  },

  // Inventory / Products
  inventory: {
    list: async (params?: { low_stock?: boolean; category?: number; search?: string }): Promise<ProductData[]> => {
      try {
        const query = new URLSearchParams();
        if (params?.low_stock) query.append('low_stock', 'true');
        if (params?.category) query.append('category', String(params.category));
        if (params?.search) query.append('search', params.search);
        const queryStr = query.toString() ? `?${query.toString()}` : '';
        const res: any = await request<ProductData[]>(`/products/${queryStr}`);
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        console.error('inventory.list error:', e);
        return [];
      }
    },
    getLowStock: async (): Promise<ProductData[]> => {
      try {
        const res: any = await request<ProductData[]>('/products/?low_stock=true');
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        return [];
      }
    },
    create: async (data: ProductData): Promise<ProductData> => {
      return request<ProductData>('/products/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<ProductData>): Promise<ProductData> => {
      return request<ProductData>(`/products/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/products/${id}/`, { method: 'DELETE' });
    }
  },

  // Categories
  categories: {
    list: async (): Promise<{ id: number; name: string; description?: string }[]> => {
      try {
        const res: any = await request<{ id: number; name: string; description?: string }[]>('/categories/');
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        return [];
      }
    },
    create: async (name: string, description?: string) => {
      return request('/categories/', {
        method: 'POST',
        body: JSON.stringify({ name, description })
      });
    }
  },

  // Transactions (Sales, Purchases, Returns, Invoices)
  transactions: {
    list: async (params?: { transaction_type?: string; party?: number; cheque_status?: string; search?: string }): Promise<TransactionData[]> => {
      try {
        const query = new URLSearchParams();
        if (params?.transaction_type) query.append('transaction_type', params.transaction_type);
        if (params?.party) query.append('party', String(params.party));
        if (params?.cheque_status) query.append('cheque_status', params.cheque_status);
        if (params?.search) query.append('search', params.search);
        const queryStr = query.toString() ? `?${query.toString()}` : '';
        const res: any = await request<TransactionData[]>(`/transactions/${queryStr}`);
        const arr = Array.isArray(res) ? res : (res?.results || []);
        return arr.map((t: any) => ({
          ...t,
          subtotal: Number(t.subtotal || 0),
          discount: Number(t.discount || 0),
          tax: Number(t.tax || 0),
          total_amount: Number(t.total_amount || 0),
          paid_amount: Number(t.paid_amount || 0),
          due_amount: Number(t.due_amount || 0),
          items: (t.items || []).map((i: any) => ({
            ...i,
            quantity: Number(i.quantity || 0),
            price: Number(i.price || 0),
            total: Number(i.total || 0),
          }))
        }));
      } catch (e) {
        console.error('transactions.list error:', e);
        return [];
      }
    },
    get: async (id: string | number): Promise<TransactionData> => {
      const t: any = await request<TransactionData>(`/transactions/${id}/`);
      return {
        ...t,
        subtotal: Number(t.subtotal || 0),
        discount: Number(t.discount || 0),
        tax: Number(t.tax || 0),
        total_amount: Number(t.total_amount || 0),
        paid_amount: Number(t.paid_amount || 0),
        due_amount: Number(t.due_amount || 0),
        items: (t.items || []).map((i: any) => ({
          ...i,
          quantity: Number(i.quantity || 0),
          price: Number(i.price || 0),
          total: Number(i.total || 0),
        }))
      };
    },
    create: async (data: TransactionData): Promise<TransactionData> => {
      return request<TransactionData>('/transactions/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    update: async (id: string | number, data: Partial<TransactionData>): Promise<TransactionData> => {
      return request<TransactionData>(`/transactions/${id}/`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/transactions/${id}/`, { method: 'DELETE' });
    }
  },

  // Expenses
  expenses: {
    list: async (params?: { category?: number; search?: string }): Promise<ExpenseData[]> => {
      try {
        const query = new URLSearchParams();
        if (params?.category) query.append('category', String(params.category));
        if (params?.search) query.append('search', params.search);
        const queryStr = query.toString() ? `?${query.toString()}` : '';
        const res: any = await request<ExpenseData[]>(`/expenses/${queryStr}`);
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        console.error('expenses.list error:', e);
        return [];
      }
    },
    create: async (data: ExpenseData): Promise<ExpenseData> => {
      return request<ExpenseData>('/expenses/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    delete: async (id: string | number): Promise<void> => {
      return request<void>(`/expenses/${id}/`, { method: 'DELETE' });
    }
  },

  // Expense Categories
  expenseCategories: {
    list: async (): Promise<{ id: number; name: string }[]> => {
      try {
        const res: any = await request<{ id: number; name: string }[]>('/expense-categories/');
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        return [];
      }
    }
  },

  // Banks
  banks: {
    list: async (): Promise<BankData[]> => {
      try {
        const res: any = await request<BankData[]>('/banks/');
        return Array.isArray(res) ? res : (res?.results || []);
      } catch (e) {
        console.error('banks.list error:', e);
        return [];
      }
    },
    create: async (data: Partial<BankData>): Promise<BankData> => {
      return request<BankData>('/banks/', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    }
  },

  // Dashboard Aggregated Stats
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      return request<DashboardStats>('/dashboard/stats/');
    }
  }
};
