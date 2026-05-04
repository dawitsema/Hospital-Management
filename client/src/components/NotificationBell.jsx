import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client.js";
import { useLanguage } from "../context/LanguageContext.jsx";

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function NotificationBell() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const load = useCallback(async () => {
    try {
      const data = await api("/api/notifications?limit=50");
      setItems(data.notifications || []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* ignore when logged out mid-flight */
    }
  }, []);

  useEffect(() => {
    load();
    const intervalId = setInterval(load, 45_000);
    function onFocus() {
      load();
    }
    function onRefresh() {
      load();
    }
    window.addEventListener("focus", onFocus);
    window.addEventListener("hospital:refresh-notifications", onRefresh);
    return () => {
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("hospital:refresh-notifications", onRefresh);
    };
  }, [load]);

  useEffect(() => {
    function onDocClick(e) {
      if (!wrapRef.current?.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  async function markRead(id) {
    setLoading(true);
    try {
      const data = await api(`/api/notifications/${id}/read`, { method: "PATCH" });
      setUnread(data.unreadCount ?? 0);
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    setLoading(true);
    try {
      await api("/api/notifications/read-all", { method: "POST" });
      setUnread(0);
      setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    } finally {
      setLoading(false);
    }
  }

  const ariaLabel =
    unread > 0
      ? `${t("portal.notifBell")}, ${t("portal.notifAriaUnread").replace("{n}", String(unread))}`
      : t("portal.notifBell");

  return (
    <div className="notif-wrap" ref={wrapRef}>
      <button
        type="button"
        className="notif-bell"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={ariaLabel}
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
      >
        <span className="notif-bell-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </span>
        {unread > 0 && <span className="notif-badge">{unread > 99 ? "99+" : unread}</span>}
      </button>
      {open && (
        <div className="notif-panel" role="dialog" aria-label={t("portal.notifBell")}>
          <div className="notif-panel-head">
            <strong>{t("portal.notifBell")}</strong>
            {unread > 0 && (
              <button type="button" className="btn small ghost" disabled={loading} onClick={markAllRead}>
                {t("portal.notifMarkAll")}
              </button>
            )}
          </div>
          <ul className="notif-list">
            {!items.length ? (
              <li className="notif-empty muted">{t("portal.notifEmpty")}</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    className={`notif-item ${n.read ? "read" : "unread"}`}
                    onClick={() => !n.read && markRead(n.id)}
                  >
                    <span className="notif-msg">{n.message}</span>
                    <span className="notif-time muted small">{formatTime(n.createdAt)}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
