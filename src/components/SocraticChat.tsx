'use client';

import { useEffect, useRef, useState } from 'react';
import { getAiConversation, getFetchErrorMessage, useTypewriter } from '@/lib';
import type {
  SocraticStartRequest,
  SocraticStartResponse,
  SocraticRespondRequest,
  ApiResponse,
} from '@/lib';
import { Spinner } from '@/components';
import styles from './SocraticChat.module.scss';

interface SocMsg {
  role: 'ai' | 'user';
  text: string;
}

interface Props {
  token: string;
  /** When set, the component resumes this saved session instead of starting fresh. */
  resumeSessionId?: string;
  startSocraticSession: (
    data: SocraticStartRequest,
    token: string
  ) => Promise<ApiResponse<SocraticStartResponse>>;
  respondSocratic: (
    data: SocraticRespondRequest,
    token: string
  ) => Promise<ApiResponse<{ aiResponse: string; hintsUsed: number }>>;
  endSocraticSession: (
    sessionId: string,
    token: string
  ) => Promise<ApiResponse<{ summary: string; score: number }>>;
}

/** Renders the last AI message with typewriter effect; all others show instantly. */
function AiBubble({ text, isLatest }: { text: string; isLatest: boolean }) {
  const { displayed } = useTypewriter(isLatest ? text : '', 8, 12);
  const shown = isLatest ? displayed : text;
  return (
    <p className={styles.bubbleText}>
      {shown}
      {isLatest && displayed.length < text.length && (
        <span className={styles.cursor} aria-hidden="true" />
      )}
    </p>
  );
}

export default function SocraticChat({
  token,
  resumeSessionId,
  startSocraticSession,
  respondSocratic,
  endSocraticSession,
}: Props) {
  const [phase, setPhase] = useState<'setup' | 'active' | 'ended'>('setup');
  const [resuming, setResuming] = useState(false);
  const [topic, setTopic] = useState('');
  const [subject, setSubject] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState<SocMsg[]>([]);
  const [latestAiIdx, setLatestAiIdx] = useState(-1);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [endSummary, setEndSummary] = useState<{ summary: string; score: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Resume a saved session: pull its transcript and drop straight into the
  // active phase instead of showing the topic-setup form.
  useEffect(() => {
    if (!resumeSessionId || !token) return;
    let cancelled = false;

    setResuming(true);
    setError('');
    void (async () => {
      try {
        const res = await getAiConversation(resumeSessionId, token);
        if (cancelled) return;
        const convo = res.data;
        const stored = (convo?.messages ?? []).map((m) => ({
          role: m.role === 'assistant' ? ('ai' as const) : ('user' as const),
          text: m.content,
        }));

        setSessionId(resumeSessionId);
        setTopic((convo?.topic ?? convo?.title ?? '').replace(/^Socratic:\s*/, ''));
        setMessages(stored);
        setLatestAiIdx(stored.map((m) => m.role).lastIndexOf('ai'));
        setPhase('active');
      } catch (err) {
        if (!cancelled) setError(getFetchErrorMessage(err));
      } finally {
        if (!cancelled) setResuming(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [resumeSessionId, token]);

  function scrollBottom() {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    if (!topic.trim()) return;
    setBusy(true);
    setError('');
    try {
      const res = await startSocraticSession(
        { topic: topic.trim(), subject: subject.trim() || undefined },
        token
      );
      if (res.data) {
        setSessionId(res.data.sessionId);
        // backend returns `question` (fixed in controller)
        const aiText = res.data.question;
        setMessages([{ role: 'ai', text: aiText }]);
        setLatestAiIdx(0);
        setPhase('active');
        scrollBottom();
      } else {
        setError(res.message ?? 'Could not start session');
      }
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRespond(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;
    const updatedMsgs: SocMsg[] = [...messages, { role: 'user', text }];
    setMessages(updatedMsgs);
    setInput('');
    setBusy(true);
    setError('');
    scrollBottom();
    try {
      const res = await respondSocratic({ sessionId, response: text, message: text }, token);
      if (res.data) {
        // backend field is `aiResponse`
        const aiText = res.data.aiResponse;
        const newMsgs: SocMsg[] = [...updatedMsgs, { role: 'ai', text: aiText }];
        setMessages(newMsgs);
        setLatestAiIdx(newMsgs.length - 1);
        scrollBottom();
      } else {
        setError(res.message ?? 'No response');
      }
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleEnd() {
    if (!sessionId || !confirm('End this session and get your score?')) return;
    setBusy(true);
    try {
      const res = await endSocraticSession(sessionId, token);
      if (res.data) {
        const raw = res.data as {
          summary: string;
          score?: number;
          understanding?: number;
        };
        setEndSummary({
          summary: raw.summary,
          score: typeof raw.score === 'number' ? raw.score : (raw.understanding ?? 0),
        });
        setPhase('ended');
      }
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (phase === 'setup') {
    return (
      <div className={styles.setup}>
        <h2 className={styles.setupTitle}>Start a Socratic Session</h2>
        <p className={styles.setupSub}>
          Choose a topic and I&apos;ll guide you through it with questions.
        </p>
        <form onSubmit={handleStart} className={styles.setupForm}>
          <input
            className={styles.setupInput}
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic (e.g. Offer and Acceptance)"
          />
          <input
            className={styles.setupInput}
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Subject (optional, e.g. Contract Law)"
          />
          {error && <p className={styles.error}>{error}</p>}
          <button type="submit" className={styles.startBtn} disabled={busy || !topic.trim()}>
            {busy ? (
              <span className={styles.btnLoading}>
                <Spinner size={15} light /> Starting…
              </span>
            ) : (
              'Start Session'
            )}
          </button>
        </form>
      </div>
    );
  }

  if (phase === 'ended' && endSummary) {
    return (
      <div className={styles.summary}>
        <div className={styles.scoreCircle}>{endSummary.score}</div>
        <h2 className={styles.summaryTitle}>Session Complete</h2>
        <p className={styles.summaryText}>{endSummary.summary}</p>
        <button
          className={styles.restartBtn}
          onClick={() => {
            setPhase('setup');
            setMessages([]);
            setEndSummary(null);
            setTopic('');
            setLatestAiIdx(-1);
          }}
        >
          Start New Session
        </button>
      </div>
    );
  }

  return (
    <div className={styles.chat}>
      <div className={styles.messages}>
        {messages.map((m, i) => (
          <div
            key={i}
            className={`${styles.bubble} ${m.role === 'user' ? styles.bubbleUser : styles.bubbleAI}`}
          >
            {m.role === 'ai' ? (
              <AiBubble text={m.text} isLatest={i === latestAiIdx} />
            ) : (
              <p className={styles.bubbleText}>{m.text}</p>
            )}
          </div>
        ))}
        {busy && (
          <div className={`${styles.bubble} ${styles.bubbleAI}`}>
            <span className={styles.typingDots} aria-live="polite">
              <span />
              <span />
              <span />
            </span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <div className={styles.inputArea}>
        <form className={styles.inputRow} onSubmit={handleRespond}>
          <input
            className={styles.msgInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Your answer…"
            disabled={busy}
          />
          <button type="submit" className={styles.sendBtn} disabled={busy || !input.trim()}>
            Send
          </button>
        </form>
        <button className={styles.endBtn} onClick={handleEnd} disabled={busy}>
          End Session
        </button>
      </div>
    </div>
  );
}
