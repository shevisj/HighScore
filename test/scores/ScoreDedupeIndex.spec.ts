import { PlatformTest } from '@tsed/common';
import { MongooseModel } from '@tsed/mongoose';
import { TestMongooseContext } from '@tsed/testing-mongoose';
import SuperTest from 'supertest';
import { Score } from '../../src/scores/Score';
import { Server } from '../../src/Server';

// Bootstrap the server with HIGHSCORE_DEDUPE_SCORES enabled so ScoreService.$onInit
// builds the unique index against the connected in-memory database.
describe('Score dedupe unique index', () => {
  let request: ReturnType<typeof SuperTest>;
  let ScoreModel: MongooseModel<Score>;

  beforeAll(() => {
    process.env.HIGHSCORE_DEDUPE_SCORES = 'true';
  });
  beforeAll(TestMongooseContext.bootstrap(Server));
  beforeAll(() => {
    request = SuperTest(PlatformTest.callback());
    ScoreModel = PlatformTest.get<MongooseModel<Score>>(Score);
  });
  afterAll(() => {
    delete process.env.HIGHSCORE_DEDUPE_SCORES;
  });
  afterAll(TestMongooseContext.reset);
  afterEach(TestMongooseContext.clearDatabase);

  it('creates the unique compound index on startup', async () => {
    const indexes = await ScoreModel.collection.indexes();
    const dedupe = indexes.find((i) => i.name === 'name_value_category_unique');

    expect(dedupe).toBeDefined();
    expect(dedupe?.unique).toBe(true);
    expect(dedupe?.key).toEqual({ name: 1, value: 1, category: 1 });
  });

  it('rejects a raw duplicate insert at the database level', async () => {
    await ScoreModel.create({ name: 'Indexed', value: 42 });

    await expect(ScoreModel.create({ name: 'Indexed', value: 42 }))
      .rejects.toThrow(/E11000|duplicate key/);
  });

  it('still lets POST stay idempotent with the index in place', async () => {
    const first = await request
      .post('/api/scores')
      .send({ name: 'Indexed', value: 42, category: 'a' });
    const second = await request
      .post('/api/scores')
      .send({ name: 'Indexed', value: 42, category: 'a' });

    expect(first.status).toEqual(201);
    expect(second.status).toEqual(201);
    expect(second.body._id).toEqual(first.body._id);
    expect(await ScoreModel.countDocuments({ name: 'Indexed' })).toEqual(1);
  });
});
