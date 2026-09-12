import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Activities API', () => {
  it('GET /api/activities returns 200 with empty array', async () => {
    const res = await request(app).get('/api/activities');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/activities creates an activity', async () => {
    const res = await request(app)
      .post('/api/activities')
      .send({ storeId: 'store-1', title: 'Stock Check', description: 'Monthly stock check', priority: 'medium' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.title).toBe('Stock Check');
    expect(res.body.status).toBe('pending');
  });

  it('POST /api/activities returns 400 for missing title', async () => {
    const res = await request(app)
      .post('/api/activities')
      .send({ storeId: 'store-1', description: 'No title', priority: 'low' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/activities/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/activities/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/activities/:id returns the created activity', async () => {
    const created = await request(app)
      .post('/api/activities')
      .send({ storeId: 'store-2', title: 'Audit', description: 'Store audit', priority: 'high' });
    const id = created.body.id as string;
    const res = await request(app).get(`/api/activities/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('PATCH /api/activities/:id updates an activity', async () => {
    const created = await request(app)
      .post('/api/activities')
      .send({ storeId: 'store-3', title: 'Display Setup', description: 'Seasonal display', priority: 'low' });
    const id = created.body.id as string;
    const res = await request(app)
      .patch(`/api/activities/${id}`)
      .send({ status: 'in_progress' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('in_progress');
  });
});
