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
        yield cps([offer, offer.accept], true)
    } catch (err) {
        console.log('error accepting offer, continuing...', err.message)
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
            throw `error accepting confirmation for our offer, ${err.message}`
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
        throw `error fetching items for offer ${offer.id}, ${err.message}`
    }
}

function* getInventory(appID, _steamId, tradableOnly = true) {
    const { manager } = yield getContext('steam')
    const { steamId } = yield getContext('options')
    try {
        return yield cps([manager, manager.getUserInventoryContents], _steamId || steamId, appID, 2, tradableOnly)
    } catch (err) {
        throw `error loading inventory, ${err.message}`
    }
}

function* getOffer(id) {
    const { manager } = yield getContext('steam')
    try {
        return yield cps([manager, manager.getOffer], id)
    } catch (err) {
        throw `error loading offer, ${err.message}`
    }
}

function* getOffers(filter) {
    const { manager } = yield getContext('steam')
    try {
        const [sent, received] = yield call(mcps, [manager, manager.getOffers], filter)
        return { sent, received }
    } catch (err) {
        throw `error loading offers, ${err.message}`
    }
}

function* getOfferUser(offer) {
    try {
        const [me, them] = yield call(mcps, [offer, offer.getUserDetails])
        return { me, them }
    } catch (err) {
        throw `error getting user details, ${err.message}`
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
    sendOffer
}