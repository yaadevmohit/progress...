/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto').webcrypto;
function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports, require: name => dependencies[name] ?? require(name), URL, Headers, Buffer, crypto, ...globals });
  return exports;
}
const policy = load('security/headers.ts');
test('production CSP allows only the configured Supabase origin and nonce-authorized scripts', () => {
  const csp = policy.contentSecurityPolicy('random-value', 'https://project.supabase.co');
  assert.ok(csp.includes("script-src 'self' 'nonce-random-value' 'strict-dynamic'"));
  assert.ok(!csp.includes("'unsafe-eval'"));
  assert.ok(csp.includes("connect-src 'self' https://project.supabase.co wss://project.supabase.co"));
  assert.ok(!csp.includes('https://*.supabase.co'));
  assert.ok(csp.includes("frame-ancestors 'none'"));
  assert.ok(csp.includes("object-src 'none'"));
  assert.throws(() => policy.contentSecurityPolicy('n', 'http://project.supabase.co'), /HTTPS/);
});
test('local development supports hot reload without permitting eval in production', () => {
  assert.ok(policy.contentSecurityPolicy('n', 'http://127.0.0.1:54321', true).includes("'unsafe-eval'"));
  assert.ok(!policy.contentSecurityPolicy('n', undefined, true).includes('upgrade-insecure-requests'));
  assert.ok(policy.contentSecurityPolicy('n', undefined).includes('upgrade-insecure-requests'));
});
test('requests receive unique nonces and cannot supply their own script authorization', () => {
  const proxy = load('proxy.ts', {
    './security/headers': policy,
    'next/server': { NextResponse: { next: options => ({ options, headers: new Headers() }) } },
  }, { process: { env: { NODE_ENV: 'production' } } }).proxy;
  const request = { headers: new Headers({ 'x-nonce': 'attacker-controlled', 'Content-Security-Policy': "script-src 'unsafe-inline'" }) };
  const first = proxy(request), second = proxy(request);
  const nonce = first.options.request.headers.get('x-nonce');
  assert.ok(nonce && nonce !== 'attacker-controlled');
  assert.notEqual(nonce, second.options.request.headers.get('x-nonce'));
  assert.equal(first.options.request.headers.get('Content-Security-Policy'), first.headers.get('Content-Security-Policy'));
  assert.ok(first.headers.get('Content-Security-Policy').includes(`'nonce-${nonce}'`));
  assert.equal(first.headers.get('Cache-Control'), 'private, no-store');
});
test('baseline headers deny framing, MIME sniffing, and unused device permissions', () => {
  const headers = Object.fromEntries(policy.SECURITY_HEADERS.map(item => [item.key, item.value]));
  assert.equal(headers['X-Frame-Options'], 'DENY');
  assert.equal(headers['X-Content-Type-Options'], 'nosniff');
  assert.equal(headers['Referrer-Policy'], 'strict-origin-when-cross-origin');
  assert.ok(headers['Permissions-Policy'].includes('camera=()'));
});
