import { getAnatomyCatalogEntry } from '@/subject/biology-lab/gltf-catalog';
import type { ParsedAnatomy } from '@/subject/biology-lab/anatomy-parser';
import {
  wrapInlineScript,
  type AnatomyVendorScripts,
} from '@/subject/biology-lab/anatomy-vendor';

type ScenePayload = {
  title: string;
  focus: string;
  modelUrl: string | null;
  procedural: 'cell' | 'neuron' | null;
  labels: ParsedAnatomy['labels'];
  caption: string;
  showNephronInset?: boolean;
};

const SCENE_RUNTIME = `
(function () {
  var SCENE = window.__ANATOMY_SCENE__;
  var canvas = document.getElementById('view');
  var labelsEl = document.getElementById('labels');
  var detailEl = document.getElementById('detail');
  var statusEl = document.getElementById('status');
  var overlayEl = document.getElementById('pins');

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.physicallyCorrectLights = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  var scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c1016);
  scene.fog = new THREE.Fog(0x0c1016, 4, 14);

  var camera = new THREE.PerspectiveCamera(42, 1, 0.01, 200);
  var target = new THREE.Vector3();
  var spherical = { theta: 0.55, phi: 1.15, radius: 2.4 };
  var dragging = false;
  var lastX = 0;
  var lastY = 0;
  var pointers = {};
  var pinchStart = 0;
  var radiusStart = 0;
  var root = new THREE.Group();
  scene.add(root);

  var hemi = new THREE.HemisphereLight(0xd7e4f2, 0x1a140f, 0.62);
  scene.add(hemi);
  var key = new THREE.DirectionalLight(0xfff1e0, 1.55);
  key.position.set(2.4, 3.6, 2.2);
  scene.add(key);
  var fill = new THREE.DirectionalLight(0x8fb4d9, 0.45);
  fill.position.set(-2.8, 0.8, -1.6);
  scene.add(fill);
  var rim = new THREE.DirectionalLight(0xffffff, 0.28);
  rim.position.set(0.2, 4.2, -3.2);
  scene.add(rim);

  var floor = new THREE.Mesh(
    new THREE.CircleGeometry(3.2, 48),
    new THREE.MeshStandardMaterial({ color: 0x151b24, roughness: 0.92, metalness: 0.04 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.15;
  scene.add(floor);
  var grid = new THREE.GridHelper(6.4, 24, 0x3d5a73, 0x1a2233);
  grid.position.y = -1.14;
  scene.add(grid);

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || '';
  }

  function resize() {
    var w = canvas.clientWidth || window.innerWidth;
    var h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / Math.max(h, 1);
    camera.updateProjectionMatrix();
  }

  function updateCamera() {
    var phi = Math.max(0.12, Math.min(Math.PI - 0.12, spherical.phi));
    spherical.phi = phi;
    spherical.radius = Math.max(0.12, Math.min(18, spherical.radius));
    camera.position.set(
      target.x + spherical.radius * Math.sin(phi) * Math.sin(spherical.theta),
      target.y + spherical.radius * Math.cos(phi),
      target.z + spherical.radius * Math.sin(phi) * Math.cos(spherical.theta)
    );
    camera.lookAt(target);
  }

  function frameObject(object) {
    var box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) return;
    var center = box.getCenter(new THREE.Vector3());
    var size = box.getSize(new THREE.Vector3());
    var maxDim = Math.max(size.x, size.y, size.z, 0.08);
    target.copy(center);
    spherical.radius = maxDim * 1.65;
    floor.position.y = box.min.y - 0.04;
    floor.scale.setScalar(Math.max(maxDim * 1.1, 1));
    updateCamera();
  }

  function namedMeshes() {
    var found = [];
    root.traverse(function (obj) {
      if (obj.isMesh) found.push(obj);
    });
    return found;
  }

  function tokensFor(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[_/]+/g, ' ')
      .split(/[^a-z0-9]+/)
      .filter(function (part) { return part.length > 2; });
  }

  function meshForLabel(label) {
    var needles = tokensFor(label.id + ' ' + label.title);
    var meshes = namedMeshes();
    var best = null;
    var bestScore = 0;
    for (var i = 0; i < meshes.length; i++) {
      var name = (meshes[i].name || '').toLowerCase();
      if (!name) continue;
      var score = 0;
      if (name.indexOf(String(label.id || '').toLowerCase()) !== -1) score += 4;
      if (name.indexOf(String(label.title || '').toLowerCase()) !== -1) score += 4;
      for (var n = 0; n < needles.length; n++) {
        if (name.indexOf(needles[n]) !== -1) score += 2;
      }
      if (score > bestScore) {
        bestScore = score;
        best = meshes[i];
      }
    }
    return bestScore >= 2 ? best : null;
  }

  var activeLabelId = null;
  var highlighted = [];
  var anchors = [];
  var nephronGroup = null;
  var nephronInsetSize = null;
  var leadersEl = null;
  var pauseSpinUntil = 0;
  var projectScratch = new THREE.Vector3();

  function clearHighlight() {
    for (var i = 0; i < highlighted.length; i++) {
      var mat = highlighted[i].material;
      if (mat && mat.userData && mat.userData._savedEmissive != null) {
        mat.emissive.setHex(mat.userData._savedEmissive);
        mat.emissiveIntensity = mat.userData._savedIntensity || 0;
      }
    }
    highlighted = [];
  }

  function highlightMesh(mesh) {
    clearHighlight();
    if (!mesh) return;
    var mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (var i = 0; i < mats.length; i++) {
      var mat = mats[i];
      if (!mat || !mat.emissive) continue;
      if (mat.userData._savedEmissive == null) {
        mat.userData._savedEmissive = mat.emissive.getHex();
        mat.userData._savedIntensity = mat.emissiveIntensity || 0;
      }
      mat.emissive.setHex(0x3aa0ff);
      mat.emissiveIntensity = 0.55;
      highlighted.push({ material: mat });
    }
  }

  function lookAtAnchor(object) {
    if (!object) return;
    var pos = object.getWorldPosition(new THREE.Vector3());
    target.lerp(pos, 0.65);
    spherical.radius = Math.max(spherical.radius * 0.92, 0.35);
    updateCamera();
  }

  function showDetail(label) {
    var body = label.detail
      ? escapeHtml(label.detail)
      : 'This label marks <em>' + escapeHtml(label.title) + '</em> on the teaching model.';
    detailEl.innerHTML =
      '<div class="detail-kicker">Selected structure</div>' +
      '<strong>' + escapeHtml(label.title) + '</strong>' +
      '<p>' + body + '</p>';
    detailEl.hidden = false;
    detailEl.scrollTop = 0;
  }

  function syncActiveChrome(label) {
    var buttons = labelsEl.querySelectorAll('[data-id]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].classList.toggle('active', buttons[i].getAttribute('data-id') === label.id);
    }
    for (var a = 0; a < anchors.length; a++) {
      if (anchors[a].pin) {
        anchors[a].pin.classList.toggle('active', anchors[a].label.id === label.id);
      }
    }
  }

  function selectLabel(label, fromClick) {
    if (!label) return;
    activeLabelId = label.id;
    pauseSpinUntil = fromClick ? Date.now() + 8000 : Date.now() + 1200;
    showDetail(label);
    syncActiveChrome(label);
    var entry = null;
    for (var i = 0; i < anchors.length; i++) {
      if (anchors[i].label.id === label.id) {
        entry = anchors[i];
        break;
      }
    }
    var mesh = (entry && entry.mesh) || meshForLabel(label);
    highlightMesh(mesh);
    if (fromClick && entry) lookAtAnchor(entry.object);
    updatePins();
  }

  function bindActivate(el, label) {
    var last = 0;
    function activate(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      var now = Date.now();
      if (now - last < 280) return;
      last = now;
      selectLabel(label, true);
    }
    el.addEventListener('pointerup', activate);
    el.addEventListener('click', activate);
  }

  function escapeHtml(value) {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function renderChips() {
    labelsEl.innerHTML = '';
    var list = SCENE.labels || [];
    list.forEach(function (label) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('data-id', label.id);
      btn.textContent = label.title;
      bindActivate(btn, label);
      labelsEl.appendChild(btn);
    });
    if (!list.length) {
      detailEl.innerHTML = '<p>Drag to orbit. Pinch or scroll to zoom.</p>';
    }
  }

  function clearAnchors() {
    for (var i = 0; i < anchors.length; i++) {
      scene.remove(anchors[i].object);
      if (anchors[i].pin && anchors[i].pin.parentNode) {
        anchors[i].pin.parentNode.removeChild(anchors[i].pin);
      }
    }
    anchors = [];
    overlayEl.innerHTML = '';
  }

  function positionForLabel(label, box) {
    if (label.nephronInset && nephronGroup && nephronInsetSize && label.anchor) {
      var s = nephronInsetSize;
      return nephronGroup.localToWorld(
        new THREE.Vector3(
          label.anchor[0] * s.x,
          label.anchor[1] * s.y,
          label.anchor[2] * s.z
        )
      );
    }
    if (label.anchor && label.anchor.length === 3) {
      var min = box.min;
      var size = box.getSize(new THREE.Vector3());
      return new THREE.Vector3(
        min.x + label.anchor[0] * size.x,
        min.y + label.anchor[1] * size.y,
        min.z + label.anchor[2] * size.z
      );
    }
    var mesh = meshForLabel(label);
    if (mesh) {
      return mesh.getWorldPosition(new THREE.Vector3());
    }
    return null;
  }

  function buildNephronInset(box) {
    if (nephronGroup) {
      root.remove(nephronGroup);
      nephronGroup = null;
    }
    if (!SCENE.showNephronInset) return;
    var size = box.getSize(new THREE.Vector3());
    var center = box.getCenter(new THREE.Vector3());
    var group = new THREE.Group();
    group.position.set(box.max.x + size.x * 0.28, box.min.y + size.y * 0.25, center.z);

    var panel = new THREE.Mesh(
      new THREE.BoxGeometry(size.x * 0.42, size.y * 0.72, size.z * 0.08),
      makeStandard(0x1e293b, { transparent: true, opacity: 0.92 })
    );
    panel.position.set(size.x * 0.22, size.y * 0.38, 0);
    group.add(panel);

    var glom = new THREE.Mesh(
      new THREE.SphereGeometry(size.x * 0.045, 20, 16),
      makeStandard(0xef4444)
    );
    glom.position.set(size.x * 0.08, size.y * 0.62, size.z * 0.06);
    glom.name = 'glomerulus';
    group.add(glom);

    var capsule = new THREE.Mesh(
      new THREE.SphereGeometry(size.x * 0.06, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      makeStandard(0x38bdf8, { transparent: true, opacity: 0.45, side: THREE.DoubleSide })
    );
    capsule.position.copy(glom.position);
    capsule.name = 'bowmans-capsule';
    group.add(capsule);

    var pctPts = [];
    for (var pi = 0; pi <= 12; pi++) {
      var t = pi / 12;
      pctPts.push(
        new THREE.Vector3(
          size.x * (0.1 + t * 0.14),
          size.y * (0.58 - Math.sin(t * Math.PI) * 0.12),
          size.z * 0.06
        )
      );
    }
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(pctPts),
        new THREE.LineBasicMaterial({ color: 0xfbbf24 })
      )
    );

    var loopPts = [];
    for (var li = 0; li <= 16; li++) {
      var lt = li / 16;
      loopPts.push(
        new THREE.Vector3(
          size.x * 0.26,
          size.y * (0.42 - lt * 0.32),
          size.z * 0.06
        )
      );
    }
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(loopPts),
        new THREE.LineBasicMaterial({ color: 0xa78bfa })
      )
    );

    var dctPts = [];
    for (var di = 0; di <= 10; di++) {
      var dt = di / 10;
      dctPts.push(
        new THREE.Vector3(
          size.x * (0.28 + dt * 0.12),
          size.y * (0.18 + Math.sin(dt * Math.PI) * 0.08),
          size.z * 0.06
        )
      );
    }
    group.add(
      new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(dctPts),
        new THREE.LineBasicMaterial({ color: 0x34d399 })
      )
    );

    var duct = new THREE.Mesh(
      new THREE.CylinderGeometry(size.x * 0.018, size.x * 0.018, size.y * 0.28, 10),
      makeStandard(0x64748b)
    );
    duct.position.set(size.x * 0.38, size.y * 0.22, size.z * 0.06);
    duct.name = 'collecting-duct';
    group.add(duct);

    root.add(group);
    nephronGroup = group;
    nephronInsetSize = size.clone();
  }

  function placeAnchors() {
    clearAnchors();
    var list = SCENE.labels || [];
    if (!list.length) return;
    var box = new THREE.Box3().setFromObject(root);
    if (box.isEmpty()) return;
    buildNephronInset(box);
    var center = box.getCenter(new THREE.Vector3());
    var radius = Math.max(box.getSize(new THREE.Vector3()).length() * 0.42, 0.12);
    list.forEach(function (label, index) {
      var object = new THREE.Object3D();
      var pos = positionForLabel(label, box);
      if (pos) {
        object.position.copy(pos);
      } else {
        var t = (index / list.length) * Math.PI * 2 + 0.4;
        var p = 0.85 + (index % 3) * 0.18;
        object.position.set(
          center.x + radius * Math.sin(p) * Math.cos(t),
          center.y + radius * Math.cos(p) * 0.85,
          center.z + radius * Math.sin(p) * Math.sin(t)
        );
      }
      scene.add(object);
      var pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'pin' + (label.nephronInset ? ' pin-inset' : '');
      pin.setAttribute('data-id', label.id);
      pin.innerHTML =
        '<span class="pin-dot"></span><span class="pin-text">' + escapeHtml(label.title) + '</span>';
      bindActivate(pin, label);
      overlayEl.appendChild(pin);
      anchors.push({
        object: object,
        label: label,
        mesh: label.nephronInset ? null : meshForLabel(label),
        pin: pin,
        screenX: 0,
        screenY: 0,
        labelX: 0,
        labelY: 0,
        visible: true,
      });
    });
    if (activeLabelId) {
      for (var i = 0; i < list.length; i++) {
        if (list[i].id === activeLabelId) {
          syncActiveChrome(list[i]);
          break;
        }
      }
    }
  }

  function ensureLeaders() {
    if (leadersEl) return leadersEl;
    leadersEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    leadersEl.setAttribute('id', 'leaders');
    leadersEl.style.cssText =
      'position:absolute;inset:0;pointer-events:none;overflow:visible;z-index:1;';
    overlayEl.insertBefore(leadersEl, overlayEl.firstChild);
    return leadersEl;
  }

  function resolvePinOverlaps() {
    var minDist = 36;
    var visible = anchors.filter(function (a) {
      return a.visible && a.pin;
    });
    for (var pass = 0; pass < 5; pass++) {
      for (var i = 0; i < visible.length; i++) {
        for (var j = i + 1; j < visible.length; j++) {
          var a = visible[i];
          var b = visible[j];
          var dx = b.labelX - a.labelX;
          var dy = b.labelY - a.labelY;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist >= minDist || dist < 0.01) continue;
          var push = (minDist - dist) * 0.55;
          var nx = dx / dist;
          var ny = dy / dist;
          a.labelX -= nx * push;
          a.labelY -= ny * push;
          b.labelX += nx * push;
          b.labelY += ny * push;
        }
      }
    }
    for (var k = 0; k < visible.length; k++) {
      var entry = visible[k];
      entry.pin.style.left = entry.labelX + 'px';
      entry.pin.style.top = entry.labelY + 'px';
    }
  }

  function drawLeaders() {
    var svg = ensureLeaders();
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    var w = overlayEl.clientWidth || canvas.clientWidth;
    var h = overlayEl.clientHeight || canvas.clientHeight;
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('width', String(w));
    svg.setAttribute('height', String(h));
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      if (!a.visible || !a.pin) continue;
      if (Math.abs(a.labelX - a.screenX) < 6 && Math.abs(a.labelY - a.screenY) < 6) continue;
      var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(a.screenX));
      line.setAttribute('y1', String(a.screenY));
      line.setAttribute('x2', String(a.labelX));
      line.setAttribute('y2', String(a.labelY));
      line.setAttribute('stroke', a.label.id === activeLabelId ? '#8ec5ff' : 'rgba(158,197,255,0.45)');
      line.setAttribute('stroke-width', a.label.id === activeLabelId ? '2' : '1.2');
      line.setAttribute('stroke-linecap', 'round');
      svg.appendChild(line);
    }
  }

  function updatePins() {
    var w = overlayEl.clientWidth || canvas.clientWidth;
    var h = overlayEl.clientHeight || canvas.clientHeight;
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i];
      var pin = a.pin;
      if (!pin) continue;
      projectScratch.copy(a.object.position).project(camera);
      var behind = projectScratch.z > 1;
      a.visible = !behind;
      pin.style.display = behind ? 'none' : 'flex';
      if (behind) continue;
      a.screenX = (projectScratch.x * 0.5 + 0.5) * w;
      a.screenY = (-projectScratch.y * 0.5 + 0.5) * h;
      a.labelX = a.screenX;
      a.labelY = a.screenY - (a.label.id === activeLabelId ? 22 : 14);
    }
    resolvePinOverlaps();
    drawLeaders();
  }

  function makeStandard(color, extras) {
    var base = { color: color, roughness: 0.38, metalness: 0.1, clearcoat: 0.25, clearcoatRoughness: 0.3 };
    if (THREE.MeshPhysicalMaterial) {
      return new THREE.MeshPhysicalMaterial(Object.assign(base, extras || {}));
    }
    return new THREE.MeshStandardMaterial(Object.assign({
      color: color,
      roughness: 0.42,
      metalness: 0.08,
    }, extras || {}));
  }

  function buildCell() {
    var group = new THREE.Group();
    var membrane = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 36), makeStandard(0x8fd3c8, { transparent: true, opacity: 0.28, roughness: 0.2 }));
    membrane.name = 'membrane';
    group.add(membrane);
    var cyto = new THREE.Mesh(new THREE.SphereGeometry(0.92, 40, 28), makeStandard(0x3d8b80, { transparent: true, opacity: 0.18 }));
    cyto.name = 'cytoplasm';
    group.add(cyto);
    var nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.32, 32, 24), makeStandard(0x355c7d, { roughness: 0.35 }));
    nucleus.name = 'nucleus';
    nucleus.position.set(-0.12, 0.05, 0.08);
    group.add(nucleus);
    var nucleolus = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), makeStandard(0x1f3a56));
    nucleolus.name = 'nucleolus';
    nucleolus.position.copy(nucleus.position);
    group.add(nucleolus);
    for (var i = 0; i < 7; i++) {
      var mito = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), makeStandard(0xc06c84));
      mito.name = 'mitochondria';
      var a = (i / 7) * Math.PI * 2;
      mito.position.set(Math.cos(a) * 0.55, Math.sin(a * 1.4) * 0.22, Math.sin(a) * 0.5);
      mito.scale.set(1.6, 0.7, 0.9);
      group.add(mito);
    }
    var vacuole = new THREE.Mesh(new THREE.SphereGeometry(0.18, 20, 16), makeStandard(0x99b898, { transparent: true, opacity: 0.55 }));
    vacuole.name = 'vacuole';
    vacuole.position.set(0.38, -0.22, 0.12);
    group.add(vacuole);
    root.add(group);
    frameObject(group);
    placeAnchors();
  }

  function buildNeuron() {
    var group = new THREE.Group();
    var soma = new THREE.Mesh(new THREE.SphereGeometry(0.28, 28, 20), makeStandard(0xf8b195));
    soma.name = 'soma';
    group.add(soma);
    var nucleus = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), makeStandard(0x355c7d));
    nucleus.name = 'nucleus';
    group.add(nucleus);
    var axon = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 1.8, 12), makeStandard(0xf67280));
    axon.name = 'axon';
    axon.rotation.z = Math.PI / 2;
    axon.position.x = 1.05;
    group.add(axon);
    var terminal = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), makeStandard(0xc06c84));
    terminal.name = 'axon-terminal';
    terminal.position.x = 1.95;
    group.add(terminal);
    for (var i = 0; i < 6; i++) {
      var dend = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.04, 0.7, 8), makeStandard(0x6c5b7b));
      dend.name = 'dendrite';
      var a = -0.6 + i * 0.24;
      dend.position.set(-0.45, Math.sin(a) * 0.35, Math.cos(a) * 0.2);
      dend.rotation.z = Math.PI / 2 + a;
      group.add(dend);
    }
    var myelin = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.35, 12), makeStandard(0xfff1c1, { roughness: 0.3 }));
    myelin.name = 'myelin';
    myelin.rotation.z = Math.PI / 2;
    myelin.position.x = 0.85;
    group.add(myelin);
    root.add(group);
    frameObject(group);
    placeAnchors();
  }

  function onPointerDown(ev) {
    pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 1) {
      dragging = true;
      lastX = ev.clientX;
      lastY = ev.clientY;
    } else if (ids.length === 2) {
      dragging = false;
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      pinchStart = Math.hypot(a.x - b.x, a.y - b.y);
      radiusStart = spherical.radius;
    }
  }
  function onPointerMove(ev) {
    if (!pointers[ev.pointerId]) return;
    pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    var ids = Object.keys(pointers);
    if (ids.length === 2) {
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      var dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchStart) spherical.radius = radiusStart * (pinchStart / Math.max(dist, 1));
      updateCamera();
      return;
    }
    if (!dragging) return;
    var dx = ev.clientX - lastX;
    var dy = ev.clientY - lastY;
    lastX = ev.clientX;
    lastY = ev.clientY;
    spherical.theta -= dx * 0.008;
    spherical.phi -= dy * 0.008;
    updateCamera();
  }
  function onPointerUp(ev) {
    delete pointers[ev.pointerId];
    dragging = Object.keys(pointers).length === 1;
  }

  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    spherical.radius *= ev.deltaY > 0 ? 1.08 : 0.92;
    updateCamera();
  }, { passive: false });

  window.addEventListener('resize', function () { resize(); updateCamera(); });
  resize();
  updateCamera();
  renderChips();
  if (SCENE.labels && SCENE.labels.length) {
    var initial = SCENE.labels[0];
    if (SCENE.focus) {
      for (var li = 0; li < SCENE.labels.length; li++) {
        var title = String(SCENE.labels[li].title || '').toLowerCase();
        var id = String(SCENE.labels[li].id || '').toLowerCase();
        var focus = String(SCENE.focus).toLowerCase();
        if (id === focus || title.indexOf(focus) !== -1 || focus.indexOf(title) !== -1) {
          initial = SCENE.labels[li];
          break;
        }
      }
    }
    selectLabel(initial, false);
  }

  function tick() {
    requestAnimationFrame(tick);
    if (!dragging && Object.keys(pointers).length === 0 && Date.now() > pauseSpinUntil) {
      spherical.theta += 0.003;
      updateCamera();
    }
    renderer.render(scene, camera);
    updatePins();
  }
  tick();

  if (SCENE.procedural === 'cell') {
    setStatus('');
    buildCell();
    return;
  }
  if (SCENE.procedural === 'neuron') {
    setStatus('');
    buildNeuron();
    return;
  }
  if (!SCENE.modelUrl) {
    setStatus('No model URL.');
    buildCell();
    return;
  }

  setStatus('Loading 3D model…');
  var loader = new THREE.GLTFLoader();
  loader.load(
    SCENE.modelUrl,
    function (gltf) {
      setStatus('');
      var model = gltf.scene;
      model.traverse(function (obj) {
        if (obj.isMesh) {
          obj.castShadow = false;
          obj.receiveShadow = false;
          if (obj.material) {
            obj.material.side = THREE.DoubleSide;
            if ('metalness' in obj.material && obj.material.metalness > 0.6) {
              obj.material.metalness = 0.25;
            }
          }
        }
      });
      root.add(model);
      frameObject(model);
      placeAnchors();
      if (activeLabelId) {
        for (var i = 0; i < (SCENE.labels || []).length; i++) {
          if (SCENE.labels[i].id === activeLabelId) {
            selectLabel(SCENE.labels[i], false);
            break;
          }
        }
      }
    },
    undefined,
    function () {
      setStatus('Could not load the organ mesh. Showing a cell model instead.');
      buildCell();
      if (SCENE.labels && SCENE.labels[0]) selectLabel(SCENE.labels[0], false);
    }
  );
})();
`;

