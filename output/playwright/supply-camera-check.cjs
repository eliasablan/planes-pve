/* eslint-disable @typescript-eslint/no-unused-expressions -- Playwright CLI loads a function expression. */
async page => {
 const results=[];
 await page.setViewportSize({width:2560,height:1440});
 await page.mouse.move(1280,720);
 await page.goto('http://localhost:3000/supply-test');
 await page.waitForFunction(()=>window.__supplyStore?.getState().speed>100&&window.__supplyRender);
 await page.keyboard.press('o');
 await page.evaluate(()=>localStorage.removeItem('planes-pve:display:v1'));
 for(const distance of [600,350,130]) {
  await page.evaluate(distance=>{
   const store=window.__supplyStore,s=store.getState(),root=window.__supplyRender.get(),camera=root.camera,[x,z]=s.localPlayerPosition;
   const forward=camera.getWorldDirection(camera.position.clone());
   const right=camera.position.clone().set(1,0,0).applyQuaternion(camera.getWorldQuaternion(camera.quaternion.clone()));
   store.setState({ammo:170,hp:95,missiles:4,pveEnemies:{test:{id:'test',role:'scout',position:[2000,400,2000],heading:0,hp:35,maxHp:35}},pvePickups:Object.fromEntries(['ammo','missile','repair'].map((kind,index)=>[kind,{id:kind,kind,position:[x+forward.x*distance+right.x*(index-1)*45,s.altitude-5+forward.y*distance+right.y*(index-1)*45,z+forward.z*distance+right.z*(index-1)*45]}]))});
  },distance);
  await page.waitForTimeout(100);
  const bounds=await page.evaluate(()=>{
   const {scene,camera}=window.__supplyRender.get();scene.updateMatrixWorld(true);
   return ['ammo','missile','repair'].map(kind=>{
    const group=scene.getObjectByName(`pickup-${kind}-${kind}`);if(!group)throw new Error('Missing real 3D '+kind);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,meshes=0;
    const vertex=camera.position.clone();
    group.traverse(mesh=>{if(!mesh.isMesh)return;meshes++;const pos=mesh.geometry.attributes.position;for(let i=0;i<pos.count;i++){vertex.fromBufferAttribute(pos,i).applyMatrix4(mesh.matrixWorld).project(camera);minX=Math.min(minX,vertex.x);maxX=Math.max(maxX,vertex.x);minY=Math.min(minY,vertex.y);maxY=Math.max(maxY,vertex.y);}});
    return {kind,widthPx:(maxX-minX)*innerWidth/2,heightPx:(maxY-minY)*innerHeight/2,meshes};
   });
  });
  results.push({distance,bounds});
  await page.screenshot({path:`output/playwright/supplies-3d-${distance}m.png`});
 }
 for(let kind=0;kind<3;kind++) if(!(results[2].bounds[kind].heightPx>results[1].bounds[kind].heightPx*1.5&&results[1].bounds[kind].heightPx>results[0].bounds[kind].heightPx*1.3))throw new Error('Perspective does not grow '+kind);
 if(await page.locator('[data-pickup-emblem]').count())throw new Error('Old floating markers remain');
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.waitForTimeout(150);
 const stationary=await page.evaluate(()=>{const group=window.__supplyRender.get().scene.getObjectByName('pickup-repair-repair').children[0];return {angle:group.rotation.y,bob:group.position.y};});
 await page.waitForTimeout(300);
 const after=await page.evaluate(()=>{const group=window.__supplyRender.get().scene.getObjectByName('pickup-repair-repair').children[0];return {angle:group.rotation.y,bob:group.position.y};});
 if(stationary.angle!==after.angle||stationary.bob!==0||after.bob!==0)throw new Error('Reduced motion failed');
 await page.emulateMedia({reducedMotion:'no-preference'});
 return {status:'passed',perspective:results,reducedMotion:true};
}
