"use strict";

const r = require("koa-router")();
const sendfile = require('koa-sendfile')
const path = require('path')

r.get("/", function*() {
  yield sendfile(this, path.join(__dirname, '../public/index.html'))
});

r.get("/-/ping", function*() {
  this.body = {};
});

function load (name) {
  let sub = require('./' + name)
  r.use(sub.routes())
  r.use(sub.allowedMethods())
}

load('packages')

module.exports = r;
