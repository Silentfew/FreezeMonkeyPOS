"use client";

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { fetchCategories, Category } from '@/lib/categories-store';
import { fetchProducts, Product } from '@/lib/products-store';

const CATEGORY_DETAILS: Record<string, { title: string; icon: string }> = {
  '1': { title: 'Burgers', icon: '🍔' },
  '2': { title: 'Hotdogs', icon: '🌭' },
  '3': { title: 'Fries', icon: '🍟' },
  '4': { title: 'Slush & Floats', icon: '🥤' },
  '5': { title: 'Boil-Up', icon: '🍲' },
  '6': { title: 'Desserts', icon: '🍨' },
};

type CartItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
};

type PaymentType = 'CASH' | 'CARD' | 'OTHER';

type PaymentDraft = {
  type: PaymentType;
  amountCents: number;
  givenCents?: number;
  changeCents?: number;
};

type DraftOrderItem = {
  productId: string;
  name: string;
  basePrice: number;
  quantity: number;
  modifiers: [];
};

type DraftOrderPayload = {
  items: DraftOrderItem[];
  cashierName?: string;
  taxFree?: boolean;
  note?: string;
  taxRate?: number;
  payments?: PaymentDraft[];
  discountCents?: number;
};

type PosProduct = Product & { basePriceCents?: number };

function formatCurrencyFromCents(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

interface PaymentOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  totalCents: number;
  discountedSubtotalCents: number;
  taxCents: number;
  paymentType: PaymentType;
  setPaymentType: (type: PaymentType) => void;
  cashGiven: string;
  setCashGiven: (val: string) => void;
  onCompleteSale: () => void;
  isSubmitting: boolean;
}

