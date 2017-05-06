const url = require("url");
const assignDeep = require("assign-deep");
const parentConfig = require("npm-register/config");
const env = process.env;

// see also npm-register/config
module.exports = assignDeep(parentConfig, {
  databaseUrl: env.DATABASE_URL || "postgres://localhost:5432/ihan",
  btc: {
    directory: env.BTC_FS_DIRECTORY || "tmp",
    network: env.BTC_NETWORK || "main",
    nodes: env.BTC_NODES,
    logLevel: env.BTC_LOG_LEVEL || "debug",
    maxOutbound: env.BTC_MAX_OUTBOUND,
    feeRate: env.BTC_FEE_RATE || 101
  }
});
