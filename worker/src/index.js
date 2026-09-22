// This event API is retired. Keep its route deployed so requests cannot fall
// through to another origin, and never access the retained KV data.
export default {
  fetch(request) {
    return new Response(
      request.method === 'HEAD' ? null : JSON.stringify({ error: 'This API has been retired.' }),
      {
        status: 410,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
          'X-Robots-Tag': 'noindex, nofollow',
        },
      },
    );
  },
};
