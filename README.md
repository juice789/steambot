# Examples

These snippets are meant to be run line-by-line in a Node.js REPL. Start the REPL first:

```
node -e "const repl = require('node:repl'); repl.start({ preview: false });"
```

The `preview: false` flag disables Node's inline expression previews. Without it, the REPL eagerly evaluates expressions as you type, which can trigger side effects (API calls, Proxy traps, async operations) before you intentionally run a line.

---

## 1. Enable 2FA

Run the lines below in order. Two email codes will be requested during the process.

```js
const options = require('./options.json')

const bot = require('./index.js').createBot(options)

var dispatch = await bot.communityLogin(null, null, false)

// Enter email code #1 when prompted
dispatch({ type: 'STEAM_AUTH_CODE', code: '<EMAIL_CODE_1>' })

var dispatch = await bot.setUpAndFinalizeAuth()

// Enter email code #2 when prompted
const account = await dispatch({ type: 'STEAM_AUTH_CODE', code: '<EMAIL_CODE_2>' })

fs.writeFileSync(bot.steam.community.steamID.toString() + '.json', JSON.stringify(account))
```

The last line saves the 2FA secrets to a JSON file named after the account's SteamID. Keep it safe.

---

## 2. Set Up API Key

Requires 2FA to already be enabled.

```js
const options = require('./options.json')

const bot = require('./index.js').createBot(options)

bot.start()

const apiKey = await bot.setUpApiKey()
```

---

## 3. Set up a Steam wallet and redeem a Steam wallet code.

Set `store: true` in your config before running this.

```js
const options = require('./options.json')

const bot = require('./index.js').createBot(options)

bot.start()

const walletCode = '<YOUR_WALLET_CODE>'
const address = { address: '', city: '', country: '', state: '', postalCode: '' }

bot.redeemFirst(walletCode, address).then(console.log)
```

Fill in `walletCode` and the `address` fields before running.
