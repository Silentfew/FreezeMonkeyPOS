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

export async function saveModifiers(modifiers: Modifier[]): Promise<void> {
  const { writeJSON } = await import('@/infra/fs/jsonStore');
  await writeJSON(MODIFIERS_FILE, modifiers);
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

export async function addModifier(
  payload: Omit<Modifier, "id">
): Promise<Modifier> {
  const modifiers = await readModifiers();

  const nextId =
    modifiers.length > 0
      ? Math.max(
          ...modifiers
            .map((m) => Number(m.id))
            .filter((n) => !Number.isNaN(n))
        ) + 1
      : 1;

  const newModifier: Modifier = {
    ...payload,
    id: nextId,
  };

  const updated = [...modifiers, newModifier];

  await saveModifiers(updated);
  return newModifier;
}

export async function updateModifier(
  updated: Modifier
): Promise<Modifier[]> {
  const modifiers = await readModifiers();
  const newList = modifiers.map((m) =>
    m.id === updated.id ? { ...m, ...updated } : m
  );
  await saveModifiers(newList);
  return newList;
}

export async function deleteModifier(
  id: string | number
): Promise<Modifier[]> {
  const modifiers = await readModifiers();
  const updated = modifiers.filter((m) => m.id !== id);
  await saveModifiers(updated);
  return updated;
}
