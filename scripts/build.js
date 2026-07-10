#!/usr/bin/env node
/**
 * QHD-LV 构建系统
 * 功能：
 * 1. 提取公共组件（导航栏、页脚、分析脚本）
 * 2. CSS/JS 压缩
 * 3. SEO 优化
 * 4. 生成优化报告
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ===== 1. CSS 压缩 =====
function minifyCSS(css) {
  return css
    // 移除注释
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 移除多余空白
    .replace(/\s+/g, ' ')
    // 移除规则周围的空白
    .replace(/\s*([{}:;,])\s*/g, '$1')
    // 移除最后的分号
    .replace(/;}/g, '}')
    // 移除开头空白
    .trim();
}

// ===== 2. JS 压缩 =====
function minifyJS(js) {
  return js
    // 移除单行注释（但保留 URL 中的 //）
    .replace(/(?<![:"'])\/\/(?!.*:\/\/).*/g, '')
    // 移除多行注释
    .replace(/\/\*[\s\S]*?\*\//g, '')
    // 移除多余空白
    .replace(/\s+/g, ' ')
    // 移除运算符周围的空白
    .replace(/\s*([=+\-*/<>!&|,;:{}()])\s*/g, '$1')
    .trim();
}

// ===== 3. 提取公共导航栏 =====
function extractNavbar(html) {
  const navMatch = html.match(/(<nav class="navbar"[\s\S]*?<\/nav>)/);
  return navMatch ? navMatch[1] : null;
}

// ===== 4. 提取公共页脚 =====
function extractFooter(html) {
  const footerMatch = html.match(/(<footer class="footer"[\s\S]*?<\/footer>)/);
  return footerMatch ? footerMatch[1] : null;
}

// ===== 5. 修复 SEO 问题 =====
function fixSEO(html, filePath) {
  const relativePath = path.relative(ROOT, filePath);
  
  // 修复博客页的 meta description（去除导航文字）
  if (relativePath.startsWith('blog/')) {
    const descMatch = html.match(/<meta name="description" content="([^"]*)"/);
    if (descMatch) {
      let desc = descMatch[1];
      // 移除 "您现在的位置是：首页>..." 等导航文字
      desc = desc.replace(/您现在的位置是：[^。]*。?/g, '');
      desc = desc.replace(/首页>国内旅游目的推荐>正文国内旅游目的推荐/g, '');
      desc = desc.replace(/国内旅游目的推荐\d+/g, '');
      // 清理多余空白
      desc = desc.replace(/\s+/g, ' ').trim();
      // 限制长度
      if (desc.length > 160) {
        desc = desc.substring(0, 157) + '...';
      }
      html = html.replace(
        /<meta name="description" content="[^"]*"/,
        `<meta name="description" content="${desc}"`
      );
    }
  }
  
  return html;
}

// ===== 6. 生成优化报告 =====
function generateReport() {
  const report = {
    timestamp: new Date().toISOString(),
    cssFiles: [],
    jsFiles: [],
    htmlStats: { total: 0, optimized: 0, totalSize: 0, optimizedSize: 0 }
  };
  
  // 统计 CSS 文件
  const cssDir = path.join(ROOT, 'css');
  if (fs.existsSync(cssDir)) {
    fs.readdirSync(cssDir).filter(f => f.endsWith('.css')).forEach(f => {
      const content = fs.readFileSync(path.join(cssDir, f), 'utf8');
      const minified = minifyCSS(content);
      report.cssFiles.push({
        file: f,
        original: content.length,
        minified: minified.length,
        savings: content.length - minified.length
      });
    });
  }
  
  // 统计 JS 文件
  const jsDir = path.join(ROOT, 'js');
  if (fs.existsSync(jsDir)) {
    fs.readdirSync(jsDir).filter(f => f.endsWith('.js')).forEach(f => {
      const content = fs.readFileSync(path.join(jsDir, f), 'utf8');
      const minified = minifyJS(content);
      report.jsFiles.push({
        file: f,
        original: content.length,
        minified: minified.length,
        savings: content.length - minified.length
      });
    });
  }
  
  return report;
}

// ===== 主函数 =====
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'report';
  
  switch (command) {
    case 'minify-css':
      // 压缩所有 CSS 文件
      const cssDir = path.join(ROOT, 'css');
      fs.readdirSync(cssDir).filter(f => f.endsWith('.css') && !f.endsWith('.min.css')).forEach(f => {
        const filePath = path.join(cssDir, f);
        const content = fs.readFileSync(filePath, 'utf8');
        const minified = minifyCSS(content);
        const minPath = filePath.replace('.css', '.min.css');
        fs.writeFileSync(minPath, minified);
        console.log(`Minified: ${f} → ${path.basename(minPath)} (${content.length} → ${minified.length} bytes, ${Math.round((1 - minified.length/content.length) * 100)}% saved)`);
      });
      break;
      
    case 'minify-js':
      // 压缩所有 JS 文件
      const jsDir = path.join(ROOT, 'js');
      fs.readdirSync(jsDir).filter(f => f.endsWith('.js') && !f.endsWith('.min.js')).forEach(f => {
        const filePath = path.join(jsDir, f);
        const content = fs.readFileSync(filePath, 'utf8');
        const minified = minifyJS(content);
        const minPath = filePath.replace('.js', '.min.js');
        fs.writeFileSync(minPath, minified);
        console.log(`Minified: ${f} → ${path.basename(minPath)} (${content.length} → ${minified.length} bytes, ${Math.round((1 - minified.length/content.length) * 100)}% saved)`);
      });
      break;
      
    case 'fix-seo':
      // 修复所有博客页的 SEO 问题
      const blogDir = path.join(ROOT, 'blog');
      let fixed = 0;
      fs.readdirSync(blogDir).filter(f => f.endsWith('.html')).forEach(f => {
        const filePath = path.join(blogDir, f);
        let html = fs.readFileSync(filePath, 'utf8');
        const original = html;
        html = fixSEO(html, filePath);
        if (html !== original) {
          fs.writeFileSync(filePath, html);
          console.log(`SEO fixed: ${f}`);
          fixed++;
        }
      });
      console.log(`\nTotal SEO fixes: ${fixed}`);
      break;
      
    case 'report':
    default:
      const report = generateReport();
      console.log('\n===== QHD-LV 优化报告 =====\n');
      console.log('CSS 文件:');
      report.cssFiles.forEach(f => {
        console.log(`  ${f.file}: ${f.original} → ${f.minified} bytes (节省 ${f.savings} bytes, ${Math.round(f.savings/f.original*100)}%)`);
      });
      console.log('\nJS 文件:');
      report.jsFiles.forEach(f => {
        console.log(`  ${f.file}: ${f.original} → ${f.minified} bytes (节省 ${f.savings} bytes, ${Math.round(f.savings/f.original*100)}%)`);
      });
      break;
  }
}

main();
