import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Alerts API', () => {
  it('GET /api/alerts returns 200 with array', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/alerts raises an alert', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .send({ storeId: 'store-1', type: 'safety', severity: 'high', message: 'Wet floor near entrance' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('open');
    expect(res.body.message).toBe('Wet floor near entrance');
  });

  it('POST /api/alerts returns 400 for missing message', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .send({ storeId: 'store-1', type: 'safety', severity: 'low' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/alerts/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/alerts/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/alerts/:id returns the created alert', async () => {
    const created = await request(app)
      .post('/api/alerts')
      .send({ storeId: 'store-2', type: 'inventory', severity: 'medium', message: 'Low stock on aisle 3' });
    const id = created.body.id as string;
    const res = await request(app).get(`/api/alerts/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });
});
