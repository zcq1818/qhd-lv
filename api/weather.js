// api/weather.js - 天气查询 API（Vercel Serverless Function）
// 数据来源：优先和风天气（需配置环境变量），未配置或调用失败时自动降级到 Open-Meteo 免费接口

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { location } = req.query;

  // 地点配置：经纬度（和风天气 location 参数支持 经度,纬度）
  const locations = {
    'beidaihe': { coord: '119.52,39.83', name: '北戴河' },
    'qinhuangdao': { coord: '119.60,39.93', name: '秦皇岛' },
    'shankhaiguan': { coord: '119.75,40.01', name: '山海关' },
    'nandaihe': { coord: '119.43,39.77', name: '南戴河' },
    'huangjin': { coord: '119.35,39.70', name: '黄金海岸' }
  };

  const loc = locations[location] || locations['qinhuangdao'];

  // 和风天气凭据（仅从环境变量读取，切勿写入代码仓库）
  const QWEATHER_KEY = process.env.QWEATHER_API_KEY;
  const QWEATHER_HOST = process.env.QWEATHER_API_HOST;

  // 未配置和风凭据：直接用免费源，保证页面始终有数据
  if (!QWEATHER_KEY || !QWEATHER_HOST) {
    console.warn('[weather] 未配置 QWEATHER_API_KEY / QWEATHER_API_HOST，改用 Open-Meteo');
    try {
      res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
      return res.status(200).json(await fetchOpenMeteo(loc));
    } catch (e) {
      return res.status(200).json({ success: false, error: '天气数据获取失败：' + e.message, location: loc.name });
    }
  }

  const base = `https://${QWEATHER_HOST}`;
  const headers = { 'X-QW-Api-Key': QWEATHER_KEY };

  try {
    // 实况天气 + 7天预报 + 生活指数
    const nowUrl = `${base}/v7/weather/now?location=${loc.coord}`;
    const dailyUrl = `${base}/v7/weather/7d?location=${loc.coord}`;
    const indicesUrl = `${base}/v7/indices/1d?type=0&location=${loc.coord}`;

    const [nowRes, dailyRes, indicesRes] = await Promise.all([
      fetch(nowUrl, { headers }),
      fetch(dailyUrl, { headers }),
      fetch(indicesUrl, { headers })
    ]);

    const nowData = await nowRes.json();
    const dailyData = await dailyRes.json();
    const indicesData = await indicesRes.json();

    if (nowData.code !== '200') {
      throw new Error(`和风天气实况接口错误: ${nowData.code}`);
    }

    const now = nowData.now || {};

    // 生活指数：和风 type 映射到前端字段
    const lifeMap = {
      '5': 'uv',       // 紫外线
      '3': 'dressing', // 穿衣
      '8': 'comfort',  // 舒适度
      '1': 'sport',    // 运动
      '6': 'travel',   // 旅游
      '9': 'flu'       // 感冒
    };
    const life = {};
    (indicesData.daily || []).forEach(item => {
      const key = lifeMap[item.type];
      if (key) {
        life[key] = { name: item.name, brief: item.category, details: item.text };
      }
    });

    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=1800');
    res.status(200).json({
      success: true,
      location: loc.name,
      source: 'qweather',
      now: {
        text: now.text,
        code: now.icon,
        temperature: now.temp,
        feelsLike: now.feelsLike,
        windDirection: now.windDir,
        windSpeed: now.windSpeed,
        humidity: now.humidity,
        visibility: now.vis,
        pressure: now.pressure,
        precip: now.precip
      },
      sunrise: (dailyData.daily || [])[0]?.sunrise || '',
      sunset: (dailyData.daily || [])[0]?.sunset || '',
      uvIndex: (dailyData.daily || [])[0]?.uvIndex || '',
      daily: (dailyData.daily || []).map(d => ({
        date: d.fxDate,
        textDay: d.textDay,
        textNight: d.textNight,
        high: d.tempMax,
        low: d.tempMin,
        windDirection: d.windDirDay,
        windSpeed: d.windSpeedDay,
        humidity: d.humidity,
        sunrise: d.sunrise || '',
        sunset: d.sunset || '',
        uvIndex: d.uvIndex || ''
      })),
      life: life,
      lastUpdate: nowData.updateTime
    });
  } catch (error) {
    // 和风调用失败（配额用尽、密钥过期、网络异常）→ 降级到免费源，而不是让页面空着
    console.warn('[weather] 和风天气调用失败，降级到 Open-Meteo：', error.message);
    try {
      const data = await fetchOpenMeteo(loc);
      data.sourceNote = '和风天气暂时不可用，已切换到备用数据源';
      res.setHeader('Cache-Control', 's-maxage=300');
      return res.status(200).json(data);
    } catch (e) {
      return res.status(200).json({ success: false, error: error.message, location: loc.name });
    }
  }
}
/* ================= Open-Meteo 降级 =================
 * 未配置和风天气凭据(或和风调用失败)时,改用 Open-Meteo 免费接口,
 * 输出结构与和风分支完全一致,前端无需分支处理。
 * 精度说明:Open-Meteo 用的是全球模式,中国境内不如和风的本地台站准,
 * 配好 QWEATHER_API_KEY / QWEATHER_API_HOST 后会自动切回和风。
 */
