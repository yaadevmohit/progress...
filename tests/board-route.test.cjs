/* eslint-disable @typescript-eslint/no-require-imports */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function load(path, dependencies = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    fileName: 'source.tsx', compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: name => dependencies[name] ?? require(name), Error });
  return exports;
}
test('every Growth Board route receives the account boundary and extension regardless of page implementation', () => {
  const Account = React.createContext(false);
  let providers = 0, bridges = 0;
  const Layout = load('app/growth-board/layout.tsx', {
    './BoardDataProvider': { default: ({ children }) => { providers++; return React.createElement(Account.Provider, { value: true }, children); } },
    './ExtensionBridge': { default: () => { assert.equal(React.useContext(Account), true); bridges++; return null; } },
  }).default;
  const SavedBoard = () => {
    assert.equal(React.useContext(Account), true, 'saved account data must never render as an unconnected guest board');
    return React.createElement('p', null, 'Database board');
  };
  const html = renderToStaticMarkup(React.createElement(Layout, null, React.createElement(SavedBoard)));
  assert.ok(html.includes('Database board'));
  assert.equal(providers, 1);
  assert.equal(bridges, 1);
});
test('missing account boundary fails visibly instead of quietly presenting an empty guest board', () => {
  const { BoardRefreshButton } = load('app/growth-board/BoardDataProvider.tsx', {
    '../auth/AuthProvider': {}, '../auth/SignInRequired': {}, '../auth/AccountButtons': {}, './BoardSkeleton': {}, '../lib/supabase': {},
    './account-board': {}, './model': {}, './offline-sync': {}, './storage': {},
  });
  assert.throws(() => renderToStaticMarkup(React.createElement(BoardRefreshButton)), /account board could not be opened/);
});
