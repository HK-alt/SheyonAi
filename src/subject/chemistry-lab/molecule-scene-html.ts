import type { ParsedMolecule } from './molecule-parser';
import { getMoleculeCatalogEntry } from './molecule-catalog';
import { wrapInlineScript, type MoleculeVendorScripts } from './molecule-vendor';

type ScenePayload = {
  title: string;
  focus: string;
  moleculeId: string;
  formula: string;
  params: Record<string, number>;
  labels: ParsedMolecule['labels'];
  caption: string;
};

const SCENE_RUNTIME = `
(function () {
  var SCENE = window.__MOLECULE_SCENE__ || {};
  var canvas = document.getElementById('view');
  var labelsEl = document.getElementById('labels');
  var detailEl = document.getElementById('detail');
  var statusEl = document.getElementById('status');
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

  var COLORS = {
    H: 0xf8f9fa,
    C: 0x495057,
    N: 0x339af0,
    O: 0xfa5252,
    default: 0x94d82d,
  };
  var RADII = { H: 0.22, C: 0.34, N: 0.32, O: 0.3, default: 0.3 };

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0c1016, 1);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(3.2, 2.4, 4.2);

  scene.add(new THREE.AmbientLight(0xffffff, 0.65));
  var key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(4, 8, 5);
  scene.add(key);

  var root = new THREE.Group();
  scene.add(root);
  var atomMeshes = {};

  function atom(el, x, y, z, id) {
    var color = COLORS[el] || COLORS.default;
    var r = RADII[el] || RADII.default;
    var mesh = new THREE.Mesh(
      new THREE.SphereGeometry(r, 20, 20),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.35, metalness: 0.05 })
    );
    mesh.position.set(x, y, z);
    root.add(mesh);
    if (id) atomMeshes[id] = mesh;
    return mesh;
  }

  function bond(a, b) {
    var start = a.position.clone();
    var end = b.position.clone();
    var dir = end.clone().sub(start);
    var len = dir.length();
    var mid = start.clone().add(end).multiplyScalar(0.5);
    var cyl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, len, 10),
      new THREE.MeshStandardMaterial({ color: 0xadb5bd, roughness: 0.5 })
    );
    cyl.position.copy(mid);
    cyl.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
    root.add(cyl);
  }

  function buildWater() {
    var o = atom('O', 0, 0.2, 0, 'oxygen');
    var h1 = atom('H', 0.86, -0.35, 0, 'h1');
    var h2 = atom('H', -0.86, -0.35, 0, 'h2');
    bond(o, h1);
    bond(o, h2);
  }

  function buildMethane() {
    var c = atom('C', 0, 0, 0, 'carbon');
    var hs = [
      [0.9, 0.9, 0.9, 'h1'],
      [-0.9, -0.9, 0.9, 'h2'],
      [-0.9, 0.9, -0.9, 'h3'],
      [0.9, -0.9, -0.9, 'h4'],
    ];
    hs.forEach(function (h) {
      var m = atom('H', h[0] * 0.75, h[1] * 0.75, h[2] * 0.75, h[3]);
      bond(c, m);
    });
  }

  function buildAmmonia() {
    var n = atom('N', 0, 0.25, 0, 'nitrogen');
    var hs = [
      [0.9, -0.35, 0, 'h1'],
      [-0.45, -0.35, 0.78, 'h2'],
      [-0.45, -0.35, -0.78, 'h3'],
    ];
    hs.forEach(function (h) {
      var m = atom('H', h[0], h[1], h[2], h[3]);
      bond(n, m);
    });
  }

  function buildCO2() {
    var c = atom('C', 0, 0, 0, 'carbon');
    var o1 = atom('O', 1.25, 0, 0, 'o1');
    var o2 = atom('O', -1.25, 0, 0, 'o2');
    bond(c, o1);
    bond(c, o2);
  }

  function buildEthanol() {
    var c1 = atom('C', -0.7, 0, 0, 'c1');
    var c2 = atom('C', 0.7, 0, 0, 'c2');
    var o = atom('O', 1.5, 0.9, 0, 'oxygen');
    var h = atom('H', 2.3, 0.55, 0, 'oh');
    bond(c1, c2);
    bond(c2, o);
    bond(o, h);
    [[-1.2, 0.8, 0.6], [-1.2, 0.8, -0.6], [-1.2, -0.85, 0]].forEach(function (p, i) {
      var m = atom('H', p[0], p[1], p[2], 'h-c1-' + i);
      bond(c1, m);
    });
    [[0.95, -0.85, 0.7], [0.95, -0.85, -0.7]].forEach(function (p, i) {
      var m = atom('H', p[0], p[1], p[2], 'h-c2-' + i);
      bond(c2, m);
    });
  }

  function buildBenzene() {
    var carbons = [];
    for (var i = 0; i < 6; i++) {
      var a = (i / 6) * Math.PI * 2;
      carbons.push(atom('C', Math.cos(a) * 1.15, 0, Math.sin(a) * 1.15, 'c' + (i + 1)));
    }
    for (var j = 0; j < 6; j++) {
      bond(carbons[j], carbons[(j + 1) % 6]);
      var a2 = (j / 6) * Math.PI * 2;
      var h = atom('H', Math.cos(a2) * 1.95, 0, Math.sin(a2) * 1.95, 'h' + (j + 1));
      bond(carbons[j], h);
    }
  }

  function buildAcetic() {
    var c1 = atom('C', -0.9, 0, 0, 'methyl-c');
    var c2 = atom('C', 0.5, 0, 0, 'carboxyl-c');
    var o1 = atom('O', 1.3, 0.95, 0, 'carbonyl-o');
    var o2 = atom('O', 1.15, -1.05, 0, 'hydroxyl-o');
    var h = atom('H', 2.05, -1.25, 0, 'acid-h');
    bond(c1, c2);
    bond(c2, o1);
    bond(c2, o2);
    bond(o2, h);
    [[-1.4, 0.85, 0.55], [-1.4, 0.85, -0.55], [-1.45, -0.9, 0]].forEach(function (p, i) {
      var m = atom('H', p[0], p[1], p[2], 'methyl-h' + i);
      bond(c1, m);
    });
  }

  function buildGlucose() {
    var ring = [];
    for (var i = 0; i < 5; i++) {
      var a = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ring.push(atom('C', Math.cos(a) * 1.1, 0, Math.sin(a) * 1.1, 'c' + (i + 1)));
    }
    var oRing = atom('O', Math.cos(1.2) * 1.1, 0.15, Math.sin(1.2) * 1.1, 'ring-o');
    for (var j = 0; j < 4; j++) bond(ring[j], ring[j + 1]);
    bond(ring[4], oRing);
    bond(oRing, ring[0]);
    var ch2 = atom('C', 0, 1.5, 1.3, 'ch2oh');
    bond(ring[4], ch2);
    var oh = atom('O', 0.7, 2.2, 1.6, 'oh6');
    bond(ch2, oh);
  }

  function buildMolecule() {
    while (root.children.length) root.remove(root.children[0]);
    atomMeshes = {};
    var id = SCENE.moleculeId || 'water';
    if (id === 'methane') buildMethane();
    else if (id === 'ammonia') buildAmmonia();
    else if (id === 'co2') buildCO2();
    else if (id === 'ethanol') buildEthanol();
    else if (id === 'benzene') buildBenzene();
    else if (id === 'acetic_acid') buildAcetic();
    else if (id === 'glucose') buildGlucose();
    else buildWater();
  }

  function showDetail(label) {
    if (!detailEl || !label) return;
    var body = label.detail
      ? escapeHtml(label.detail)
      : 'This marker highlights <em>' + escapeHtml(label.title) + '</em> on the teaching molecule.';
    detailEl.innerHTML =
      '<div class="detail-kicker">Atom / group</div><strong>' +
      escapeHtml(label.title) +
      '</strong><p>' +
      body +
      '</p>';
  }

  function selectLabel(label) {
    if (!label) return;
    showDetail(label);
    if (!labelsEl) return;
    var buttons = labelsEl.querySelectorAll('[data-id]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('active', buttons[i].getAttribute('data-id') === label.id);
    }
    var mesh = atomMeshes[label.id];
    Object.keys(atomMeshes).forEach(function (k) {
      var m = atomMeshes[k];
      if (m && m.material) m.material.emissive = new THREE.Color(0x000000);
    });
    if (mesh && mesh.material) {
      mesh.material.emissive = new THREE.Color(0x664400);
      mesh.material.emissiveIntensity = 0.45;
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
        '<div class="detail-kicker">Molecule</div><strong>' +
        escapeHtml(SCENE.title || 'Molecule') +
        '</strong><p>' +
        escapeHtml(SCENE.formula || '') +
        ' — drag to rotate.</p>';
    }
  }

  var dragging = false;
  var prevX = 0;
  var prevY = 0;
  var spherical = { theta: 0.6, phi: 1.15, radius: 5.5 };

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
    spherical.theta -= (x - prevX) * 0.005;
    spherical.phi = Math.max(0.2, Math.min(Math.PI - 0.2, spherical.phi + (y - prevY) * 0.005));
    prevX = x;
    prevY = y;
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
      spherical.radius = Math.max(2.5, Math.min(12, spherical.radius + e.deltaY * 0.01));
      updateCamera();
    },
    { passive: false }
  );

  function resize() {
    var w = canvas.clientWidth || canvas.parentElement.clientWidth || 320;
    var h = canvas.clientHeight || canvas.parentElement.clientHeight || 320;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);

  function frame() {
    root.rotation.y += 0.004;
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  buildMolecule();
  buildLabels();
  updateCamera();
  resize();
  setStatus('');
  requestAnimationFrame(frame);
})();
`;

