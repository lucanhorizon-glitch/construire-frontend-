"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export type PermissionState = "default" | "granted" | "denied" | "unsupported";

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes.buffer;
}

export function usePushNotifications() {
  const [permission, setPermission] = useState<PermissionState>("default");
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);

  // Sync state with the browser's current permission
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) {
      setPermission("unsupported");
      return;
    }
    setPermission(Notification.permission as PermissionState);
  }, []);

  // Check for existing SW subscription on mount
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((reg) =>
      reg.pushManager.getSubscription().then((sub) => {
        if (sub) setSubscription(sub);
      })
    );
  }, []);

  const subscribe = useCallback(async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setLoading(true);
    try {
      // 1. Ask permission
      const result = await Notification.requestPermission();
      setPermission(result as PermissionState);
      if (result !== "granted") return;

      // 2. Fetch VAPID public key from backend
      const { public_key } = await api.get<{ public_key: string }>("/push/vapid-public-key");

      // 3. Register with push service
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(public_key),
      });
      setSubscription(sub);

      // 4. Save subscription on backend
      const json = sub.toJSON();
      await api.post("/push/subscribe", {
        endpoint: sub.endpoint,
        keys: {
          p256dh: json.keys?.p256dh,
          auth: json.keys?.auth,
        },
      });
    } catch (err) {
      console.error("[push] subscribe error", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const unsubscribe = useCallback(async () => {
    if (!subscription) return;
    setLoading(true);
    try {
      await api.delete("/push/unsubscribe");
      await subscription.unsubscribe();
      setSubscription(null);
      setPermission("default");
    } catch (err) {
      console.error("[push] unsubscribe error", err);
    } finally {
      setLoading(false);
    }
  }, [subscription]);

  return { permission, loading, subscription, subscribe, unsubscribe };
}
