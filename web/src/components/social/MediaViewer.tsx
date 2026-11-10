'use client';
import { AnimatePresence, motion } from 'motion/react';
import { Download, X, ZoomIn, ZoomOut } from 'lucide-react';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

/** Full-screen media viewer: tap/Esc to close, swipe down to dismiss, double-tap or buttons to zoom. */
export function MediaViewer({ src, alt = '', caption, onClose }: { src: string | null; alt?: string; caption?: React.ReactNode; onClose: () => void }) {
  const [zoomFor, setZoomFor] = useState<string | null>(null);
  const zoom = !!src && zoomFor === src;
  const setZoom = (f: (z: boolean) => boolean) => setZoomFor(f(zoom) ? src : null);
  const mounted = useSyncExternalStore(() => () => undefined, () => true, () => false);
  useEffect(() => {
    if (!src) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const prev = document.body.style.overflow; document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', k);
    return () => { window.removeEventListener('keydown', k); document.body.style.overflow = prev; };
  }, [src, onClose]);
  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {src && (
        <motion.div role="dialog" aria-modal aria-label="Media viewer" className="fixed inset-0 z-[80] flex flex-col bg-[#000]/95 text-white"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <div className="flex h-14 shrink-0 items-center justify-between px-3" onClick={(e) => e.stopPropagation()}>
            <button aria-label="Close" onClick={onClose} className="press grid h-10 w-10 place-items-center bg-white/10"><X size={22} /></button>
            <div className="flex gap-2">
              <button aria-label={zoom ? 'Zoom out' : 'Zoom in'} onClick={() => setZoom((z) => !z)} className="press grid h-10 w-10 place-items-center bg-white/10">{zoom ? <ZoomOut size={20} /> : <ZoomIn size={20} />}</button>
              <a aria-label="Open original" href={src} target="_blank" rel="noreferrer" className="press grid h-10 w-10 place-items-center bg-white/10"><Download size={20} /></a>
            </div>
          </div>
          <div className="relative flex-1 min-h-0 overflow-auto grid place-items-center">
            <motion.img src={src} alt={alt} onClick={(e) => e.stopPropagation()} onDoubleClick={() => setZoom((z) => !z)}
              drag={zoom ? true : 'y'} dragSnapToOrigin={!zoom} dragElastic={0.6}
              onDragEnd={(_, i) => { if (!zoom && Math.abs(i.offset.y) > 120) onClose(); }}
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: zoom ? 2 : 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className={`max-h-full max-w-full select-none object-contain ${zoom ? 'cursor-zoom-out' : 'cursor-zoom-in'}`} draggable={false} />
          </div>
          {caption && <div className="shrink-0 border-t border-white/10 px-4 py-3 pb-[calc(12px+env(safe-area-inset-bottom))] text-[14px] leading-snug" onClick={(e) => e.stopPropagation()}>{caption}</div>}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
