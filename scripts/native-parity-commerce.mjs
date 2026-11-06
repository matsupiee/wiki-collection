import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const round=process.argv[2]??'08';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
await context.request.post('http://localhost:3001/api/auth/sign-in/email',{data:{email:'native-commerce1@example.com',password:'password1234'},headers:{Origin:'http://localhost:3001'}});
const dir=`output/native-parity/round-${round}`;await fs.mkdir(dir,{recursive:true});const page=await context.newPage();
await page.goto('http://localhost:3001/collection');await page.waitForTimeout(1200);const cardUrl=await page.locator('a[href^="/cards/"]').first().getAttribute('href');await page.goto(`http://localhost:3001${cardUrl}`);await page.waitForTimeout(800);
await page.getByRole('button',{name:'出品する',exact:true}).click();await page.waitForURL(/market\/new/);const url=new URL(page.url()).pathname+new URL(page.url()).search;
for(const [name,port] of [['web',3001],['native',8082]]) {await page.goto(`http://localhost:${port}${url}`);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(600);await page.screenshot({path:`${dir}/market-new-${name}.png`});await page.getByRole('button',{name:'オークション',exact:true}).click();await page.screenshot({path:`${dir}/market-new-auction-${name}.png`});}
await page.getByRole('button',{name:'フリマ',exact:true}).click();await page.getByRole('textbox',{name:'価格（pt）',exact:true}).fill('123');await page.getByRole('button',{name:'出品する',exact:true}).click();await page.waitForURL(u=>u.pathname.startsWith('/market/')&&u.pathname!=='/market/new');const detail=new URL(page.url()).pathname;
for(const [name,port] of [['web',3001],['native',8082]]){await page.goto(`http://localhost:${port}${detail}`);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);await page.screenshot({path:`${dir}/market-detail-${name}.png`});}
await browser.close();
