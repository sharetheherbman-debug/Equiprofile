# VPS Media Storage — Setup Guide

**Module**: `server/_core/storage/localMediaStorage.ts`  
**Public route**: `/media/generated/*`  
**Default storage root**: `/var/equiprofile/storage`  
**Override**: `EQUIPROFILE_STORAGE_ROOT=/path/to/storage`

---

## Storage Structure

```
/var/equiprofile/storage/
├── images/       # Generated images (text-to-image, image-edit)
├── videos/       # Generated videos (text-to-video, image-to-video)
├── avatars/      # Avatar video outputs
├── voice/        # Text-to-speech, speech-to-text outputs
├── thumbnails/   # Thumbnail files and placeholders
├── campaigns/    # Campaign-specific media assets
├── generated/    # General AI-generated assets
├── uploads/      # Admin uploads (not yet active in Update 1)
├── exports/      # PDF/CSV export files
├── cache/        # Temporary cached media
├── temp/         # Temp files (moved to permanent after verification)
└── logs/         # Storage operation logs (future)
```

---

## VPS Setup Commands

Run as root or with sudo on your VPS:

```bash
# 1. Create the storage root and all subfolders
mkdir -p /var/equiprofile/storage/{images,videos,avatars,voice,thumbnails,campaigns,generated,uploads,exports,cache,temp,logs}

# 2. Create the system user if it doesn't exist
# (adjust to your actual service user — commonly 'node', 'www-data', or a custom user)
useradd --system --no-create-home --shell /usr/sbin/nologin equiprofile 2>/dev/null || true

# 3. Set ownership to the application service user
chown -R equiprofile:equiprofile /var/equiprofile/storage

# 4. Set restrictive permissions
# 750 = owner can read/write/execute; group can read/execute; others cannot access
chmod -R 750 /var/equiprofile/storage

# 5. Verify
ls -la /var/equiprofile/storage/
```

---

## Environment Variable

In `.env` (production):
```
EQUIPROFILE_STORAGE_ROOT=/var/equiprofile/storage
```

If this variable is not set, the module defaults to `/var/equiprofile/storage`.  
In development you may want to override to a local path:
```
EQUIPROFILE_STORAGE_ROOT=./storage/local
```

---

## Nginx Static Serving

To serve generated media files over the public URL `/media/generated/*`, add this to your Nginx config:

```nginx
# Serve generated media assets
location /media/generated/ {
    alias /var/equiprofile/storage/;
    
    # Security: only allow safe media types
    types {
        image/jpeg  jpg jpeg;
        image/png   png;
        image/gif   gif;
        image/webp  webp;
        video/mp4   mp4;
        video/webm  webm;
        audio/mpeg  mp3;
        audio/wav   wav;
        audio/ogg   ogg;
        application/pdf pdf;
    }
    default_type application/octet-stream;

    # Cache headers for generated assets
    add_header Cache-Control "public, max-age=86400, immutable";

    # Security headers
    add_header X-Content-Type-Options "nosniff";
    add_header X-Frame-Options "SAMEORIGIN";

    # Block access to sensitive files
    location ~ \.(env|sh|sql|log|json)$ {
        deny all;
        return 403;
    }

    # Block hidden files
    location ~ /\. {
        deny all;
        return 403;
    }
}
```

> **Important**: The Nginx `alias` directive must end with a `/` and match the trailing `/` in the location block.

---

## Security Notes

1. **Path traversal**: `safePathJoin()` in the module throws if a path escapes the storage root. Do not bypass this check.
2. **Allowed types**: Only the following MIME types are accepted:
   - `image/jpeg`, `image/png`, `image/gif`, `image/webp`
   - `video/mp4`, `video/webm`
   - `audio/mpeg`, `audio/wav`, `audio/ogg`
   - `application/pdf`
3. **Filenames**: All filenames are generated via `nanoid` — user input is never used directly in file paths.
4. **Secrets**: Never store `.env`, JWT secrets, or database credentials in the storage root.
5. **Permissions**: The storage root must not be world-readable (`777`). Use `750` minimum.
6. **Nginx deny rules**: Ensure `.env`, `.sh`, `.sql`, `.json`, and hidden files are blocked in Nginx as shown above.

---

## Public URL Format

| File location | Public URL |
|---|---|
| `/var/equiprofile/storage/images/job_abc_xyz123.jpg` | `/media/generated/images/job_abc_xyz123.jpg` |
| `/var/equiprofile/storage/videos/job_def_uvw456.mp4` | `/media/generated/videos/job_def_uvw456.mp4` |
| `/var/equiprofile/storage/avatars/job_ghi_rst789.mp4` | `/media/generated/avatars/job_ghi_rst789.mp4` |

---

## Disk Space Planning

| Asset type | Avg size | 100 assets |
|---|---|---|
| Generated image (PNG) | ~500 KB | ~50 MB |
| Generated video (mp4, 30s) | ~15 MB | ~1.5 GB |
| Avatar video (mp4, 30s) | ~20 MB | ~2 GB |
| Audio (30s mp3) | ~1 MB | ~100 MB |

Plan for at least **50 GB** of VPS storage for active media generation workloads.

Monitor disk usage with:
```bash
du -sh /var/equiprofile/storage/*/
df -h /var/equiprofile/
```

---

## systemd Service Dependency

If using systemd for the Node.js process, ensure the service user matches the directory owner:

```ini
[Service]
User=equiprofile
Group=equiprofile
# ...rest of your service config
```
