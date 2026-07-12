import type { SaveSlot } from '@types';
import { browserDatabase, EXPORT_DRAFTS_STORE } from './browser-database';

export const EXPORT_DRAFT_VERSION = 1;

export type ExportMode = 'pc' | 'switch';
export type ExportScope = 'single' | 'set';
export type ExportFileNameKey = `${ExportMode}-${ExportScope}`;
export type ExportFileNames = Partial<Record<ExportFileNameKey, string>>;

export interface ExportDraftSelection {
  selected: boolean;
  slotOverride?: SaveSlot;
  completionOverride?: boolean;
}

export interface ExportDraft {
  version: typeof EXPORT_DRAFT_VERSION;
  mode: ExportMode;
  scope: ExportScope;
  selectedSlot: SaveSlot;
  isCompletionSave: boolean;
  fileNames: ExportFileNames;
  selections: Record<string, ExportDraftSelection>;
  baseDrIni?: {
    name: string;
    content: string;
  };
  baseContainer?: {
    name: string;
    files: Record<string, string>;
  };
}

const DRAFT_KEY = 'default';

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isSaveSlot(value: unknown): value is SaveSlot {
  return value === 0 || value === 1 || value === 2;
}

function parseSelections(value: unknown): Record<string, ExportDraftSelection> {
  if (!isRecord(value)) return {};

  const selections: Record<string, ExportDraftSelection> = {};
  for (const [saveId, candidate] of Object.entries(value)) {
    if (!isRecord(candidate) || typeof candidate.selected !== 'boolean') {
      continue;
    }

    const selection: ExportDraftSelection = {
      selected: candidate.selected,
    };
    if (isSaveSlot(candidate.slotOverride)) {
      selection.slotOverride = candidate.slotOverride;
    }
    if (typeof candidate.completionOverride === 'boolean') {
      selection.completionOverride = candidate.completionOverride;
    }
    selections[saveId] = selection;
  }
  return selections;
}

function parseStringRecord(value: unknown): Record<string, string> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== 'string') return null;
    result[key] = entry;
  }
  return result;
}

function parseFileNames(value: unknown): ExportFileNames {
  if (!isRecord(value)) return {};

  const fileNames: ExportFileNames = {};
  const keys: ExportFileNameKey[] = [
    'pc-single',
    'pc-set',
    'switch-single',
    'switch-set',
  ];
  for (const key of keys) {
    if (typeof value[key] === 'string') fileNames[key] = value[key];
  }
  return fileNames;
}

function parseDraft(value: unknown): ExportDraft | null {
  if (!isRecord(value) || value.version !== EXPORT_DRAFT_VERSION) return null;
  if (value.mode !== 'pc' && value.mode !== 'switch') return null;
  if (value.scope !== 'single' && value.scope !== 'set') return null;
  if (!isSaveSlot(value.selectedSlot)) return null;
  if (typeof value.isCompletionSave !== 'boolean') return null;

  const draft: ExportDraft = {
    version: EXPORT_DRAFT_VERSION,
    mode: value.mode,
    scope: value.scope,
    selectedSlot: value.selectedSlot,
    isCompletionSave: value.isCompletionSave,
    fileNames: parseFileNames(value.fileNames),
    selections: parseSelections(value.selections),
  };

  if (
    isRecord(value.baseDrIni) &&
    typeof value.baseDrIni.name === 'string' &&
    typeof value.baseDrIni.content === 'string'
  ) {
    draft.baseDrIni = {
      name: value.baseDrIni.name,
      content: value.baseDrIni.content,
    };
  }

  if (
    isRecord(value.baseContainer) &&
    typeof value.baseContainer.name === 'string'
  ) {
    const files = parseStringRecord(value.baseContainer.files);
    if (files) {
      draft.baseContainer = {
        name: value.baseContainer.name,
        files,
      };
    }
  }

  return draft;
}

async function get(): Promise<ExportDraft | null> {
  try {
    const db = await browserDatabase;
    const value = await db.get(EXPORT_DRAFTS_STORE, DRAFT_KEY);
    return parseDraft(value);
  } catch (error) {
    console.error('export-draft-storage: get failed', error);
    return null;
  }
}

async function set(draft: ExportDraft): Promise<void> {
  try {
    const db = await browserDatabase;
    await db.put(EXPORT_DRAFTS_STORE, draft, DRAFT_KEY);
  } catch (error) {
    console.error('export-draft-storage: set failed', error);
  }
}

export const exportDraftStorage = { get, set };
