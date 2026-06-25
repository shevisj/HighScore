import { $log } from '@tsed/common';
import { Inject, Service } from '@tsed/di';
import { MongooseModel } from '@tsed/mongoose';
import { Groups } from '@tsed/schema';
import mongoose, { PipelineStage } from 'mongoose';
import { Score } from './Score';
import { ScoreQuery } from './ScoreQuery';

const DEDUPE_INDEX = 'name_value_category_unique';

@Service()
export class ScoreService {
  @Inject(Score)
  private Score: MongooseModel<Score>;

  /**
   * When dedup is enabled, enforce it at the database level with a unique
   * compound index on { name, value, category }. This guards the
   * concurrent-race case that the application-level upsert in `addScore`
   * cannot. The index build fails if the collection still holds duplicates —
   * remove them first (see docs/guide/configuration.md).
   */
  public async $onInit() {
    if (process.env.HIGHSCORE_DEDUPE_SCORES !== 'true') {
      return;
    }

    try {
      await this.Score.collection.createIndex(
        { name: 1, value: 1, category: 1 },
        { unique: true, name: DEDUPE_INDEX },
      );
      $log.info(`Ensured unique score index "${DEDUPE_INDEX}" (HIGHSCORE_DEDUPE_SCORES).`);
    } catch (err: any) {
      $log.error(
        `Could not create unique score index "${DEDUPE_INDEX}". Remove duplicate `
        + 'scores (same name + value + category) and restart. '
        + `Cause: ${err?.message ?? err}`,
      );
    }
  }

  public async getScores({
    _id,
    category,
    session,
    skip,
    limit,
  }: ScoreQuery = {}) {
    const query = [] as PipelineStage[];
    const score = await this.Score.findOne({ _id });

    query.push({
      $match: {
        category: !category && !score?.category
          ? { $eq: null }
          : category || score?.category,
      },
    });

    query.push({
      $setWindowFields: {
        sortBy: { value: -1 },
        output: {
          rank: {
            $rank: {},
          },
        },
      },
    });

    if (_id) {
      query.push({
        $match: {
          _id: new mongoose.Types.ObjectId(_id),
        },
      });
    }

    if (session) {
      query.push({
        $match: {
          session,
        },
      });
    }

    if (skip) {
      query.push({ $skip: skip });
    }

    if (limit) {
      query.push({ $limit: limit });
    }

    return this.Score.aggregate<Score>(query);
  }

  public async getScore(_id: string) {
    const [score] = await this.getScores({ _id });
    return score;
  }

  public async addScore(@Groups('create') score: Partial<Score>) {
    if (process.env.HIGHSCORE_DEDUPE_SCORES === 'true') {
      return this.upsertScore(score);
    }

    const { id } = await new this.Score(score).save();
    return this.getScore(id);
  }

  /**
   * Idempotent insert: a score is considered a duplicate when its
   * name + value + category match an existing one (session is ignored, so
   * client retries that land on a fresh session still dedupe). On a match
   * the existing document is returned untouched ($setOnInsert only applies
   * on insert); otherwise a new score is created.
   *
   * Without a unique index on { name, value, category }, two *simultaneous*
   * identical posts can still both insert. If such an index exists, the
   * E11000 from the losing race is caught and the existing score returned.
   */
  private async upsertScore(score: Partial<Score>) {
    const {
      name, value, category, ...rest
    } = score;
    const filter = { name, value, category: category ?? null };

    try {
      const doc = await this.Score.findOneAndUpdate(
        filter,
        Object.keys(rest).length ? { $setOnInsert: rest } : {},
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      return await this.getScore(doc.id);
    } catch (err: any) {
      if (err?.code === 11000) {
        const existing = await this.Score.findOne(filter);

        if (existing) {
          return this.getScore(existing.id);
        }
      }

      throw err;
    }
  }

  public async updateScore(_id: string, @Groups('update') score: Partial<Score>) {
    await this.Score.updateOne({ _id }, score);
    return this.getScore(_id);
  }

  public async deleteScore(_id: string): Promise<{ acknowledged: boolean; deletedCount: number }> {
    return this.Score.deleteOne({ _id });
  }

  public async getNumberOfPages(limit: number, category?: string) {
    const scores = await this.getScores({ category });
    const pages = scores.length / limit;

    return Math.ceil(pages);
  }
}
