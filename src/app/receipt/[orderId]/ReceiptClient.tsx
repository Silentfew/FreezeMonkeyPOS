"use client";

import { useEffect } from 'react';
import { Order } from '@/domain/models/order';

interface ReceiptClientProps {
  order: Order;
  autoPrint?: boolean;
}

export default function ReceiptClient({ order, autoPrint }: ReceiptClientProps) {
  useEffect(() => {
    if (!autoPrint) return;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && 'print' in window) {
        window.print();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [autoPrint]);

  const ticketLabel = order.ticketNumber ?? order.orderNumber;

  return (
    <div className="receipt-body">
      <div className="receipt-card">
        <div className="receipt-header">
          <div className="receipt-title">Freeze Monkey</div>
          <div className="receipt-subtitle">Sweet Treats & Snacks</div>
          <div className="receipt-meta">{new Date(order.createdAt).toLocaleString()}</div>
          <div className="receipt-ticket">Order {ticketLabel}</div>
        </div>

        <div className="divider" />

        <div className="line-items">
          {order.items.map((item) => (
            <div key={`${order.orderNumber}-${item.productId}-${item.name}`} className="line">
              <div>
                <div className="line-name">{item.name}</div>
                <div className="line-qty">Qty: {item.quantity}</div>
              </div>
              <div className="line-total">${(item.lineTotal).toFixed(2)}</div>
            </div>
          ))}
        </div>

        <div className="divider" />

        <div className="totals">
          <div className="total-row">
            <span>Subtotal</span>
            <span>${order.totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>GST</span>
            <span>${order.totals.tax.toFixed(2)}</span>
          </div>
          <div className="total-row total-row--bold">
            <span>Total</span>
            <span>${order.totals.total.toFixed(2)}</span>
          </div>
        </div>

        {order.payments && order.payments.length > 0 ? (
          <>
            <div className="divider" />
            <div className="payments">
              <div className="section-label">Payment</div>
              {order.payments.map((payment, index) => (
                <div key={`${payment.type}-${index}`} className="payment-row">
                  <span>{payment.type}</span>
                  <span>${(payment.amountCents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}

        <div className="divider" />

        <div className="footer">
          <div>Thank you for visiting Freeze Monkey!</div>
          <div className="footer-note">Flavoria Crafted · Stay frosty ❄️</div>
        </div>
      </div>

      <style jsx>{`
        .receipt-body {
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          background: #f5f5f5;
          padding: 24px;
          color: #111;
          font-family: 'Courier New', Courier, monospace;
        }

        .receipt-card {
          width: 100%;
          max-width: 340px;
          background: white;
          padding: 16px 18px;
          border-radius: 12px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.08);
        }

        .receipt-header {
          text-align: center;
          margin-bottom: 10px;
        }

        .receipt-title {
          font-size: 18px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .receipt-subtitle {
          font-size: 12px;
          margin-top: 2px;
          color: #555;
        }

        .receipt-meta {
          font-size: 11px;
          margin-top: 4px;
          color: #333;
        }

        .receipt-ticket {
          font-size: 13px;
          font-weight: 700;
          margin-top: 6px;
        }

        .divider {
          border-top: 1px dashed #ccc;
          margin: 12px 0;
        }

        .line-items {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
        }

        .line {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .line-name {
          font-weight: 700;
        }

        .line-qty {
          font-size: 12px;
          color: #555;
        }

        .line-total {
          font-weight: 700;
        }

        .totals {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
        }

        .total-row--bold {
          font-size: 15px;
          font-weight: 800;
        }

        .payments {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 13px;
        }

        .section-label {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 11px;
          color: #666;
        }

        .payment-row {
          display: flex;
          justify-content: space-between;
        }

        .footer {
          text-align: center;
          font-size: 12px;
          margin-top: 8px;
          color: #333;
        }

        .footer-note {
          margin-top: 4px;
          font-size: 11px;
        }

        @media print {
          .receipt-body {
            background: white;
            padding: 0;
          }

          .receipt-card {
            box-shadow: none;
            max-width: 320px;
            margin: 0 auto;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  );
}
