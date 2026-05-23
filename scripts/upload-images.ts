/**
 * public/images/ 配下の画像をCloudinaryにアップロードしてURLを出力するスクリプト。
 * 実行: npm run upload
 * 事前にWindowsの環境変数に CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET を登録すること。
 */
import { v2 as cloudinary } from 'cloudinary';
import { readdirSync, statSync } from 'fs';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const imagesDir = join(rootDir, 'public', 'images');

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const missing = [
  !cloudName && 'CLOUDINARY_CLOUD_NAME',
  !apiKey    && 'CLOUDINARY_API_KEY',
  !apiSecret && 'CLOUDINARY_API_SECRET',
].filter(Boolean);

if (missing.length > 0) {
  console.error(`以下の環境変数が登録されていません: ${missing.join(', ')}`);
  console.error('Windowsの環境変数に登録してください:');
  console.error('  [Environment]::SetEnvironmentVariable("変数名", "値", "User")');
  process.exit(1);
}

cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

const files = readdirSync(imagesDir).filter((f) => {
  const ext = extname(f).toLowerCase();
  return SUPPORTED_EXTS.has(ext) && statSync(join(imagesDir, f)).isFile();
});

if (files.length === 0) {
  console.log('public/images/ にアップロード対象のファイルがありません。');
  process.exit(0);
}

console.log(`${files.length}件アップロードします...\n`);

for (const file of files) {
  const filePath = join(imagesDir, file);
  const publicId = basename(file, extname(file));

  try {
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      overwrite: true,
    });
    console.log(`✓ ${file}`);
    console.log(`  ${result.secure_url}\n`);
  } catch (err) {
    console.error(`✗ ${file}: ${err instanceof Error ? err.message : err}\n`);
  }
}
