import { create } from 'zustand';
import { CUSTOMERS, DEFAULT_CUSTOMER } from '../data/customers';
import type { Customer } from '../data/customers';
import { STORAGE_KEYS } from '../lib/storage';

function load(): Customer {
  try {
    const id = localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOMER);
    return CUSTOMERS.find((c) => c.id === id) ?? DEFAULT_CUSTOMER;
  } catch {
    return DEFAULT_CUSTOMER;
  }
}

interface CustomerState {
  customer: Customer;
  setCustomer: (c: Customer) => void;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customer: load(),
  setCustomer: (c) => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CUSTOMER, c.id);
    set({ customer: c });
  },
}));
