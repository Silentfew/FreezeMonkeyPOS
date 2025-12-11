'use client';

import { useEffect, useRef, useState } from 'react';
import { Product } from '@/domain/models/product';
import { AdminHeader } from '@/components/AdminHeader';
import { NumericKeypad } from '@/components/NumericKeypad';
import { TouchKeyboard } from '@/components/TouchKeyboard';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [defaultPrepMinutes, setDefaultPrepMinutes] = useState(7);
  const [activeKeypad, setActiveKeypad] = useState<{
    productId: string;
    field: 'price' | 'kitchenTime';
  } | null>(null);
  const [keypadValue, setKeypadValue] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const rowRefs = useRef<Record<string, HTMLTableRowElement | null>>({});

  const loadProducts = async (resetStatus = true) => {
    if (resetStatus) {
      setStatus(null);
    }
    setLoading(true);
    try {
      const [productsResponse, settingsResponse] = await Promise.all([
        fetch('/api/products?includeInactive=true', {
          cache: 'no-store',
        }),
        fetch('/api/settings', { cache: 'no-store' }).catch(() => null),
      ]);

      if (!productsResponse.ok) {
        throw new Error('Failed to load products');
      }

      const data = await productsResponse.json();
      setProducts(Array.isArray(data?.products) ? data.products : []);

      if (settingsResponse?.ok) {
        const settingsData = await settingsResponse.json();
        const prepMinutes = settingsData?.settings?.kitchenPrepMinutes;
        if (typeof prepMinutes === 'number' && Number.isFinite(prepMinutes)) {
          setDefaultPrepMinutes(Math.max(1, Math.round(prepMinutes)));
        }
      } else {
        setDefaultPrepMinutes(7);
      }
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Unable to load products' });
    } finally {
      setLoading(false);
      setEditingIndex(null);
      setEditingName('');
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (editingIndex === null) return;
    const currentProduct = products[editingIndex];
    if (!currentProduct) {
      setEditingIndex(null);
      setEditingName('');
      return;
    }
    setEditingName(currentProduct.name ?? '');
  }, [editingIndex, products]);

  const updateProduct = (
    index: number,
    field: keyof Product,
    value: string | number | boolean,
  ) => {
    setProducts((current) =>
      current.map((product, i) => (i === index ? { ...product, [field]: value } : product)),
    );
  };

  const handleNameChange = (index: number, value: string) => {
    updateProduct(index, 'name', value);
    if (editingIndex === index) {
      setEditingName(value);
    }
  };

  const startEditingName = (index: number) => {
    const product = products[index];
    if (!product) return;

    setEditingIndex(index);
    setEditingName(product.name ?? '');
  };

  const getNextProductId = (current: Product[]) => {
    const maxNumericId = current.reduce((max, product) => {
      const match = String(product.id ?? '').match(/(\d+)/);
      if (!match) return max;
      const value = parseInt(match[1], 10);
      return Number.isFinite(value) ? Math.max(max, value) : max;
    }, 0);

    const nextValue = maxNumericId > 0 ? maxNumericId + 1 : current.length + 1;
    return `p-${nextValue}`;
  };

  const addProduct = () => {
    setProducts((current) => {
      const nextId = getNextProductId(current);
      const newProduct: Product = {
        id: nextId,
        name: 'New product',
        price: 0,
        categoryId: '1',
        active: true,
        prepMinutes: defaultPrepMinutes ?? 7,
      };

      const updated = [...current, newProduct];
      const newIndex = updated.length - 1;
      setEditingIndex(newIndex);
      setEditingName(newProduct.name);

      setTimeout(() => {
        const target = rowRefs.current[newProduct.id];
        target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);

      return updated;
    });
  };

  const toggleActive = (index: number) => {
    setProducts((current) =>
      current.map((product, i) => {
        if (i !== index) return product;
        const isActive = product.active !== false;
        return { ...product, active: !isActive };
      }),
    );
  };

  const removeProduct = (index: number) => {
    setProducts((current) => current.filter((_, i) => i !== index));
    if (editingIndex === null) return;
    if (editingIndex === index) {
      setEditingIndex(null);
      setEditingName('');
    } else if (editingIndex > index) {
      setEditingIndex(editingIndex - 1);
    }
  };

  const saveProducts = async () => {
    setSaving(true);
    setStatus(null);
    try {
      const response = await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(products),
      });
      if (!response.ok) {
        throw new Error('Failed to save products');
      }
      await response.json();
      setStatus({ type: 'success', message: 'Products saved successfully' });
      loadProducts(false);
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Failed to save products' });
    } finally {
      setSaving(false);
    }
  };

  const openKeypad = (product: Product, field: 'price' | 'kitchenTime') => {
    setActiveKeypad({ productId: product.id, field });
    const currentValue = field === 'price' ? product.price : product.prepMinutes ?? 0;
    setKeypadValue(Number.isFinite(currentValue) ? String(currentValue) : '');
  };

  const handleApplyKeypad = () => {
    if (!activeKeypad) return;
    const { productId, field } = activeKeypad;
    const index = products.findIndex((product) => product.id === productId);
    if (index === -1) {
      setActiveKeypad(null);
      return;
    }

    const parsed = Number(keypadValue);
    if (field === 'price') {
      updateProduct(index, 'price', Number.isFinite(parsed) ? parsed : 0);
    } else {
      updateProduct(index, 'prepMinutes', Math.max(0, Math.round(Number.isFinite(parsed) ? parsed : 0)));
    }

    setActiveKeypad(null);
  };

  const handleKeyboardChange = (value: string) => {
    if (editingIndex === null) return;
    handleNameChange(editingIndex, value);
  };

  const handleKeyboardDone = () => {
    setEditingIndex(null);
  };

  return (
    <>
      <main className="min-h-screen bg-gradient-to-br from-[#0B1222] via-[#0e1528] to-[#1E1E1E] text-white">
        <AdminHeader />
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#E9F9FF]/60">Admin</p>
              <h1 className="text-3xl font-black text-[#E9F9FF]">Manage Products</h1>
              <p className="text-sm text-white/70">Add, edit, or deactivate products for the POS.</p>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={addProduct}
                className="rounded-xl bg-[#00C2FF] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg hover:bg-[#4dd9ff]"
              >
                + Add product
              </button>
              <button
                type="button"
                onClick={saveProducts}
                disabled={saving}
                className="rounded-xl bg-[#FFE561] px-4 py-2 text-sm font-semibold text-[#0b1222] shadow-lg hover:bg-[#ffeb85] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>

        {status && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              status.type === 'success'
                ? 'border-green-400/30 bg-green-500/10 text-green-100'
                : 'border-red-400/30 bg-red-500/10 text-red-100'
            }`}
          >
            {status.message}
          </div>
        )}

        <div className="overflow-hidden rounded-2xl bg-white/5 shadow-lg ring-1 ring-white/10">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-wide text-white/60">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Kitchen Time (min)</th>
                  <th className="px-4 py-3">Active</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-white/70">
                      Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-white/70">
                      No products found. Add a new product to get started.
                    </td>
                  </tr>
                ) : (
                  products.map((product, index) => (
                    <tr
                      key={product.id}
                      ref={(element) => {
                        rowRefs.current[product.id] = element;
                      }}
                      className="hover:bg-white/5"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={editingIndex === index ? editingName : product.name}
                          onClick={() => startEditingName(index)}
                          onFocus={() => startEditingName(index)}
                          onChange={(event) => handleNameChange(index, event.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={product.categoryId}
                          onChange={(event) => updateProduct(index, 'categoryId', event.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          readOnly
                          value={product.price}
                          onClick={() => openKeypad(product, 'price')}
                          onFocus={() => openKeypad(product, 'price')}
                          className="w-full cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          readOnly
                          value={product.prepMinutes ?? 0}
                          onClick={() => openKeypad(product, 'kitchenTime')}
                          onFocus={() => openKeypad(product, 'kitchenTime')}
                          className="w-24 cursor-pointer rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <label className="flex items-center gap-2 text-white/80">
                          <input
                            type="checkbox"
                            checked={product.active !== false}
                            onChange={() => toggleActive(index)}
                            className="h-5 w-5 rounded border border-white/20 bg-white/10 text-[#00C2FF] focus:ring-0"
                          />
                          <span>{product.active === false ? 'Inactive' : 'Active'}</span>
                        </label>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="rounded-lg border border-red-400/40 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-500/10"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {editingIndex !== null && products[editingIndex] && (
          <div className="mt-4 rounded-2xl bg-white/5 p-4 shadow-lg ring-1 ring-white/10">
            <p className="text-sm text-white/70">
              Editing name for:{' '}
              <span className="font-semibold text-white">
                {products[editingIndex].name || 'New product'}
              </span>
            </p>
            <TouchKeyboard
              value={editingName}
              onChange={handleKeyboardChange}
              onDone={handleKeyboardDone}
            />
          </div>
        )}
        </div>
      </main>

      {activeKeypad ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-4">
          <NumericKeypad
            label={activeKeypad.field === 'price' ? 'Edit price' : 'Kitchen time (min)'}
            value={keypadValue}
            onChange={setKeypadValue}
            decimals={activeKeypad.field === 'price'}
            onDone={handleApplyKeypad}
          />
        </div>
      ) : null}
    </>
  );
}
