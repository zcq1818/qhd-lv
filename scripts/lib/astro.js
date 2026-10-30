/**
 * 天文计算:日出日落(NOAA 太阳位置算法)与新月/满月时刻(Meeus《天文算法》第 49 章)。
 *
 * 用来提前生成全年的日出表、赶海大潮日历这类「现在就能算准」的数据。
 * 精度:日出日落约 1 分钟;月相时刻约 1—2 分钟(只取到「哪一天」用,足够)。
 * 时间一律按北京时间(UTC+8)输出。
 *
 * sunrise.html 里页面实时显示用的是简化公式(误差可到几分钟),发布成表格的数据用这里的。
 */
const RAD = Math.PI / 180;
const TZ = 8;

/** 公历日期 → 儒略日(当天 0h UT) */
function julianDay(y, m, d) {
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

/** 儒略日 → 北京时间的 {y, m, d, hh, mm} */
function fromJulian(jd) {
  const z0 = jd + 0.5 + TZ / 24;
  const Z = Math.floor(z0);
  const F = z0 - Z;
  let A = Z;
  if (Z >= 2299161) { const a = Math.floor((Z - 1867216.25) / 36524.25); A = Z + 1 + a - Math.floor(a / 4); }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const day = B - D - Math.floor(30.6001 * E) + F;
  const m = E < 14 ? E - 1 : E - 13;
  const y = m > 2 ? C - 4716 : C - 4715;
  const d = Math.floor(day);
  let mins = Math.round((day - d) * 1440);
  return { y, m, d, hh: Math.floor(mins / 60), mm: mins % 60 };
}

/** NOAA:给定儒略世纪 T,返回 {decl 赤纬(度), eqTime 均时差(分钟)} */
function solar(T) {
  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C = Math.sin(M * RAD) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(2 * M * RAD) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * RAD) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(omega * RAD);
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(omega * RAD);
  const decl = Math.asin(Math.sin(eps * RAD) * Math.sin(lambda * RAD)) / RAD;
  const y = Math.tan((eps / 2) * RAD) ** 2;
  const eqTime = 4 / RAD * (y * Math.sin(2 * L0 * RAD) - 2 * e * Math.sin(M * RAD) +
    4 * e * y * Math.sin(M * RAD) * Math.cos(2 * L0 * RAD) -
    0.5 * y * y * Math.sin(4 * L0 * RAD) - 1.25 * e * e * Math.sin(2 * M * RAD));
  return { decl, eqTime };
}

const hhmm = (mins) => {
  const t = Math.round(mins);
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
};

/** 某地某天的日出日落(北京时间 "HH:MM") */
function sunTimes(y, m, d, lat, lng) {
  // 迭代两次:先按正午估,再按日出/日落时刻各自重算一次太阳位置
  const calc = (rise) => {
    let minutes = 720;
    for (let i = 0; i < 2; i++) {
      const jd = julianDay(y, m, d) + (minutes - TZ * 60) / 1440;
      const T = (jd - 2451545) / 36525;
      const { decl, eqTime } = solar(T);
      const cosH = (Math.cos(90.833 * RAD) / (Math.cos(lat * RAD) * Math.cos(decl * RAD))) - Math.tan(lat * RAD) * Math.tan(decl * RAD);
      const H = Math.acos(Math.max(-1, Math.min(1, cosH))) / RAD;
      const ha = rise ? H : -H;
      minutes = 720 - 4 * (lng + ha) - eqTime + TZ * 60;
    }
    return minutes;
  };
  const r = calc(true);
  const s = calc(false);
  return { sunrise: hhmm(r), sunset: hhmm(s), daylight: s - r };
}

/** Meeus 第 49 章:第 k 个月相(k 整数=新月,k+0.5=满月)的儒略日(TT,约等于 UT) */
function moonPhaseJD(k) {
  const T = k / 1236.85;
  let JDE = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T - 0.00000015 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = (2.5534 + 29.1053567 * k - 0.0000014 * T * T - 0.00000011 * T ** 3) * RAD;
  const Mp = (201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3 - 0.000000058 * T ** 4) * RAD;
  const F = (160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3 + 0.000000011 * T ** 4) * RAD;
  const O = (124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T ** 3) * RAD;
  const full = Math.abs(k % 1) > 0.25;
  const c = full
    ? [-0.40614, 0.17302 * E, 0.01614, 0.01043, 0.00734 * E, -0.00514 * E, 0.00209 * E * E, -0.00111, -0.00057, 0.00056 * E, -0.00042, 0.00042 * E, 0.00038 * E, -0.00024 * E, -0.00017, -0.00007, 0.00004, 0.00004, 0.00003, 0.00003, -0.00003, 0.00003, -0.00002, -0.00002, 0.00002]
    : [-0.40720, 0.17241 * E, 0.01608, 0.01039, 0.00739 * E, -0.00514 * E, 0.00208 * E * E, -0.00111, -0.00057, 0.00056 * E, -0.00042, 0.00042 * E, 0.00038 * E, -0.00024 * E, -0.00017, -0.00007, 0.00004, 0.00004, 0.00003, 0.00003, -0.00003, 0.00003, -0.00002, -0.00002, 0.00002];
  const args = [Mp, M, 2 * Mp, 2 * F, Mp - M, Mp + M, 2 * M, Mp - 2 * F, Mp + 2 * F, 2 * Mp + M, 3 * Mp, M + 2 * F, M - 2 * F, 2 * Mp - M, O, Mp + 2 * M, 2 * Mp - 2 * F, 3 * M, Mp + M - 2 * F, 2 * Mp + 2 * F, Mp + M + 2 * F, Mp - M + 2 * F, Mp - M - 2 * F, 3 * Mp + M, 4 * Mp];
  for (let i = 0; i < c.length; i++) JDE += c[i] * Math.sin(args[i]);
  // 行星摄动修正
  const A = [299.77 + 0.107408 * k - 0.009173 * T * T, 251.88 + 0.016321 * k, 251.83 + 26.651886 * k, 349.42 + 36.412478 * k,
    84.66 + 18.206239 * k, 141.74 + 53.303771 * k, 207.14 + 2.453732 * k, 154.84 + 7.30686 * k, 34.52 + 27.261239 * k,
    207.19 + 0.121824 * k, 291.34 + 1.844379 * k, 161.72 + 24.198154 * k, 239.56 + 25.513099 * k, 331.55 + 3.592518 * k];
  const ac = [0.000325, 0.000165, 0.000164, 0.000126, 0.00011, 0.000062, 0.00006, 0.000056, 0.000047, 0.000042, 0.00004, 0.000037, 0.000035, 0.000023];
  for (let i = 0; i < A.length; i++) JDE += ac[i] * Math.sin(A[i] * RAD);
  return JDE - 69 / 86400; // TT → UT(ΔT 约 69 秒)
}

/** 某年所有新月、满月,按北京时间 */
function moonPhases(year) {
  const out = [];
  const k0 = Math.floor((year - 2000) * 12.3685) - 2;
  for (let i = 0; i < 30; i++) {
    for (const half of [0, 0.5]) {
      const k = k0 + i + half;
      const t = fromJulian(moonPhaseJD(k));
      if (t.y === year) out.push({ type: half ? 'full' : 'new', ...t });
    }
  }
  return out.sort((a, b) => (a.m - b.m) || (a.d - b.d));
}

module.exports = { sunTimes, moonPhases, julianDay, fromJulian };
