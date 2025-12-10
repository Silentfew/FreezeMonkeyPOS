export type ModifierAction = 'add' | 'remove';

export interface Modifier {
  id: string;
  name: string;
  price: number;
  action: ModifierAction;
}

export const MODIFIERS_FILE = 'modifiers.json';

export async function readModifiers(): Promise<Modifier[]> {
  const { readJSON } = await import('@/infra/fs/jsonStore');
  const modifiers = await readJSON<Modifier[]>(MODIFIERS_FILE, []);
  return Array.isArray(modifiers) ? modifiers : [];
}

export function toggleModifier(selected: Modifier[], modifier: Modifier): Modifier[] {
  const exists = selected.find((item) => item.id === modifier.id);
  if (exists) {
    return selected.filter((item) => item.id !== modifier.id);
  }
  return [...selected, modifier];
}

export function calculateModifierImpact(modifiers: Modifier[]): number {
  return modifiers.reduce((sum, modifier) => {
    if (modifier.action === 'add') {
      return sum + modifier.price;
    }
    return sum;
  }, 0);
}

export function modifierLabel(modifier: Modifier): string {
  if (modifier.action === 'add' && modifier.price > 0) {
    return `+${modifier.price.toFixed(2)}`;
  }
  if (modifier.action === 'remove') {
    return 'remove';
  }
  return 'no charge';
}
