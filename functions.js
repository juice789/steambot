const { getContext } = require('redux-saga/effects')

function* start() {
    const { client } = yield getContext('steam')
    const { accountName, password } = yield getContext('options')
    client.logOn({ accountName, password })
}

module.exports = {
    start
}