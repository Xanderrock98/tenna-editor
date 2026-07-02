import { useTranslation } from '../i18n';

export const Placeholder = () => {
  const { t } = useTranslation();

  return (
    <div className="page">
      <h1 className="text-3xl font-bold">
        {t('ui.placeholder.loadingHeadline', 'MIKE, the BOARD, please!')}
      </h1>
      <p>{t('ui.placeholder.underConstruction', 'This tab is under construction')}</p>
    </div>
  );
};
