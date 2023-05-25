const { cps } = require('redux-saga/effects')

function* mcps([ctx, fn], ...args) {
    return yield cps((cb) => fn.apply(ctx, args.concat([(err, ...rest) => cb(err, rest)])))
}

module.exports = {
    mcps
}