import { getOrderByOrderNumber } from '@/infra/fs/ordersRepo';
import { KitchenReceiptClient } from './KitchenReceiptClient';

interface PageProps {
  params: { orderNumber: string };
}

export default async function KitchenReceiptPage({ params }: PageProps) {
  const order = await getOrderByOrderNumber(decodeURIComponent(params.orderNumber));

  if (!order) {
    return <div>Order not found</div>;
  }

  return <KitchenReceiptClient order={order} />;
}
