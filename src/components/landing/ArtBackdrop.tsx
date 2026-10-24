/* eslint-disable @next/next/no-img-element -- small decorative images */
import type { ArtPiece } from './art';

/** Faint hand-drawn tools scattered behind the page (decorative; hidden from screen readers). */
export function ArtBackdrop({ pieces }: { pieces: ArtPiece[] }) {
  return (
    <div className="ml-art" aria-hidden>
      {pieces.map(([art, left, top, width, rotate], i) => (
        <img
          key={i}
          src={`/art/${art}.webp`}
          alt=""
          loading="lazy"
          decoding="async"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            width: `clamp(72px, ${(width / 14.4).toFixed(2)}vw, ${width}px)`,
            transform: `rotate(${rotate}deg)`,
          }}
        />
      ))}
    </div>
  );
}
