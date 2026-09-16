'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  sendAiChat,
  getAiConversations,
  deleteAiConversation,
  startSocraticSession,
  respondSocratic,
  endSocraticSession,
  getAccessToken,
} from '@/lib';
import type { AiConversation } from '@/lib';
import StandardChat from '@/components/StandardChat';
import SocraticChat from '@/components/SocraticChat';
import { Spinner } from '@/components';
import styles from './page.module.scss';

type Mode = 'standard' | 'socratic';

export default function ReasoningPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [mode, setMode] = useState<Mode>('standard');
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [convsLoading, setConvsLoading] = useState(true);
  const [initialQuery, setInitialQuery] = useState('');

  useEffect(() => {
    const t = getAccessToken();
    if (!t) {
      router.replace('/login');
      return;
    }
    setToken(t);
    void loadConversations(t);
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') ?? '';
    if (q) setInitialQuery(q);

    // Activity entries link here with the conversation to reopen.
    const session = params.get('session');
    if (session) setActiveSessionId(session);
    if (params.get('mode') === 'socratic') setMode('socratic');
  }, [router]);

  async function loadConversations(t: string) {
    setConvsLoading(true);
    try {
      const res = await getAiConversations(t, { limit: 30 });
      const raw = res.data;
      const list = Array.isArray(raw) ? raw : (raw?.data ?? []);
      setConversations(list);
    } catch {
      /* silent */
    } finally {
      setConvsLoading(false);
    }
  }

  async function handleDeleteConv(sessionId: string) {
    if (!token || !confirm('Delete this conversation?')) return;
    try {
      await deleteAiConversation(sessionId, token);
      setConversations((prev) => prev.filter((c) => c.sessionId !== sessionId));
      if (activeSessionId === sessionId) setActiveSessionId(undefined);
    } catch {
      /* silent */
    }
  }

  if (!token) {
    return (
      <div
        className={styles.page}
        style={{ display: 'grid', placeItems: 'center', minHeight: 240 }}
      >
        <Spinner size={28} />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Chat history only — branding/profile live in the dashboard shell */}
      <div className={styles.sidebar}>
        <p className={styles.chatHistoryLabel}>Chat history</p>

        <button className={styles.newConvBtn} onClick={() => setActiveSessionId(undefined)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M12 5v14M5 12h14"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
          New conversation
        </button>

        <hr className={styles.sidebarDivider} />

        <div className={styles.convList}>
          {convsLoading ? (
            <div className={styles.convEmpty}>
              <Spinner size={18} />
            </div>
          ) : conversations.length === 0 ? (
            <p className={styles.convEmpty}>No conversations yet.</p>
          ) : (
            conversations.map((c) => (
              <div
                key={c.sessionId}
                className={`${styles.convItem} ${activeSessionId === c.sessionId ? styles.convItemActive : ''}`}
              >
                <button className={styles.convBtn} onClick={() => setActiveSessionId(c.sessionId)}>
                  <span className={styles.convTitle}>{c.title ?? 'Chat'}</span>
                  <span className={styles.convMeta}>
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  className={styles.delConvBtn}
                  onClick={() => handleDeleteConv(c.sessionId)}
                  aria-label="Delete conversation"
                  title="Delete"
                >
                  ✕
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.mainTopBar}>
          <div className={styles.modePills}>
            <button
              className={`${styles.modePill} ${mode === 'standard' ? styles.modePillActive : ''}`}
              onClick={() => setMode('standard')}
              title="Ask Legal AI for direct answers and explanations"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M13 2L3 14h9l-1 8 10-12h-9l1-8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              Standard
            </button>
            <button
              className={`${styles.modePill} ${mode === 'socratic' ? styles.modePillActive : ''}`}
              onClick={() => setMode('socratic')}
              title="Guided Q&A that coaches you toward the answer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M12 2a7 7 0 0 1 7 7c0 2.7-1.52 5.05-3.75 6.28L15 21H9l.75-5.72A7 7 0 0 1 5 9a7 7 0 0 1 7-7Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
              </svg>
              Socratic
            </button>
          </div>
        </div>

        <aside className={styles.modeInfo} aria-live="polite">
          {mode === 'standard' ? (
            <>
              <strong>Standard</strong> gives direct explanations (concepts, cases, statutes). Ask a
              full question for the best answer.
            </>
          ) : (
            <>
              <strong>Socratic</strong> coaches you with follow-up questions instead of dumping the
              full answer at once.
            </>
          )}
        </aside>

        {mode === 'standard' ? (
          <StandardChat
            token={token}
            sessionId={activeSessionId}
            initialMessage={initialQuery || undefined}
            onInitialMessageConsumed={() => {
              setInitialQuery('');
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                if (url.searchParams.has('q')) {
                  url.searchParams.delete('q');
                  window.history.replaceState({}, '', url.pathname + url.search);
                }
              }
            }}
            onSessionStart={(sid, title) => {
              setActiveSessionId(sid);
              setConversations((prev) => {
                if (prev.some((c) => c.sessionId === sid)) return prev;
                return [
                  {
                    sessionId: sid,
                    title: title || 'Chat',
                    messageCount: 1,
                    createdAt: new Date().toISOString(),
                  },
                  ...prev,
                ];
              });
              void loadConversations(token);
            }}
            sendAiChat={sendAiChat}
          />
        ) : (
          <SocraticChat
            token={token}
            resumeSessionId={activeSessionId}
            startSocraticSession={startSocraticSession}
            respondSocratic={respondSocratic}
            endSocraticSession={endSocraticSession}
          />
        )}
      </main>
    </div>
  );
}
