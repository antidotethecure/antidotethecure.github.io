/* engine3d/water.js — planar reflections for water surfaces (the three.js Reflector technique, shared by any number of
   water materials): a mirrored camera renders the scene above the water plane into a half-res target, and a texture matrix
   lets the water shader look up the reflection of any world point (plus a normal-based ripple offset). Sky pixels are left
   transparent so the water falls back to its analytic sky reflection there. Objects with userData.noMirror are skipped.
     const mirror = makeMirror(THREE, renderer, { y: 0, scale: .5 })
     mirror.render(scene, camera)   → mirror.texture, mirror.matrix (Matrix4)   (call only while water is on screen)
   Shader side: vec4 r = uReflMat * vec4(worldPos, 1.); vec2 uv = r.xy / r.w + N.xz * .035; texture2D(uRefl, uv) (rgb, a = coverage). */
export function makeMirror(THREE, renderer, O = {}) {
  const h = O.y || 0, scale = O.scale || .5;
  const rt = new THREE.WebGLRenderTarget(16, 16, { type: THREE.HalfFloatType }); rt.texture.generateMipmaps = false;
  const vcam = new THREE.PerspectiveCamera(), matrix = new THREE.Matrix4(), N = new THREE.Vector3(0, 1, 0), P = new THREE.Vector3(), V = new THREE.Vector3(), T = new THREE.Vector3(), L = new THREE.Vector3(), Rm = new THREE.Matrix4();
  const clip = [new THREE.Plane(new THREE.Vector3(0, 1, 0), -h - .2)], size = new THREE.Vector2(), cc = new THREE.Color();
  const api = { texture: rt.texture, matrix, enabled: true,
    render(scene, camera) {
      renderer.getDrawingBufferSize(size); const w = Math.max(16, Math.round(size.x * scale)), hh = Math.max(16, Math.round(size.y * scale)); if (rt.width !== w || rt.height !== hh) rt.setSize(w, hh);
      const cp = V.setFromMatrixPosition(camera.matrixWorld); P.set(cp.x, h, cp.z);
      Rm.extractRotation(camera.matrixWorld); L.set(0, 0, -1).applyMatrix4(Rm).add(cp);
      const view = T.copy(P).sub(cp).reflect(N).negate().add(P); vcam.position.copy(view);
      const tgt = L.sub(P).negate().reflect(N).negate().add(P); vcam.up.set(0, 1, 0).applyMatrix4(Rm).reflect(N); vcam.lookAt(tgt);
      vcam.near = camera.near; vcam.far = camera.far; vcam.updateMatrixWorld(); vcam.projectionMatrix.copy(camera.projectionMatrix); vcam.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
      matrix.set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1).multiply(vcam.projectionMatrix).multiply(vcam.matrixWorldInverse);
      const hidden = []; scene.traverseVisible(o => { if (o.userData.noMirror) hidden.push(o); }); hidden.forEach(o => o.visible = false);
      const prevRT = renderer.getRenderTarget(), prevClip = renderer.clippingPlanes, prevBg = scene.background, prevA = renderer.getClearAlpha(); renderer.getClearColor(cc);
      const prevShadow = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false;
      scene.background = null; renderer.setClearColor(0x000000, 0); renderer.clippingPlanes = clip; renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, vcam);
      renderer.setRenderTarget(prevRT); renderer.clippingPlanes = prevClip; scene.background = prevBg; renderer.setClearColor(cc, prevA); renderer.shadowMap.autoUpdate = prevShadow;
      hidden.forEach(o => o.visible = true); },
    dispose() { rt.dispose(); } };
  return api;
}
