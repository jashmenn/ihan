'use strict'

process.env.NPM_REGISTER_FS_DIRECTORY = 'tmp'
process.env.DATABASE_URL = "postgres://localhost/ihan_test";
process.env.BTC_FS_DIRECTORY = "tmp";
process.env.BTC_NETWORK = "regtest";
process.env.BTC_NODES = "0.0.0.0:19000";
process.env.BTC_LOG_LEVEL = "error";
process.env.BTC_MAX_OUTBOUND = 1;
