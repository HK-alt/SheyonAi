import type { ParsedField } from '@/subject/physics-lab/field-parser';
import { getFieldCatalogEntry } from '@/subject/physics-lab/field-catalog';
import { wrapInlineScript, type FieldVendorScripts } from '@/subject/physics-lab/field-vendor';

type ScenePayload = {
  title: string;
  focus: string;
  sceneId: string;
  params: Record<string, number>;
  labels: ParsedField['labels'];
  caption: string;
};

const SCENE_RUNTIME = `
(function () {
  var SCENE = window.__FIELD_SCENE__ || {};
  var canvas = document.getElementById('view');
  var labelsEl = document.getElementById('labels');
  var detailEl = document.getElementById('detail');
  var statusEl = document.getElementById('status');
  var playBtn = document.getElementById('play');
  if (!canvas || !window.THREE) {
    if (statusEl) statusEl.textContent = 'Three.js failed to load.';
    return;
  }

  function setStatus(msg) {
    if (statusEl) statusEl.textContent = msg || '';
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0c1016, 1);
  if (THREE.sRGBEncoding) renderer.outputEncoding = THREE.sRGBEncoding;
  if (THREE.ACESFilmicToneMapping) {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
  }

  var scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0c1016, 0.028);
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.position.set(6, 4.5, 7);

  var ambient = new THREE.AmbientLight(0xffffff, 0.42);
  scene.add(ambient);
  var hemi = new THREE.HemisphereLight(0xbfd1ff, 0x1a2233, 0.48);
  scene.add(hemi);
  var key = new THREE.DirectionalLight(0xffffff, 0.88);
  key.position.set(5, 10, 6);
  scene.add(key);
  var fill = new THREE.DirectionalLight(0xffffff, 0.32);
  fill.position.set(-4, 2, -6);
  scene.add(fill);

  var root = new THREE.Group();
  scene.add(root);

  var playing = true;
  var t = 0;
  var animators = [];
  var activeLabelId = null;

  function num(key, fallback) {
    var v = SCENE.params && SCENE.params[key];
    return typeof v === 'number' && isFinite(v) ? v : fallback;
  }

  function makeArrow(dir, origin, length, color) {
    var helper = new THREE.ArrowHelper(
      dir.clone().normalize(),
      origin,
      length,
      color,
      Math.min(0.35, length * 0.25),
      Math.min(0.22, length * 0.16)
    );
    return helper;
  }

  function addAxes(size) {
    var g = new THREE.Group();
    g.add(makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), size, 0xff6b6b));
    g.add(makeArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0), size, 0x69db7c));
    g.add(makeArrow(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), size, 0x74c0fc));
    root.add(g);
  }

  function addGroundGrid(size, divisions) {
    var grid = new THREE.GridHelper(size, divisions, 0x4dabf7, 0x2b3a4f);
    grid.position.y = -0.01;
    root.add(grid);
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshStandardMaterial({ color: 0x141c28, roughness: 0.92, metalness: 0.05 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    root.add(ground);
  }

  function heroMaterial(color, emissive, emissiveIntensity) {
    if (THREE.MeshPhysicalMaterial) {
      return new THREE.MeshPhysicalMaterial({
        color: color,
        roughness: 0.28,
        metalness: 0.12,
        clearcoat: 0.35,
        clearcoatRoughness: 0.22,
        emissive: emissive || 0x000000,
        emissiveIntensity: emissiveIntensity || 0,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.35,
      metalness: 0.1,
      emissive: emissive || 0x000000,
      emissiveIntensity: emissiveIntensity || 0,
    });
  }

  function addOrbitRing(a, e, color) {
    var pts = [];
    var steps = 128;
    for (var i = 0; i <= steps; i++) {
      var th = (i / steps) * Math.PI * 2;
      var r = (a * (1 - e * e)) / (1 + e * Math.cos(th));
      pts.push(new THREE.Vector3(r * Math.cos(th), 0, r * Math.sin(th)));
    }
    var geo = new THREE.BufferGeometry().setFromPoints(pts);
    var line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: color || 0x8ec5ff }));
    root.add(line);
    return { a: a, e: e };
  }

  function buildOrbit() {
    addAxes(2.2);
    var a = Math.max(1.2, num('semiMajor', 3));
    var e = Math.min(0.75, Math.max(0, num('eccentricity', 0.25)));
    var orbit = addOrbitRing(a, e, 0x8ec5ff);
    var star = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 32, 32),
      heroMaterial(0xffd43b, 0xaa8800, 0.35)
    );
    root.add(star);
    var planet = new THREE.Mesh(
      new THREE.SphereGeometry(0.22, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x4dabf7 })
    );
    root.add(planet);
    animators.push(function (dt) {
      t += dt * 0.55;
      var th = t;
      var r = (orbit.a * (1 - orbit.e * orbit.e)) / (1 + orbit.e * Math.cos(th));
      planet.position.set(r * Math.cos(th), 0, r * Math.sin(th));
    });
  }

  function buildGravityWell() {
    addAxes(1.8);
    var mass = Math.max(0.5, num('mass', 1));
    var size = 28;
    var geo = new THREE.PlaneGeometry(8, 8, size, size);
    var pos = geo.attributes.position;
    for (var i = 0; i < pos.count; i++) {
      var x = pos.getX(i);
      var y = pos.getY(i);
      var d = Math.sqrt(x * x + y * y) + 0.35;
      pos.setZ(i, -mass * 1.4 / d);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    var mesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        color: 0x3b5bdb,
        wireframe: true,
        transparent: true,
        opacity: 0.85,
      })
    );
    mesh.rotation.x = -Math.PI / 2;
    root.add(mesh);
    var core = new THREE.Mesh(
      new THREE.SphereGeometry(0.28 * Math.sqrt(mass), 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xff922b, emissive: 0x662200, emissiveIntensity: 0.3 })
    );
    core.position.y = -0.1;
    root.add(core);
  }

  function buildDipole() {
    addAxes(2);
    var q = Math.max(0.4, Math.abs(num('charge', 1)));
    var plus = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xff6b6b, emissive: 0x661111, emissiveIntensity: 0.25 })
    );
    plus.position.set(-1.2, 0, 0);
    var minus = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0x74c0fc, emissive: 0x113366, emissiveIntensity: 0.25 })
    );
    minus.position.set(1.2, 0, 0);
    root.add(plus);
    root.add(minus);
    for (var ang = 0; ang < 8; ang++) {
      var a = (ang / 8) * Math.PI * 2;
      var y = Math.sin(a) * 0.9;
      var z = Math.cos(a) * 0.9;
      var curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-1.0, y * 0.2, z * 0.2),
        new THREE.Vector3(0, y * 1.6, z * 1.6),
        new THREE.Vector3(1.0, y * 0.2, z * 0.2)
      );
      var pts = curve.getPoints(24);
      var line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pts),
        new THREE.LineBasicMaterial({ color: 0xa5d8ff, transparent: true, opacity: 0.75 })
      );
      root.add(line);
    }
    root.add(makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(-0.6, 0.7, 0), 1.2 * q, 0xffd43b));
  }

  function buildUniformE() {
    addAxes(2);
    var strength = Math.max(0.4, num('fieldStrength', 1));
    var plateMat = new THREE.MeshStandardMaterial({ color: 0x868e96, metalness: 0.4, roughness: 0.4 });
    var top = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 2.4), plateMat);
    top.position.y = 1.4;
    var bot = new THREE.Mesh(new THREE.BoxGeometry(4, 0.08, 2.4), plateMat);
    bot.position.y = -1.4;
    root.add(top);
    root.add(bot);
    for (var i = -1; i <= 1; i++) {
      for (var j = -1; j <= 1; j++) {
        root.add(
          makeArrow(
            new THREE.Vector3(0, -1, 0),
            new THREE.Vector3(i * 1.1, 1.0, j * 0.7),
            1.6 * strength,
            0xffd43b
          )
        );
      }
    }
    var charge = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xff6b6b })
    );
    charge.position.set(0, 0.6, 0);
    root.add(charge);
    animators.push(function (dt) {
      if (charge.position.y > -1.0) charge.position.y -= dt * 0.55 * strength;
      else charge.position.y = 0.9;
    });
  }

  function buildMagneticBar() {
    addAxes(2);
    var bar = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.45, 0.45),
      new THREE.MeshStandardMaterial({ color: 0xf03e3e })
    );
    root.add(bar);
    var south = new THREE.Mesh(
      new THREE.BoxGeometry(1.2, 0.46, 0.46),
      new THREE.MeshStandardMaterial({ color: 0x1c7ed6 })
    );
    south.position.x = 0.6;
    root.add(south);
    for (var i = 0; i < 10; i++) {
      var a = (i / 10) * Math.PI * 2;
      var curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(-1.3, Math.sin(a) * 0.15, Math.cos(a) * 0.15),
        new THREE.Vector3(0, Math.sin(a) * 1.8, Math.cos(a) * 1.8),
        new THREE.Vector3(1.3, Math.sin(a) * 0.15, Math.cos(a) * 0.15)
      );
      var line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(20)),
        new THREE.LineBasicMaterial({ color: 0xb197fc, transparent: true, opacity: 0.7 })
      );
      root.add(line);
    }
  }

  function buildChargedParticle() {
    addAxes(2);
    var B = Math.max(0.4, num('fieldStrength', 1));
    for (var i = -2; i <= 2; i++) {
      root.add(makeArrow(new THREE.Vector3(0, 1, 0), new THREE.Vector3(i * 0.7, -1.2, 0), 2.2, 0xb197fc));
    }
    var particle = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xffd43b, emissive: 0x886600, emissiveIntensity: 0.3 })
    );
    root.add(particle);
    var trailPts = [];
    var trail = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xffec99 })
    );
    root.add(trail);
    var R = 1.4 / B;
    animators.push(function (dt) {
      t += dt * 1.2 * B;
      particle.position.set(R * Math.cos(t), 0, R * Math.sin(t));
      trailPts.push(particle.position.clone());
      if (trailPts.length > 80) trailPts.shift();
      trail.geometry.dispose();
      trail.geometry = new THREE.BufferGeometry().setFromPoints(trailPts);
    });
  }

  function buildKepler() {
    addAxes(2.2);
    var a = Math.max(1.5, num('semiMajor', 3.2));
    var e = Math.min(0.8, Math.max(0.05, num('eccentricity', 0.55)));
    var orbit = addOrbitRing(a, e, 0xffd8a8);
    var star = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0xffa94d, emissive: 0xaa5500, emissiveIntensity: 0.4 })
    );
    root.add(star);
    var body = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 18, 18),
      new THREE.MeshStandardMaterial({ color: 0xced4da })
    );
    root.add(body);
    animators.push(function (dt) {
      t += dt * 0.7;
      var th = t;
      var r = (orbit.a * (1 - orbit.e * orbit.e)) / (1 + orbit.e * Math.cos(th));
      body.position.set(r * Math.cos(th), 0, r * Math.sin(th));
    });
  }

  function buildProjectileMotion() {
    addGroundGrid(14, 28);
    addAxes(2.8);
    var speed = Math.max(4, num('speed', 12));
    var angleDeg = Math.min(85, Math.max(5, num('angle', 45)));
    var g = Math.max(1, num('gravity', 9.81));
    var rad = (angleDeg * Math.PI) / 180;
    var v0x = speed * Math.cos(rad);
    var v0y = speed * Math.sin(rad);
    var tMax = (2 * v0y) / g;
    var scale = 0.32;
    var trajPts = [];
    var steps = 72;
    for (var i = 0; i <= steps; i++) {
      var tt = (i / steps) * tMax;
      trajPts.push(
        new THREE.Vector3(v0x * tt * scale, Math.max(0, (v0y * tt - 0.5 * g * tt * tt) * scale), 0)
      );
    }
    root.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(trajPts),
        new THREE.LineBasicMaterial({ color: 0x8ec5ff })
      )
    );
    var ghostPts = [];
    for (var j = 0; j <= steps; j++) {
      var t2 = (j / steps) * tMax;
      var y2 = Math.max(0, (v0y * t2 - 0.5 * g * t2 * t2) * scale);
      ghostPts.push(new THREE.Vector3(-0.6, y2, -1.4));
    }
    var ghostGeo = new THREE.BufferGeometry().setFromPoints(ghostPts);
    if (ghostGeo.computeLineDistances) ghostGeo.computeLineDistances();
    root.add(
      new THREE.Line(
        ghostGeo,
        new THREE.LineDashedMaterial({
          color: 0x69db7c,
          dashSize: 0.18,
          gapSize: 0.12,
          transparent: true,
          opacity: 0.65,
        })
      )
    );
    var launch = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.35, 16), heroMaterial(0xffd43b));
    launch.rotation.z = -rad;
    launch.position.set(0, 0.08, 0);
    root.add(launch);
    var ball = new THREE.Mesh(new THREE.SphereGeometry(0.2, 36, 36), heroMaterial(0xff922b, 0x662200, 0.15));
    root.add(ball);
    var velArrow = makeArrow(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0), 1.2, 0xffd43b);
    root.add(velArrow);
    var simT = 0;
    animators.push(function (dt) {
      simT += dt;
      if (simT > tMax) simT = 0;
      var x = v0x * simT * scale;
      var y = Math.max(0, (v0y * simT - 0.5 * g * simT * simT) * scale);
      ball.position.set(x, y, 0);
      var vx = v0x;
      var vy = v0y - g * simT;
      var vmag = Math.sqrt(vx * vx + vy * vy);
      if (vmag > 0.01) {
        velArrow.position.copy(ball.position);
        velArrow.setDirection(new THREE.Vector3(vx, vy, 0).normalize());
        velArrow.setLength(Math.min(1.6, vmag * 0.1), 0.28, 0.16);
      }
    });
  }

  function buildScene() {
    while (root.children.length) root.remove(root.children[0]);
    animators = [];
    t = 0;
    var id = SCENE.sceneId || 'orbit';
    if (id === 'gravity_well') buildGravityWell();
    else if (id === 'electric_dipole') buildDipole();
    else if (id === 'uniform_e_field') buildUniformE();
    else if (id === 'magnetic_bar') buildMagneticBar();
    else if (id === 'charged_particle') buildChargedParticle();
    else if (id === 'kepler') buildKepler();
    else if (id === 'projectile_motion') buildProjectileMotion();
    else buildOrbit();
  }

  function showDetail(label) {
    if (!detailEl || !label) return;
    var body = label.detail
      ? escapeHtml(label.detail)
      : 'This marker highlights <em>' + escapeHtml(label.title) + '</em> in the teaching scene.';
    detailEl.innerHTML =
      '<div class="detail-kicker">Focus</div><strong>' +
      escapeHtml(label.title) +
      '</strong><p>' +
      body +
      '</p>';
  }

  function selectLabel(label) {
    if (!label) return;
    activeLabelId = label.id;
    showDetail(label);
    if (!labelsEl) return;
    var buttons = labelsEl.querySelectorAll('[data-id]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('active', buttons[i].getAttribute('data-id') === label.id);
    }
  }

  function buildLabels() {
    if (!labelsEl) return;
    labelsEl.innerHTML = '';
    var list = SCENE.labels || [];
    list.forEach(function (label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-id', label.id);
      btn.textContent = label.title;
      btn.addEventListener('click', function () {
        selectLabel(label);
      });
      labelsEl.appendChild(btn);
    });
    if (list[0]) selectLabel(list[0]);
    else if (detailEl) {
      detailEl.innerHTML =
        '<div class="detail-kicker">Scene</div><strong>' +
        escapeHtml(SCENE.title || 'Field') +
        '</strong><p>' +
        escapeHtml(SCENE.focus || 'Drag to orbit. Use Play/Pause to control motion.') +
        '</p>';
    }
  }

  var dragging = false;
  var prevX = 0;
  var prevY = 0;
  var spherical = { theta: 0.7, phi: 1.1, radius: 10 };
  var autoSpin = 0.002;

  function updateCamera() {
    camera.position.set(
      spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta),
      spherical.radius * Math.cos(spherical.phi),
      spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta)
    );
    camera.lookAt(0, 0, 0);
  }

  function onPointerDown(e) {
    dragging = true;
    prevX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    prevY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
  }
  function onPointerMove(e) {
    if (!dragging) return;
    var x = e.clientX || (e.touches && e.touches[0].clientX) || 0;
    var y = e.clientY || (e.touches && e.touches[0].clientY) || 0;
    var dx = x - prevX;
    var dy = y - prevY;
    prevX = x;
    prevY = y;
    spherical.theta -= dx * 0.005;
    spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi + dy * 0.005));
    updateCamera();
  }
  function onPointerUp() {
    dragging = false;
  }
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('touchstart', onPointerDown, { passive: true });
  window.addEventListener('touchmove', onPointerMove, { passive: true });
  window.addEventListener('touchend', onPointerUp);

  canvas.addEventListener(
    'wheel',
    function (e) {
      e.preventDefault();
      spherical.radius = Math.max(4, Math.min(22, spherical.radius + e.deltaY * 0.01));
      updateCamera();
    },
    { passive: false }
  );

  if (playBtn) {
    playBtn.addEventListener('click', function () {
      playing = !playing;
      playBtn.textContent = playing ? 'Pause' : 'Play';
    });
  }

  function resize() {
    var w = canvas.clientWidth || canvas.parentElement.clientWidth || 320;
    var h = canvas.clientHeight || canvas.parentElement.clientHeight || 320;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!dragging) spherical.theta += autoSpin;
    if (playing) {
      for (var i = 0; i < animators.length; i++) animators[i](dt);
    }
    updateCamera();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  buildScene();
  buildLabels();
  updateCamera();
  resize();
  setStatus('');
  requestAnimationFrame(frame);
})();
`;

