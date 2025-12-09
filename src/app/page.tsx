'use client';

import { useEffect, useMemo, useState } from 'react';
import { fetchCategories, Category } from '@/lib/categories-store';
import { fetchProducts, Product } from '@/lib/products-store';
import {
  Modifier,
  modifierLabel,
  toggleModifier,
} from '@/lib/modifier_manager';
import {
  OrderItem,
  SaleProduct,
  calculateTotals,
  createOrderItem,
  calculateItemTotal,
  removeItem,
  replaceItem,
  updateItemQuantity,
} from '@/lib/order_manager';

const CATEGORY_DETAILS: Record<string, { title: string; icon: string }> = {
  '1': { title: 'Burgers', icon: '🍔' },
  '2': { title: 'Hotdogs', icon: '🌭' },
  '3': { title: 'Fries', icon: '🍟' },
  '4': { title: 'Slush & Floats', icon: '🥤' },
  '5': { title: 'Boil-Up', icon: '🍲' },
  '6': { title: 'Desserts', icon: '🍨' },
};

const STORAGE_KEY = 'freeze-monkey-pos-state';
const ADMIN_PIN = '4242';

interface SavedState {
  orderItems: OrderItem[];
  selectedCategoryId: string | null;
  taxFree: boolean;
}

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function loadStoredState(): SavedState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SavedState;
  } catch (error) {
    console.error('Failed to parse saved state', error);
    return null;
  }
}

