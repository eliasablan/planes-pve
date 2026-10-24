/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI loads a function expression. */
async page => {
 await page.setViewportSize({width:1440,height:900});
 await page.mouse.move(720,450);
 await page.goto('http://localhost:3000/supply-test');
 await page.waitForFunction(()=>window.__supplyStore?.getState().speed>100);
 await page.keyboard.press('o');
 await page.evaluate(()=>{const store=window.__supplyStore,s=store.getState(),[x,z]=s.localPlayerPosition,y=s.altitude-5;store.setState({ammo:170,hp:95,missiles:4,pveEnemies:{test:{id:'test',role:'scout',position:[2000,400,2000],heading:0,hp:35,maxHp:35}},pvePickups:{a:{id:'a',kind:'ammo',position:[x-65,y,z-600]},m:{id:'m',kind:'missile',position:[x,y+30,z-600]},r:{id:'r',kind:'repair',position:[x+65,y,z-600]}}});});
 await page.waitForTimeout(400);
 return await page.evaluate(async()=>{const frames=[];let previous=performance.now();await new Promise(resolve=>{const step=t=>{frames.push(t-previous);previous=t;if(frames.length===180)resolve();else requestAnimationFrame(step)};requestAnimationFrame(step)});frames.shift();frames.sort((a,b)=>a-b);return {samples:frames.length,medianMs:frames[Math.floor(frames.length/2)],p95Ms:frames[Math.floor(frames.length*.95)],viewport:[innerWidth,innerHeight],dpr:devicePixelRatio,drawCalls:window.__supplyRender.get().gl.info.render.calls,pickups:Object.keys(window.__supplyStore.getState().pvePickups).length}});
}
