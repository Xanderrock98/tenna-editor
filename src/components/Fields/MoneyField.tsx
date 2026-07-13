import { NumberField } from '@components';
import { useSave } from '@store';
import { useTranslation } from '../../i18n';

interface MoneyFieldProps {
  id?: string;
  className?: string;
  world?: 'dark' | 'light';
}

export function MoneyField({ id, className, world = 'dark' }: MoneyFieldProps) {
  const { t } = useTranslation();
  const money =
    useSave((s) =>
      world === 'light' ? s.save?.lightWorld.money : s.save?.money,
    ) ?? 0;
  const updateSave = useSave((s) => s.updateSave);

  function onChange(value: number) {
    updateSave((save) => {
      if (world === 'light') {
        save.lightWorld.money = value;
      } else {
        save.money = value;
      }
    });
  }

  return (
    <NumberField
      id={id}
      className={className}
      title={
        world === 'light'
          ? t('ui.field.lightWorldMoney', 'Light World Money')
          : t('ui.field.money', 'Money (D$)')
      }
      value={money}
      placeholder={t('ui.field.selectMoney', 'Enter money amount...')}
      onChange={onChange}
    />
  );
}