function saveState(state: SavedState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function ModifierPopup({
  product,
  modifiers,
  open,
  onClose,
  onConfirm,
  initialItem,
}: {
  product: Product | null;
  modifiers: Modifier[];
  open: boolean;
  onClose: () => void;
  onConfirm: (item: OrderItem) => void;
  initialItem?: OrderItem | null;
}) {
  const [selected, setSelected] = useState<Modifier[]>(initialItem?.modifiers ?? []);
  const [quantity, setQuantity] = useState<number>(initialItem?.quantity ?? 1);

  useEffect(() => {
    setSelected(initialItem?.modifiers ?? []);
    setQuantity(initialItem?.quantity ?? 1);
  }, [initialItem, open]);

  if (!open || !product) return null;

  const handleToggle = (modifier: Modifier) => {
    setSelected((current) => toggleModifier(current, modifier));
  };

  const baseProduct: SaleProduct = {
    id: initialItem?.productId ?? product.id,
    name: product.name,
    price: initialItem?.basePrice ?? product.price,
  };

  const previewItem = createOrderItem(baseProduct, selected, quantity);
  const previewTotal = calculateItemTotal(previewItem);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-lg rounded-2xl bg-[#0f172a] text-white shadow-xl ring-4 ring-[#00C2FF]/40">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <p className="text-sm uppercase tracking-wide text-[#E9F9FF]/70">Customize</p>
            <h3 className="text-2xl font-bold">{product.name}</h3>
          </div>
          <button
            className="rounded-full bg-white/10 px-3 py-1 text-sm font-semibold text-white hover:bg-white/20"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <p className="text-sm font-semibold text-[#E9F9FF]/80 mb-2">Quantity</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="rounded-full bg-[#FFE561] px-4 py-2 text-black font-bold shadow hover:scale-105 transition"
                onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
              >
                -
              </button>
              <span className="text-xl font-bold min-w-[2ch] text-center">{quantity}</span>
              <button
                type="button"
                className="rounded-full bg-[#00C2FF] px-4 py-2 text-black font-bold shadow hover:scale-105 transition"
                onClick={() => setQuantity((prev) => prev + 1)}
              >
                +
              </button>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#E9F9FF]/80 mb-2">Modifiers</p>
            <div className="grid grid-cols-2 gap-3">
              {modifiers.map((modifier) => {
                const active = selected.some((item) => item.id === modifier.id);
                return (
                  <button
                    key={modifier.id}
                    type="button"
                    onClick={() => handleToggle(modifier)}
                    className={`flex flex-col rounded-xl border px-4 py-3 text-left transition shadow-sm ${
                      active
                        ? 'border-[#00C2FF] bg-[#00C2FF]/20'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-base font-bold">{modifier.name}</span>
                    <span className="text-xs text-[#E9F9FF]/70">{modifierLabel(modifier)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-5 py-4">
          <div>
            <p className="text-sm text-[#E9F9FF]/70">Preview total</p>
            <p className="text-2xl font-bold text-[#FFE561]">{formatCurrency(previewTotal)}</p>
          </div>
          <button
            type="button"
            className="rounded-full bg-[#00C2FF] px-6 py-3 text-lg font-black text-[#1E1E1E] shadow-xl hover:scale-105 transition"
            onClick={() => {
              onConfirm({ ...previewItem, uid: initialItem?.uid ?? previewItem.uid });
              onClose();
            }}
          >
            Save Item
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [modifiers, setModifiers] = useState<Modifier[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [taxFree, setTaxFree] = useState<boolean>(true);
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false);
  const [offline, setOffline] = useState<boolean>(false);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [modalExistingItem, setModalExistingItem] = useState<OrderItem | null>(null);
  const [adminMode, setAdminMode] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    const saved = loadStoredState();
    if (saved) {
      setOrderItems(saved.orderItems ?? []);
      setSelectedCategoryId(saved.selectedCategoryId ?? null);
      setTaxFree(saved.taxFree ?? true);
    }
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const loadedCategories = await fetchCategories();
        setCategories(loadedCategories);
        if (loadedCategories.length > 0) {
          setSelectedCategoryId((current) => current ?? loadedCategories[0].id);
        }
      } catch (error) {
        console.error('Failed to load categories', error);
        setOffline(true);
      }
    };
    bootstrap();
  }, []);

  useEffect(() => {
    const loadModifiers = async () => {
      try {
        const response = await fetch('/api/modifiers', { cache: 'no-store' });
        const data = await response.json();
        setModifiers(Array.isArray(data?.modifiers) ? data.modifiers : []);
      } catch (error) {
        console.error('Failed to load modifiers', error);
        setModifiers([]);
      }
    };
    loadModifiers();
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
    const interval = window.setInterval(() => {
      saveState({ orderItems, selectedCategoryId, taxFree });
    }, 30000);
    return () => window.clearInterval(interval);
  }, [orderItems, selectedCategoryId, taxFree]);

  useEffect(() => {
    saveState({ orderItems, selectedCategoryId, taxFree });
  }, [orderItems, selectedCategoryId, taxFree]);

  const totals = useMemo(() => calculateTotals(orderItems, taxFree), [orderItems, taxFree]);

  const handleProductTap = (product: Product) => {
    setModalExistingItem(null);
    setModalProduct(product);
  };

  const handleEditItem = (item: OrderItem) => {
    setModalExistingItem(item);
    const found = products.find((product) => product.id === item.productId);
    if (found) {
      setModalProduct(found);
    }
  };

  const handleAdminAuth = () => {
    if (pinInput === ADMIN_PIN) {
      setAdminMode(true);
      setPinInput('');
    }
  };

  const updateProductPrice = (productId: string, price: number) => {
    setProducts((current) => current.map((item) => (item.id === productId ? { ...item, price } : item)));
    setOrderItems((current) =>
      current.map((item) =>
        item.productId === productId
          ? { ...item, basePrice: price }
          : item,
      ),
    );
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
              <div className={`rounded-full px-4 py-2 text-sm font-semibold ${offline ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-100'}`}>
                {offline ? 'Rift Link Disrupted (Offline)' : 'Rift Link Stable'}
              </div>
              <label className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-[#E9F9FF]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#FFE561]"
                  checked={taxFree}
                  onChange={(e) => setTaxFree(e.target.checked)}
                />
                Earthrealm Mode (Tax Free)
              </label>
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
                <h2 className="text-xl font-black text-[#E9F9FF]">{CATEGORY_DETAILS[selectedCategoryId ?? '']?.title ?? 'Pick a category'}</h2>
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
                    onClick={() => handleProductTap(product)}
                    className="flex flex-1 flex-col justify-between text-left"
                  >
                    <div className="text-sm uppercase tracking-[0.25em] text-[#E9F9FF]/50">{CATEGORY_DETAILS[product.categoryId]?.title}</div>
                    <div className="mt-2 text-lg font-black text-[#E9F9FF]">{product.name}</div>
                    <div className="mt-3 text-xl font-black text-[#FFE561]">{formatCurrency(product.price)}</div>
                  </button>
                  {adminMode && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="number"
                        className="w-24 rounded-lg bg-white/10 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2FF]"
                        value={product.price}
                        onChange={(e) => updateProductPrice(product.id, Number(e.target.value))}
                      />
                      <span className="text-xs text-[#E9F9FF]/60">Edit price</span>
                    </div>
                  )}
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
            {!adminMode && (
              <div className="flex items-center gap-2">
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  placeholder="Admin PIN"
                  className="w-28 rounded-lg bg-white/10 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#00C2FF]"
                />
                <button
                  type="button"
                  onClick={handleAdminAuth}
                  className="rounded-lg bg-[#00C2FF] px-3 py-2 text-sm font-bold text-[#1E1E1E]"
                >
                  Unlock
                </button>
              </div>
            )}
            {adminMode && (
              <span className="rounded-full bg-[#00C2FF]/20 px-3 py-1 text-xs font-semibold text-[#00C2FF]">
                Admin mode
              </span>
            )}
          </div>
          <div className="space-y-3 overflow-y-auto rounded-xl bg-white/5 p-3 max-h-[55vh]">
            {orderItems.length === 0 && (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-white/10 text-[#E9F9FF]/70">
                No energies queued. Tap a relic or ration to begin.
              </div>
            )}
            {orderItems.map((item) => (
              <div
                key={item.uid}
                className="rounded-xl border border-white/5 bg-[#0B1222] p-3 shadow-sm"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-[#E9F9FF]">{item.name}</p>
                    {item.modifiers.length > 0 && (
                      <ul className="mt-1 text-xs text-[#E9F9FF]/70">
                        {item.modifiers.map((modifier) => (
                          <li key={modifier.id}>• {modifier.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-[#FFE561]">{formatCurrency(item.basePrice)}</p>
                    <p className="text-xs text-[#E9F9FF]/60">x {item.quantity}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-full bg-[#FFE561] px-3 py-1 text-sm font-bold text-black shadow"
                      onClick={() => setOrderItems((current) => updateItemQuantity(current, item.uid, -1))}
                    >
                      -
                    </button>
                    <span className="min-w-[2ch] text-center text-base font-bold">{item.quantity}</span>
                    <button
                      type="button"
                      className="rounded-full bg-[#00C2FF] px-3 py-1 text-sm font-bold text-[#1E1E1E] shadow"
                      onClick={() => setOrderItems((current) => updateItemQuantity(current, item.uid, 1))}
                    >
                      +
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleEditItem(item)}
                      className="rounded-lg bg-white/10 px-3 py-1 text-xs font-bold text-[#E9F9FF] hover:bg-white/20"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setOrderItems((current) => removeItem(current, item.uid))}
                      className="rounded-lg bg-red-500/20 px-3 py-1 text-xs font-bold text-red-100 hover:bg-red-500/30"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-xl bg-white/5 p-4">
            <div className="flex items-center justify-between text-sm text-[#E9F9FF]/80">
              <span>Frost Subtotal</span>
              <span>{formatCurrency(totals.subtotal)}</span>
            </div>
            <div className="flex items-center justify-between text-sm text-[#E9F9FF]/80">
              <span>Earthrealm Tax {taxFree ? '(tax free)' : '(15%)'}</span>
              <span>{formatCurrency(totals.tax)}</span>
            </div>
            <div className="flex items-center justify-between border-t border-white/10 pt-2 text-lg font-black text-[#FFE561]">
              <span>Stormfront Total</span>
              <span>{formatCurrency(totals.total)}</span>
            </div>
            <button
              type="button"
              className="mt-3 w-full rounded-2xl bg-[#00C2FF] px-4 py-3 text-center text-lg font-black text-[#1E1E1E] shadow-lg hover:scale-[1.01] transition"
            >
              Deploy Order
            </button>
          </div>
        </aside>
      </div>
      <ModifierPopup
        product={modalProduct}
        modifiers={modifiers}
        open={!!modalProduct}
        onClose={() => {
          setModalExistingItem(null);
          setModalProduct(null);
        }}
        onConfirm={(item) => {
          if (modalExistingItem) {
            setOrderItems((current) => replaceItem(current, item));
          } else {
            setOrderItems((current) => [...current, item]);
          }
          setModalExistingItem(null);
        }}
        initialItem={modalExistingItem}
      />
    </main>
  );
}
