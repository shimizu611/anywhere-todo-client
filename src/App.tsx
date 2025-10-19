import { useEffect, useState } from 'react';
import { api, type Todo } from './lib/api';

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setErr(null); setLoading(true);
    try { setTodos(await api.list()); }
    catch (e:any){ setErr(e.message ?? 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const old = todos;
    const optimistic: Todo = {_id: `temp-${Date.now()}`, title, done:false};
    setTodos([optimistic, ...todos]); setTitle('');
    try {
      const created = await api.create(title.trim());
      setTodos([created, ...old]);
    } catch (e:any) {
      setTodos(old); setErr(e.message ?? 'create failed');
    }
  };

  const toggle = async (id: string) => {
    const old = todos;
    setTodos(todos.map(t => t._id === id ? {...t, done: !t.done} : t));
    try { await api.toggle(id); }
    catch (e:any){ setErr(e.message ?? 'toggle failed'); setTodos(old); }
  };

  const remove = async (id: string) => {
    const old = todos;
    setTodos(todos.filter(t => t._id !== id));
    try { await api.remove(id); }
    catch (e:any){ setErr(e.message ?? 'delete failed'); setTodos(old); }
  };

  return (
    <main style={{maxWidth: 520, margin: '40px auto', fontFamily: 'system-ui'}}>
      <h1>Anywhere ToDo</h1>
      <form onSubmit={add} style={{display:'flex', gap:8}}>
        <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Add a task..."
               style={{flex:1, padding:10, border:'1px solid #ddd', borderRadius:8}} />
        <button style={{padding:'10px 16px'}}>Add</button>
      </form>

      {err && <p style={{color:'crimson'}}>{err}</p>}
      {loading ? <p>Loading...</p> : (
        <ul style={{listStyle:'none', padding:0, marginTop:16}}>
          {todos.map(t=>(
            <li key={t._id}
                style={{display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid #eee'}}>
              <input type="checkbox" checked={t.done} onChange={()=>toggle(t._id)} />
              <span style={{flex:1, textDecoration: t.done ? 'line-through' : 'none'}}>{t.title}</span>
              <button onClick={()=>remove(t._id)} style={{color:'crimson'}}>Delete</button>
            </li>
          ))}
          {!todos.length && <li style={{padding:'10px 0', color:'#666'}}>No items</li>}
        </ul>
      )}
    </main>
  );
}
