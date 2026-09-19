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

  it('POST /api/activities creates an activity with category and programmeId', async () => {
    const res = await request(app)
      .post('/api/activities')
      .send({
        storeId: 'store-1',
        title: 'Restock Shelves',
        description: 'Restock aisle 4',
        priority: 'high',
        category: 'restocking',
        programmeId: 'prog-1',
      });
    expect(res.status).toBe(201);
    expect(res.body.category).toBe('restocking');
    expect(res.body.programmeId).toBe('prog-1');
  });

  it('POST /api/activities returns 400 for missing title', async () => {
    const res = await request(app)
      .post('/api/activities')
      .send({ storeId: 'store-1', description: 'No title', priority: 'low' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('POST /api/activities returns 400 for missing storeId', async () => {
    const res = await request(app)
      .post('/api/activities')
      .send({ title: 'No store', description: 'Missing storeId', priority: 'low' });
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

  it('PATCH /api/activities/:id updates category and priority', async () => {
    const created = await request(app)
      .post('/api/activities')
      .send({ storeId: 'store-3', title: 'Planogram', description: 'Reset planogram', priority: 'medium' });
    const id = created.body.id as string;
    const res = await request(app)
      .patch(`/api/activities/${id}`)
      .send({ priority: 'critical', category: 'planogram', assignedTo: 'user-99' });
    expect(res.status).toBe(200);
    expect(res.body.priority).toBe('critical');
    expect(res.body.category).toBe('planogram');
    expect(res.body.assignedTo).toBe('user-99');
  });

  it('PATCH /api/activities/:id returns 404 for unknown id', async () => {
    const res = await request(app)
      .patch('/api/activities/nonexistent')
      .send({ status: 'completed' });
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/activities/:id returns 204', async () => {
    const created = await request(app)
      .post('/api/activities')
      .send({ storeId: 'store-4', title: 'To Delete', description: 'Will be deleted', priority: 'low' });
    const id = created.body.id as string;
    const res = await request(app).delete(`/api/activities/${id}`);
    expect(res.status).toBe(204);
  });

  it('DELETE /api/activities/:id returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/activities/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('DELETE /api/activities/:id removes the activity from the list', async () => {
    const created = await request(app)
      .post('/api/activities')
      .send({ storeId: 'store-4', title: 'Gone', description: 'Should disappear', priority: 'low' });
    const id = created.body.id as string;
    await request(app).delete(`/api/activities/${id}`);
    const res = await request(app).get(`/api/activities/${id}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/activities?status=pending filters by status', async () => {
    const appLocal = createApp();
    await request(appLocal)
      .post('/api/activities')
      .send({ storeId: 's1', title: 'Pending one', description: 'd', priority: 'low' });
    await request(appLocal)
      .post('/api/activities')
      .send({ storeId: 's1', title: 'Completed one', description: 'd', priority: 'low' });
    const id2Res = await request(appLocal)
      .post('/api/activities')
      .send({ storeId: 's1', title: 'Another', description: 'd', priority: 'medium' });
    await request(appLocal).patch(`/api/activities/${id2Res.body.id as string}`).send({ status: 'completed' });

    const res = await request(appLocal).get('/api/activities?status=pending');
    expect(res.status).toBe(200);
    for (const a of res.body as Array<{ status: string }>) {
      expect(a.status).toBe('pending');
    }
  });

  it('GET /api/activities?programme=prog-x filters by programmeId', async () => {
    const appLocal = createApp();
    await request(appLocal)
      .post('/api/activities')
      .send({ storeId: 's1', title: 'In prog', description: 'd', priority: 'low', programmeId: 'prog-x' });
    await request(appLocal)
      .post('/api/activities')
      .send({ storeId: 's1', title: 'No prog', description: 'd', priority: 'low' });

    const res = await request(appLocal).get('/api/activities?programme=prog-x');
    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect((res.body as Array<{ programmeId: string }>)[0].programmeId).toBe('prog-x');
  });

  it('GET /api/activities?status=invalid returns 400', async () => {
    const res = await request(app).get('/api/activities?status=invalid_status');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
