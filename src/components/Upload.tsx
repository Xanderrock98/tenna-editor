import { useSave, useUi } from '@store';
import { detectChapter } from '@utils/detection';
import { extractGamePayload } from '@utils/save-baseline';
import { parseSave } from '@utils/save-parser';
import {
  parseSwitchSaveContainer,
  parseSwitchSaveEntry,
  type SwitchSaveContainer,
  type SwitchSaveEntry,
} from '@utils/switch-save-container';
import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { Save, SaveSlot } from '@types';
import { saveStorage } from '@services';
import {
  TextInput,
  TextLabel,
  Checkbox,
  Button,
  type SelectItem,
  Select,
  FileInput,
  ModalLayout,
  ModalFooter,
} from '@components';
import type { ChapterIndex } from '@data';
import {
  getChapterTranslationKeyPrefix,
  translateMeta,
  useTranslation,
} from '../i18n';
import { chapterHelpers } from '@utils/data-helpers';

const CHAPTER_OPTIONS: SelectItem[] = [
  { id: '2', label: `Chapter 2 (A Cyber's World)`, value: 2 },
  { id: '3', label: 'Chapter 3 (Late Night)', value: 3 },
  { id: '4', label: 'Chapter 4 (Prophecy)', value: 4 },
  { id: '5', label: 'Chapter 5 (Festival Day)', value: 5 },
];

const SLOT_OPTIONS: SelectItem[] = [
  { id: '1', label: 'Slot 1', value: 0 },
  { id: '2', label: 'Slot 2', value: 1 },
  { id: '3', label: 'Slot 3', value: 2 },
];

const STAGE_TITLES: Record<
  'idle' | 'switch' | 'chapter' | 'settings' | 'error',
  string
> = {
  idle: 'Upload Save',
  switch: 'Choose Switch Save',
  chapter: 'Confirm Chapter',
  settings: 'Save Settings',
  error: 'Upload Failed',
};

const STAGE_TITLE_KEYS: Record<keyof typeof STAGE_TITLES, string> = {
  idle: 'ui.upload.uploadSave',
  switch: 'ui.upload.chooseSwitchSave',
  chapter: 'ui.upload.confirmChapter',
  settings: 'ui.upload.saveSettings',
  error: 'ui.upload.uploadFailed',
};

interface UploadProps {
  isOpen: boolean;
  setOpen: (state: boolean) => void;
}

type UploadStage =
  'idle' | 'success' | 'error' | 'switch' | 'chapter' | 'settings';

