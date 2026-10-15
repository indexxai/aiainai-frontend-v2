'use client';
import { useState } from 'react';
import { Banner } from '@/ui';
import { ApprovalDetail, ApprovalRow, useApprovalActions, type Approval } from '@/components/team/Approvals';
import { api, type Schemas } from '@/lib/api/client';
import { JackActionDetail, JackActionRow, useJackActionCalls, type JackAction } from './JackAction';
import '@/components/team/team.css';
import './approvals.css';

type List = Schemas['AllApprovalsDto'];
type Item = { type: 'jack'; a: JackAction; at: string } | { type: 'team'; a: Approval; at: string };

const byNewest = (x: Item, y: Item) => y.at.localeCompare(x.at);

/**
 * Approvals (v2 design): Jack's purchases, emails and events plus the team's approvals, waiting and
 * decided on the left, exactly what will happen on the right. Covers both spaces.
 */
export function ApprovalsPage({ initial }: { initial: List }) {
  const [list, setList] = useState(initial);
  const [selKey, setSelKey] = useState<string | null>(null);
  const [toast, setToast] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const reload = async () => {
    const { data } = await api.GET('/api/approvals');
    if (data) setList(data);
  };
  const done = (msg: string) => {
    setToast({ tone: 'success', text: msg });
    void reload();
  };
  const failed = (msg: string) => {
    setToast({ tone: 'danger', text: msg });
    void reload();
  };
  const teamActions = useApprovalActions(done, failed);
  const jackCalls = useJackActionCalls((_a, msg) => done(msg), failed);

  const team = (a: Approval): Item => ({ type: 'team', a, at: a.createdAt });
  const jack = (a: JackAction): Item => ({ type: 'jack', a, at: a.decidedAt ?? a.createdAt });
  const pending = [...list.jackPending.map(jack), ...list.pending.map(team)].sort(byNewest);
  const decided = [...list.jackDecided.map(jack), ...list.decided.map(team)].sort(byNewest);
  const key = (i: Item) => `${i.type}:${i.a.id}`;
  const sel = [...pending, ...decided].find((i) => key(i) === selKey) ?? pending[0] ?? null;

  const row = (i: Item) =>
    i.type === 'jack' ? (
      <JackActionRow key={key(i)} a={i.a} on={sel === i} pick={() => setSelKey(key(i))} />
    ) : (
      <ApprovalRow
        key={key(i)}
        a={i.a}
        on={sel === i}
        pick={() => setSelKey(key(i))}
        decided={i.a.status !== 'pending'}
      />
    );

  return (
    <div className="aps-page">
      <div className="aps-head">
        <h1 className="title-lg">Approvals</h1>
        <p>Purchases, emails and team actions waiting for your OK, from your Personal and Business spaces.</p>
      </div>
      {toast && (
        <div className="aps-toast">
          <Banner tone={toast.tone} onDismiss={() => setToast(null)}>
            {toast.text}
          </Banner>
        </div>
      )}
      <div className={sel ? 'tw-aps' : 'tw-aps idle'}>
        <div className="tw-aps-list">
          <div className="tm-ov tw-aps-h">Waiting for you · {pending.length}</div>
          {pending.map(row)}
          {!pending.length && <div className="muted tm-sm tw-aps-none">Nothing is waiting for you.</div>}
          {decided.length > 0 && <div className="tm-ov tw-aps-h">Decided</div>}
          {decided.map(row)}
        </div>
        <main className="tw-aps-main">
          {sel?.type === 'jack' ? (
            <JackActionDetail key={sel.a.id} a={sel.a} calls={jackCalls} />
          ) : (
            <ApprovalDetail sel={sel?.a ?? null} mode="important" actions={teamActions} />
          )}
        </main>
      </div>
      {teamActions.dialogs}
    </div>
  );
}
