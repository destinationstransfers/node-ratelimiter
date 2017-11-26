# ratelimiter Change Log.

## 3.1.0 / 2017-11-26

==================

* Started maintaining our fork at `@destinationstransfers/ratelimiter`
* Refatored to ES6 `async/await`
* Moved tests to Jest, collecting coverage
* Removed unused dependencies and functions

==================

[v3.0.2](https://github.com/tj/node-ratelimiter/tree/v3.0.0) -
[#33](/../../pull/33) by [@promag](https://github.com/promag) - Use sorted set
to limit with moving window.

[v2.2.0](https://github.com/tj/node-ratelimiter/tree/v2.2.0) -
[#30](/../../pull/30) by [@kp96](https://github.com/kp96) - Race condition when
using `async.times`.

[v2.1.3](https://github.com/tj/node-ratelimiter/tree/v2.1.3) -
[#22](/../../pull/22) by [@coderhaoxin](https://github.com/coderhaoxin) - Dev
dependencies versions bump.

[v2.1.2](https://github.com/tj/node-ratelimiter/tree/v2.1.2) -
[#17](/../../pull/17) by [@waleedsamy](https://github.com/waleedsamy) - Add
Travis CI support.

[v2.1.1](https://github.com/tj/node-ratelimiter/tree/v2.1.1) -
[#13](/../../pull/13) by [@kwizzn](https://github.com/kwizzn) - Fixes
out-of-sync TTLs after running decr().

[v2.1.0](https://github.com/tj/node-ratelimiter/tree/v2.1.0) -
[#12](/../../pull/12) by [@luin](https://github.com/luin) - Adding support for
ioredis.

[v2.0.1](https://github.com/tj/node-ratelimiter/tree/v2.0.1) -
[#9](/../../pull/9) by [@ruimarinho](https://github.com/ruimarinho) - Update
redis commands to use array notation.

[v2.0.0](https://github.com/tj/node-ratelimiter/tree/v2.0.0) - **API CHANGE** -
Change `remaining` to include current call instead of decreasing it. Decreasing
caused an off-by-one problem and caller could not distinguish between last legit
call and a rejected call.

## 1.0.3 / 2014-06-06

==================

* Fixes #6: In concurrent environment, the race condition occurs.

## v1.0.2 / 2014-06-06

* fix race condition when expiration happens between get and decr

## v1.0.1 / 2014-03-14

* fix race condition resetting the keys.
