'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  getLibraryDocument,
  getSignedDownloadUrl,
  getDocumentText,
  getFetchErrorMessage,
  getAccessToken,
} from '@/lib';
import type { DocumentContentKind, LibraryDocument } from '@/lib';
import { Spinner } from '@/components';
import LibraryAIPanel from '@/components/LibraryAIPanel';
import DocumentViewerOverlay from '@/components/DocumentViewerOverlay';
import pStyles from './page.module.scss';
import cStyles from './LibraryContent.module.scss';
const styles = { ...pStyles, ...cStyles };

const SECTION_RE = /^[A-Z][A-Z\s/&(),-]{2,}:?$/;

const SKIP_PHRASES = [
  'skip to document content',
  'skip to main content',
  'skip navigation',
  'skip to content',
];

function isSkipLine(line: string): boolean {
  const low = line.trim().toLowerCase();
  return SKIP_PHRASES.some(
    (p) => low === p || low === p + '.' || low.replace(/[^a-z ]/g, '') === p
  );
}

function cleanText(raw: string): string {
  return raw
    .split('\n')
    .filter((l) => !isSkipLine(l))
    .join('\n');
}

function extractHeadings(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => SECTION_RE.test(l));
}

function resolveKind(
  doc: LibraryDocument | null,
  fallback?: string | null
): DocumentContentKind | string {
  return doc?.contentKind || doc?.metadata?.contentKind || fallback || 'binary';
}

function isTextReadableKind(kind: string): boolean {
  return (
    kind === 'text' ||
    kind === 'html' ||
    kind === 'markdown' ||
    kind === 'json' ||
    kind === 'xml' ||
    kind === 'rtf'
  );
}

function CaseTextReader({ text }: { text: string }) {
  const lines = cleanText(text).split('\n');
  const nodes: { type: 'heading' | 'para'; text: string }[] = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (SECTION_RE.test(line)) nodes.push({ type: 'heading', text: line });
    else nodes.push({ type: 'para', text: line });
  }
  return (
    <div className={styles.caseReader}>
      {nodes.map((n, i) =>
        n.type === 'heading' ? (
          <h2 key={i} className={styles.caseSection}>
            {n.text}
          </h2>
        ) : (
          <p key={i} className={styles.casePara}>
            {n.text}
          </p>
        )
      )}
    </div>
  );
}

export default function LibraryDocumentPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [doc, setDoc] = useState<LibraryDocument | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [contentKind, setContentKind] = useState<string>('binary');
  const [docText, setDocText] = useState<string | null>(null);
  const [textLoading, setTextLoading] = useState(false);
  const [originalOpen, setOriginalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeHeading, setActiveHeading] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      router.replace('/login');
      return;
    }
    if (!id) return;

    void (async () => {
      try {
        const [docRes, urlRes] = await Promise.allSettled([
          getLibraryDocument(id, token),
          getSignedDownloadUrl(id, token),
        ]);

        let kind: string = 'binary';
        if (docRes.status === 'fulfilled' && docRes.value.data) {
          const d = docRes.value.data;
          setDoc(d);
          kind = resolveKind(d);
        } else if (docRes.status === 'rejected') {
          setError(getFetchErrorMessage(docRes.reason));
        }

        if (urlRes.status === 'fulfilled' && urlRes.value.data?.signedUrl) {
          setSignedUrl(urlRes.value.data.signedUrl);
          if (urlRes.value.data.contentKind) {
            kind = urlRes.value.data.contentKind;
          }
        }
        setContentKind(kind);

        // Never fetch raw S3 bytes as text — use API transcript (PDF-safe + multi-source).
        const needsTranscript =
          kind === 'pdf' || isTextReadableKind(kind) || kind === 'office' || kind === 'binary';

        if (needsTranscript) {
          setTextLoading(true);
          try {
            const textRes = await getDocumentText(id, token);
            const text = textRes.data?.text?.trim() ?? '';
            if (textRes.data?.contentKind) {
              setContentKind(textRes.data.contentKind);
            }
            setDocText(text || null);
          } catch {
            setDocText(null);
          } finally {
            setTextLoading(false);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [router, id]);

  useEffect(() => {
    if (!originalOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOriginalOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [originalOpen]);

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.state}>
          <Spinner size={22} label="Loading document…" />
        </div>
      </div>
    );
  if (error)
    return (
      <div className={styles.page}>
        <p className={styles.stateError}>{error}</p>
      </div>
    );
  if (!doc)
    return (
      <div className={styles.page}>
        <p className={styles.state}>Document not found.</p>
      </div>
    );

  const caseText = docText ?? null;
  const headings = caseText ? extractHeadings(caseText) : [];
  const canOpenOriginal =
    Boolean(signedUrl) &&
    (contentKind === 'pdf' || contentKind === 'image' || contentKind === 'binary');

  return (
    <div className={styles.page}>
      <header className={styles.topBar}>
        <Link href="/dashboard/library" className={styles.backBtn}>
          ← Library
        </Link>
        <div className={styles.docMeta}>
          <h1 className={styles.docTitle}>{doc.title}</h1>
          <div className={styles.docMetaRow}>
            {doc.subject && <span className={styles.docSubject}>{doc.subject}</span>}
            {doc.metadata?.court && (
              <span className={styles.docMetaChip}>{doc.metadata.court}</span>
            )}
            {doc.metadata?.year && <span className={styles.docMetaChip}>{doc.metadata.year}</span>}
            {doc.metadata?.citation && (
              <span className={styles.docMetaChip}>{doc.metadata.citation}</span>
            )}
          </div>
        </div>
        <div className={styles.topBarActions}>
          {canOpenOriginal && (
            <button
              type="button"
              className={styles.originalCta}
              onClick={() => setOriginalOpen(true)}
            >
              Open original
            </button>
          )}
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.downloadBtn}
            >
              Download
            </a>
          )}
        </div>
      </header>

      <div className={styles.viewerLayout}>
        <aside className={styles.chaptersPanel}>
          <p className={styles.chaptersPanelTitle}>Contents</p>
          {headings.length > 0 ? (
            headings.map((h, i) => (
              <button
                key={i}
                type="button"
                className={`${styles.chapterItem} ${activeHeading === h ? styles.chapterItemActive : ''}`}
                onClick={() => setActiveHeading(h)}
              >
                {h}
              </button>
            ))
          ) : (
            <p className={styles.chaptersEmpty}>
              {textLoading ? 'Extracting sections…' : 'No sections found.'}
            </p>
          )}
        </aside>

        <div className={styles.centerColumn}>
          {textLoading ? (
            <div className={styles.state}>
              <Spinner size={22} label="Loading transcript…" />
            </div>
          ) : caseText ? (
            <CaseTextReader text={caseText} />
          ) : (
            <div className={styles.noPreview}>
              <p>No transcript available for this source yet.</p>
              {canOpenOriginal && (
                <button
                  type="button"
                  className={styles.originalCta}
                  onClick={() => setOriginalOpen(true)}
                >
                  Open original
                </button>
              )}
              {!canOpenOriginal && signedUrl && (
                <a
                  href={signedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.downloadBtn}
                >
                  Download file
                </a>
              )}
            </div>
          )}
        </div>

        <LibraryAIPanel
          docTitle={doc.title}
          docSubject={doc.subject}
          docDescription={doc.metadata?.description}
        />
      </div>

      {originalOpen && signedUrl && (
        <DocumentViewerOverlay
          title={doc.title}
          src={signedUrl}
          contentKind={contentKind}
          onClose={() => setOriginalOpen(false)}
        />
      )}
    </div>
  );
}
