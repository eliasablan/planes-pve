/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI loads a function expression. */
// Run through playwright-cli run-code --filename=... against the temporary local
// supply-test route described in docs/plans/2026-10-23-suministros-continuidad.md.
async page => {
 const checks=[];
 const assert=(ok,message)=>{if(!ok)throw new Error(message);checks.push(message);};
 const ready=async()=>{
  await page.setViewportSize({width:1440,height:900});
  await page.mouse.move(720,450);
  await page.goto('http://localhost:3000/supply-test');
  await page.waitForFunction(()=>window.__supplyStore?.getState().speed>100);
  await page.keyboard.press('o');
  await page.evaluate(()=>window.__supplyStore.setState({pveEnemies:{test:{id:'test',role:'scout',position:[2000,400,2000],heading:0,hp:35,maxHp:35}},score:0}));
 };
 await ready();
 await page.evaluate(()=>{
  const store=window.__supplyStore,s=store.getState(),[x,z]=s.localPlayerPosition,y=s.altitude-5;
  store.setState({ammo:170,hp:95,missiles:4,pvePickups:Object.fromEntries(['ammo','missile','repair'].map(kind=>[kind,{id:kind,kind,position:[x,y,z-20]}]))});
 });
 await page.waitForFunction(()=>window.__supplyStore.getState().pvePickupReceipts.length===3);
 const batch=await page.evaluate(()=>{const s=window.__supplyStore.getState();['ammo','missile','repair'].forEach(s.collectPvePickup);return {resources:[s.ammo,s.missiles,s.hp],receipts:window.__supplyStore.getState().pvePickupReceipts.map(r=>({kind:r.kind,amount:r.amount})),remaining:Object.keys(s.pvePickups).length};});
 assert(JSON.stringify(batch.resources)==='[180,5,100]','Actual radius collection caps ammo, missiles and health');
 assert(JSON.stringify(batch.receipts.map(r=>r.amount))==='[10,1,5]','One synchronous frame records real +10 / +1 / +5 gains');
 assert(batch.remaining===0&&batch.receipts.length===3,'Boxes disappear and duplicate collect calls create no extra receipt');
 await page.waitForFunction(()=>document.querySelector('[aria-label="Flight notifications"]')?.textContent.includes('+5 health collected'));
 const receiptText=await page.locator('[aria-label="Flight notifications"]').innerText();
 assert((receiptText.match(/\+10 rounds collected/g)||[]).length===1&&(receiptText.match(/\+1 missile collected/g)||[]).length===1&&(receiptText.match(/\+5 health collected/g)||[]).length===1,'HUD displays each real increment exactly once');
 await page.screenshot({path:'output/playwright/supplies-real-gains.png'});
 await page.evaluate(()=>{const store=window.__supplyStore,s=store.getState(),[x,z]=s.localPlayerPosition;store.setState({pvePickups:{full:{id:'full',kind:'ammo',position:[x,s.altitude-5,z-20]}}});});
 await page.waitForFunction(()=>window.__supplyStore.getState().pvePickupReceipts.length===4);
 assert(await page.evaluate(()=>{const s=window.__supplyStore.getState();return s.pvePickupReceipts[3].amount===0&&!s.pvePickups.full&&s.ammo===180;}),'Full-capacity box is consumed with zero gain');
 await page.waitForFunction(()=>document.querySelector('[aria-label="Flight notifications"]')?.textContent.includes('Ammo full'));
 await page.screenshot({path:'output/playwright/supplies-full-capacity.png'});
 await page.waitForTimeout(3400);
 assert(await page.locator('[aria-label="Flight notifications"]').innerText()==='','Receipts expire after the brief confirmation window');
 assert(await page.locator('[data-supply-guide]').count()===0,'Supply direction cards are removed as requested');
 await ready();
 await page.evaluate(()=>window.__supplyStore.setState({ammo:0,missiles:3,pvePickups:{}}));
 await page.waitForTimeout(4500);
 assert(await page.evaluate(()=>Object.keys(window.__supplyStore.getState().pvePickups).length===0),'Emergency supply does not appear before five seconds');
 await page.waitForFunction(()=>Object.values(window.__supplyStore.getState().pvePickups).some(p=>p.kind==='ammo'),{timeout:3000});
 assert(await page.evaluate(()=>{const s=window.__supplyStore.getState();return s.ammo===0&&Object.keys(s.pvePickups).length===1;}),'Emergency creates one physical ammo pickup while missiles remain');
 await page.screenshot({path:'output/playwright/supplies-emergency.png'});
 await page.waitForFunction(()=>window.__supplyStore.getState().ammo===60,{timeout:7000});
 assert(await page.evaluate(()=>{const s=window.__supplyStore.getState();return s.pvePickupReceipts.length===1&&s.pvePickupReceipts[0].amount===60&&Object.keys(s.pvePickups).length===0;}),'Flying into emergency supply restores +60 exactly once');
 await page.evaluate(()=>window.__supplyStore.setState({hp:0,gameStatus:'finished'}));
 await page.getByRole('button',{name:'Fly again',exact:true}).waitFor();
 await page.getByRole('button',{name:'Fly again',exact:true}).click();
 await page.waitForFunction(()=>window.__supplyStore.getState().gameStatus==='playing');
 assert(await page.evaluate(()=>{const s=window.__supplyStore.getState();return s.ammo===120&&s.hp===100&&s.missiles===3&&s.pvePickupReceipts.length===0&&Object.keys(s.pvePickups).length===0;}),'Actual Fly again button resets resources, old pickups and receipts');
 return {status:'passed',checks,batch,receiptText};
}
