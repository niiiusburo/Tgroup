'use strict';

/**
 * Invoke a MOUNTED route's real middleware chain in-process, in order, without HTTP.
 *
 * Why not supertest here: in this environment express 5 + supertest intermittently answers
 * roughly 2% of requests with a transport-level 400 and an empty body — reproduced with a
 * bare express app containing no project code, and it never reaches the app's error handler.
 * That makes guard-ordering assertions flaky for reasons unrelated to the code under test.
 *
 * Dispatching the router's own layer stack keeps exactly what these suites are about — which
 * guard is mounted first and what each real middleware does — and removes the flaky
 * transport. Suites that need genuine HTTP semantics (headers, status codes on the wire)
 * should still use supertest.
 *
 * Not a test file: this lives outside __tests__ and is not named *.test.js, so Jest's default
 * testMatch ignores it.
 */

function findRouteLayer(router, method, path) {
  const wanted = method.toLowerCase();
  return router.stack.find(
    (layer) => layer.route?.path === path && layer.route.methods[wanted],
  );
}

function responseDouble() {
  const res = {
    statusCode: 200,
    body: undefined,
    finished: false,
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      res.finished = true;
      return res;
    },
  };
  return res;
}

/**
 * @returns {Promise<{statusCode:number, body:any, finished:boolean, reachedHandlers:number}>}
 */
async function dispatchRoute(router, method, path, req) {
  const layer = findRouteLayer(router, method, path);
  if (!layer) {
    throw new Error(`route not mounted: ${method.toUpperCase()} ${path}`);
  }
  const res = responseDouble();
  let reachedHandlers = 0;

  for (const entry of layer.route.stack) {
    reachedHandlers += 1;
    let advanced = false;
    // Sequential by definition: the point is to observe the mounted order.
    // eslint-disable-next-line no-await-in-loop
    await new Promise((resolve, reject) => {
      const next = (err) => {
        advanced = true;
        return err ? reject(err) : resolve();
      };
      Promise.resolve(entry.handle(req, res, next)).then(() => {
        if (!advanced) resolve();
      }, reject);
    });
    if (res.finished && !advanced) {
      break;
    }
  }

  return { ...res, statusCode: res.statusCode, body: res.body, reachedHandlers };
}

module.exports = { dispatchRoute, findRouteLayer, responseDouble };
