# ihan - bitcoin-paying npm proxy 💰

[![chat][chat-badge]][chat]
[![version][version-badge]][package]
[![MIT License][license-badge]][LICENSE]

[![All Contributors](https://img.shields.io/badge/all_contributors-1-orange.svg?style=flat-square)](#contributors)
[![PRs Welcome][prs-badge]][prs]

[![Watch on GitHub][github-watch-badge]][github-watch]
[![Star on GitHub][github-star-badge]][github-star]
[![Tweet][twitter-badge]][twitter]

Ihan (If I Had A Nickel) is a bitcoin-paying npm proxy. More generally, it's a tool for developers to get paid for writing libraries that are used.

> Ihan is based on [npm-register](https://www.npmjs.com/package/npm-register) and [bcoin](https://www.npmjs.com/package/bcoin)

[![Deploy to Heroku](https://www.herokucdn.com/deploy/button.png)](https://heroku.com/deploy)

## What is this?

Ihan is an npm proxy that checks for the existence of a `pay` key in the `package.json` of npm packages. The idea is that package installers will 1. host their own Ihan instance 2. install packages through this proxy and 3. setup a recurrent payment to the packages that were installed.

## Why do this?

This project is an experiment on the patronage/donation model of funding open-source software. It benefits developers in that, if you opt-in, you'll automatically be paid if your library is installed (even transitively).

For companies, this offers an **automated way to pay for what you're using** without having to pick and maintain donations or hire the maintainers as employees. It also acts as a caching npm proxy which can provide deployment redundancy.

## How to use it

### To get paid as a library writer

Add `pay` to your `package.json` like this:

```
{
  "name": "pineapplemacaroon",
  "version": "0.0.3",
  // ...
  "pay": "1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z",
}
```

> To add multiple payees, see [pay format](#pay_format) below

If you don't already have an address, you can easily generate one by running [gen-hd-keypair](https://github.com/jashmenn/gen-hd-keypair):

```
$ npm install -g gen-hd-keypair
$ gen-hd-keypair 

🔒  Root mnemonic (private): lake effort journey rug stairs embark journey load decline riot dynamic cram
🔒  Master xprivkey (private): xprv9s21ZrQH143K2a6bXRKgyyECju6LHzKo8SbnsEXoYa2f3fgHBLDtc7dPEv63HMfmee7bxaAmhEPDjWhztmDaAwKhQsKAMJuL2EYSQfkzGhe
-----
🔒  First WIF (private): L5JvffBunctw2yfLV6GMD43FJgyNmfNPSZXyAUsPq72VmkjR5xrY
⭐  First receiving address (public): 1NwZRGUTw4khTmuV31EUBBQQv37Zrxi9Uu
```

(or get an address from a wallet like [Bitcoin Core](https://bitcoin.org/en/download) or [Coinbase](https://www.coinbase.com/)

### To host a proxy

**This software generates a bitcoin wallet upon install**. It's important that you keep private keys private.

The simplest way to deploy is to use the _Deploy To Heroku_ button above.

You can find the list of configuration options in [config.js](config.js).

Ihan is based on [npm-register](https://www.npmjs.com/package/npm-register), therefore see [npm-register](https://github.com/dickeyxxx/npm-register/blob/master/config.js configuration options) as well.

### Using the proxy (when you install libraries)

When you install a library with `npm`, use your Ihan server as the registry.

You can either do this globally: 

```
$ npm update --registry http://urltomyregistry
```

Or when you install an individual package:

```
$ npm install --registry http://urltomyregistry leftpad
```

### Making Payments

To make payments use `ihan payout`.

```
$ ./bin/ihan payout --dry --max 500000
# or e.g.
$ heroku run ./bin/ihan payout --dry --max 500000
```

The suggested implementation is that this command is put on a recurring timer such as a cron job.

### Server Status

You can view the current state of your server, wallet balance, and unpaid installs by using the `status` command.

```
$ ./bin/ihan status
# or e.g.
$ heroku run ./bin/ihan status

{
  "wallet": {
    "balance": {
      "confirmed": "0.92",
      "unconfirmed": "0.99"
    },
    "receiveAddress": "mpXYLPDfien1huinLm2Ado99NFup9hVkag"
  },
  "unpaidInstalls": [
    {
      "package_name": "leftpad",
      "count": 2
    }
  ]
}
```

You can **also view your private keys** with the `--private` flag. The pro is that you can reuse your wallet with other software, the con is that this means anyone with access to this server has access to your private keys. P

## How Payment is Calculated

The default settings will **pay out the value of the entire wallet**. The idea is that you'd fund the wallet on a recurring basis, and then run the payout script when the wallet is funded.

Roughly, the payment amount is split proportionally according to the number of unpaid installs recorded. If multiple `pay` addresses exist, the _package_ receives its share, and then the addresses are split evenly from that amount.

**Ihan itself is paid proportionally** (see below). Rounding errors (and "dust") are given to miners as fees.

See: [payout.js](lib/payout.js) for the details.

## Important: ihan gets paid proportionally

To fund this work, ihan gets a proportional share **as if ihan itself were installed once per npm install session**.

## Pay Format {#pay_format}

The `pay` key can accept:

* A string containing an address:

```
  "pay": "1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z",
```

* An array of strings containing addresses:

```
  "pay": [
    "1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z",
    "1MqqaEHDmfq65gie6RHNsrJZDMZoeB5E6"
    ],
```

`FUTURE`

* An array of objects specifying protocol, address, and split:

```
  "pay": [
    { protocol: "BTC", address: "1B1KNRu6L8n3VFaF9MrU7K87QQALZqL57z", split: 0.8 },
    { protocol: "BTC", address: "1MqqaEHDmfq65gie6RHNsrJZDMZoeB5E6", split: 0.2 }
  ]
```

## Testing

You can test this locally by using your own test network and miners via [`freewil/bitcoin-testnet-box`](https://github.com/freewil/bitcoin-testnet-box).

```
# in tab one:
docker run -t -i -p 19000:19000 -p 19001:19001 -p 19011:19011 freewil/bitcoin-testnet-box
make start
make generate BLOCKS=300

# in tab two:
env BTC_NETWORK=regtest BTC_NODES=0.0.0.0:19000 BTC_MAX_OUTBOUND=1 nodemon ./bin/ihan start
```

Keep in mind:

* Use the same `env` variables if you use other commands such as `ihan status` or `ihan payout`
* Make sure you remember to mine blocks after sending transactions or they won't appear in your wallet

## Objections

* **Q: Won't this cause people to install their own package a bunch of times?**
* A: Probably. The idea is that you'd host your own instance, so if this happened, it would be within your own organization and presumably you trust your co-workers/employees.
* **Q: Does number of installs really capture the value a package is giving me?**
* A: No, not exactly. It's an approximation.

## Limitations

* BTC only for now, but Litecoin, ETH, ZCash or even PayPal are obvious extensions
* npm only for now, but Maven, Rubygems, etc. are also planned extensions

## Future Work

* **Calculation-only** - Maybe hosting a whole wallet is unnecessary. Maybe instead this could simply track installs and _calculate_ what payments should be and provide scripts for easy payment out of an external wallet.
* **Hosted Product** - This might have more success as a hosted product that accepts USD instad of BTC because many companies can't buy BTC and send it to anonymous addresses. 

## Contributors

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
| [<img src="https://avatars1.githubusercontent.com/u/4318?v=3" width="100px;"/><br /><sub>Nate Murray</sub>](http://eigenjoy.com)<br />[💬](#question-jashmenn "Answering Questions") [💻](https://github.com/jashmenn/ihan/commits?author=jashmenn "Code") |
| :---: |
<!-- ALL-CONTRIBUTORS-LIST:END -->

## License

MIT

[chat-badge]: https://img.shields.io/badge/chat-on%20gitter-46BC99.svg?style=flat-square
[chat]: https://gitter.im/jashmenn/ihan?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge
[version-badge]: https://img.shields.io/npm/v/ihan.svg?style=flat-square
[package]: https://www.npmjs.com/package/ihan
[license-badge]: https://img.shields.io/npm/l/ihan.svg?style=flat-square
[license]: https://github.com/jashmenn/ihan/blob/master/LICENSE
[prs-badge]: https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square
[prs]: http://makeapullrequest.com
[github-watch-badge]: https://img.shields.io/github/watchers/jashmenn/ihan.svg?style=social
[github-watch]: https://github.com/jashmenn/ihan/watchers
[github-star-badge]: https://img.shields.io/github/stars/jashmenn/ihan.svg?style=social
[github-star]: https://github.com/jashmenn/ihan/stargazers
[twitter]: https://twitter.com/intent/tweet?text=Ihan%20is%20a%20bitcoin%20paying%20npm%20proxy%20https%3A%2F%2Fgithub.com%2Fjashmenn%2Fihan
[twitter-badge]: https://img.shields.io/twitter/url/https/github.com/jashmenn/ihan.svg?style=social
