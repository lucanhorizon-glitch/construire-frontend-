"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ConstructeurRedirectLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  useEffect(() => { router.replace("/pro"); }, [router]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  void children;
  return null;
}
