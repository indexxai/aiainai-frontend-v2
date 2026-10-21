import { Skeleton } from '@/ui';
import '@/components/page/page.css';

export default function Loading() {
  return (
    <div className="pg" style={{ maxWidth: 960 }} aria-busy="true" aria-label="Loading">
      <Skeleton width={240} height={32} />
      <Skeleton width="60%" height={16} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} height={120} radius={12} />
        ))}
      </div>
    </div>
  );
}
