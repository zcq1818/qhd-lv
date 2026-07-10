// api/weather.js - 天气查询 API（Vercel Serverless Function）
// 数据来源：心知天气 API（免费版）

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { location } = req.query;
  
  // 地点配置
  const locations = {
    'beidaihe': '北戴河',
    'qinhuangdao': '秦皇岛',
    'shankhaiguan': '山海关',
    'nandaihe': '南戴河',
    'huangjin': '黄金海岸'
  };
  
  const locName = locations[location] || '北戴河';
  
  // 心知天气 API Key
  const SENIVERSE_KEY = proces…_KEY || 'teey6tlkdrisczuf';
  
  try {
    // 获取天气实况
    const nowUrl = `https://api.seniverse.com/v3/weather/now.json?key=${SENIVERSE_KEY}&location=${locName}&language=zh-Hans&unit=c`;
    
    // 获取3天天气预报
    const dailyUrl = `https://api.seniverse.com/v3/weather/daily.json?key=${SENIVERSE_KEY}&location=${locName}&language=zh-Hans&unit=c&start=0&days=3`;
    
    // 获取生活指数
    const lifeUrl = `https://api.seniverse.com/v3/life/suggestion.json?key=${SENIVERSE_KEY}&location=${locName}&language=zh-Hans`;
    
    const [nowRes, dailyRes, lifeRes] = await Promise.all([
      fetch(nowUrl),
      fetch(dailyUrl),
      fetch(lifeUrl)
    ]);
    
    const nowData = await nowRes.json();
    const dailyData = await dailyRes.json();
    const lifeData = await lifeRes.json();
    
    // 解析天气实况
    const now = nowData.results?.[0]?.now || {};
    const locationInfo = nowData.results?.[0]?.location || {};
    
    // 解析天气预报
    const daily = dailyData.results?.[0]?.daily || [];
    
    // 解析生活指数
    const life = lifeData.results?.[0]?.suggestion || {};
    
    res.status(200).json({
      success: true,
      location: locName,
      now: {
        text: now.text,
        code: now.code,
        temperature: now.temperature,
        windDirection: now.wind_direction,
        windSpeed: now.wind_speed,
        humidity: now.humidity,
        visibility: now.visibility,
        pressure: now.pressure,
        feelsLike: now.feels_like,
        ultraviolet: now.ultraviolet
      },
      daily: daily.map(d => ({
        date: d.date,
        textDay: d.text_day,
        textNight: d.text_night,
        high: d.high,
        low: d.low,
        windDirection: d.wind_direction,
        windSpeed: d.wind_speed,
        humidity: d.humidity
      })),
      life: {
        uv: life.uv,
        dressing: life.dressing,
        comfort: life.comfort,
        sport: life.sport,
        travel: life.travel,
        flu: life.flu,
        sunscreen: life.sunscreen
      },
      lastUpdate: nowData.results?.[0]?.last_update
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      error: error.message,
      location: locName
    });
  }
}
