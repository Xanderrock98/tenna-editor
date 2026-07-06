import { Section, Card, Heading } from '@components';
import { useTranslation } from '../../i18n';

const LICENSE = `zlib License

Copyright (c) 2025-2026 jjezewski

This software is provided 'as-is', without any express or implied
warranty.  In no event will the authors be held liable for any damages
arising from the use of this software.

Permission is granted to anyone to use this software for any purpose,
including commercial applications, and to alter it and redistribute it
freely, subject to the following restrictions:

1. The origin of this software must not be misrepresented; you must not
   claim that you wrote the original software. If you use this software
   in a product, an acknowledgment in the product documentation would be
   appreciated but is not required.
2. Altered source versions must be plainly marked as such, and must not be
   misrepresented as being the original software.
3. This notice may not be removed or altered from any source distribution.

Name And Branding Notice

The "Tenna Editor" name, logo, icons, and branding assets are not covered by the zlib License and remain reserved by the author. They may not be used to brand other instances or derivatives of this project. Forks and rehosted copies must use their own name and branding, must not misrepresent the origin of the software, and must be plainly marked as altered versions. The official instance is available at https://tennaproject.com. See BRANDING.md in the source repository for details.

DELTARUNE™ Assets Notice

The files located under the directory /src/assets/deltarune/ are assets from the DELTARUNE™ which are copyrighted by Toby Fox. These assets are included in this project under the fair use. This project is non-commercial and transformative in nature. No endorsement by Toby Fox or any related entities is implied.

If you redistribute this project, please ensure that this notice is preserved and that the assets are used in compliance with fair use guidelines.
` as const;

export function AboutLicense() {
  const { t } = useTranslation();

  return (
    <div className="page">
      <Section>
        <Card className="p-6">
          <Heading level={3}>{t('ui.about.license', 'License')}</Heading>
          <code className="px-6 py-6 block">
            <pre className="font-mono whitespace-pre-wrap text-text-2">
              {LICENSE}
            </pre>
          </code>
        </Card>
      </Section>
    </div>
  );
}
