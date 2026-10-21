'use client';
import { createContext, useContext } from 'react';
import type { Space } from './space';

/** The space the signed-in screens are in (set by the app shell), so Jack's face matches it. */
export const SpaceContext = createContext<Space>('personal');
export const useSpace = () => useContext(SpaceContext);
