// api/tide.js - 潮汐查询 API（Vercel Serverless Function）
// 数据来源：公开潮汐表网站

export default async function handler(req, res) {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  const { date, location } = req.query;
  
  // 默认秦皇岛北戴河坐标
  const locations = {
    'beidaihe': { lat: 39.83, lon: 119.52, name: '北戴河' },
    'qinhuangdao': { lat: 39.93, lon: 119.60, name: '秦皇岛' },
    'shankhaiguan': { lat: 40.01, lon: 119.75, name: '山海关' },
    'nandaihe': { lat: 39.77, lon: 119.43, name: '南戴河' },
    'huangjin': { lat: 39.70, lon: 119.35, name: '黄金海岸' }
  };
  
  const loc = locations[location] || locations['beidaihe'];
  const queryDate = date || new Date().toISOString().split('T')[0];
  
  try {
    // 使用潮汐表精灵的数据
    const tideData = await fetchTideData(loc, queryDate);
    
    res.status(200).json({
      success: true,
      location: loc.name,
      date: queryDate,
      data: tideData
    });
  } catch (error) {
    // 如果获取失败，返回基于天文算法的估算数据
    const estimatedData = estimateTide(queryDate, loc);
    
    res.status(200).json({
      success: true,
      location: loc.name,
      date: queryDate,
      data: estimatedData,
      estimated: true
    });
  }
}

// 从公开潮汐表获取数据
async function fetchTideData(loc, date) {
  // 尝试从潮汐表精灵获取数据
  const url = `https://www.tidescn.com/Tides/1337.html`;
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  });
  
  if (!response.ok) throw new Error('Failed to fetch');
  
  const html = await response.text();
  
  // 解析潮汐数据
  const tideRegex = /(\d{2}:\d{2})\s*(满潮|干潮)\s*([\d.]+)米/g;
  const tides = [];
  let match;
  
  while ((match = tideRegex.exec(html)) !== null) {
    tides.push({
      time: match[1],
      type: match[2] === '满潮' ? 'high' : 'low',
      height: parseFloat(match[3])
    });
  }
  
  if (tides.length === 0) throw new Error('No data parsed');
  
  return {
    tides: tides,
    source: 'tidescn.com'
  };
}

// 基于天文算法估算潮汐（备用方案）
function estimateTide(dateStr, loc) {
  const date = new Date(dateStr);
  const dayOfYear = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
  
  // 秦皇岛潮汐特征：一天两次高潮两次低潮
  // 平均潮差约1.5米，大潮时可达2米以上
  
  // 基于月相估算潮汐时间（简化算法）
  const lunarPhase = (dayOfYear % 29.5) / 29.5; // 月相周期
  
  // 高潮时间偏移（大潮时高潮更高）
  const springFactor = Math.cos(lunarPhase * Math.PI * 2); // 大潮小潮系数
  
  // 估算潮高
  const baseHeight = 1.2; // 平均潮高（米）
  const amplitude = 0.7 + springFactor * 0.3; // 潮差
  
  // 生成24小时逐时潮高
  const hourly = [];
  for (let h = 0; h < 24; h++) {
    // 两个主潮波叠加
    const height = baseHeight + 
      amplitude * Math.sin((h / 12.42) * Math.PI * 2) * 0.5 +
      amplitude * Math.sin((h / 12.42 - 0.5) * Math.PI * 2) * 0.3;
    
    hourly.push({
      hour: h,
      height: Math.round(height * 100) / 100
    });
  }
  
  // 找高低潮
  const tides = [];
  for (let i = 1; i < 23; i++) {
    if (hourly[i].height > hourly[i-1].height && hourly[i].height > hourly[i+1].height) {
      tides.push({
        time: `${String(i).padStart(2, '0')}:00`,
        type: 'high',
        height: hourly[i].height
      });
    }
    if (hourly[i].height < hourly[i-1].height && hourly[i].height < hourly[i+1].height) {
      tides.push({
        time: `${String(i).padStart(2, '0')}:00`,
        type: 'low',
        height: hourly[i].height
      });
    }
  }
  
  // 计算赶海建议时间
  const lowTides = tides.filter(t => t.type === 'low');
  const bestGanhaiTime = lowTides.map(t => {
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
    ganhai: bestGanhaiTime,
    estimated: true
  };
}
