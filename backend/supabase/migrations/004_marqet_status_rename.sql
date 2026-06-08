-- Rename order statuses to e-commerce equivalents
UPDATE orders SET status = 'Packed'    WHERE status = 'Provisioning';
UPDATE orders SET status = 'Shipped'   WHERE status = 'Activated';
UPDATE orders SET status = 'Delivered' WHERE status = 'Live';

-- Drop and recreate the CHECK constraint with new status values
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('Paid', 'Packed', 'Shipped', 'Delivered'));
