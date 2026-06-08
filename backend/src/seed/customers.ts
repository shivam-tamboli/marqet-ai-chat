import 'dotenv/config';
import { supabase } from '../db/supabase';

// The 5 demo customers mirror frontend/src/data/customers.ts.
// slug = frontend customer.id; must stay in sync with that file.
const DEMO_CUSTOMERS = [
  { name: 'Priya Sharma', slug: 'priya' },
  { name: 'Arjun Nair',   slug: 'arjun' },
  { name: 'Sneha Patel',  slug: 'sneha' },
  { name: 'Divya Reddy',  slug: 'divya' },
  { name: 'Karan Singh',  slug: 'karan' },
];

export async function seedCustomers(): Promise<void> {
  const { count } = await supabase
    .from('customers')
    .select('*', { count: 'exact', head: true });

  if ((count ?? 0) >= DEMO_CUSTOMERS.length) {
    console.log(`customers already seeded (${count} rows) — skipping`);
    return;
  }

  console.log(`Seeding ${DEMO_CUSTOMERS.length} demo customers…`);

  const { error } = await supabase
    .from('customers')
    .upsert(
      DEMO_CUSTOMERS.map((c) => ({ name: c.name, slug: c.slug })),
      { onConflict: 'name', ignoreDuplicates: true }
    );
  if (error) throw error;

  console.log('Customers seed complete.');
}

if (require.main === module) {
  seedCustomers().catch((err) => { console.error(err); process.exit(1); });
}
