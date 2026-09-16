'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDashboardActivity, getAccessToken } from '@/lib';
import type { SubjectMastery, ActivityItem, Achievement } from '@/lib/types';
import { Shimmer } from '@/components';
import styles from './DashboardLower.module.scss';

interface Props {
  mastery: SubjectMastery[];
  earnedBadges: Achievement[];
  reasoningScore: number | null;
  onViewHistory?: () => void;
}

export default function DashboardLower({
  mastery,
  earnedBadges,
  reasoningScore,
  onViewHistory,
}: Props) {
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setActivityLoading(false);
      return;
    }
    void (async () => {
      try {
        const res = await getDashboardActivity(token, { limit: 5 });
        setActivity(Array.isArray(res.data) ? res.data : []);
      } catch {
        // leave empty
      } finally {
        setActivityLoading(false);
      }
    })();
  }, []);

  return (
    <>
      {/* Reasoning score + achievements strip */}
      {(reasoningScore !== null || earnedBadges.length > 0) && (
        <div className={styles.statsStrip}>
          {reasoningScore !== null && (
            <div className={styles.statPill}>
              <span className={styles.statPillValue}>{reasoningScore}</span>
              <span className={styles.statPillLabel}>Reasoning Score</span>
            </div>
          )}
          {earnedBadges.length > 0 && (
            <div className={styles.statPill}>
              <span className={styles.statPillValue}>{earnedBadges.length}</span>
              <span className={styles.statPillLabel}>Badges Earned</span>
            </div>
          )}
          {earnedBadges.slice(0, 4).map((b) => (
            <span key={b.id} className={styles.badge} title={b.name}>
              {b.category === 'streak'
                ? '🔥'
                : b.category === 'quiz'
                  ? '📝'
                  : b.category === 'research'
                    ? '🔍'
                    : b.category === 'special'
                      ? '⭐'
                      : '🏅'}
            </span>
          ))}
          {earnedBadges.length > 4 && (
            <span className={styles.badgeMore}>+{earnedBadges.length - 4} more</span>
          )}
        </div>
      )}

      <div className={styles.lowerGrid}>
        <section className={styles.masteryCard}>
          <div className={styles.masteryHeader}>
            <span className={styles.cardTitle}>Subject Mastery</span>
          </div>
          {mastery.length > 0 ? (
            <div className={styles.masteryList}>
              {mastery.map(({ subject, score }) => (
                <div key={subject} className={styles.masteryRow}>
                  <span className={styles.masteryName}>{subject}</span>
                  <div className={styles.masteryTrack}>
                    <div
                      className={styles.masteryFill}
                      style={{ ['--pct' as string]: `${Math.min(100, score)}%` }}
                    />
                  </div>
                  <span className={styles.masteryPct}>{Math.min(100, score)}%</span>
                </div>
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <p>Complete quizzes to see your subject mastery.</p>
              <Link href="/dashboard/reasoning" className={styles.historyBtn}>
                Start a quiz →
              </Link>
            </div>
          )}
        </section>

        <section className={styles.notesCard}>
          <div className={styles.notesHeader}>
            <span className={styles.cardTitle}>Recent Activity</span>
          </div>
          {activityLoading ? (
            <ul className={styles.notesList}>
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className={styles.noteItem}>
                  <div className={styles.noteIcon} aria-hidden="true">
                    <Shimmer width={24} height={24} radius={6} />
                  </div>
                  <div className={styles.noteBody}>
                    <Shimmer height={13} width="65%" radius={5} />
                    <div style={{ height: 4 }} />
                    <Shimmer height={11} width="40%" radius={4} />
                  </div>
                </li>
              ))}
            </ul>
          ) : activity.length > 0 ? (
            <ul className={styles.notesList}>
              {activity.slice(0, 5).map((item) => {
                const body = (
                  <>
                    <div
                      className={`${styles.noteIcon} ${item.type === 'case' ? styles.noteIconCase : styles.noteIconDoc}`}
                      aria-hidden="true"
                    >
                      {item.type === 'case' ? '⚖' : item.type === 'quiz' ? '📝' : '💬'}
                    </div>
                    <div className={styles.noteBody}>
                      <p className={styles.noteTitle}>{item.title || 'Untitled'}</p>
                      <p className={styles.noteMeta}>
                        {item.subtitle ? `${item.subtitle} · ` : ''}
                        {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    {item.link && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M9 18l6-6-6-6"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </>
                );

                return (
                  <li key={item._id} className={styles.noteItem}>
                    {item.link ? (
                      <Link href={item.link} className={styles.noteLink}>
                        {body}
                      </Link>
                    ) : (
                      <div className={styles.noteStatic}>{body}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className={styles.emptyState}>
              <p>No recent activity yet. Ask AI, explain a case, or take a quiz to get started.</p>
              <Link href="/dashboard/ai" className={styles.historyBtn}>
                Ask Legal AI →
              </Link>
            </div>
          )}
          <div className={styles.noteFooter}>
            <Link href="/dashboard/notes" className={styles.historyBtn}>
              View all notes →
            </Link>
            <button type="button" className={styles.viewHistoryBtn} onClick={onViewHistory}>
              View Activity History
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
