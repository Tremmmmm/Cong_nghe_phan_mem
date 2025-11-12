import { createContext, useContext, useEffect, useState } from 'react';

const ToastCtx = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // chèn CSS nhỏ gọn cho toast, khỏi sửa file theme.css
  useEffect(() => {
    const id = 'ff-toast-inline-style';
    if (!document.getElementById(id)) {
      const tag = document.createElement('style');
      tag.id = id;
      tag.textContent = `
        .ff-toast-wrap{
          position: fixed; right: 16px; bottom: 16px;
          display: flex; flex-direction: column; gap: 10px; z-index: 9999;
        }
        .ff-toast{
          background: #111; color: #fff; padding: 10px 12px;
          border-radius: 10px; min-width: 220px; box-shadow: 0 6px 20px rgba(0,0,0,.18);
          border: 1px solid rgba(255,255,255,.1); font-size: 14px;
        }
        .ff-toast.success{ background:#0f5132; border-color:#198754; }
        .ff-toast.error{ background:#842029; border-color:#dc3545; }
        .ff-toast.info{ background:#055160; border-color:#0dcaf0; }
        .dark .ff-toast{ border-color: rgba(255,255,255,.2); }
      `;
      document.head.appendChild(tag);
    }
  }, []);

  const show = (message, type = 'success', ms = 2000) => {
    const id = Math.random().toString(36).slice(2, 7);
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), ms);
  };

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="ff-toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`ff-toast ${t.type}`}>{t.message}</div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
