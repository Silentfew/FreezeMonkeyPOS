import path from 'path';
import { Order } from '@/domain/models/order';
import { createOrderFromDraft, OrderDraft } from '@/domain/orders/createOrderFromDraft';
import { readJSON, writeJSON } from './jsonStore';

interface Counters {
  orders: {
    lastDate: string;
    lastSequence: number;
  };
}

const COUNTERS_FILE = 'meta/counters.json';
const ORDERS_DIR = 'orders';
const defaultCounters: Counters = {
  orders: {
    lastDate: '',
    lastSequence: 0,
  },
};

export function formatDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function getCounters(): Promise<Counters> {
  return readJSON<Counters>(COUNTERS_FILE, defaultCounters);
}

async function persistCounters(counters: Counters): Promise<void> {
  await writeJSON(COUNTERS_FILE, counters);
}

async function nextOrderNumber(date: string): Promise<string> {
  const counters = await getCounters();
  const sequence = counters.orders.lastDate === date ? counters.orders.lastSequence + 1 : 1;

  counters.orders.lastDate = date;
  counters.orders.lastSequence = sequence;
  await persistCounters(counters);

  return `${date}-${sequence.toString().padStart(4, '0')}`;
}

function ordersFilePath(date: string): string {
  return path.join(ORDERS_DIR, `${date}.json`);
}

async function readDailyOrders(date: string): Promise<Order[]> {
  return readJSON<Order[]>(ordersFilePath(date), []);
}

async function writeDailyOrders(date: string, orders: Order[]): Promise<void> {
  await writeJSON(ordersFilePath(date), orders);
}

export async function appendOrderFromDraft(draft: OrderDraft): Promise<Order> {
  const date = formatDate();
  const orderNumber = await nextOrderNumber(date);
  const order = createOrderFromDraft(draft, { orderNumber, createdAt: new Date().toISOString() });
  const existing = await readDailyOrders(date);
  await writeDailyOrders(date, [...existing, order]);
  return order;
}

export async function getOrdersForDate(date: string): Promise<Order[]> {
  return readDailyOrders(date);
}

export async function getOrdersBetween(startDate: string, endDate: string): Promise<Order[]> {
  const orders: Order[] = [];

  const current = new Date(startDate);
  current.setUTCHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setUTCHours(0, 0, 0, 0);

  while (current <= end) {
    const dateString = current.toISOString().slice(0, 10);
    const dailyOrders = await readJSON<Order[]>(ordersFilePath(dateString), []);
    if (Array.isArray(dailyOrders) && dailyOrders.length > 0) {
      orders.push(...dailyOrders);
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return orders;
}
