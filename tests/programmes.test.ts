import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Programmes API', () => {
  it('GET /api/programmes returns 200 with array', async () => {
    const res = await request(app).get('/api/programmes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/programmes creates a programme', async () => {
    const res = await request(app)
      .post('/api/programmes')
      .send({
        storeId: 'store-1',
        name: 'Customer Service Training',
        description: 'Q4 training programme',
        type: 'training',
        startDate: '2026-01-01',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Customer Service Training');
    expect(res.body.status).toBe('draft');
  });

  it('POST /api/programmes returns 400 for missing name', async () => {
    const res = await request(app)
      .post('/api/programmes')
      .send({ storeId: 'store-1', type: 'training', startDate: '2026-01-01', description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/programmes/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/programmes/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/programmes/:id returns the created programme', async () => {
    const created = await request(app)
      .post('/api/programmes')
      .send({
        storeId: 'store-2',
        name: 'Compliance Review',
        description: 'Annual compliance',
        type: 'compliance',
        startDate: '2026-02-01',
      });
    const id = created.body.id as string;
    const res = await request(app).get(`/api/programmes/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });
});
