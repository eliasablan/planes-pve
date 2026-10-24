// Session 3 helpers, pasted into the browser console on the temporary /terrain-test page.
// Requires the temporary bridge documented in docs/plans/2026-10-24-relieve-continuidad.md.
window.__park = () => { const s = window.__store; const e = s.getState().pveEnemies; s.setState({ pveEnemies: Object.fromEntries(Object.entries(e).map(([k, v], i) => [k, { ...v, position: [9000 + i * 50, 250, 9000] }])), pvePickups: {} }); };
window.__pose = async (pos, yaw = 0, pitch = 0, wait = 400) => {
  window.__park(); const rb = window.__rb; const y = yaw * Math.PI / 180, p = pitch * Math.PI / 180;
  const cy = Math.cos(y / 2), sy = Math.sin(y / 2), cp = Math.cos(p / 2), sp = Math.sin(p / 2);
  rb.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true); rb.setRotation({ x: cy * sp, y: sy * cp, z: -sy * sp, w: cy * cp }, true);
  rb.setLinvel({ x: -Math.sin(y) * Math.cos(p) * 33, y: Math.sin(p) * 33, z: -Math.cos(y) * Math.cos(p) * 33 }, true); rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
  window.__store.setState({ hp: 100 }); await new Promise(r => setTimeout(r, wait)); return rb.translation();
};
// Render CPU time is measured by wrapping gl.render; the frame interval is vsync capped.
window.__perf = async (label, pos, yaw = 0, pitch = 0, frames = 240) => {
  const gl = window.__render.get().gl; await window.__pose(pos, yaw, pitch, 800);
  if (!gl.__origRender) gl.__origRender = gl.render.bind(gl);
  // GPU time per frame through EXT_disjoint_timer_query_webgl2 when the browser exposes it.
  const ctx = gl.getContext(); const ext = ctx.getExtension('EXT_disjoint_timer_query_webgl2'); const queries = []; const gpu = [];
  const cpu = []; gl.render = (a, b) => { const q = ext && ctx.createQuery(); if (q) ctx.beginQuery(ext.TIME_ELAPSED_EXT, q); const t = performance.now(); gl.__origRender(a, b); cpu.push(performance.now() - t); if (q) { ctx.endQuery(ext.TIME_ELAPSED_EXT); queries.push(q); } };
  // Physics: time each Rapier world.step during the window.
  const world = window.__world; const phys = []; const origStep = world && world.step.bind(world);
  if (world) world.step = (...args) => { const t = performance.now(); const r = origStep(...args); phys.push(performance.now() - t); return r; };
  const iv = [], callList = [], triList = []; let last = performance.now();
  await new Promise(res => { let n = 0; const tick = t => { iv.push(t - last); last = t; callList.push(gl.info.render.calls); triList.push(gl.info.render.triangles); if (++n < frames) requestAnimationFrame(tick); else res(); }; requestAnimationFrame(tick); });
  gl.render = gl.__origRender; if (world) world.step = origStep;
  await new Promise(r => setTimeout(r, 300));
  for (const q of queries) { if (ctx.getQueryParameter(q, ctx.QUERY_RESULT_AVAILABLE) && !ctx.getParameter(ext.GPU_DISJOINT_EXT)) gpu.push(ctx.getQueryParameter(q, ctx.QUERY_RESULT) / 1e6); ctx.deleteQuery(q); }
  const q = (a, p) => { const b = [...a].sort((x, y) => x - y); return +b[Math.floor(p * (b.length - 1))].toFixed(2); };
  return { label, frames, intervalMedian: q(iv.slice(5), 0.5), intervalP95: q(iv.slice(5), 0.95), renderCpuMedian: q(cpu, 0.5), renderCpuP95: q(cpu, 0.95), gpuMedian: gpu.length ? q(gpu, 0.5) : null, gpuP95: gpu.length ? q(gpu, 0.95) : null, gpuSamples: gpu.length, physicsStepMedian: phys.length ? q(phys, 0.5) : null, physicsStepP95: phys.length ? q(phys, 0.95) : null, calls: q(callList, 0.5), tris: q(triList, 0.5), geometries: gl.info.memory.geometries, textures: gl.info.memory.textures };
};
