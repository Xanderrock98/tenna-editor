import { NumberField } from '@components';
import { useSave } from '@store';
import { useTranslation } from '../../i18n';

interface MoneyFieldProps {
  id?: string;
  className?: string;
}

export function MoneyField({ id, className }: MoneyFieldProps) {
  const { t } = useTranslation();
  const money = useSave((s) => s.save?.money) ?? 0;
  const updateSave = useSave((s) => s.updateSave);

  function onChange(value: number) {
    updateSave((save) => (save.money = value));
  }

  return (
    <NumberField
      id={id}
      className={className}
      title={t('ui.field.money', 'Money (D$)')}
      value={money}
      placeholder={t('ui.field.selectMoney', 'Enter money amount...')}
      onChange={onChange}
    />
  );
}
