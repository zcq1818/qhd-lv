// 每日小红书素材:算出当天的结论,生成文案,推到微信
//
// 为什么文案生成放在接口里而不是页面里:出图页要用,定时推送也要用。
// 同一份逻辑写两遍,迟早只改了一边 —— 今天在赶海页上已经栽过一次
// (卡片说「退得浅」,顶部结论却把它推荐成了好窗口)。
//
// GET /api/cron-xhs?preview=1   出图页用,不推送,不需要口令
// GET /api/cron-xhs             由 Vercel Cron 调用(CRON_SECRET 校验)后推微信
// GET /api/cron-xhs?key=xxx     手动触发推送,key 为 LEADS_ADMIN_KEY

const SITE = 'https://www.divdu.com';

/* ---------------- 取数 ---------------- */

async function getJSON(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'divdu-xhs' } });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.json();
}

const toMin = (s) => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s || '');
  return m ? +m[1] * 60 + +m[2] : null;
};
const fmtMin = (n) => {
  n = ((n % 1440) + 1440) % 1440;
  const h = Math.floor(n / 60), m = n % 60;
  return `${h < 10 ? '0' : ''}${h}:${m < 10 ? '0' : ''}${m}`;
};
const md = (d) => `${+d.slice(5, 7)}月${+d.slice(8, 10)}日`;
const WEEK = ['日', '一', '二', '三', '四', '五', '六'];
const weekOf = (d) => '周' + WEEK[new Date(d + 'T00:00:00+08:00').getDay()];

/**
 * 赶海窗口。和 js/ganhai-time.js 是同一套判断:
 * 低潮前 1.5 小时到后 1 小时(涨潮比退潮危险,后半段留得短);
 * 「低潮」水位和当天高潮差不多的算浅,去了白跑;白天夜里按接口的 isDaytime。
 */
function ganhaiDays(tide) {
  const list = Array.isArray(tide.data) ? tide.data : [{ date: tide.date, data: tide.data }];
  return list.map((e) => {
    const tides = (e.data && e.data.tides) || [];
    const hs = tides.map((t) => t.height);
    const lo = Math.min(...hs), hi = Math.max(...hs);
    const span = hi - lo;
    const flag = {};
    ((e.data && e.data.ganhai) || []).forEach((g) => { flag[g.lowTideTime] = !!g.isDaytime; });

    const wins = tides.filter((t) => t.type === 'low').map((t) => {
      const min = toMin(t.time);
      if (min == null) return null;
      return {
        time: t.time,
        from: fmtMin(min - 90),
        to: fmtMin(min + 60),
        height: t.height,
        shallow: span > 0 && (t.height - lo) > span * 0.4,
        isDay: Object.prototype.hasOwnProperty.call(flag, t.time)
          ? flag[t.time] : (min >= 360 && min <= 1080),
      };
    }).filter(Boolean);

    return { date: e.date, span, wins };
  });
}

function visibility(text) {
  const t = String(text || '');
  if (/雷|暴雨|大雨|中雨|雪/.test(t)) return { level: 0, text: '看不到' };
  if (/雨|雾|霾|沙/.test(t)) return { level: 0, text: '看不到' };
  if (/阴/.test(t)) return { level: 1, text: '希望不大' };
  if (/多云/.test(t)) return { level: 2, text: '看运气' };
  if (/晴/.test(t)) return { level: 3, text: '大概率能看到' };
  return { level: 2, text: '不确定' };
}

/* ---------------- 生成文案 ----------------
   刻意不套模板:结论由当天数据决定,所以每天说的话本来就不一样。
   「这五天白天都别去」和「周六是唯一能看日出的一天」是完全不同的选题,
   不是同一句话换数字。 */

function ganhaiCopy(days) {
  const good = [];
  days.forEach((d) => d.wins.forEach((w) => { if (w.isDay && !w.shallow) good.push({ d, w }); }));
  const anyDay = days.some((d) => d.wins.some((w) => w.isDay));

  const rows = days.map((d) => {
    const w = d.wins.find((x) => x.isDay && !x.shallow) || d.wins.find((x) => x.isDay) || d.wins[0];
    if (!w) return `${md(d.date)} ${weekOf(d.date)}｜无数据`;
    const tag = !w.isDay ? '🌙 半夜' : (w.shallow ? '⚠️ 退得浅' : '✅ 可以去');
    return `${md(d.date)} ${weekOf(d.date)}｜${w.from}-${w.to} ${tag}`;
  });

  if (!good.length) {
    return {
      kind: 'ganhai',
      title: anyDay ? '这五天想赶海的先别去，白天全是浅潮' : '这五天想赶海的先别去，好潮水全在半夜',
      body: [
        '有人问我这周去赶海行不行，我查完只能说：省点力气。',
        '',
        rows.join('\n'),
        '',
        anyDay
          ? '白天是有低潮，但退得浅，滩涂根本露不出来，去了就是站在水边拍照。'
          : '退得最狠的那几次都在凌晨两三点，除非你带头灯、有同伴，否则别折腾。',
        '',
        '赶海看的是潮汐不是天气，日子选错了去了也是白跑。想赶上好潮水，等下一个农历初一十五前后。',
      ].join('\n'),
      tags: ['秦皇岛', '北戴河', '赶海', '赶海攻略', '潮汐表', '亲子游'],
    };
  }

  const f = good[0];
  return {
    kind: 'ganhai',
    title: `${md(f.d.date)}白天能赶海，${f.w.from} 进场`,
    body: [
      `这五天里只有${good.length === 1 ? '这一个' : `${good.length}个`}白天的窗口，记一下时间。`,
      '',
      rows.join('\n'),
      '',
      `重点是 ${md(f.d.date)}，${f.w.from}-${f.w.to}，低潮 ${f.w.time}。`,
      '低潮前一个半小时进场，潮水一开始回涨就往回走——涨潮比退潮快，礁石区尤其别贪。',
      '',
      '标🌙的是凌晨，标⚠️的是退得浅、滩涂露不出多少，都别去。',
    ].join('\n'),
    tags: ['秦皇岛', '北戴河', '赶海', '赶海攻略', '潮汐表', '遛娃'],
  };
}

