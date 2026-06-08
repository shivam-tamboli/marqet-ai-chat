import 'dotenv/config';
import app from './app';
import { seedFaq } from './seed/faq';
import { seedCustomers } from './seed/customers';
import { seedOrders } from './seed/orders';

const port = parseInt(process.env.PORT || '3001', 10);

async function start() {
  await seedFaq();
  await seedCustomers(); // must run before seedOrders so customer FKs resolve
  await seedOrders();
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

start().catch((err) => {
  console.error('Startup failed:', err);
  process.exit(1);
});
