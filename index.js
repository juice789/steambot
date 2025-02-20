const EventEmitter = require('events')
const Request = require('request')
const SteamUser = require("steam-user")
const Steamcommunity = require("steamcommunity")
const Manager = require("steam-tradeoffer-manager")
const Tf2 = require('tf2')
const { compose, omit, clone } = require('ramda')
const { getInstance } = require('./getInstance.js')
const { mcps } = require('./utils.js')

var MyBot = function MyBot(steam, options) {
    EventEmitter.call(this)
    this.steam = steam
    this.options = options
}

MyBot.prototype = Object.create(EventEmitter.prototype)
MyBot.prototype.constructor = MyBot

const initSteam = (options) => {
    const client = new SteamUser({
        promptSteamGuardCode: false,
        ...options.client
    })
    const communityOptions = clone(options.community)
    if (options.community?.request) {
        communityOptions.request = Request.defaults({
            forever: true,
            ...options.community.request
        })
    }
    const community = new Steamcommunity(communityOptions)
    const manager = new Manager({
        steam: client,
        community: community,
        domain: "localhost",
        language: "en",
        ...options.manager
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
    return new MyBot(steam, omit(['client, community, manager'], options))
}

const createBot = compose(getInstance, initSteam)

module.exports = {
    createBot,
    mcps
}