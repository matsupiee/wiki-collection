import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const round=process.argv[2]??'00'; const names=(process.argv[3]??'battle-editor,battle-practice,battle-fusion').split(',');
const browser=await chromium.launch();const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});
await context.request.post('http://localhost:3001/api/auth/sign-in/email',{data:{email:'native-parity1@example.com',password:'password1234'},headers:{Origin:'http://localhost:3001'}});
const dir=`output/native-parity/round-${round}`;await fs.mkdir(dir,{recursive:true});
for(const name of names) for(const [platform,port] of [['web',3001],['native',8082]]){
 const page=await context.newPage();await page.goto(`http://localhost:${port}/${name.startsWith('collection')?'collection':'battle'}`);await page.evaluate(()=>document.fonts.ready);
 const label=name==='battle-editor'?'編集':name==='battle-practice'?'練習対戦':name==='battle-fusion'?'所持カードを強化':null;
 if(label)await page.getByRole('button',{name:label,exact:true}).first().click();
 await page.waitForTimeout(500);await page.screenshot({path:`${dir}/${name}-${platform}.png`});await fs.writeFile(`${dir}/${name}-${platform}.txt`,await page.locator('body').innerText());await page.close();
}
await browser.close();
