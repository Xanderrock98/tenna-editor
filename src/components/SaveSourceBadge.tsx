import type { Save } from '@types';
import { Badge } from './Badge';
import { useTranslation } from '../i18n';

interface SaveSourceBadgeProps {
  save?: Save | null;
  className?: string;
}

export function SaveSourceBadge({ save, className }: SaveSourceBadgeProps) {
  const { t } = useTranslation();
  const platform = save?.meta.source?.platform;
  if (!platform) return null;

  const isSwitch = platform === 'switch';

  return (
    <Badge
      tone={isSwitch ? 'red' : 'neutral'}
      className={className}
      title={
        isSwitch
          ? t(
              'ui.saveSource.importedSwitch',
              'Imported from an already-exported save container',
            )
          : t('ui.saveSource.importedPc', 'Imported from a PC save file')
      }
    >
      {isSwitch
        ? t('ui.saveSource.switch', 'SWITCH')
        : t('ui.saveSource.pc', 'PC')}
    </Badge>
  );
}
