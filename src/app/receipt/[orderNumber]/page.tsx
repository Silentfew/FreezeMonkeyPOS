import fs from 'fs/promises';
import path from 'path';
import { buildReceiptLines } from '@/domain/orders/receipt';
import type { Order } from '@/domain/models/order';
import { formatDate, getOrdersForDate } from '@/infra/fs/ordersRepo';
import { readJSON } from '@/infra/fs/jsonStore';

const ordersDir = path.join(process.cwd(), 'data', 'orders');

async function findOrder(orderNumber: string): Promise<Order | null> {
  const todayOrders = await getOrdersForDate(formatDate());
  const matchToday = todayOrders.find((order) => order.orderNumber === orderNumber);
  if (matchToday) return matchToday;

  try {
    const files = await fs.readdir(ordersDir);
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      const orders = await readJSON<Order[]>(path.join('orders', file), []);
      const found = orders.find((order) => order.orderNumber === orderNumber);
      if (found) return found;
    }
  } catch (error) {
    console.error('Failed to search for receipt order', error);
  }

  return null;
}

export default async function ReceiptPage({ params }: { params: { orderNumber: string } }) {
  const orderNumber = decodeURIComponent(params.orderNumber);
  const order = await findOrder(orderNumber);

  if (!order) {
    return (
      <html>
        <body style={{ fontFamily: 'monospace', padding: '24px', color: '#111', background: '#fff' }}>
          <div>Receipt not found.</div>
        </body>
      </html>
    );
  }

  const lines = buildReceiptLines(order);

  return (
    <html>
      <head>
        <title>Receipt {orderNumber}</title>
      </head>
      <body style={{ fontFamily: 'monospace', padding: '24px', color: '#111', background: '#fff' }}>
        <main style={{ maxWidth: '320px' }}>
          {lines.map((line, index) => {
            if (line.type === 'separator') {
              return (
                <div key={index} style={{ margin: '6px 0', fontSize: '12px' }}>
                  {line.value}
                </div>
              );
            }

            if (line.type === 'total') {
              return (
                <div key={index} style={{ fontWeight: 700, fontSize: '16px', marginTop: '8px' }}>
                  {line.value}
                </div>
              );
            }

            return (
              <div key={index} style={{ fontSize: '12px', marginBottom: '4px' }}>
                {line.value}
              </div>
            );
          })}
        </main>
        <script
          dangerouslySetInnerHTML={{
            __html: `if (typeof window !== 'undefined') { window.addEventListener('load', () => window.print()); }`,
          }}
        />
      </body>
    </html>
  );
}