export function buildMoleculeViewerHtml(
  molecule: ParsedMolecule,
  vendor: MoleculeVendorScripts,
): string {
  const entry = getMoleculeCatalogEntry(molecule.moleculeId);
  const payload: ScenePayload = {
    title: molecule.title,
    focus: molecule.focus,
    moleculeId: molecule.moleculeId,
    formula: entry.formula,
    params: molecule.params,
    labels: molecule.labels,
    caption: `Teaching model — ${entry.formula}. ${entry.attribution}.`,
  };
  const sceneJson = JSON.stringify(payload).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>${escapeHtml(molecule.title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #0c1016; color: #e8eef7; font-family: system-ui, sans-serif; }
    #stage { position: relative; height: 100%; display: flex; flex-direction: column; }
    #view { flex: 1; width: 100%; display: block; touch-action: none; }
    #dock { position: absolute; left: 0; right: 0; bottom: 0; z-index: 5; padding: 12px 12px 14px;
      pointer-events: auto; touch-action: manipulation;
      background: linear-gradient(to top, rgba(8,10,14,0.98) 70%, rgba(8,10,14,0.88), transparent); }
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
    <h1>${escapeHtml(molecule.title)} <span style="opacity:0.7;font-weight:500">${escapeHtml(entry.formula)}</span></h1>
    <div id="dock">
      <div id="labels"></div>
      <div id="detail"></div>
      <div id="status"></div>
      <div id="caption">${escapeHtml(payload.caption)}</div>
    </div>
  </div>
  <script>window.__MOLECULE_SCENE__ = ${sceneJson};</script>
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
