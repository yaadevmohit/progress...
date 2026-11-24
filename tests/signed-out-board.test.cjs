/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    fileName: 'source.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => dependencies[name] ?? require(name), Error, ...globals });
  return exports;
}
function visibility(auth) {
  return load('app/auth/SignInRequired.tsx', {
    './AuthProvider': { useAuth: () => auth },
    './AccountButtons': { default: () => React.createElement('button', null, 'Sign in') },
    '../growth-board/ThemeToggle': { default: () => React.createElement('button', null, 'Theme') },
    '../growth-board/tracker.module.css': { default: {} },
  });
}
test('signed-out dashboard never renders saved local data, including on a fresh page load', () => {
  for (let reload = 0; reload < 2; reload++) {
    const Gate = visibility({ ready: true, user: null }).default;
    const privateBoard = React.createElement('section', null, 'PRIVATE STORED SESSION');
    const html = renderToStaticMarkup(React.createElement(Gate, null, privateBoard));
    assert.ok(html.includes('Sign in to view your board'));
    assert.ok(!html.includes('PRIVATE STORED SESSION'));
  }
});
test('resolving authentication hides data until readiness, and a signed-in account can render its board', () => {
  for (const [auth, expected] of [
    [{ ready: false, user: null }, false],
    [{ ready: false, user: { id: 'alice' } }, false],
    [{ ready: true, user: { id: 'alice' } }, true],
  ]) {
    const Gate = visibility(auth).default;
    const html = renderToStaticMarkup(React.createElement(Gate, null, React.createElement('p', null, 'ACCOUNT CONTENT')));
    assert.equal(html.includes('ACCOUNT CONTENT'), expected);
  }
});
test('Growth Board unmounts its complete dashboard immediately on sign-out, without reading or deleting guest storage', () => {
  let auth = { ready: true, user: { id: 'alice' }, error: '' };
  const Visibility = visibility({ ready: true, user: null });
  let hookIndex = 0;
  const Provider = load('app/growth-board/BoardDataProvider.tsx', {
    react: { ...React, useState: initial => [hookIndex++ === 0 ? 'alice' : initial, () => {}] },
    '../auth/AuthProvider': { useAuth: () => auth },
    '../auth/SignInRequired': Visibility,
    '../auth/AccountButtons': {}, './BoardSkeleton': {}, '../lib/supabase': {},
    './account-board': {}, './model': {}, './offline-sync': {}, './storage': {},
  }, { localStorage: new Proxy({}, { get() { assert.fail('sign-out display must not read, clear, or overwrite saved data'); } }) }).default;
  const board = React.createElement('p', null, 'PRIVATE ACCOUNT BOARD');
  assert.ok(renderToStaticMarkup(React.createElement(Provider, null, board)).includes('PRIVATE ACCOUNT BOARD'));
  auth = { ready: true, user: null, error: '' };
  const html = renderToStaticMarkup(React.createElement(Provider, null, board));
  assert.ok(html.includes('Sign in to view your board'));
  assert.ok(!html.includes('PRIVATE ACCOUNT BOARD'));
});

test('the legacy dashboard header cannot expose its old log-session controls after sign-out', () => {
  let auth = { user: { id: 'alice' } };
  const Header = load('app/ui/components/Header.tsx', {
    'next/navigation': { usePathname: () => '/dashboard' },
    './Header.module.css': { default: {} },
    './LogSession': { default: () => React.createElement('button', null, 'PRIVATE TIMER CONTROL') },
    '../../auth/AuthProvider': { useAuth: () => auth },
    '../../auth/AccountButtons': { default: () => React.createElement('button', null, 'Account') },
  }).default;
  assert.ok(renderToStaticMarkup(React.createElement(Header)).includes('PRIVATE TIMER CONTROL'));
  auth = { user: null };
  assert.ok(!renderToStaticMarkup(React.createElement(Header)).includes('PRIVATE TIMER CONTROL'));
});
