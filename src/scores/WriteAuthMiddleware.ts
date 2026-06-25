import { MiddlewareMethods, Middleware } from '@tsed/platform-middlewares';
import { BodyParams, HeaderParams, PathParams } from '@tsed/common';
import { Unauthorized } from '@tsed/exceptions';
import {
  buildWriteMessage,
  getWritePassword,
  isWriteTokenMode,
  safeEqual,
  signWriteMessage,
} from '../config/write';

/**
 * Guards write routes (POST/PUT/DELETE) behind a simple shared secret.
 *
 * When HIGHSCORE_WRITE_PASSWORD is unset, writes are open and this
 * middleware is a no-op. When set, callers must authenticate:
 *  - default: send the password in the `x-highscore-password` header.
 *  - HIGHSCORE_WRITE_TOKEN=true: send an HMAC-SHA256 token (keyed by the
 *    password, over `name\nvalue\ncategory\nid`) in the `x-highscore-token`
 *    header. The token is bound to the payload, so it cannot be reused to
 *    write different data.
 *
 * Runs before ScoreMiddleware on write routes, so the token is verified
 * against the raw `name` the client signed, before profanity filtering.
 */
@Middleware()
export class WriteAuthMiddleware implements MiddlewareMethods {
  use(
    @HeaderParams('x-highscore-password') password: string,
      @HeaderParams('x-highscore-token') token: string,
      @PathParams('id') id: string,
      @BodyParams('name') name: string,
      @BodyParams('value') value: number,
      @BodyParams('category') category: string,
  ) {
    const expected = getWritePassword();

    if (!expected) {
      return;
    }

    if (isWriteTokenMode()) {
      const message = buildWriteMessage({
        name, value, category, id,
      });

      if (!token || !safeEqual(token, signWriteMessage(message, expected))) {
        throw new Unauthorized('A valid write token is required.');
      }

      return;
    }

    if (!password || !safeEqual(password, expected)) {
      throw new Unauthorized('A valid write password is required.');
    }
  }
}
