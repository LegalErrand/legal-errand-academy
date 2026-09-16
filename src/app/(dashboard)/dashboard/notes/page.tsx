'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  getNotes,
  getNoteTemplates,
  createNote,
  deleteNote,
  getFetchErrorMessage,
  getAccessToken,
} from '@/lib';
import type { Note, NoteTemplate } from '@/lib';
import { Spinner, ShimmerNoteCard } from '@/components';
import { useToast } from '@/hooks/useToast';
import { NoteCard } from './NoteCard';
import { NoteGallery } from './NoteGallery';
import styles from './page.module.scss';

export default function NotesPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [view, setView] = useState<'gallery' | 'saved'>('saved');
  const [notes, setNotes] = useState<Note[]>([]);
  const [templates, setTemplates] = useState<NoteTemplate[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [subjectTab, setSubjectTab] = useState('All Notes');
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const loadNotes = useCallback(async (t: string, q: string, subject?: string) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { limit: 30 };
      if (q) params.search = q;
      if (subject && subject !== 'All Notes') params.subject = subject;
      const res = await getNotes(t, params as Parameters<typeof getNotes>[1]);
      const notesData = Array.isArray(res.data) ? res.data : (res.data?.data ?? []);
      setNotes(notesData as Note[]);
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
    setToken(t);
    void loadNotes(t, '', 'All Notes');
    setTemplatesLoading(true);
    void getNoteTemplates(t)
      .then((r) => setTemplates(r.data ?? []))
      .catch(() => {})
      .finally(() => setTemplatesLoading(false));
  }, [router, loadNotes]);

  useEffect(() => {
    if (!token || view !== 'saved') return;
    const timer = setTimeout(() => void loadNotes(token, search, subjectTab), 300);
    return () => clearTimeout(timer);
  }, [search, subjectTab, token, view, loadNotes]);

  async function handleCreateFromTemplate(tpl: NoteTemplate) {
    if (!token || creating) return;
    setCreating(true);
    setError('');
    try {
      const res = await createNote({ title: tpl.name, content: tpl.content }, token);
      if (res.data?.id) router.push(`/dashboard/notes/${res.data.id}`);
      else setError(res.message ?? 'Could not create note');
    } catch (err) {
      setError(getFetchErrorMessage(err));
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    if (!token || !confirm('Delete this note?')) return;
    try {
      await deleteNote(id, token);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      addToast('success', 'Note deleted');
    } catch (err) {
      const msg = getFetchErrorMessage(err);
      setError(msg);
      addToast('error', 'Delete failed', msg);
    }
  }

  if (view === 'gallery') {
    return (
      <NoteGallery
        templates={templates}
        loading={templatesLoading}
        creating={creating}
        error={error}
        savedCount={notes.length}
        onCreate={handleCreateFromTemplate}
        onViewSaved={() => {
          setView('saved');
          if (token) void loadNotes(token, '', 'All Notes');
        }}
      />
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.savedBar}>
        <div className={styles.savedSearch}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className={styles.searchIcon}
          >
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
            placeholder="Search Notes"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search notes"
          />
        </div>
        <button className={styles.newNoteBtn} onClick={() => setView('gallery')}>
          + New Note
        </button>
      </header>

      <div className={styles.savedContent}>
        <div className={styles.savedHeader}>
          <div className={styles.subjectTabs}>
            {['All Notes', ...Array.from(new Set(notes.map((n) => n.subject).filter(Boolean)))].map(
              (tab) => (
                <button
                  key={tab}
                  className={`${styles.subjectTab} ${subjectTab === tab ? styles.subjectTabActive : ''}`}
                  onClick={() => setSubjectTab(tab as string)}
                >
                  {tab}
                </button>
              )
            )}
          </div>
        </div>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <div className={styles.noteGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <ShimmerNoteCard key={i} />
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className={styles.emptyBox}>
            <p>
              No notes found.{' '}
              <button className={styles.inlineLink} onClick={() => setView('gallery')}>
                Create your first note.
              </button>
            </p>
          </div>
        ) : (
          <>
            <div className={styles.noteGrid}>
              {notes.map((note) => (
                <NoteCard key={note.id} note={note} onDelete={handleDelete} />
              ))}
            </div>
            <p className={styles.syncMsg}>
              Last synced: Today at{' '}
              {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
