"use strict";
const knex = require("knex");
const Promise = require("bluebird");

function DB(options) {
  if (!(this instanceof DB)) {
    return new DB(options);
  }
  this.options = options;
  this.knexDb = void 0;
  this.installsTableName = "installs";
}

let instanceR = Promise.defer();

DB.get = async function() {
  return instanceR.promise;
};

DB.prototype.open = async function(options) {
  this.knexDb = knex({
    client: "pg",
    connection: options.url
  });
  await this.ensureTables();
  instanceR.resolve(this);
  return this;
};

DB.prototype.close = async function(options) {
  let r = Promise.defer();
  process.nextTick(async () => {
    await this.knexDb.destroy();
    r.resolve();
  });
  return r.promise;
};

DB.prototype.ensureTables = async function() {
  let has = await this.knexDb.schema.hasTable(this.installsTableName);
  if (!has) {
    return this.createTables();
  }
};

DB.prototype.createTables = async function() {
  return this.knexDb.schema.createTable(this.installsTableName, table => {
    table.increments("id").primary();
    table.string("package_name");
    table.string("package_version");
    table.string("npm_session");
    table.string("paid_tx");
    table.specificType("pay", "varchar(255)[]");
    table.timestamps();
    table.index(["package_name"]);
    table.index(["paid_tx"]);
    return table;
  });
};

DB.prototype.recordInstalls = async function(rows) {
  rows = rows.map(row => {
    let defaults = {
      created_at: new Date(),
      updated_at: new Date()
    };
    return Object.assign(defaults, row);
  });
  return this.knexDb.batchInsert(this.installsTableName, rows);
};

DB.prototype.recordPayouts = async function(txHash, rows) {
  return await Promise.map(rows, row => {
    return this.knexDb(this.installsTableName).where("id", row.id).update({
      paid_tx: txHash,
      updated_at: new Date()
    });
  });
};

module.exports = DB;
