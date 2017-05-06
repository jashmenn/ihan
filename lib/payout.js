"use strict";

const assert = require("assert");
const knex = require("knex");
const assignDeep = require("assign-deep");
const bcoin = require("bcoin");
const pkgMeta = require("../package.json");
const config = require("../config");
const db = require("./db")();
const btc = require("../btc/node").node;
const util = require("./util");

// calculatePayeeAmounts
//
// Calculates proportional payouts based on the number of times something was
// installed.
//
// TODO: probably better to use integer arithmetic here, but the dust is going
// to miners in any case
function calculatePayeeAmounts(totalAmount, packagePays, opts) {
  opts = assignDeep({ validate: true }, opts);

  // TODO filter out payees which are invalid here, too
  let totalCount = packagePays.reduce((acc, pp) => acc + pp.count, 0);
  let totalPayees = Object.keys(
    packagePays.reduce(
      (acc, pp) => {
        pp.pay.map(payee => acc[payee] = true);
        return acc;
      },
      {}
    )
  ).length;

  assert(totalCount > 0, "Payout requires non-zero installs");
  assert(totalAmount >= totalPayees, "Can't payout fewer than 1 per payee");

  let outputs = packagePays.reduce(
    (acc, pp) => {
      // for each packagepay, the value to this _group_ is the count/totalCount
      let groupValue = pp.count / totalCount;

      // then the individual payee amounts are an equal share in the group
      let groupMembers = pp.pay.length;
      let individualPercentage = groupValue / groupMembers;

      pp.pay.map(payee => {
        let additionalValue = Math.floor(totalAmount * individualPercentage);
        acc[payee] = acc[payee] || 0;
        acc[payee] = acc[payee] + additionalValue;
      });

      return acc;
    },
    {}
  );

  // calculate the dust left over
  let assigned = Object.values(outputs).reduce((acc, v) => acc + v, 0);
  outputs._dust = totalAmount - assigned;

  return outputs;
}

async function run(argv) {
  console.log("argv", argv);
  await db.open({ url: config.databaseUrl });
  await btc.initialized();
  let logger = btc.node.logger.context("payout");

  try {
    // Get the current balance
    let wallet = btc.wallet();
    let currentBalance = await wallet.getBalance();
    logger.info("currentBalance", currentBalance);

    let balanceSatoshis = bcoin.btc.Amount
      .fromOptions(
        Math.min(currentBalance.confirmed, currentBalance.unconfirmed)
      )
      .toSatoshis();

    if (argv.max) {
      balanceSatoshis = Math.min(balanceSatoshis, argv.max);
    }

    // We don't want to payout if > 50% is just going to the minimum fee
    let minBalance = bcoin.mtx.Selector.MIN_FEE * 2;
    assert(
      balanceSatoshis > minBalance,
      `Balance is too low to payout. Minimum: ${minBalance}`
    );

    // TODO Add transactions here (e.g. using knex.transacting)
    // For now this generally won't be a problem as the payouts are usually
    // running less than once per day by a single process

    // Get all unpaid installs - we'll use these individual records for updating below
    let unpaidInstalls = await db.knexDb.raw(
      "SELECT id FROM installs WHERE paid_tx IS NULL"
    );
    assert(unpaidInstalls.rows.length > 0, "There are no unpaid installs");

    // Get all unpaid installs, grouped by payout
    let unpaidInstallGroups = await db.knexDb.raw(
      "SELECT package_name, pay, count(id)::integer AS count FROM installs WHERE paid_tx IS NULL GROUP BY package_name, pay"
    );
    assert(
      unpaidInstallGroups.rows.length > 0,
      "There are no unpaid install groups"
    );

    // Pay ihan proportionally according to the number of unpaid sessions
    // e.g. as if it was installed once per `npm install`
    let unpaidSessions = await db.knexDb.raw(
      "SELECT count(distinct npm_session)::integer AS count FROM installs WHERE paid_tx IS NULL"
    );
    assert(unpaidSessions.rows[0].count > 0, "There are no unpaid sessions");

    // create the packagePays, adding ihan itself to this list
    let packagePays = unpaidInstallGroups.rows.concat([
      {
        package_name: pkgMeta.name,
        pay: pkgMeta.pay,
        count: unpaidSessions.rows[0].count
      }
    ]);

    // Because we're paying out our entire wallet balance, we need to create a
    // fake transaction that is similar in size so that we can calculate an
    // appropriate fee.
    //
    // Miner fees are based on the data-size (e.g. in kilobyes) of the
    // transaction (not the total value in btc).
    //
    // We'll use the size of the fake transaction to calculate a fee, and then
    // subtract that fee from the payout amounts.

    let fee;
    {
      // This block creates a fake tx which we use for fee calculation

      // get the uniq'd list of payout addresses
      let recepientAddresses = Object.keys(
        packagePays.reduce(
          (acc, pp) => {
            pp.pay.map(payee => acc[payee] = true);
            return acc;
          },
          {}
        )
      );

      // create a fake payout value, this is just used for size estimation
      let fakePayoutValue = Math.floor(
        (balanceSatoshis - bcoin.mtx.Selector.MIN_FEE) /
          recepientAddresses.length
      );

      let outputs = recepientAddresses.map(address => ({
        value: fakePayoutValue,
        address: address
      }));

      let txOptions = {
        rate: config.btc.feeRate,
        confirmed: true,
        outputs
      };

      // create a fake transaction to estimate fees
      var unlock = await wallet.fundLock.lock();
      let fakeTX;
      try {
        fakeTX = await wallet.createTX(txOptions, true);
        let sizeEstimate = await fakeTX.estimateSize(
          wallet.estimateSize.bind(wallet)
        );

        // now we can estimate our fee
        fee = sizeEstimate * config.btc.feeRate;
      } finally {
        unlock();
      }
      await wallet.remove(fakeTX.hash("hex"));
    } // end fake tx, fee calculation

    logger.info("Calculated Fee", fee);

    // Calculate our real payout amounts, given the fee
    let payouts = calculatePayeeAmounts(balanceSatoshis - fee, packagePays);
    logger.info("Payouts", payouts);

    // Now create our real transaction outputs
    let outputs = Object.keys(payouts).reduce((acc, k) => {
      if (util.isBTCAddress(k)) {
        acc.push({ address: k, value: payouts[k] });
      }
      return acc;
    }, []);

    // Create and send the tx
    let txOptions = {
      hardFee: fee,
      confirmed: true,
      outputs
    };
    logger.info("txOptions", txOptions);

    if (!argv.dry) {
      let tx = await wallet.send(txOptions);
      logger.info("Sent tx", tx);

      // Update install payout records
      await db.recordPayouts(tx.hash("hex"), unpaidInstalls.rows);
    }
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

let payout = {};
payout.run = run;
payout.calculatePayeeAmounts = calculatePayeeAmounts;
module.exports = payout;
