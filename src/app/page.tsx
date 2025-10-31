"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  inStock: number;
  category: string;
};

type ProductFormState = {
  name: string;
  description: string;
  price: string;
  inStock: string;
  category: string;
};

const EMPTY_FORM: ProductFormState = {
  name: "",
  description: "",
  price: "",
  inStock: "",
  category: "",
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [formState, setFormState] = useState<ProductFormState>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/products");
      if (!response.ok) {
        const { error: message } = await response.json();
        throw new Error(message ?? "Failed to fetch products");
      }
      const data = (await response.json()) as Product[];
      setProducts(data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to load products");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const resetForm = () => {
    setFormState(EMPTY_FORM);
    setEditingId(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setFormState((previous) => ({ ...previous, [name]: value }));
  };

  const submitProduct = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);

    const payload = {
      ...formState,
      price: formState.price,
      inStock: formState.inStock,
    };

    try {
      const response = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const { error: message } = await response.json();
        throw new Error(message ?? "Unable to save product");
      }

      const savedProduct = (await response.json()) as Product | { success: boolean };

      if (editingId) {
        setProducts((existing) =>
          existing.map((product) => (product.id === editingId ? (savedProduct as Product) : product)),
        );
        setFeedback("Product updated successfully.");
      } else {
        setProducts((existing) => [...existing, savedProduct as Product]);
        setFeedback("Product added successfully.");
      }

      resetForm();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingId(product.id);
    setFormState({
      name: product.name,
      description: product.description,
      price: product.price.toFixed(2),
      inStock: product.inStock.toString(),
      category: product.category,
    });
    setFeedback(null);
    setError(null);
  };

  const handleDeleteProduct = async (productId: number) => {
    setIsSubmitting(true);
    setFeedback(null);
    setError(null);
    try {
      const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!response.ok) {
        const { error: message } = await response.json();
        throw new Error(message ?? "Unable to delete product");
      }
      setProducts((existing) => existing.filter((product) => product.id !== productId));
      if (editingId === productId) {
        resetForm();
      }
      setFeedback("Product deleted successfully.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete product");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/session", { method: "DELETE" });
    window.location.href = "/login";
  };

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name)),
    [products],
  );

  return (
    <div className="min-h-screen bg-slate-950 p-6 text-white">
      <header className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 rounded-3xl bg-slate-900 p-6 sm:flex-row">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">FreezeMonkey POS</h1>
          <p className="text-slate-300">Quickly manage your products with touch-friendly controls.</p>
        </div>
        <button
          onClick={handleLogout}
          className="h-16 w-full rounded-2xl bg-rose-500 px-8 text-2xl font-semibold uppercase tracking-wider shadow-lg transition active:scale-95 sm:w-auto"
        >
          Logout
        </button>
      </header>

      <main className="mx-auto mt-8 grid max-w-6xl gap-8 lg:grid-cols-[1.2fr_1fr]">
        <section className="rounded-3xl bg-slate-900 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Product Catalog</h2>
            <button
              onClick={loadProducts}
              className="h-14 rounded-2xl bg-cyan-600 px-6 text-lg font-semibold uppercase tracking-wide shadow-md transition active:scale-95"
            >
              Refresh
            </button>
          </div>
          {isLoading ? (
            <p className="mt-6 text-center text-lg text-slate-300">Loading products…</p>
          ) : error ? (
            <p className="mt-6 rounded-2xl bg-red-500/20 p-4 text-center text-lg text-red-200">{error}</p>
          ) : (
            <ul className="mt-6 grid gap-4 sm:grid-cols-2">
              {sortedProducts.map((product) => (
                <li
                  key={product.id}
                  className="flex flex-col justify-between rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow-inner"
                >
                  <div>
                    <h3 className="text-2xl font-semibold">{product.name}</h3>
                    <p className="mt-2 text-sm text-slate-300">{product.description}</p>
                    <div className="mt-4 flex items-center justify-between text-lg font-semibold">
                      <span className="text-cyan-400">${product.price.toFixed(2)}</span>
                      <span className="text-slate-400">Stock: {product.inStock}</span>
                    </div>
                    <p className="mt-1 text-xs uppercase tracking-widest text-slate-500">{product.category}</p>
                  </div>
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleEditProduct(product)}
                      className="h-16 rounded-2xl bg-amber-500 text-xl font-bold uppercase tracking-wide text-slate-900 transition active:scale-95"
                      disabled={isSubmitting}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      className="h-16 rounded-2xl bg-rose-500 text-xl font-bold uppercase tracking-wide text-white transition active:scale-95"
                      disabled={isSubmitting}
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {sortedProducts.length === 0 ? (
                <li className="rounded-3xl border border-dashed border-slate-700 p-10 text-center text-lg text-slate-400">
                  No products saved yet.
                </li>
              ) : null}
            </ul>
          )}
        </section>

        <section className="rounded-3xl bg-slate-900 p-6 shadow-xl">
          <h2 className="text-2xl font-semibold">{editingId ? "Edit Product" : "Add Product"}</h2>
          <form className="mt-6 space-y-5" onSubmit={submitProduct}>
            <div>
              <label htmlFor="name" className="text-lg font-medium text-slate-200">
                Product Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formState.name}
                onChange={handleInputChange}
                required
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-lg text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div>
              <label htmlFor="description" className="text-lg font-medium text-slate-200">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formState.description}
                onChange={handleInputChange}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-lg text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="price" className="text-lg font-medium text-slate-200">
                  Price ($)
                </label>
                <input
                  id="price"
                  name="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formState.price}
                  onChange={handleInputChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-lg text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div>
                <label htmlFor="inStock" className="text-lg font-medium text-slate-200">
                  In Stock
                </label>
                <input
                  id="inStock"
                  name="inStock"
                  type="number"
                  min="0"
                  step="1"
                  value={formState.inStock}
                  onChange={handleInputChange}
                  required
                  className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-lg text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            <div>
              <label htmlFor="category" className="text-lg font-medium text-slate-200">
                Category
              </label>
              <input
                id="category"
                name="category"
                type="text"
                value={formState.category}
                onChange={handleInputChange}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-lg text-white focus:border-cyan-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>
            {feedback ? (
              <p className="rounded-2xl bg-emerald-500/20 p-4 text-center text-lg text-emerald-200">{feedback}</p>
            ) : null}
            {error && !isLoading ? (
              <p className="rounded-2xl bg-red-500/20 p-4 text-center text-lg text-red-200">{error}</p>
            ) : null}
            <div className="grid grid-cols-2 gap-4">
              <button
                type="submit"
                className="h-16 rounded-2xl bg-cyan-500 text-2xl font-bold uppercase tracking-wide text-slate-900 transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isSubmitting}
              >
                {editingId ? "Save" : "Add"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="h-16 rounded-2xl bg-slate-700 text-2xl font-semibold uppercase tracking-wide text-white transition active:scale-95"
              >
                Clear
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