function sunriseCopy(daily) {
  const rows = daily.map((d) => {
    const v = visibility(d.textDay);
    const icon = v.level >= 3 ? '☀️' : v.level === 2 ? '⛅' : v.level === 1 ? '☁️' : '🌧';
    return `${md(d.date)} ${weekOf(d.date)}｜${d.sunrise} ${icon} ${v.text}`;
  });
  const best = daily.map((d) => ({ d, v: visibility(d.textDay) }))
    .filter((x) => x.v.level >= 3)[0];

  if (!best) {
    return {
      kind: 'sunrise',
      title: '这五天别定四点的闹钟了',
      body: [
        '想去鸽子窝看日出的，先看这个再决定要不要早起。',
        '',
        rows.join('\n'),
        '',
        '五天里没有一天是晴的。阴天太阳出不来，站在海边只能看到天慢慢变亮，没有那一下。',
        '',
        '日出时刻每天往后推一分钟左右，但真正决定能不能看到的是云，不是时间。',
      ].join('\n'),
      tags: ['秦皇岛', '北戴河', '鸽子窝', '看日出', '日出打卡', '摄影'],
    };
  }

  return {
    kind: 'sunrise',
    title: `${md(best.d.date)}是这周唯一值得早起的一天`,
    body: [
      '鸽子窝看日出，什么时候去不是看几点日出，是看那天有没有云。',
      '',
      rows.join('\n'),
      '',
      `${md(best.d.date)} 日出 ${best.d.sunrise}，天晴。建议提前半小时到——日出前那段天光其实比太阳跳出来的一瞬间更好看。`,
      '',
      '标☁️和🌧的那几天，闹钟可以不用定了。',
    ].join('\n'),
    tags: ['秦皇岛', '北戴河', '鸽子窝', '看日出', '日出时间', '摄影'],
  };
}

/* ---------------- 组装 ---------------- */

async function build() {
  const [tide, weather] = await Promise.all([
    getJSON(`${SITE}/api/tide?days=5&location=beidaihe`),
    getJSON(`${SITE}/api/weather?location=beidaihe`),
  ]);

  const days = ganhaiDays(tide);
  const daily = (weather.daily || []).slice(0, 5);

  const gh = ganhaiCopy(days);
  const sr = daily.length ? sunriseCopy(daily) : null;

  // 哪条更值得发:有明确结论的优先。「都别去」和「只有这一天」都是好选题,
  // 「看运气」那种不痛不痒的排后面。
  const score = (c) => (c && /别去|唯一|只有|能赶海|值得/.test(c.title) ? 2 : 1);
  const pick = sr && score(sr) > score(gh) ? sr : gh;

  return { date: days[0]?.date || '', ganhai: gh, sunrise: sr, pick, days, daily };
}

/* ---------------- 入口 ---------------- */

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');

  let out;
  try {
    out = await build();
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e && e.message || e) });
  }

  // 出图页用:不推送,不需要口令
  if (req.query.preview === '1') {
    return res.status(200).json({ ok: true, ...out });
  }

  const secret = process.env.CRON_SECRET;
  const auth = req.headers.authorization || '';
  const adminKey = (process.env.LEADS_ADMIN_KEY || '').trim();
  const key = (req.query.key || '').trim();
  if (!(secret && auth === `Bearer ${secret}`) && !(adminKey && key === adminKey)) {
    return res.status(401).json({ ok: false, error: '需要 CRON_SECRET 或后台口令' });
  }

  const sendKey = (process.env.SERVERCHAN_KEY || '').trim();
  if (!sendKey) return res.status(200).json({ ok: false, error: '没有配置 SERVERCHAN_KEY' });

  const m = /^sctp(\d+)t/.exec(sendKey);
  const url = m ? `https://${m[1]}.push.ft07.com/send/${sendKey}.send`
    : sendKey.startsWith('SCT') ? `https://sctapi.ftqq.com/${sendKey}.send`
      : `https://sc.ftqq.com/${sendKey}.send`;

  const c = out.pick;
  const desp = [
    `**标题**\n\n${c.title}`,
    `**正文**\n\n${c.body.replace(/\n/g, '\n\n')}`,
    `**标签**\n\n${c.tags.map((t) => '#' + t).join(' ')}`,
    `[打开出图页截屏](${SITE}/xhs?t=${c.kind})`,
  ].join('\n\n---\n\n');

  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `今天发这条:${c.title}`.slice(0, 32), desp }),
    });
    const text = await r.text();
    return res.status(200).json({ ok: /"code"\s*:\s*0/.test(text), kind: c.kind, title: c.title, reply: text.slice(0, 200) });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e && e.message || e) });
  }
}
