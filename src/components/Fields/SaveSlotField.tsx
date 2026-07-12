import { FieldWrapper, Select, type SelectItem } from '@components';
import { useSave } from '@store';
import type { SaveSlot } from '@types';
import { useTranslation } from '../../i18n';

const SLOT_OPTIONS: SelectItem[] = [
  { id: '0', label: 'Slot 1' },
  { id: '1', label: 'Slot 2' },
  { id: '2', label: 'Slot 3' },
];

interface SaveSlotFieldProps {
  id?: string;
  className?: string;
}

export function SaveSlotField({ id, className }: SaveSlotFieldProps) {
  const { t } = useTranslation();
  const slot = useSave((s) => s.save?.meta.slot) ?? 0;
  const updateSave = useSave((s) => s.updateSave);

  function onSelectionChange(item: SelectItem | null) {
    if (item) {
      const newSlot = parseInt(item.id, 10) as SaveSlot;
      updateSave((save) => {
        save.meta.slot = newSlot;
      });
    }
  }

  const slotOptions = SLOT_OPTIONS.map((item, index) => ({
    ...item,
    label: `${t('ui.field.slot', 'Slot')} ${index + 1}`,
  }));

  return (
    <FieldWrapper
      id={id}
      className={className}
      title={t('ui.field.inGameSlot', 'In-game slot')}
      label
    >
      <Select
        items={slotOptions}
        placeholder={t('ui.field.selectSlot', 'Select slot')}
        selectedItem={slotOptions[slot]}
        defaultSelectedItem={slotOptions[slot]}
        onSelectionChange={onSelectionChange}
      />
    </FieldWrapper>
  );
}
