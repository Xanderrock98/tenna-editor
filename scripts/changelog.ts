import { readFile } from 'fs/promises';
import { resolve } from 'path';

type ChangelogScope = 'added' | 'changed' | 'fixed' | 'removed';

export interface ChangelogEntry {
  version: string | null;
  date: string | null;
  description: string | null;
  scopes: Record<ChangelogScope, string[]>;
}

function getEntryBoilerplate(): ChangelogEntry {
  return {
    version: null,
    date: null,
    description: null,
    scopes: { added: [], changed: [], fixed: [], removed: [] },
  };
}

export async function getChangelog() {
  try {
    const entries: ChangelogEntry[] = [];
    const file = resolve(resolve(), 'CHANGELOG.md');
    const content = await readFile(file, 'utf8');

    let entry: ChangelogEntry = getEntryBoilerplate();
    let scope: ChangelogScope | null = null;
    let descriptionLines: string[] = [];

    const finishEntry = () => {
      entry.description = descriptionLines.join('\n').trim() || null;
      descriptionLines = [];
      entries.push(entry);
    };

    content.split('\n').forEach((line) => {
      if (line.startsWith('## ')) {
        // This indicates that it's not first entry
        if (entry.version) {
          finishEntry();
          entry = getEntryBoilerplate();
        }
        scope = null;

        const [version, date] = line
          .replaceAll(/#\s*|- |[[\]]/g, '')
          .split(' ');

        entry.version = version ?? null;
        entry.date = date ?? null;
      } else {
        const scopeHeading = line.match(
          /^### (Added|Changed|Fixed|Removed)\s*$/i,
        );

        if (scopeHeading) {
          scope = scopeHeading[1].toLocaleLowerCase() as ChangelogScope;
        } else if (line.startsWith('- ') && scope) {
          entry.scopes[scope].push(line.slice(2));
        } else if (entry.version && !scope) {
          descriptionLines.push(line);
        }
      }
    });
    finishEntry();

    return entries;
  } catch (error) {
    console.error(error);
    throw error;
  }
}
