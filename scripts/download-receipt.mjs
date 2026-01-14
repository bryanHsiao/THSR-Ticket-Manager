#!/usr/bin/env node
/**
 * THSR Receipt Download Script
 *
 * Usage: node scripts/download-receipt.mjs --date=2025-12-11 --from=左營 --to=台北 --ticket=1213113450036
 *
 * Or with booking code:
 * node scripts/download-receipt.mjs --date=2025-12-11 --from=左營 --to=台北 --booking=ABC12345
 *
 * Options:
 *   --headless=false    Show browser window (default: true)
 *   --json              Output result as JSON (for API usage)
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..');

// Parse command line arguments
const args = process.argv.slice(2);
const params = {};

args.forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.replace('--', '').split('=');
    params[key] = value === undefined ? true : value;
  }
});

const { date, from, to, ticket, booking } = params;
const headless = params.headless !== 'false';
const jsonOutput = params.json === true;

// Validate required params
if (!date || !from || !to || (!ticket && !booking)) {
  const error = 'Missing required parameters';
  if (jsonOutput) {
    console.log(JSON.stringify({ success: false, error }));
  } else {
    console.error('Usage: node scripts/download-receipt.mjs --date=YYYY-MM-DD --from=起站 --to=迄站 --ticket=票號');
    console.error('   or: node scripts/download-receipt.mjs --date=YYYY-MM-DD --from=起站 --to=迄站 --booking=訂位代號');
  }
  process.exit(1);
}

/**
 * Station name to value mapping
 */
const STATIONS = {
  '南港': '1', '台北': '2', '板橋': '3', '桃園': '4',
  '新竹': '5', '苗栗': '6', '台中': '7', '彰化': '8',
  '雲林': '9', '嘉義': '10', '台南': '11', '左營': '12',
};

/**
 * Get month folder name from date (e.g., "2025-12" from "2025-12-11")
 */
function getMonthFolder(dateStr) {
  const [year, month] = dateStr.split('-');
  return `${year}-${month}`;
}

function log(message) {
  if (!jsonOutput) {
    console.log(message);
  }
}

async function main() {
  log('=== THSR Receipt Download ===');
  log(`日期: ${date}`);
  log(`區間: ${from} → ${to}`);
  log(booking ? `訂位代號: ${booking}` : `票號: ${ticket}`);
  log(`模式: ${headless ? '無頭' : '有頭'}`);
  log('=============================\n');

  const browser = await chromium.launch({
    headless: headless,
    args: headless ? [] : ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: 'zh-TW'
  });

  const page = await context.newPage();

  try {
    // Navigate to THSR website
    log('開啟高鐵網站...');
    await page.goto('https://ptis.thsrc.com.tw/ptis/', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    await page.waitForTimeout(2000);

    // Fill date (readonly field, use JavaScript)
    log(`填入日期: ${date}`);
    await page.evaluate((d) => {
      const input = document.getElementById('depDate');
      if (input) {
        input.value = d;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, date);

    // Select departure station
    log(`選擇起站: ${from}`);
    await page.selectOption('#depStation', STATIONS[from] || '2');

    // Select destination station
    log(`選擇迄站: ${to}`);
    await page.selectOption('#arrStation', STATIONS[to] || '2');

    // Select query type and fill
    if (booking) {
      log('選擇查詢方式: 訂位代號');
      await page.selectOption('#ticketType', 'pnrQuery');
      await page.waitForTimeout(500);
      await page.fill('input[name="pnr"]', booking);
    } else {
      log('選擇查詢方式: 車票號碼');
      await page.selectOption('#ticketType', 'tidQuery');
      await page.waitForTimeout(500);
      const cleanTicket = ticket.replace(/\D/g, '');
      log(`填入票號: ${cleanTicket}`);
      await page.fill('#tix', cleanTicket);
    }

    log('\n✅ 表單已填寫完成！');

    // Click the submit button
    log('點擊開始查詢...');
    await page.click('button:has-text("開始查詢")');

    // Wait for results page - look for the download link
    log('等待查詢結果...');
    await page.waitForSelector('a.download_btn', { timeout: 30000 });

    // Click the download link
    log('點擊下載...');

    // Set up download handler
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('a.download_btn')
    ]);

    // Save the file with a meaningful name
    const ticketId = booking || ticket.replace(/\D/g, '');
    const monthFolder = getMonthFolder(date);
    const fileName = `THSR_${date}_${from}-${to}_${ticketId}.pdf`;

    // Create folder structure: downloads/高鐵憑證/{月份}/
    const downloadDir = path.join(PROJECT_ROOT, 'downloads', '高鐵憑證', monthFolder);

    if (!fs.existsSync(downloadDir)) {
      fs.mkdirSync(downloadDir, { recursive: true });
    }

    const downloadPath = path.join(downloadDir, fileName);
    await download.saveAs(downloadPath);

    log(`\n✅ 下載完成！`);
    log(`   檔案: ${downloadPath}\n`);

    // Close browser after download
    await browser.close();

    log('\n🎉 完成！\n');

    // Output result as JSON for API usage
    if (jsonOutput) {
      console.log(JSON.stringify({
        success: true,
        filePath: downloadPath,
        fileName: fileName,
        folder: monthFolder,
      }));
    }

  } catch (error) {
    await browser.close();

    if (jsonOutput) {
      console.log(JSON.stringify({
        success: false,
        error: error.message,
      }));
    } else {
      console.error('錯誤:', error.message);
    }
    process.exit(1);
  }
}

main();
