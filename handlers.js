const totp = require('steam-totp')
const { getContext, delay, cps } = require('redux-saga/effects')

function* steamGuard([_, callback, lastCodeWrong]) {
    try {
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
        const { manager } = yield getContext('steam')
        yield cps([manager, manager.setCookies], cookies)
    } catch (err) {
        console.log('error setting cookies')
        throw err
    }
}

function* loggedOn() {
    const { client } = yield getContext('steam')
    client.setPersona(1)
}

const handlerSchema = [
    { eventName: 'steamGuard', fn: steamGuard, lib: 'client', errors: true },
    { eventName: 'webSession', fn: webSession, lib: 'client', errors: true },
    { eventName: 'loggedOn', fn: loggedOn, lib: 'client' }
    //{ eventName: 'doodoo', customEventName: 'doodoo2', fn: doodoo, lib: 'client', errors: true }

]

module.exports = handlerSchema