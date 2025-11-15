import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { useAuth } from './AuthContext.jsx';
import { useToast } from './ToastContext.jsx';

// --- SỬA LỖI QUAN TRỌNG CHO NETLIFY ---
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5181'; 
const API_ENDPOINT = `${API_BASE_URL}/favorites`;
const LS_KEY = 'ff_fav_v1';

const FavCtx = createContext(null); 

function ensureAnonId() {
  let id = localStorage.getItem('ff_anon_id');
  if (!id) {
    id = Math.random().toString(36).slice(2, 10);
    localStorage.setItem('ff_anon_id', id);
  }
  return id;
}

const lc = s => String(s || '').toLowerCase();

function primaryKeyFor(user) {
  const PREFIX = LS_KEY + ':';
  if (user?.email)      return `${PREFIX}ue:${lc(user.email)}`
  if (user?.id != null) return `${PREFIX}uid:${user.id}`
  return `${PREFIX}g:${ensureAnonId()}`;
}

export function FavProvider({ children }) {
  const { user } = useAuth();
  const toast = useToast();
  
  const favId = useMemo(() => primaryKeyFor(user), [user]);
  const [ids, setIds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavs = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_ENDPOINT}/${encodeURIComponent(favId)}`);
        if (res.ok) {
          setIds((await res.json()).ids || []);
        } else if (res.status === 404) {
          await fetch(API_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: favId, ids: [] }) });
          setIds([]);
        }
      } catch (e) {
        console.error("Fav load error:", e);
        setIds([]);
      }
      setLoading(false);
    };
    loadFavs();
  }, [favId]);

  const writeThrough = async (nextIds) => {
    const payload = { id: favId, ids: nextIds };
    try {
      await fetch(`${API_ENDPOINT}/${encodeURIComponent(favId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      toast.show('Lỗi đồng bộ yêu thích!', 'error');
    }
  };
  
  const toggle = useCallback(async (id) => {
    const nextIds = ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id];
    setIds(nextIds);
    await writeThrough(nextIds);
  }, [ids, favId]);

  const has = useCallback((id) => ids.includes(id), [ids]);
  const count = useMemo(() => ids.length, [ids]);
  const value = { ids, count, toggle, has, loading };

  return (
    <FavCtx.Provider value={value}>
      {!loading && children}
    </FavCtx.Provider>
  );
}

export function useFav() {
  const ctx = useContext(FavCtx);
  if (!ctx) throw new Error('useFav must be used within FavProvider');
  return ctx;
}