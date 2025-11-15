import { calculateModifierDelta, Modifier } from "./modifier_manager";
import { Product } from "./products-store";

export type ModifierMode = "default" | "added" | "removed" | "light";

export type OrderItemModifier = {
  modifierId: number;
  mode: ModifierMode;
};

export type OrderItem = {
  lineId: string;
  productId: number;
  productName: string;
  quantity: number;
  basePrice: number;
  modifiers: OrderItemModifier[];
};

export type OrderTotals = {
  subtotal: number;
  tax: number;
  total: number;
};

export type OrderState = {
  id: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  totals: OrderTotals;
};

const DEFAULT_STORAGE_KEY = "freezeMonkeyPOS_activeOrder";

export type OrderManagerOptions = {
  products: Product[];
  modifiers: Modifier[];
  taxRate?: number;
  storageKey?: string;
  autoSaveIntervalMs?: number;
};

type Listener = (state: OrderState) => void;

function createEmptyState(): OrderState {
  const timestamp = new Date().toISOString();
  return {
    id: `ticket-${Date.now()}`,
    createdAt: timestamp,
    updatedAt: timestamp,
    items: [],
    totals: { subtotal: 0, tax: 0, total: 0 },
  };
}

function cycleMode(current: ModifierMode, modifier: Modifier): ModifierMode {
  const cycleAdd: ModifierMode[] = ["default", "added", "light"];
  const cycleRemove: ModifierMode[] = ["default", "removed", "light"];
  const cycle = modifier.type === "remove" ? cycleRemove : cycleAdd;
  const index = cycle.indexOf(current);
  const next = cycle[(index + 1) % cycle.length];
  return next;
}

export class OrderManager {
  private state: OrderState = createEmptyState();
  private listeners = new Set<Listener>();
  private products = new Map<number, Product>();
  private modifiers = new Map<number, Modifier>();
  private readonly storageKey: string;
  private readonly taxRate: number;
  private readonly autoSaveInterval: number;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(options: OrderManagerOptions) {
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.taxRate = options.taxRate ?? 0;
    this.autoSaveInterval = options.autoSaveIntervalMs ?? 30_000;
    this.setCatalog(options.products, options.modifiers);
    this.restoreFromStorage();
    this.startAutoSave();
  }

  destroy() {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
    this.listeners.clear();
  }

