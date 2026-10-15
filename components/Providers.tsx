'use client';
import type { ReactNode } from 'react';
import { PopupProvider } from './Popup';
import { AuthProvider } from '@/lib/auth';
import { StoreProvider } from '@/lib/store';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PopupProvider>
      <AuthProvider>
        <StoreProvider>{children}</StoreProvider>
      </AuthProvider>
    </PopupProvider>
  );
}
