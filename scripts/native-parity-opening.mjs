import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const round=process.argv[2]??'00';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
await context.request.post('http://localhost:3001/api/auth/sign-in/email',{data:{email:'native-parity2@example.com',password:'password1234'},headers:{Origin:'http://localhost:3001'}});
let openingId;
const history=(await (await context.request.get('http://localhost:3001/api/trpc/opening.list')).json()).result.data;
openingId=history.openings[0]?.id;
if(!openingId){const packs=(await (await context.request.get('http://localhost:3001/api/trpc/pack.list')).json()).result.data;
const opened=await context.request.post('http://localhost:3001/api/trpc/pack.open',{data:{packId:packs.packs[0].id}});openingId=(await opened.json()).result.data.openingId;}
const dir=`output/native-parity/round-${round}`;await fs.mkdir(dir,{recursive:true});
for(const [platform,port] of [['web',3001],['native',8082]]){
const page=await context.newPage();await page.goto(`http://localhost:${port}/openings/${openingId}`);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1800);await page.screenshot({path:`${dir}/opening-${platform}.png`});
await page.goto(`http://localhost:${port}/openings/${openingId}/result`);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);await page.screenshot({path:`${dir}/result-${platform}.png`});await page.close();}
await browser.close();
