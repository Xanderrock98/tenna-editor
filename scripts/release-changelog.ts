import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const version = process.argv[2];

if (!version) {
  throw new Error('Usage: bun scripts/release-changelog.ts <version>');
}

const changelogPath = resolve('CHANGELOG.md');
const changelog = await readFile(changelogPath, 'utf8');
const releasedHeading = `## [${version}] -`;

if (changelog.includes(releasedHeading)) {
  process.exit(0);
}

const unreleasedMatch = changelog.match(
  /^## \[Unreleased\]\s*\n([\s\S]*?)(?=^## \[)/m,
);

if (!unreleasedMatch) {
  throw new Error('CHANGELOG.md is missing an [Unreleased] section');
}

if (!unreleasedMatch[1].trim()) {
  throw new Error('CHANGELOG.md [Unreleased] section has no release notes');
}

const date = new Date().toISOString().slice(0, 10);
const nextChangelog = changelog.replace(
  '## [Unreleased]',
  `## [Unreleased]\n\n## [${version}] - ${date}`,
);

await writeFile(changelogPath, nextChangelog);
