const {
    getContext,
    cps,
    call,
    delay
} = require('redux-saga/effects')

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

module.exports = {
    start,
    restart,
    sendMessage,
    removeFriend,
    isFriend,
    acceptOffer,
    declineOffer
}