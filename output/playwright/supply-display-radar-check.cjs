/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI loads a function expression. */
async page => {
 const checks=[];const assert=(value,label)=>{if(!value)throw new Error(label);checks.push(label);};
 await page.setViewportSize({width:2560,height:1440});
 await page.goto('http://localhost:3000/supply-test');
 await page.evaluate(()=>localStorage.removeItem('planes-pve:display:v1'));
 await page.reload();
 await page.waitForFunction(()=>window.__supplyStore?.getState().speed>100&&window.__supplyRender);
 await page.keyboard.press('o');
 await page.evaluate(()=>window.__supplyStore.setState({setFlightData:()=>{}}));
 const headings=[];
 for(const heading of [0,45,90,180,270,-90]) {
  await page.evaluate(heading=>{
   const store=window.__supplyStore,s=store.getState(),[x,z]=s.localPlayerPosition,y=s.altitude-5,a=heading*Math.PI/180;
   const enemy=(id,dx,dz)=>({id,role:'fighter',position:[x+dx,y,z+dz],heading:0,hp:65,maxHp:65});
   store.setState({heading,pveEnemies:{front:enemy('front',-Math.sin(a)*400,-Math.cos(a)*400),tail:enemy('tail',Math.sin(a)*400,Math.cos(a)*400),right:enemy('right',Math.cos(a)*400,-Math.sin(a)*400)},pvePickups:{}});
  },heading);
  await page.waitForTimeout(100);
  const data=await page.locator('[data-radar-enemy]').evaluateAll(nodes=>Object.fromEntries(nodes.map(n=>[n.dataset.radarEnemy,{x:Number(n.dataset.radarX),y:Number(n.dataset.radarY)}])));
  assert(data.front.y<0&&Math.abs(data.front.x)<2&&data.tail.y>0&&data.right.x>0,`Radar nose/tail/right correct at heading ${heading}`);
  headings.push({heading,contacts:data});
 }
 assert(await page.locator('[data-supply-guide]').count()===0,'No supply guidance cards remain');
 const initial=await page.evaluate(()=>{const c=document.querySelector('canvas');return {width:c.width,height:c.height,cssWidth:c.clientWidth,cssHeight:c.clientHeight,scale:document.querySelector('[data-combat-hud]').style.transform};});
 assert(initial.width===2560&&initial.height===1440,'Native QHD canvas uses full monitor-sized resolution');
 assert(initial.scale==='scale(1.25)','Default QHD HUD size is 125%');
 await page.getByRole('button',{name:'Display settings',exact:true}).click();
 await page.getByRole('combobox',{name:'Render quality'}).selectOption('sharp');
 await page.waitForTimeout(300);
 const sharp=await page.evaluate(()=>{const c=document.querySelector('canvas');return {width:c.width,height:c.height};});
 assert(sharp.width===3200&&sharp.height===1800,'Sharp quality renders at125% pixels');
 await page.getByRole('slider',{name:'HUD size'}).focus();await page.keyboard.press('End');
 await page.waitForTimeout(100);
 assert(await page.locator('[data-combat-hud]').evaluate(n=>n.style.transform)==='scale(1.5)','HUD scale changes without scaling the game canvas');
 await page.screenshot({path:'output/playwright/display-settings-qhd.png'});
 await page.getByRole('slider',{name:'HUD size'}).focus();
 await page.keyboard.press('Escape');
 assert(await page.getByRole('region',{name:'Display settings',exact:true}).count()===0,'Escape closes settings while a slider has focus');
 assert(await page.evaluate(()=>document.activeElement.hasAttribute('data-game-shell')),'Closing settings returns focus to flight controls');
 const ammoBefore=await page.evaluate(()=>window.__supplyStore.getState().ammo);
 await page.getByRole('button',{name:'Enter fullscreen',exact:true}).click();
 await page.waitForFunction(()=>Boolean(document.fullscreenElement),undefined,{timeout:5000});
 assert(await page.evaluate(()=>Boolean(document.fullscreenElement)),'Fullscreen button enters actual browser fullscreen');
 await page.keyboard.press('f');await page.waitForFunction(()=>!document.fullscreenElement,undefined,{timeout:5000});
 assert(await page.evaluate(()=>!document.fullscreenElement),'F exits fullscreen after using the button');
 assert(await page.evaluate(()=>window.__supplyStore.getState().ammo)===ammoBefore,'Display controls do not fire the aircraft weapon');
 await page.reload();
 await page.waitForFunction(()=>window.__supplyRender&&window.__supplyStore?.getState().speed>100);
 assert(await page.locator('[data-combat-hud]').evaluate(n=>n.style.transform)==='scale(1.5)','HUD size preference survives reload');
 await page.getByRole('button',{name:'Display settings',exact:true}).click();
 assert(await page.getByRole('combobox',{name:'Render quality'}).inputValue()==='sharp','Render quality preference survives reload');
 await page.getByRole('combobox',{name:'Render quality'}).selectOption('native');
 await page.getByRole('slider',{name:'HUD size'}).focus();await page.keyboard.press('End');for(let i=0;i<5;i++)await page.keyboard.press('ArrowLeft');
 await page.getByRole('button',{name:'Close display settings'}).click();
 return {status:'passed',checks,headings,native:initial,sharp};
}
