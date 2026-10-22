'use client';
import { createContext, useContext } from 'react';
import { useSpace } from './space-context';
import type { Space } from './space';

/** The Personal assistant's name (the person may have renamed Jack). */
export interface AssistantName {
  /** In sentences: "Tell Max what you need". */
  name: string;
  /** On his own: the sidebar, the answer label ("Jack of all trades" until renamed). */
  title: string;
  custom: boolean;
}

export const DEFAULT_ASSISTANT: AssistantName = { name: 'Jack', title: 'Jack of all trades', custom: false };
const CAPTAIN: AssistantName = { name: 'Captain Jack', title: 'Captain Jack', custom: false };

/** Set by the app shell from the signed-in account. */
export const AssistantContext = createContext<AssistantName>(DEFAULT_ASSISTANT);

/** The assistant of a space: the person's own name for him in Personal, Captain Jack in Business. */
export function assistantFor(space: Space, personal: AssistantName): AssistantName {
  return space === 'business' ? CAPTAIN : personal;
}

/** This space's assistant (or the given space's). */
export function useJack(space?: Space): AssistantName {
  const current = useSpace();
  return assistantFor(space ?? current, useContext(AssistantContext));
}

/** "Jack’s browser", "Max’s plan". */
export const possessive = (name: string) => `${name}’s`;