  setCatalog(products: Product[], modifiers: Modifier[]) {
    this.products = new Map(products.map((product) => [product.id, product]));
    this.modifiers = new Map(modifiers.map((modifier) => [modifier.id, modifier]));
    this.reconcileItems();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.snapshot());
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): OrderState {
    return this.snapshot();
  }

  addProduct(productId: number): string {
    const product = this.products.get(productId);
    if (!product) {
      throw new Error(`Product ${productId} not found`);
    }

    const lineId = `${product.id}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`;
    const item: OrderItem = {
      lineId,
      productId: product.id,
      productName: product.name,
      quantity: 1,
      basePrice: Number(product.price.toFixed(2)),
      modifiers: [],
    };
    this.state.items.push(item);
    this.touch();
    this.emit();
    return lineId;
  }

  updateQuantity(lineId: string, quantity: number) {
    const item = this.state.items.find((entry) => entry.lineId === lineId);
    if (!item) {
      return;
    }
    item.quantity = Math.max(1, Math.floor(quantity));
    this.touch();
    this.emit();
  }

  toggleModifier(lineId: string, modifierId: number) {
    const item = this.state.items.find((entry) => entry.lineId === lineId);
    const modifier = this.modifiers.get(modifierId);
    if (!item || !modifier) {
      return;
    }

    const allowed = this.products.get(item.productId)?.modifierIds ?? [];
    if (allowed.length > 0 && !allowed.includes(modifierId)) {
      return;
    }

    const existing = item.modifiers.find((entry) => entry.modifierId === modifierId);
    const currentMode = existing?.mode ?? "default";
    const nextMode = cycleMode(currentMode, modifier);

    if (existing) {
      existing.mode = nextMode;
      if (nextMode === "default") {
        item.modifiers = item.modifiers.filter((entry) => entry.modifierId !== modifierId);
      }
    } else if (nextMode !== "default") {
      item.modifiers.push({ modifierId, mode: nextMode });
    }

    this.touch();
    this.emit();
  }

  setModifierMode(lineId: string, modifierId: number, mode: ModifierMode) {
    const item = this.state.items.find((entry) => entry.lineId === lineId);
    const modifier = this.modifiers.get(modifierId);
    if (!item || !modifier) {
      return;
    }

    if (mode === "default") {
      item.modifiers = item.modifiers.filter((entry) => entry.modifierId !== modifierId);
    } else {
      const existing = item.modifiers.find((entry) => entry.modifierId === modifierId);
      if (existing) {
        existing.mode = mode;
      } else {
        item.modifiers.push({ modifierId, mode });
      }
    }

    this.touch();
    this.emit();
  }

  removeItem(lineId: string) {
    this.state.items = this.state.items.filter((entry) => entry.lineId !== lineId);
    this.touch();
    this.emit();
  }

  clear() {
    this.state = createEmptyState();
    this.emit();
    this.persist();
  }

  private emit() {
    this.recalculateTotals();
    const snapshot = this.snapshot();
    for (const listener of this.listeners) {
      listener(snapshot);
    }
    this.persist();
  }

  private snapshot(): OrderState {
    return JSON.parse(JSON.stringify(this.state)) as OrderState;
  }

  private recalculateTotals() {
    let subtotal = 0;
    for (const item of this.state.items) {
      const base = Number(item.basePrice.toFixed(2));
      const modifiersTotal = item.modifiers.reduce((total, entry) => {
        const modifier = this.modifiers.get(entry.modifierId);
        if (!modifier) {
          return total;
        }
        return total + calculateModifierDelta(modifier, entry.mode);
      }, 0);
      const lineTotal = (base + modifiersTotal) * item.quantity;
      subtotal += lineTotal;
    }

    subtotal = Number(subtotal.toFixed(2));
    const tax = Number((subtotal * this.taxRate).toFixed(2));
    const total = Number((subtotal + tax).toFixed(2));
    this.state.totals = { subtotal, tax, total };
  }

  private touch() {
    this.state.updatedAt = new Date().toISOString();
  }

  private startAutoSave() {
    if (typeof window === "undefined") {
      return;
    }
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }
    this.autoSaveTimer = setInterval(() => {
      this.persist();
    }, this.autoSaveInterval);
  }

  private persist() {
    if (typeof window === "undefined") {
      return;
    }
    try {
      window.localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.warn("Unable to persist order state", error);
    }
  }

  private restoreFromStorage() {
    if (typeof window === "undefined") {
      return;
    }
    try {
      const stored = window.localStorage.getItem(this.storageKey);
      if (!stored) {
        return;
      }
      const parsed = JSON.parse(stored) as OrderState;
      if (parsed && Array.isArray(parsed.items)) {
        this.state = {
          ...createEmptyState(),
          ...parsed,
          items: parsed.items.map((item) => ({
            ...item,
            quantity: Math.max(1, Math.floor(item.quantity)),
            basePrice: Number(item.basePrice.toFixed(2)),
            modifiers: Array.isArray(item.modifiers)
              ? item.modifiers.map((entry) => ({
                  modifierId: Number(entry.modifierId),
                  mode: entry.mode as ModifierMode,
                }))
              : [],
          })),
        };
        this.reconcileItems();
        this.recalculateTotals();
      }
    } catch (error) {
      console.warn("Failed to restore order state", error);
      this.state = createEmptyState();
    }
  }

  private reconcileItems() {
    for (const item of this.state.items) {
      const product = this.products.get(item.productId);
      if (!product) {
        continue;
      }
      item.productName = product.name;
      item.basePrice = Number(product.price.toFixed(2));
      item.modifiers = item.modifiers.filter((entry) => {
        const modifier = this.modifiers.get(entry.modifierId);
        return Boolean(modifier);
      });
    }
  }
}
