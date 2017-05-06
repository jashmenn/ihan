"use strict";
const knex = require("knex");
const Address = require("bcoin").address;

let util = {};

util.isBTCAddress = function(str) {
  let isAddress = true;
  try {
    Address.fromBase58(str);
  } catch(e) {
    isAddress = false;
  }
  return isAddress;
}

// TODO allow for another network like litecoin
util.extractPayees = function(pkg) {
  // TODO extract from the version being requested, not just latest. This isn't
  // exactly straightforward because the npm client will cache versions and
  // doesn't necessarily send the version number every time.
  let version = pkg["dist-tags"]["latest"];
  let pkgV = pkg["versions"][version];
  let rawPayees;

  if (pkgV.pay) {
    rawPayees = pkgV.pay;
  } else if (pkgV.config && pkgV.config.pay) {
    rawPayees = pkgV.config.pay;
  }

  if (!rawPayees) {
    return;
  }

  let payees = Array.isArray(rawPayees) ? rawPayees : [rawPayees];

  // validate that these are, in fact, btc address 
  payees = payees.filter(util.isBTCAddress)

  // de-duplicate
  payees = Array.from(new Set(payees).values());

  return payees;
};

module.exports = util;
