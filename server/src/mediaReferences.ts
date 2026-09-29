import { decodeHTML } from 'entities';

const punctuation = new Set('!"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~');
const baseUrl = 'https://temp-log.invalid/';

function isUploadUrl(value: string, filename: string): boolean {
  try {
    // WHATWG URL parsing handles dot segments and browser-style backslashes.
    // Express decodes the filename once and matches the route without case.
    const pathname = decodeURIComponent(new URL(value, baseUrl).pathname);
    return /^\/uploads\//i.test(pathname) && pathname.slice('/uploads/'.length) === filename;
  } catch { return false; }
}

/** Conservatively recognize links, including Markdown/HTML spelling variants. */
export function referencesUpload(value: string | undefined, filename: string): boolean {
  if (!value) return false;
  const decoded = decodeHTML(value);
  const candidates = new Set([
    value,
    decoded,
    decoded.replace(/\\(.)/gs, (escape, character: string) => punctuation.has(character) ? character : escape),
  ]);
  for (const candidate of candidates) {
    if (isUploadUrl(candidate, filename)) return true;
    // Preserve legacy filenames with spaces or parentheses that span tokens.
    // Check the complete filename plus a URL/markup boundary, never a prefix.
    const literal = candidate.replace(/\/uploads\//gi, '/uploads/');
    const target = '/uploads/' + filename;
    for (let at = literal.indexOf(target); at !== -1; at = literal.indexOf(target, at + target.length)) {
      const following = literal[at + target.length];
      if (!following || /[\s<>"'`()[\]?#]/.test(following)) return true;
    }
    // Scan URL-sized tokens instead of expanding one regex per filename. API
    // content is capped at 200,000 characters; callers stream posts one at a time.
    for (const token of candidate.matchAll(/(?:https?:[\\/]{2}|[\\/]|\.{1,2}[\\/])[^\s<>"'`()[\]]+/gi)) {
      if (isUploadUrl(token[0], filename)) return true;
    }
  }
  return false;
}
