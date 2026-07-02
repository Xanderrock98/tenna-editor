import { Section, Card, Heading, Link } from '@components';
import { CONTRIBUTORS } from '@data';
import { getAppEnvironment } from '@utils';
import { formatTranslation, useTranslation } from '../../i18n';

export function AboutOverview() {
  const { t } = useTranslation();
  const environment = getAppEnvironment();

  return (
    <article className="page">
      <Section id="legal">
        <Card className="flex flex-col gap-3 p-6">
          <Heading level={3}>{t('ui.about.legalInfo', 'Legal Info')}</Heading>
          <div className="flex flex-col text-text-2">
            <p>{t('ui.about.fanProject', 'This is fan made project.')}</p>
            <p>
              {t(
                'ui.about.notAffiliated',
                'This project is not affiliated with, endorsed by, or in any way associated with Toby Fox or any related entities.',
              )}
            </p>
            <p>
              {t(
                'ui.about.deltaruneTrademark',
                'DELTARUNE™ is a registered trademark of Royal Sciences, LLC',
              )}
            </p>
            <p>
              {t(
                'ui.about.assetsNotice',
                'The assets used in this project from the DELTARUNE™ are copyrighted by Toby Fox and included under the fair use for non-commercial, transformative purposes. No endorsement is implied.',
              )}
            </p>
          </div>
        </Card>
      </Section>

      <Section id="privacy">
        <Card className="flex flex-col gap-3 p-6">
          <Heading level={3}>{t('ui.about.privacy', 'Privacy')}</Heading>
          <div className="flex flex-col text-text-2 gap-2">
            <p>
              {t(
                'ui.about.privacyLocal',
                'We don’t collect or store anything about you. All data is processed on-device and never sent anywhere.',
              )}
            </p>
            <div>
              <p>
                {t(
                  'ui.about.cloudflarePrivacy',
                  'Tenna Editor is hosted on Cloudflare, which may collect some of your personal data.',
                )}
              </p>
              <Link href="https://www.cloudflare.com/trust-hub/privacy-and-data-protection">
                {t(
                  'ui.about.cloudflarePrivacyLink',
                  "Click here to read Cloudflare's privacy policy and GDPR/HIPAA compliance info.",
                )}
              </Link>
            </div>
          </div>
        </Card>
      </Section>

      <Section id="source">
        <Card className="flex flex-col gap-3 p-6">
          <Heading level={3}>{t('ui.about.sourceCode', 'Source Code')}</Heading>
          <p className="text-text-2">
            {formatTranslation(
              t(
                'ui.about.sourceCodeDescription',
                'The source code of Tenna Editor is available on {host}',
              ),
              { host: '' },
            )}
            <Link href="https://github.com/tennaproject/tenna-editor">
              GitHub
            </Link>
          </p>
        </Card>
      </Section>

      <Section id="contributors">
        <Card className="flex flex-col gap-3 p-6">
          <Heading level={3}>
            {t('ui.about.contributors', 'Contributors')}
          </Heading>
          <ul className="list-disc pl-6 space-y-1 text-text-2">
            {CONTRIBUTORS.map((contributor) => (
              <li key={contributor.login ?? contributor.displayName}>
                {contributor.url ? (
                  <Link href={contributor.url}>{contributor.displayName}</Link>
                ) : (
                  contributor.displayName
                )}
                {'note' in contributor ? ` - ${contributor.note}` : null}
              </li>
            ))}
          </ul>
        </Card>
      </Section>

      <Section id="build">
        <Card className="flex flex-col gap-3 p-6">
          <Heading level={3}>{t('ui.about.buildInfo', 'Build Info')}</Heading>
          <div className="text-text-2">
            <p>
              {formatTranslation(t('ui.about.buildId', 'ID: {value}'), {
                value: __COMMIT_HASH__,
              })}
            </p>
            <p>
              {formatTranslation(
                t('ui.about.buildVersion', 'Version: {value}'),
                { value: __VERSION__ },
              )}
            </p>
            <p>
              {formatTranslation(
                t('ui.about.buildEnvironment', 'Environment: {value}'),
                { value: environment },
              )}
            </p>
            <p>
              {formatTranslation(t('ui.about.buildBranch', 'Branch: {value}'), {
                value: __BRANCH__,
              })}
            </p>
            <p>
              {formatTranslation(
                t('ui.about.buildTimestamp', 'Timestamp: {value}'),
                { value: __BUILD_TIMESTAMP__ },
              )}
            </p>
          </div>
        </Card>
      </Section>
    </article>
  );
}
