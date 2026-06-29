'use client';

import { useEffect, useState } from 'react';

/**
 * Renders children only after the component has mounted on the client.
 *
 * This sidesteps hydration mismatches caused by browser extensions
 * (password managers, crypto wallets, etc.) that inject DOM nodes into
 * form fields — notably <input type="password"> — before React hydrates.
 * Such injection otherwise throws "Hydration failed..." which the App
 * Router surfaces as the global error boundary ("Something went wrong").
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return <>{mounted ? children : fallback}</>;
}
