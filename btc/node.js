"use strict";
const assert = require("assert");
const bcoin = require("bcoin");
const HTTPServer = require("bcoin/lib/http/server");
const walletdbPlugin = require("bcoin/lib/wallet/plugin");
const co = bcoin.co;
const path = require("path");
const config = require("../config");
const db = require("../lib/db")();
const Promise = require("bluebird");

// Don't start the SPVNode RPC server
HTTPServer.unsupported = true;

function BTCNode(options) {
  if (!(this instanceof BTCNode)) {
    return new BTCNode(options);
  }
  this.node = this.walletDB = this.logger = void 0;
  this._initializedR = Promise.defer();
  this.init();
}

BTCNode.prototype.init = async function() {
  let nodeOpts = {
    config: true,
    prefix: config.btc.directory,
    network: config.btc.network,
    env: true,
    logFile: true,
    logConsole: true,
    logLevel: config.btc.logLevel,
    db: path.join(__dirname, "./btc-db.js"),
    persistent: true,
    listen: true,
    loader: require
  };

  if (config.btc.nodes) {
    nodeOpts.nodes = config.btc.nodes;
  }
  if (config.btc.maxOutbound) {
    nodeOpts.maxOutbound = config.btc.maxOutbound;
  }

  let node = this.node = bcoin.spvnode(nodeOpts);
  let walletDB = this.walletDB = node.use(walletdbPlugin);
  let logger = this.logger = node.logger.context("ihan");

  node.on("error", function(err) {});

  await node.ensure();
  await node.open();
  await node.connect();

  // it's worth thinking through if we want to spawn a co here or not
  co
    .spawn(function*() {
      node.startSync();
    })
    .catch(function(err) {
      throw err;
    });

  await walletDB.open();

  let wallet = walletDB.primary;
  let master = wallet.master;

  logger.info("Receive Address:", wallet.getReceive());
  logger.info("Balance:", await wallet.getBalance());

  wallet.on("balance", newBalance => {
    logger.info("Balance:", newBalance);
  });
  this._initializedR.resolve(this);
};

BTCNode.prototype.initialized = async function() {
  return this._initializedR.promise;
}

BTCNode.prototype.wallet = function() {
  return this.walletDB.primary;
}

BTCNode.prototype.close = async function() {
  // await this.walletDB._close();
  await this.node.stopSync();
  return this.node._close();
}

let btc = {};

btc.BTCNode = BTCNode;
btc.node = new BTCNode();

module.exports = btc;
