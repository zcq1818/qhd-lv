/**
 * 高德地图 API 代理 — Vercel Serverless Function
 * 将高德 key 放在服务端环境变量，避免前端暴露
 *
 * 使用方法：
 *   1. 在 Vercel 项目设置中添加环境变量：
 *      AMAP_KEY = 你的高德Web服务Key
 *   2. 前端调用：fetch('/api/amap-proxy?action=geocode&address=北戴河')
 *   3. 本函数会代理请求并返回高德 API 响应
 */

const AMAP_BASE = 'https://restapi.amap.com/v3';

module.exports = async (req, res) => {
  // CORS 设置
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 获取环境变量中的高德 Key
  const amapKey = process.env.AMAP_KEY;
  if (!amapKey) {
    return res.status(500).json({
      status: '0',
      info: 'SERVER_ERROR',
      infocode: '500',
      message: '高德地图 API Key 未配置，请在 Vercel 环境变量中设置 AMAP_KEY'
    });
  }

  // 从查询参数中获取 action 和其他参数
  const { action, ...params } = req.query;

  if (!action) {
    return res.status(400).json({
      status: '0',
      info: 'BAD_REQUEST',
      message: '缺少 action 参数'
    });
  }

  // 支持的 action 映射到高德 API 路径
  const actionMap = {
    geocode: '/geocode/geo',
    regeocode: '/geocode/regeo',
    search: '/place/text',
    around: '/place/around',
    direction_driving: '/direction/driving',
    direction_transit: '/direction/transit/integrated',
    direction_walking: '/direction/walking',
    district: '/config/district',
    weather: '/weather/weatherInfo'
  };

  const apiPath = actionMap[action];
  if (!apiPath) {
    return res.status(400).json({
      status: '0',
      info: 'BAD_REQUEST',
      message: '不支持的 action: ' + action
    });
  }

  // 构建高德 API URL
  const url = new URL(AMAP_BASE + apiPath);
  url.searchParams.set('key', amapKey);
  Object.keys(params).forEach(function (key) {
    url.searchParams.set(key, params[key]);
  });

  try {
    const response = await fetch(url.toString());
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    return res.status(502).json({
      status: '0',
      info: 'GATEWAY_ERROR',
      message: '高德 API 请求失败: ' + (err.message || '未知错误')
    });
  }
};
