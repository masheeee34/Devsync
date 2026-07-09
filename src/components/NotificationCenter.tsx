'use client';

import { useState, useEffect, useRef } from 'react';
import { AppNotification } from '@/types';
import { getStorageAdapter } from '@/lib/storage';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Subscribe to notifications
  useEffect(() => {
    const adapter = getStorageAdapter();
    const unsubscribe = adapter.subscribeNotifications((items) => {
      setNotifications(items);
    });

    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    return () => unsubscribe();
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = async () => {
    const adapter = getStorageAdapter();
    const promises = notifications
      .filter((n) => !n.isRead)
      .map((n) => adapter.saveNotification({ ...n, isRead: true }));
    await Promise.all(promises);
  };

  const handleMarkRead = async (notification: AppNotification) => {
    if (notification.isRead) return;
    const adapter = getStorageAdapter();
    await adapter.saveNotification({ ...notification, isRead: true });
  };

  const handleRequestPermission = async () => {
    if (!('Notification' in window)) return;
    const res = await Notification.requestPermission();
    setPermission(res);
    if (res === 'granted') {
      new Notification("DevSync", {
        body: "Les notifications système sont activées !",
        icon: "/icon-512x512.png"
      });
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative w-8 h-8 rounded-full bg-white border border-[#ECEAE3] flex items-center justify-center text-[#8C8A85] hover:text-[#1B1B1B] hover:bg-[#F7F5EF] transition-all cursor-pointer shadow-sm"
        aria-label="Centre de notifications"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#F2C94C] text-[8.5px] font-bold text-[#161616] border border-white animate-pulse">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notifications Dropdown (rounded-3xl Crextio style) */}
      {isOpen && (
        <div className="absolute right-0 mt-3.5 w-80 max-h-[400px] overflow-hidden card-light rounded-3xl shadow-lg z-50 flex flex-col animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="p-4 border-b border-[#ECEAE3] flex items-center justify-between bg-[#F7F5EF]">
            <span className="text-[10px] font-display uppercase tracking-wider text-[#1B1B1B] font-bold">
              Notifications ({unreadCount} non lues)
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[9px] font-mono uppercase tracking-wider text-[#8C8A85] hover:text-[#1B1B1B] hover:underline cursor-pointer"
              >
                Tout marquer lu
              </button>
            )}
          </div>

          <div className="overflow-y-auto flex-1 max-h-[300px]">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-[10px] font-mono uppercase tracking-wider text-[#8C8A85] bg-white">
                Aucune notification
              </div>
            ) : (
              <div className="flex flex-col bg-white">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkRead(n)}
                    className={`p-4 border-b border-[#ECEAE3] flex flex-col gap-1 transition-colors cursor-pointer text-left ${
                      n.isRead ? 'opacity-60 hover:bg-[#F7F5EF]/30' : 'bg-[#FBE7A1]/20 hover:bg-[#FBE7A1]/35'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-semibold text-[#1B1B1B]">{n.title}</span>
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F2C94C] shrink-0 mt-1.5"></span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#8C8A85] leading-relaxed">{n.message}</p>
                    <span className="text-[8px] font-mono text-[#8C8A85]/80 self-end mt-1">
                      {new Date(n.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Web Push Permission Banner */}
          {permission !== 'granted' && (
            <div className="p-4 bg-[#FBE7A1]/40 border-t border-[#ECEAE3] flex items-center justify-between gap-3">
              <span className="text-[9.5px] text-[#8C8A85] leading-normal font-semibold">
                Activer les notifications système ?
              </span>
              <button
                onClick={handleRequestPermission}
                className="px-3 py-1.5 rounded-full bg-[#161616] text-white text-[9px] font-mono uppercase font-bold shrink-0 hover:bg-black transition-colors cursor-pointer"
              >
                Activer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
