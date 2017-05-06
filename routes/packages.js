"use strict";

const r = require("koa-router")();
const got = require("got");
const url = require("url");
const tunnel = require("tunnel");
const packages = require("npm-register/lib/packages");
const middleware = require("npm-register/middleware");
const config = require("../config");
const DB = require("../lib/db");
const util = require("../lib/util");

// Ideally this function would be exported from lib/npm instead of reimplementing it here
function* getPkgConfig(name) {
  let opts = { timeout: config.timeout, headers: {} };
  if (config.httpProxyHost && config.httpProxyPort) {
    opts.agent = tunnel.httpOverHttp({
      proxy: {
        host: config.httpProxyHost,
        port: config.httpProxyPort,
        proxyAuth: config.httpProxyAuth
      }
    });
  }
  let res = yield got(
    url.resolve(config.uplink.href, "/" + name.replace(/\//, "%2F")),
    opts
  );
  let pkg = JSON.parse(res.body);
  return pkg;
}

r.use("/:name", middleware.auth.read, function*(next) {
  if (this.req.method !== "GET") {
    return yield next;
  }

  let etag = this.req.headers["if-none-match"];
  let pkg = yield packages.get(this.params.name, etag);

  if (pkg === 304) {
    pkg = yield getPkgConfig(this.params.name);
    if (!pkg.versions) this.status = 404;
  }
  if (pkg === 404) {
    this.status = 404;
    this.body = { error: "no such package available" };
    return;
  }

  let db = yield DB.get();
  let payees = util.extractPayees(pkg);

  if(payees && payees.length > 0) {
    yield db.recordInstalls([{
      package_name: pkg.name,
      // package_version: ... todo
      npm_session: this.req.headers["npm-session"],
      pay: payees
    }]);
  }

  yield next;
});

module.exports = r;
