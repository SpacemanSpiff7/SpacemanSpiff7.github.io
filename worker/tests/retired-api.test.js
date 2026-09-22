import assert from 'node:assert/strict';
import test from 'node:test';
import worker from '../src/index.js';

const routes = ['/shopping', '/shopping-custom', '/leaderboard', '/fuel', '/', '/.env', '/unknown'];
const methods = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

for (const path of routes) {
  test(`retired route ${path} rejects reads and writes without accessing bindings`, async () => {
    // Any attempt to read even the KV binding fails the test; data stays intact.
    const env = new Proxy({}, {
      get() {
        assert.fail('Retired API must not access environment or storage bindings');
      },
    });

    for (const method of methods) {
      const request = new Request(`https://bach-api.simonelongo.com${path}`, {
        method,
        headers: {
          Origin: 'https://simonelongo.com',
          'Content-Type': 'application/json',
        },
        ...(['GET', 'HEAD'].includes(method) ? {} : { body: '{"action":"clear"}' }),
      });
      const response = await worker.fetch(request, env);
      assert.equal(response.status, 410, method);
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(response.headers.get('Content-Type'), 'application/json; charset=utf-8');
      assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
      assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
      if (method === 'HEAD') {
        assert.equal(await response.text(), '');
      } else {
        assert.deepEqual(await response.json(), { error: 'This API has been retired.' });
      }
    }
  });
}

test('malformed input and query strings cannot re-enable the retired API', async () => {
  const request = new Request('https://bach-api.simonelongo.com/leaderboard?action=add', {
    method: 'POST',
    body: 'not JSON',
  });
  const response = await worker.fetch(request);
  assert.equal(response.status, 410);
  assert.deepEqual(await response.json(), { error: 'This API has been retired.' });
});
