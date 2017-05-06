const path = require("path");
const sqldown = require("sqldown");
const config = require("../config");

/**
 * bcoin uses leveldown for it's database, so we can shoehorn this into postgres
 * by using sqldown. This file exists because the loader uses `require`, so we
 * have to put it in it's own file
 **/
function makeDB(file) {
  let tablename = path.basename(file, ".db");
  let pgURL = `${config.databaseUrl}?table=${tablename}`;
  return sqldown(pgURL);
}

module.exports = makeDB;
