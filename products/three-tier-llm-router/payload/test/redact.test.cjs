// redact.test.cjs — coverage for the egress redaction firewall.
// Run: node --test test/redact.test.cjs
//
// NOTE: The example "secrets" below are constructed at runtime via string
// concatenation so that the file itself contains no secret-shaped contiguous
// literals — the redactor's regexes still match against the runtime values.

'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { redact, verifyClean, PATTERNS } = require('../lib/redact.cjs');

// ------- Runtime-assembled example values (no secret-shaped literals here) --
const AWS_EXAMPLE   = 'AKIA' + 'IOSFODNN7EXAMPLE';
const GH_PAT        = 'ghp' + '_AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGhIj';
const GH_OHO        = 'gho' + '_1234567890abcdefghijklmnopqrstuvwxAB';
const SLACK_XOXB    = 'xox' + 'b-1234567890-abcdefghijklmno';
const PEM_BEGIN     = '-----' + 'BEGIN RSA PRIVATE KEY' + '-----';
const PEM_END       = '-----' + 'END RSA PRIVATE KEY' + '-----';
const PEM_BLOCK     = `${PEM_BEGIN}\nMIIEpAIBAAKCAQEA...\nabcdefghijklmnop\n${PEM_END}`;
const PEM_TRUNCATED = '-----' + 'BEGIN PRIVATE KEY' + '-----';
// ---------------------------------------------------------------------------

test('redact: null and undefined return empty clean', () => {
  assert.deepEqual(redact(null), { clean: '', hits: [] });
  assert.deepEqual(redact(undefined), { clean: '', hits: [] });
});

test('redact: empty string returns empty clean', () => {
  assert.deepEqual(redact(''), { clean: '', hits: [] });
});

test('redact: throws on non-string input (fail-closed)', () => {
  assert.throws(() => redact(123), /expected string/);
  assert.throws(() => redact({}), /expected string/);
  assert.throws(() => redact([]), /expected string/);
});

test('redact: anthropic key sk-ant-...', () => {
  const input = 'my key is sk-' + 'ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGh and please use it';
  const { clean, hits } = redact(input);
  assert.ok(!/sk-ant/.test(clean), 'anthropic key must be removed');
  assert.ok(hits.some((h) => h.name === 'anthropic_key'), 'should hit anthropic_key');
  assert.equal(verifyClean(clean), true, 'verifyClean must accept scrubbed');
});

test('redact: openai key sk-proj-...', () => {
  const input = 'OPENAI_API_KEY=sk-proj-aBcDeFgHiJkLmNoPqRsTuVwXyZ12';
  const { clean, hits } = redact(input);
  assert.ok(!/sk-proj-/.test(clean), 'openai key must be removed');
  assert.ok(hits.some((h) => h.name === 'openai_key' || h.name === 'inline_secret_assignment'));
  assert.equal(verifyClean(clean), true);
});

test('redact: github PAT (ghp_)', () => {
  const input = `token: ${GH_PAT}`;
  const { clean, hits } = redact(input);
  assert.ok(!/ghp_[A-Za-z0-9]/.test(clean));
  assert.ok(hits.some((h) => h.name === 'github_pat' || h.name === 'inline_secret_assignment'));
});

test('redact: github gho_ tokens', () => {
  const input = GH_OHO;
  const { clean } = redact(input);
  assert.ok(!/gho_[A-Za-z0-9]{20}/.test(clean));
});

test('redact: AWS access key id (AKIA prefix)', () => {
  const input = AWS_EXAMPLE;
  const { clean, hits } = redact(input);
  assert.ok(!/AKIA[0-9A-Z]{16}/.test(clean));
  assert.ok(hits.some((h) => h.name === 'aws_akid'));
});

test('redact: JWT eyJ...', () => {
  const jwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9' +
    '.eyJzdWIiOiIxMjM0NTY3ODkwIn0' +
    '.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
  const input = `Authorization: Bearer ${jwt}`;
  const { clean, hits } = redact(input);
  assert.ok(!/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(clean));
  assert.ok(hits.length >= 1, 'should hit at least one rule');
});

test('redact: PEM private key block — full block', () => {
  const { clean, hits } = redact(PEM_BLOCK);
  assert.ok(!/BEGIN.*PRIVATE KEY/.test(clean), 'PEM block must be removed');
  assert.ok(hits.some((h) => h.name === 'private_key_block'));
  assert.equal(verifyClean(clean), true);
});

