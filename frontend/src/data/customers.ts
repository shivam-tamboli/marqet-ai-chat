export interface Customer {
  id: string;
  name: string;
  city: string;
  initials: string;
  color: string;
}

export const CUSTOMERS: Customer[] = [
  { id: 'priya', name: 'Priya Sharma', city: 'Mumbai',    initials: 'PS', color: '#F59E0B' },
  { id: 'arjun', name: 'Arjun Nair',   city: 'Bangalore', initials: 'AN', color: '#3B82F6' },
  { id: 'sneha', name: 'Sneha Patel',  city: 'Ahmedabad', initials: 'SP', color: '#10B981' },
  { id: 'divya', name: 'Divya Reddy',  city: 'Hyderabad', initials: 'DR', color: '#8B5CF6' },
  { id: 'karan', name: 'Karan Singh',  city: 'Delhi',     initials: 'KS', color: '#EF4444' },
];

export const DEFAULT_CUSTOMER = CUSTOMERS[0];
