// js/weather-widget.js - 天气小部件（自动显示）
// 数据来源：心知天气 API（免费版）

(function() {
  // 配置
  const API_KEY = 'teey6tlkdrisczuf';
  const DEFAULT_LOCATION = 'beidaihe';
  
  // 地点名称映射
  const LOCATION_NAMES = {
    'beidaihe': '北戴河',
    'qinhuangdao': '秦皇岛',
    'shankhaiguan': '山海关'
  };
  
  // 天气图标映射
  const WEATHER_ICONS = {
    '晴': '☀️', '多云': '⛅', '阴': '☁️',
    '小雨': '🌦️', '中雨': '🌧️', '大雨': '🌧️',
    '暴雨': '⛈️', '雷阵雨': '⛈️', '小雪': '🌨️',
    '中雪': '❄️', '大雪': '❄️', '雾': '🌫️',
    '霾': '🌫️', '沙尘暴': '🌪️'
  };
  
  // 创建天气小部件HTML
  function createWeatherWidget(data) {
    const icon = WEATHER_ICONS[data.now.text] || '🌤️';
    const locationName = LOCATION_NAMES[DEFAULT_LOCATION] || '北戴河';
    
    return `
      <div id="weather-widget" style="
        position: fixed;
        top: 80px;
        right: 20px;
        background: rgba(255,255,255,0.95);
        backdrop-filter: blur(10px);
        border-radius: 12px;
        padding: 12px 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        z-index: 1000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        min-width: 160px;
        border: 1px solid rgba(0,0,0,0.05);
      ">
        <div style="display: flex; align-items: center; gap: 10px;">
          <span style="font-size: 28px;">${icon}</span>
          <div>
            <div style="font-size: 24px; font-weight: 800; color: #0f172a; line-height: 1;">
              ${data.now.temperature}°
            </div>
            <div style="font-size: 12px; color: #64748b; margin-top: 2px;">
              ${locationName} · ${data.now.text}
            </div>
          </div>
        </div>
        <div style="display: flex; gap: 12px; margin-top: 8px; padding-top: 8px; border-top: 1px solid #f1f5f9;">
          <span style="font-size: 11px; color: #94a3b8;">
            💧 ${data.now.humidity || '--'}%
          </span>
          <span style="font-size: 11px; color: #94a3b8;">
            💨 ${data.now.windDirection || '--'}
          </span>
        </div>
      </div>
    `;
  }
  
  // 获取天气数据
  async function fetchWeather() {
    try {
      const response = await fetch(`/api/weather?location=${DEFAULT_LOCATION}`);
      const data = await response.json();
      
      if (data.success) {
        // 移除旧的小部件
        const oldWidget = document.getElementById('weather-widget');
        if (oldWidget) oldWidget.remove();
        
        // 创建新的小部件
        const widgetHtml = createWeatherWidget(data);
        document.body.insertAdjacentHTML('beforeend', widgetHtml);
        
        // 添加淡入动画
        const widget = document.getElementById('weather-widget');
        widget.style.opacity = '0';
        widget.style.transform = 'translateX(20px)';
        widget.style.transition = 'all 0.3s ease';
        
        setTimeout(() => {
          widget.style.opacity = '1';
          widget.style.transform = 'translateX(0)';
        }, 100);
      }
    } catch (error) {
      console.log('天气数据获取失败:', error);
    }
  }
  
  // 页面加载后获取天气
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fetchWeather);
  } else {
    fetchWeather();
  }
  
  // 每30分钟更新一次天气
  setInterval(fetchWeather, 30 * 60 * 1000);
})();
