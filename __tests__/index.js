'use strict';

/* eslint-env node, jest */

const Limiter = require('..');

// Uncomment the following line if you want to see
// debug logs from the node-redis module.
// redis.debug_mode = true;

process.on('unhandledRejection', up => {
  throw up;
});

[
  /* eslint-disable import/no-dynamic-require, global-require, max-nested-callbacks */
  ('redis', 'ioredis'),
].forEach(redisModuleName => {
  const db = require(redisModuleName).createClient();
  const redisModule = require(redisModuleName);

  describe(`Limiter with ${redisModuleName}`, () => {
    beforeEach(done => {
      // eslint-disable-next-line consistent-return
      db.keys('limit:*', (err, keys) => {
        if (err) return done(err);
        if (!keys.length) return done();
        const args = keys.concat(done);
        db.del(...args);
      });
    });

    describe('.total', () => {
      it('should represent the total limit per reset period', async () => {
        const limit = new Limiter({
          max: 5,
          id: 'something',
          db,
        });

        const res = await limit.get();
        expect(res).toHaveProperty('total', 5);
      });
    });

    describe('.remaining', () => {
      it('should represent the number of requests remaining in the reset period', async () => {
        const limit = new Limiter({
          max: 5,
          duration: 100000,
          id: 'something',
          db,
        });

        let res = await limit.get();
        expect(res).toHaveProperty('remaining', 5);

        res = await limit.get();
        expect(res).toHaveProperty('remaining', 4);

        res = await limit.get();
        expect(res).toHaveProperty('remaining', 3);
      });
    });

    describe('.reset', () => {
      it('should represent the next reset time in UTC epoch seconds', async () => {
        const limit = new Limiter({
          max: 5,
          duration: 60000,
          id: 'something',
          db,
        });

        const res = await limit.get();
        const left = res.reset - Date.now() / 1000;
        expect(left).toBeLessThan(60);
        expect(left).toBeGreaterThan(0);
      });
    });

    describe('when the limit is exceeded', () => {
      it('should retain .remaining at 0', async () => {
        const limit = new Limiter({
          max: 2,
          id: 'something',
          db,
        });

        let res = await limit.get();
        expect(res).toHaveProperty('remaining', 2);

        res = await limit.get();
        expect(res).toHaveProperty('remaining', 1);

        res = await limit.get();
        expect(res).toHaveProperty('remaining', 0);

        res = await limit.get();
        expect(res).toHaveProperty('remaining', 0);
      });
    });

    describe('when the duration is exceeded', () => {
      it('should reset', async () => {
        const limit = new Limiter({
          duration: 2000,
          max: 2,
          id: 'something',
          db,
        });

        let res = await limit.get();
        expect(res).toHaveProperty('remaining', 2);

        // waiting 3000 ms
        await new Promise(resolve => setTimeout(resolve, 3000));
        // calling again
        res = await limit.get();
        const left = res.reset - Date.now() / 1000;
        expect(left).toBeLessThan(2);
        expect(res).toHaveProperty('remaining', 2);
      });
    });

    describe('when multiple successive calls are made', () => {
      it('the next calls should not create again the limiter in Redis', async () => {
        const limit = new Limiter({
          duration: 10000,
          max: 2,
          id: 'something',
          db,
        });

        let res = await limit.get();
        expect(res).toHaveProperty('remaining', 2);

        res = await limit.get();
        expect(res).toHaveProperty('remaining', 1);
      });

      it('updating the count should keep all TTLs in sync', async () => {
        const limit = new Limiter({
          duration: 10000,
          max: 2,
          id: 'something',
          db,
        });

        await limit.get();

        const res = await new Promise((resolve, reject) =>
          db
            .multi()
            .pttl(['limit:something:count'])
            .pttl(['limit:something:limit'])
            .pttl(['limit:something:reset'])
            .exec((err, result) => {
              if (err) return reject(err);
              return resolve(result);
            }),
        );
        const ttlCount = typeof res[0] === 'number' ? res[0] : res[0][1];
        const ttlLimit = typeof res[1] === 'number' ? res[1] : res[1][1];
        const ttlReset = typeof res[2] === 'number' ? res[2] : res[2][1];
        expect(ttlLimit).toBe(ttlCount);
        expect(ttlReset).toBe(ttlCount);
      });
    });

    describe('when trying to decrease before setting value', () => {
      it('should create with ttl when trying to decrease', async () => {
        const limit = new Limiter({
          duration: 10000,
          max: 2,
          id: 'something',
          db,
        });

        await new Promise((resolve, reject) =>
          db.setex(
            'limit:something:count',
            Number.MAX_SAFE_INTEGER,
            1,
            (err, res) => {
              if (err) reject(err);
              else resolve(res);
            },
          ),
        );
        let res = await limit.get();
        expect(res).toHaveProperty('remaining', 2);

        res = await limit.get();
        expect(res).toHaveProperty('remaining', 1);

        res = await limit.get();
        expect(res).toHaveProperty('remaining', 0);
      });
    });

    describe('when multiple concurrent clients modify the limit', () => {
      const clientsCount = 7;
      const max = 5;
      let left = max;
      const limits = [];

      for (let i = 0; i < clientsCount; ++i) {
        limits.push(
          new Limiter({
            duration: 10000,
            max,
            id: 'something',
            db: redisModule.createClient(),
          }),
        );
      }

      it('should prevent race condition and properly set the expected value', async () => {
        // Warm up and prepare the data.
        const res0 = await limits[0].get();
        expect(res0).toHaveProperty('remaining', left--);

        // Simulate multiple concurrent requests.
        const responses = await Promise.all(limits.map(limit => limit.get()));

        expect(responses).toHaveLength(clientsCount);
        // If there were any errors, report.
        expect(responses.every(response => response)).toBeTruthy();
        responses.sort((r1, r2) => r1.remaining < r2.remaining);
        responses.forEach(res => {
          expect(res).toHaveProperty('remaining', left < 0 ? 0 : left);
          left--;
        });

        for (let i = max - 1; i < clientsCount; ++i) {
          expect(responses[i]).toHaveProperty('remaining', 0);
        }
      });
    });

    describe('when limiter is called in parallel by multiple clients', () => {
      let max = 6;
      const limiter = new Limiter({
        duration: 10000,
        max,
        id: 'asyncsomething',
        db: redisModule.createClient(),
      });

      it('should set the count properly without race conditions', async () => {
        const limits = await Promise.all([
          limiter.get(),
          limiter.get(),
          limiter.get(),
          limiter.get(),
          limiter.get(),
        ]);

        limits.forEach(l => expect(l).toHaveProperty('remaining', max--));
      });
    });
  });
});
