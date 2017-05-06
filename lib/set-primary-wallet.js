"use strict";

// process.env.BTC_LOG_LEVEL = process.env.BTC_LOG_LEVEL || "warning";
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
    let logger = btc.logger;
    let wallet = btc.wallet();
    let walletDB = btc.walletDB;
    let primaryWallet = walletDB.primary;

    if (argv.mnemonic) {
      // if you're given a mnemonic, we want to import a wallet this as primary
      let mnemonic = bcoin.hd.Mnemonic.fromPhrase(argv.mnemonic);
      let master = bcoin.hd.fromMnemonic(mnemonic, config.btc.network);

      let currentMasterKey = primaryWallet.master.key;
      let givenMnemonicMasterKey = master;

      // probably better to use a constant time algo here
      assert(
        !bcoin.utils.util.equal(
          currentMasterKey.publicKey,
          givenMnemonicMasterKey.publicKey
        ),
        "This mnemonic is alredy the master key."
      );

      let walletOpts = {
        master
      };

      let mWallet = await walletDB.create(walletOpts);
      let wallets = await walletDB.getWallets();
      logger.info("walletDB.getWallets()", wallets);

      // What do we want to do with this? Delete it? For now, just rename it
      let newName = `oldPrimary-${new Date().valueOf()}`;
      logger.info(`renaming primary to ${newName}`);
      await walletDB.rename(primaryWallet, newName);

      let wid = walletDB.start(mWallet);
      walletDB.save(mWallet);
      await walletDB.commit(mWallet);

      logger.info(`renaming ${mWallet.id} to primary`);
      await walletDB.rename(mWallet, "primary");

      wallets = await walletDB.getWallets();
      logger.info("walletDB.getWallets()", wallets);
      wallet = mWallet;
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

let setPrimaryWallet = {};
setPrimaryWallet.run = run;
module.exports = setPrimaryWallet;
