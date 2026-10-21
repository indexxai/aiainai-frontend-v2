'use client';
import { useJack } from '@/lib/assistant';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Banner } from '@/ui';
import { Composer } from '@/components/composer/Composer';
import { useShellCrumbs } from '@/components/shell/crumbs';
import type { ChatDetail } from '@/lib/chat/client';
import { useChatThread } from '@/lib/chat/useChatThread';
import { takeDraft } from '@/lib/draft';
import { AUTO, nameOf, type ModelMenu } from '@/lib/models';
import { PlanPanel } from './JackPlan';
import { AnswerMessage, UserMessage } from './MessageView';
import { api } from '@/lib/api/client';
import './chat.css';

const NEAR_BOTTOM_PX = 160;

/** One conversation: messages, the streaming answer, and the follow-up box. */
export function ChatThread({
  detail,
  menu,
  resetsOn,
}: {
  detail: ChatDetail;
  menu: ModelMenu;
  resetsOn?: string;
}) {
  const jack = useJack();
  const router = useRouter();
  const pathname = usePathname();
  const thread = useChatThread(detail, () => router.refresh());
  const { state, running } = thread;
  const usable = (key: string) => key === AUTO || menu.models.some((m) => m.key === key && !m.locked);
  const [model, setModel] = useState(usable(detail.chat.model) ? detail.chat.model : menu.selected);
  const scroller = useRef<HTMLDivElement>(null);
  // Apps Jack may use in this chat (Connectors chip); saved on the chat.
  const [appsOff, setAppsOff] = useState<string[]>(detail.chat.appsOff ?? []);
  const stick = useRef(true);

  // In a project: Projects / the project / this chat, and back goes to the project.
  const project = detail.project;
  useShellCrumbs({
    path: pathname,
    items: project
      ? [
          { label: 'Projects', href: '/projects' },
          { label: project.name, href: `/projects/${project.id}` },
          { label: state.chat.title },
        ]
      : [{ label: `${jack.name}`, href: '/' }, { label: state.chat.title }],
    back: project ? `/projects/${project.id}` : '/',
  });

  // A first message handed over from Home or the new-chat screen.
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const draft = takeDraft(detail.chat.id);
    if (draft) void thread.send(draft.text, draft.model, draft.files ?? []);
    // run once for this chat
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow the answer as it is written, unless the person scrolled up to read.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [state.messages]);

  const lastId = state.messages[state.messages.length - 1]?.id;
  const lastAnswer = [...state.messages].reverse().find((m) => m.role === 'assistant');
  const outOfCredits = lastAnswer?.status === 'failed' && lastAnswer.error?.code === 'insufficient_credits';

  return (
    <div className="ct-wrap">
      <div className="ct">
        <div
          className="ct-scroll"
          ref={scroller}
          onScroll={(e) => {
            const el = e.currentTarget;
            stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
          }}
        >
          <div className="ct-col ct-messages" role="log" aria-live="polite" aria-relevant="additions">
            {state.messages.length === 0 && !running && (
              <p className="ct-empty">Tell {jack.name} what you need to start this conversation.</p>
            )}
            {state.messages.map((m) =>
              m.role === 'user' ? (
                <UserMessage key={m.id} m={m} />
              ) : (
                <AnswerMessage
                  key={m.id}
                  m={m}
                  live={state.live?.messageId === m.id ? state.live : null}
                  actions={{
                    latest: m.id === lastId,
                    busy: running,
                    resetsOn,
                    onRegenerate: (key) => {
                      if (key) setModel(key);
                      stick.current = true;
                      void thread.regenerate(m.id, key ?? (usable(model) ? model : undefined));
                    },
                    onContinue: () => {
                      stick.current = true;
                      void thread.continueAnswer(m.id);
                    },
                    onFeedback: (v) => void thread.feedback(m.id, v),
                    onForget: (memoryId) => void thread.forget(m.id, memoryId),
                    onActionChanged: () => void thread.refreshPlans(),
                  }}
                />
              ),
            )}
          </div>
        </div>

        <div className="ct-bottom">
          <div className="ct-col">
            {state.notice && (
              <Banner tone="danger" onDismiss={thread.dismissNotice}>
                {state.notice.message}
              </Banner>
            )}
            <Composer
              menu={menu}
              model={model}
              onModelChange={setModel}
              rows={1}
              placeholder={
                outOfCredits
                  ? 'You’re out of credits'
                  : running
                    ? `${jack.name} is answering…`
                    : `Reply to ${jack.name}…`
              }
              label="Message"
              running={running}
              onStop={thread.stop}
              attachments
              apps={{
                off: appsOff,
                onChange: (off) => {
                  setAppsOff(off);
                  void api.PATCH('/api/chats/{id}', {
                    params: { path: { id: detail.chat.id } },
                    body: { appsOff: off },
                  });
                },
              }}
              onSend={(text, files) => {
                if (running) return false;
                stick.current = true;
                void thread.send(text, model, files);
              }}
            />
            <p className="ct-note">
              {outOfCredits
                ? 'You can still read and copy this chat.'
                : `${model === AUTO ? 'Auto picks the model for each message' : `${nameOf(menu, model)} answers your next message`}. Answers can be wrong — check important facts.`}
            </p>
          </div>
        </div>
      </div>
      <PlanPanel messages={state.messages} liveModel={state.live?.modelName ?? null} />
    </div>
  );
}