export function Upload({ isOpen, setOpen }: UploadProps) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();

  const switchSave = useSave((s) => s.switchSave);
  const uploadedSaves = useUi((s) => s.ui.uploadedSaves);
  const updateUi = useUi((s) => s.updateUi);

  const [uploadStage, setUploadStage] = useState<UploadStage>('idle');
  const [previousUploadStage, setPreviousUploadStage] =
    useState<UploadStage>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [selectedChapter, setSelectedChapter] = useState<ChapterIndex>(1);
  const [parsedSave, setParsedSave] = useState<Save | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<SaveSlot>(0);
  const [isCompletionSave, setIsCompletionSave] = useState(false);
  const [saveName, setSaveName] = useState<string>('');
  const [switchContainer, setSwitchContainer] =
    useState<SwitchSaveContainer | null>(null);
  const [selectedSwitchEntry, setSelectedSwitchEntry] =
    useState<SwitchSaveEntry | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState('');
  const chapterOptions = CHAPTER_OPTIONS.map((item) => {
    const chapter = item.value as ChapterIndex;
    const meta = translateMeta(
      getChapterTranslationKeyPrefix(chapter),
      chapterHelpers.getById(chapter),
      t,
    );
    return {
      ...item,
      label: `${t('ui.upload.chapter', 'Chapter')} ${chapter} (${meta.displayName})`,
    };
  });
  const slotOptions = SLOT_OPTIONS.map((item, index) => ({
    ...item,
    label: `${t('ui.field.slot', 'Slot')} ${index + 1}`,
  }));

  function onChapterSelection(item: SelectItem | null) {
    if (item) {
      setSelectedChapter(item.value as ChapterIndex);
    }
  }

  function onSlotSelection(item: SelectItem | null) {
    if (item) {
      setSelectedSlot(item.value as SaveSlot);
    }
  }

  function onSwitchEntrySelection(item: SelectItem | null) {
    const entry = item?.value as SwitchSaveEntry | undefined;
    if (entry) setSelectedSwitchEntry(entry);
  }

  function prepareSaveForUpload(
    save: Save,
    sourceName: string,
    source?: {
      container: SwitchSaveContainer;
      entry: SwitchSaveEntry;
    },
  ): boolean {
    const detection = detectChapter(save, source?.entry.key ?? sourceName);
    if (!detection.supported) {
      setUploadError(
        t(
          'ui.upload.unsupportedChapterOrFormat',
          'Unsupported chapter or save format detected. Please upload a DELTARUNE Chapter 1-5 PC, Mac, Linux, or already-exported save container.',
        ),
      );
      changeStage('error');
      return false;
    }

    const filename = source?.entry.key ?? sourceName;
    const slotMatch = filename.match(/filech(\d+)_(\d+)/);
    let slot: SaveSlot = 0;
    let nextIsCompletionSave = false;
    if (slotMatch) {
      const detectedSlot = parseInt(slotMatch[2]);
      if (detectedSlot === 0 || detectedSlot === 1 || detectedSlot === 2) {
        slot = detectedSlot;
      }

      if (detectedSlot === 3 || detectedSlot === 4 || detectedSlot === 5) {
        slot = (detectedSlot - 3) as SaveSlot;
        nextIsCompletionSave = true;
      }
    }

    if (source) {
      save.meta.source = {
        platform: 'switch',
        fileName: sourceName,
        key: source.entry.key,
        container: source.container.files,
      };
    } else {
      save.meta.source = {
        platform: 'pc',
        fileName: sourceName,
      };
    }

    setParsedSave(save);
    setSelectedChapter(detection.chapter ?? 1);
    setSelectedSlot(slot);
    setIsCompletionSave(nextIsCompletionSave);
    updateUi((ui) => (ui.uploadedSaves += 1));

    if (!slotMatch) {
      setSaveName(sourceName);
    } else {
      setSaveName(`Save${uploadedSaves}`);
    }

    if (save.meta.format === 1) {
      changeStage('settings');
    } else {
      changeStage('chapter');
    }
    return true;
  }

  function prepareSelectedSwitchSave() {
    if (!switchContainer || !selectedSwitchEntry) return;

    try {
      const save = parseSwitchSaveEntry(
        switchContainer,
        selectedSwitchEntry.key,
      );
      prepareSaveForUpload(save, uploadedFileName, {
        container: switchContainer,
        entry: selectedSwitchEntry,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      setUploadError(message);
      changeStage('error');
    }
  }

  function onFileSelect(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setUploadedFileName(file.name);
      if (!content) {
        setUploadError(
          'Failed to read file content. The file may be empty or corrupted.',
        );
        changeStage('error');
        return;
      }

      let save;
      try {
        save = parseSave(content);
      } catch (error) {
        const container = parseSwitchSaveContainer(content);
        if (container) {
          setSwitchContainer(container);
          setSelectedSwitchEntry(container.entries[0] ?? null);
          changeStage('switch');
          return;
        }

        const message =
          error instanceof Error ? error.message : 'Unknown error';
        setUploadError(message);
        changeStage('error');
        return;
      }

      prepareSaveForUpload(save, file.name);
    };
    reader.readAsText(file);
  }

  async function changeStage(stage: UploadStage) {
    const currentStage = uploadStage;

    switch (stage) {
      case 'idle':
        setParsedSave(null);
        setSelectedChapter(1);
        setSelectedSlot(0);
        setIsCompletionSave(false);
        setSaveName('');
        setSwitchContainer(null);
        setSelectedSwitchEntry(null);
        setUploadedFileName('');
        break;
      case 'success':
        if (!parsedSave) break;
        parsedSave.meta.chapter = selectedChapter;
        parsedSave.meta.slot = selectedSlot;
        parsedSave.meta.isCompletionSave = isCompletionSave;
        parsedSave.meta.name = saveName;
        parsedSave.meta.baseline = {
          capturedAt: new Date(),
          source: 'upload',
          payload: extractGamePayload(parsedSave),
        };

        await saveStorage.set(parsedSave.meta.id, parsedSave);
        switchSave(parsedSave.meta.id);

        setParsedSave(null);
        setSelectedSlot(0);
        setIsCompletionSave(false);

        setOpen(false);
        break;
    }

    setUploadStage(stage);
    setPreviousUploadStage(currentStage);
  }

  useEffect(() => {
    void changeStage('idle').catch((error: unknown) => {
      console.error('Upload modal reset failed:', error);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps, @eslint-react/exhaustive-deps
  }, [isOpen]);

  const transition = { duration: reducedMotion ? 0 : 0.2 };
  const selectedChapterOption =
    chapterOptions.find((option) => option.value === selectedChapter) ?? null;

  function renderFooter() {
    switch (uploadStage) {
      case 'idle':
        return (
          <ModalFooter>
            <Button
              onClick={() => setOpen(false)}
              variant="secondary"
              size="lg"
            >
              Cancel
            </Button>
          </ModalFooter>
        );
      case 'switch':
        return (
          <ModalFooter>
            <Button onClick={() => changeStage('idle')} variant="secondary">
              {t('ui.common.back', 'Back')}
            </Button>
            <Button
              onClick={prepareSelectedSwitchSave}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto sm:min-w-40"
              disabled={!selectedSwitchEntry}
            >
              {t('ui.common.next', 'Next')}
            </Button>
          </ModalFooter>
        );
      case 'chapter':
        return (
          <ModalFooter>
            <Button onClick={() => changeStage('idle')} variant="secondary">
              {t('ui.common.back', 'Back')}
            </Button>
            <Button
              onClick={() => changeStage('settings')}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto sm:min-w-40"
            >
              {t('ui.common.next', 'Next')}
            </Button>
          </ModalFooter>
        );
      case 'settings':
        return (
          <ModalFooter>
            <Button
              onClick={() => changeStage(previousUploadStage)}
              variant="secondary"
            >
              {t('ui.common.back', 'Back')}
            </Button>
            <Button
              onClick={() => void changeStage('success')}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto sm:min-w-40"
            >
              {t('ui.upload.confirmUpload', 'Confirm upload')}
            </Button>
          </ModalFooter>
        );
      case 'error':
        return (
          <ModalFooter>
            <Button
              onClick={() => {
                changeStage('idle');
                setUploadError(null);
              }}
              variant="primary"
              size="lg"
              className="w-full sm:w-auto sm:min-w-40"
            >
              {t('ui.common.tryAgain', 'Try again')}
            </Button>
          </ModalFooter>
        );
      default:
        return null;
    }
  }

  return (
    <ModalLayout
      isOpen={isOpen}
      setOpen={setOpen}
      title={
        uploadStage === 'success'
          ? t(STAGE_TITLE_KEYS.settings, STAGE_TITLES.settings)
          : t(STAGE_TITLE_KEYS[uploadStage], STAGE_TITLES[uploadStage])
      }
      footer={renderFooter()}
      size="tall"
      bodyClassName={
        uploadStage === 'error'
          ? 'flex flex-col min-h-0 flex-1 overflow-y-auto'
          : 'flex flex-col min-h-0 flex-1 overflow-hidden'
      }
    >
      <div className="flex flex-col flex-1 min-h-0">
        <AnimatePresence mode="wait">
          {uploadStage === 'idle' && (
            <motion.div
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="flex flex-1 min-h-0 items-stretch"
            >
              <FileInput
                onFileSelect={onFileSelect}
                className="flex-1 min-h-0"
              />
            </motion.div>
          )}

          {uploadStage === 'switch' && (
            <motion.div
              key="switch"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="flex flex-col gap-4 max-w-md"
            >
              <p className="ui-prose-muted">
                {t(
                  'ui.upload.switchContainerChooseEntry',
                  'This Switch container includes multiple save entries. Choose one to edit.',
                )}
              </p>
              <div>
                <TextLabel>
                  {t('ui.upload.containedSave', 'Contained save')}
                </TextLabel>
                <Select
                  items={
                    switchContainer?.entries.map((entry) => ({
                      id: entry.key,
                      label: `${entry.key} (${entry.lineCount} lines)`,
                      value: entry,
                    })) ?? []
                  }
                  placeholder={t('ui.upload.selectSave', 'Select save')}
                  className="w-full"
                  selectedItem={
                    selectedSwitchEntry
                      ? {
                          id: selectedSwitchEntry.key,
                          label: `${selectedSwitchEntry.key} (${selectedSwitchEntry.lineCount} lines)`,
                          value: selectedSwitchEntry,
                        }
                      : null
                  }
                  defaultSelectedItem={
                    selectedSwitchEntry
                      ? {
                          id: selectedSwitchEntry.key,
                          label: `${selectedSwitchEntry.key} (${selectedSwitchEntry.lineCount} lines)`,
                          value: selectedSwitchEntry,
                        }
                      : null
                  }
                  onSelectionChange={onSwitchEntrySelection}
                />
              </div>
              <p className="ui-panel-muted">
                {t(
                  'ui.upload.switchSupportWarning',
                  'Switch support expects an already-exported save payload. Tenna Editor cannot extract or restore saves on hardware.',
                )}
              </p>
            </motion.div>
          )}

          {uploadStage === 'chapter' && (
            <motion.div
              key="chapter"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="flex flex-col gap-4 max-w-md"
            >
              <p className="ui-prose-muted">
                {t(
                  'ui.upload.correctChapterQuestion',
                  'Is this the correct chapter?',
                )}
              </p>
              <div>
                <TextLabel>{t('ui.upload.chapter', 'Chapter')}</TextLabel>
                <Select
                  items={chapterOptions}
                  placeholder={t('ui.upload.selectChapter', 'Select chapter')}
                  className="w-full"
                  selectedItem={selectedChapterOption}
                  defaultSelectedItem={selectedChapterOption}
                  onSelectionChange={onChapterSelection}
                />
              </div>
              <p className="ui-prose-muted">
                {t(
                  'ui.upload.chapterCannotChangeAfterUpload',
                  'This cannot be changed after the save is uploaded.',
                )}
              </p>
            </motion.div>
          )}

          {uploadStage === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="flex flex-col gap-3 max-w-md"
            >
              <div>
                <TextLabel>{t('ui.field.saveName', 'Save name')}</TextLabel>
                <TextInput value={saveName} onChange={setSaveName} />
              </div>
              <div>
                <TextLabel>
                  {t('ui.field.inGameSlot', 'In-game slot')}
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
              <Checkbox
                label={t('ui.field.completionSave', 'Completion save')}
                checked={isCompletionSave}
                onChange={setIsCompletionSave}
              />
            </motion.div>
          )}

          {uploadStage === 'error' && (
            <motion.div
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
              className="flex flex-col gap-3"
            >
              <p className="ui-danger">{uploadError}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ModalLayout>
  );
}
