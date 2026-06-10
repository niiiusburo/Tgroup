// Babel config consumed ONLY by babel-jest during tests. The API runs in
// production via plain `node src/server.js` (no Babel), so this file never
// affects runtime behavior.
//
// Why this exists: src/server.js uses a top-level `return` inside the cluster
// primary-supervisor guard (valid in Node's CommonJS module wrapper, which the
// runtime supports). babel-jest parses files as ES modules/scripts and rejects
// top-level `return` with "'return' outside of function", which makes every
// test suite that `require('../src/server')` fail to even parse. Enabling
// allowReturnOutsideFunction lets babel-jest parse the real server bootstrap.
//
// babel-jest still injects babel-plugin-jest-hoist and
// babel-preset-current-node-syntax on top of this config, so jest.mock()
// hoisting and current-node syntax support are unaffected.
module.exports = {
  parserOpts: { allowReturnOutsideFunction: true },
};
