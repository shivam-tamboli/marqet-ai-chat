import 'dotenv/config';
import { supabase } from '../db/supabase';
import { getCustomerByName } from '../db/queries';
import type { OrderStatus } from '../types/database';

const MOCK_ORDERS = [
  {
    order_number: 'MQ-1001',
    status: 'Paid' as OrderStatus,
    customer_name: 'Priya Sharma',
    items: [{ name: 'Nike Air Force 1', size: '8', qty: 1 }],
  },
  {
    order_number: 'MQ-1002',
    status: 'Packed' as OrderStatus,
    customer_name: 'Arjun Nair',
    items: [{ name: 'Sony WH-1000XM5', qty: 1 }],
  },
  {
    order_number: 'MQ-1003',
    status: 'Shipped' as OrderStatus,
    customer_name: 'Sneha Patel',
    items: [
      { name: "Levi's 511 Slim Jeans", size: '32', qty: 1 },
      { name: 'H&M Essential Cotton Tees', qty: 1 },
    ],
  },
  {
    order_number: 'MQ-1004',
    status: 'Delivered' as OrderStatus,
    customer_name: 'Divya Reddy',
    items: [
      { name: 'Mamaearth Vitamin C Face Wash', qty: 1 },
      { name: 'The Ordinary Niacinamide 10% + Zinc 1% Serum', qty: 1 },
    ],
  },
  {
    order_number: 'MQ-1005',
    status: 'Shipped' as OrderStatus,
    customer_name: 'Priya Sharma',
    items: [{ name: 'Apple AirPods Pro (2nd gen)', qty: 1 }],
  },
  {
    order_number: 'MQ-1006',
    status: 'Packed' as OrderStatus,
    customer_name: 'Karan Singh',
    items: [{ name: 'Puma Suede Classic', size: '9', qty: 1 }],
  },
  {
    order_number: 'MQ-1007',
    status: 'Paid' as OrderStatus,
    customer_name: 'Karan Singh',
    items: [
      { name: 'Adidas Samba OG', size: '9', qty: 1 },
      { name: 'boAt Airdopes 141', qty: 1 },
    ],
  },
];

export async function seedOrders(): Promise<void> {
  const { count } = await supabase
    .from('orders')
    .select('*', { count: 'exact', head: true });

  if ((count ?? 0) > 0) {
    console.log(`orders already seeded (${count} rows) — skipping`);
    return;
  }

  console.log(`Seeding ${MOCK_ORDERS.length} mock orders…`);

  // Resolve customer UUIDs so the orders.customer_id FK is populated from the start.
  const rows = await Promise.all(
    MOCK_ORDERS.map(async (o) => {
      const customer = await getCustomerByName(o.customer_name).catch(() => null);
      return { ...o, customer_id: customer?.id ?? null, updated_at: new Date().toISOString() };
    })
  );

  const { error } = await supabase.from('orders').insert(rows as never);
  if (error) throw error;

  console.log('Orders seed complete.');
}

// Allow running directly: ts-node src/seed/orders.ts
if (require.main === module) {
  seedOrders().catch((err) => { console.error(err); process.exit(1); });
}