export function buildAnatomyViewerHtml(
  anatomy: ParsedAnatomy,
  vendor: AnatomyVendorScripts,
): string {
  const entry = getAnatomyCatalogEntry(anatomy.modelId);
  const payload: ScenePayload = {
    title: anatomy.title,
    focus: anatomy.focus,
    modelUrl: entry.remoteUrl ?? null,
    procedural: entry.procedural ?? null,
    labels: anatomy.labels,
    showNephronInset: anatomy.showNephronInset,
    caption: anatomy.scopeNote
      ? `${anatomy.scopeNote} ${entry.attribution}.`
      : `Teaching model — not a medical scan. ${entry.attribution}.`,
  };
  const sceneJson = JSON.stringify(payload).replace(/</g, '\\u003c');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <title>${escapeHtml(anatomy.title)}</title>
  <style>
    * { box-sizing: border-box; }
    html, body { margin: 0; height: 100%; background: #0c1016; color: #e8eef7; font-family: system-ui, sans-serif; }
    #stage { position: relative; height: 100%; display: flex; flex-direction: column; }
    #view { flex: 1; width: 100%; display: block; touch-action: none; }
    #pins { position: absolute; inset: 0 0 168px 0; pointer-events: none; overflow: hidden; z-index: 2; }
    #leaders { position: absolute; inset: 0; pointer-events: none; z-index: 1; }
    .pin { position: absolute; pointer-events: auto; display: flex; align-items: center; gap: 5px;
      transform: translate(-50%, -50%); cursor: pointer; z-index: 3;
      background: rgba(8,12,20,0.88); border: 1px solid rgba(255,255,255,0.22);
      color: #f3f7fd; font-size: 11px; line-height: 1.2; padding: 4px;
      border-radius: 999px; white-space: nowrap;
      box-shadow: 0 4px 14px rgba(0,0,0,0.35); transition: padding 0.15s ease, background 0.15s ease; }
    .pin .pin-text { display: none; max-width: 0; overflow: hidden; opacity: 0; }
    .pin.active, .pin:hover { padding: 6px 10px 6px 7px; background: rgba(29,79,134,0.95); border-color: #8ec5ff; }
    .pin.active .pin-text, .pin:hover .pin-text { display: inline; max-width: 180px; opacity: 1; }
    .pin-text { overflow: hidden; text-overflow: ellipsis; font-weight: 600; }
    .pin-dot { width: 10px; height: 10px; border-radius: 50%; background: #9ec5ff; flex: 0 0 auto;
      box-shadow: 0 0 0 2px rgba(8,12,20,0.9); }
    .pin.active .pin-dot, .pin:hover .pin-dot { background: #fff; box-shadow: 0 0 0 2px #1d4f86; }
    .pin.active { z-index: 4; }
    .pin-inset .pin-dot { background: #fbbf24; }
    .pin-inset.active .pin-dot { background: #fff; }
    #dock { position: absolute; left: 0; right: 0; bottom: 0; z-index: 5; padding: 12px 12px 14px;
      pointer-events: auto; touch-action: manipulation;
      background: linear-gradient(to top, rgba(8,10,14,0.98) 70%, rgba(8,10,14,0.88), transparent); }
    #labels { display: flex; gap: 8px; overflow-x: auto; padding: 2px 0 10px; -webkit-overflow-scrolling: touch; }
    #labels button { border: 1px solid rgba(255,255,255,0.2); background: rgba(255,255,255,0.08);
      color: #e8eef7; border-radius: 999px; padding: 8px 12px; font-size: 13px; white-space: nowrap; cursor: pointer; }
    #labels button.active { background: #2b6cb0; border-color: #8ec5ff; color: #fff; }
    #detail { display: block; font-size: 13px; line-height: 1.45; color: #d7e2f0;
      background: rgba(20,28,40,0.92); border: 1px solid rgba(255,255,255,0.12);
      border-radius: 12px; padding: 10px 12px; max-height: 7.5em; overflow: auto; }
    #detail .detail-kicker { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #8ec5ff; margin-bottom: 2px; }
    #detail strong { color: #fff; display: block; margin-bottom: 4px; font-size: 15px; }
    #detail p { margin: 0; }
    #caption, #status { font-size: 11px; color: #8b98a8; margin-top: 6px; }
    h1 { position: absolute; top: 10px; left: 12px; margin: 0; font-size: 14px; font-weight: 650; text-shadow: 0 1px 8px #000; z-index: 3; pointer-events: none; }
  </style>
</head>
<body>
  <div id="stage">
    <canvas id="view"></canvas>
    <div id="pins"></div>
    <h1>${escapeHtml(anatomy.title)}</h1>
    <div id="dock">
      <div id="labels"></div>
      <div id="detail"></div>
      <div id="status"></div>
      <div id="caption">${escapeHtml(payload.caption)}</div>
    </div>
  </div>
  <script>window.__ANATOMY_SCENE__ = ${sceneJson};</script>
  ${wrapInlineScript(vendor.three)}
  ${wrapInlineScript(vendor.loader)}
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
