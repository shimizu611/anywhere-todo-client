import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from './lib/api'
import type { Task } from './types'
// 例：型（お好みでファイル上部に）
type DoneFilter = 'all' | 'true' | 'false'
type SortKey = 'createdAt' | 'title' | 'dueDate' | 'category' | 'done' | 'archived'
type Order = 'asc' | 'desc'

// 重複なしカテゴリ一覧
const categoriesFrom = (items: Task[]) =>
  Array.from(new Set((items ?? []).map(i => i.category).filter(Boolean))) as string[]


type ToggleVars = { id: string; field: 'done' | 'archived'; value?: boolean }

export default function App() {
  const qc = useQueryClient()

  // フィルタ・ソート
  const [category, setCategory] = useState<string>('')
  const [doneFilter, setDoneFilter] = useState<'all' | 'true' | 'false'>('all')
  const [sort, setSort] = useState<'createdAt' | 'dueDate'>('createdAt')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')

  // 追加フォーム
  const [title, setTitle] = useState<string>('')
  const [newCategory, setNewCategory] = useState<string>('')
  const [dueDate, setDueDate] = useState<string>('')

  // 削除確認
  const [confirmId, setConfirmId] = useState<string | null>(null)

  // 取得キー
  const key = ['tasks', { category, doneFilter, sort, order }] as const

// …state は既存を利用（category, doneFilter, sort, order など）

// 一覧取得（★ list に params を渡す）
const { data: items = [], isLoading } = useQuery<Task[]>({
  queryKey: key,
  queryFn: () =>
    api.list({
      category: category || undefined,
      done: doneFilter === 'all' ? undefined : doneFilter === 'true',
      sort: (sort as SortKey) || 'createdAt',
      order: (order as Order) || 'desc',
    }),
})
const cats = useMemo(() => categoriesFrom(items), [items])

// 追加（★ create のペイロードを拡張版に）
const mCreate = useMutation<Task, unknown, void>({
  mutationFn: (): Promise<Task> =>
    api.create({
      title: title.trim(),
      category: newCategory.trim() || undefined,
      dueDate: dueDate || undefined, // 文字列(ISO) or null/undefined
    }),
  onSuccess: () => {
    setTitle('')
    setNewCategory('')
    setDueDate('')
    qc.invalidateQueries({ queryKey: ['tasks'] })
  },
})


  // トグル（done/archived）
  const mToggle = useMutation<Task, unknown, ToggleVars>({
    mutationFn: (vars): Promise<Task> => api.toggle(vars.id, vars.field, vars.value),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Task[]>(key)
      if (prev) {
        const next = prev.map(t =>
          t._id === vars.id
            ? ({ ...t, [vars.field]: typeof vars.value === 'boolean' ? vars.value : !t[vars.field] } as Task)
            : t
        )
        qc.setQueryData(key, next)
      }
      return { prev }
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })

  // 削除
  const mDelete = useMutation<{ ok: true }, unknown, string>({
    mutationFn: (id: string) => api.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }),
  })


  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'system-ui' }}>
      <h1>Anywhere-Todo</h1>

      {/* フィルタ/ソート */}
      <section style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(5, 1fr)' }}>
        <select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value=''>カテゴリ: すべて</option>
          {cats.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select value={doneFilter} onChange={(e) => setDoneFilter(e.target.value as 'all' | 'true' | 'false')}>
          <option value='all'>完了: すべて</option>
          <option value='true'>完了のみ</option>
          <option value='false'>未完了のみ</option>
        </select>


        <select value={sort} onChange={(e) => setSort(e.target.value as 'createdAt' | 'dueDate')}>
          <option value='createdAt'>作成日</option>
          <option value='dueDate'>期限</option>
        </select>

        <select value={order} onChange={(e) => setOrder(e.target.value as 'asc' | 'desc')}>
          <option value='desc'>降順</option>
          <option value='asc'>昇順</option>
        </select>
      </section>

      <hr style={{ margin: '16px 0' }} />

      {/* 追加フォーム */}
      <section style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <input
          placeholder='タイトル'
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          placeholder='カテゴリ（任意）'
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />
        <input
          type='datetime-local'
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <button disabled={!title.trim() || mCreate.isPending} onClick={() => mCreate.mutate()}>
          追加
        </button>
      </section>

      {/* 一覧 */}
      {isLoading ? (
        <p>読み込み中...</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {items.map(t => (
            <li
              key={t._id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto auto auto',
                alignItems: 'center',
                gap: 8,
                padding: '8px 0',
                borderBottom: '1px solid #eee',
              }}
            >
              <input
                type='checkbox'
                checked={t.done}
                onChange={() => mToggle.mutate({ id: t._id, field: 'done' })}
              />

              <div>
                <div
                  style={{
                    fontWeight: 600,
                    textDecoration: t.done ? 'line-through' : 'none',
                    opacity: t.archived ? 0.5 : 1,
                  }}
                >
                  {t.title}
                </div>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {t.category || '未分類'} ・ 作成: {new Date(t.createdAt).toLocaleString()}
                  {t.dueDate ? ` ・ 期限: ${new Date(t.dueDate).toLocaleString()}` : ''}
                </div>
              </div>

              <button onClick={() => mToggle.mutate({ id: t._id, field: 'archived' })}>
                {t.archived ? '戻す' : '完了'}
              </button>

              <button onClick={() => setConfirmId(t._id)}>削除</button>

              <button
                onClick={async () => {
                  const nt = prompt('新しいタイトル', t.title)
                  if (nt && nt !== t.title) {
                    await api.update(t._id, { title: nt })
                    await qc.invalidateQueries({ queryKey: ['tasks'] })
                  }
                }}
              >
                編集
              </button>
            </li>
          ))}

          {!items.length && <li style={{ padding: '8px 0', color: '#666' }}>No items</li>}
        </ul>
      )}

      {/* 削除確認モーダル */}
      {confirmId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.3)',
            display: 'grid',
            placeItems: 'center',
          }}
          role='dialog'
          aria-modal='true'
        >
          <div style={{ background: 'white', padding: 16, borderRadius: 8, minWidth: 280 }}>
            <h3>削除の確認</h3>
            <p>このタスクを削除しますか？この操作は取り消せません。</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmId(null)}>いいえ</button>
              <button
                onClick={async () => {
                  if (confirmId) await mDelete.mutateAsync(confirmId)
                  setConfirmId(null)
                }}
                style={{ color: 'crimson' }}
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
