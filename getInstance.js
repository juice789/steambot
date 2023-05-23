const { getContext, call, all, take } = require('redux-saga/effects')
const { runSaga, eventChannel } = require('redux-saga')
const { renameKeysWith } = require('ramda-adjunct')
const { concat, compose, map } = require('ramda')
const handlerSchema = require('./handlers.js')
const functions = require('./functions.js')

function* subscribeEvent(eventName, lib) {
    const steam = yield getContext('steam')
    return eventChannel((emitter) => {
        const eventHandler = (...args) => {
            emitter(args)
        }
        steam[lib].on(eventName, eventHandler)
        return () => steam[lib].off(eventName, eventHandler)
    })
}

function* createHandler({ eventName, customEventName, lib, fn, errors }, bot) {
    const chan = yield call(subscribeEvent, eventName, lib)
    while (true) {
        const data = yield take(chan)
        console.log('sublogger', eventName)
        try {
            if (typeof fn === 'function') {
                yield call(fn, data)
            }
            bot.emit(customEventName || eventName, data)
        } catch (err) {
            console.log('event', eventName, 'errored', err)
            if (errors) {
                bot.emit('error', err)
            }
        }
    }
}

function* handlersSaga(handlerSchema, bot) {
    yield all(
        map(
            (schemaItem) => call(createHandler, schemaItem, bot),
            handlerSchema
        )
    )
}

const getInstance = (bot) => {

    const { steam, options } = bot

    const handlers = runSaga({
        context: { steam, options }
    }, handlersSaga, handlerSchema, bot)

    const sagaFns = compose(
        renameKeysWith(concat('_')),
        map(
            (saga) => (...args) => new Promise((resolve, reject) => {
                runSaga({
                    context: { steam, options }
                }, saga, ...args)
                    .toPromise()
                    .then(resolve, reject)
            })

        )
    )(functions)

    return {
        ...bot,
        handlers,
        ...sagaFns,
        ...functions
    }
}

module.exports = {
    getInstance
}