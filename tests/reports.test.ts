import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Reports API', () => {
  it('GET /api/reports returns 200 with array', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/reports returns seeded report with metrics', async () => {
    const res = await request(app).get('/api/reports');
    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toHaveProperty('metrics');
    expect(res.body[0].metrics).toHaveProperty('activityCount');
  });

  it('GET /api/reports?storeId=store-1 filters by storeId', async () => {
    const res = await request(app).get('/api/reports?storeId=store-1');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    for (const report of res.body as Array<{ storeId: string }>) {
      expect(report.storeId).toBe('store-1');
    }
  });

  it('GET /api/reports?storeId=unknown returns empty array', async () => {
    const res = await request(app).get('/api/reports?storeId=unknown-store');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(0);
  });

  it('GET /api/reports/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/reports/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
