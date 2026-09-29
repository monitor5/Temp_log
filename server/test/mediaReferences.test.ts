import { test } from 'node:test';
import assert from 'node:assert/strict';
import { referencesUpload } from '../src/mediaReferences.js';

const filename = 'a1a1a1a1-b2b2-cccc-dddd-eeeeeeeeeeee.png';
const url = '/uploads/' + filename;

test('reference guard handles browser and Markdown spelling variants', () => {
  const variants = [
    url,
    `![photo](${url})`,
    `[download]: ${url} "A title"`,
    `<img src="${url.replace('.png', '&#46;png')}">`,
    `![photo](${url.replace('.png', '&#x2e;png')})`,
    `![photo](${url.replace('.png', '&period;png')})`,
    `![photo](${url.replace('-', '&#45;')})`,
    `![photo](${url.replace('/uploads/', '/UPLOADS/')})`,
    `![photo](${url.replace('.png', '%2Epng')})`,
    `![photo](${url.replace('a1', '%61%31')})`,
    `![photo](${url.replace('.png', '\\.png')})`,
    `![photo](/uploads/folder/../${filename})`,
    `![photo](https://example.test${url}?download=1#file)`,
    `<img src="https://example.test\\uploads\\${filename}">`,
    `![photo](../../uploads/${filename})`,
    `![photo](${url.replace('/uploads/', '/&#117;ploads/')})`,
  ];
  for (const reference of variants) assert.equal(referencesUpload(reference, filename), true, reference);
});

test('reference guard compares full filenames without regex or prefix confusion', () => {
  for (const other of [
    url + '2',
    url.replace('.png', 'Xpng'),
    url.replace('.png', '.png-backup'),
    url.toUpperCase(),
    '/unrelated/' + filename,
    'Plain text without a link',
    undefined,
  ]) assert.equal(referencesUpload(other, filename), false, other);
  assert.equal(referencesUpload('/uploads/a+b.png', 'a+b.png'), true);
  assert.equal(referencesUpload('/uploads/aaab.png', 'a+b.png'), false);
  assert.equal(referencesUpload('/uploads/%ED%95%9C%EA%B8%80.png', '한글.png'), true);
  assert.equal(referencesUpload('/uploads/a&hyphen;b.png', 'a‐b.png'), true);
  assert.equal(referencesUpload('![photo](/uploads/old\\(photo\\).png)', 'old(photo).png'), true);
  assert.equal(referencesUpload('<img src="/uploads/old photo.png">', 'old photo.png'), true);
});
