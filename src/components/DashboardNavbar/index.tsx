'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getAccessToken, getDashboard } from '@/lib';
import { SparklesIcon } from '../icons';
import styles from './DashboardNavbar.module.scss';

export default function DashboardNavbar() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    void getDashboard(token)
      .then((res) => setStreak(res.data?.streak?.current ?? 0))
      .catch(() => {
        /* streak is decorative — stay silent on failure */
      });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    router.push(q ? `/dashboard/ai?q=${encodeURIComponent(q)}` : '/dashboard/ai');
  };

  return (
    <header className={styles.navbar}>
      {/* Sidebar (and its logo) is hidden under 900px — restore brand here. */}
      <Link href="/dashboard" className={styles.mobileLogo}>
        <Image src="/logo.svg" alt="LegalErrand" width={132} height={30} priority />
      </Link>
      <form className={styles.searchBar} onSubmit={handleSearch}>
        <SparklesIcon size={18} className={styles.sparkleIcon} />
        <input
          type="text"
          placeholder="Ask LegalErrand AI Legal Question"
          className={styles.searchInput}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </form>
      <div className={styles.actions}>
        {streak > 0 && (
          <div className={styles.streakPill}>
            <span className={styles.fireIcon}>🔥</span>
            <span className={styles.streakText}>
              {streak} day{streak === 1 ? '' : 's'} streak
            </span>
          </div>
        )}
        <div className={styles.avatar}>
          <Image src="/icons/avatar.svg" alt="User" width={36} height={36} />
        </div>
      </div>
    </header>
  );
}
