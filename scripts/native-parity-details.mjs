import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const round=process.argv[2]??'00';
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
await context.request.post('http://localhost:3001/api/auth/sign-in/email',{data:{email:'native-parity1@example.com',password:'password1234'},headers:{Origin:'http://localhost:3001'}});
const inventory=(await (await context.request.get('http://localhost:3001/api/trpc/battle.inventory')).json()).result.data;
const card=inventory.find(c=>!c.inTeam)??inventory[0];
const paths=[['card',`cards/${card.cardId}`],['market-new',`market/new?userCardId=${card.id}&cardId=${card.cardId}`]];
const history=(await (await context.request.get('http://localhost:3001/api/trpc/opening.list')).json()).result?.data;
if(history)console.log('history',JSON.stringify(history).slice(0,200));
const dir=`output/native-parity/round-${round}`;await fs.mkdir(dir,{recursive:true});
for(const [name,path] of paths) for(const [platform,port] of [['web',3001],['native',8082]]){
const page=await context.newPage();await page.goto(`http://localhost:${port}/${path}`);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(1000);await page.screenshot({path:`${dir}/${name}-${platform}.png`});await fs.writeFile(`${dir}/${name}-${platform}.txt`,await page.locator('body').innerText());await page.close();}
await browser.close();
