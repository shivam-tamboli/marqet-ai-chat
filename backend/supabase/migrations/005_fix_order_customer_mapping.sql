-- Reassign MQ-1005/1006/1007 to match the 5 mock customer profiles
UPDATE orders
SET customer_name = 'Priya Sharma'
WHERE order_number = 'MQ-1005';

UPDATE orders
SET customer_name = 'Karan Singh',
    items = '[{"name":"Puma Suede Classic","size":"9","qty":1}]'::jsonb
WHERE order_number = 'MQ-1006';

UPDATE orders
SET customer_name = 'Karan Singh'
WHERE order_number = 'MQ-1007';
