import ReceiptClient from './ReceiptClient';
import { getOrderByOrderNumber } from '@/infra/fs/ordersRepo';
import { loadSettings } from '@/infra/fs/settingsRepo';

interface ReceiptPageProps {
  params: { orderId: string };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function ReceiptPage({ params, searchParams }: ReceiptPageProps) {
  const orderId = decodeURIComponent(params.orderId);
  const order = await getOrderByOrderNumber(orderId);
  const settings = await loadSettings();
  const autoPrint = typeof searchParams?.auto === 'string' ? searchParams.auto === '1' : false;

  if (!order) {
    return (
      <html>
        <body style={{ fontFamily: 'monospace', padding: '24px', color: '#111', background: '#fff' }}>
          <div>Order not found.</div>
        </body>
      </html>
    );
  }

  return (
    <html>
      <head>
        <title>Receipt {orderId}</title>
      </head>
      <body>
        <ReceiptClient
          order={order}
          autoPrint={autoPrint}
          pricing={{
            pricesIncludeTax: settings.pricesIncludeTax ?? false,
            gstRatePercent: settings.gstRatePercent ?? settings.taxRatePercent ?? 15,
          }}
        />
      </body>
    </html>
  );
}
