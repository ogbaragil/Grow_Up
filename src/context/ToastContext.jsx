import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { safeId } from "../state/normalize";

export const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmRequest, setConfirmRequest] = useState(null);
  const confirmResolver = useRef(null);

  const addToast = useCallback((message, type = "info") => {
    const id = safeId();
    setToasts(list => [...list, { id, message:String(message || ""), type }]);
    window.setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), 3500);
  }, []);

  useEffect(() => {
    const handler = (event) => addToast(event.detail?.message, event.detail?.type || "info");
    window.addEventListener("growup-toast", handler);
    return () => window.removeEventListener("growup-toast", handler);
  }, [addToast]);

  const showConfirm = useCallback((message) => new Promise(resolve => {
    confirmResolver.current = resolve;
    setConfirmRequest({ message:String(message || "Are you sure?") });
  }), []);

  const resolveConfirm = useCallback((value) => {
    const resolve = confirmResolver.current;
    confirmResolver.current = null;
    setConfirmRequest(null);
    resolve?.(value);
  }, []);

  const value = useMemo(() => ({ addToast, showConfirm }), [addToast, showConfirm]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
      {confirmRequest && <ConfirmModal message={confirmRequest.message} onCancel={()=>resolveConfirm(false)} onConfirm={()=>resolveConfirm(true)} />}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext)?.addToast || (() => {});
}

export function useConfirm() {
  return useContext(ToastContext)?.showConfirm || (async () => false);
}

export function ToastContainer({ toasts }) {
  return <div className="toast-container" role="status" aria-live="polite">
    {toasts.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.message}</div>)}
  </div>;
}

export function ConfirmModal({ message, onCancel, onConfirm }) {
  return (
    <div className="modal-backdrop confirm-backdrop">
      <div className="confirm-modal" role="dialog" aria-modal="true">
        <h2>Confirm action</h2>
        <p>{message}</p>
        <div className="confirm-actions">
          <button onClick={onCancel}>Cancel</button>
          <button className="primary" onClick={onConfirm}>Continue</button>
        </div>
      </div>
    </div>
  );
}

