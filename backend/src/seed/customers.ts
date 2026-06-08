import 'dotenv/config';
import { supabase } from '../db/supabase';

// UUIDs must match what is already in the database (or will be inserted).
// The frontend CUSTOMERS array uses these same IDs.
const DEMO_CUSTOMERS = [
  { id: '8768f042-f13b-43bb-8d9d-01843a520a2d', name: 'Priya Sharma' },
  { id: '16b7fe8a-d751-412c-a18d-a8b3abe62299', name: 'Arjun Nair'   },
  { id: '7d6b57b3-b4c9-4b68-99da-2ded7ebb0fd3', name: 'Sneha Patel'  },
  { id: '5301c208-6761-4244-a655-ec48feab2733', name: 'Divya Reddy'  },
  { id: 'ebc2cf6b-f54d-4a30-b84e-8d561766bb70', name: 'Karan Singh'  },
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
      DEMO_CUSTOMERS.map((c) => ({ id: c.id, name: c.name })),
      { onConflict: 'id', ignoreDuplicates: true }
    );
  if (error) throw error;

  console.log('Customers seed complete.');
}

if (require.main === module) {
  seedCustomers().catch((err) => { console.error(err); process.exit(1); });
}
