/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI loads a function expression. */
async page => {
 const results=[];
 await page.setViewportSize({width:844,height:390});
 await page.goto('http://localhost:3000/supply-test');
 await page.evaluate(()=>localStorage.setItem('planes-pve:display:v1',JSON.stringify({hudScale:100,quality:'native'})));await page.reload();await page.waitForFunction(()=>window.__supplyStore?.getState().speed>100);await page.keyboard.press('o');
 const seed=()=>page.evaluate(()=>{const store=window.__supplyStore,s=store.getState(),[x,z]=s.localPlayerPosition,y=s.altitude-5;store.setState({ammo:170,hp:95,missiles:4,pveEnemies:{test:{id:'test',role:'scout',position:[2000,400,2000],heading:0,hp:35,maxHp:35}},pvePickups:{a:{id:'a',kind:'ammo',position:[x,y,z-350]},m:{id:'m',kind:'missile',position:[x,y,z-450]},r:{id:'r',kind:'repair',position:[x,y,z-550]}},pvePickupReceipts:['ammo','missile','repair'].map((kind,i)=>({id:'receipt-'+kind,kind,amount:[10,1,5][i],collectedAt:Date.now()}))});});
 for(const [width,height] of [[844,390],[568,320],[390,844],[320,700]]){
  await page.setViewportSize({width,height});await seed();await page.waitForTimeout(120);
  const log=await page.locator('[aria-label="Flight notifications"]').boundingBox();
  const radar=await page.locator('[data-hud-radar-panel]').boundingBox();
  if(!log||log.y+log.height>height||log.y<radar.y+radar.height)throw new Error('Notifications outside viewport or above radar '+width);
  await page.screenshot({path:`output/playwright/supplies-${width}x${height}.png`});
  results.push({width,height,receiptBottom:log.y+log.height});
 }
 return {status:'passed',results};
}
