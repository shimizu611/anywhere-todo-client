// apps/client/src/types.ts
export type Task = {
  _id: string
  title: string
  category?: string
  done: boolean
  archived: boolean
  createdAt?: string
  updatedAt?: string
  dueDate?: string
}
