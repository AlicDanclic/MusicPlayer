/**
 * BV/AV 编解码工具
 * 参考：https://github.com/SocialSisterYi/bilibili-API-collect
 */

const table = 'fZodR9XQDSUm21yCkr6zBqiveYah8bt4xsWpHnJE7jL5VG3guMTKNPAwcF';
const tr = {};
for (let i = 0; i < 58; i++) {
  tr[table[i]] = i;
}
const s = [11, 10, 3, 8, 4, 6, 2, 9, 5, 7];
const xor = 177451812;
const add = 8728348608;

/**
 * BV号转AV号
 * @param {string} bvid - BV号 (如 BV1xx411c7mD)
 * @returns {number} AV号
 */
function bv2av(bvid) {
  if (!bvid || !bvid.startsWith('BV')) {
    throw new Error('Invalid BV format');
  }
  let r = 0;
  for (let i = 0; i < 10; i++) {
    r += tr[bvid[s[i]]] * Math.pow(58, i);
  }
  return (r - add) ^ xor;
}

/**
 * AV号转BV号
 * @param {number} aid - AV号
 * @returns {string} BV号
 */
function av2bv(aid) {
  if (typeof aid !== 'number' || aid <= 0) {
    throw new Error('Invalid AV number');
  }
  let x = (aid ^ xor) + add;
  const result = ['B', 'V', '1', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' ', ' '];
  for (let i = 0; i < 10; i++) {
    const pow = Math.pow(58, i);
    const index = Math.floor(x / pow) % 58;
    result[s[i]] = table[index];
  }
  return result.join('');
}

/**
 * 从输入字符串中解析BV/AV号
 * @param {string} input - 用户输入
 * @returns {{type: string, bvid: string, aid: number}}
 */
function parseVideoId(input) {
  const trimmed = input.trim();
  // 匹配BV号
  const bvMatch = trimmed.match(/BV[a-zA-Z0-9]{10}/i);
  if (bvMatch) {
    const bvid = bvMatch[0].toUpperCase();
    const aid = bv2av(bvid);
    return { type: 'BV', bvid, aid };
  }
  // 匹配av号
  const avMatch = trimmed.match(/av(\d+)/i);
  if (avMatch) {
    const aid = parseInt(avMatch[1], 10);
    const bvid = av2bv(aid);
    return { type: 'AV', bvid, aid };
  }
  // 纯数字视为AV号
  if (/^\d+$/.test(trimmed)) {
    const aid = parseInt(trimmed, 10);
    const bvid = av2bv(aid);
    return { type: 'AV', bvid, aid };
  }
  throw new Error('无法识别的视频ID格式');
}

// 导出 (兼容 CommonJS 和浏览器)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { bv2av, av2bv, parseVideoId };
} else {
  window.BVCodec = { bv2av, av2bv, parseVideoId };
}