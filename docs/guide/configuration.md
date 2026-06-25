# Configuration

You can easly configure highscore using environnement variables. 
These are all current variables you can update to configure your highscore instance like you want.

[[toc]]

## Global

| Variable          | Description       | Type           | Default         |
| ----------------  | ----------------- | -------------- | --------------- |
| `HIGHSCORE_PORT`  |  Define port of the app | number   | 8081            |
| `HIGHSCORE_DB_URL`|  Define mongodb url     | string   | |
| `HIGHSCORE_SESSION_SECRET`| Secret used for the `express-session` | string | |


## Customization

These options allow you to customize the default website.

| Variable        | Description       | Type           | Default         |
| --------------- | ----------------- | -------------- | --------------- |
| `HIGHSCORE_TITLE` | Home page title | string | HighScore |
| `HIGHSCORE_DESCRIPTION`| Home page description | string | Open Source leaderboard |
| `HIGHSCORE_LOGO_URL`| Home page logo url | string | /logo.png |
| `HIGHSCORE_FAVICON_URL`| Home page favicon url | string | /favicon.ico |
| `HIGHSCORE_CSS_URL`| Home page custom css url | string | |

:::tip
Go to the [customization](/guide/customization) section to get more information about this.
:::

## Download

These options configure the redirect for the `/download` endpoint depending on the user platform.
If you haven't configured a platform it will use the `HIGHSCORE_DOWNLOAD_URL` fallback url.

| Variable        | Description       | Type           | Default         |
| --------------- | ----------------- | -------------- | --------------- |
| `HIGHSCORE_DOWNLOAD_URL` | Default download link | string |  |
| `HIGHSCORE_WINDOWS_DOWNLOAD_URL`| Windows download link | string |  |
| `HIGHSCORE_LINUX_DOWNLOAD_URL`| Linux download link | string |  |
| `HIGHSCORE_MACOS_DOWNLOAD_URL`| Macos download link | string |  |
| `HIGHSCORE_ANDROID_DOWNLOAD_URL`| Android download link | string | |
| `HIGHSCORE_IOS_DOWNLOAD_URL`| iOS download link | string | |

## Docs (swagger)

These options allow you to configure the `/docs` endpoint.

| Variable        | Description       | Type           | Default         |
| --------------- | ----------------- | -------------- | --------------- |
| `HIGHSCORE_USERNAME_DOCS` | Username for basic auth of `/docs`. | string | |
| `HIGHSCORE_PASSWORD_DOCS` | Password for basic auth of `/docs`. | string | |
| `HIGHSCORE_DISABLE_DOCS` | Disable the `/docs` endpoint | boolean | false |

## Metrics

These options allow you to configure the `/metrics` endpoint.

| Variable        | Description       | Type           | Default         |
| --------------- | ----------------- | -------------- | --------------- |
| `HIGHSCORE_USERNAME_METRICS` | Username for basic auth of `/metrics`. | string  | |
| `HIGHSCORE_PASSWORD_METRICS` | Password for basic auth of `/metrics`. | string  | |
| `HIGHSCORE_DISABLE_METRICS` | Disable the `/metrics` endpoint | boolean | false |

## Write protection

These options gate the write routes (`POST`, `PUT`, `DELETE` on `/api/scores`) behind a shared secret, to keep out anonymous writes. Reads are never affected. When `HIGHSCORE_WRITE_PASSWORD` is empty, writes stay open.

| Variable        | Description       | Type           | Default         |
| --------------- | ----------------- | -------------- | --------------- |
| `HIGHSCORE_WRITE_PASSWORD` | Secret required to write. When set, callers must authenticate. Leave empty to keep writes open. | string  |  |
| `HIGHSCORE_WRITE_TOKEN` | When `true`, write routes expect a per-request HMAC token instead of the raw password (see below). | boolean  | false |

:::tip
Go to the [scores](/guide/scores#authenticating-writes) section to learn how to send the password or token with a request.
:::

:::warning
The secret is typically distributed with your game client, so a determined user can extract it. This raises the bar against casual writes and (in token mode) prevents replaying a captured token to write different data — but it is **obfuscation, not real anti-cheat**. For that you need server-side score validation or authenticated accounts. Always serve over HTTPS.
:::

## Idempotent posts

By default, every `POST /api/scores` inserts a new row. Enable this option to make posting **idempotent**: if a score with the same `name`, `value` and `category` already exists, the existing score is returned instead of creating a duplicate. This is useful for client retries (e.g. after a flaky network response). The submitter's `session` is **not** part of the match, so a retry that lands on a fresh session still de-duplicates.

| Variable        | Description       | Type           | Default         |
| --------------- | ----------------- | -------------- | --------------- |
| `HIGHSCORE_DEDUPE_SCORES` | Upsert instead of insert when `name` + `value` + `category` already exist | boolean  | false |

When this option is enabled, the app also creates a **unique index** on `{ name, value, category }` at startup, which enforces de-duplication at the database level and closes the concurrent-race window (two simultaneous identical posts can no longer both insert). The app handles the resulting duplicate-key conflict gracefully by returning the existing score.

:::warning
The index can only be built if the `scores` collection contains **no existing duplicates**. If it does, startup logs an error and the index is skipped (the app keeps running with application-level de-duplication only). Remove the duplicates and restart. You can also build it manually:

```js
db.scores.createIndex(
  { name: 1, value: 1, category: 1 },
  { unique: true, name: 'name_value_category_unique' }
)
```
:::

## Bad words

This option allow you to configure the bad words filter.
If you want add more filter to the bad words list update the `config/ban.json` file.

| Variable        | Description       | Type           | Default         |
| --------------- | ----------------- | -------------- | --------------- |
| `HIGHSCORE_DISABLE_BAD_WORDS` | Disable the bad words filter | boolean  | false |

## Rate limit

This option add a request rate limit to each endpoint of the application.

| Variable        | Description       | Type           | Default         |
| --------------- | ----------------- | -------------- | --------------- |
| `HIGHSCORE_RATE_LIMIT_MINUTE` | Define the time for the rate limit in minute | number  | 60 |
| `HIGHSCORE_RATE_LIMIT_NUMBER` | Number of request limit | number  | 1000 |
| `HIGHSCORE_DISABLE_RATE_LIMIT` | Disable the rate limit | boolean  | false |

## Privacy policy

This option allow you to configure the privacy page with your own information.

| Variable        | Description       | Type           | Default         |
| --------------- | ----------------- | -------------- | --------------- |
| `HIGHSCORE_PRIVACY_EMAIL` | Your email address for the privacy policy | string  |  |
| `HIGHSCORE_PRIVACY_WEBSITE` | Your website address for the privacy policy | string  |  |
| `HIGHSCORE_PRIVACY_COUNTRY` | Your country | string  |  |