function PaymentOverlay({
  isOpen,
  onClose,
  totalCents,
  discountedSubtotalCents,
  taxCents,
  paymentType,
  setPaymentType,
  cashGiven,
  setCashGiven,
  onCompleteSale,
  isSubmitting,
}: PaymentOverlayProps) {
  const { givenCents, changeCents } = useMemo(() => {
    if (paymentType !== 'CASH' || cashGiven.trim() === '') {
      return { givenCents: undefined, changeCents: undefined };
    }

    const parsed = Number(cashGiven);
    if (Number.isNaN(parsed) || parsed <= 0) {
      return { givenCents: undefined, changeCents: undefined };
    }

    const computedGiven = Math.round(parsed * 100);
    const computedChange = Math.max(computedGiven - totalCents, 0);
    return { givenCents: computedGiven, changeCents: computedChange };
  }, [cashGiven, paymentType, totalCents]);

  const handleDigit = (digit: string) => {
    setCashGiven((prev) => {
      const next = prev || '';
      if (digit === '.') {
        if (next.includes('.')) return next;
        if (next === '') return '0.';
      }
      return next + digit;
    });
  };

  const handleBackspace = () => {
    setCashGiven((prev) => prev.slice(0, -1));
  };

  const handleClear = () => setCashGiven('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-[#0B1222] shadow-2xl ring-1 ring-white/10">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-[#E9F9FF]/60">Payment</p>
            <h2 className="text-2xl font-black text-[#E9F9FF]">Rift Checkout</h2>
            <p className="text-sm text-[#A0B4D8]">Amount due: {formatCurrencyFromCents(totalCents)}</p>
            <p className="text-xs text-[#A0B4D8]">Taxable: {formatCurrencyFromCents(discountedSubtotalCents)} · GST: {formatCurrencyFromCents(taxCents)}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="grid flex-1 grid-cols-1 gap-6 overflow-y-auto p-6 md:grid-cols-2">
          <div className="space-y-3">
            <div className="text-xs font-semibold text-[#A0B4D8]">Select tender</div>
            <div className="grid grid-cols-3 gap-2">
              {(['CASH', 'CARD', 'OTHER'] as PaymentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setPaymentType(type);
                    if (type !== 'CASH') {
                      setCashGiven('');
                    }
                  }}
                  className={
                    'rounded-xl px-4 py-3 text-lg font-black transition ' +
                    (paymentType === type
                      ? 'bg-[#FFE561] text-[#0b1222]'
                      : 'bg-white/5 text-[#E9F9FF] hover:bg-white/10')
                  }
                >
                  {type === 'CASH' ? 'Cash' : type === 'CARD' ? 'Card / EFTPOS' : 'Other'}
                </button>
              ))}
            </div>

            {paymentType === 'CARD' && (
              <div className="rounded-2xl bg-white/5 p-4 text-sm text-[#E9F9FF]/80">
                Tap when EFTPOS is approved.
              </div>
            )}

            {paymentType === 'OTHER' && (
              <div className="rounded-2xl bg-white/5 p-4 text-sm text-[#E9F9FF]/80">
                Confirm alternative tender (voucher, IOU, etc.).
              </div>
            )}
          </div>

          <div className="flex flex-col gap-4">
            {paymentType === 'CASH' && (
              <div className="rounded-2xl bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between text-xs text-[#A0B4D8]">
                  <span>Cash given</span>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="rounded-full bg-white/10 px-3 py-1 text-[10px] font-semibold text-white hover:bg-white/20"
                  >
                    Clear
                  </button>
                </div>
                <div className="mb-4 rounded-xl bg-black/40 px-4 py-3 text-center text-3xl font-black text-[#FFE561]">
                  {cashGiven === '' ? '$0.00' : `$${cashGiven}`}
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => handleDigit(digit)}
                      className="rounded-xl bg-[#111827] px-4 py-3 text-2xl font-black text-[#E9F9FF] shadow hover:bg-[#1c2741]"
                    >
                      {digit}
                    </button>
                  ))}
                  {['.', '0', '⌫'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => (digit === '⌫' ? handleBackspace() : handleDigit(digit))}
                      className="rounded-xl bg-[#111827] px-4 py-3 text-2xl font-black text-[#E9F9FF] shadow hover:bg-[#1c2741]"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
                <div className="mt-3 space-y-1 text-sm text-[#E9F9FF]/80">
                  <div className="flex justify-between">
                    <span>Cash entered</span>
                    <span>{givenCents ? formatCurrencyFromCents(givenCents) : '$0.00'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Change</span>
                    <span>
                      {changeCents !== undefined
                        ? formatCurrencyFromCents(changeCents)
                        : '$0.00'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {(paymentType === 'CARD' || paymentType === 'OTHER') && (
              <div className="rounded-2xl bg-white/5 p-4 text-sm text-[#E9F9FF]/80">
                <p className="text-lg font-black text-[#E9F9FF]">{formatCurrencyFromCents(totalCents)}</p>
                <p>Confirm payment to complete the sale.</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/10 bg-[#0F172A] px-6 py-4">
          <div className="text-sm text-[#E9F9FF]/70">Ensure tender is confirmed before completing.</div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white/10 px-5 py-3 text-sm font-semibold text-white hover:bg-white/20"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onCompleteSale}
              disabled={isSubmitting}
              className="rounded-xl bg-[#00C2FF] px-6 py-3 text-lg font-black text-[#0b1222] shadow-lg transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Deploying...' : 'Complete Sale'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PosPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<PosProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [offline, setOffline] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [lastTicketNumber, setLastTicketNumber] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<PaymentType>('CASH');
  const [cashGiven, setCashGiven] = useState<string>('');
  const [discountMode, setDiscountMode] = useState<'NONE' | 'PERCENT' | 'FLAT'>('NONE');
  const [discountInput, setDiscountInput] = useState<string>('');

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const loaded = await fetchCategories();
        setCategories(loaded);
        if (loaded.length > 0) {
          setSelectedCategoryId(loaded[0].id);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
        setOffline(true);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
    if (!selectedCategoryId) return;

    const loadProducts = async () => {
      setLoadingProducts(true);
      try {
        const loaded = await fetchProducts(selectedCategoryId);
        setProducts(loaded);
        setOffline(false);
      } catch (error) {
        console.error('Failed to load products', error);
        setOffline(true);
      } finally {
        setLoadingProducts(false);
      }
    };

    loadProducts();
  }, [selectedCategoryId]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    handleFullscreenChange();

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const subtotalCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
    [cart],
  );
  const taxCents = 0;

  const { discountCents, discountedSubtotalCents, totalCents } = useMemo(() => {
    let computedDiscountCents = 0;

    if (discountMode !== 'NONE' && discountInput.trim() !== '') {
      const val = Number(discountInput);
      if (!Number.isNaN(val) && val > 0) {
        if (discountMode === 'PERCENT') {
          computedDiscountCents = Math.round((subtotalCents * val) / 100);
        } else if (discountMode === 'FLAT') {
          computedDiscountCents = Math.round(val * 100);
        }
      }
    }

    if (computedDiscountCents > subtotalCents) {
      computedDiscountCents = subtotalCents;
    }

    const discountedSubtotal = subtotalCents - computedDiscountCents;
    const total = discountedSubtotal + taxCents;

    return {
      discountCents: computedDiscountCents,
      discountedSubtotalCents: discountedSubtotal,
      totalCents: total,
    };
  }, [discountInput, discountMode, subtotalCents, taxCents]);

  const { givenCents, changeCents } = useMemo(() => {
    let computedGiven: number | undefined;
    let computedChange: number | undefined;

    if (paymentType === 'CASH' && cashGiven.trim() !== '') {
      const parsed = Number(cashGiven);
      if (!Number.isNaN(parsed) && parsed > 0) {
        computedGiven = Math.round(parsed * 100);
        computedChange = computedGiven - totalCents;
        if (computedChange < 0) {
          computedChange = 0;
        }
      }
    }

    return { givenCents: computedGiven, changeCents: computedChange };
  }, [cashGiven, paymentType, totalCents]);

  const handleAddToCart = (product: PosProduct) => {
    setStatusMessage(null);
    setLastOrderId(null);
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
      const unitPriceCents =
        typeof product.basePriceCents === 'number'
          ? product.basePriceCents
          : Math.round(product.price * 100);
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          quantity: 1,
          unitPriceCents,
        },
      ];
    });
  };

  const incrementItem = (productId: string, delta: number) => {
    setCart((current) =>
      current
        .map((item) =>
          item.productId === productId
            ? { ...item, quantity: item.quantity + delta }
            : item,
        )
        .filter((item) => item.quantity > 0),
    );
  };

  const adjustDiscountValue = (delta: number) => {
    if (discountMode === 'NONE') return;

    setDiscountInput((prev) => {
      const numeric = Number(prev || '0');
      const next = Math.max(0, numeric + delta);
      if (next === 0) return '';

      if (discountMode === 'PERCENT') {
        return next.toFixed(0);
      }
      return next.toFixed(2);
    });
  };

  const handleOpenPayment = () => {
    if (!cart.length || isSubmitting) {
      setStatusMessage('No energies queued. Add a relic or ration before deploying.');
      return;
    }
    setIsPaymentOpen(true);
  };

  const handleCompleteSale = async () => {
    if (!cart.length || isSubmitting) {
      setStatusMessage('No energies queued. Add a relic or ration before deploying.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);
    setLastOrderId(null);
    setLastOrderNumber(null);
    setLastTicketNumber(null);

    try {
      let paymentChangeCents = paymentType === 'CASH' ? changeCents ?? 0 : undefined;
      if (typeof paymentChangeCents === 'number' && paymentChangeCents < 0) {
        paymentChangeCents = 0;
      }
      const paymentGivenCents =
        paymentType === 'CASH'
          ? typeof givenCents === 'number'
            ? givenCents
            : totalCents
          : undefined;

      const payload: DraftOrderPayload = {
        items: cart.map((item) => ({
          productId: item.productId,
          name: item.name,
          basePrice: item.unitPriceCents / 100,
          quantity: item.quantity,
          modifiers: [],
        })),
        cashierName: 'Unknown',
        taxFree: false,
        payments: [
          {
            type: paymentType,
            amountCents: totalCents,
            givenCents: paymentGivenCents,
            changeCents: paymentChangeCents,
          },
        ],
        discountCents: discountCents > 0 ? discountCents : undefined,
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        setStatusMessage('Rift Jammed – Could not deploy this order. Try again.');
        return;
      }

      const data = await response.json();
      const orderId: string = data?.orderNumber ?? data?.id ?? null;
      const ticketNumber: number | null = typeof data?.ticketNumber === 'number' ? data.ticketNumber : null;
      setLastOrderId(orderId);
      setLastOrderNumber(orderId);
      setLastTicketNumber(ticketNumber);
      if (ticketNumber != null) {
        setStatusMessage(`Ticket #${ticketNumber} deployed.`);
      } else {
        setStatusMessage('Order deployed.');
      }
      if (orderId) {
        window.open(`/receipt/${orderId}`, '_blank');
      }
      setCart([]);
      setCashGiven('');
      setPaymentType('CASH');
      setDiscountMode('NONE');
      setDiscountInput('');
      setIsPaymentOpen(false);
    } catch (error) {
      console.error(error);
      setStatusMessage('Rift Jammed – Network error while deploying.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const enterFullscreen = async () => {
    const el = document.documentElement;
    if (el.requestFullscreen) await el.requestFullscreen();
  };

  const exitFullscreen = async () => {
    if (document.exitFullscreen) await document.exitFullscreen();
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0B1222] via-[#0e1528] to-[#1E1E1E] text-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-6 lg:flex-row">
        <div className="flex flex-1 flex-col gap-4">
          <header className="flex items-center justify-between rounded-2xl bg-white/5 px-5 py-4 shadow-lg ring-1 ring-white/10">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-[#00C2FF] flex items-center justify-center font-black text-[#1E1E1E] shadow-lg">
                FM
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Freeze Monkey POS · Rift Console</p>
                <h1 className="text-2xl font-black text-[#E9F9FF]">Stormfront Counter · Frostoria Outpost</h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push('/admin/products')}
                className="rounded-full bg-[#FFE561] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#ffeb85] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFE561]"
              >
                Rift Control
              </button>
              <button
                type="button"
                onClick={isFullscreen ? exitFullscreen : enterFullscreen}
                className="rounded-full bg-[#00C2FF] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg ring-1 ring-white/10 transition hover:-translate-y-0.5 hover:bg-[#2ad2ff] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00C2FF]"
              >
                {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              </button>
              <div
                className={`rounded-full px-4 py-2 text-sm font-semibold ${offline ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-100'}`}
              >
                {offline ? 'Rift Link Disrupted (Offline)' : 'Rift Link Stable'}
              </div>
            </div>
          </header>

          <section className="rounded-2xl bg-white/5 p-4 shadow-lg ring-1 ring-white/10">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {categories.map((category) => {
                const detail = CATEGORY_DETAILS[category.id];
                const active = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
                    className={`flex flex-col items-start gap-1 rounded-xl border px-4 py-3 text-left shadow transition hover:-translate-y-1 ${
                      active
                        ? 'border-[#FFE561] bg-[#FFE561]/20 text-[#FFE561]'
                        : 'border-white/5 bg-white/5 text-[#E9F9FF] hover:border-[#00C2FF]/40'
                    }`}
                  >
                    <span className="text-2xl">{detail?.icon ?? '🍧'}</span>
                    <span className="text-sm uppercase tracking-widest text-white/60">{category.name}</span>
                    <span className="text-lg font-bold">{detail?.title ?? category.name}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="flex-1 rounded-2xl bg-white/5 p-4 shadow-lg ring-1 ring-white/10">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Menu</p>
                <h2 className="text-xl font-black text-[#E9F9FF]">
                  {CATEGORY_DETAILS[selectedCategoryId ?? '']?.title ?? 'Pick a category'}
                </h2>
              </div>
              {loadingProducts && <span className="text-sm text-[#E9F9FF]/70">Loading...</span>}
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="relative flex h-full flex-col rounded-xl border border-white/5 bg-[#111827]/80 p-4 shadow-sm ring-1 ring-white/5"
                >
                  <button
                    type="button"
                    onClick={() => handleAddToCart(product)}
                    className="flex flex-1 flex-col justify-between text-left"
                  >
                    <div className="text-sm uppercase tracking-[0.25em] text-[#E9F9FF]/50">
                      {CATEGORY_DETAILS[product.categoryId]?.title}
                    </div>
                    <div className="mt-2 text-lg font-black text-[#E9F9FF]">{product.name}</div>
                  <div className="mt-3 text-xl font-black text-[#FFE561]">
                    {formatCurrencyFromCents(
                      typeof product.basePriceCents === 'number'
                        ? product.basePriceCents
                        : Math.round(product.price * 100),
                    )}
                  </div>
                </button>
              </div>
            ))}
              {products.length === 0 && (
                <div className="col-span-full flex h-32 items-center justify-center rounded-xl border border-dashed border-white/10 text-[#E9F9FF]/70">
                  No products found.
                </div>
              )}
            </div>
          </section>
        </div>

        <aside className="w-full max-w-md space-y-4 rounded-2xl bg-[#0F172A]/80 p-4 shadow-xl ring-1 ring-white/10 backdrop-blur">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Order Summary</p>
              <h3 className="text-xl font-black text-[#E9F9FF]">Ticket · Rift Manifest</h3>
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto rounded-xl bg-white/5 p-3 max-h-[55vh]">
            {cart.length === 0 && (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/10 text-[#E9F9FF]/70">
                No energies queued. Tap a relic or ration to begin.
              </div>
            )}
            {cart.map((item) => (
              <div key={item.productId} className="rounded-xl border border-white/5 bg-[#0B1222] p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-[#E9F9FF]">{item.name}</p>
                    <p className="text-xs text-[#E9F9FF]/60">x {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[#FFE561]">
                      {formatCurrencyFromCents(item.unitPriceCents * item.quantity)}
                    </p>
                    <p className="text-xs text-[#E9F9FF]/60">@ {formatCurrencyFromCents(item.unitPriceCents)}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-[#FFE561] px-3 py-1 text-sm font-bold text-black shadow"
                      onClick={() => incrementItem(item.productId, -1)}
                    >
                      -
                    </button>
                    <span className="min-w-[2ch] text-center text-base font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      className="rounded-full bg-[#00C2FF] px-3 py-1 text-sm font-bold text-[#1E1E1E] shadow"
                      onClick={() => incrementItem(item.productId, 1)}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => incrementItem(item.productId, -item.quantity)}
                    className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-bold text-red-100 hover:bg-red-500/30"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2 rounded-xl bg-white/5 p-4">
            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-[#A0B4D8]">Payment</div>
              <div className="rounded-xl bg-white/5 p-3 text-sm text-[#E9F9FF]">
                <div className="flex items-center justify-between">
                  <span>Method</span>
                  <span className="font-bold text-[#FFE561]">{paymentType === 'CASH' ? 'Cash' : paymentType === 'CARD' ? 'Card / EFTPOS' : 'Other'}</span>
                </div>
                {paymentType === 'CASH' && (
                  <div className="mt-2 space-y-1 text-xs text-[#A0B4D8]">
                    <div className="flex justify-between">
                      <span>Cash given</span>
                      <span className="text-[#E9F9FF]">{cashGiven ? `$${cashGiven}` : '$0.00'}</span>
                    </div>
                    {typeof changeCents === 'number' && changeCents > 0 && (
                      <div className="flex justify-between text-[#E9F9FF]">
                        <span>Change</span>
                        <span className="font-semibold">${(changeCents / 100).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
                <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-[#A0B4D8]">Adjust tender in payment window.</p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              <div className="text-xs font-semibold text-[#A0B4D8]">Discount</div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMode('NONE');
                    setDiscountInput('');
                  }}
                  className={
                    'flex-1 rounded-full px-3 py-1 text-xs font-semibold transition ' +
                    (discountMode === 'NONE'
                      ? 'bg-white/10 text-[#E9F9FF]'
                      : 'bg-white/5 text-[#E9F9FF] hover:bg-white/10')
                  }
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMode('PERCENT');
                    setDiscountInput('');
                  }}
                  className={
                    'flex-1 rounded-full px-3 py-1 text-xs font-semibold transition ' +
                    (discountMode === 'PERCENT'
                      ? 'bg-[#FFE561] text-[#0b1222]'
                      : 'bg-white/5 text-[#E9F9FF] hover:bg-white/10')
                  }
                >
                  % Off
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDiscountMode('FLAT');
                    setDiscountInput('');
                  }}
                  className={
                    'flex-1 rounded-full px-3 py-1 text-xs font-semibold transition ' +
                    (discountMode === 'FLAT'
                      ? 'bg-[#FFE561] text-[#0b1222]'
                      : 'bg-white/5 text-[#E9F9FF] hover:bg-white/10')
                  }
                >
                  $ Off
                </button>
              </div>

              {discountMode !== 'NONE' && (
                <div className="space-y-2 rounded-xl bg-white/5 p-3 text-xs text-[#E9F9FF]">
                  <div className="flex items-center justify-between">
                    <span>Current</span>
                    <span className="font-semibold text-[#FFE561]">
                      {discountInput
                        ? discountMode === 'PERCENT'
                          ? `${discountInput}%`
                          : `$${discountInput}`
                        : 'None'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[11px] font-semibold">
                    <button
                      type="button"
                      onClick={() => adjustDiscountValue(-1)}
                      className="rounded-lg bg-[#111827] px-2 py-2 text-[#E9F9FF] hover:bg-[#1c2741]"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustDiscountValue(1)}
                      className="rounded-lg bg-[#111827] px-2 py-2 text-[#E9F9FF] hover:bg-[#1c2741]"
                    >
                      +1
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustDiscountValue(5)}
                      className="rounded-lg bg-[#111827] px-2 py-2 text-[#E9F9FF] hover:bg-[#1c2741]"
                    >
                      +5
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDiscountInput('')}
                    className="w-full rounded-lg bg-white/10 px-2 py-2 text-[11px] font-semibold text-white hover:bg-white/20"
                  >
                    Clear discount
                  </button>
                </div>
              )}
            </div>

            <div className="mt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span className="text-[#A0B4D8]">Subtotal</span>
                <span>${(subtotalCents / 100).toFixed(2)}</span>
              </div>
              {discountCents > 0 && (
                <div className="flex justify-between text-[#FFD1D1]">
                  <span>Discount</span>
                  <span>- ${(-discountCents / 100).toFixed(2).replace('-', '')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#A0B4D8]">Taxable after discount</span>
                <span>${(discountedSubtotalCents / 100).toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm text-[#E9F9FF]/80">
              <span>Earthrealm Tax</span>
              <span>{formatCurrencyFromCents(taxCents)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-lg font-black text-[#FFE561]">
              <span>Stormfront Total</span>
              <span>{formatCurrencyFromCents(totalCents)}</span>
            </div>
            {lastOrderId && (
              <div className="rounded-xl bg-white/10 px-3 py-2 text-xs font-semibold text-white/80">
                Last order: {lastOrderId}
              </div>
            )}
            {lastTicketNumber != null && (
              <div className="rounded-xl bg-[#FFE561]/20 px-3 py-2 text-xs font-semibold text-[#FFE561]">
                Ticket #{lastTicketNumber}
              </div>
            )}
            {statusMessage && (
              <div className="rounded-xl bg-black/30 px-3 py-2 text-sm font-semibold text-white">
                {statusMessage}
              </div>
            )}
            {lastOrderNumber && (
              <button
                type="button"
                onClick={() => window.open(`/kitchen-receipt/${lastOrderNumber}`, '_blank')}
                className="mt-2 w-full rounded-full bg-[#FFE561] px-3 py-2 text-xs font-semibold text-[#0b1222]"
              >
                Print Kitchen Copy
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenPayment}
              disabled={isSubmitting || cart.length === 0}
              className="mt-3 w-full rounded-2xl bg-[#00C2FF] px-4 py-3 text-center text-lg font-black text-[#1E1E1E] shadow-lg hover:scale-[1.01] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? 'Deploying...' : 'Rift Checkout'}
            </button>
          </div>
        </aside>
      </div>
      {isPaymentOpen && (
        <PaymentOverlay
          isOpen={isPaymentOpen}
          onClose={() => setIsPaymentOpen(false)}
          totalCents={totalCents}
          discountedSubtotalCents={discountedSubtotalCents}
          taxCents={taxCents}
          paymentType={paymentType}
          setPaymentType={setPaymentType}
          cashGiven={cashGiven}
          setCashGiven={setCashGiven}
          onCompleteSale={handleCompleteSale}
          isSubmitting={isSubmitting}
        />
      )}
    </main>
  );
}