test('redact: PEM begin marker alone (truncated key)', () => {
  const input = `config error near ${PEM_TRUNCATED} and then nothing`;
  const { clean } = redact(input);
  assert.ok(!/-----BEGIN/.test(clean));
});

test('redact: slack xoxb token', () => {
  const input = SLACK_XOXB;
  const { clean, hits } = redact(input);
  assert.ok(!clean.includes('xox' + 'b-'));
  assert.ok(hits.some((h) => h.name === 'slack_token'));
});

test('redact: google API key AIza...', () => {
  const input = 'apiKey=AIza' + 'SyDdI0hCZtE6vySjMm-WEfRq3CPzqKqqsHI';
  const { clean, hits } = redact(input);
  assert.ok(!/AIza[A-Za-z0-9_-]{35}/.test(clean));
  assert.ok(hits.length >= 1);
});

test('redact: bearer token', () => {
  const input = 'send Bearer abcdefghijklmnopqrstuvwx-1234 in header';
  const { clean, hits } = redact(input);
  assert.ok(!/Bearer\s+abcdefghijklm/.test(clean));
  assert.ok(hits.some((h) => h.name === 'bearer_token'));
});

test('redact: generic api_key= assignment', () => {
  const input = 'api_key=hunter2supersecret999';
  const { clean, hits } = redact(input);
  assert.ok(!/hunter2supersecret/.test(clean));
  assert.ok(hits.some((h) => h.name === 'inline_secret_assignment'));
});

test('redact: generic password: assignment', () => {
  const input = 'password: "myCorrectHorseBatteryStaple"';
  const { clean, hits } = redact(input);
  assert.ok(!/myCorrectHorse/.test(clean));
  assert.ok(hits.some((h) => h.name === 'inline_secret_assignment'));
});

test('redact: placeholder values are NOT redacted', () => {
  const cases = [
    'api_key=your_key_here',
    'password=changeme',
    'token=${ENV_TOKEN}',
    'secret=process.env.SECRET',
    'api_key=<your_key>',
  ];
  for (const input of cases) {
    const { clean, hits } = redact(input);
    assert.equal(clean, input, `placeholder should not be redacted: ${input}`);
    assert.equal(hits.length, 0, `no hits expected for: ${input}`);
  }
});

test('redact: emails redacted (non-allowlisted)', () => {
  const input = 'contact me at jane.doe@example.org for details';
  const { clean, hits } = redact(input);
  assert.ok(!/jane\.doe@example\.org/.test(clean));
  assert.ok(hits.some((h) => h.name === 'email'));
});

test('redact: allowlisted emails pass through', () => {
  const input = 'send to noreply@anthropic.com and support@anthropic.com';
  const { clean } = redact(input);
  assert.match(clean, /noreply@anthropic\.com/);
  assert.match(clean, /support@anthropic\.com/);
});

test('redact: benign text is unchanged', () => {
  const input = 'Hello world, how does the React component lifecycle work?';
  const { clean, hits } = redact(input);
  assert.equal(clean, input);
  assert.equal(hits.length, 0);
});

test('redact: multiple secrets in one string are all removed', () => {
  const input = `here is ${'sk-' + 'ant-'}AbCdEfGhIjKlMnOpQrStUvWxYzAbCdEfGh
and also ${AWS_EXAMPLE}
plus an email jane@example.org`;
  const { clean, hits } = redact(input);
  assert.ok(!/sk-ant/.test(clean));
  assert.ok(!/AKIA[0-9A-Z]{16}/.test(clean));
  assert.ok(!/jane@example\.org/.test(clean));
  assert.ok(hits.length >= 3);
  assert.equal(verifyClean(clean), true);
});

test('verifyClean: clean text returns true', () => {
  assert.equal(verifyClean('hello world'), true);
  assert.equal(verifyClean(''), true);
  assert.equal(verifyClean(null), true);
});

test('verifyClean: secret text returns false', () => {
  assert.equal(verifyClean('sk-' + 'ant-abcdefghijklmnopqrstuvwxyz123456'), false);
  assert.equal(verifyClean(AWS_EXAMPLE), false);
});

test('verifyClean: non-string returns false (fail-closed)', () => {
  assert.equal(verifyClean(12345), false);
  assert.equal(verifyClean({}), false);
});

test('PATTERNS: all entries have name + pattern', () => {
  assert.ok(PATTERNS.length >= 15, 'should have many patterns');
  for (const p of PATTERNS) {
    assert.ok(typeof p.name === 'string' && p.name.length > 0);
    assert.ok(p.pattern instanceof RegExp);
  }
});
