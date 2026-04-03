const totp = require('steam-totp')
const {
    getContext,
    delay,
    cps,
    call,
    take
} = require('redux-saga/effects')

function* steamGuard([domain, callback, lastCodeWrong]) {
    try {
        if (domain) {
            const { code } = yield take('STEAMGUARD_CODE')
            callback(code)
            return
        }
        const { shared_secret } = yield getContext('options')
        if (lastCodeWrong) {
            yield delay(60000)
        }
        const code = yield cps([totp, totp.generateAuthCode], shared_secret)
        callback(code)
    } catch (err) {
        console.log('error generating auth code')
        throw err
    }
}

function* webSession([_, cookies]) {
    try {
        const { manager, store } = yield getContext('steam')
        yield cps([manager, manager.setCookies], cookies)
        if (store) {
            store.setCookies(cookies)
        }
    } catch (err) {
        console.log('error setting cookies')
        throw err
    }
}

function* loggedOn() {
    const { client } = yield getContext('steam')
    client.setPersona(1)
}

function* friendRelationship([steamId, relationship]) {
    const { acceptInvites } = yield getContext('options')
    const { client } = yield getContext('steam')
    if (acceptInvites && relationship === 2) {
        try {
            yield cps([client, client.addFriend], steamId)
        } catch (err) {
            console.log('error adding friend', err)
        }
    }
}

function* friendsList() {
    const { client: { myFriends } } = yield getContext('steam')
    const friends = Object.entries(myFriends || {}).filter(([, v]) => v === 2).map(([k]) => k)
    for (let steamId of friends) {
        yield call(friendRelationship, [steamId, 2])
        yield delay(500)
    }
}

const handlerSchema = [
    { eventName: 'steamGuard', fn: steamGuard, lib: 'client', errors: true },
    { eventName: 'webSession', fn: webSession, lib: 'client', errors: true },
    { eventName: 'sessionExpired', lib: 'community', errors: true },
    { eventName: 'error', lib: 'client' },
    { eventName: 'loggedOn', fn: loggedOn, lib: 'client' },
    { eventName: 'friendRelationship', fn: friendRelationship, lib: 'client' },
    { eventName: 'friendsList', fn: friendsList, lib: 'client' },
    { eventName: 'friendMessage', lib: 'client' },
    { eventName: 'newOffer', lib: 'manager' },
    { eventName: 'receivedOfferChanged', customEventName: 'stateChange', lib: 'manager' },
    { eventName: 'sentOfferChanged', customEventName: 'stateChange', lib: 'manager' }
]

module.exports = handlerSchema