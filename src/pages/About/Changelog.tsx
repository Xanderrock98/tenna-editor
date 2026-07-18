import { Card, Heading, Link, Section } from '@components';
import Markdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

type ChangelogScope = 'added' | 'changed' | 'fixed' | 'removed';

export interface ChangelogEntry {
  version: string | null;
  date: string | null;
  description: string | null;
  scopes: Record<ChangelogScope, string[]>;
}

export function AboutChangelog() {
  const changelog = __CHANGELOG__ as ChangelogEntry[];

  return (
    <article className="page">
      {changelog.map((entry) => {
        const hasChanges =
          entry.description ||
          Object.values(entry.scopes).some((elements) => elements.length > 0);

        if (!entry.version || !hasChanges) return;
        return (
          <Section key={entry.version} id={entry.version}>
            <Card className="p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between border-b pb-1 border-divider">
                <Heading level={3}>{entry.version}</Heading>
                {entry.date && (
                  <p className="text-text-2 leading-none text-xl font-mono">
                    {entry.date}
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-3">
                {entry.description && (
                  <div className="flex max-w-5xl flex-col gap-4 text-text-2">
                    <Markdown
                      rehypePlugins={[rehypeRaw]}
                      components={{
                        a: Link,
                        h3: ({ children }) => (
                          <Heading level={5} className="mt-2 text-text-1">
                            {children}
                          </Heading>
                        ),
                        p: ({ children }) => (
                          <p className="leading-relaxed">{children}</p>
                        ),
                        code: ({ children }) => (
                          <code className="border border-border bg-surface-2 px-1 py-0.5 font-mono text-sm text-text-1">
                            {children}
                          </code>
                        ),
                      }}
                    >
                      {entry.description}
                    </Markdown>
                  </div>
                )}
                {Object.entries(entry.scopes).map(([scope, elements]) => {
                  if (elements.length <= 0) return;
                  return (
                    <Section
                      key={scope}
                      id={`${entry.version}-${scope}`}
                      className="flex flex-col gap-2"
                    >
                      <Heading level={5}>
                        {scope.at(0)?.toUpperCase() + scope.slice(1)}
                      </Heading>
                      <div className="text-text-2">
                        {elements.map((element) => {
                          return (
                            <div key={element} className="flex gap-1">
                              -{' '}
                              <Markdown components={{ a: Link }}>
                                {element}
                              </Markdown>
                            </div>
                          );
                        })}
                      </div>
                    </Section>
                  );
                })}
              </div>
            </Card>
          </Section>
        );
      })}
    </article>
  );
}
