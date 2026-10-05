import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface DriftWallItem {
  id?: string;
  image: string;
  title?: string;
  role?: string;
  href?: string;
  data?: unknown;
  isSkeleton?: boolean;
}

export interface DriftWallProps {
  items?: DriftWallItem[];
  isLoading?: boolean;
  columns?: number;
  tileWidth?: number;
  tileHeight?: number;
  gap?: number;
  radius?: number;
  tilt?: number;
  turn?: number;
  roll?: number;
  perspective?: number;
  depth?: number;
  speed?: number;
  direction?: 'up' | 'down';
  variance?: number;
  parallax?: number;
  pauseOnHover?: boolean;
  lift?: number;
  fade?: number;
  dim?: number;
  grayscale?: boolean;
  overlayColor?: string;
  className?: string;
  style?: React.CSSProperties;
  onHoverItem?: (item: DriftWallItem | null) => void;
}

// ─── Adaptive Network Quality ─────────────────────────────────────────────────
type NetQuality = 'high' | 'medium' | 'low';

function getNetworkQuality(): NetQuality {
  if (typeof navigator === 'undefined') return 'medium';
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!conn) return 'medium';
  const effectiveType: string = conn.effectiveType || '';
  if (effectiveType === '4g' && conn.downlink > 5) return 'high';
  if (effectiveType === '4g' || effectiveType === '3g') return 'medium';
  return 'low'; // 2g, slow-2g, or missing
}

// ─── Image quality sizing per network ─────────────────────────────────────────
function buildSrc(src: string, quality: NetQuality, tileWidth: number): string {
  // If it's a GitHub raw URL, we can't resize it — just return as-is.
  // For picsum we can append sizing. We keep it as-is and rely on CSS/browser.
  // The key perf win is *when* we set the src (IntersectionObserver below).
  return src;
}

// ─── Default & Skeleton items ─────────────────────────────────────────────
const SKELETON_ITEMS: DriftWallItem[] = Array.from({ length: 24 }, (_, i) => ({
  id: `dw-skeleton-${i}`,
  image: '',
  title: '',
  role: '',
  isSkeleton: true,
}));

const DEFAULT_ITEMS: DriftWallItem[] = SKELETON_ITEMS;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const columnFactor = (index: number, variance: number) => {
  const pseudo = ((index * 0.6180339887 + 0.35) % 1) * 2 - 1;
  return 1 + variance * pseudo;
};

const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// ─── Lazy Image with Rich Skeleton Placeholder for Bulk Loading ───────────────
interface LazyTileImageProps {
  src: string;
  alt: string;
  quality: NetQuality;
  tileWidth: number;
  isSkeleton?: boolean;
  onError?: () => void;
}

const LazyTileImage: React.FC<LazyTileImageProps> = ({
  src,
  alt,
  quality,
  tileWidth,
  isSkeleton = false,
  onError,
}) => {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const finalSrc = src && !isSkeleton ? buildSrc(src, quality, tileWidth) : '';

  // Synchronous cache detection: if the browser already cached it, show immediately
  useIsomorphicLayoutEffect(() => {
    if (!finalSrc || isSkeleton) {
      setLoaded(false);
      return;
    }
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [finalSrc, isSkeleton]);

  const handleLoad = useCallback(() => {
    setLoaded(true);
  }, []);

  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
    if (onError) onError();
  }, [onError]);

  const showSkeleton = isSkeleton || !loaded;

  return (
    <span className="dw-img-wrapper" style={{ position: 'absolute', inset: 0, zIndex: 1 }}>
      {/* ─── Premium Cyberpunk Skeletal Placeholder ─── */}
      <span
        className="dw-skeleton-card"
        style={{
          opacity: showSkeleton ? 1 : 0,
          pointerEvents: 'none',
          transition: 'opacity 0.3s ease-out',
        }}
        aria-hidden="true"
      >
        <span className="dw-skeleton-shimmer" />
        <span className="dw-skeleton-avatar">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </span>
        <span className="dw-skeleton-lines">
          <span className="dw-skeleton-line-title" />
          <span className="dw-skeleton-line-role" />
        </span>
      </span>

      {/* ─── Actual Member Photo (Live Streaming Image) ─── */}
      {finalSrc && !isSkeleton && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={imgRef}
          src={finalSrc}
          alt={alt}
          draggable={false}
          loading="eager"
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
            opacity: loaded && !error ? 1 : 0,
            transition: 'opacity 0.35s ease-out',
            imageRendering: quality === 'low' ? 'auto' : undefined,
          }}
        />
      )}

      {/* ─── Error Fallback ─── */}
      {error && !isSkeleton && (
        <span className="dw-error-fallback" aria-hidden="true">
          <span style={{ fontSize: '1.4rem' }}>◈</span>
          <span>VRGC</span>
        </span>
      )}
    </span>
  );
};

