import { promises as fs } from 'fs';
import path from 'path';
import { Order } from '@/domain/models/order';
import { createOrderFromDraft, OrderDraft } from '@/domain/orders/createOrderFromDraft';
import { readJSON, writeJSON } from './jsonStore';

interface DayCounters {
  lastOrderNumber: number;
  lastTicketNumber?: number;
}

interface Counters {
  orders: {
    lastDate: string;
    lastSequence: number;
    days?: Record<string, DayCounters>;
  };
}

const COUNTERS_FILE = 'meta/counters.json';
const ORDERS_DIR = 'orders';
const defaultCounters: Counters = {
  orders: {
    lastDate: '',
    lastSequence: 0,
    days: {},
  },
};

export function formatDate(date: Date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

async function getCounters(): Promise<Counters> {
  const counters = await readJSON<Counters>(COUNTERS_FILE, defaultCounters);
  if (!counters.orders.days) {
    counters.orders.days = {};
  }
  return counters;
}

async function persistCounters(counters: Counters): Promise<void> {
  await writeJSON(COUNTERS_FILE, counters);
}

async function nextOrderIdentifiers(date: string): Promise<{ orderNumber: string; ticketNumber: number }> {
  const counters = await getCounters();
  const dayCounters: DayCounters = counters.orders.days?.[date] ?? {
    lastOrderNumber: counters.orders.lastDate === date ? counters.orders.lastSequence : 0,
    lastTicketNumber: 0,
  };

  const nextOrderNumber = dayCounters.lastOrderNumber + 1;
  const nextTicketNumber = (dayCounters.lastTicketNumber ?? 0) + 1;

  dayCounters.lastOrderNumber = nextOrderNumber;
  dayCounters.lastTicketNumber = nextTicketNumber;

  counters.orders.lastDate = date;
  counters.orders.lastSequence = nextOrderNumber;
  counters.orders.days = { ...(counters.orders.days ?? {}), [date]: dayCounters };

  await persistCounters(counters);

  return { orderNumber: `${date}-${nextOrderNumber.toString().padStart(4, '0')}`, ticketNumber: nextTicketNumber };
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

function parseOrderDate(orderNumber: string): string | null {
  const match = orderNumber.match(/^(\d{4}-\d{2}-\d{2})-/);
  return match ? match[1] : null;
}

export async function appendOrderFromDraft(draft: OrderDraft): Promise<Order> {
  const date = formatDate();
  const { orderNumber, ticketNumber } = await nextOrderIdentifiers(date);
  const order = await createOrderFromDraft(draft, {
    orderNumber,
    createdAt: new Date().toISOString(),
    ticketNumber,
  });
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

async function findOrderInFile(file: string, orderNumber: string): Promise<Order | null> {
  const orders = await readJSON<Order[]>(path.join(ORDERS_DIR, file), []);
  return orders.find((order) => order.orderNumber === orderNumber) ?? null;
}

export async function getOrderByOrderNumber(orderNumber: string): Promise<Order | null> {
  const today = formatDate();
  const todayOrders = await readDailyOrders(today);
  const todayMatch = todayOrders.find((order) => order.orderNumber === orderNumber);
  if (todayMatch) return todayMatch;

  try {
    const files = await fs.readdir(path.join(process.cwd(), 'data', ORDERS_DIR));
    for (const file of files) {
      if (!file.endsWith('.json') || file === `${today}.json`) continue;
      const match = await findOrderInFile(file, orderNumber);
      if (match) return match;
    }
  } catch (error) {
    console.error('Failed to locate order by orderNumber', error);
  }

  return null;
}

export async function markKitchenOrderCompleted(orderNumber: string): Promise<Order | null> {
  const date = parseOrderDate(orderNumber) ?? formatDate();
  const orders = await readDailyOrders(date);
  const index = orders.findIndex((order) => order.orderNumber === orderNumber);

  if (index === -1) {
    return null;
  }

  const updatedOrder: Order = {
    ...orders[index],
    kitchenStatus: 'DONE',
    kitchenCompletedAt: new Date().toISOString(),
  };

  const updatedOrders = [...orders];
  updatedOrders[index] = updatedOrder;

  await writeDailyOrders(date, updatedOrders);

  return updatedOrder;
}
