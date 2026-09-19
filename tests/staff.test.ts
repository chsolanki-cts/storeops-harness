import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function createStaff(overrides: Record<string, unknown> = {}) {
  return request(app)
    .post('/api/staff')
    .send({
      storeId: 'store-1',
      name: 'Test Staff',
      role: 'associate',
      email: `staff-${Date.now()}@store.example`,
      ...overrides,
    });
}

describe('Staff API', () => {
  it('GET /api/staff returns 200 with array', async () => {
    const res = await request(app).get('/api/staff');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/staff creates a staff member', async () => {
    const res = await createStaff({ name: 'Jane Doe', role: 'store_manager', email: 'jane.doe@store.example' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Jane Doe');
    expect(res.body.status).toBe('active');
  });

  it('POST /api/staff creates a staff member with department', async () => {
    const res = await createStaff({ name: 'Alice Green', role: 'supervisor', email: 'alice@store.example', department: 'produce' });
    expect(res.status).toBe(201);
    expect(res.body.department).toBe('produce');
  });

  it('POST /api/staff returns 400 for missing email', async () => {
    const res = await request(app)
      .post('/api/staff')
      .send({ storeId: 'store-1', name: 'John Smith', role: 'associate' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/staff returns 400 for missing name', async () => {
    const res = await request(app)
      .post('/api/staff')
      .send({ storeId: 'store-1', role: 'associate', email: 'noname@store.example' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/staff returns 400 for missing storeId', async () => {
    const res = await request(app)
      .post('/api/staff')
      .send({ name: 'No Store', role: 'cashier', email: 'nostore@store.example' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/staff/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/staff/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/staff/:id returns the created staff member', async () => {
    const created = await createStaff({ name: 'Bob Brown', email: 'bob.brown@store.example' });
    const id = created.body.id as string;
    const res = await request(app).get(`/api/staff/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('PATCH /api/staff/:id updates a staff member', async () => {
    const created = await createStaff({ name: 'Carol White', email: 'carol@store.example' });
    const id = created.body.id as string;
    const res = await request(app)
      .patch(`/api/staff/${id}`)
      .send({ status: 'on_leave', department: 'bakery' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('on_leave');
    expect(res.body.department).toBe('bakery');
  });

  it('PATCH /api/staff/:id updates role', async () => {
    const created = await createStaff({ name: 'Dave Black', email: 'dave@store.example', role: 'associate' });
    const id = created.body.id as string;
    const res = await request(app)
      .patch(`/api/staff/${id}`)
      .send({ role: 'supervisor' });
    expect(res.status).toBe(200);
    expect(res.body.role).toBe('supervisor');
  });

  it('PATCH /api/staff/:id returns 404 for unknown id', async () => {
    const res = await request(app)
      .patch('/api/staff/nonexistent')
      .send({ status: 'inactive' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
