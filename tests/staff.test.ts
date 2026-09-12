import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

describe('Staff API', () => {
  it('GET /api/staff returns 200 with array', async () => {
    const res = await request(app).get('/api/staff');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/staff creates a staff member', async () => {
    const res = await request(app)
      .post('/api/staff')
      .send({
        storeId: 'store-1',
        name: 'Jane Doe',
        role: 'store_manager',
        email: 'jane.doe@store.example',
        department: 'management',
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Jane Doe');
    expect(res.body.status).toBe('active');
  });

  it('POST /api/staff returns 400 for missing email', async () => {
    const res = await request(app)
      .post('/api/staff')
      .send({ storeId: 'store-1', name: 'John Smith', role: 'associate' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/staff/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/staff/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/staff/:id returns the created staff member', async () => {
    const created = await request(app)
      .post('/api/staff')
      .send({ storeId: 'store-3', name: 'Alice Green', role: 'supervisor', email: 'alice@store.example' });
    const id = created.body.id as string;
    const res = await request(app).get(`/api/staff/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });
});
