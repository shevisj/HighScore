import { createHmac } from 'crypto';
import { PlatformTest } from '@tsed/common';
import { MongooseModel } from '@tsed/mongoose';
import { TestMongooseContext } from '@tsed/testing-mongoose';
import SuperTest from 'supertest';
import { Score } from '../../src/scores/Score';
import { Server } from '../../src/Server';

const PASSWORD = 'letmein';

// Reference implementation of the client-side token, mirroring
// src/config/write/buildWriteMessage + signWriteMessage.
const writeToken = (fields: {
  name?: unknown;
  value?: unknown;
  category?: unknown;
  id?: unknown;
}) => {
  const message = [fields.name, fields.value, fields.category, fields.id]
    .map((v) => (v === undefined || v === null ? '' : String(v)))
    .join('\n');

  return createHmac('sha256', PASSWORD).update(message).digest('hex');
};

describe('Write password protection', () => {
  let request: ReturnType<typeof SuperTest>;
  let ScoreModel: MongooseModel<Score>;

  beforeAll(TestMongooseContext.bootstrap(Server));
  beforeAll(() => {
    request = SuperTest(PlatformTest.callback());
    ScoreModel = PlatformTest.get<MongooseModel<Score>>(Score);
  });
  afterAll(TestMongooseContext.reset);
  afterEach(() => {
    delete process.env.HIGHSCORE_WRITE_PASSWORD;
    delete process.env.HIGHSCORE_WRITE_TOKEN;
  });

  describe('password mode', () => {
    beforeEach(() => {
      process.env.HIGHSCORE_WRITE_PASSWORD = PASSWORD;
    });

    it('should reject a POST without the password', async () => {
      const { status } = await request.post('/api/scores').send({
        name: 'New Player',
        value: 1750,
      });

      expect(status).toEqual(401);
    });

    it('should reject a POST with a wrong password', async () => {
      const { status } = await request
        .post('/api/scores')
        .set('x-highscore-password', 'nope')
        .send({ name: 'New Player', value: 1750 });

      expect(status).toEqual(401);
    });

    it('should accept a POST with the correct password', async () => {
      const { status, body } = await request
        .post('/api/scores')
        .set('x-highscore-password', PASSWORD)
        .send({ name: 'New Player', value: 1750 });

      expect(status).toEqual(201);
      expect(body).toMatchObject({ name: 'New Player', value: 1750 });
    });

    it('should reject a DELETE without the password', async () => {
      const score = await new ScoreModel({ name: 'Doomed', value: 1 }).save();

      const { status } = await request.delete(`/api/scores/${score._id.toString()}`);

      expect(status).toEqual(401);
    });

    it('should still allow reads without the password', async () => {
      const { status } = await request.get('/api/scores');

      expect(status).toEqual(200);
    });
  });

  describe('token mode', () => {
    beforeEach(() => {
      process.env.HIGHSCORE_WRITE_PASSWORD = PASSWORD;
      process.env.HIGHSCORE_WRITE_TOKEN = 'true';
    });

    it('should reject a POST without a token', async () => {
      const { status } = await request
        .post('/api/scores')
        .send({ name: 'New Player', value: 1750 });

      expect(status).toEqual(401);
    });

    it('should reject the password as a token', async () => {
      const { status } = await request
        .post('/api/scores')
        .set('x-highscore-token', PASSWORD)
        .send({ name: 'New Player', value: 1750 });

      expect(status).toEqual(401);
    });

    it('should accept a POST with a token bound to the payload', async () => {
      const { status, body } = await request
        .post('/api/scores')
        .set('x-highscore-token', writeToken({ name: 'New Player', value: 1750 }))
        .send({ name: 'New Player', value: 1750 });

      expect(status).toEqual(201);
      expect(body).toMatchObject({ name: 'New Player', value: 1750 });
    });

    it('should reject a token reused for a different value', async () => {
      // Token signed for value 1750, but a higher score is submitted.
      const { status } = await request
        .post('/api/scores')
        .set('x-highscore-token', writeToken({ name: 'New Player', value: 1750 }))
        .send({ name: 'New Player', value: 999999 });

      expect(status).toEqual(401);
    });

    it('should bind the token to the category', async () => {
      const token = writeToken({ name: 'New Player', value: 1750, category: 'hard' });

      const wrong = await request
        .post('/api/scores')
        .set('x-highscore-token', token)
        .send({ name: 'New Player', value: 1750 });
      expect(wrong.status).toEqual(401);

      const right = await request
        .post('/api/scores')
        .set('x-highscore-token', token)
        .send({ name: 'New Player', value: 1750, category: 'hard' });
      expect(right.status).toEqual(201);
    });

    it('should bind the DELETE token to the score id', async () => {
      const score = await new ScoreModel({ name: 'Doomed', value: 1 }).save();
      const id = score._id.toString();

      const { status } = await request
        .delete(`/api/scores/${id}`)
        .set('x-highscore-token', writeToken({ id }));

      expect(status).toEqual(200);
    });
  });
});
