import type { ChapterIndex } from '@data';
import type { Save } from '@types';
import {
  getIniSectionName,
  type RawSaveSlot,
  type SaveExportCell,
} from './save-export-targets';

const GAME_MAKER_DATE_UNIX_EPOCH = 25569;
const MS_PER_DAY = 86400000;

type IniValue = string | number;
type IniSection = Map<string, string>;

const SLOT_FIELDS = [
  'Name',
  'Level',
  'Love',
  'Time',
  'Date',
  'Room',
  'InitLang',
  'UraBoss',
  'Version',
  'SideB',
  'Ch4Boss',
  'Microphone',
  'right_click_mic',
  'Mic Sensitivity',
];

function getGameMakerDate(date = new Date()): number {
  return GAME_MAKER_DATE_UNIX_EPOCH + date.getTime() / MS_PER_DAY;
}

function formatReal(value: number): string {
  return `"${value.toFixed(6)}"`;
}

function formatString(value: string): string {
  return `"${value.replace(/\r?\n/g, ' ').replace(/"/g, '\\"')}"`;
}

function formatIniValue(value: IniValue): string {
  return typeof value === 'number' ? formatReal(value) : formatString(value);
}

function parseIniValue(value: string | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function parseIni(content: string): Map<string, IniSection> {
  const sections = new Map<string, IniSection>();
  let currentSection: IniSection | null = null;

  for (const rawLine of content.replace(/\r\n/g, '\n').split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;

    const sectionMatch = line.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection =
        sections.get(sectionMatch[1]) ?? new Map<string, string>();
      sections.set(sectionMatch[1], currentSection);
      continue;
    }

    if (!currentSection) continue;
    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 0) continue;

    currentSection.set(
      line.slice(0, separatorIndex).trim(),
      line.slice(separatorIndex + 1).trim(),
    );
  }

  return sections;
}

function getSectionValue(
  sections: Map<string, IniSection>,
  sectionName: string,
  key: string,
): string | null {
  return parseIniValue(sections.get(sectionName)?.get(key));
}

function getInitLang(save: Save): number {
  return Number(save.flags[912]) || 0;
}

function getUraBoss(save: Save, chapter: ChapterIndex): number {
  if (chapter === 1) {
    const jevilFlag = Number(save.flags[241]) || 0;
    if (jevilFlag === 6) return 1;
    if (jevilFlag === 7) return 2;
    return 0;
  }

  if (chapter === 2) {
    const spamtonFlag = Number(save.flags[571]) || 0;
    if (spamtonFlag === 1) return 1;
    if (spamtonFlag === 2) return 2;
    return 0;
  }

  const secretBossFlags: Partial<Record<ChapterIndex, number>> = {
    3: 1047,
    4: 852,
    5: 1908,
  };
  return Number(save.flags[secretBossFlags[chapter] ?? 0]) || 0;
}

function isSideBActive(save: Save): boolean {
  return Number(save.flags[916]) === 0 && Number(save.flags[915]) >= 7;
}

function sectionEntries(values: Record<string, IniValue>): IniSection {
  const section = new Map<string, string>();
  for (const [key, value] of Object.entries(values)) {
    section.set(key, formatIniValue(value));
  }
  return section;
}

function getExistingNumber(
  sections: Map<string, IniSection>,
  sectionName: string,
  key: string,
  fallback: number,
): number {
  const value = Number(getSectionValue(sections, sectionName, key));
  return Number.isFinite(value) ? value : fallback;
}

function getExistingVersion(
  sections: Map<string, IniSection>,
  sectionName: string,
): string {
  return getSectionValue(sections, sectionName, 'Version') ?? '0';
}

