'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getNote,
  updateNote,
  analyzeNote,
  summarizeNote,
  expandNote,
  getNoteTemplates,
  createNote,
  getFetchErrorMessage,
  getAccessToken,
  downloadNoteAsMarkdown,
} from '@/lib';
import type { Note, NoteTemplate } from '@/lib';
import TemplateForm from '@/components/TemplateForm';
import NoteAISidebar from '@/components/NoteAISidebar';
import { Spinner } from '@/components';
import { useNoteDraft } from '@/hooks/useNoteDraft';
import { useToast } from '@/hooks/useToast';
import styles from './page.module.scss';

export default function NoteWorkspacePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<Note | null>(null);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const [token, setToken] = useState('');
  const [pendingInsert, setPendingInsert] = useState<string | undefined>(undefined);
  const [draftRestored, setDraftRestored] = useState(false);

  const draft = useNoteDraft(id ?? '');
  const { addToast } = useToast();

  useEffect(() => {
    const t = getAccessToken();
    if (!t) {
      router.replace('/login');
      return;
    }
    setToken(t);
    if (!id) return;

    void Promise.all([
      getNote(id, t).then((res) => {
        if (res.data) {
          // Restore cached draft if it exists (user refreshed mid-edit)
          const cached = draft.read();
          if (cached) {
            setNote({ ...res.data, title: cached.title, content: cached.content });
            setDraftRestored(true);
          } else {
            setNote(res.data);
          }
        }
      }),
      getNoteTemplates(t).then((res) => setTemplates(res.data ?? [])),
    ])
      .catch((err) => setSaveErr(getFetchErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [router, id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = useCallback(
    async (title: string, content: string) => {
      if (!token || !id) return;
      setSaving(true);
      setSaveErr('');
      // Write to cache before the API call — if the request fails the draft survives
      draft.write(title, content);
      try {
        const res = await updateNote(id, { title, content }, token);
        if (res.data) {
          setNote(res.data);
          draft.clear();
          setDraftRestored(false);
          addToast('success', 'Note saved');
        }
      } catch (err) {
        const msg = getFetchErrorMessage(err);
        setSaveErr(msg);
        addToast('error', 'Save failed', msg);
      } finally {
        setSaving(false);
      }
    },
    [token, id, draft]
  );

  const handleAnalyze = useCallback(async () => {
    if (!token || !id) return null;
    const res = await analyzeNote(id, token);
    return res.data ?? null;
  }, [token, id]);

  const handleSummarize = useCallback(async () => {
    if (!token || !id) return null;
    const res = await summarizeNote(id, token);
    return res.data?.summary ?? null;
  }, [token, id]);

  const handleExpand = useCallback(async () => {
    if (!token || !id) return null;
    const res = await expandNote(id, token);
    return res.data?.expanded ?? null;
  }, [token, id]);

  const handleScoreChange = useCallback((score: number, feedback: string) => {
    setNote((prev) => (prev ? { ...prev, qualityScore: score, qualityFeedback: feedback } : prev));
  }, []);

  async function handleSwitchTemplate(tpl: NoteTemplate) {
    if (!token) return;
    try {
      const res = await createNote({ title: tpl.name, content: tpl.content }, token);
      if (res.data?.id) router.push(`/dashboard/notes/${res.data.id}`);
    } catch {
      // non-fatal
    }
  }

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <Spinner size={24} />
        </div>
      </div>
    );

  if (!note)
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <Spinner size={24} />
        </div>
      </div>
    );

  const activeTemplateId =
    templates.find(
      (t) =>
        note.title.toLowerCase().includes(t.name.toLowerCase()) ||
        t.name.toLowerCase().includes(note.title.toLowerCase())
    )?.id ?? null;

  const sidebarTemplates = templates.filter((t) => t.id !== 'blank');

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/dashboard/notes" className={styles.breadcrumb}>
          <span>Smart Note</span>
          <span className={styles.breadSep}>›</span>
          <span className={styles.breadCurrent}>{note.title || 'Note'}</span>
        </Link>
        <div className={styles.headerActions}>
          {draftRestored && <span className={styles.draftBanner}>Draft restored</span>}
          {saving && <span className={styles.savingLabel}>Saving…</span>}
          {saveErr && <span className={styles.saveErrLabel}>{saveErr}</span>}
          <button
            className={styles.exportBtn}
            onClick={() => {
              const filename = downloadNoteAsMarkdown(note);
              addToast('success', 'Note exported', filename);
            }}
          >
            Export
          </button>
          <button
            className={styles.saveNoteBtn}
            onClick={() => handleSave(note.title, note.content)}
            disabled={saving}
          >
            Save Note
          </button>
        </div>
      </header>

      <div className={`${styles.workspace} ${styles.withSidebar}`}>
        <div className={styles.templateSidebar}>
          <p className={styles.templateSidebarHeading}>Notes Templates</p>
          {sidebarTemplates.map((tpl) => {
            const isActive = tpl.id === activeTemplateId;
            return (
              <button
                key={tpl.id}
                className={`${styles.templateItem} ${isActive ? styles.templateItemActive : ''}`}
                onClick={() => {
                  if (!isActive) void handleSwitchTemplate(tpl);
                }}
                title={isActive ? 'Current template' : `New note: ${tpl.name}`}
              >
                <div className={styles.templateItemIcon}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path
                      d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-6-6Z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                    <path d="M14 3v6h6" stroke="currentColor" strokeWidth="1.8" />
                  </svg>
                </div>
                <div className={styles.templateItemText}>
                  <span className={styles.templateItemName}>{tpl.name}</span>
                  <span className={styles.templateItemSub}>
                    {tpl.description.length > 35
                      ? tpl.description.slice(0, 35) + '…'
                      : tpl.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        <TemplateForm
          note={note}
          onSave={handleSave}
          pendingInsert={pendingInsert}
          onInsertApplied={() => setPendingInsert(undefined)}
        />
        <NoteAISidebar
          qualityScore={note.qualityScore}
          qualityFeedback={note.qualityFeedback}
          onAnalyze={handleAnalyze}
          onSummarize={handleSummarize}
          onExpand={handleExpand}
          onInsertContent={(text) => setPendingInsert(text)}
          onScoreChange={handleScoreChange}
        />
      </div>
    </div>
  );
}
