// APIのベースURL（末尾スラッシュ除去）
const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '');

export type Todo = { _id: string; title: string; done: boolean };

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export const api = {
  list: () => fetch(`${BASE}/api/todos`).then(j<Todo[]>),
  create: (title: string) =>
    fetch(`${BASE}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    }).then(j<Todo>),
  toggle: (id: string) =>
    fetch(`${BASE}/api/todos/${id}/toggle`, { method: 'PATCH' }).then(j<Todo>),
  remove: (id: string) =>
    fetch(`${BASE}/api/todos/${id}`, { method: 'DELETE' }).then(j<{ ok: true }>),
};
