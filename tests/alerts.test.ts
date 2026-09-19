import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function createAlert(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/alerts')
    .send({
      storeId: 'store-1',
      type: 'safety',
      severity: 'medium',
      message: 'Test alert',
      ...overrides,
    });
}

describe('Alerts API', () => {
  it('GET /api/alerts returns 200 with array', async () => {
    const res = await request(app).get('/api/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/alerts raises an alert', async () => {
    const res = await createAlert({ message: 'Wet floor near entrance', severity: 'high' });
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

  it('POST /api/alerts returns 400 for missing storeId', async () => {
    const res = await request(app)
      .post('/api/alerts')
      .send({ type: 'compliance', severity: 'low', message: 'No store' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/alerts/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/alerts/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/alerts/:id returns the created alert', async () => {
    const created = await createAlert({ message: 'Low stock on aisle 3', type: 'inventory', severity: 'medium' });
    const id = created.body.id as string;
    const res = await request(app).get(`/api/alerts/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('PATCH /api/alerts/:id updates alert status', async () => {
    const created = await createAlert({ message: 'Door alarm triggered' });
    const id = created.body.id as string;
    const res = await request(app)
      .patch(`/api/alerts/${id}`)
      .send({ status: 'acknowledged' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('acknowledged');
  });

  it('PATCH /api/alerts/:id resolves an alert', async () => {
    const created = await createAlert({ message: 'Spill in aisle 2' });
    const id = created.body.id as string;
    const resolvedAt = new Date().toISOString();
    const res = await request(app)
      .patch(`/api/alerts/${id}`)
      .send({ status: 'resolved', resolvedAt });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
    expect(res.body.resolvedAt).toBe(resolvedAt);
  });

  it('PATCH /api/alerts/:id returns 404 for unknown id', async () => {
    const res = await request(app)
      .patch('/api/alerts/nonexistent')
      .send({ status: 'resolved' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
