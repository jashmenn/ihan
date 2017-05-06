"use strict";

const app = require("./server");
const config = require("./config");
const db = require("./lib/db")();
const btc = require("./btc/node").node;

db.open({ url: config.databaseUrl }).then(_ => {
  app.db = db;
  app.btc = btc;
  app.listen(app.port, function() {
    console.error(`${app.name} listening on port ${app.port} [${app.env}]`);
  });
});
