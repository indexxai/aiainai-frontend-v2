'use client';
import Link from 'next/link';
import { Button, Dialog, Icon } from '@/ui';
import { costLabel, type ModelMenu, type ModelOption } from '@/lib/models';

const PRO_PERKS = [
  'GPT, Claude Opus, Gemini Pro and GPT Image',
  'More monthly credits, and top-ups that roll over',
  'Longer files and bigger uploads',
];

/** Shown when someone on Free picks a Pro model. */
export function UpgradeDialog({
  model,
  onClose,
  onUseAuto,
}: {
  model: ModelOption | null;
  onClose: () => void;
  onUseAuto: () => void;
}) {
  return (
    <Dialog
      open={!!model}
      title={model ? `${model.name} is on Jack Personal` : 'Unlock every model with Jack Personal'}
      description={
        model
          ? `On Jack Free you can use Auto and the fast models. Upgrade to choose ${model.name} and the other Jack Personal models.`
          : undefined
      }
      width={480}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onUseAuto}>
            Use Auto instead
          </Button>
          <Link href="/settings/billing" className="as-btn primary" onClick={onClose}>
            <Icon name="zap" size={16} />
            Upgrade to Jack Personal
          </Link>
        </>
      }
    >
      <ul className="mp-perks">
        {PRO_PERKS.map((p) => (
          <li key={p}>
            <Icon name="check" size={16} />
            {p}
          </li>
        ))}
      </ul>
    </Dialog>
  );
}

/** Every model side by side: what it's good at, cost and plan. */
export function CompareModelsDialog({
  menu,
  open,
  onClose,
}: {
  menu: ModelMenu;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog
      open={open}
      title="Compare models"
      description="Cost is per message, relative to the cheapest model. Auto picks for you and charges the model it used."
      width={960}
      onClose={onClose}
      footer={
        <>
          <span className="mp-foot-note">Model list and prices are managed by Jack’s AI and can change.</span>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </>
      }
    >
      <div className="mp-table-wrap">
        <table className="mp-table">
          <thead>
            <tr>
              <th scope="col">Model</th>
              <th scope="col">Provider</th>
              <th scope="col">Good at</th>
              <th scope="col">Strengths</th>
              <th scope="col">Cost</th>
              <th scope="col">Plan</th>
            </tr>
          </thead>
          <tbody>
            {menu.models.map((m) => (
              <tr key={m.key}>
                <th scope="row">{m.name}</th>
                <td className="muted">{m.provider}</td>
                <td className="muted">{m.description}</td>
                <td>
                  <span className="mp-tags">
                    {m.tags.map((t) => (
                      <span key={t} className="as-model-tag">
                        {t}
                      </span>
                    ))}
                  </span>
                </td>
                <td className="mono">{costLabel(m, menu.kind).replace(' credits', '')}</td>
                <td className="muted">{m.requiredPlan === 'pro' ? 'Jack Personal' : 'All plans'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Dialog>
  );
}
