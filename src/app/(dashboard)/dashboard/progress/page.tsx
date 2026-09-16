'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getDashboard,
  getAchievements,
  getReasoningScore,
  getQuestionStats,
  getAccessToken,
  getFetchErrorMessage,
} from '@/lib';
import type {
  DashboardData,
  AchievementsData,
  ReasoningScoreData,
  QuestionStats,
  Goal,
  SubjectMastery,
} from '@/lib';
import { ShimmerCard } from '@/components';
import styles from './page.module.scss';

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function buildCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

function getStudiedDays(lastStudyDate?: string, streak = 0): Set<number> {
  const studied = new Set<number>();
  if (!lastStudyDate || streak <= 0) return studied;
  const last = new Date(lastStudyDate);
  const now = new Date();
  if (last.getMonth() !== now.getMonth() || last.getFullYear() !== now.getFullYear())
    return studied;
  for (let i = 0; i < streak && i < last.getDate(); i++) {
    studied.add(last.getDate() - i);
  }
  return studied;
}

function ScoreDonut({ score, max = 100 }: { score: number; max?: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(score / max, 1);
  const offset = circ - pct * circ;
  return (
    <div className={styles.donutWrap}>
      <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden="true">
        <circle cx="70" cy="70" r={r} fill="none" stroke="#F3F4F6" strokeWidth="12" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#d97706"
          strokeWidth="12"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 70 70)"
        />
      </svg>
      <div className={styles.donutInner}>
        <span className={styles.donutScore}>{score}</span>
        <span className={styles.donutMax}>/{max}</span>
      </div>
    </div>
  );
}

function SubScore({ label, value, max = 50 }: { label: string; value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className={styles.subScore}>
      <div className={styles.subScoreTop}>
        <span className={styles.subScoreLabel}>{label}</span>
        <span className={styles.subScoreVal}>{value}</span>
      </div>
      <div className={styles.subScoreTrack}>
        <div className={styles.subScoreFill} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function BadgeIcon({ category }: { category: string }) {
  if (category === 'streak')
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#d97706" />
      </svg>
    );
  if (category === 'quiz')
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="#16a34a" />
        <path
          d="M8 12l3 3 5-5"
          stroke="#fff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="#2563eb" />
      <path d="M12 7v5l3 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function AchievementBadge({
  name,
  category,
  value,
}: {
  name: string;
  category: string;
  value?: string;
}) {
  return (
    <div className={styles.badge}>
      <div className={styles.badgeIcon}>
        <BadgeIcon category={category} />
      </div>
      <div className={styles.badgeInfo}>
        <p className={styles.badgeName}>{name}</p>
        {value && <p className={styles.badgeVal}>{value}</p>}
      </div>
    </div>
  );
}

