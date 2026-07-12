import { useSave } from '@store';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Badge,
  TextLabel,
  TextInput,
  Checkbox,
  Button,
  type SelectItem,
  Select,
  InlineGroup,
  DownloadChanges,
  ModalLayout,
  ModalFooter,
  SaveSourceBadge,
} from '@components';
import {
  exportDraftStorage,
  saveStorage,
  toast,
  type ExportDraft,
  type ExportDraftSelection,
  type ExportFileNameKey,
  type ExportFileNames,
  type ExportMode,
  type ExportScope,
  EXPORT_DRAFT_VERSION,
} from '@services';
import { getBaselineRevision } from '@utils/save-diff';
import {
  buildPcExportFromTargets,
  buildSwitchExportSet,
  cloneSaveForTarget,
  findDuplicateExportTargets,
} from '@utils/save-export';
import { serializeSave } from '@utils/save-serializer';
import type { Save, SaveSlot } from '@types';
import {
  getTargetKey,
  type SaveExportTarget,
} from '@utils/save-export-targets';
import { parseSwitchSaveContainer } from '@utils/switch-save-container';
import { formatTranslation, useTranslation } from '../i18n';
import { mergeClass } from '@utils/merge-class';

const SLOT_OPTIONS: SelectItem[] = [
  { id: '1', label: 'Slot 1' },
  { id: '2', label: 'Slot 2' },
  { id: '3', label: 'Slot 3' },
] as const;

const EXPORT_OPTIONS: SelectItem[] = [
  { id: 'pc', label: 'PC save file', value: 'pc' },
  { id: 'switch', label: 'Switch container', value: 'switch' },
] as const;

interface SaveSelection {
  save: Save;
  selected: boolean;
  slotOverride?: SaveSlot;
  completionOverride?: boolean;
}

interface DownloadProps {
  isOpen: boolean;
  setOpen: (state: boolean) => void;
}

function sortSaves(saves: Save[]): Save[] {
  return saves.sort(
    (a, b) =>
      new Date(a.meta.createdAt).getTime() -
      new Date(b.meta.createdAt).getTime(),
  );
}

function buildSelections(
  saves: Save[],
  draft: Record<string, ExportDraftSelection> | undefined,
  activeSaveId?: string,
): Map<string, SaveSelection> {
  const hasDraft = draft !== undefined;
  const selections = new Map<string, SaveSelection>();
  for (const save of saves) {
    const existing = draft?.[save.meta.id];
    selections.set(save.meta.id, {
      save,
      selected:
        existing?.selected ?? (!hasDraft && save.meta.id === activeSaveId),
      slotOverride: existing?.slotOverride,
      completionOverride: existing?.completionOverride,
    });
  }
  return selections;
}

function serializeSelections(
  selections: Map<string, SaveSelection>,
): Record<string, ExportDraftSelection> {
  return Object.fromEntries(
    Array.from(selections.entries(), ([saveId, selection]) => [
      saveId,
      {
        selected: selection.selected,
        slotOverride: selection.slotOverride,
        completionOverride: selection.completionOverride,
      },
    ]),
  );
}

function createExportTimestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