export function buildFieldViewerHtml(
  field: ParsedField,
  vendor: FieldVendorScripts,
): string {
  const entry = getFieldCatalogEntry(field.sceneId);
  const payload: ScenePayload = {
    title: field.title,
    focus: field.focus,
    sceneId: field.sceneId,
    params: field.params,
    labels: field.labels,
    caption: `Teaching model — not a lab measurement. ${entry.attribution}.`,
  };
  const sceneJson = JSON.stringify(payload).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>${escapeHtml(field.title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #0c1016; color: #e8eef7; font-family: system-ui, sans-serif; }
    #stage { position: relative; height: 100%; display: flex; flex-direction: column; }
    #view { flex: 1; width: 100%; display: block; touch-action: none; }
    #dock { position: absolute; left: 0; right: 0; bottom: 0; z-index: 5; padding: 12px 12px 14px;
      pointer-events: auto; touch-action: manipulation;
      background: linear-gradient(to top, rgba(8,10,14,0.98) 70%, rgba(8,10,14,0.88), transparent); }
    #toolbar { display: flex; gap: 8px; margin-bottom: 8px; }
    #toolbar button { border: 1px solid rgba(255,255,255,0.25); background: rgba(255,255,255,0.1);
      color: #e8eef7; border-radius: 999px; padding: 7px 14px; font-size: 13px; cursor: pointer; }
    #labels { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 10px; -webkit-overflow-scrolling: touch; }
    #labels button { border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08);
      color: #e8eef7; border-radius: 999px; padding: 8px 12px; font-size: 13px; white-space: nowrap; cursor: pointer; }
    #labels button.active { background: #b45309; border-color: #fbbf24; color: #fff; }
    #detail { display: block; font-size: 13px; line-height: 1.45; color: #d7e2f0;
      background: rgba(20,28,40,0.92); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px; padding: 10px 12px; max-height: 7.5em; overflow: auto; }
    #detail .detail-kicker { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #fbbf24; margin-bottom: 2px; }
    #detail strong { color: #fff; display: block; margin-bottom: 4px; font-size: 15px; }
    #detail p { margin: 0; }
    #caption, #status { font-size: 11px; color: #8b98a8; margin-top: 6px; }
    h1 { position: absolute; top: 10px; left: 12px; margin: 0; font-size: 14px; font-weight: 650; text-shadow: 0 1px 8px #000; z-index: 3; pointer-events: none; }
  </style>
</head>
<body>
  <div id="stage">
    <canvas id="view"></canvas>
    <h1>${escapeHtml(field.title)}</h1>
    <div id="dock">
      <div id="toolbar"><button type="button" id="play">Pause</button></div>
      <div id="labels"></div>
      <div id="detail"></div>
      <div id="status"></div>
      <div id="caption">${escapeHtml(payload.caption)}</div>
    </div>
  </div>
  <script>window.__FIELD_SCENE__ = ${sceneJson};</script>
  ${wrapInlineScript(vendor.three)}
  ${wrapInlineScript(SCENE_RUNTIME)}
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
