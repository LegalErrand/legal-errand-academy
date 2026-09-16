'use client';

import { useCallback, useEffect, useState } from 'react';
import styles from './DocumentViewerOverlay.module.scss';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const STEP = 0.25;

interface Props {
  title: string;
  src: string;
  /** 'image' renders an <img>; anything else renders the file in an iframe. */
  contentKind: string;
  onClose: () => void;
}

/**
 * Full-screen viewer for an original document.
 *
 * Zoom is applied with a CSS transform rather than relying on the browser's
 * built-in PDF controls, which are inconsistent on mobile and absent entirely
 * for images.
 */
export default function DocumentViewerOverlay({ title, src, contentKind, onClose }: Props) {
  const [zoom, setZoom] = useState(1);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, +(z + STEP).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, +(z - STEP).toFixed(2))), []);
  const reset = useCallback(() => setZoom(1), []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
      }
      if (e.key === '0') {
        e.preventDefault();
        reset();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, zoomIn, zoomOut, reset]);

  // A CSS transform does not change layout size, so the scroll container would
  // never overflow. The sizer takes the zoomed footprint to create the scroll
  // range; the content is counter-sized inside it, then scaled back up to fill.
  const sizerStyle = { width: `${zoom * 100}%`, height: `${zoom * 100}%` } as const;
  const contentStyle = {
    transform: `scale(${zoom})`,
    transformOrigin: 'top left',
    width: `${100 / zoom}%`,
    height: `${100 / zoom}%`,
  } as const;

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Original document">
      <div className={styles.bar}>
        <p className={styles.title}>{title}</p>

        <div className={styles.actions}>
          <div className={styles.zoomGroup} role="group" aria-label="Zoom">
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              title="Zoom out (−)"
            >
              −
            </button>
            <button
              type="button"
              className={styles.zoomLevel}
              onClick={reset}
              title="Reset zoom (0)"
              aria-label={`Zoom ${Math.round(zoom * 100)} percent — click to reset`}
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              type="button"
              className={styles.zoomBtn}
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              aria-label="Zoom in"
              title="Zoom in (+)"
            >
              +
            </button>
          </div>

          <a href={src} target="_blank" rel="noopener noreferrer" className={styles.openBtn}>
            Open in new tab
          </a>
          <button type="button" className={styles.closeBtn} onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div className={styles.scroller}>
        <div className={styles.sizer} style={sizerStyle}>
          {contentKind === 'image' ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={title} className={styles.image} style={contentStyle} />
          ) : (
            <iframe title={title} src={src} className={styles.frame} style={contentStyle} />
          )}
        </div>
      </div>
    </div>
  );
}
