const SteamUser = require("steam-user")
const Steamcommunity = require("steamcommunity")
const Manager = require("steam-tradeoffer-manager")
const Tf2 = require('tf2')
const { compose } = require('ramda')
const { getInstance } = require('./getInstance.js')

const EventEmitter = require('events')

var MyBot = function MyBot(steam, options) {
    EventEmitter.call(this)
    this.steam = steam
    this.options = options
}

MyBot.prototype = Object.create(EventEmitter.prototype)
MyBot.prototype.constructor = MyBot

const initSteam = (options) => {
    const client = new SteamUser({ "promptSteamGuardCode": false })
    const community = new Steamcommunity()
    const manager = new Manager({
        "steam": client,
        "community": community,
        "domain": "localhost",
        "language": "en"
    })
    let tf2
    if (options.tf2) {
        tf2 = new Tf2(client)
    }
    const steam = {
        client,
        community,
        manager,
        tf2
    }
    return new MyBot(steam, options)
}

const createBot = compose(getInstance, initSteam)

module.exports = {
    createBot
}