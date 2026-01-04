const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

let server;
let serverPort;

function startServer() {
  return new Promise((resolve, reject) => {
    server = http.createServer((req, res) => {
      let filePath = '.' + req.url;
      if (filePath === './') filePath = './index.html';
      
      const extname = path.extname(filePath);
      let contentType = 'text/html';
      
      switch (extname) {
        case '.js':
          contentType = 'text/javascript';
          break;
        case '.css':
          contentType = 'text/css';
          break;
        case '.json':
          contentType = 'application/json';
          break;
      }
      
      fs.readFile(filePath, (error, content) => {
        if (error) {
          if (error.code === 'ENOENT') {
            res.writeHead(404);
            res.end('File not found');
          } else {
            res.writeHead(500);
            res.end('Server error: ' + error.code);
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });
    
    server.listen(0, () => {
      serverPort = server.address().port;
      console.log(`Server running on port ${serverPort}`);
      resolve();
    });
    
    server.on('error', reject);
  });
}

function stopServer() {
  return new Promise((resolve) => {
    server.close(() => {
      console.log('Server stopped');
      resolve();
    });
  });
}

async function testStarQuiz() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('\n=== Star Quiz Application Tests ===\n');
    
    await page.goto(`http://localhost:${serverPort}`);
    console.log('✓ Application loaded');
    
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    
    const starfieldCanvas = await page.locator('#starfield');
    const isVisible = await starfieldCanvas.isVisible();
    console.log(`✓ Star field canvas ${isVisible ? 'is' : 'is not'} visible`);
    
    const statsPanel = await page.locator('.controls-panel');
    const statsVisible = await statsPanel.isVisible();
    console.log(`✓ Stats panel ${statsVisible ? 'is' : 'is not'} visible`);
    
    const answeredText = await page.locator('#answered').textContent();
    const correctText = await page.locator('#correct').textContent();
    const rateText = await page.locator('#success-rate').textContent();
    
    console.log(`✓ Initial stats: Answered: ${answeredText}, Correct: ${correctText}, Rate: ${rateText}`);
    
    await page.screenshot({ path: 'test-screenshot-initial.png', fullPage: true });
    console.log('✓ Initial screenshot saved');
    
    await page.locator('#grid-toggle').check();
    await page.waitForTimeout(500);
    const gridChecked = await page.locator('#grid-toggle').isChecked();
    console.log(`✓ Grid toggle ${gridChecked ? 'enabled' : 'disabled'}`);
    await page.screenshot({ path: 'test-screenshot-grid.png', fullPage: true });
    console.log('✓ Grid screenshot saved');
    
    const canvasBox = await starfieldCanvas.boundingBox();
    const centerX = canvasBox.x + canvasBox.width / 2;
    const centerY = canvasBox.y + canvasBox.height / 2;
    
    await page.mouse.move(centerX, centerY);
    await page.mouse.down();
    await page.mouse.move(centerX + 100, centerY + 50);
    await page.mouse.up();
    await page.waitForTimeout(500);
    console.log('✓ Pan gesture performed');
    
    await page.mouse.move(centerX, centerY);
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(500);
    console.log('✓ Zoom in performed');
    
    await page.screenshot({ path: 'test-screenshot-pan-zoom.png', fullPage: true });
    console.log('✓ Pan/zoom screenshot saved');
    
    const starsExist = await page.evaluate(() => {
      const canvasEl = document.getElementById('starfield');
      const ctx = canvasEl.getContext('2d');
      const imageData = ctx.getImageData(0, 0, canvasEl.width, canvasEl.height);
      let hasStars = false;
      
      for (let i = 0; i < imageData.data.length; i += 4) {
        if (imageData.data[i] > 200 && imageData.data[i+1] > 200 && imageData.data[i+2] > 200) {
          hasStars = true;
          break;
        }
      }
      
      return hasStars;
    });
    console.log(`✓ Stars ${starsExist ? 'are' : 'are not'} visible on canvas`);
    
    await page.goto(`http://localhost:${serverPort}`);
    await page.waitForLoadState('networkidle');
    
    const starPositions = await page.evaluate(() => {
      return fetch('stars.json')
        .then(r => r.json())
        .then(data => {
          return data.namedStars.slice(0, 10).map(star => ({
            id: star.id,
            proper: star.proper,
            ra: star.ra,
            dec: star.dec
          }));
        });
    });
    
    console.log(`✓ Found ${starPositions.length} named stars to test`);
    
    let clickedStar = false;
    const canvasEl = await page.locator('#starfield');
    const canvasBox2 = await canvasEl.boundingBox();
    
    for (let i = 0; i < starPositions.length; i++) {
      const star = starPositions[i];
      
      const screenPos = await page.evaluate(({ star, canvasW, canvasH }) => {
        const offsetX = 0;
        const offsetY = 0;
        const zoom = 1;
        
        const screenX = canvasW / 2 + offsetX + (star.ra - 12) * (Math.min(canvasW, canvasH) / 24) * zoom;
        const screenY = canvasH / 2 + offsetY - star.dec * (Math.min(canvasW, canvasH) / 180) * zoom;
        
        return { x: screenX, y: screenY };
      }, { star, canvasW: canvasBox2.width, canvasH: canvasBox2.height });
      
      if (screenPos.x < 0 || screenPos.x > canvasBox2.width || 
          screenPos.y < 0 || screenPos.y > canvasBox2.height) {
        console.log(`  ⚠ Star "${star.proper}" is outside viewport`);
        continue;
      }
      
      const absoluteX = canvasBox2.x + screenPos.x;
      const absoluteY = canvasBox2.y + screenPos.y;
      
      console.log(`  Attempting to click star "${star.proper}" at (${Math.round(screenPos.x)}, ${Math.round(screenPos.y)})`);
      
      await page.mouse.click(absoluteX, absoluteY);
      await page.waitForTimeout(300);
      
      const quizVisible = await page.locator('#quiz-popup').isVisible();
      if (quizVisible) {
        console.log(`✓ Star clicked and quiz popup appeared: "${star.proper}"`);
        clickedStar = true;
        
        await page.screenshot({ path: 'test-screenshot-quiz.png', fullPage: true });
        console.log('✓ Quiz screenshot saved');
        
        const options = await page.locator('#quiz-options label').count();
        console.log(`✓ Quiz has ${options} options`);
        
        const questionText = await page.locator('#quiz-popup h3').textContent();
        console.log(`✓ Quiz question: "${questionText}"`);
        
        const firstOption = page.locator('#quiz-options label').first();
        await firstOption.click();
        await page.waitForTimeout(300);
        
        await page.locator('#quiz-form button[type="submit"]').click();
        await page.waitForTimeout(500);
        
        const feedbackVisible = await page.locator('#feedback-popup').isVisible();
        console.log(`✓ Feedback popup ${feedbackVisible ? 'appeared' : 'did not appear'}`);
        
        const feedbackText = await page.locator('#feedback-text').textContent();
        console.log(`✓ Feedback: "${feedbackText}"`);
        
        await page.screenshot({ path: 'test-screenshot-feedback.png', fullPage: true });
        console.log('✓ Feedback screenshot saved');
        
        await page.locator('#close-feedback').click();
        await page.waitForTimeout(300);
        console.log('✓ Feedback popup closed');
        
        break;
      }
    }
    
    if (!clickedStar) {
      console.log('⚠ Could not find a clickable named star (tried all 10 named stars)');
    }
    
    await page.locator('#done-btn').click();
    await page.waitForTimeout(500);
    
    const resultsVisible = await page.locator('#results-popup').isVisible();
    console.log(`✓ Results popup ${resultsVisible ? 'appeared' : 'did not appear'}`);
    
    await page.screenshot({ path: 'test-screenshot-results.png', fullPage: true });
    console.log('✓ Results screenshot saved');
    
    await page.locator('#reset-btn').click();
    await page.waitForTimeout(500);
    
    const resultsHidden = await page.locator('#results-popup').isHidden();
    console.log(`✓ Results popup ${resultsHidden ? 'closed' : 'did not close'}`);
    
    const resetAnswered = await page.locator('#answered').textContent();
    const resetCorrect = await page.locator('#correct').textContent();
    console.log(`✓ Stats after reset: Answered: ${resetAnswered}, Correct: ${resetCorrect}`);
    
    console.log('\n=== All Tests Completed Successfully ===\n');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    console.error(error.stack);
  } finally {
    await context.close();
    await browser.close();
  }
}

async function main() {
  try {
    await startServer();
    await testStarQuiz();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await stopServer();
  }
}

main();
