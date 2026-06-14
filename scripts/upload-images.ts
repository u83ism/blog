/**
 * public/images/ 配下の画像をCloudinaryにアップロードしてURLを出力するスクリプト。
 * 実行: npm run upload
 * 事前にWindowsの環境変数に CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET を登録すること。
 *
 * アップロード済みファイルのMD5は scripts/.upload-cache.json に保存し、
 * 次回実行時に変更がなければスキップする。
 */
import { v2 as cloudinary } from 'cloudinary';
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, basename, extname } from 'path';
import { fileURLToPath } from 'url';

const computeMd5 = (filePath: string): string =>
  createHash('md5').update(readFileSync(filePath)).digest('hex');

const SUPPORTED_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif']);

const rootDir = fileURLToPath(new URL('..', import.meta.url));
const imagesDir = join(rootDir, 'public', 'images');
const cacheFilePath = join(rootDir, 'scripts', '.upload-cache.json');

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

// アップロード済みファイルのMD5キャッシュ（ファイル名 → MD5）
const cache: Record<string, string> = existsSync(cacheFilePath)
  ? (JSON.parse(readFileSync(cacheFilePath, 'utf-8')) as Record<string, string>)
  : {};

const files = readdirSync(imagesDir).filter((f) => {
  const ext = extname(f).toLowerCase();
  return SUPPORTED_EXTS.has(ext) && statSync(join(imagesDir, f)).isFile();
});

if (files.length === 0) {
  console.log('public/images/ にアップロード対象のファイルがありません。');
  process.exit(0);
}

console.log(`対象ファイル: ${files.length}件\n`);

for (const file of files) {
  const filePath = join(imagesDir, file);
  const publicId = basename(file, extname(file));
  const localMd5 = computeMd5(filePath);

  // キャッシュと一致する場合はスキップ
  if (cache[file] === localMd5) {
    console.log(`- スキップ ${file}（変更なし）`);
    continue;
  }

  try {
    const isNew = !(await cloudinary.api.resource(`blog/${publicId}`).catch(() => null));

    const result = await cloudinary.uploader.upload(filePath, {
      public_id: `blog/${publicId}`,
      overwrite: true,
    });

    // アップロード成功後にキャッシュを更新
    cache[file] = localMd5;
    writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), 'utf-8');

    console.log(`${isNew ? '✓ 新規' : '↑ 更新'} ${file}`);
    console.log(`  ${result.secure_url}\n`);
  } catch (err) {
    console.error(`✗ ${file}: ${err instanceof Error ? err.message : err}\n`);
  }
}
