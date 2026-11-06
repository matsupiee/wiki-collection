import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const round=process.argv[2]??'00';
const paths=(process.argv[3]??'packs,collection,battle,market,me,point,me/wallet,me/trades,me/openings').split(',');
const browser=await chromium.launch();
const context=await browser.newContext({viewport:{width:Number(process.env.PARITY_WIDTH??390),height:Number(process.env.PARITY_HEIGHT??844)},reducedMotion:'reduce',deviceScaleFactor:1});
const auth=await context.request.post('http://localhost:3001/api/auth/sign-in/email',{data:{email:'native-parity1@example.com',password:'password1234'},headers:{Origin:'http://localhost:3001'}});
if(!auth.ok())throw Error(await auth.text());
const dir=`output/native-parity/round-${round}`;await fs.mkdir(dir,{recursive:true});
for(const path of paths){for(const [name,port] of [['web',3001],['native',8082]]){
const page=await context.newPage();await page.goto(`http://localhost:${port}/${path}`);await page.evaluate(() => document.fonts.ready);await page.waitForTimeout(1000);await page.addStyleTag({content:'* { animation-play-state: paused !important; caret-color: transparent !important; }'});await page.screenshot({path:`${dir}/${path.replaceAll('/','-')}-${name}.png`});
await fs.writeFile(`${dir}/${path.replaceAll('/','-')}-${name}.txt`,await page.locator('body').innerText());await page.close();}}
await browser.close();
