const EventEmitter = require('events')
const Request = require('request')
const SteamUser = require("steam-user")
const Steamcommunity = require("steamcommunity")
const Manager = require("steam-tradeoffer-manager")
const Tf2 = require('tf2')
const { LoginSession, EAuthTokenPlatformType } = require('steam-session')

const { getInstance } = require('./getInstance.js')
const { mcps } = require('./utils.js')

var MyBot = function MyBot(steam, options) {
    EventEmitter.call(this)
    this.steam = steam
    this.options = options
}

MyBot.prototype = Object.create(EventEmitter.prototype)
MyBot.prototype.constructor = MyBot

const initSteam = (options, refreshToken) => {
    const client = options.client !== false
        ? new SteamUser({
            promptSteamGuardCode: false,
            ...options.client
        })
        : undefined
    const communityOptions = structuredClone(options.community)
    if (options.community?.request) {
        communityOptions.request = Request.defaults({
            forever: true,
            ...options.community.request
        })
    }
    const community = new Steamcommunity(communityOptions)
    const manager = new Manager({
        ...(client ? { steam: client } : {}),
        community: community,
        domain: "localhost",
        language: "en",
        ...options.manager
    })
    let tf2
    if (options.tf2 && client) {
        tf2 = new Tf2(client)
    }
    let session
    if (options.client === false) {
        const sessionOptions = {}
        if (options.community?.request?.proxy) {
            sessionOptions.httpProxy = options.community.request.proxy
        }
        session = new LoginSession(EAuthTokenPlatformType.WebBrowser, sessionOptions)
        if (refreshToken) {
            session.refreshToken = refreshToken
        }
    }
    const steam = {
        ...(client ? { client } : {}),
        community,
        manager,
        ...(tf2 ? { tf2 } : {}),
        ...(session ? { session } : {})
    }
    const { client: _c, community: _com, manager: _m, ...restOptions } = options
    return new MyBot(steam, restOptions)
}

const createBot = (options, refreshToken) => getInstance(initSteam(options, refreshToken))

module.exports = {
    createBot,
    mcps
}