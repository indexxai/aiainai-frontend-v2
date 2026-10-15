import type { IconName } from '@/ui';
import type { Schemas } from '@/lib/api/client';

export type Team = Schemas['TeamDto'];
export type Agent = Schemas['AgentDto'];
export type Analysis = Schemas['AnalysisDto'];
export type Proposal = Schemas['ProposalDto'];
export type ProposedAgent = Schemas['ProposedAgentDto'];
export type TeamMode = Team['mode'];
export type AgentStatus = Agent['status'];

export const AGENT_STATUS_LABEL: Record<AgentStatus, string> = {
  working: 'Working',
  idle: 'Idle',
  waiting: 'Needs you',
  blocked: 'Blocked',
  error: 'Problem',
  paused: 'Paused',
  done: 'Done',
  setup: 'Needs setup',
};

export const MODES: { value: TeamMode; label: string }[] = [
  { value: 'important', label: 'Ask me before anything important' },
  { value: 'all', label: 'Ask me before everything' },
  { value: 'auto', label: 'Let the team run on its own' },
];

/** "Try an example" on the AI Crews landing page (design: TeamFlow). */
export const EXAMPLES: { label: string; icon: IconName; text: string }[] = [
  {
    label: 'Roofing',
    icon: 'house',
    text: 'I run a roofing company. Leads come from Google and Facebook, we send quotes by email and track jobs in HubSpot. I want faster follow-ups and more social posts.',
  },
  {
    label: 'Restaurant',
    icon: 'utensils-crossed',
    text: 'I own a small Italian restaurant. I want more bookings, regular Instagram posts, a monthly newsletter and replies to reviews.',
  },
  {
    label: 'Agency',
    icon: 'megaphone',
    text: 'I run a small marketing agency with 6 clients. We write content and design ads for them, send weekly updates by Gmail and track deals in HubSpot.',
  },
];
