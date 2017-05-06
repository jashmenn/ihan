"use strict";
/* global beforeEach */

process.env.DATABASE_URL = "postgres://localhost/ihan_test";

const config = require("../config");
const DB = require("../lib/db");

let db = DB();

before(async () => {
  return await db.open({ url: config.databaseUrl }).then(async _ => {
    let knex = db.knexDb;
    await knex.schema.dropTableIfExists(db.installsTableName);
    await db.ensureTables();
  });
});

after(() => {
  db.close();
});

module.exports = db;
