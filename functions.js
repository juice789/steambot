const totp = require('steam-totp')
const {
    getContext,
    cps,
    call,
    delay
} = require('redux-saga/effects')

const { mcps } = require('./utils.js')

function* start() {
    const { client } = yield getContext('steam')
    const { accountName, password } = yield getContext('options')
    client.logOn({ accountName, password })
}

function* restart() {
    const { client } = yield getContext('steam')
    client.logOff()
    yield delay(10000)
    yield call(start)
}

function* sendMessage(steamId, message) {
    const { client: { chat, myFriends } } = yield getContext('steam')
    if (myFriends.hasOwnProperty(steamId)) {
        yield cps([chat, chat.sendFriendMessage], steamId, message)
    }
}

function* removeFriend(steamId) {
    const { client } = yield getContext('steam')
    client.removeFriend(steamId)
}

function* isFriend(steamId) {
    const { client } = yield getContext('steam')
    return client.myFriends.hasOwnProperty(steamId)
}

function* acceptOffer(offer) {
    try {
        yield cps([offer, offer.accept])
    } catch (err) {
        console.log('error accepting offer, continuing...', err.message)
        if (err.message.indexOf('Please try again later. (28)') !== -1) {
            throw err//items unavailable
        }
    }
    yield call(acceptConfirmation, offer)
}

function* acceptConfirmation(offer) {
    const { community } = yield getContext('steam')
    const { identity_secret } = yield getContext('options')
    if (offer.itemsToGive.length === 0) {
        return
    }
    try {
        yield cps([community, community.acceptConfirmationForObject], identity_secret, offer.id)
        return offer
    } catch (err) {
        if (offer.isOurOffer) {
            throw new Error(`error accepting confirmation for our offer, ${err.message}`)
        } else {
            return offer
        }
    }
}

function* declineOffer(offer) {
    try {
        yield cps([offer, offer.decline])
    } catch (err) {
        console.log('error while declining offer', err.message)
    }
}

function* fetchNewItems(offer) {
    try {
        const [status, tradeInitTime, receivedItems, sentItems] = yield call(mcps, [offer, offer.getExchangeDetails], false)
        return { offer, receivedItems, sentItems }
    } catch (err) {
        throw new Error(`error fetching items for offer ${offer.id}, ${err.message}`)
    }
}

function* getInventory(appID, _steamId, tradableOnly = true) {
    const { manager } = yield getContext('steam')
    const { steamId } = yield getContext('options')
    try {
        return yield cps([manager, manager.getUserInventoryContents], _steamId || steamId, appID, 2, tradableOnly)
    } catch (err) {
        throw new Error(`error loading inventory, ${err.message}`)
    }
}

function* getOffer(id) {
    const { manager } = yield getContext('steam')
    try {
        return yield cps([manager, manager.getOffer], id)
    } catch (err) {
        throw new Error(`error loading offer, ${err.message}`)
    }
}

function* getOffers(filter) {
    const { manager } = yield getContext('steam')
    try {
        const [sent, received] = yield call(mcps, [manager, manager.getOffers], filter)
        return { sent, received }
    } catch (err) {
        throw new Error(`error loading offers, ${err.message}`)
    }
}

function* getOfferUser(offer) {
    try {
        const [me, them] = yield call(mcps, [offer, offer.getUserDetails])
        return { me, them }
    } catch (err) {
        throw new Error(`error getting user details, ${err.message}`)
    }
}

function* createOffer({ steamId, myItems, theirItems, message }) {
    const { manager } = yield getContext('steam')
    const offer = manager.createOffer(steamId)
    offer.addMyItems(myItems)
    offer.addTheirItems(theirItems)
    offer.setMessage(message)
    const { them } = yield call(getOfferUser, offer)
    return { offer, them }
}

function* sendOffer(offer) {
    try {
        yield cps([offer, offer.send])
    } catch (err) {
        if (!offer.id) {
            throw err
        }
    }
    return yield call(acceptConfirmation, offer)
}

function* getUser(steamId) {
    const { community } = yield getContext('steam')
    return yield cps([community, community.getSteamUser], steamId)
}

function* getConfirmations(_type) {
    const { community } = yield getContext('steam')
    const { identity_secret } = yield getContext('options')
    const offset = yield cps([totp, totp.getTimeOffset])
    const time = totp.time(offset)
    const key = totp.getConfirmationKey(identity_secret, time, 'conf')
    const confirmations = yield cps([community, community.getConfirmations], time, key)
    return _type ? confirmations.filter(({ type }) => type === _type) : confirmations
}

function* confirm({ ids, keys }) {
    const { community } = yield getContext('steam')
    const { identity_secret } = yield getContext('options')
    const offset = yield cps([totp, totp.getTimeOffset])
    const time = totp.time(offset)
    const key = totp.getConfirmationKey(identity_secret, time, 'allow')
    yield cps([community, community.respondToConfirmation], ids, keys, time, key, true)
    return true
}

function* getMarketData(uri) {
    const { community } = yield getContext('steam')
    const options = {
        uri,
        json: true,
        headers: {
            referer: "https://steamcommunity.com/market/search"
        }
    }
    const [response, body] = yield call(mcps, [community, community.httpRequest], options)
    if (body.success != 1) {
        throw new Error(`market poll error ${body.success}`)

    }
    return body
}

function* marketList(form) {
    const { community } = yield getContext('steam')
    const options = {
        uri: 'https://steamcommunity.com/market/sellitem/',
        json: true,
        method: 'POST',
        headers: {
            origin: 'https://steamcommunity.com',
            referer: "https://steamcommunity.com/my/inventory/"
        },
        form: {
            sessionid: community.getSessionID(),
            ...form
        }
    }
    const [response, body] = yield call(mcps, [community, community.httpRequest], options)
    if (body.success != 1) {
        const error = new Error('Market list error')
        error.body = body
        throw error

    }
    return body
}

module.exports = {
    start,
    restart,
    sendMessage,
    removeFriend,
    isFriend,
    acceptOffer,
    declineOffer,
    fetchNewItems,
    getInventory,
    getOffer,
    getOffers,
    getOfferUser,
    createOffer,
    sendOffer,
    getUser,
    getConfirmations,
    confirm,
    getMarketData,
    marketList,
    acceptConfirmation
}