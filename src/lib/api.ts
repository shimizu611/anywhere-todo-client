// APIのベースURL（末尾スラッシュ除去）
const BASE = (import.meta.env.VITE_API_BASE ?? '').replace(/\/+$/, '')
import type { Task } from '../types';

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// --- 追加：クエリを組み立てる小道具
const qs = (p?: ListParams) => {
  if (!p) return ''
  const sp = new URLSearchParams()
  if (p.category) sp.set('category', p.category)
  if (p.includeArchived) sp.set('includeArchived', '1')
  if (typeof p.done === 'boolean') sp.set('done', String(p.done)) // "true"/"false"
  if (p.sort) sp.set('sort', p.sort)
  if (p.order) sp.set('order', p.order)
  const s = sp.toString()
  return s ? `?${s}` : ''
}

// --- 追加：一覧のクエリ型
export type ListParams = {
  category?: string
  includeArchived?: boolean
  done?: boolean            // true/false 省略で “両方”
  sort?: 'createdAt' | 'title' | 'dueDate' | 'category' | 'done' | 'archived'
  order?: 'asc' | 'desc'
}

type CreatePayload = {
  title: string
  category?: string
  dueDate?: string | null
}


export const api = {
  // ★ 引数ありに拡張
  list: (params?: ListParams) =>
    fetch(`${BASE}/api/todos${qs(params)}`).then(j<Task[]>),

  create: (payload: CreatePayload) =>
    fetch(`${BASE}/api/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).then(j<Task>),

  toggle: (id: string, field:'done' | 'archived', value?: boolean) =>
    fetch(`${BASE}/api/todos/${id}/${field}`, { 
      method: 'PATCH',
      headers: { 'Content-Type' : 'application/json' },
      body: JSON.stringify({ value }),
    }).then(j<Task>),

  update: (id: string, patch: Partial<CreatePayload & { done?: boolean; archived?: boolean }>) =>
    fetch(`${BASE}/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }).then(j<Task>),
    
  remove: (id: string) =>
    fetch(`${BASE}/api/todos/${id}`, { method: 'DELETE' }).then(j<{ ok: true }>),
}
