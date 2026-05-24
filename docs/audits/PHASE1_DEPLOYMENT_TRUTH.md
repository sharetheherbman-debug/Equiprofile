# Phase 1 Deployment Truth

## Current Known VPS Truth

- `/var/equiprofile/app` is the production app path.
- Origin is `https://github.com/amarktainetwork-blip/Equiprofile.git`.
- Branch is `main`.
- Systemd service is `equiprofile.service`.
- App listens on port `3000`.
- Nginx proxies `equiprofile.online` to `127.0.0.1:3000`.
- Express serves the built React app and API.
- `/var/www/html` is not the active app root for this Node monolith.


## Current Repo Deployment Instructions

- deployment/update.sh uses APP_DIR=/var/equiprofile/app.
- deployment/deploy.sh uses DEPLOY_DIR=/var/equiprofile/app and checks 127.0.0.1:3000.
- deployment/equiprofile.service uses WorkingDirectory=/var/equiprofile/app.
- deployment/nginx/equiprofile.conf proxies to 127.0.0.1:3000.


## Stale Deployment References

- `README.md`
- `deployment/archive/ops-deprecated/nginx/equiprofile.nginx.conf`
- `deployment/archive/ops-deprecated/nginx/equiprofile.webdock.conf`
- `deployment/doctor.sh`
- `deployment/install.sh`
- `deployment/ubuntu24/README.md`
- `docs/PROJECT_DOCUMENTATION.md`
- `docs/QA_CHECKLIST.md`
- `docs/QUICKSTART.md`
- `docs/audits/PHASE1_DEPLOYMENT_TRUTH.md`
- `docs/ops/DEPLOYMENT.md`
- `docs/ops/PRE_DEPLOYMENT_CHECKLIST.md`
- `docs/ops/PRODUCTION_DEPLOYMENT.md`
- `docs/ops/SMOKE_TESTS.md`
- `docs/reports/DEPLOYMENT_PLUG_AND_PLAY.md`
- `docs/reports/STRIPE_INTEGRATION.md`
- `scripts/audit_prod.sh`
- `scripts/deploy_verify.sh`
- `scripts/go_live_audit.sh`
- `scripts/smoke_prod.sh`
- `scripts/verify_production.sh`


## Stale Old Repo References

- `README.md`
- `deployment/install.sh`
- `deployment/ubuntu24/README.md`
- `docs/PROJECT_DOCUMENTATION.md`
- `docs/QUICKSTART.md`
- `docs/audits/PHASE1_DEPLOYMENT_TRUTH.md`


## Deployment Scripts That Are Current

- deployment/update.sh
- deployment/deploy.sh
- deployment/equiprofile.service
- deployment/nginx/equiprofile.conf
- scripts/verify_production.sh
- scripts/deploy_verify.sh
- scripts/go_live_audit.sh


## Deployment Scripts That Are Old/Unsafe

- deployment/archive/** is deprecated/archive material.
- deployment/nginx/archive/** is old nginx material.
- deployment/install.sh contains stale Equiprofile.online.git clone URL and should not be used until corrected/revalidated.
- deployment/ubuntu24/README.md contains stale clone/docs URLs and should be treated as historical until updated.


## Commands That Should Be Used for Future Deployment

```
cd /var/equiprofile/app
git remote set-url origin https://github.com/amarktainetwork-blip/Equiprofile.git
git fetch origin
git checkout main
git pull --ff-only origin main
npm ci
npm run build
sudo systemctl restart equiprofile.service
sudo systemctl status equiprofile.service --no-pager
curl -fsS http://127.0.0.1:3000/healthz
curl -fsS http://127.0.0.1:3000/api/health
sudo nginx -t
sudo systemctl reload nginx
```


## Commands That Should Never Be Used Again

- Do not deploy from `sharetheherbman-debug/equiprofile.online.git`.
- Do not deploy from backup snapshots.
- Do not deploy from `/var/www/html`.
- Do not use archived deployment scripts as canonical deploy instructions.
