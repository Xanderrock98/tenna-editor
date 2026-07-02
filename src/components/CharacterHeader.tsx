import { Heading, Section } from '@components';
import type { CharacterIndex } from '@data';
import { useCharacterOverrideInputs } from '@hooks';
import { characterHelpers } from '@utils/data-helpers';
import { getCharacterColor } from '@utils/get-character-color';
import { mergeClass } from '@utils/merge-class';
import type { ReactNode } from 'react';
import {
  formatTranslation,
  getCharacterTitleTranslationKeyPrefix,
  getCharacterTranslationKeyPrefix,
  translateMeta,
  useTranslation,
} from '../i18n';

interface CharacterHeaderProps {
  character: CharacterIndex;
  icon?: ReactNode;
}

export function CharacterHeader({ character, icon }: CharacterHeaderProps) {
  const { t } = useTranslation();
  const { chapter, plot, flags, hasEgg, weapon, room } =
    useCharacterOverrideInputs(character);

  let characterMeta = characterHelpers.getById(character);

  const overrides = characterMeta?.getOverrides?.({
    chapter,
    plot,
    flags,
    hasEgg,
    weapon,
    room,
  });

  characterMeta = {
    ...characterMeta,
    ...(overrides ?? {}),
  };

  const color = getCharacterColor(character);
  const translatedCharacter = translateMeta(
    getCharacterTranslationKeyPrefix(character),
    characterMeta,
    t,
  );
  const titleKeyPrefix = getCharacterTitleTranslationKeyPrefix(
    character,
    characterMeta.title,
  );
  const titleName = titleKeyPrefix
    ? t(`${titleKeyPrefix}.name`, characterMeta.title.name)
    : characterMeta.title.name;
  const titleDescription = titleKeyPrefix
    ? t(`${titleKeyPrefix}.description`, characterMeta.title.description)
    : characterMeta.title.description;

  return (
    <Section
      id="main-title"
      className="flex flex-col items-center border-b border-divider px-2 py-4"
    >
      {icon && (
        <div className="flex items-center justify-center" aria-hidden>
          {icon}
        </div>
      )}
      <div className="mb-1">
        <Heading level={2} className={mergeClass('uppercase', color.text)}>
          {translatedCharacter.displayName}
        </Heading>
      </div>
      <Heading level={5}>
        {formatTranslation(t('ui.party.level', 'LV{level}'), {
          level: characterMeta.lv,
        })}{' '}
        {titleName}
      </Heading>
      <p className="ui-prose-muted text-center">{titleDescription}</p>
    </Section>
  );
}
