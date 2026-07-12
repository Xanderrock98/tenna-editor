import type { ChapterIndex } from '@data';
import type { Save, SaveSlot } from '@types';

export type RawSaveSlot = 0 | 1 | 2 | 3 | 4 | 5;

export interface SaveExportTarget {
  save: Save;
  chapter: ChapterIndex;
  slot: SaveSlot;
  isCompletionSave: boolean;
}

export interface SaveExportCell {
  chapter: ChapterIndex;
  rawSlot: RawSaveSlot;
  save: Save | null;
}

export function getRawSaveSlot(target: {
  slot: SaveSlot;
  isCompletionSave: boolean;
}): number {
  return target.isCompletionSave ? target.slot + 3 : target.slot;
}

export function getPcSaveFileName(target: {
  chapter: ChapterIndex;
  slot?: SaveSlot;
  isCompletionSave?: boolean;
  rawSlot?: RawSaveSlot;
}): string {
  const rawSlot =
    target.rawSlot ??
    getRawSaveSlot(target as { slot: SaveSlot; isCompletionSave: boolean });
  return `filech${target.chapter}_${rawSlot}`;
}

export function getIniSectionName(target: {
  chapter: ChapterIndex;
  slot?: SaveSlot;
  isCompletionSave?: boolean;
  rawSlot?: RawSaveSlot;
}): string {
  const rawSlot =
    target.rawSlot ??
    getRawSaveSlot(target as { slot: SaveSlot; isCompletionSave: boolean });
  return target.chapter === 1
    ? `G${rawSlot}`
    : `G_${target.chapter}_${rawSlot}`;
}

export function getTargetKey(target: {
  chapter: ChapterIndex;
  slot?: SaveSlot;
  isCompletionSave?: boolean;
  rawSlot?: RawSaveSlot;
}): string {
  return getPcSaveFileName(target).toLowerCase();
}
