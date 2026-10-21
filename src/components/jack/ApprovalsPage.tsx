'use client';
import { useState } from 'react';
import { Banner, Icon } from '@/ui';
import { api, type Schemas } from '@/lib/api/client';
import { JackActionDetail, JackActionRow, useJackActionCalls, type JackAction } from './JackAction';
import './approvals.css';

type List = Schemas['AllApprovalsDto'];

/**
 * Approvals (v2 design): Jack's purchases, emails, Slack messages and events, waiting and decided
 * on the left, exactly what will happen on the right.
 */
export function ApprovalsPage({ initial }: { initial: List }) {
  const [list, setList] = useState(initial);
  const [selId, setSelId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const reload = async () => {
    const { data } = await api.GET('/api/approvals');
    if (data) setList(data);
  };
  const calls = useJackActionCalls(
    (_a, msg) => {
      setToast({ tone: 'success', text: msg });
      void reload();
    },
    (msg) => {
      setToast({ tone: 'danger', text: msg });
      void reload();
    },
  );

  const at = (a: JackAction) => a.decidedAt ?? a.createdAt;
  const byNewest = (x: JackAction, y: JackAction) => at(y).localeCompare(at(x));
  const pending = [...list.jackPending].sort(byNewest);
  const decided = [...list.jackDecided].sort(byNewest);
  const sel = [...pending, ...decided].find((a) => a.id === selId) ?? pending[0] ?? null;
  const row = (a: JackAction) => (
    <JackActionRow key={a.id} a={a} on={sel === a} pick={() => setSelId(a.id)} />
  );

  return (
    <div className="aps-page">
      <div className="aps-head">
        <h1 className="title-lg">Approvals</h1>
        <p>Purchases, emails and messages Jack is waiting for your OK on.</p>
      </div>
      {toast && (
        <div className="aps-toast">
          <Banner tone={toast.tone} onDismiss={() => setToast(null)}>
            {toast.text}
          </Banner>
        </div>
      )}
      <div className="tw-aps">
        <div className="tw-aps-list">
          <div className="tm-ov tw-aps-h">Waiting for you · {pending.length}</div>
          {pending.map(row)}
          {!pending.length && <div className="muted tm-sm tw-aps-none">Nothing is waiting for you.</div>}
          {decided.length > 0 && <div className="tm-ov tw-aps-h">Decided</div>}
          {decided.map(row)}
        </div>
        <div className="tw-aps-main">
          {sel ? (
            <JackActionDetail key={sel.id} a={sel} calls={calls} />
          ) : (
            <div className="tw-caught-up">
              <span className="ok">
                <Icon name="circle-check" size={40} />
              </span>
              <div className="title">You&apos;re all caught up</div>
              <div className="muted tm-sm">
                When Jack needs your OK to pay or send something, it shows up here.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
