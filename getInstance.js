const { getContext, call, all, take } = require('redux-saga/effects')
const { runSaga, eventChannel, stdChannel } = require('redux-saga')
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
        handlerSchema.map(schemaItem => call(createHandler, schemaItem, bot))
    )
}

const continuableActions = ['STEAM_AUTH_CODE', 'STEAM_2FA_CODE']

const makeContinuable = (saga, context) => (...args) => {
    const channel = stdChannel()
    return new Promise((resolve, reject) => {
        let currentResolve = resolve
        let currentReject = reject

        const task = runSaga(
            {
                channel,
                dispatch: (output) => channel.put(output),
                context,
                effectMiddlewares: [
                    (next) => (effect) => {
                        const isTake = effect.type === 'TAKE'
                        const pattern = effect.payload?.pattern
                        const isContinuable = continuableActions.includes(pattern)

                        if (isTake && isContinuable) {
                            const resolveThisStep = currentResolve
                            const nextStep = new Promise((res, rej) => {
                                currentResolve = res
                                currentReject = rej
                            })
                            resolveThisStep((action) => {
                                channel.put(action)
                                return nextStep
                            })
                        }

                        return next(effect)
                    }
                ]
            },
            saga,
            ...args
        )

        task.toPromise().then((v) => currentResolve(v), (e) => currentReject(e))
    })
}

const getInstance = (bot) => {

    const { steam, options } = bot

    const sagaChannel = options.saga ? undefined : stdChannel()

    const handlers = runSaga({
        channel: sagaChannel,
        context: { steam, options }
    }, handlersSaga, handlerSchema, bot)

    const functionsActual = options.saga
        ? functions
        : Object.fromEntries(
            Object
                .entries(functions)
                .map(([key, saga]) => [key, makeContinuable(saga, { steam, options })])
        )

    const extra = sagaChannel
        ? { dispatch: (action) => sagaChannel.put(action) }
        : {}

    return Object.assign(bot, {
        handlers,
        ...functionsActual,
        ...extra
    })
}

module.exports = {
    getInstance
}