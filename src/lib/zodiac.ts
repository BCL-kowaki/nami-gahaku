// 干支（えと）ユーティリティ

export interface EtoInfo {
  name: string;    // 干支名（ひらがな）
  kanji: string;   // 干支名（漢字）
  emoji: string;   // 絵文字
  animal: string;  // 動物名
}

const ETO_LIST: EtoInfo[] = [
  { name: 'ねずみ', kanji: '子', emoji: '🐭', animal: 'ネズミ' },
  { name: 'うし', kanji: '丑', emoji: '🐮', animal: 'ウシ' },
  { name: 'とら', kanji: '寅', emoji: '🐯', animal: 'トラ' },
  { name: 'うさぎ', kanji: '卯', emoji: '🐰', animal: 'ウサギ' },
  { name: 'たつ', kanji: '辰', emoji: '🐲', animal: 'タツ（リュウ）' },
  { name: 'へび', kanji: '巳', emoji: '🐍', animal: 'ヘビ' },
  { name: 'うま', kanji: '午', emoji: '🐴', animal: 'ウマ' },
  { name: 'ひつじ', kanji: '未', emoji: '🐑', animal: 'ヒツジ' },
  { name: 'さる', kanji: '申', emoji: '🐵', animal: 'サル' },
  { name: 'とり', kanji: '酉', emoji: '🐔', animal: 'トリ' },
  { name: 'いぬ', kanji: '戌', emoji: '🐶', animal: 'イヌ' },
  { name: 'いのしし', kanji: '亥', emoji: '🐗', animal: 'イノシシ' },
];

/**
 * 生年（西暦）から干支を取得
 * 干支は12年周期：子(0), 丑(1), 寅(2)...
 * 基準: 2024年 = 辰年 → index 4
 */
export function getEto(year: number): EtoInfo {
  // 2024年は辰年(index 4)
  // (year - 2024) mod 12 + 4 で算出
  const index = ((year - 2024) % 12 + 12 + 4) % 12;
  return ETO_LIST[index];
}

/**
 * 誕生日文字列（YYYY-MM-DD）から干支を取得
 */
export function getEtoFromBirthday(birthday: string): EtoInfo | null {
  if (!birthday) return null;
  const year = parseInt(birthday.split('-')[0], 10);
  if (isNaN(year) || year < 1900 || year > 2100) return null;
  return getEto(year);
}

/**
 * 干支の表示テキスト（例: 🐲 たつ年）
 */
export function getEtoDisplayText(birthday: string): string {
  const eto = getEtoFromBirthday(birthday);
  if (!eto) return '';
  return `${eto.emoji} ${eto.name}どし`;
}
