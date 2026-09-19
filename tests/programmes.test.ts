import request from 'supertest';
import { createApp } from '../src/app';

const app = createApp();

async function createProgramme(overrides: Record<string, unknown> = {}) {
  const res = await request(app)
    .post('/api/programmes')
    .send({
      storeId: 'store-1',
      name: 'Test Programme',
      description: 'A test programme',
      type: 'training',
      startDate: '2026-01-01',
      ...overrides,
    });
  return res;
}

describe('Programmes API', () => {
  it('GET /api/programmes returns 200 with array', async () => {
    const res = await request(app).get('/api/programmes');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('POST /api/programmes creates a programme', async () => {
    const res = await createProgramme({ name: 'Customer Service Training' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('Customer Service Training');
    expect(res.body.status).toBe('draft');
    expect(res.body.members).toEqual([]);
  });

  it('POST /api/programmes returns 400 for missing name', async () => {
    const res = await request(app)
      .post('/api/programmes')
      .send({ storeId: 'store-1', type: 'training', startDate: '2026-01-01', description: 'No name' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/programmes returns 400 for missing storeId', async () => {
    const res = await request(app)
      .post('/api/programmes')
      .send({ name: 'No Store', description: 'd', type: 'compliance', startDate: '2026-01-01' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/programmes returns 400 for missing startDate', async () => {
    const res = await request(app)
      .post('/api/programmes')
      .send({ storeId: 'store-1', name: 'No Date', description: 'd', type: 'compliance' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('GET /api/programmes/:id returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/programmes/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('GET /api/programmes/:id returns the created programme', async () => {
    const created = await createProgramme({ name: 'Compliance Review' });
    const id = created.body.id as string;
    const res = await request(app).get(`/api/programmes/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  it('PATCH /api/programmes/:id updates a programme', async () => {
    const created = await createProgramme({ name: 'Seasonal Promo' });
    const id = created.body.id as string;
    const res = await request(app)
      .patch(`/api/programmes/${id}`)
      .send({ status: 'active', name: 'Seasonal Promo Updated' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    expect(res.body.name).toBe('Seasonal Promo Updated');
  });

  it('PATCH /api/programmes/:id returns 404 for unknown id', async () => {
    const res = await request(app)
      .patch('/api/programmes/nonexistent')
      .send({ status: 'active' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/programmes/:id/members adds a member', async () => {
    const created = await createProgramme({ name: 'Member Test Programme' });
    const id = created.body.id as string;
    const res = await request(app)
      .post(`/api/programmes/${id}/members`)
      .send({ staffId: 'staff-1', role: 'lead' });
    expect(res.status).toBe(201);
    expect(res.body.members).toHaveLength(1);
    expect(res.body.members[0].staffId).toBe('staff-1');
    expect(res.body.members[0].role).toBe('lead');
    expect(res.body.members[0]).toHaveProperty('joinedAt');
  });

  it('POST /api/programmes/:id/members adds multiple members', async () => {
    const created = await createProgramme({ name: 'Multi Member' });
    const id = created.body.id as string;
    await request(app)
      .post(`/api/programmes/${id}/members`)
      .send({ staffId: 'staff-a', role: 'lead' });
    const res = await request(app)
      .post(`/api/programmes/${id}/members`)
      .send({ staffId: 'staff-b', role: 'participant' });
    expect(res.status).toBe(201);
    expect(res.body.members).toHaveLength(2);
  });

  it('POST /api/programmes/:id/members returns 404 for unknown programme', async () => {
    const res = await request(app)
      .post('/api/programmes/nonexistent/members')
      .send({ staffId: 'staff-1', role: 'participant' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('POST /api/programmes/:id/members returns 409 for duplicate member', async () => {
    const created = await createProgramme({ name: 'Duplicate Test' });
    const id = created.body.id as string;
    await request(app)
      .post(`/api/programmes/${id}/members`)
      .send({ staffId: 'staff-dup', role: 'participant' });
    const res = await request(app)
      .post(`/api/programmes/${id}/members`)
      .send({ staffId: 'staff-dup', role: 'observer' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('POST /api/programmes/:id/members returns 400 for missing staffId', async () => {
    const created = await createProgramme({ name: 'Validation Test' });
    const id = created.body.id as string;
    const res = await request(app)
      .post(`/api/programmes/${id}/members`)
      .send({ role: 'participant' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/programmes/:id/members returns 400 for missing role', async () => {
    const created = await createProgramme({ name: 'Role Validation Test' });
    const id = created.body.id as string;
    const res = await request(app)
      .post(`/api/programmes/${id}/members`)
      .send({ staffId: 'staff-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
