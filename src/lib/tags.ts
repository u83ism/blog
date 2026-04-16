/**
 * 使用可能なタグの正規リスト
 * content.config.ts のスキーマおよびタグ付与スクリプトと共用する
 */
export const TAGS = [
  'ゲーム',
  '音ゲー',
  'プロレス',
  'アニメ',
  '日常',
  'サイト運営',
  'Web技術',
  '音楽',
  '創作',
  '読書',
] as const;

export type Tag = typeof TAGS[number];
