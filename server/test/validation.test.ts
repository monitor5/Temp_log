import { test } from 'node:test';
import assert from 'node:assert/strict';
import { postCreate, postQuery, postUpdate, mediaUrl } from '../src/validation.js';
test('new posts are drafts unless publishing is explicit', () => {
  const post = postCreate.parse({title: '기록', content: '본문'});
  assert.equal(post.isHidden, true);
  assert.equal(postCreate.parse({...post, isHidden: false}).isHidden, false);
});
test('query and update reject operator injection and invalid pagination', () => {
  for (const input of [{page: 'NaN'}, {page: -1}, {limit: 100000}, {sort: '$where'}, {query: {$ne: ''}}, {includeHidden: ['true']}]) assert.equal(postQuery.safeParse(input).success, false);
  assert.equal(postUpdate.safeParse({$set: {isHidden: false}}).success, false);
});
test('media URLs reject active schemes and scheme-relative destinations', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//evil.example/a', '/uploads/../secret', '/uploads/x?redirect=1']) {
    assert.equal(mediaUrl.safeParse(value).success, false, value);
  }
  assert.equal(mediaUrl.safeParse('/uploads/example.png').success, true);
  assert.equal(mediaUrl.safeParse('https://example.com/a.jpg').success, true);
});

test('reserved slugs and whitespace-only content cannot create broken posts', () => {
  for (const slug of ['featured', 'abcdefabcdefabcdefabcdef']) {
    assert.equal(postCreate.safeParse({title: 'Test', content: 'Body', slug}).success, false);
    assert.equal(postUpdate.safeParse({slug}).success, false);
  }
  assert.equal(postCreate.safeParse({title: 'Test', content: ' \n\t '}).success, false);
  assert.equal(postUpdate.safeParse({content: ' '}).success, false);
  assert.equal(postCreate.parse({title: 'Test', content: '    code\n'}).content, '    code\n');
});
