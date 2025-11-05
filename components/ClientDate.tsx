'use client';

import { useState, useEffect } from 'react';

interface ClientDateProps {
  date: string | Date;
  format?: 'full' | 'date' | 'time' | 'relative';
}

export default function ClientDate({ date, format = 'full' }: ClientDateProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <span suppressHydrationWarning>...</span>;
  }

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (format === 'relative') {
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return <span>az önce</span>;
    if (diffMins < 60) return <span>{diffMins} dakika önce</span>;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return <span>{diffHours} saat önce</span>;
    
    const diffDays = Math.floor(diffHours / 24);
    return <span>{diffDays} gün önce</span>;
  }

  if (format === 'date') {
    return <span suppressHydrationWarning>{dateObj.toLocaleDateString('tr-TR')}</span>;
  }

  if (format === 'time') {
    return <span suppressHydrationWarning>{dateObj.toLocaleTimeString('tr-TR')}</span>;
  }

  return <span suppressHydrationWarning>{dateObj.toLocaleString('tr-TR')}</span>;
}