const WMO = {
  0: '晴', 1: '晴', 2: '多云', 3: '阴', 45: '雾', 48: '雾凇',
  51: '小毛毛雨', 53: '毛毛雨', 55: '大毛毛雨', 56: '冻毛毛雨', 57: '强冻毛毛雨',
  61: '小雨', 63: '中雨', 65: '大雨', 66: '冻雨', 67: '强冻雨',
  71: '小雪', 73: '中雪', 75: '大雪', 77: '雪粒',
  80: '阵雨', 81: '中阵雨', 82: '强阵雨', 85: '阵雪', 86: '强阵雪',
  95: '雷阵雨', 96: '雷阵雨伴冰雹', 99: '强雷阵雨伴冰雹'
};
const WIND_DIR = (deg) => {
  if (deg == null) return '';
  const names = ['北风', '东北风', '东风', '东南风', '南风', '西南风', '西风', '西北风'];
  return names[Math.round(deg / 45) % 8];
};

async function fetchOpenMeteo(loc) {
  const [lon, lat] = loc.coord.split(',');
  const url = 'https://api.open-meteo.com/v1/forecast'
    + `?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,wind_direction_10m,surface_pressure,precipitation'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,wind_speed_10m_max,wind_direction_10m_dominant,uv_index_max,precipitation_sum,sunrise,sunset'
    + '&timezone=Asia%2FShanghai&forecast_days=5';

  const r = await fetch(url);
  if (!r.ok) throw new Error(`Open-Meteo HTTP ${r.status}`);
  const d = await r.json();
  const c = d.current || {};
  const day = d.daily || {};

  // 生活指数:免费源没有,按紫外线与气温粗略给出,并标明为估算
  const uv = (day.uv_index_max || [])[0];
  const life = {};
  if (uv != null) {
    const lv = uv < 3 ? '最弱' : uv < 6 ? '弱' : uv < 8 ? '中等' : uv < 11 ? '强' : '很强';
    life.uv = { name: '紫外线指数', brief: lv, details: `紫外线指数 ${uv},${uv >= 6 ? '外出请涂抹防晒霜、戴帽子或打伞。' : '辐射较弱,注意适当防护即可。'}` };
  }
  const t = c.temperature_2m;
  if (t != null) {
    const dressing = t >= 28 ? '炎热' : t >= 22 ? '舒适' : t >= 15 ? '较舒适' : t >= 8 ? '较冷' : '冷';
    life.dressing = { name: '穿衣指数', brief: dressing, details: `当前气温 ${t}°C,${t >= 28 ? '建议穿轻薄短袖。' : t >= 22 ? '建议穿短袖或薄长袖。' : t >= 15 ? '建议穿长袖加薄外套。' : t >= 8 ? '建议穿厚外套。' : '建议穿棉服或羽绒服。'}` };
  }

  return {
    success: true,
    location: loc.name,
    source: 'open-meteo',
    sourceNote: '数据来源 Open-Meteo 全球模式(未配置和风天气凭据时的备用源)',
    now: {
      text: WMO[c.weather_code] || '未知',
      code: String(c.weather_code ?? ''),
      temperature: c.temperature_2m != null ? String(Math.round(c.temperature_2m)) : '',
      feelsLike: c.apparent_temperature != null ? String(Math.round(c.apparent_temperature)) : '',
      windDirection: WIND_DIR(c.wind_direction_10m),
      windSpeed: c.wind_speed_10m != null ? String(Math.round(c.wind_speed_10m)) : '',
      humidity: c.relative_humidity_2m != null ? String(Math.round(c.relative_humidity_2m)) : '',
      visibility: '',
      pressure: c.surface_pressure != null ? String(Math.round(c.surface_pressure)) : '',
      precip: c.precipitation != null ? String(c.precipitation) : '0.0'
    },
    sunrise: ((day.sunrise || [])[0] || '').slice(11, 16),
    sunset: ((day.sunset || [])[0] || '').slice(11, 16),
    uvIndex: uv != null ? String(Math.round(uv)) : '',
    daily: (day.time || []).map((date, i) => ({
      date,
      textDay: WMO[(day.weather_code || [])[i]] || '未知',
      textNight: WMO[(day.weather_code || [])[i]] || '未知',
      high: (day.temperature_2m_max || [])[i] != null ? String(Math.round(day.temperature_2m_max[i])) : '',
      low: (day.temperature_2m_min || [])[i] != null ? String(Math.round(day.temperature_2m_min[i])) : '',
      windDirection: WIND_DIR((day.wind_direction_10m_dominant || [])[i]),
      windSpeed: (day.wind_speed_10m_max || [])[i] != null ? String(Math.round(day.wind_speed_10m_max[i])) : '',
      humidity: '',
      sunrise: ((day.sunrise || [])[i] || '').slice(11, 16),
      sunset: ((day.sunset || [])[i] || '').slice(11, 16),
      uvIndex: (day.uv_index_max || [])[i] != null ? String(Math.round(day.uv_index_max[i])) : ''
    })),
    life,
    lastUpdate: c.time || new Date().toISOString()
  };
}

