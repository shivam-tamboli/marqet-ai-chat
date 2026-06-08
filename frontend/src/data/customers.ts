export interface Customer {
  id: string;
  name: string;
  city: string;
  initials: string;
  color: string;
}

export const CUSTOMERS: Customer[] = [
  { id: '8768f042-f13b-43bb-8d9d-01843a520a2d', name: 'Priya Sharma', city: 'Mumbai',    initials: 'PS', color: '#F59E0B' },
  { id: '16b7fe8a-d751-412c-a18d-a8b3abe62299', name: 'Arjun Nair',   city: 'Bangalore', initials: 'AN', color: '#3B82F6' },
  { id: '7d6b57b3-b4c9-4b68-99da-2ded7ebb0fd3', name: 'Sneha Patel',  city: 'Ahmedabad', initials: 'SP', color: '#10B981' },
  { id: '5301c208-6761-4244-a655-ec48feab2733', name: 'Divya Reddy',  city: 'Hyderabad', initials: 'DR', color: '#8B5CF6' },
  { id: 'ebc2cf6b-f54d-4a30-b84e-8d561766bb70', name: 'Karan Singh',  city: 'Delhi',     initials: 'KS', color: '#EF4444' },
];

export const DEFAULT_CUSTOMER = CUSTOMERS[0];
