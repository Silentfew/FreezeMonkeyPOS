import { buildReceiptLines } from '@/domain/orders/receipt';
import { getOrderByOrderNumber } from '@/infra/fs/ordersRepo';

export default async function ReceiptPage({ params }: { params: { orderNumber: string } }) {
  const orderNumber = decodeURIComponent(params.orderNumber);
  const order = await getOrderByOrderNumber(orderNumber);

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
  const ticketLabel = order.ticketNumber ?? order.orderNumber;

  return (
    <html>
      <head>
        <title>Receipt {orderNumber}</title>
      </head>
      <body style={{ fontFamily: 'monospace', padding: '24px', color: '#111', background: '#fff' }}>
        <main style={{ maxWidth: '320px' }}>
          <div style={{ marginBottom: '8px', fontWeight: 700, fontSize: '13px' }}>
            <div>Ticket: {ticketLabel}</div>
            <div style={{ fontWeight: 500, fontSize: '12px' }}>
              {new Date(order.createdAt).toLocaleString()}
            </div>
          </div>
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