// ─── Main DriftWall ────────────────────────────────────────────────────────────
export const DriftWall: React.FC<DriftWallProps> = ({
  items = DEFAULT_ITEMS,
  isLoading = false,
  columns = 8,
  tileWidth = 220,
  tileHeight = 150,
  gap = 20,
  radius = 16,
  tilt = 12,
  turn = -10,
  roll = 0,
  perspective = 1200,
  depth = 80,
  speed = 34,
  direction = 'up',
  variance = 0.35,
  parallax = 0.5,
  pauseOnHover = false,
  lift = 68,
  fade = 0.45,
  dim = 0.68,
  grayscale = false,
  overlayColor = '#060010',
  className = '',
  style,
  onHoverItem,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const planeRef = useRef<HTMLDivElement | null>(null);
  const colRefs = useRef<(HTMLDivElement | null)[]>([]);
  const trackRefs = useRef<(HTMLDivElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  const offsetsRef = useRef<number[]>([]);
  const velocitiesRef = useRef<number[]>([]);
  const hoveredColRef = useRef<number>(-1);
  const wallHoveredRef = useRef<boolean>(false);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const pointerDampedRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTsRef = useRef<number | null>(null);

  const [isDragging, setIsDragging] = useState<boolean>(false);
  const isDraggingRef = useRef<boolean>(false);
  const hasDraggedRef = useRef<boolean>(false);
  const dragDeltaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragInertiaRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const panOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointerPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastPointerTimeRef = useRef<number>(0);

  const isMobileRef = useRef<boolean>(false);
  // Frame skip counter — only process every Nth frame on low-end devices
  const frameCountRef = useRef<number>(0);
  const frameSkipRef = useRef<number>(1); // 1 = every frame, 2 = every other frame

  const [containerSize, setContainerSize] = useState<{ width: number; height: number }>({
    width: 1400,
    height: 750,
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeIdRef = useRef<string | null>(null);
  const [reduced, setReduced] = useState<boolean>(false);

  // Adaptive network quality — sampled once on mount
  const [netQuality, setNetQuality] = useState<NetQuality>('medium');

  useEffect(() => {
    isMobileRef.current = /Mobi|Android/i.test(navigator.userAgent);
    setReduced(prefersReducedMotion());

    const q = getNetworkQuality();
    setNetQuality(q);

    // On low-end/slow connection: skip every other frame
    if (q === 'low' || isMobileRef.current) {
      frameSkipRef.current = 2;
    }

    // Listen for network quality changes
    const conn = (navigator as any).connection;
    const handleConnChange = () => setNetQuality(getNetworkQuality());
    if (conn) conn.addEventListener('change', handleConnChange);

    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', onChange);

    return () => {
      mq.removeEventListener('change', onChange);
      if (conn) conn.removeEventListener('change', handleConnChange);
    };
  }, []);

  const safeItems = useMemo(() => {
    if (isLoading || !items || items.length === 0) return SKELETON_ITEMS;
    return items;
  }, [items, isLoading]);

  // ── Chunk-based column distribution ─────────────────────────────────────────
  // On low-end/mobile we use fewer columns to reduce DOM nodes drastically
  const dynamicColumns = useMemo(() => {
    const minColsForWidth = Math.ceil(containerSize.width / (tileWidth + gap)) + 2;
    const baseCols = Math.max(columns, minColsForWidth, 6);
    if (isMobileRef.current || netQuality === 'low') {
      return Math.min(baseCols, 4); // max 4 cols on mobile/slow
    }
    if (netQuality === 'medium') {
      return Math.min(baseCols, 6); // max 6 cols on medium
    }
    return baseCols;
  }, [columns, containerSize.width, tileWidth, gap, netQuality]);

  const columnItems = useMemo(() => {
    const cols: DriftWallItem[][] = Array.from({ length: dynamicColumns }, () => []);
    safeItems.forEach((item, i) => cols[i % dynamicColumns].push(item));
    return cols.map((col) => (col.length ? col : safeItems.slice(0, 1)));
  }, [safeItems, dynamicColumns]);

  // ── Adaptive copies — KEY perf improvement ──────────────────────────────────
  // On low/medium: max 2 copies. On high: up to 3.
  const columnMeta = useMemo(() => {
    const unit = tileHeight + gap;
    const maxCopies = netQuality === 'high' ? 3 : 2;
    return columnItems.map((col) => {
      const copyHeight = Math.max(unit, col.length * unit);
      // Never exceed maxCopies — the infinite scroll still works because we wrap
      const copies = Math.min(maxCopies, Math.max(2, Math.ceil((containerSize.height * 2) / copyHeight) + 1));
      return { copyHeight, copies };
    });
  }, [columnItems, tileHeight, gap, containerSize.height, netQuality]);

  useIsomorphicLayoutEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      if (entry.contentRect) {
        setContainerSize({
          width: entry.contentRect.width || window.innerWidth,
          height: entry.contentRect.height || window.innerHeight,
        });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const baseVelocities = useMemo(() => {
    const dirSign = direction === 'up' ? 1 : -1;
    // Slow down on low-quality to reduce perceived jank
    const speedMod = netQuality === 'low' ? 0.6 : netQuality === 'medium' ? 0.8 : 1;
    return columnItems.map((_, c) => {
      const altSign = c % 2 === 0 ? 1 : -1;
      return speed * speedMod * columnFactor(c, variance) * dirSign * altSign;
    });
  }, [columnItems, speed, direction, variance, netQuality]);

  useEffect(() => {
    offsetsRef.current = columnMeta.map((meta, c) => meta.copyHeight * ((c * 0.37) % 1));
    velocitiesRef.current = columnItems.map(() => 0);
  }, [columnMeta, columnItems]);

  const applyPlaneTransform = useCallback(
    (px: number, py: number) => {
      const plane = planeRef.current;
      if (!plane) return;
      const t = isMobileRef.current ? 0.8 : 1.24;
      plane.style.transform = `translate3d(-50%, -50%, ${-depth}px) scale(${t}) rotateX(${
        isMobileRef.current ? 0 : (tilt + py).toFixed(2)
      }deg) rotateY(${isMobileRef.current ? 0 : (turn + px).toFixed(2)}deg) rotateZ(${roll}deg)`;
    },
    [tilt, turn, roll, depth]
  );

  // ── RAF Animation Loop ────────────────────────────────────────────────────────
  useEffect(() => {
    const animate = (ts: number) => {
      rafRef.current = requestAnimationFrame(animate);

      // Hard skip when tab is hidden — saves CPU completely
      if (document.hidden) return;

      if (lastTsRef.current === null) lastTsRef.current = ts;

      const dt = Math.min(0.05, Math.max(0.001, (ts - lastTsRef.current) / 1000));
      frameCountRef.current++;

      // Frame skipping: on mobile/low-end, process every other frame
      if (frameCountRef.current % frameSkipRef.current !== 0) return;
      lastTsRef.current = ts;

      if (isDraggingRef.current) {
        const dx = dragDeltaRef.current.x;
        const dy = dragDeltaRef.current.y;
        dragDeltaRef.current = { x: 0, y: 0 };

        if (Math.abs(dy) > 0.01) {
          for (let c = 0; c < offsetsRef.current.length; c++) {
            const meta = columnMeta[c];
            if (!meta) continue;
            let next = (offsetsRef.current[c] ?? 0) - dy;
            next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
            offsetsRef.current[c] = next;
          }
        }

        if (Math.abs(dx) > 0.01) {
          panOffsetRef.current.x += dx * 0.85;
        }
      } else {
        if (Math.abs(dragInertiaRef.current.y) > 0.5) {
          const decay = Math.exp(-dt / 0.38);
          dragInertiaRef.current.y *= decay;
          for (let c = 0; c < offsetsRef.current.length; c++) {
            const meta = columnMeta[c];
            if (!meta) continue;
            let next = (offsetsRef.current[c] ?? 0) - dragInertiaRef.current.y * dt;
            next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
            offsetsRef.current[c] = next;
          }
        }

        if (Math.abs(dragInertiaRef.current.x) > 0.5) {
          const decay = Math.exp(-dt / 0.38);
          dragInertiaRef.current.x *= decay;
          panOffsetRef.current.x += dragInertiaRef.current.x * dt;
        }
      }

      const maxTilt = parallax * 8;
      const targetX = pointerRef.current.x * maxTilt;
      const targetY = -pointerRef.current.y * maxTilt;
      const damp = 1 - Math.exp(-dt / 0.14);
      pointerDampedRef.current.x += (targetX - pointerDampedRef.current.x) * damp;
      pointerDampedRef.current.y += (targetY - pointerDampedRef.current.y) * damp;

      applyPlaneTransform(pointerDampedRef.current.x, pointerDampedRef.current.y);

      if (!reduced && !isDraggingRef.current) {
        for (let c = 0; c < trackRefs.current.length; c++) {
          const meta = columnMeta[c];
          if (!meta) continue;
          const paused = wallHoveredRef.current && pauseOnHover;
          const factor = paused || hoveredColRef.current === c ? 0 : 1;
          const target = baseVelocities[c] * factor;

          const ease = 1 - Math.exp(-dt / (target === 0 ? 0.16 : 0.28));
          velocitiesRef.current[c] += (target - velocitiesRef.current[c]) * ease;
          let next = (offsetsRef.current[c] ?? 0) + velocitiesRef.current[c] * dt;
          next = ((next % meta.copyHeight) + meta.copyHeight) % meta.copyHeight;
          offsetsRef.current[c] = next;
        }
      }

      const colWidth = tileWidth + gap;
      const totalWidth = dynamicColumns * colWidth;

      for (let c = 0; c < dynamicColumns; c++) {
        const el = trackRefs.current[c];
        if (el) el.style.transform = `translate3d(0, ${-(offsetsRef.current[c] ?? 0).toFixed(1)}px, 0)`;

        const colEl = colRefs.current[c];
        if (colEl) {
          const targetX = c * colWidth + panOffsetRef.current.x;
          const wrappedX = ((targetX % totalWidth) + totalWidth) % totalWidth;
          const translateX = wrappedX - c * colWidth;
          colEl.style.transform = `translate3d(${translateX.toFixed(1)}px, 0, 0)`;
        }
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [baseVelocities, columnMeta, pauseOnHover, parallax, reduced, applyPlaneTransform, dynamicColumns, tileWidth, gap]);

  const activate = useCallback(
    (id: string, index: number, item?: DriftWallItem) => {
      if (isDraggingRef.current || hasDraggedRef.current) return;
      activeIdRef.current = id;
      hoveredColRef.current = index;
      setActiveId(id);
      if (onHoverItem && item) {
        onHoverItem(item);
      }
    },
    [onHoverItem]
  );

  const release = useCallback(() => {
    activeIdRef.current = null;
    hoveredColRef.current = -1;
    setActiveId(null);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    setIsDragging(true);
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    dragDeltaRef.current = { x: 0, y: 0 };
    dragInertiaRef.current = { x: 0, y: 0 };
    lastPointerPosRef.current = { x: e.clientX, y: e.clientY };
    lastPointerTimeRef.current = performance.now();
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch (_) {}
  }, []);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      if (isDraggingRef.current) {
        const now = performance.now();
        const dt = Math.max(0.001, (now - lastPointerTimeRef.current) / 1000);
        lastPointerTimeRef.current = now;

        const dx = e.clientX - lastPointerPosRef.current.x;
        const dy = e.clientY - lastPointerPosRef.current.y;
        lastPointerPosRef.current = { x: e.clientX, y: e.clientY };

        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
          hasDraggedRef.current = true;
        }

        dragDeltaRef.current.x += dx;
        dragDeltaRef.current.y += dy;

        dragInertiaRef.current = {
          x: dx / dt,
          y: dy / dt,
        };
        return;
      }

      if (parallax > 0 && !reduced && !isMobileRef.current) {
        pointerRef.current = {
          x: (e.clientX - rect.left) / rect.width - 0.5,
          y: (e.clientY - rect.top) / rect.height - 0.5,
        };
      }

      const hit = document.elementFromPoint(e.clientX, e.clientY);
      const tile = hit && (hit as HTMLElement).closest ? ((hit as HTMLElement).closest('[data-tile-id]') as HTMLElement) : null;
      if (!tile) return;
      const id = tile.dataset.tileId;
      if (id === activeIdRef.current) return;
      activeIdRef.current = id || null;
      hoveredColRef.current = Number(tile.dataset.col);
      setActiveId(id || null);

      if (onHoverItem) {
        const itemIdx = Number(tile.dataset.itemIdx);
        const colIdx = Number(tile.dataset.col);
        const found = columnItems[colIdx]?.[itemIdx];
        if (found) {
          onHoverItem(found);
        }
      }
    },
    [parallax, reduced, onHoverItem, columnItems]
  );

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging(false);
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (_) {}
    }
  }, []);

  const handlePointerLeaveWall = useCallback(() => {
    wallHoveredRef.current = false;
    pointerRef.current = { x: 0, y: 0 };
    release();
  }, [release]);

  // Native wheel listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      dragInertiaRef.current.y -= e.deltaY * 0.5;
      dragDeltaRef.current.y -= e.deltaY * 0.5;
      dragInertiaRef.current.x -= e.deltaX * 0.5;
      dragDeltaRef.current.x -= e.deltaX * 0.5;
    };
    el.addEventListener('wheel', onNativeWheel, { passive: false });
    return () => el.removeEventListener('wheel', onNativeWheel);
  }, []);

  const cssVars = useMemo(
    () =>
      ({
        '--dw-tile-w': `${tileWidth}px`,
        '--dw-tile-h': `${tileHeight}px`,
        '--dw-gap': `${gap}px`,
        '--dw-radius': `${radius}px`,
        '--dw-perspective': `${perspective}px`,
        '--dw-lift': `${lift}px`,
        '--dw-dim': dim,
        '--dw-gray': grayscale ? 1 : 0,
        '--dw-overlay': overlayColor,
        ...style,
      } as React.CSSProperties),
    [tileWidth, tileHeight, gap, radius, perspective, lift, dim, grayscale, overlayColor, style]
  );

  // ── Render Tile ────────────────────────────────────────────────────────────
  const renderTile = (item: DriftWallItem, id: string, colIndex: number, itemIndex: number) => {
    const isSkel = Boolean(item.isSkeleton);
    const inner = (
      <span className="drift-wall__inner">
        <LazyTileImage
          src={item.image}
          alt={item.title ?? ''}
          quality={netQuality}
          tileWidth={tileWidth}
          isSkeleton={isSkel}
        />
        <span className="drift-wall__overlay" aria-hidden="true" style={{ zIndex: 2 }} />
        {item.title && !isSkel && (
          <div className="drift-wall__tile-info" style={{ zIndex: 3 }}>
            <div className="drift-wall__tile-name">{item.title}</div>
            {item.role && <div className="drift-wall__tile-role">{item.role}</div>}
          </div>
        )}
      </span>
    );

    const commonProps = {
      className: `drift-wall__tile${activeId === id ? ' is-active' : ''}`,
      'data-tile-id': id,
      'data-col': colIndex,
      'data-item-idx': itemIndex,
      onMouseEnter: () => activate(id, colIndex, item),
      onMouseLeave: release,
      onFocus: () => activate(id, colIndex, item),
      onBlur: release,
      onClick: (e: React.MouseEvent) => {
        if (hasDraggedRef.current) {
          e.preventDefault();
          e.stopPropagation();
        }
      },
    };

    if (item.href) {
      return (
        <a key={id} href={item.href} target="_blank" rel="noreferrer noopener" {...commonProps}>
          {inner}
        </a>
      );
    }
    return (
      <div key={id} tabIndex={0} role="button" aria-label={item.title ?? 'tile'} {...commonProps}>
        {inner}
      </div>
    );
  };

  const rootClass = [
    'drift-wall',
    reduced ? 'drift-wall--reduced' : '',
    isDragging ? 'is-dragging' : '',
    `drift-wall--q-${netQuality}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      ref={containerRef}
      className={rootClass}
      style={cssVars}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onPointerEnter={() => {
        wallHoveredRef.current = true;
      }}
      onPointerLeave={handlePointerLeaveWall}
      role="group"
      aria-label="Drifting wall of tiles"
    >
      <div ref={planeRef} className="drift-wall__plane" style={{ willChange: 'transform' }}>
        {columnItems.map((col, c) => {
          const meta = columnMeta[c];
          const copies = Array.from({ length: meta.copies });
          return (
            <div
              className="drift-wall__col"
              key={`col-${c}`}
              ref={(el) => { colRefs.current[c] = el; }}
              style={{ willChange: 'transform' }}
            >
              <div
                className="drift-wall__track"
                ref={(el) => { trackRefs.current[c] = el; }}
                style={{ willChange: 'transform' }}
              >
                {copies.map((_, copyIndex) =>
                  col.map((item, itemIndex) =>
                    renderTile(item, `${c}-${copyIndex}-${itemIndex}`, c, itemIndex)
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DriftWall;
