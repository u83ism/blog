/**
 * public/images/ 配下の画像をCloudinaryにアップロードしてURLを出力するスクリプト。
 * 実行: npm run upload
 * 事前にWindowsの環境変数に CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET を登録すること。
 *
 * サブフォルダ対応: public/images/{article-date}/{filename} の構造を再帰的にスキャンし、
 * Cloudinary公開ID blog/{article-date}/{filename（拡張子なし）} としてアップロードする。
 *
 * アップロード済みファイルのMD5は scripts/.upload-cache.json に保存し、
 * 次回実行時に変更がなければスキップする。
 */
import { v2 as cloudinary } from 'cloudinary';
import { readdirSync, statSync, readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, relative, extname } from 'path';
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

type ImageEntry = { readonly filePath: string; readonly relativeKey: string };

// public/images/ を再帰的にスキャンして画像ファイルのエントリを返す
const collectImages = (directory: string): readonly ImageEntry[] => {
  const entries: ImageEntry[] = [];
  for (const name of readdirSync(directory)) {
    const fullPath = join(directory, name);
    if (statSync(fullPath).isDirectory()) {
      entries.push(...collectImages(fullPath));
    } else if (SUPPORTED_EXTS.has(extname(name).toLowerCase())) {
      // relativeKey: imagesDir からの相対パス（拡張子なし・Windowsパス区切りをスラッシュに統一）
      const relFromImages = relative(imagesDir, fullPath);
      const relativeKey = relFromImages.replace(/\\/g, '/').replace(/\.[^/.]+$/, '');
      entries.push({ filePath: fullPath, relativeKey });
    }
  }
  return entries;
};

// アップロード済みファイルのMD5キャッシュ（relativeKey → MD5）
const cache: Record<string, string> = existsSync(cacheFilePath)
  ? (JSON.parse(readFileSync(cacheFilePath, 'utf-8')) as Record<string, string>)
  : {};

const images = collectImages(imagesDir);

if (images.length === 0) {
  console.log('public/images/ にアップロード対象のファイルがありません。');
  process.exit(0);
}

console.log(`対象ファイル: ${images.length}件\n`);

for (const { filePath, relativeKey } of images) {
  const localMd5 = computeMd5(filePath);

  // キャッシュと一致する場合はスキップ
  if (cache[relativeKey] === localMd5) {
    console.log(`- スキップ ${relativeKey}（変更なし）`);
    continue;
  }

  const publicId = `blog/${relativeKey}`;

  try {
    const isNew = !(await cloudinary.api.resource(publicId).catch(() => null));

    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      overwrite: true,
    });

    // アップロード成功後にキャッシュを更新
    cache[relativeKey] = localMd5;
    writeFileSync(cacheFilePath, JSON.stringify(cache, null, 2), 'utf-8');

    console.log(`${isNew ? '✓ 新規' : '↑ 更新'} ${relativeKey}`);
    console.log(`  ${result.secure_url}\n`);
  } catch (err) {
    console.error(`✗ ${relativeKey}: ${err instanceof Error ? err.message : err}\n`);
  }
}
