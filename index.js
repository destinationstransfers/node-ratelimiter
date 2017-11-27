/**
 * Module dependencies.
 */

'use strict';

const assert = require('assert');
const microtime = require('./microtime');

/**
 * Initialize a new limiter with `opts`:
 *
 *  - `id` identifier being limited
 *  - `db` redis connection instance
 *
 * @param {Object} opts
 * @param {RedisClient} opts.db - require instance of Redis client
 * @api public
 */
class Limiter {
  constructor({ db, max = 2500, duration = 3600000 } = {}) {
    /** @type {RedisClient} */
    this.db = db;
    assert(
      this.db,
      'Constructor must be called with { db } where db property is a RedisClient instance',
    );
    this.max = max;
    this.duration = duration;
  }

  /**
   * Get values and status code
   *
   * redis is populated with the following keys
   * that expire after N milliseconds:
   *  - limit:<id>
   *
   * @param {string} id - id of client we are limit checking
   * @returns {Promise.<{remaining: number, reset: number, total: number}>}
   */
  async get(id) {
    assert(typeof id === 'string', 'id must be a string');
    const key = `limit:${id}`;

    const { db, duration, max } = this;
    const now = microtime.now();
    const start = now - duration * 1000;

    const [, count, , oldest] = await new Promise((resolve, reject) => {
      db
        .multi()
        .zremrangebyscore([key, 0, start])
        .zcard([key])
        .zadd([key, now, now])
        .zrange([key, 0, 0])
        .pexpire([key, duration])
        .exec(
          (err, result) =>
            err
              ? reject(err)
              : resolve(
                  // unwrapping and parsing result
                  (Array.isArray(result[0])
                    ? result.map(v => v[1])
                    : result
                  ).map(v => parseInt(v, 10)),
                ),
        );
    });

    return {
      remaining: count < max ? max - count : 0,
      reset: Math.floor((oldest + duration * 1000) / 1000000),
      total: max,
    };
  }
}

/**
 * Expose `Limiter`.
 */

module.exports = Limiter;
