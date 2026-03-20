import { Hono } from 'hono';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', cors({
  origin: ['https://simonelongo.com', 'http://localhost:8000'],
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Shopping list
app.get('/shopping', async (c) => {
  const data = await c.env.BACH_PARTY.get('shopping', 'json');
  c.header('Cache-Control', 'public, max-age=30');
  return c.json(data || {});
});

app.post('/shopping', async (c) => {
  const body = await c.req.json();
  const existing = await c.env.BACH_PARTY.get('shopping', 'json') || {};
  const merged = { ...existing, ...body };
  await c.env.BACH_PARTY.put('shopping', JSON.stringify(merged));
  return c.json(merged);
});

// Leaderboard
app.get('/leaderboard', async (c) => {
  const data = await c.env.BACH_PARTY.get('leaderboard', 'json');
  c.header('Cache-Control', 'public, max-age=30');
  return c.json(data || { events: {} });
});

app.post('/leaderboard', async (c) => {
  const body = await c.req.json();
  const data = await c.env.BACH_PARTY.get('leaderboard', 'json') || { events: {} };

  if (body.action === 'update') {
    if (data.events[body.eventId]) {
      data.events[body.eventId].results = body.results;
    }
  } else if (body.action === 'add') {
    data.events[body.eventId] = {
      name: body.name,
      active: true,
      results: {}
    };
  } else if (body.action === 'remove') {
    delete data.events[body.eventId];
  } else if (body.action === 'toggle') {
    if (data.events[body.eventId]) {
      data.events[body.eventId].active = !data.events[body.eventId].active;
    }
  }

  await c.env.BACH_PARTY.put('leaderboard', JSON.stringify(data));
  return c.json(data);
});

// Custom shopping items
app.get('/shopping-custom', async (c) => {
  const data = await c.env.BACH_PARTY.get('shopping-custom', 'json');
  c.header('Cache-Control', 'public, max-age=30');
  return c.json(data || { items: [] });
});

app.post('/shopping-custom', async (c) => {
  const body = await c.req.json();
  const data = await c.env.BACH_PARTY.get('shopping-custom', 'json') || { items: [] };

  if (body.action === 'add') {
    const label = (body.label || '').trim().slice(0, 60);
    if (!label) return c.json({ error: 'empty label' }, 400);
    data.items.push({ id: `custom-${Date.now()}`, label, checked: false });
  } else if (body.action === 'toggle') {
    const item = data.items.find(i => i.id === body.id);
    if (item) item.checked = !item.checked;
  } else if (body.action === 'remove') {
    data.items = data.items.filter(i => i.id !== body.id);
  } else if (body.action === 'clear') {
    data.items = [];
  }

  await c.env.BACH_PARTY.put('shopping-custom', JSON.stringify(data));
  return c.json(data);
});

// Fuel types
app.get('/fuel', async (c) => {
  const data = await c.env.BACH_PARTY.get('fuel', 'json');
  c.header('Cache-Control', 'public, max-age=30');
  return c.json(data || {});
});

app.post('/fuel', async (c) => {
  const body = await c.req.json();
  const existing = await c.env.BACH_PARTY.get('fuel', 'json') || {};
  existing[body.player] = body.type;
  await c.env.BACH_PARTY.put('fuel', JSON.stringify(existing));
  return c.json(existing);
});

export default app;
