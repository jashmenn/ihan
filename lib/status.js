"use strict";

process.env.BTC_LOG_LEVEL = process.env.BTC_LOG_LEVEL || "warning";
const assert = require("assert");
const bcoin = require("bcoin");
const config = require("../config");
const db = require("./db")();
const btc = require("../btc/node").node;
const util = require("./util");

async function run(argv) {
  await db.open({ url: config.databaseUrl });
  await btc.initialized();

  try {
    // Get the current balance
    let wallet = btc.wallet();
    let currentBalance = await wallet.getBalance();
    let receiveAddress = await wallet.getReceive();

    let status = {
      balance: {
        confirmed: bcoin.btc.Amount
          .fromOptions(currentBalance.confirmed)
          .toSatoshis(),
        unconfirmed: bcoin.btc.Amount
          .fromOptions(currentBalance.unconfirmed)
          .toSatoshis()
      },
      receiveAddress: receiveAddress.toBase58()
    };

    // Get all unpaid installs, grouped by payout
    let unpaidInstallGroups = await db.knexDb.raw(
      "SELECT package_name, count(id)::integer AS count FROM installs WHERE paid_tx IS NULL GROUP BY package_name ORDER BY count"
    );
    status.unpaidInstalls = unpaidInstallGroups.rows;

    console.log(JSON.stringify(status, null, 2));
  } finally {
    setTimeout(
      async () => {
        await btc.close();
        await db.close();
      },
      2000
    );
  }
}

let status = {};
status.run = run;
module.exports = status;
