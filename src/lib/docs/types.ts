import type { IconName } from '@/ui';
import type { Schemas } from '@/lib/api/client';

export type Doc = Schemas['DocDto'];
export type DocSummary = Schemas['DocSummaryDto'];
export type DocType = Doc['type'];
export type DocLength = Doc['length'];
export type DocTone = Doc['tone'];
export type Section = Schemas['SectionDto'];
export type Estimates = Schemas['EstimatesDto'];

export const TYPE_INFO: Record<DocType, { label: string; icon: IconName; hint: string }> = {
  proposal: { label: 'Proposal', icon: 'file-signature', hint: 'Win a client' },
  report: { label: 'Report', icon: 'chart-column', hint: 'Explain findings' },
  letter: { label: 'Letter or email', icon: 'mail', hint: 'Formal message' },
  plan: { label: 'Plan', icon: 'list-checks', hint: 'Steps and owners' },
  article: { label: 'Article', icon: 'newspaper', hint: 'For your blog' },
  'meeting-notes': { label: 'Meeting notes', icon: 'notebook-pen', hint: 'Decisions and actions' },
  other: { label: 'Document', icon: 'file-text', hint: 'Anything else' },
};

/** The five types offered on the Docs landing page, in the design's order. */
export const MAIN_TYPES: DocType[] = ['proposal', 'report', 'letter', 'plan', 'article'];

export interface Template {
  id: string;
  title: string;
  hint: string;
  icon: IconName;
  type: DocType;
  group: 'Business' | 'Marketing' | 'Personal';
  docTitle: string;
  sections: string[];
}

/** Templates skip the AI outline (free): they open the outline step pre-filled. */
export const TEMPLATES: Template[] = [
  {
    id: 'proposal',
    title: 'Project proposal',
    hint: 'Scope, timeline and price',
    icon: 'file-signature',
    type: 'proposal',
    group: 'Business',
    docTitle: 'Proposal for [Client name]',
    sections: ['Summary', 'Scope', 'Timeline', 'Price', 'Next steps'],
  },
  {
    id: 'monthly-report',
    title: 'Monthly report',
    hint: 'Results, charts and next steps',
    icon: 'chart-column',
    type: 'report',
    group: 'Business',
    docTitle: '[Month] report',
    sections: ['Summary', 'Results', 'What changed', 'Next steps'],
  },
  {
    id: 'meeting-notes',
    title: 'Meeting notes',
    hint: 'Decisions and action items',
    icon: 'notebook-pen',
    type: 'meeting-notes',
    group: 'Business',
    docTitle: '[Meeting] notes',
    sections: ['Attendees', 'Decisions', 'Action items'],
  },
  {
    id: 'press-release',
    title: 'Press release',
    hint: 'News in the standard format',
    icon: 'megaphone',
    type: 'article',
    group: 'Marketing',
    docTitle: '[Company] announces [news]',
    sections: ['Headline and summary', 'The news', 'Quote', 'About [Company]'],
  },
  {
    id: 'blog-post',
    title: 'Blog post',
    hint: 'Intro, sections, call to action',
    icon: 'newspaper',
    type: 'article',
    group: 'Marketing',
    docTitle: '[Blog post title]',
    sections: ['Introduction', 'The main idea', 'How to do it', 'Call to action'],
  },
  {
    id: 'cover-letter',
    title: 'Cover letter',
    hint: 'For a job application',
    icon: 'mail',
    type: 'letter',
    group: 'Personal',
    docTitle: 'Cover letter — [Role] at [Company]',
    sections: ['Opening', 'Why I’m a good fit', 'Closing'],
  },
  {
    id: 'one-pager',
    title: 'Product one-pager',
    hint: 'What it is and why it matters',
    icon: 'presentation',
    type: 'other',
    group: 'Marketing',
    docTitle: '[Product] one-pager',
    sections: ['What it is', 'Who it’s for', 'Why it matters', 'How to get it'],
  },
  {
    id: 'sop',
    title: 'Standard operating procedure',
    hint: 'Step-by-step how-to',
    icon: 'list-ordered',
    type: 'plan',
    group: 'Business',
    docTitle: 'How to [task]',
    sections: ['Purpose', 'Before you start', 'Steps', 'Checks'],
  },
];

export const POPULAR: { icon: IconName; label: string; type: DocType; brief: string }[] = [
  {
    icon: 'file-signature',
    label: 'A proposal for a new client, from my notes',
    type: 'proposal',
    brief: 'A proposal for a new client. My notes: ',
  },
  {
    icon: 'chart-column',
    label: 'A monthly report from a spreadsheet',
    type: 'report',
    brief: 'A monthly report on these numbers: ',
  },
  {
    icon: 'list-ordered',
    label: 'A step-by-step guide for new staff',
    type: 'plan',
    brief: 'A step-by-step guide for new staff on how to ',
  },
];

export const LENGTH_OPTIONS: { value: DocLength; label: string }[] = [
  { value: 'short', label: 'Short' },
  { value: 'medium', label: 'Medium' },
  { value: 'long', label: 'Long' },
];
export const TONE_OPTIONS: { value: DocTone; label: string }[] = [
  { value: 'professional', label: 'Professional' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'persuasive', label: 'Persuasive' },
];

/** Reading time at ~230 words a minute. */
export const readMinutes = (words: number) => Math.max(1, Math.round(words / 230));
