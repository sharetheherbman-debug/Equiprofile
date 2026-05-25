# Update 1: Media Storage QA

**Module**: `server/_core/storage/localMediaStorage.ts`

---

## Security Tests

| Test | Expected | Status |
|---|---|---|
| `safePathJoin(base, "../etc/passwd")` | Throws path traversal error | ✅ Implemented — `resolved.startsWith(base + sep)` check |
| Write outside STORAGE_ROOT | Throws | ✅ All writes use `safePathJoin` |
| Delete outside STORAGE_ROOT | Throws | ✅ `deleteAssetFile` checks `resolved.startsWith(STORAGE_ROOT)` |
| Write `.env` MIME type | `validateAllowedMediaType` returns false | ✅ ALLOWED_MEDIA_TYPES whitelist |
| User-supplied filename in path | Never reaches disk | ✅ All filenames generated via `nanoid` |

## Allowed MIME Types

| MIME | Extension | Allowed |
|---|---|---|
| image/jpeg | jpg | ✅ |
| image/png | png | ✅ |
| image/gif | gif | ✅ |
| image/webp | webp | ✅ |
| video/mp4 | mp4 | ✅ |
| video/webm | webm | ✅ |
| audio/mpeg | mp3 | ✅ |
| audio/wav | wav | ✅ |
| audio/ogg | ogg | ✅ |
| application/pdf | pdf | ✅ |
| text/plain, application/json, etc. | - | ❌ Blocked |
| .env, .sh, .sql | - | ❌ Blocked by MIME and Nginx rules |

## Public URL Format

`/media/generated/{folder}/{nanoid_filename}.{ext}`

Example: `/media/generated/images/job_abc123_xYz1234567890.jpg`

## Storage Root

Default: `/var/equiprofile/storage`  
Override: `EQUIPROFILE_STORAGE_ROOT` env var

## VPS Permissions Required

```
/var/equiprofile/storage/  drwxr-x---  equiprofile:equiprofile  750
/var/equiprofile/storage/images/  drwxr-x---  750
(all subfolders same)
```

---

## Notes

- `ensureStorageDirs()` is idempotent — call on server startup
- Thumbnail placeholder writes an empty `.txt` file — real thumbnail generation is a future update
- `moveTempToAsset()` uses `fs.rename` — atomic on same-filesystem moves
