'use client';

import { useEffect, useMemo } from 'react';
import type { Order } from '@/domain/models/order';
import styles from './kitchen.module.css';

interface KitchenReceiptClientProps {
  order: Order;
}

export function KitchenReceiptClient({ order }: KitchenReceiptClientProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.print();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const ticketNumber = order.ticketNumber ?? order.orderNumber;
  const kitchenItems = useMemo(() => {
    const allowedCategories = ['HOTDOG', 'CHIPS', 'BOILUP'];
    return order.items.filter((item) => {
      const category = (item as any).category ?? (item as any).categoryId;
      if (category) {
        return allowedCategories.includes(String(category).toUpperCase());
      }
      return true;
    });
  }, [order.items]);

  return (
    <div className={styles.kitchenReceiptRoot}>
      <div className={styles.kitchenTicketHuge}>
        {typeof ticketNumber === 'number' ? `#${ticketNumber}` : ticketNumber}
      </div>

      <div className={styles.kitchenMeta}>
        <div>Freeze Monkey – Kitchen</div>
        <div>{new Date(order.createdAt).toLocaleTimeString()}</div>
      </div>

      <div className={styles.kitchenSeparator}>------------------------------</div>

      <div className={styles.kitchenItems}>
        {kitchenItems.map((item, idx) => (
          <div key={idx} className={styles.kitchenItemRow}>
            <div>
              {item.quantity} x {item.name}
            </div>
          </div>
        ))}
      </div>

      {order.note && (
        <>
          <div className={styles.kitchenSeparator}>------------------------------</div>
          <div className={styles.kitchenNotesTitle}>NOTES:</div>
          <div className={styles.kitchenNotesBody}>{order.note}</div>
        </>
      )}
    </div>
  );
}
