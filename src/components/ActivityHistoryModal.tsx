'use client';
import { useEffect, useState } from 'react';
import { getDashboardActivity, getAccessToken } from '@/lib';
import type { ActivityItem, DashboardData } from '@/lib';
import { Spinner, Shimmer } from '@/components';
import mStyles from './ActivityHistoryModal.module.scss';
import Link from 'next/link';
import lStyles from './ActivityList.module.scss';
const styles = { ...mStyles, ...lStyles };

type FilterTab = 'All' | 'Quizzes' | 'AI Sessions' | 'Document';

// Maps tab label → API type values that belong to it
const FILTER_TYPES: Record<FilterTab, string[]> = {
  All: [],
  Quizzes: ['quiz'],
  'AI Sessions': ['ai_session', 'socratic'],
  Document: ['case', 'document'],
};

interface Props {
  data: DashboardData | null;
  onClose: () => void;
}

export default function ActivityHistoryModal({ data, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('All');
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const FILTERS: FilterTab[] = ['All', 'Quizzes', 'AI Sessions', 'Document'];

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await getDashboardActivity(token, { limit: 50 });
        // API: { success, data: ActivityItem[], meta: {...} }
        const raw = Array.isArray(res.data) ? res.data : [];
        setItems(raw as ActivityItem[]);
      } catch {
        // leave empty
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = items.filter((item) => {
    const matchesSearch =
      !search ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.subtitle.toLowerCase().includes(search.toLowerCase());
    const allowed = FILTER_TYPES[activeFilter];
    const matchesFilter = allowed.length === 0 || allowed.includes(item.type);
    return matchesSearch && matchesFilter;
  });

  // Stats derived from fetched items
  const quizzesCompleted = items.filter((i) => i.type === 'quiz').length;
  const mastery = Array.isArray(data?.subjectMastery) ? data.subjectMastery : [];
  const topSubject = mastery[0]?.subject ?? '—';
  // Estimate hours at 1.5h/day across the last 7 days of the streak.
  const streakDays = data?.streak?.current ?? 0;
  const weeklyHours = (Math.min(streakDays, 7) * 1.5).toFixed(1);

  return (
    <div className={styles.overlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>Activity History</h2>
            <p className={styles.subtitle}>Track your learning journey and mastery levels</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
              <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <p className={styles.statLabel}>Weekly study hours</p>
            <p className={styles.statValue}>
              {weeklyHours} <span className={styles.statUnit}>hrs</span>
            </p>
          </div>
          <div className={styles.statCard}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 3 2-7L2 9h7l3-7z"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinejoin="round"
              />
            </svg>
            <p className={styles.statLabel}>Top Subject</p>
            <p className={styles.statValue}>{topSubject}</p>
            {topSubject !== '—' && <span className={styles.topBadge}>Top performer</span>}
          </div>
          <div className={styles.statCard}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
              <rect
                x="9"
                y="3"
                width="6"
                height="4"
                rx="1"
                stroke="currentColor"
                strokeWidth="1.8"
              />
            </svg>
            <p className={styles.statLabel}>Quizzes Completed</p>
            <p className={styles.statValue}>{loading ? '—' : quizzesCompleted}</p>
          </div>
        </div>

        <div className={styles.filterBar}>
          <div className={styles.searchWrap}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle cx="11" cy="11" r="8" stroke="currentColor" strokeWidth="1.8" />
              <path
                d="M21 21l-4.35-4.35"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            <input
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search activities, topic, quiz...."
            />
          </div>
          <div className={styles.filterTabs}>
            {FILTERS.map((f) => (
              <button
                key={f}
                type="button"
                className={`${styles.filterTab} ${activeFilter === f ? styles.filterTabActive : ''}`}
                onClick={() => setActiveFilter(f)}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <ul className={styles.activityList}>
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <li key={i} className={styles.activityItem}>
                <div className={styles.activityIcon} aria-hidden="true">
                  <Shimmer width={32} height={32} radius={8} />
                </div>
                <div className={styles.activityBody}>
                  <Shimmer height={13} width="55%" radius={5} />
                  <div style={{ height: 5 }} />
                  <Shimmer height={11} width="35%" radius={4} />
                </div>
              </li>
            ))
          ) : filtered.length === 0 ? (
            <li className={styles.emptyItem}>No activity found.</li>
          ) : (
            filtered.map((item) => {
              const body = (
                <>
                  <div className={styles.activityIcon} aria-hidden="true">
                    <ActivityIcon type={item.type} />
                  </div>
                  <div className={styles.activityBody}>
                    <p className={styles.activityTitle}>{item.title || 'Untitled'}</p>
                    <p className={styles.activityMeta}>
                      {item.createdAt
                        ? `${new Date(item.createdAt).toLocaleDateString()}`
                        : 'Recently'}{' '}
                      · {item.subtitle || typeLabel(item.type)}
                    </p>
                  </div>
                  {item.link && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path
                        d="M9 18l6-6-6-6"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </>
              );

              return (
                <li key={item._id} className={styles.activityItem}>
                  {item.link ? (
                    <Link href={item.link} className={styles.activityLink} onClick={onClose}>
                      {body}
                    </Link>
                  ) : (
                    <div className={styles.activityStatic}>{body}</div>
                  )}
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
}

function typeLabel(type: string): string {
  if (type === 'quiz') return 'Quiz';
  if (type === 'case') return 'Case analysis';
  if (type === 'ai_session') return 'AI session';
  if (type === 'socratic') return 'Socratic chat';
  return 'Activity';
}

function ActivityIcon({ type }: { type: string }) {
  if (type === 'quiz') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
        />
        <rect x="9" y="3" width="6" height="4" rx="1" stroke="currentColor" strokeWidth="1.8" />
        <path d="M9 12h6M9 16h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === 'ai_session' || type === 'socratic') {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  // case / document / default
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}
