// api/tide.js - 潮汐查询 API（Vercel Serverless Function）
// 数据来源：心知天气 API（免费版）+ 天文算法估算

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { date, location } = req.query;
  
  // 地点配置
  const locations = {
    'beidaihe': { lat: 39.83, lon: 119.52, name: '北戴河', seniverse: 'beidaihe' },
    'qinhuangdao': { lat: 39.93, lon: 119.60, name: '秦皇岛', seniverse: 'qinhuangdao' },
    'shankhaiguan': { lat: 40.01, lon: 119.75, name: '山海关', seniverse: 'shanhaiguan' },
    'nandaihe': { lat: 39.77, lon: 119.43, name: '南戴河', seniverse: 'nandaihe' },
    'huangjin': { lat: 39.70, lon: 119.35, name: '黄金海岸', seniverse: 'changli' }
  };
  
  const loc = locations[location] || locations['beidaihe'];
  const queryDate = date || new Date().toISOString().split('T')[0];
  
  // 心知天气 API Key（免费版）
  // 注册地址：https://www.seniverse.com/products?iid=new
  const SENIVERSE_KEY = process.env.SENIVERSE_API_KEY || 'teey6tlkdrisczuf';
  
  try {
    let tideData;
    
    // 优先使用心知天气 API
    if (SENIVERSE_KEY) {
      tideData = await fetchSeniverseTide(SENIVERSE_KEY, loc, queryDate);
    } else {
      // 降级为天文算法估算
      tideData = estimateTide(queryDate, loc);
      tideData.estimated = true;
    }
    
    res.status(200).json({
      success: true,
      location: loc.name,
      date: queryDate,
      data: tideData,
      source: SENIVERSE_KEY ? 'seniverse' : 'estimated'
    });
  } catch (error) {
    // 降级为估算
    const estimatedData = estimateTide(queryDate, loc);
    
    res.status(200).json({
      success: true,
      location: loc.name,
      date: queryDate,
      data: estimatedData,
      estimated: true,
      source: 'estimated',
      error: error.message
    });
  }
}

// 心知天气 API 获取潮汐数据
async function fetchSeniverseTide(apiKey, loc, date) {
  // 使用心知天气逐小时潮汐接口
  const url = `https://api.seniverse.com/v3/tide/hourly.json?key=${apiKey}&location=${loc.seniverse}&date=${date}`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'QHD-LV-Tide/1.0'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Seniverse API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  if (!data.results || data.results.length === 0) {
    throw new Error('No tide data returned');
  }
  
  // 解析心知天气返回的数据
  const result = data.results[0];
  const ports = result.ports || [];
  
  if (ports.length === 0) {
    throw new Error('No port data found');
  }
  
  // 取第一个港口的数据
  const port = ports[0];
  const portData = port.data && port.data[0];
  
  if (!portData) {
    throw new Error('No tide data for this date');
  }
  
  // 解析逐小时潮高
  const hourly = portData.tide.map((height, hour) => ({
    hour: hour,
    height: parseFloat(height) / 100 // 厘米转米
  }));
  
  // 解析高低潮
  const tides = (portData.range || []).map(item => {
    const time = new Date(item.time);
    return {
      time: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
      type: item.type === 'high' ? 'high' : 'low',
      height: parseFloat(item.height) / 100 // 厘米转米
    };
  });
  
  // 计算赶海建议时间
  const lowTides = tides.filter(t => t.type === 'low');
  const ganhai = lowTides.map(t => {
    const hour = parseInt(t.time.split(':')[0]);
    return {
      start: `${String(Math.max(0, hour - 2)).padStart(2, '0')}:00`,
      end: `${String(Math.min(23, hour + 2)).padStart(2, '0')}:00`,
      lowTideTime: t.time
    };
  });
  
  return {
    tides: tides,
    hourly: hourly,
    ganhai: ganhai,
    port: port.port.name
  };
}

// 基于天文算法估算潮汐（备用方案）
function estimateTide(dateStr, loc) {
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
    if (hourly[i].height > hourly[i-1].height && hourly[i].height > hourly[i+1].height) {
      tides.push({ time: `${String(i).padStart(2, '0')}:00`, type: 'high', height: hourly[i].height });
    }
    if (hourly[i].height < hourly[i-1].height && hourly[i].height < hourly[i+1].height) {
      tides.push({ time: `${String(i).padStart(2, '0')}:00`, type: 'low', height: hourly[i].height });
    }
  }
  
  const lowTides = tides.filter(t => t.type === 'low');
  const ganhai = lowTides.map(t => {
    const hour = parseInt(t.time.split(':')[0]);
    return {
      start: `${String(Math.max(0, hour - 2)).padStart(2, '0')}:00`,
      end: `${String(Math.min(23, hour + 2)).padStart(2, '0')}:00`,
      lowTideTime: t.time
    };
  });
  
  return { tides, hourly, ganhai };
}
