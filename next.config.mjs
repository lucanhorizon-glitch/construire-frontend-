import withPWA from "next-pwa";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  allowedDevOrigins: ["192.168.1.126"],
  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "192.168.1.126:3000",
        "192.168.1.126:3001",
      ],
    },
  },
};

export default withPWA({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: "/offline",
  },
  customWorkerDir: "worker",
  runtimeCaching: [
    // API — NetworkFirst: serve fresh, fall back to cache if offline
    {
      urlPattern: /^https?:\/\/localhost:8000\/api\/.*/i,
      handler: "NetworkFirst",
      options: {
        cacheName: "api-cache",
        expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 },
        networkTimeoutSeconds: 10,
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Next.js static assets (_next/static) — CacheFirst
    {
      urlPattern: /^\/_next\/static\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "next-static",
        expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Next.js image optimisation (_next/image) — StaleWhileRevalidate
    {
      urlPattern: /^\/_next\/image\?.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "next-image",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 7 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Uploaded documents / images served from storage — StaleWhileRevalidate
    {
      urlPattern: /^https?:\/\/localhost:8000\/storage\/.*/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "user-images",
        expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // App icons & manifest — CacheFirst
    {
      urlPattern: /\.(png|jpg|jpeg|svg|ico|webp)$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "static-images",
        expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 * 30 },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
})(nextConfig);
