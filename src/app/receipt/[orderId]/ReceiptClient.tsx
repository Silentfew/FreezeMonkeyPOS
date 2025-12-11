"use client";

import { useEffect } from 'react';
import { Order } from '@/domain/models/order';

interface ReceiptClientProps {
  order: Order;
  autoPrint?: boolean;
  pricing: { pricesIncludeTax: boolean; gstRatePercent: number };
}

export default function ReceiptClient({ order, autoPrint, pricing }: ReceiptClientProps) {
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
  const payments = Array.isArray(order.payments) ? order.payments : [];
  const totalPaidCents = payments.reduce((sum, payment) => sum + (payment.amountCents ?? 0), 0);
  const gstNote = pricing.pricesIncludeTax
    ? `* All prices include ${pricing.gstRatePercent.toFixed(0)}% GST`
    : null;

  return (
    <div className="receipt-root">
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
            <span>Subtotal (excl. GST)</span>
            <span>${order.totals.subtotal.toFixed(2)}</span>
          </div>
          <div className="total-row">
            <span>GST</span>
            <span>${order.totals.tax.toFixed(2)}</span>
          </div>
          <div className="total-row total-row--bold">
            <span>Total (incl. GST)</span>
            <span>${order.totals.total.toFixed(2)}</span>
          </div>
          {gstNote ? <div className="totals-note">{gstNote}</div> : null}
        </div>

        {payments.length > 0 ? (
          <>
            <div className="divider" />
            <div className="payments">
              <div className="section-label">Payment</div>
              {payments.map((payment, index) => (
                <div key={`${payment.type}-${index}`} className="payment-row">
                  <span>{payment.type}</span>
                  <span>${(payment.amountCents / 100).toFixed(2)}</span>
                </div>
              ))}
              <div className="payment-row payment-row--total">
                <span>Total paid</span>
                <span>${(totalPaidCents / 100).toFixed(2)}</span>
              </div>
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
        .receipt-root {
          min-height: 100vh;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          background: #ffffff;
          padding: 16px 0;
          color: #000;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.35;
        }

        .receipt-card {
          width: 72mm;
          margin: 0 auto;
          background: #ffffff;
          padding: 4mm 2mm;
          box-shadow: none;
          border-radius: 0;
        }

        .receipt-header {
          text-align: center;
          margin-bottom: 8px;
        }

        .receipt-title {
          font-size: 16px;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-transform: uppercase;
        }

        .receipt-subtitle {
          font-size: 11px;
          margin-top: 1px;
          color: #444;
        }

        .receipt-meta {
          font-size: 10px;
          margin-top: 4px;
          color: #333;
        }

        .receipt-ticket {
          font-size: 12px;
          font-weight: 700;
          margin-top: 4px;
        }

        .divider {
          border-top: 1px dashed #ccc;
          margin: 10px 0;
        }

        .line-items {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 11px;
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
          font-size: 11px;
          color: #444;
        }

        .line-total {
          font-weight: 700;
        }

        .totals {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11px;
        }

        .total-row {
          display: flex;
          justify-content: space-between;
        }

        .total-row--bold {
          font-size: 13px;
          font-weight: 800;
        }

        .totals-note {
          margin-top: 4px;
          font-size: 10px;
          color: #444;
        }

        .payments {
          display: flex;
          flex-direction: column;
          gap: 4px;
          font-size: 11px;
        }

        .section-label {
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-size: 10px;
          color: #444;
        }

        .payment-row {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
        }

        .payment-row--total {
          font-weight: 700;
        }

        .footer {
          text-align: center;
          font-size: 11px;
          margin-top: 8px;
          color: #222;
        }

        .footer-note {
          margin-top: 3px;
          font-size: 10px;
        }

        @media print {
          .receipt-root {
            background: #fff;
            padding: 0;
          }

          .receipt-card {
            width: 72mm;
            margin: 0;
            padding: 2mm 2mm 4mm;
            box-shadow: none;
            border-radius: 0;
          }

          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