function buildSaveSection(
  cell: SaveExportCell,
  baseSections: Map<string, IniSection>,
  date: Date,
): IniSection {
  if (!cell.save) return buildEmptySection(cell.chapter);

  const sectionName = getIniSectionName(cell);
  const values: Record<string, IniValue> = {
    Name: cell.save.playerName,
    Level: cell.save.lv,
    Love: cell.save.lightWorld.level,
    Time: cell.save.time,
    Date: getGameMakerDate(date),
    Room: cell.save.room,
    InitLang: getInitLang(cell.save),
    UraBoss: getUraBoss(cell.save, cell.chapter),
    Version: getExistingVersion(baseSections, sectionName),
  };

  if (cell.rawSlot >= 3) {
    values.SideB = isSideBActive(cell.save) ? 1 : 0;
  } else if (baseSections.get(sectionName)?.has('SideB')) {
    values.SideB = getExistingNumber(baseSections, sectionName, 'SideB', 0);
  }

  if (cell.chapter === 4) {
    values.Ch4Boss = getExistingNumber(baseSections, sectionName, 'Ch4Boss', 0);
    values.Microphone = getExistingNumber(
      baseSections,
      sectionName,
      'Microphone',
      0,
    );
    values.right_click_mic = getExistingNumber(
      baseSections,
      sectionName,
      'right_click_mic',
      0,
    );
    values['Mic Sensitivity'] = getExistingNumber(
      baseSections,
      sectionName,
      'Mic Sensitivity',
      0.5,
    );
  }

  return sectionEntries(values);
}

function buildEmptySection(chapter: ChapterIndex): IniSection {
  const values: Record<string, IniValue> = {
    Name: '[EMPTY]',
    Level: 0,
    Love: 0,
    Time: 0,
    Room: 0,
    Date: 0,
    UraBoss: 0,
    Version: '0',
  };

  if (chapter >= 3) values.SideB = 0;
  if (chapter === 4) values.Ch4Boss = 0;

  return sectionEntries(values);
}

function mergeUraSection(
  sections: Map<string, IniSection>,
  cells: SaveExportCell[],
): void {
  const ura = sections.get('URA') ?? new Map<string, string>();
  for (const cell of cells) {
    if (!cell.save) continue;
    const normalizedSlot = cell.rawSlot >= 3 ? cell.rawSlot - 3 : cell.rawSlot;
    const key = `${cell.chapter}_${normalizedSlot}`;
    const result = getUraBoss(cell.save, cell.chapter);
    if (result <= 0) continue;

    const currentResult = Number(parseIniValue(ura.get(key))) || 0;
    const nextResult = result + currentResult === 3 ? 3 : result;
    ura.set(key, formatReal(nextResult));
  }
  if (ura.size > 0) sections.set('URA', ura);
}

function serializeIni(sections: Map<string, IniSection>): string {
  const output: string[] = [];
  for (const [sectionName, values] of sections.entries()) {
    output.push(`[${sectionName}]`);
    for (const [key, value] of values.entries()) {
      output.push(`${key}=${value}`);
    }
  }

  return `${output.join('\n')}\n`;
}

export function generateDrIni(
  cells: SaveExportCell[],
  baseIni = '',
  date = new Date(),
): string {
  const sections = parseIni(baseIni);

  for (const cell of cells) {
    const sectionName = getIniSectionName(cell);
    const existingSection = sections.get(sectionName);
    const nextSection = buildSaveSection(cell, sections, date);

    // Don't create new empty sections for unused slots
    if (!cell.save && !existingSection) continue;

    if (existingSection) {
      for (const key of SLOT_FIELDS) existingSection.delete(key);
      for (const [key, value] of nextSection.entries()) {
        existingSection.set(key, value);
      }
    } else {
      sections.set(sectionName, nextSection);
    }
  }

  mergeUraSection(sections, cells);
  return serializeIni(sections);
}

export function getAllDrIniCells(): SaveExportCell[] {
  const cells: SaveExportCell[] = [];
  for (let chapter = 1 as ChapterIndex; chapter <= 5; chapter += 1) {
    for (let rawSlot = 0 as RawSaveSlot; rawSlot <= 5; rawSlot += 1) {
      cells.push({ chapter, rawSlot, save: null });
    }
  }
  return cells;
}
