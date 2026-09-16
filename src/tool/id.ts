// Tiny id generator for React list keys in the form state. Tool-specific.

let counter = 0;

export function genId(): string {
  counter += 1;
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${counter}`;
}
