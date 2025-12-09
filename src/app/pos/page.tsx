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

type DraftOrderPayload = {
  items: { productId: string; quantity: number; note?: string }[];
  cashierName?: string;
};

type StatusMessage = { type: 'success' | 'error'; text: string } | null;

function formatCurrencyFromCents(amountCents: number) {
  return `$${(amountCents / 100).toFixed(2)}`;
}

export default function PosPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [offline, setOffline] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<StatusMessage>(null);

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

  const subtotalCents = useMemo(
    () => cart.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0),
    [cart],
  );
  const taxCents = 0;
  const totalCents = subtotalCents + taxCents;

  const handleAddToCart = (product: Product) => {
    setStatusMessage(null);
    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id);
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
          unitPriceCents: Math.round(product.price * 100),
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

  const handleCharge = async () => {
    if (submitting) return;

    if (!cart.length) {
      setStatusMessage({
        type: 'error',
        text: 'No energies queued. Add a relic or ration before deploying.',
      });
      return;
    }

    setSubmitting(true);
    setStatusMessage(null);

    try {
      const payload: DraftOrderPayload = {
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
        })),
        cashierName: 'Unknown',
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to save order' }));
        throw new Error(error?.error ?? 'Failed to save order');
      }

      const data = await response.json();
      const orderId: string = data?.orderNumber ?? data?.id ?? 'order';
      setStatusMessage({
        type: 'success',
        text: `Rift Deployed – Ticket ${orderId} logged in the Codex.`,
      });
      setCart([]);
    } catch (error) {
      setStatusMessage({
        type: 'error',
        text: 'Rift Jammed – Could not deploy this order. Try again.',
      });
    } finally {
      setSubmitting(false);
    }
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
                className="rounded-full bg-[#FFE561] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg transition hover:-translate-y-0.5 hover:bg-[#ffeb85]"
              >
                Rift Control
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
                    <div className="mt-3 text-xl font-black text-[#FFE561]">{formatCurrencyFromCents(Math.round(product.price * 100))}</div>
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
            <div className="flex items-center justify-between text-sm text-[#E9F9FF]/80">
              <span>Frost Subtotal</span>
              <span>{formatCurrencyFromCents(subtotalCents)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[#E9F9FF]/80">
              <span>Earthrealm Tax</span>
              <span>{formatCurrencyFromCents(taxCents)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-lg font-black text-[#FFE561]">
              <span>Stormfront Total</span>
              <span>{formatCurrencyFromCents(totalCents)}</span>
            </div>
            {statusMessage && (
              <div
                className={`rounded-xl px-3 py-2 text-sm font-semibold ${
                  statusMessage.type === 'success'
                    ? 'bg-green-500/20 text-green-100'
                    : 'bg-red-500/20 text-red-100'
                }`}
              >
                {statusMessage.text}
              </div>
            )}
            <button
              type="button"
              onClick={handleCharge}
              disabled={submitting}
              className="mt-3 w-full rounded-2xl bg-[#00C2FF] px-4 py-3 text-center text-lg font-black text-[#1E1E1E] shadow-lg hover:scale-[1.01] transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? 'Deploying...' : 'Deploy Order'}
            </button>
          </div>
        </aside>
      </div>
    </main>
  );
}
