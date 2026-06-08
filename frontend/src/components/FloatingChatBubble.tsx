import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '../stores/uiStore';
import ChatWidget from './ChatWidget';
import { STORAGE_KEYS } from '../lib/storage';

type Corner = 'tl' | 'tr' | 'bl' | 'br';

const SIZE = 56;
const MARGIN = 20;
const DRAG_THRESHOLD = 6;

function cornerToPos(corner: Corner): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  switch (corner) {
    case 'tl': return { x: MARGIN, y: MARGIN };
    case 'tr': return { x: vw - SIZE - MARGIN, y: MARGIN };
    case 'bl': return { x: MARGIN, y: vh - SIZE - MARGIN };
    case 'br': return { x: vw - SIZE - MARGIN, y: vh - SIZE - MARGIN };
  }
}

function snapCorner(x: number, y: number): Corner {
  const cx = x + SIZE / 2;
  const cy = y + SIZE / 2;
  const left = cx < window.innerWidth / 2;
  const top = cy < window.innerHeight / 2;
  if (left && top) return 'tl';
  if (!left && top) return 'tr';
  if (left && !top) return 'bl';
  return 'br';
}

function loadCorner(): Corner {
  const s = localStorage.getItem(STORAGE_KEYS.BUBBLE_CORNER);
  if (s === 'tl' || s === 'tr' || s === 'bl' || s === 'br') return s;
  return 'br';
}

function widgetStyle(corner: Corner): React.CSSProperties {
  if (window.innerWidth < 640) return { position: 'fixed', inset: 0 };
  const gap = SIZE + MARGIN + 8;
  switch (corner) {
    case 'br': return { position: 'fixed', bottom: gap, right: MARGIN };
    case 'bl': return { position: 'fixed', bottom: gap, left: MARGIN };
    case 'tr': return { position: 'fixed', top: gap, right: MARGIN };
    case 'tl': return { position: 'fixed', top: gap, left: MARGIN };
  }
}

export default function FloatingChatBubble() {
  const { isWidgetOpen, toggleWidget, closeWidget } = useUIStore();

  const [corner, setCorner] = useState<Corner>(loadCorner);
  const [pos, setPos] = useState<{ x: number; y: number }>(() => cornerToPos(loadCorner()));
  const [snapping, setSnapping] = useState(false);

  // Refs so pointer event handlers always see current values
  const posRef = useRef(pos);
  const dragging = useRef(false);
  const hasDragged = useRef(false);
  const dragStart = useRef({ clientX: 0, clientY: 0, bubbleX: 0, bubbleY: 0 });
  const bubbleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => { posRef.current = pos; }, [pos]);

  // Re-snap on window resize
  useEffect(() => {
    const onResize = () => {
      const c = loadCorner();
      const p = cornerToPos(c);
      posRef.current = p;
      setPos(p);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dragging.current = true;
    hasDragged.current = false;
    dragStart.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      bubbleX: posRef.current.x,
      bubbleY: posRef.current.y,
    };
    bubbleRef.current?.setPointerCapture(e.pointerId);
    setSnapping(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    const dx = e.clientX - dragStart.current.clientX;
    const dy = e.clientY - dragStart.current.clientY;

    if (!hasDragged.current && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
      hasDragged.current = true;
    }
    if (!hasDragged.current) return;

    const maxX = window.innerWidth - SIZE;
    const maxY = window.innerHeight - SIZE;
    const nx = Math.max(0, Math.min(dragStart.current.bubbleX + dx, maxX));
    const ny = Math.max(0, Math.min(dragStart.current.bubbleY + dy, maxY));
    posRef.current = { x: nx, y: ny };
    setPos({ x: nx, y: ny });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    bubbleRef.current?.releasePointerCapture(e.pointerId);

    if (hasDragged.current) {
      const snapped = snapCorner(posRef.current.x, posRef.current.y);
      const snappedPos = cornerToPos(snapped);
      setCorner(snapped);
      setSnapping(true);
      posRef.current = snappedPos;
      setPos(snappedPos);
      localStorage.setItem(STORAGE_KEYS.BUBBLE_CORNER, snapped);
      setTimeout(() => setSnapping(false), 250);
    } else {
      toggleWidget();
    }
  };

  return (
    <>
      {isWidgetOpen && (
        <div style={widgetStyle(corner)} className="z-40">
          <ChatWidget onClose={closeWidget} />
        </div>
      )}

      <button
        ref={bubbleRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          left: pos.x,
          top: pos.y,
          width: SIZE,
          height: SIZE,
          touchAction: 'none',
          transition: snapping ? 'left 0.22s ease, top 0.22s ease' : 'none',
        }}
        className="fixed z-50 rounded-full bg-gray-900 text-white shadow-xl flex items-center justify-center select-none cursor-grab active:cursor-grabbing hover:shadow-2xl"
        aria-label={isWidgetOpen ? 'Close support chat' : 'Open support chat'}
      >
        {isWidgetOpen ? (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
          </svg>
        )}
      </button>
    </>
  );
}
