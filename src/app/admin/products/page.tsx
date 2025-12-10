'use client';

import { useEffect, useState } from 'react';
import { Product } from '@/domain/models/product';
import { AdminHeader } from '@/components/AdminHeader';

function createEmptyProduct(): Product {
  return {
    id: `prod-${Date.now()}`,
    name: '',
    price: 0,
    categoryId: '',
    active: true,
    prepMinutes: 1,
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadProducts = async (resetStatus = true) => {
    if (resetStatus) {
      setStatus(null);
    }
    setLoading(true);
    try {
      const response = await fetch('/api/products?includeInactive=true', {
        cache: 'no-store',
      });
      if (!response.ok) {
        throw new Error('Failed to load products');
      }
      const data = await response.json();
      setProducts(Array.isArray(data?.products) ? data.products : []);
    } catch (error) {
      console.error(error);
      setStatus({ type: 'error', message: 'Unable to load products' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  const updateProduct = (
    index: number,
    field: keyof Product,
    value: string | number | boolean,
  ) => {
    setProducts((current) =>
      current.map((product, i) => (i === index ? { ...product, [field]: value } : product)),
    );
  };

  const addProduct = () => {
    setProducts((current) => [...current, createEmptyProduct()]);
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

  return (
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
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-white/70">
                      Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-6 text-center text-white/70">
                      No products found. Add a new product to get started.
                    </td>
                  </tr>
                ) : (
                  products.map((product, index) => (
                    <tr key={product.id} className="hover:bg-white/5">
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          value={product.name}
                          onChange={(event) => updateProduct(index, 'name', event.target.value)}
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
                          type="number"
                          value={product.price}
                          min="0"
                          step="0.01"
                          onChange={(event) => updateProduct(index, 'price', Number(event.target.value) || 0)}
                          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          value={product.prepMinutes ?? 0}
                          onChange={(event) =>
                            updateProduct(index, 'prepMinutes', Number(event.target.value) || 0)
                          }
                          className="w-24 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-[#00C2FF]/60"
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
