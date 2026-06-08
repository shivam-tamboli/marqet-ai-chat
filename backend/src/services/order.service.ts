import { getOrderByNumber, getOrdersByCustomerName, advanceOrderStatus } from '../db/queries';
import type { Database } from '../types/database';

type OrderRow = Database['public']['Tables']['orders']['Row'];

export async function getOrder(orderNumber: string): Promise<OrderRow | null> {
  return getOrderByNumber(orderNumber.toUpperCase());
}

export async function getCustomerOrders(customerName: string): Promise<OrderRow[]> {
  return getOrdersByCustomerName(customerName);
}

export async function advanceOrder(orderNumber: string): Promise<OrderRow | null> {
  return advanceOrderStatus(orderNumber.toUpperCase());
}