function StudyCalendar({ streak, lastStudyDate }: { streak: number; lastStudyDate?: string }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const cells = buildCalendarDays(year, month);
  const studied = getStudiedDays(lastStudyDate, streak);
  const today = now.getDate();

  return (
    <div className={styles.calendar}>
      <div className={styles.calHeader}>
        <span className={styles.calTitle}>
          {MONTH_NAMES[month]} {year}
        </span>
        <span className={styles.calStreak}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="#d97706" />
          </svg>
          {streak} day streak
        </span>
      </div>
      <div className={styles.calGrid}>
        {DAY_LABELS.map((d) => (
          <div key={d} className={styles.calDayLabel}>
            {d}
          </div>
        ))}
        {cells.map((day, i) => (
          <div
            key={i}
            className={[
              styles.calCell,
              day === null ? styles.calEmpty : '',
              day !== null && studied.has(day) ? styles.calStudied : '',
              day === today ? styles.calToday : '',
            ].join(' ')}
          >
            {day ?? ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function MasteryBar({ subject, score }: SubjectMastery) {
  const color = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#9ca3af';
  return (
    <div className={styles.masteryRow}>
      <div className={styles.masteryTop}>
        <span className={styles.masterySubject}>{subject}</span>
        <span className={styles.masteryPct} style={{ color }}>
          {score}%
        </span>
      </div>
      <div className={styles.masteryTrack}>
        <div className={styles.masteryFill} style={{ width: `${score}%`, background: color }} />
      </div>
    </div>
  );
}

function GoalCard({ goal }: { goal: Goal }) {
  const pct = Math.min(Math.round((goal.currentValue / goal.targetValue) * 100), 100);
  const done = goal.isCompleted || pct >= 100;
  const label = done ? 'Completed' : pct >= 50 ? 'In Progress' : 'Start Soon';
  const btnClass = done
    ? styles.goalBtnDone
    : pct >= 50
      ? styles.goalBtnProgress
      : styles.goalBtnStart;

  return (
    <div className={styles.goalCard}>
      <div className={styles.goalInfo}>
        <p className={styles.goalTitle}>{goal.title}</p>
        {goal.description && <p className={styles.goalDesc}>{goal.description}</p>}
        <div className={styles.goalTrack}>
          <div className={styles.goalFill} style={{ width: `${pct}%` }} />
        </div>
        <p className={styles.goalMeta}>
          {goal.currentValue} / {goal.targetValue} {goal.unit}
        </p>
      </div>
      {/* Status, not an action — rendered as a label so it does not invite a click. */}
      <span className={`${styles.goalBtn} ${btnClass}`}>{label}</span>
    </div>
  );
}

const FALLBACK_SUBJECTS: SubjectMastery[] = [
  { subject: 'Constitutional Law', score: 82 },
  { subject: 'Evidence Law', score: 45 },
  { subject: 'Criminal Law', score: 91 },
  { subject: 'Commercial Law', score: 28 },
  { subject: 'Family Law', score: 67 },
  { subject: 'Environmental Law', score: 73 },
];

const FALLBACK_GOALS: Goal[] = [
  {
    id: '1',
    title: 'Complete 10 reasoning questions',
    targetValue: 10,
    currentValue: 6,
    unit: 'questions',
    isCompleted: false,
  },
  {
    id: '2',
    title: 'Study for 30 minutes daily',
    targetValue: 30,
    currentValue: 18,
    unit: 'min',
    isCompleted: false,
  },
  {
    id: '3',
    title: 'Read 5 case analyses',
    targetValue: 5,
    currentValue: 1,
    unit: 'cases',
    isCompleted: false,
  },
];

export default function ProgressPage() {
  const router = useRouter();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [achievements, setAchievements] = useState<AchievementsData | null>(null);
  const [reasoningScore, setReasoningScore] = useState<ReasoningScoreData | null>(null);
  const [questionStats, setQuestionStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (t: string) => {
    setLoading(true);
    setError('');
    try {
      const [dashRes, achRes, rsRes, qsRes] = await Promise.allSettled([
        getDashboard(t),
        getAchievements(t),
        getReasoningScore(t),
        getQuestionStats(t),
      ]);
      if (dashRes.status === 'fulfilled' && dashRes.value.data) setDashboard(dashRes.value.data);
      if (achRes.status === 'fulfilled' && achRes.value.data) setAchievements(achRes.value.data);
      if (rsRes.status === 'fulfilled' && rsRes.value.data) setReasoningScore(rsRes.value.data);
      if (qsRes.status === 'fulfilled' && qsRes.value.data) setQuestionStats(qsRes.value.data);
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = getAccessToken();
    if (!t) {
      router.replace('/login');
      return;
    }
    void load(t);
  }, [router, load]);

  const streak = achievements?.currentStreak ?? dashboard?.streak?.current ?? 0;
  const lastStudy = dashboard?.lastStudyDate;
  const latestScore = reasoningScore?.latest?.overall ?? 10;
  const goals: Goal[] = dashboard?.activeGoals ?? FALLBACK_GOALS;

  const subjectList: SubjectMastery[] = (() => {
    if (Array.isArray(dashboard?.subjectMastery) && dashboard.subjectMastery.length > 0)
      return dashboard.subjectMastery;
    if (questionStats?.subjectBreakdown) {
      return Object.entries(questionStats.subjectBreakdown).map(([subject, d]) => ({
        subject,
        score: Math.round(d.averageScore),
      }));
    }
    return FALLBACK_SUBJECTS;
  })();

  const badges = achievements?.badges ?? [];

  const issueScore = Math.round(latestScore * 0.33);
  const ruleScore = Math.round(latestScore * 0.37);
  const analysisScore = Math.round(latestScore * 0.3);

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <div>
          <h1 className={styles.pageTitle}>Your Progress</h1>
          <p className={styles.pageSub}>Track your legal reasoning development and study habits.</p>
        </div>
        <div className={styles.headerStats}>
          <div className={styles.headerStat}>
            <span className={styles.headerStatValue}>{questionStats?.totalAttempted ?? 0}</span>
            <span className={styles.headerStatLabel}>Questions Done</span>
          </div>
          <div className={styles.headerStatDivider} />
          <div className={styles.headerStat}>
            <span className={styles.headerStatValue}>{streak}</span>
            <span className={styles.headerStatLabel}>Day Streak</span>
          </div>
          <div className={styles.headerStatDivider} />
          <div className={styles.headerStat}>
            <span className={styles.headerStatValue}>
              {questionStats?.averageScore != null
                ? `${Math.round(questionStats.averageScore)}%`
                : latestScore}
            </span>
            <span className={styles.headerStatLabel}>Avg Score</span>
          </div>
        </div>
      </header>

      {error && (
        <p className={styles.errorMsg} role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <div className={styles.shimmerGrid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <ShimmerCard key={i} lines={4} />
          ))}
        </div>
      ) : (
        <div className={styles.content}>
          {/* LEFT COLUMN */}
          <div className={styles.left}>
            {/* Score card */}
            <div className={styles.scoreCard}>
              <p className={styles.scoreLabel}>Current legal reasoning score</p>
              <div className={styles.scoreBody}>
                <ScoreDonut score={latestScore} max={100} />
                <div className={styles.subScores}>
                  <SubScore label="Issue spotting" value={issueScore} max={40} />
                  <SubScore label="Rule Application" value={ruleScore} max={40} />
                  <SubScore label="Legal Analysis" value={analysisScore} max={40} />
                </div>
              </div>
            </div>

            {/* Achievements */}
            <div className={styles.achievementsCard}>
              <p className={styles.sectionLabel}>Achievements</p>
              <div className={styles.badgeRow}>
                {badges.length > 0 ? (
                  badges
                    .slice(0, 3)
                    .map((b) => <AchievementBadge key={b.id} name={b.name} category={b.category} />)
                ) : (
                  <>
                    <AchievementBadge
                      name="Streak Novice"
                      category="streak"
                      value={`${streak} days`}
                    />
                    <AchievementBadge name="Case Novice" category="quiz" value="12 cases" />
                    <AchievementBadge name="Reasoning Pro" category="learning" value="10+" />
                  </>
                )}
              </div>
            </div>

            {/* Calendar */}
            <StudyCalendar streak={streak} lastStudyDate={lastStudy} />
          </div>

          {/* RIGHT COLUMN */}
          <div className={styles.right}>
            {/* Subject mastery */}
            <div className={styles.masteryCard}>
              <p className={styles.sectionLabel}>Subject Mastery</p>
              <div className={styles.masteryList}>
                {subjectList.slice(0, 6).map((s) => (
                  <MasteryBar key={s.subject} {...s} />
                ))}
              </div>
            </div>

            {/* Study goals */}
            <div className={styles.goalsCard}>
              <p className={styles.sectionLabel}>Active Study Goals</p>
              <div className={styles.goalsList}>
                {goals.slice(0, 3).map((g) => (
                  <GoalCard key={g.id} goal={g} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
