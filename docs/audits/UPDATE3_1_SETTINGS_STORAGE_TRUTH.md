# Update 3.1 Settings Storage Truth

## Finding

The live settings table is not named `site_settings`. EquiProfile's Drizzle schema and migrations define the admin runtime key/value store as the camelCase MySQL table `siteSettings`.

## Exact Table

- Schema file: `drizzle/schema.ts`
- Export: `siteSettings`
- Table name: `siteSettings`
- Columns:
  - `id` int autoincrement primary key
  - `key` varchar(100), unique, not null
  - `value` text
  - `updatedAt` timestamp, default current timestamp, updates on row update

## Why `site_settings` Did Not Exist

The manual VPS query used a snake_case table name that the repo does not define. The migrations create `siteSettings` in `drizzle/0003_chat_contact_tables.sql` and repair it in `drizzle/0005_fix_site_settings.sql`.

## Router Behavior

- `admin.getSiteSettings` reads `db.select().from(siteSettings)` and returns an object keyed by setting name.
- `admin.setSiteSetting` writes to `INSERT INTO \`siteSettings\` (\`key\`, \`value\`) ... ON DUPLICATE KEY UPDATE`.
- `getRuntimeConfig` reads the same `siteSettings` table first, then falls back to the matching environment variable.

## Persistence Answer

`admin.setSiteSetting` does persist to DB when `getDb()` is available and the `siteSettings` table exists. `admin.getSiteSettings` returns persisted DB data, not defaults. If no DB connection is available it returns `{}`; if the configured table were actually missing, the query would fail instead of silently returning saved settings.

## Provider Read Path

Provider diagnostics and `createMarketingDraft` read provider keys through the same runtime path:

1. `admin.setSiteSetting` writes `genx_api_key`, `huggingface_api_key`, or `qwen_api_key` to `siteSettings`.
2. `getRuntimeConfig(settingKey, ENV_VAR)` reads `siteSettings` first.
3. `providerRegistry`, `genxProvider`, `huggingFaceProvider`, `qwenProvider`, and draft generation all use `getRuntimeConfig`.

## Correct VPS Verification Command

Run this on the VPS with the production DB credentials. It checks presence without printing secrets:

```bash
mysql -u "$DB_USER" -p "$DB_NAME" -e "
SHOW TABLES LIKE 'siteSettings';
DESCRIBE siteSettings;
SELECT
  \`key\`,
  CASE
    WHEN \`value\` IS NULL OR \`value\` = '' THEN 'empty'
    ELSE CONCAT('set:', CHAR_LENGTH(\`value\`), ' chars')
  END AS value_status,
  \`updatedAt\`
FROM \`siteSettings\`
WHERE \`key\` IN (
  'genx_api_key',
  'huggingface_api_key',
  'qwen_api_key',
  'genx_base_url',
  'genx_model',
  'qwen_base_url',
  'qwen_model'
);
"
```

If using `DATABASE_URL`, derive the user/database from that URL first, but still query `siteSettings`, not `site_settings`.
