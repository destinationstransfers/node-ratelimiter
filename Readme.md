# ratelimiter

Rate limiter for Node.js backed by Redis.

[![Build Status](https://travis-ci.org/tj/node-ratelimiter.svg)](https://travis-ci.org/tj/node-ratelimiter)

## Release Notes

See [CHANGELOG](CHANGELOG.md)

## Requirements

* Redis 2.6.12+ and Node >=7.6

## Installation

```
$ npm install @destinationstransfers/ratelimiter
```

## Example

Example Connect middleware implementation limiting against a `user._id`:

```js
const Limiter = require('@destinationstransfers/ratelimiter')
const ms = require('ms');
const redis = require('redis');
const db = redis.createClient(...);

...

app.use('*', async (ctx, next) => {
  const id = req.user._id;
  const limiter = new Limiter({ id, db });
  const limit = await limiter.get();

  res.set("X-RateLimit-Limit", limit.total);
  res.set("X-RateLimit-Remaining", limit.remaining - 1);
  res.set("X-RateLimit-Reset", limit.reset);

  // all good
  debug("remaining %s/%s %s", limit.remaining - 1, limit.total, id);
  if (limit.remaining) return next();

  // not good
  const delta = (limit.reset * 1000 - Date.now()) | 0;
  const after = (limit.reset - Date.now() / 1000) | 0;
  res.set("Retry-After", after);
  res.send(429, "Rate limit exceeded, retry in " + ms(delta, { long: true }));
})
```

## Result Object

* `total` - `max` value
* `remaining` - number of calls left in current `duration` without decreasing
  current `get`
* `reset` - time in milliseconds until the end of current `duration`

## Options

* `id` - the identifier to limit against (typically a user id)
* `db` - redis connection instance
* `max` - max requests within `duration` [2500]
* `duration` - of limit in milliseconds [3600000]

# License

MIT
