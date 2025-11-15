"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { Product } from "@/lib/products-store";
import type { Category } from "@/lib/categories-store";
import type { Modifier } from "@/lib/modifier_manager";
import { calculateModifierDelta } from "@/lib/modifier_manager";
import { OrderManager, type OrderState, type OrderItem } from "@/lib/order_manager";

const BRAND_COLORS = {
  primary: "#2E9DDB",
  secondary: "#F2F7FB",
  accent: "#003B57",
  canvas: "#001F33",
  panel: "#002742",
};

const AUTO_SAVE_INTERVAL = 30_000;

type CatalogData = {
  products: Product[];
  categories: Category[];
  modifiers: Modifier[];
};

type ModifierView = Modifier & {
  mode: "default" | "added" | "removed" | "light";
  delta: number;
};

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const modifierModeLabel = (mode: ModifierView["mode"]) => {
  switch (mode) {
    case "added":
      return "ADD";
    case "removed":
      return "NO";
    case "light":
      return "LIGHT";
    default:
      return "";
  }
};

function computeItemTotal(item: OrderItem, modifierMap: Map<number, Modifier>): number {
  const base = Number(item.basePrice.toFixed(2));
  const modifiersTotal = item.modifiers.reduce((total, entry) => {
    const modifier = modifierMap.get(entry.modifierId);
    if (!modifier) {
      return total;
    }
    return total + calculateModifierDelta(modifier, entry.mode);
  }, 0);
  return Number(((base + modifiersTotal) * item.quantity).toFixed(2));
}

