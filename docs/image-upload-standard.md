# Image Upload Standard (No Base64)

## Rules
- Never store `data:image/...;base64,...` anywhere (client payloads, DB, configs).
- Store only file paths under `/uploads/...` (or `http(s)://...` where explicitly supported).
- All images are uploaded as files, optimized to WebP on the server, and then moved into a final per-entity folder.

## How uploads work
1. Client selects a file.
2. Client calls an upload endpoint (e.g. `POST /api/brands/upload-logo`) using `multipart/form-data`.
3. Server returns a temporary uploads path like `/uploads/_tmp/.../*.webp` (or `/uploads/products/_tmp/...` for products).
4. Client sends that returned path in the create/update request.
5. Server “finalizes” by moving the temp file into the entity’s folder and saving the final `/uploads/...` path in the DB.

## Folder structure
- **Brands**: `/uploads/brands/<slug-id>/images/logo.webp`
- **Manufacturers**: `/uploads/manufacturers/<slug-id>/images/logo.webp`, `/uploads/manufacturers/<slug-id>/images/hero.webp`
- **Categories**: `/uploads/categories/<slug-id>/images/image.webp`, `/uploads/categories/<slug-id>/images/hero.webp`
- **Home hero slides**: `/uploads/home/hero-slides/<slug-id>/images/desktop.webp`, `mobile.webp`
- **Featured showcase**: `/uploads/home/featured-showcase/<variant>/<slug-id>/images/image.webp`
- **Category display config**: `/uploads/home/category-display/<configId>/images/hero.webp`
- **Manufacturer display config**: `/uploads/home/manufacturer-display/<configId>/images/hero.webp`
- **Products**:
  - images: `/uploads/products/<slug-id>/images/<generated>.webp`
  - documents: `/uploads/products/<slug-id>/documents/<filename.ext>`
- **Users** (stored in DB as relative paths): `users/<id>/profile/<file>` and `users/<id>/verification/<file>` (served as `/uploads/...`).

## Replace + delete behavior
- Single-image entities (logo/hero/etc.) use stable filenames (e.g. `logo.webp`) so uploading a new one replaces the old file.
- Updates remove old files when fields are cleared or replaced.
- Deleting an entity removes its uploads folder (products delete all images + documents).
- Any auto-deletes (e.g. “limit” enforcement on homepage sections) also remove the associated uploads folders.

## One-time migration (existing base64 in DB)
- Dry run: `npm run migrate:base64-images --workspace server -- --dry-run`
- Apply: `npm run migrate:base64-images --workspace server`
