"use strict";
/* global beforeEach */

process.env.PORT = "7129";

const config = require("../config");
const db = require("./db");
const app = require("../server");

let server;

before(async () => {
  app.db = db;
  server = app.listen(process.env.PORT);
});

after(() => {
  server.close();
});

module.exports = app;