export function Download({ isOpen, setOpen }: DownloadProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const save = useSave((s) => s.save);
  const captureBaseline = useSave((s) => s.captureBaseline);
  const baselineRevision = useSave((s) =>
    getBaselineRevision(s.save?.meta.baseline),
  );
  const [selectedSlot, setSelectedSlot] = useState<SaveSlot>(
    (save?.meta.slot ?? 0) as SaveSlot,
  );
  const [isCompletionSave, setIsCompletionSave] = useState(
    save?.meta.isCompletionSave ?? false,
  );
  const [exportMode, setExportMode] = useState<ExportMode>('pc');
  const [exportScope, setExportScope] = useState<ExportScope>('single');
  const [exportTimestamp] = useState(createExportTimestamp);
  const [fileNames, setFileNames] = useState<ExportFileNames>({});
  const [storedSaves, setStoredSaves] = useState<Save[]>([]);
  const [selections, setSelections] = useState<Map<string, SaveSelection>>(
    () => new Map(),
  );

  const [baseDrIni, setBaseDrIni] = useState('');
  const [baseDrIniName, setBaseDrIniName] = useState('');

  const [baseContainer, setBaseContainer] = useState<
    Record<string, string> | undefined
  >(undefined);
  const [baseContainerName, setBaseContainerName] = useState('');
  const [hasHydratedExportDraft, setHasHydratedExportDraft] = useState(false);

  const pcFileName = save
    ? `filech${save.meta.chapter}_${isCompletionSave ? selectedSlot + 3 : selectedSlot}`
    : '';

  const selectedExportTargets: SaveExportTarget[] = Array.from(
    selections.values(),
  )
    .filter((sel) => sel.selected)
    .map((sel) => ({
      save: sel.save,
      chapter: sel.save.meta.chapter,
      slot: sel.slotOverride ?? sel.save.meta.slot,
      isCompletionSave:
        sel.completionOverride ?? sel.save.meta.isCompletionSave,
    }));

  const duplicates = findDuplicateExportTargets(selectedExportTargets);
  const hasDuplicateError = duplicates.length > 0;

  const hasExportSetError =
    exportScope === 'set' &&
    (selectedExportTargets.length === 0 || hasDuplicateError);

  const defaultFileName =
    exportScope === 'set'
      ? exportMode === 'switch'
        ? 'deltarune.sav'
        : `tenna-saves-${exportTimestamp}.zip`
      : exportMode === 'switch'
        ? 'deltarune.sav'
        : pcFileName;
  const fileNameKey: ExportFileNameKey = `${exportMode}-${exportScope}`;
  const displayedFileName = Object.hasOwn(fileNames, fileNameKey)
    ? (fileNames[fileNameKey] ?? '')
    : defaultFileName;
  const fileName = displayedFileName.trim() || defaultFileName;

  const slotOptions = SLOT_OPTIONS.map((item, index) => ({
    ...item,
    label: `${t('ui.field.slot', 'Slot')} ${index + 1}`,
  }));

  function onSlotSelection(item: SelectItem | null) {
    if (item) {
      setSelectedSlot((parseInt(item.id, 10) - 1) as SaveSlot);
    }
  }

  function onExportModeSelection(item: SelectItem | null) {
    if (item?.value === 'pc' || item?.value === 'switch') {
      setExportMode(item.value);
    }
  }

  function getSingleExportTarget(save: Save): SaveExportTarget {
    return {
      save,
      chapter: save.meta.chapter,
      slot: selectedSlot,
      isCompletionSave,
    };
  }

  function updateSelection(
    id: string,
    patch: Partial<Omit<SaveSelection, 'save'>>,
  ) {
    setSelections((prev) => {
      const next = new Map(prev);
      const existing = next.get(id);
      if (existing) {
        next.set(id, { ...existing, ...patch });
      }
      return next;
    });
  }

  function readBaseDrIni(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      setBaseDrIni(String(reader.result ?? ''));
      setBaseDrIniName(file.name);
    };
    reader.readAsText(file);
  }

  function readBaseContainer(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result ?? '');
      try {
        const parsed = parseSwitchSaveContainer(content);
        if (parsed) {
          setBaseContainer(parsed.files);
          setBaseContainerName(file.name);
        } else {
          toast(
            t(
              'ui.upload.invalidSwitchContainer',
              'Invalid Switch container file',
            ),
            'error',
          );
        }
      } catch {
        toast(
          t(
            'ui.upload.invalidSwitchContainer',
            'Invalid Switch container file',
          ),
          'error',
        );
      }
    };
    reader.readAsText(file);
  }

  function getDownloadPayload(save: Save): string | Uint8Array {
    if (exportScope === 'set') {
      if (exportMode === 'switch')
        return buildSwitchExportSet(selectedExportTargets, baseContainer);
      return buildPcExportFromTargets(selectedExportTargets, baseDrIni);
    }

    const target = getSingleExportTarget(save);
    if (exportMode === 'switch') {
      const base =
        save.meta.source?.platform === 'switch'
          ? save.meta.source.container
          : undefined;
      return buildSwitchExportSet([target], base);
    }

    return serializeSave(cloneSaveForTarget(target));
  }

  function resetExportSettings() {
    const activeSave = useSave.getState().save;
    setSelectedSlot((activeSave?.meta.slot ?? 0) as SaveSlot);
    setIsCompletionSave(activeSave?.meta.isCompletionSave ?? false);
    setExportMode(
      activeSave?.meta.source?.platform === 'switch' ? 'switch' : 'pc',
    );
    setExportScope('single');
    setFileNames({});
    setSelections(buildSelections(storedSaves, undefined, activeSave?.meta.id));
    setBaseDrIni('');
    setBaseDrIniName('');
    setBaseContainer(undefined);
    setBaseContainerName('');
  }

  async function downloadSave() {
    if (!save) return;
    if (hasExportSetError) {
      if (selectedExportTargets.length === 0) {
        toast(
          t(
            'ui.download.selectAtLeastOneSave',
            'Select at least one save for export.',
          ),
          'error',
        );
      } else if (hasDuplicateError) {
        toast(
          t(
            'ui.download.resolveConflicts',
            'Resolve conflicting slots before downloading.',
          ),
          'error',
        );
      }
      return;
    }

    try {
      const serializedSave = getDownloadPayload(save);
      const blobPart =
        typeof serializedSave === 'string'
          ? serializedSave
          : new Uint8Array(serializedSave);
      const blob = new Blob([blobPart], {
        type:
          exportScope === 'set' && exportMode === 'pc'
            ? 'application/zip'
            : 'application/octet-stream',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 10_000);

      if (exportScope === 'single') {
        await captureBaseline('download');
      }
    } catch (error) {
      console.error('Save export failed:', error);
      toast(
        formatTranslation(
          t(
            'ui.download.exportFailed',
            'Could not create the export: {message}',
          ),
          {
            message:
              error instanceof Error
                ? error.message
                : t('ui.common.unknown', 'Unknown error'),
          },
        ),
        'error',
      );
    }
  }

  useEffect(() => {
    if (isOpen && !save) {
      setOpen(false);
      toast(
        t(
          'ui.download.noSaveLoadedCurrently',
          'There is no save loaded currently',
        ),
        'error',
      );
    }
  }, [isOpen, save, setOpen, t]);

  useEffect(() => {
    let cancelled = false;
    async function hydrateExportDraft() {
      const [draft, saves] = await Promise.all([
        exportDraftStorage.get(),
        saveStorage.getAll(),
      ]);
      if (cancelled) return;

      const activeSave = useSave.getState().save;
      const sortedSaves = sortSaves(saves);
      setStoredSaves(sortedSaves);

      if (draft) {
        setSelectedSlot(draft.selectedSlot);
        setIsCompletionSave(draft.isCompletionSave);
        setExportMode(draft.mode);
        setExportScope(draft.scope);
        setFileNames(draft.fileNames);
        setSelections(
          buildSelections(sortedSaves, draft.selections, activeSave?.meta.id),
        );
        setBaseDrIni(draft.baseDrIni?.content ?? '');
        setBaseDrIniName(draft.baseDrIni?.name ?? '');
        setBaseContainer(draft.baseContainer?.files);
        setBaseContainerName(draft.baseContainer?.name ?? '');
      } else {
        setSelectedSlot((activeSave?.meta.slot ?? 0) as SaveSlot);
        setIsCompletionSave(activeSave?.meta.isCompletionSave ?? false);
        setExportMode(
          activeSave?.meta.source?.platform === 'switch' ? 'switch' : 'pc',
        );
        setSelections(
          buildSelections(sortedSaves, undefined, activeSave?.meta.id),
        );
      }

      setHasHydratedExportDraft(true);
    }

    void hydrateExportDraft();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hasHydratedExportDraft) return;

    const draft: ExportDraft = {
      version: EXPORT_DRAFT_VERSION,
      mode: exportMode,
      scope: exportScope,
      selectedSlot,
      isCompletionSave,
      fileNames,
      selections: serializeSelections(selections),
      baseDrIni: baseDrIniName
        ? { name: baseDrIniName, content: baseDrIni }
        : undefined,
      baseContainer:
        baseContainerName && baseContainer
          ? { name: baseContainerName, files: baseContainer }
          : undefined,
    };
    void exportDraftStorage.set(draft);
  }, [
    baseContainer,
    baseContainerName,
    baseDrIni,
    baseDrIniName,
    exportMode,
    exportScope,
    fileNames,
    hasHydratedExportDraft,
    isCompletionSave,
    selectedSlot,
    selections,
  ]);

  useEffect(() => {
    if (!isOpen || !hasHydratedExportDraft) return;

    let cancelled = false;
    async function loadSaves() {
      const saves = await saveStorage.getAll();
      if (cancelled) return;

      const sortedSaves = sortSaves(saves);
      setStoredSaves(sortedSaves);

      setSelections((previous) => {
        return buildSelections(
          sortedSaves,
          serializeSelections(previous),
          save?.meta.id,
        );
      });
    }

    void loadSaves().catch((error: unknown) => {
      console.error('Stored saves could not be loaded for export:', error);
      if (!cancelled) {
        setStoredSaves([]);
        setSelections(new Map());
        toast(
          t('ui.download.loadSavesFailed', 'Stored saves could not be loaded.'),
          'error',
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [hasHydratedExportDraft, isOpen, save?.meta.id, t]);

  return (
    <ModalLayout
      isOpen={isOpen}
      setOpen={setOpen}
      title={
        exportScope === 'set'
          ? t('ui.download.downloadMultipleSaves', 'Download multiple saves')
          : t('ui.download.downloadSave', 'Download Save')
      }
      size="tall"
      panelClassName={
        exportScope === 'set'
          ? 'w-[min(100%,64rem)] h-auto max-h-[calc(100dvh-2rem)]'
          : ''
      }
      bodyClassName="min-h-0 overflow-hidden gap-5 flex-1"
      footer={
        <ModalFooter
          className="flex-col gap-3 sm:flex-row sm:justify-between"
          aria-live="polite"
        >
          <InlineGroup className="min-w-0 gap-2 sm:flex-1 sm:mr-4">
            <span className="text-sm text-text-2 whitespace-nowrap shrink-0">
              {t('ui.download.savesAs', 'Saves as')}
            </span>
            <TextInput
              size="small"
              className="min-w-0 max-w-72 flex-1"
              value={displayedFileName}
              onChange={(value) =>
                setFileNames((previous) => ({
                  ...previous,
                  [fileNameKey]: value,
                }))
              }
              onBlur={() => {
                const value = fileNames[fileNameKey]?.trim();
                setFileNames((previous) => {
                  if (value) return { ...previous, [fileNameKey]: value };
                  const next = { ...previous };
                  delete next[fileNameKey];
                  return next;
                });
              }}
              aria-label={t('ui.download.fileName', 'Download file name')}
            />
          </InlineGroup>
          <Button
            onClick={resetExportSettings}
            variant="secondary"
            size="lg"
            className="w-full shrink-0 sm:w-auto"
          >
            {t('ui.download.resetSettings', 'Reset settings')}
          </Button>
          <Button
            onClick={() => void downloadSave()}
            variant="primary"
            size="lg"
            className="w-full shrink-0 sm:w-auto sm:min-w-52"
            disabled={hasExportSetError}
          >
            {exportScope === 'set'
              ? t(
                  'ui.download.downloadMultipleSaves',
                  'Download multiple saves',
                )
              : t('ui.download.downloadSaveFile', 'Download save file')}
          </Button>
        </ModalFooter>
      }
    >
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}
          className={mergeClass('flex flex-col gap-5 min-h-0 flex-1')}
        >
          <div className="shrink-0 flex flex-wrap items-end gap-3">
            <div className="w-56 max-w-full">
              <div className="flex items-center justify-between gap-2">
                <TextLabel>{t('ui.download.exportAs', 'Export as')}</TextLabel>
                {exportMode === 'switch' && (
                  <Badge
                    tone="yellow"
                    size="sm"
                    className="h-5 px-1.5 text-[0.65rem] opacity-80"
                    title={t(
                      'ui.download.switchExperimentalNotice',
                      'Switch export is experimental.',
                    )}
                  >
                    {t('ui.download.experimental', 'Experimental')}
                  </Badge>
                )}
              </div>
              <Select
                items={EXPORT_OPTIONS.map((item) => ({
                  ...item,
                  label:
                    item.id === 'pc'
                      ? t('ui.download.pcSaveFile', 'PC save file')
                      : t('ui.download.switchContainer', 'Switch container'),
                }))}
                placeholder={t(
                  'ui.download.selectExportType',
                  'Select export type',
                )}
                className="w-full"
                selectedItem={
                  EXPORT_OPTIONS.find((option) => option.id === exportMode) ??
                  EXPORT_OPTIONS[0]
                }
                defaultSelectedItem={
                  EXPORT_OPTIONS.find((option) => option.id === exportMode) ??
                  EXPORT_OPTIONS[0]
                }
                onSelectionChange={onExportModeSelection}
              />
            </div>
            <div className="flex h-10 items-center">
              <Checkbox
                label={
                  <span className="inline-flex items-center gap-2">
                    <span>
                      {t('ui.download.multipleSaves', 'Multiple saves')}
                    </span>
                    {exportScope === 'set' && (
                      <Badge
                        tone="yellow"
                        size="sm"
                        className="h-5 px-1.5 text-[0.65rem] opacity-80"
                        title={t(
                          'ui.download.multipleSavesExperimentalNotice',
                          'Multiple-save export is experimental.',
                        )}
                      >
                        {t('ui.download.experimental', 'Experimental')}
                      </Badge>
                    )}
                  </span>
                }
                checked={exportScope === 'set'}
                onChange={(checked) =>
                  setExportScope(checked ? 'set' : 'single')
                }
              />
            </div>
            {exportScope === 'single' && (
              <div className="w-36 max-w-full">
                <TextLabel>
                  {t('ui.download.inGameSlot', 'In-game slot')}
                </TextLabel>
                <Select
                  items={slotOptions}
                  placeholder={t('ui.field.selectSlot', 'Select slot')}
                  className="w-full"
                  selectedItem={slotOptions[selectedSlot]}
                  defaultSelectedItem={slotOptions[selectedSlot]}
                  onSelectionChange={onSlotSelection}
                />
              </div>
            )}
            {exportScope === 'single' && (
              <div className="flex h-10 items-center">
                <Checkbox
                  label={t('ui.field.completionSave', 'Completion save')}
                  checked={isCompletionSave}
                  onChange={setIsCompletionSave}
                />
              </div>
            )}
          </div>

          {exportScope === 'set' ? (
            <div className="flex flex-col gap-2 min-h-0 flex-1">
              <div className="flex flex-wrap items-end gap-3">
                <TextLabel className="w-full">
                  {t('ui.download.saveSlots', 'Save slots')}
                </TextLabel>
                {exportMode === 'pc' && (
                  <label className="inline-flex min-w-0 cursor-pointer items-center gap-2 border border-border bg-surface-3 px-3 py-2 text-sm text-text-2 hover:bg-surface-3-hover focus-within:ring-2 focus-within:ring-red/30 focus-within:ring-offset-1">
                    <span className="shrink-0">
                      {t('ui.download.baseDrIni', 'Base dr.ini')}
                    </span>
                    <span className="ui-field-mono max-w-52 truncate">
                      {baseDrIniName || t('ui.common.none', 'None')}
                    </span>
                    <input
                      type="file"
                      accept=".ini,text/plain"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) readBaseDrIni(file);
                      }}
                    />
                  </label>
                )}
                {baseDrIniName && exportMode === 'pc' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBaseDrIni('');
                      setBaseDrIniName('');
                    }}
                  >
                    {t('ui.download.clearBase', 'Clear base')}
                  </Button>
                )}
                {exportMode === 'switch' && (
                  <label className="inline-flex min-w-0 cursor-pointer items-center gap-2 border border-border bg-surface-3 px-3 py-2 text-sm text-text-2 hover:bg-surface-3-hover focus-within:ring-2 focus-within:ring-red/30 focus-within:ring-offset-1">
                    <span className="shrink-0">
                      {t('ui.download.baseContainer', 'Base container')}
                    </span>
                    <span className="ui-field-mono max-w-52 truncate">
                      {baseContainerName || t('ui.common.none', 'None')}
                    </span>
                    <input
                      type="file"
                      accept=".sav"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) readBaseContainer(file);
                      }}
                    />
                  </label>
                )}
                {baseContainerName && exportMode === 'switch' && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setBaseContainer(undefined);
                      setBaseContainerName('');
                    }}
                  >
                    {t('ui.download.clearBase', 'Clear base')}
                  </Button>
                )}
                <p className="w-full text-xs text-text-2">
                  {exportMode === 'pc'
                    ? t(
                        'ui.download.baseDrIniDescription',
                        'Optional: choose your existing dr.ini to preserve metadata that is not stored in save files.',
                      )
                    : t(
                        'ui.download.baseContainerDescription',
                        'Optional: choose an existing container to preserve entries that are not selected below.',
                      )}
                </p>
              </div>
              <div className="min-h-5 shrink-0">
                {hasDuplicateError && (
                  <p
                    role="alert"
                    className="max-h-10 overflow-y-auto text-sm leading-5 text-red"
                  >
                    {formatTranslation(
                      t(
                        'ui.download.duplicateTargets',
                        'Conflict: multiple saves target {targets}. Each slot can only contain one save.',
                      ),
                      { targets: duplicates.join(', ') },
                    )}
                  </p>
                )}
              </div>
              <div className="min-h-0 flex-1 max-h-[min(50vh,24rem)] overflow-auto border border-border bg-surface-2">
                <div className="ui-section-label sticky top-0 z-10 hidden md:grid grid-cols-[3rem_1fr_6rem_8rem_6rem_8rem_6rem] gap-3 items-center border-b border-border bg-surface-3 px-4 py-2">
                  <span />
                  <span>{t('ui.download.name', 'Name')}</span>
                  <span className="text-center">
                    {t('ui.upload.chapter', 'Chapter')}
                  </span>
                  <span>{t('ui.field.slot', 'Slot')}</span>
                  <span className="text-center">
                    {t('ui.field.completionSave', 'Complete')}
                  </span>
                  <span>{t('ui.download.target', 'Target')}</span>
                  <span className="text-center">
                    {t('ui.download.source', 'Source')}
                  </span>
                </div>
                {storedSaves.length === 0 ? (
                  <p className="p-4 text-sm text-text-2 text-center">
                    {t(
                      'ui.download.noStoredSaves',
                      'No stored saves available.',
                    )}
                  </p>
                ) : (
                  storedSaves.map((storedSave) => {
                    const sel = selections.get(storedSave.meta.id);
                    const isSelected = sel?.selected ?? false;
                    const effectiveSlot =
                      sel?.slotOverride ?? storedSave.meta.slot;
                    const effectiveCompletion =
                      sel?.completionOverride ??
                      storedSave.meta.isCompletionSave;
                    const targetKey = getTargetKey({
                      chapter: storedSave.meta.chapter,
                      slot: effectiveSlot,
                      isCompletionSave: effectiveCompletion,
                    });
                    const isDuplicate =
                      isSelected && duplicates.includes(targetKey);
                    return (
                      <div
                        key={storedSave.meta.id}
                        className={mergeClass(
                          'grid grid-cols-[3rem_1fr] md:grid-cols-[3rem_1fr_6rem_8rem_6rem_8rem_6rem] gap-3 items-center border-b border-border px-4 py-3 relative',
                          isDuplicate && 'bg-red-soft',
                        )}
                      >
                        <div
                          className={mergeClass(
                            'flex justify-center',
                            !isSelected && 'opacity-60',
                          )}
                        >
                          <Checkbox
                            ariaLabel={formatTranslation(
                              t('ui.download.selectNamedSave', 'Select {name}'),
                              { name: storedSave.meta.name },
                            )}
                            checked={isSelected}
                            onChange={(checked) =>
                              updateSelection(storedSave.meta.id, {
                                selected: checked,
                              })
                            }
                          />
                        </div>

                        <div className="flex flex-col gap-2 md:contents">
                          <div
                            className={mergeClass(
                              'truncate text-sm font-bold text-text-1 md:font-normal',
                              !isSelected && 'opacity-60',
                            )}
                          >
                            {storedSave.meta.name}
                          </div>

                          <div
                            className={mergeClass(
                              'flex items-center gap-2 md:justify-center',
                              !isSelected && 'opacity-60',
                            )}
                          >
                            <span className="text-xs uppercase text-text-3 md:hidden">
                              {t('ui.upload.chapter', 'Chapter')}:
                            </span>
                            <span className="font-mono text-xs text-text-2">
                              {storedSave.meta.chapter}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-xs uppercase text-text-3 w-16 shrink-0 md:hidden">
                              {t('ui.field.slot', 'Slot')}:
                            </span>
                            <div className="w-36 md:w-full">
                              <Select
                                items={slotOptions}
                                className="w-full h-8 min-h-0"
                                selectedItem={slotOptions[effectiveSlot]}
                                defaultSelectedItem={slotOptions[effectiveSlot]}
                                onSelectionChange={(item) => {
                                  if (item) {
                                    updateSelection(storedSave.meta.id, {
                                      slotOverride: (parseInt(item.id, 10) -
                                        1) as SaveSlot,
                                    });
                                  }
                                }}
                              />
                            </div>
                          </div>

                          <div
                            className={mergeClass(
                              'flex items-center gap-2 md:justify-center',
                              !isSelected && 'opacity-60',
                            )}
                          >
                            <span className="text-xs uppercase text-text-3 w-16 shrink-0 md:hidden">
                              {t('ui.field.completionSave', 'Complete')}:
                            </span>
                            <Checkbox
                              ariaLabel={`${t(
                                'ui.field.completionSave',
                                'Completion save',
                              )}: ${storedSave.meta.name}`}
                              checked={effectiveCompletion}
                              onChange={(checked) =>
                                updateSelection(storedSave.meta.id, {
                                  completionOverride: checked,
                                })
                              }
                            />
                          </div>

                          <div
                            className={mergeClass(
                              'flex items-center gap-2',
                              !isSelected && 'opacity-60',
                            )}
                          >
                            <span className="text-xs uppercase text-text-3 w-16 shrink-0 md:hidden">
                              {t('ui.download.target', 'Target')}:
                            </span>
                            <span className="font-mono text-xs text-text-2">
                              {targetKey}
                            </span>
                          </div>

                          <div
                            className={mergeClass(
                              'flex items-center gap-2 md:justify-center',
                              !isSelected && 'opacity-60',
                            )}
                          >
                            <span className="text-xs uppercase text-text-3 w-16 shrink-0 md:hidden">
                              {t('ui.download.source', 'Source')}:
                            </span>
                            <SaveSourceBadge save={storedSave} />
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : save ? (
            <div className="flex flex-col gap-2 min-h-0 flex-1 overflow-hidden">
              <TextLabel>
                {t(
                  'ui.download.changesSinceBaseline',
                  'Changes since last upload or download',
                )}
              </TextLabel>
              <DownloadChanges key={baselineRevision} fill />
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </ModalLayout>
  );
}
