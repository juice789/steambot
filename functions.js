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

module.exports = {
    start,
    restart,
    sendMessage,
    removeFriend,
    isFriend
}