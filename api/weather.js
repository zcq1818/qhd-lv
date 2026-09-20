// api/weather.js - 天气查询 API（Vercel Serverless Function）
// 数据来源：和风天气 API（免费订阅）

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

  // 和风天气凭据（优先读环境变量）
  const QWEATHER_KEY = process.env.QWEATHER_API_KEY || '99ea2096b20b471d8d20400ee9a23a70';
  const QWEATHER_HOST = process.env.QWEATHER_API_HOST || 'nu6apxvdn8.re.qweatherapi.com';
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

    res.status(200).json({
      success: true,
      location: loc.name,
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
      daily: (dailyData.daily || []).map(d => ({
        date: d.fxDate,
        textDay: d.textDay,
        textNight: d.textNight,
        high: d.tempMax,
        low: d.tempMin,
        windDirection: d.windDirDay,
        windSpeed: d.windSpeedDay,
        humidity: d.humidity
      })),
      life: life,
      lastUpdate: nowData.updateTime
    });
  } catch (error) {
    res.status(200).json({
      success: false,
      error: error.message,
      location: loc.name
    });
  }
}