export default function Home() {
  const [catalog, setCatalog] = useState<CatalogData | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | "all">("all");
  const [orderState, setOrderState] = useState<OrderState | null>(null);
  const [activeLineId, setActiveLineId] = useState<string | null>(null);
  const [showModifierGrid, setShowModifierGrid] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [adminError, setAdminError] = useState<string | null>(null);
  const [adminIsSubmitting, setAdminIsSubmitting] = useState(false);
  const [adminTab, setAdminTab] = useState<"products" | "categories" | "modifiers">("products");
  const [productForm, setProductForm] = useState<Omit<Product, "id"> & { id?: number } | null>(null);
  const [categoryForm, setCategoryForm] = useState<Omit<Category, "id"> & { id?: number } | null>(null);
  const [modifierForm, setModifierForm] = useState<Omit<Modifier, "id"> & { id?: number } | null>(null);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);

  const orderManagerRef = useRef<OrderManager | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const restoredRef = useRef(false);

  const modifierMap = useMemo(() => {
    return new Map((catalog?.modifiers ?? []).map((modifier) => [modifier.id, modifier]));
  }, [catalog?.modifiers]);

  const productMap = useMemo(() => {
    return new Map((catalog?.products ?? []).map((product) => [product.id, product]));
  }, [catalog?.products]);
  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const loadCatalog = useCallback(async () => {
    setIsLoadingCatalog(true);
    setCatalogError(null);
    try {
      const response = await fetch("/api/catalog");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Unable to load catalog");
      }
      const data = (await response.json()) as CatalogData;
      setCatalog({
        products: data.products ?? [],
        categories: data.categories ?? [],
        modifiers: data.modifiers ?? [],
      });
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Unable to load catalog");
    } finally {
      setIsLoadingCatalog(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      orderManagerRef.current?.destroy();
      orderManagerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!catalog) {
      return;
    }

    if (!orderManagerRef.current) {
      const manager = new OrderManager({
        products: catalog.products,
        modifiers: catalog.modifiers,
        autoSaveIntervalMs: AUTO_SAVE_INTERVAL,
      });
      orderManagerRef.current = manager;
      unsubscribeRef.current = manager.subscribe((state) => {
        setOrderState(state);
        if (!restoredRef.current && state.items.length > 0) {
          setStatusMessage("Freeze Mode restored an open ticket.");
          restoredRef.current = true;
        }
      });
    } else {
      orderManagerRef.current.setCatalog(catalog.products, catalog.modifiers);
    }
  }, [catalog]);

  useEffect(() => {
    if (!statusMessage) {
      return;
    }
    const timeout = setTimeout(() => setStatusMessage(null), 3_000);
    return () => clearTimeout(timeout);
  }, [statusMessage]);
  const filteredCategories = useMemo(() => {
    if (!catalog) {
      return [] as Category[];
    }
    return [...catalog.categories]
      .filter((category) => category.active !== false)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  }, [catalog]);

  const filteredProducts = useMemo(() => {
    if (!catalog) {
      return [] as Product[];
    }
    return catalog.products
      .filter((product) => product.active !== false)
      .filter((product) => (selectedCategory === "all" ? true : product.categoryId === selectedCategory))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog, selectedCategory]);

  const activeItem = useMemo(() => {
    if (!activeLineId || !orderState) {
      return null;
    }
    return orderState.items.find((item) => item.lineId === activeLineId) ?? null;
  }, [activeLineId, orderState]);

  const activeItemModifiers = useMemo(() => {
    if (!activeItem || !catalog) {
      return [] as ModifierView[];
    }
    const product = productMap.get(activeItem.productId);
    const allowedIds = product?.modifierIds?.length
      ? product.modifierIds
      : catalog.modifiers.map((modifier) => modifier.id);
    return allowedIds
      .map((modifierId) => modifierMap.get(modifierId))
      .filter((modifier): modifier is Modifier => Boolean(modifier && modifier.active !== false))
      .map((modifier) => {
        const entry = activeItem.modifiers.find((itemModifier) => itemModifier.modifierId === modifier.id);
        const mode = entry?.mode ?? "default";
        return {
          ...modifier,
          mode,
          delta: calculateModifierDelta(modifier, mode),
        };
      });
  }, [activeItem, catalog, modifierMap, productMap]);

  const groupedModifiers = useMemo(() => {
    return activeItemModifiers.reduce<Record<string, ModifierView[]>>((groups, modifier) => {
      const key = modifier.category || "General";
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(modifier);
      return groups;
    }, {});
  }, [activeItemModifiers]);
  const handleProductTap = (productId: number) => {
    if (!orderManagerRef.current) {
      return;
    }
    try {
      const lineId = orderManagerRef.current.addProduct(productId);
      setActiveLineId(lineId);
      setShowModifierGrid(true);
    } catch (error) {
      console.error("Unable to add product", error);
      setStatusMessage("Unable to add item.");
    }
  };

  const handleModifierToggle = (modifierId: number) => {
    if (!orderManagerRef.current || !activeLineId) {
      return;
    }
    orderManagerRef.current.toggleModifier(activeLineId, modifierId);
  };

  const handleVoidItem = (lineId: string) => {
    if (!orderManagerRef.current) {
      return;
    }
    orderManagerRef.current.removeItem(lineId);
    if (activeLineId === lineId) {
      setActiveLineId(null);
      setShowModifierGrid(false);
    }
  };

  const handleVoidAll = () => {
    if (!orderManagerRef.current) {
      return;
    }
    orderManagerRef.current.clear();
    setActiveLineId(null);
    setShowModifierGrid(false);
    setStatusMessage("Order voided.");
  };

  const handlePay = () => {
    if (!orderManagerRef.current || !orderState || orderState.items.length === 0) {
      setStatusMessage("No items to settle.");
      return;
    }
    orderManagerRef.current.clear();
    setActiveLineId(null);
    setShowModifierGrid(false);
    setStatusMessage("Ticket settled. Print receipt.");
  };

  const handleQuantityChange = (lineId: string, change: number) => {
    if (!orderManagerRef.current || !orderState) {
      return;
    }
    const item = orderState.items.find((entry) => entry.lineId === lineId);
    if (!item) {
      return;
    }
    const nextQuantity = Math.max(1, item.quantity + change);
    orderManagerRef.current.updateQuantity(lineId, nextQuantity);
  };

  const handleLogout = async () => {
    await fetch("/api/session", { method: "DELETE" });
    window.location.href = "/login";
  };
  const handleAdminOpen = () => {
    setIsAdminPanelOpen(true);
    setAdminUnlocked(false);
    setAdminError(null);
    setAdminFeedback(null);
  };

  const closeAdminPanel = () => {
    setIsAdminPanelOpen(false);
    setAdminUnlocked(false);
    setAdminError(null);
    setAdminFeedback(null);
    setProductForm(null);
    setCategoryForm(null);
    setModifierForm(null);
  };

  const verifyAdminPin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const pin = String(formData.get("adminPin") ?? "").trim();
    if (pin.length === 0) {
      setAdminError("Enter admin PIN.");
      return;
    }
    setAdminIsSubmitting(true);
    setAdminError(null);
    try {
      const response = await fetch("/api/admin/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Invalid PIN");
      }
      setAdminUnlocked(true);
      setAdminFeedback("Admin mode enabled.");
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Invalid PIN");
    } finally {
      setAdminIsSubmitting(false);
    }
  };

  const resetProductForm = () => setProductForm(null);
  const resetCategoryForm = () => setCategoryForm(null);
  const resetModifierForm = () => setModifierForm(null);
  const submitProductForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!catalog) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      price: Number(formData.get("price") ?? 0),
      inStock: Number(formData.get("inStock") ?? 0),
      categoryId: formData.get("categoryId") ? Number(formData.get("categoryId")) : null,
      modifierIds: formData
        .getAll("modifierIds")
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value)),
      active: formData.get("active") === "on",
    };

    if (!payload.name || Number.isNaN(payload.price)) {
      setAdminError("Product name and valid price are required.");
      return;
    }

    setAdminIsSubmitting(true);
    setAdminError(null);
    try {
      const editingId = productForm?.id;
      const response = await fetch(editingId ? `/api/products/${editingId}` : "/api/products", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, inStock: payload.inStock.toString() }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Unable to save product");
      }
      setAdminFeedback(editingId ? "Product updated." : "Product created.");
      setProductForm(null);
      await loadCatalog();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Unable to save product");
    } finally {
      setAdminIsSubmitting(false);
    }
  };

  const deleteProduct = async (productId: number) => {
    setAdminIsSubmitting(true);
    setAdminError(null);
    try {
      const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Unable to delete product");
      }
      setAdminFeedback("Product removed.");
      if (productForm?.id === productId) {
        setProductForm(null);
      }
      await loadCatalog();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Unable to delete product");
    } finally {
      setAdminIsSubmitting(false);
    }
  };
  const submitCategoryForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      swatch: String(formData.get("swatch") ?? "").trim() || undefined,
      sortOrder: Number(formData.get("sortOrder") ?? 0),
      active: formData.get("active") === "on",
    };

    if (!payload.name) {
      setAdminError("Category name is required.");
      return;
    }

    setAdminIsSubmitting(true);
    setAdminError(null);
    try {
      const editingId = categoryForm?.id;
      const response = await fetch(editingId ? `/api/categories/${editingId}` : "/api/categories", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Unable to save category");
      }
      setAdminFeedback(editingId ? "Category updated." : "Category created.");
      setCategoryForm(null);
      await loadCatalog();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Unable to save category");
    } finally {
      setAdminIsSubmitting(false);
    }
  };

  const deleteCategory = async (categoryId: number) => {
    setAdminIsSubmitting(true);
    setAdminError(null);
    try {
      const response = await fetch(`/api/categories/${categoryId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Unable to delete category");
      }
      setAdminFeedback("Category removed.");
      if (categoryForm?.id === categoryId) {
        setCategoryForm(null);
      }
      await loadCatalog();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Unable to delete category");
    } finally {
      setAdminIsSubmitting(false);
    }
  };

  const submitModifierForm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? "").trim(),
      category: String(formData.get("category") ?? "").trim() || "General",
      price: Number(formData.get("price") ?? 0),
      type: formData.get("type") === "remove" ? "remove" : "add",
      active: formData.get("active") === "on",
    };

    if (!payload.name || Number.isNaN(payload.price)) {
      setAdminError("Modifier name and price are required.");
      return;
    }

    setAdminIsSubmitting(true);
    setAdminError(null);
    try {
      const editingId = modifierForm?.id;
      const response = await fetch(editingId ? `/api/modifiers/${editingId}` : "/api/modifiers", {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Unable to save modifier");
      }
      setAdminFeedback(editingId ? "Modifier updated." : "Modifier created.");
      setModifierForm(null);
      await loadCatalog();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Unable to save modifier");
    } finally {
      setAdminIsSubmitting(false);
    }
  };

  const deleteModifier = async (modifierId: number) => {
    setAdminIsSubmitting(true);
    setAdminError(null);
    try {
      const response = await fetch(`/api/modifiers/${modifierId}`, { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error ?? "Unable to delete modifier");
      }
      setAdminFeedback("Modifier removed.");
      if (modifierForm?.id === modifierId) {
        setModifierForm(null);
      }
      await loadCatalog();
    } catch (error) {
      setAdminError(error instanceof Error ? error.message : "Unable to delete modifier");
    } finally {
      setAdminIsSubmitting(false);
    }
  };
  return (
    <div
      className="min-h-screen bg-[#00131F] text-[var(--freeze-text, #F2F7FB)]"
      style={{ fontFamily: "'Roboto', sans-serif" }}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 bg-[#002742] px-6 py-4 text-sm uppercase tracking-wide">
        <div>
          <p className="text-xs text-cyan-200">Freeze Monkey POS Terminal</p>
          <h1 className="text-2xl font-bold" style={{ color: BRAND_COLORS.primary }}>
            Freeze Monkey POS
          </h1>
        </div>
        <div className="flex flex-col items-end">
          <p className="text-sm text-cyan-100">Staff PIN: ****</p>
          <p className="text-xs text-cyan-100">{clock.toLocaleString()}</p>
        </div>
        <button
          onClick={handleLogout}
          className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold tracking-widest text-white shadow-lg transition active:scale-95"
        >
          Logout
        </button>
      </header>

      <main className="grid gap-6 px-6 py-6 lg:grid-cols-[2.2fr_1fr]">
        <section className="flex flex-col gap-4 rounded-3xl bg-[#002742] p-4 shadow-2xl">
          <div className="rounded-2xl bg-[#003B57] p-4">
            <h2 className="mb-3 text-lg font-semibold text-[#F2F7FB]">Categories</h2>
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => setSelectedCategory("all")}
                className={`h-20 rounded-xl border-2 border-transparent text-lg font-bold uppercase tracking-wide transition active:scale-95 ${
                  selectedCategory === "all" ? "bg-[#2E9DDB] text-[#003B57]" : "bg-[#F2F7FB] text-[#003B57]"
                }`}
              >
                All Items
              </button>
              {filteredCategories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategory(category.id)}
                  className={`h-20 rounded-xl border-2 border-transparent text-lg font-bold uppercase tracking-wide transition active:scale-95 ${
                    selectedCategory === category.id ? "bg-[#2E9DDB] text-[#003B57]" : "bg-[#F2F7FB] text-[#003B57]"
                  }`}
                  style={{
                    boxShadow: selectedCategory === category.id ? `0 0 0 3px ${BRAND_COLORS.accent}` : undefined,
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 rounded-2xl bg-[#003B57] p-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#F2F7FB]">Products</h2>
              <button
                onClick={loadCatalog}
                className="rounded-lg bg-[#2E9DDB] px-4 py-2 text-sm font-bold uppercase tracking-wide text-[#003B57] shadow-md transition active:scale-95"
              >
                Refresh
              </button>
            </div>
            {isLoadingCatalog ? (
              <p className="mt-6 text-center text-sm text-cyan-100">Loading catalog…</p>
            ) : catalogError ? (
              <p className="mt-6 rounded-lg bg-rose-500/30 p-4 text-center text-sm text-rose-100">{catalogError}</p>
            ) : (
              <div className="mt-4 grid grid-cols-3 gap-3 2xl:grid-cols-4">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleProductTap(product.id)}
                    className="flex h-36 flex-col justify-between rounded-2xl bg-[#F2F7FB] p-3 text-left text-[#003B57] shadow-lg transition active:scale-95"
                  >
                    <div>
                      <p className="text-lg font-bold uppercase tracking-wide">{product.name}</p>
                      <p className="mt-1 text-xs text-[#003B57]/70">{product.description}</p>
                    </div>
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span>{formatCurrency(product.price)}</span>
                      <span className="text-[#003B57]/60">Stock {product.inStock}</span>
                    </div>
                  </button>
                ))}
                {filteredProducts.length === 0 ? (
                  <div className="col-span-full flex h-40 items-center justify-center rounded-2xl border border-dashed border-cyan-200/60 text-sm text-cyan-100">
                    No products available.
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </section>
        <section className="flex flex-col rounded-3xl bg-[#002742] p-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#F2F7FB]">Current Order</h2>
            <span className="text-xs uppercase tracking-widest text-cyan-100">
              {orderState?.items.length ?? 0} item{orderState && orderState.items.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="mt-4 flex-1 overflow-hidden rounded-2xl bg-[#003B57]/60">
            <div className="h-full overflow-y-auto p-3 pr-2">
              {orderState && orderState.items.length > 0 ? (
                orderState.items.map((item) => {
                  const lineTotal = computeItemTotal(item, modifierMap);
                  const modifiers = item.modifiers
                    .map((entry) => {
                      const modifier = modifierMap.get(entry.modifierId);
                      if (!modifier) {
                        return null;
                      }
                      const delta = calculateModifierDelta(modifier, entry.mode);
                      return {
                        id: entry.modifierId,
                        name: modifier.name,
                        mode: entry.mode,
                        delta,
                      };
                    })
                    .filter((value): value is { id: number; name: string; mode: ModifierView["mode"]; delta: number } => Boolean(value));
                  return (
                    <button
                      key={item.lineId}
                      onClick={() => {
                        setActiveLineId(item.lineId);
                        setShowModifierGrid(true);
                      }}
                      className="mb-3 w-full rounded-2xl bg-[#001B2A] p-3 text-left text-sm text-[#F2F7FB] shadow-lg transition active:scale-[0.99]"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-base font-semibold uppercase tracking-wide">{item.productName}</p>
                          <div className="mt-1 flex items-center gap-2 text-xs text-cyan-100">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="h-6 w-6 rounded bg-[#2E9DDB]/30 text-center text-xs font-bold text-[#F2F7FB]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleQuantityChange(item.lineId, -1);
                                }}
                              >
                                –
                              </button>
                              <span className="w-6 text-center font-semibold text-[#F2F7FB]">{item.quantity}</span>
                              <button
                                type="button"
                                className="h-6 w-6 rounded bg-[#2E9DDB] text-center text-xs font-bold text-[#003B57]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleQuantityChange(item.lineId, 1);
                                }}
                              >
                                +
                              </button>
                            </div>
                            <span className="text-[#F2F7FB]/70">@ {formatCurrency(item.basePrice)}</span>
                          </div>
                        </div>
                        <div className="text-right text-lg font-bold text-[#2E9DDB]">{formatCurrency(lineTotal)}</div>
                      </div>
                      {modifiers.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {modifiers.map((modifier) => (
                            <span
                              key={modifier.id}
                              className="rounded-full bg-[#2E9DDB]/20 px-3 py-1 text-xs font-semibold uppercase text-[#F2F7FB]"
                            >
                              {modifier.mode === "removed" ? "NO" : modifier.mode === "light" ? "LIGHT" : "ADD"} {modifier.name}
                              {modifier.delta !== 0 ? ` (${modifier.delta > 0 ? "+" : ""}${modifier.delta.toFixed(2)})` : ""}
                            </span>
                          ))}
                        </div>
                      ) : null}
                      <div className="mt-3 flex justify-end">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleVoidItem(item.lineId);
                          }}
                          className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white transition active:scale-95"
                        >
                          Void Item
                        </button>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="flex h-full items-center justify-center text-xs uppercase tracking-wide text-cyan-100/80">
                  Ring items by tapping the product buttons.
                </div>
              )}
            </div>
          </div>
          <div className="mt-4 rounded-2xl bg-[#003B57] p-4 text-sm text-[#F2F7FB]">
            <div className="flex items-center justify-between">
              <span className="uppercase tracking-widest text-[#F2F7FB]/70">Subtotal</span>
              <span>{formatCurrency(orderState?.totals.subtotal ?? 0)}</span>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="uppercase tracking-widest text-[#F2F7FB]/70">Tax</span>
              <span>{formatCurrency(orderState?.totals.tax ?? 0)}</span>
            </div>
            <div className="mt-4 flex items-center justify-between text-lg font-bold text-[#2E9DDB]">
              <span className="uppercase tracking-widest text-[#F2F7FB]">Total</span>
              <span>{formatCurrency(orderState?.totals.total ?? 0)}</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm font-bold uppercase tracking-widest">
            <button
              onClick={handlePay}
              className="h-16 rounded-2xl bg-[#2E9DDB] text-[#003B57] shadow-xl transition active:scale-95"
            >
              Pay
            </button>
            <button
              onClick={handleVoidAll}
              className="h-16 rounded-2xl bg-rose-600 text-white shadow-xl transition active:scale-95"
            >
              Void
            </button>
            <button
              onClick={handleAdminOpen}
              className="h-16 rounded-2xl bg-[#F2F7FB] text-[#003B57] shadow-xl transition active:scale-95"
            >
              Settings
            </button>
          </div>
          {statusMessage ? (
            <p className="mt-4 rounded-xl bg-[#2E9DDB]/10 p-3 text-center text-xs font-semibold text-[#2E9DDB]">
              {statusMessage}
            </p>
          ) : null}
        </section>
      </main>
      {showModifierGrid && activeItem ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/60 p-6">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-[#002742] shadow-2xl">
            <div className="flex items-center justify-between bg-[#003B57] px-6 py-4 text-[#F2F7FB]">
              <div>
                <p className="text-xs uppercase tracking-widest text-cyan-100">Modifier Grid</p>
                <h3 className="text-2xl font-bold uppercase tracking-wide">{activeItem.productName}</h3>
              </div>
              <div className="text-right">
                <p className="text-sm text-cyan-100">Quantity: {activeItem.quantity}</p>
                <p className="text-lg font-bold text-[#2E9DDB]">
                  {formatCurrency(computeItemTotal(activeItem, modifierMap))}
                </p>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto px-6 py-4 text-[#F2F7FB]">
              {Object.entries(groupedModifiers).map(([group, modifiers]) => (
                <div key={group} className="mb-6">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">{group}</h4>
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {modifiers.map((modifier) => {
                      const mode = modifier.mode;
                      const background =
                        mode === "added"
                          ? BRAND_COLORS.primary
                          : mode === "removed"
                          ? "#3f4a57"
                          : mode === "light"
                          ? BRAND_COLORS.accent
                          : BRAND_COLORS.secondary;
                      const textColor = mode === "added" || mode === "light" ? BRAND_COLORS.secondary : BRAND_COLORS.accent;
                      return (
                        <button
                          key={modifier.id}
                          onClick={() => handleModifierToggle(modifier.id)}
                          className="h-24 rounded-2xl p-3 text-left text-sm font-semibold shadow-lg transition active:scale-95"
                          style={{ backgroundColor: background, color: textColor }}
                        >
                          <span className="block text-xs font-bold uppercase text-[#00131F]/60">
                            {modifierModeLabel(mode)}
                          </span>
                          <span className="block text-base font-bold uppercase tracking-wide">{modifier.name}</span>
                          <span className="block text-xs text-[#00131F]/70">
                            {modifier.delta === 0 ? "No charge" : `${modifier.delta > 0 ? "+" : ""}${modifier.delta.toFixed(2)}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between bg-[#003B57] px-6 py-4">
              <button
                onClick={() => {
                  if (activeLineId) {
                    handleVoidItem(activeLineId);
                  }
                  setShowModifierGrid(false);
                }}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-white transition active:scale-95"
              >
                Remove Item
              </button>
              <button
                onClick={() => setShowModifierGrid(false)}
                className="rounded-xl bg-[#2E9DDB] px-4 py-2 text-sm font-semibold uppercase tracking-widest text-[#003B57] transition active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {isAdminPanelOpen ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 p-6">
          <div className="h-[90vh] w-full max-w-5xl overflow-hidden rounded-3xl bg-[#002742] shadow-2xl">
            <div className="flex items-center justify-between bg-[#003B57] px-6 py-4 text-[#F2F7FB]">
              <h3 className="text-xl font-bold uppercase tracking-wide">Admin Panel</h3>
              <button
                onClick={closeAdminPanel}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold uppercase tracking-widest text-white transition active:scale-95"
              >
                Close
              </button>
            </div>
            <div className="flex h-full flex-col overflow-hidden">
              {!adminUnlocked ? (
                <form onSubmit={verifyAdminPin} className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-[#F2F7FB]">
                  <p className="text-sm text-cyan-100">Enter admin PIN to unlock catalog management.</p>
                  <input
                    name="adminPin"
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    className="w-64 rounded-xl border border-[#2E9DDB]/40 bg-[#001B2A] px-4 py-3 text-center text-lg font-semibold tracking-widest text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                    disabled={adminIsSubmitting}
                    autoFocus
                  />
                  <button
                    type="submit"
                    className="rounded-xl bg-[#2E9DDB] px-6 py-3 text-sm font-bold uppercase tracking-widest text-[#003B57] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={adminIsSubmitting}
                  >
                    {adminIsSubmitting ? "Checking…" : "Unlock"}
                  </button>
                  {adminError ? <p className="text-sm text-rose-200">{adminError}</p> : null}
                </form>
              ) : (
                <div className="flex flex-1 flex-col overflow-hidden text-[#F2F7FB]">
                  <div className="flex items-center gap-3 border-b border-[#2E9DDB]/30 bg-[#001B2A] px-6 py-3 text-xs font-semibold uppercase tracking-widest">
                    <button
                      onClick={() => setAdminTab("products")}
                      className={`rounded-lg px-3 py-2 transition ${
                        adminTab === "products" ? "bg-[#2E9DDB] text-[#003B57]" : "bg-transparent text-[#F2F7FB]"
                      }`}
                    >
                      Products
                    </button>
                    <button
                      onClick={() => setAdminTab("categories")}
                      className={`rounded-lg px-3 py-2 transition ${
                        adminTab === "categories" ? "bg-[#2E9DDB] text-[#003B57]" : "bg-transparent text-[#F2F7FB]"
                      }`}
                    >
                      Categories
                    </button>
                    <button
                      onClick={() => setAdminTab("modifiers")}
                      className={`rounded-lg px-3 py-2 transition ${
                        adminTab === "modifiers" ? "bg-[#2E9DDB] text-[#003B57]" : "bg-transparent text-[#F2F7FB]"
                      }`}
                    >
                      Modifiers
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto px-6 py-4 text-sm">
                    {adminTab === "products" ? (
                      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">Products</h4>
                          <div className="space-y-2 rounded-2xl bg-[#001B2A] p-4">
                            {catalog?.products.map((product) => (
                              <div
                                key={product.id}
                                className="flex items-center justify-between rounded-xl bg-[#002742] p-3 text-xs uppercase tracking-wide"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-[#F2F7FB]">{product.name}</p>
                                  <p className="text-xs text-cyan-100">{formatCurrency(product.price)} · Stock {product.inStock}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setProductForm({
                                        id: product.id,
                                        name: product.name,
                                        description: product.description,
                                        price: product.price,
                                        inStock: product.inStock,
                                        categoryId: product.categoryId,
                                        modifierIds: product.modifierIds,
                                        active: product.active,
                                      })
                                    }
                                    className="rounded-lg bg-[#2E9DDB] px-3 py-1 text-xs font-bold text-[#003B57]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteProduct(product.id)}
                                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                            {catalog && catalog.products.length === 0 ? (
                              <p className="text-xs text-cyan-100">No products saved.</p>
                            ) : null}
                          </div>
                        </div>
                        <form onSubmit={submitProductForm} className="space-y-3 rounded-2xl bg-[#001B2A] p-4">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">
                            {productForm?.id ? "Edit Product" : "New Product"}
                          </h4>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Name
                            <input
                              name="name"
                              defaultValue={productForm?.name ?? ""}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            />
                          </label>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Description
                            <textarea
                              name="description"
                              defaultValue={productForm?.description ?? ""}
                              rows={3}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                              Price
                              <input
                                name="price"
                                type="number"
                                step="0.01"
                                min="0"
                                defaultValue={productForm?.price ?? ""}
                                className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                              />
                            </label>
                            <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                              In Stock
                              <input
                                name="inStock"
                                type="number"
                                min="0"
                                defaultValue={productForm?.inStock ?? ""}
                                className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                              />
                            </label>
                          </div>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Category
                            <select
                              name="categoryId"
                              defaultValue={productForm?.categoryId ?? ""}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            >
                              <option value="">Unassigned</option>
                              {catalog?.categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Modifiers
                            <div className="mt-1 grid max-h-32 gap-1 overflow-y-auto rounded-lg border border-[#2E9DDB]/40 bg-[#002742] p-2 text-xs">
                              {catalog?.modifiers.map((modifier) => (
                                <label key={modifier.id} className="flex items-center justify-between gap-3">
                                  <span>{modifier.name}</span>
                                  <input
                                    type="checkbox"
                                    name="modifierIds"
                                    value={modifier.id}
                                    defaultChecked={productForm?.modifierIds?.includes(modifier.id)}
                                  />
                                </label>
                              ))}
                            </div>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            <input type="checkbox" name="active" defaultChecked={productForm?.active ?? true} /> Active
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              className="rounded-lg bg-[#2E9DDB] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#003B57] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={adminIsSubmitting}
                            >
                              {productForm?.id ? "Save" : "Add"}
                            </button>
                            <button
                              type="button"
                              onClick={resetProductForm}
                              className="rounded-lg bg-[#003B57] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#F2F7FB]"
                            >
                              Clear
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : adminTab === "categories" ? (
                      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">Categories</h4>
                          <div className="space-y-2 rounded-2xl bg-[#001B2A] p-4">
                            {catalog?.categories.map((category) => (
                              <div
                                key={category.id}
                                className="flex items-center justify-between rounded-xl bg-[#002742] p-3 text-xs uppercase tracking-wide"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-[#F2F7FB]">{category.name}</p>
                                  <p className="text-xs text-cyan-100">Order {category.sortOrder}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setCategoryForm({
                                        id: category.id,
                                        name: category.name,
                                        swatch: category.swatch,
                                        sortOrder: category.sortOrder,
                                        active: category.active,
                                      })
                                    }
                                    className="rounded-lg bg-[#2E9DDB] px-3 py-1 text-xs font-bold text-[#003B57]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteCategory(category.id)}
                                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                            {catalog && catalog.categories.length === 0 ? (
                              <p className="text-xs text-cyan-100">No categories saved.</p>
                            ) : null}
                          </div>
                        </div>
                        <form onSubmit={submitCategoryForm} className="space-y-3 rounded-2xl bg-[#001B2A] p-4">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">
                            {categoryForm?.id ? "Edit Category" : "New Category"}
                          </h4>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Name
                            <input
                              name="name"
                              defaultValue={categoryForm?.name ?? ""}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            />
                          </label>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Sort Order
                            <input
                              name="sortOrder"
                              type="number"
                              defaultValue={categoryForm?.sortOrder ?? 0}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            />
                          </label>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Swatch
                            <input
                              name="swatch"
                              type="text"
                              defaultValue={categoryForm?.swatch ?? ""}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            />
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            <input type="checkbox" name="active" defaultChecked={categoryForm?.active ?? true} /> Active
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              className="rounded-lg bg-[#2E9DDB] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#003B57] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={adminIsSubmitting}
                            >
                              {categoryForm?.id ? "Save" : "Add"}
                            </button>
                            <button
                              type="button"
                              onClick={resetCategoryForm}
                              className="rounded-lg bg-[#003B57] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#F2F7FB]"
                            >
                              Clear
                            </button>
                          </div>
                        </form>
                      </div>
                    ) : (
                      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                        <div className="space-y-2">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">Modifiers</h4>
                          <div className="space-y-2 rounded-2xl bg-[#001B2A] p-4">
                            {catalog?.modifiers.map((modifier) => (
                              <div
                                key={modifier.id}
                                className="flex items-center justify-between rounded-xl bg-[#002742] p-3 text-xs uppercase tracking-wide"
                              >
                                <div>
                                  <p className="text-sm font-semibold text-[#F2F7FB]">{modifier.name}</p>
                                  <p className="text-xs text-cyan-100">
                                    {modifier.type === "remove" ? "Remove" : "Add"} · {formatCurrency(modifier.price)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() =>
                                      setModifierForm({
                                        id: modifier.id,
                                        name: modifier.name,
                                        category: modifier.category,
                                        price: modifier.price,
                                        type: modifier.type,
                                        active: modifier.active,
                                      })
                                    }
                                    className="rounded-lg bg-[#2E9DDB] px-3 py-1 text-xs font-bold text-[#003B57]"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => deleteModifier(modifier.id)}
                                    className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-bold text-white"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ))}
                            {catalog && catalog.modifiers.length === 0 ? (
                              <p className="text-xs text-cyan-100">No modifiers saved.</p>
                            ) : null}
                          </div>
                        </div>
                        <form onSubmit={submitModifierForm} className="space-y-3 rounded-2xl bg-[#001B2A] p-4">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-cyan-100">
                            {modifierForm?.id ? "Edit Modifier" : "New Modifier"}
                          </h4>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Name
                            <input
                              name="name"
                              defaultValue={modifierForm?.name ?? ""}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            />
                          </label>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Price
                            <input
                              name="price"
                              type="number"
                              step="0.01"
                              defaultValue={modifierForm?.price ?? 0}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            />
                          </label>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Category Label
                            <input
                              name="category"
                              defaultValue={modifierForm?.category ?? ""}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            />
                          </label>
                          <label className="block text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            Type
                            <select
                              name="type"
                              defaultValue={modifierForm?.type ?? "add"}
                              className="mt-1 w-full rounded-lg border border-[#2E9DDB]/40 bg-[#002742] px-3 py-2 text-sm text-[#F2F7FB] focus:border-[#2E9DDB] focus:outline-none"
                            >
                              <option value="add">Add</option>
                              <option value="remove">Remove</option>
                            </select>
                          </label>
                          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-cyan-100">
                            <input type="checkbox" name="active" defaultChecked={modifierForm?.active ?? true} /> Active
                          </label>
                          <div className="flex items-center gap-2">
                            <button
                              type="submit"
                              className="rounded-lg bg-[#2E9DDB] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#003B57] transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                              disabled={adminIsSubmitting}
                            >
                              {modifierForm?.id ? "Save" : "Add"}
                            </button>
                            <button
                              type="button"
                              onClick={resetModifierForm}
                              className="rounded-lg bg-[#003B57] px-4 py-2 text-xs font-bold uppercase tracking-wide text-[#F2F7FB]"
                            >
                              Clear
                            </button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-[#2E9DDB]/30 bg-[#003B57] px-6 py-3 text-xs text-cyan-100">
                    {adminFeedback ? adminFeedback : "Changes save instantly to the local database."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
