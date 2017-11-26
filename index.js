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
 * @api public
 */
class Limiter {
  constructor({ id, db, max = 2500, duration = 3600000 }) {
    this.id = id;
    this.db = db;
    assert(this.id, '.id required');
    assert(this.db, '.db required');
    this.max = max;
    this.duration = duration;
    this.key = `limit:${this.id}`;
  }

  /**
   * Get values and status code
   *
   * redis is populated with the following keys
   * that expire after N milliseconds:
   *  - limit:<id>
   *
   * @returns {Promise.<{remaining: number, reset: number, total: number}>}
   */
  get() {
    const { db, duration, key, max } = this;
    const now = microtime.now();
    const start = now - duration * 1000;

    return new Promise((resolve, reject) => {
      db
        .multi()
        .zremrangebyscore([key, 0, start])
        .zcard([key])
        .zadd([key, now, now])
        .zrange([key, 0, 0])
        .pexpire([key, duration])
        .exec((err, res) => {
          if (err) return reject(err);

          const count = parseInt(
            Array.isArray(res[0]) ? res[1][1] : res[1],
            10,
          );
          const oldest = parseInt(
            Array.isArray(res[0]) ? res[3][1] : res[3],
            10,
          );

          return resolve({
            remaining: count < max ? max - count : 0,
            reset: Math.floor((oldest + duration * 1000) / 1000000),
            total: max,
          });
        });
    });
  }
}

/**
 * Expose `Limiter`.
 */

module.exports = Limiter;
