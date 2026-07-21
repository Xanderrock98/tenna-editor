import CopyIcon from '@assets/icons/copy.svg?react';
import { toast } from '@services';
import { mergeClass } from '@utils/merge-class';
import type { ReactNode } from 'react';
import { formatTranslation, useTranslation } from '../i18n';

interface SectionProps {
  id?: string;
  className?: string;
  children?: ReactNode;
}

export function Section({ id, className, children }: SectionProps) {
  const { t } = useTranslation();
  const copyLinkLabel = id
    ? formatTranslation(
        t('ui.common.copyLinkToSection', 'Copy link to #{id}'),
        { id },
      )
    : '';

  async function copyLink() {
    if (!id) return;

    const url = new URL(window.location.href);
    url.hash = id;

    try {
      await navigator.clipboard.writeText(url.toString());
      toast(t('ui.common.linkCopied', 'Link copied.'), 'success', 2500, 'sm');
    } catch {
      toast(t('ui.common.linkCopyFailed', 'Failed to copy link.'), 'error');
    }
  }

  return (
    <section
      id={id}
      className={mergeClass(id && 'section-link-target', className)}
    >
      {id && (
        <button
          type="button"
          className="section-link-control"
          onClick={copyLink}
          aria-label={copyLinkLabel}
          title={copyLinkLabel}
        >
          <CopyIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 truncate">#{id}</span>
        </button>
      )}
      {children}
    </section>
  );
}
