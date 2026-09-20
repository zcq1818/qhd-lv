// api/tide.js - 潮汐查询 API（Vercel Serverless Function）
// 数据来源：TideTimes Global 公开潮汐接口（数据源 QWeather + 国家海洋信息中心 NMDIS）
// 前端传入站点ID（如 P2454 秦皇岛、P2490 山海关、P2436 七里海），站点列表见 data/tide-stations.json
// 失败时降级为天文算法估算兜底

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { date, location } = req.query;

  // 秦皇岛周边位置 -> 潮汐站（就近映射，标注实际潮汐站）
  const stations = {
    'beidaihe': { id: 'P2454', name: '北戴河', station: '秦皇岛潮汐站', coord: '119.52,39.83' },
    'qinhuangdao': { id: 'P2454', name: '秦皇岛市区', station: '秦皇岛潮汐站', coord: '119.60,39.93' },
    'shankhaiguan': { id: 'P2490', name: '山海关·老龙头', station: '山海关潮汐站', coord: '119.75,40.01' },
    'nandaihe': { id: 'P2454', name: '南戴河', station: '秦皇岛潮汐站', coord: '119.43,39.77' },
    'qilihai': { id: 'P2436', name: '七里海', station: '七里海潮汐站', coord: '119.28,39.58' },
    'huangjin': { id: 'P2436', name: '黄金海岸', station: '七里海潮汐站', coord: '119.35,39.70' }
  };

  const loc = stations[location] || stations['qinhuangdao'];
  const queryDate = date || new Date().toISOString().split('T')[0];

  // 日出日落、月相、钓鱼指数（和风天气，独立于潮汐数据）
  const extra = await fetchTideExtra(loc.coord, queryDate);

  try {
    const tideData = await fetchTideTimes(loc.id, queryDate);
    res.status(200).json({
      success: true,
      location: loc.name,
      station: loc.station,
      date: queryDate,
      data: { ...tideData, ...extra },
      source: 'qweather'
    });
  } catch (error) {
    const estimatedData = estimateTide(queryDate);
    res.status(200).json({
      success: true,
      location: loc.name,
      station: loc.station,
      date: queryDate,
      data: { ...estimatedData, ...extra },
      source: 'estimated',
      error: error.message
    });
  }
}

// 获取日出日落、月相、钓鱼指数（和风天气，独立于潮汐数据）
async function fetchTideExtra(coord, queryDate) {
  const QWEATHER_KEY = process.env.QWEATHER_API_KEY || '99ea2096b20b471d8d20400ee9a23a70';
  const QWEATHER_HOST = process.env.QWEATHER_API_HOST || 'nu6apxvdn8.re.qweatherapi.com';
  const base = `https://${QWEATHER_HOST}`;
  const headers = { 'X-QW-Api-Key': QWEATHER_KEY };
  const result = { sun: null, moon: null, fishing: null };

  try {
    // 3天预报：日出日落 + 月相
    const dailyRes = await fetch(`${base}/v7/weather/3d?location=${coord}`, { headers });
    const dailyData = await dailyRes.json();
    if (dailyData.code === '200' && dailyData.daily) {
      const day = dailyData.daily.find(d => d.fxDate === queryDate) || dailyData.daily[0];
      if (day) {
        result.sun = { sunrise: day.sunrise, sunset: day.sunset };
        result.moon = {
          moonrise: day.moonrise,
          moonset: day.moonset,
          moonPhase: day.moonPhase,
          moonPhaseIcon: day.moonPhaseIcon
        };
      }
    }
  } catch (e) { /* 天文数据失败不影响潮汐 */ }

  try {
    // 钓鱼指数 type=4
    const idxRes = await fetch(`${base}/v7/indices/1d?type=4&location=${coord}`, { headers });
    const idxData = await idxRes.json();
    if (idxData.code === '200' && idxData.daily) {
      const fishing = idxData.daily.find(d => d.type === '4');
      if (fishing) {
        result.fishing = { category: fishing.category, text: fishing.text };
      }
    }
  } catch (e) { /* 指数失败不影响潮汐 */ }

  return result;
}

// 调用 TideTimes Global 潮汐接口
async function fetchTideTimes(stationId, queryDate) {
  const dateStr = queryDate.replace(/-/g, ''); // YYYY-MM-DD -> YYYYMMDD
  const url = `https://tidetimesglobal.com/api/tide?location=${encodeURIComponent(stationId)}&date=${dateStr}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36'
    }
  });

  if (!response.ok) {
    throw new Error(`TideTimes HTTP ${response.status}`);
  }

  const data = await response.json();
  if (data.code !== '200' || !data.tideTable || data.tideTable.length === 0) {
    throw new Error(data.error || 'TideTimes 无潮汐数据');
  }

  // 高低潮表 -> 前端格式
  const tides = data.tideTable.map(t => ({
    time: t.fxTime.slice(11, 16),
    type: t.type === 'H' ? 'high' : 'low',
    height: parseFloat(t.height)
  }));

  // 逐小时潮高 -> 前端格式
  const hourly = (data.tideHourly || []).map(h => ({
    hour: parseInt(h.fxTime.slice(11, 13), 10),
    height: parseFloat(h.height)
  }));

  // 赶海建议：低潮前后2小时（仅白天低潮适合赶海，夜间危险）
  const lowTides = tides.filter(t => t.type === 'low');
  const ganhai = lowTides.map(t => {
    const [h, m] = t.time.split(':').map(Number);
    const startH = (h - 2 + 24) % 24;
    const endH = (h + 2) % 24;
    return {
      start: `${String(startH).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      end: `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
      lowTideTime: t.time,
      isDaytime: h >= 6 && h < 18
    };
  });

  return { tides, hourly, ganhai };
}

// 天文算法估算（兜底，仅接口失败时使用）
function estimateTide(dateStr) {
  const date = new Date(dateStr);
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  const lunarPhase = (dayOfYear % 29.5) / 29.5;
  const springFactor = Math.cos(lunarPhase * Math.PI * 2);

  const baseHeight = 1.2;
  const amplitude = 0.7 + springFactor * 0.3;

  const hourly = [];
  for (let h = 0; h < 24; h++) {
    const height = baseHeight +
      amplitude * Math.sin((h / 12.42) * Math.PI * 2) * 0.5 +
      amplitude * Math.sin((h / 12.42 - 0.5) * Math.PI * 2) * 0.3;
    hourly.push({ hour: h, height: Math.round(height * 100) / 100 });
  }

  const tides = [];
  for (let i = 1; i < 23; i++) {
    if (hourly[i].height > hourly[i - 1].height && hourly[i].height > hourly[i + 1].height) {
      tides.push({ time: `${String(i).padStart(2, '0')}:00`, type: 'high', height: hourly[i].height });
    }
    if (hourly[i].height < hourly[i - 1].height && hourly[i].height < hourly[i + 1].height) {
      tides.push({ time: `${String(i).padStart(2, '0')}:00`, type: 'low', height: hourly[i].height });
    }
  }

  const lowTides = tides.filter(t => t.type === 'low');
  const ganhai = lowTides.map(t => {
    const hour = parseInt(t.time.split(':')[0], 10);
    return {
      start: `${String(Math.max(0, hour - 2)).padStart(2, '0')}:00`,
      end: `${String(Math.min(23, hour + 2)).padStart(2, '0')}:00`,
      lowTideTime: t.time,
      isDaytime: hour >= 6 && hour < 18
    };
  });

  return { tides, hourly, ganhai };
}
