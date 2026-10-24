/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI loads a function expression. */
async page=>{
 await page.setViewportSize({width:1920,height:1080});
 await page.goto('http://localhost:3000/supply-test');
 await page.evaluate(()=>localStorage.setItem('planes-pve:display:v1',JSON.stringify({hudScale:100,quality:'native'})));
 await page.reload();await page.waitForFunction(()=>window.__supplyStore?.getState().speed>100&&window.__supplyRender);
 await page.mouse.move(960,540);await page.keyboard.press('o');
 const seed=()=>page.evaluate(()=>{
  const store=window.__supplyStore,s=store.getState(),root=window.__supplyRender.get(),camera=root.camera,[x,z]=s.localPlayerPosition;
  const forward=camera.getWorldDirection(camera.position.clone()),right=camera.position.clone().set(1,0,0).applyQuaternion(camera.getWorldQuaternion(camera.quaternion.clone()));
  store.setState({ammo:170,hp:95,missiles:4,score:0,killLog:[],pvePickupReceipts:[],pveEnemies:{test:{id:'test',role:'scout',position:[2000,400,2000],heading:0,hp:35,maxHp:35}},pvePickups:Object.fromEntries(['ammo','missile','repair'].map((kind,index)=>[kind,{id:kind,kind,position:[x+forward.x*260+right.x*(index-1)*45,s.altitude-5+forward.y*260+right.y*(index-1)*45,z+forward.z*260+right.z*(index-1)*45]}]))});
 });
 await seed();await page.waitForTimeout(150);
 const before=await page.locator('[data-hud-radar-panel]').boundingBox();
 await page.screenshot({path:'output/playwright/supplies-fullhd-clean.png'});
 await page.evaluate(()=>{const store=window.__supplyStore,s=store.getState(),[x,z]=s.localPlayerPosition;s.addKill('Solo Pilot','SCOUT');s.addKill('Solo Pilot','BOMBER');s.spawnPvePickups(['ammo','missile','repair'].map(kind=>({id:'near-'+kind,kind,position:[x,s.altitude-5,z-20]})));});
 await page.waitForFunction(()=>document.querySelectorAll('[data-flight-notification]').length===5);
 const after=await page.locator('[data-hud-radar-panel]').boundingBox();
 if(JSON.stringify(before)!==JSON.stringify(after))throw new Error('Notifications moved the radar');
 if(await page.locator('[data-supply-guide]').count())throw new Error('Unwanted supply guide card remains');
 const text=await page.locator('[aria-label="Flight notifications"]').innerText();
 if(!['SCOUT destroyed','BOMBER destroyed','+10 rounds collected','+1 missile collected','+5 health collected'].every(t=>text.includes(t)))throw new Error('Unified notification feed incomplete');
 await page.screenshot({path:'output/playwright/supplies-fullhd.png'});
 await page.setViewportSize({width:1440,height:900});await seed();await page.waitForTimeout(150);
 await page.screenshot({path:'output/playwright/supplies-after.png'});
 return {status:'passed',radarBefore:before,radarAfter:after,notificationCount:5,text,nativeFullHD:[1920,1080]};
}
