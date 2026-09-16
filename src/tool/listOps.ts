// Small helper for add/remove/patch operations on an id-keyed list held in a
// parent component's state. Not a React hook — just a plain closure
// factory, safe to call conditionally or per-render. Tool-specific.

export interface ListOps<T> {
  add: (item: T) => void;
  remove: (id: string) => void;
  patch: (id: string, patch: Partial<T>) => void;
}

export function listOps<T extends { id: string }>(
  list: T[],
  setList: (next: T[]) => void,
): ListOps<T> {
  return {
    add: (item) => setList([...list, item]),
    remove: (id) => setList(list.filter((item) => item.id !== id)),
    patch: (id, patch) => setList(list.map((item) => (item.id === id ? { ...item, ...patch } : item))),
  };
}
