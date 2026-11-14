import * as T from './vendor/three.module.min.js';
import { SVGLoader } from './vendor/SVGLoader.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { DRACOLoader } from './vendor/DRACOLoader.js';

export function createAnatomyViewer(host, svg, select, preview, registerBone) {
  const renderer = new T.WebGLRenderer({ alpha: true, antialias: true });
  const camera = new T.PerspectiveCamera(34, 1, .1, 50);
  const scene = new T.Scene();
  const model = new T.Group();
  const loader = new SVGLoader();
  const layers = new Map();
  const detailed = new Map();
  const decoder = new DRACOLoader().setDecoderPath(new URL('./vendor/draco/gltf/', import.meta.url).href);
  const gltf = new GLTFLoader().setDRACOLoader(decoder);
  const ray = new T.Raycaster();
  const pointer = new T.Vector2();
  let current, selected, hovered, drag;
  let yaw = -.28, pitch = 0, zoom = 0;
  scene.add(model, new T.HemisphereLight(0xcceaff, 0x555271, 2));
  const key = new T.DirectionalLight(0xffe3dd, 2.6);
  key.position.set(-3, 5, 6);
  const rim = new T.DirectionalLight(0x68c8f5, 2);
  rim.position.set(4, 2, -4);
  scene.add(key, rim);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.domElement.className = 'anatomy-canvas';
  renderer.domElement.tabIndex = 0;
  renderer.domElement.setAttribute('aria-label', 'Rotate anatomy model');
  host.append(renderer.domElement);

  function mesh(parent, node, color, depth, z, options = {}) {
    const transform = node.getAttribute('transform') || '';
    const geometry = loader.parse('<svg xmlns="http://www.w3.org/2000/svg"><path transform="' +
      transform + '" d="' + node.getAttribute('d') + '"/></svg>');
    for (const path of geometry.paths) {
      const shapes = SVGLoader.createShapes(path);
      if (!shapes.length) continue;
      const surface = new T.ExtrudeGeometry(shapes, {
        depth, curveSegments: 9, bevelSize: Math.min(2.8, depth * .16),
        bevelThickness: Math.min(3.5, depth * .24), bevelSegments: 3,
      });
      surface.translate(-150, -240, z - depth / 2);
      surface.scale(.01, -.01, .01);
      surface.computeVertexNormals();
      const material = new T.MeshStandardMaterial({ color, roughness: .77, side: T.DoubleSide, ...options });
      const part = new T.Mesh(surface, material);
      part.userData = { zone: node.dataset.zone, label: node.getAttribute('aria-label'), color };
      parent.add(part);
    }
  }

  const shell = svg.querySelector('#body-outline path');
  function build(view) {
    if (detailed.has(view)) return detailed.get(view);
    const group = new T.Group();
    const source = svg.querySelector('[data-body-view="' + view + '"]');
    const context = view === 'overview' || view === 'organs' || view === 'bones' || view === 'nerves';
    if (context) mesh(group, shell, 0x38566d, 37, 0, { transparent: true, opacity: .17, depthWrite: false });
    if (view === 'overview') {
      for (const node of source.querySelectorAll('[data-anatomy="muscles"] path')) {
        mesh(group, node, 0x744759, 15, 1);
      }
    }
    for (const node of source.querySelectorAll('.anatomy-structure, .anatomy-palm')) {
      const id = node.dataset.zone || '';
      const isBone = id.startsWith('bone-');
      const isNerve = /sciatic|tibial|fibular/.test(id) && !isBone;
      const isDigit = /finger|toe|palm/.test(id) || !id;
      const color = isBone ? 0xa5c4cf : isNerve ? 0xc7a569 : isDigit ? 0x976a80 :
        id === 'heart' ? 0xbd4865 : /lung|brain/.test(id) ? 0xa37287 : 0x98596f;
      if (view === 'overview' && isBone && id === 'bone-skull') continue;
      const depth = isBone ? 12 : isNerve ? 4 : isDigit ? 11 : 22;
      mesh(group, node, color, depth, isNerve ? 21 : isBone ? -3 : 12);
    }
    layers.set(view, group);
    return group;
  }

  function draw() {
    const { clientWidth: width, clientHeight: height } = host;
    if (!width || !height) return;
    if (renderer.domElement.clientWidth !== width || renderer.domElement.clientHeight !== height ||
        camera.aspect !== width / height) renderer.setSize(width, height, false);
    camera.aspect = width / height;
    const fit = Math.max(1, .73 / camera.aspect);
    camera.position.z = (current === 'feet' ? 5.3 : current === 'hands' ? 6.15 : 8.25) * fit / (1 + zoom * .012);
    camera.updateProjectionMatrix();
    model.rotation.set(pitch, yaw, 0);
    renderer.render(scene, camera);
  }

  function highlight() {
    for (const mesh of model.children[0]?.children || []) {
      const { zone, color } = mesh.userData;
      if (mesh.userData.skin) {
        const colors = mesh.geometry.attributes.color;
        for (let i = 0; i < colors.count; i++) {
          const region = mesh.userData.regions[i];
          if (region === hovered || region === selected) colors.setXYZ(i, 1.15, .16, .19);
          else colors.setXYZ(i, 1, 1, 1);
        }
        colors.needsUpdate = true;
      }
      mesh.material.color.setHex(zone && zone === hovered ? 0xff566e : color);
      mesh.material.emissive.setHex(zone && zone === selected ? 0x5d182a : 0);
    }
    draw();
  }

  const assetNames = { overview: 'anatomy-skin', organs: 'anatomy-organs', bones: 'overview-skeleton' };
  const pending = new Map();
  const organIds = {
    FMA7204: 'right-kidney', FMA7205: 'left-kidney',
    FMA7333: 'right-lung', FMA7337: 'right-lung', FMA7383: 'right-lung',
    FMA7370: 'left-lung', FMA7371: 'left-lung', FMA7206: 'small-intestine',
    FMA7207: 'large-intestine', FMA7208: 'large-intestine',
  };
  function load(view) {
    if (!assetNames[view] || pending.has(view)) return;
    pending.set(view, gltf.loadAsync(new URL('./anatomy/' + assetNames[view] + '.glb', import.meta.url).href)
      .then(({ scene: source, parser }) => {
        source.updateMatrixWorld(true);
        const group = new T.Group();
        source.traverse(node => {
          if (!node.isMesh) return;
          const index = parser.associations.get(node)?.nodes;
          const name = parser.json.nodes[index]?.name || node.name;
          const [organ, fma] = name.split('__');
          const zone = view === 'organs' ? organIds[fma] || organ :
            view === 'bones' ? registerBone(name) : undefined;
          const color = view === 'overview' ? 0xb58b78 : view === 'bones' ? 0xcec9b9 :
            ({ heart: 0xa84151, lungs: 0xb7818a, liver: 0x783c43, stomach: 0xb38182,
              brain: 0xc6a2a3, kidneys: 0x99546a, intestines: 0xaa7577 })[organ] || 0xa97985;
          const part = new T.Mesh(node.geometry.clone().applyMatrix4(node.matrixWorld),
            new T.MeshStandardMaterial({ color, roughness: .78, side: T.DoubleSide,
              vertexColors: view === 'overview' }));
          part.userData = { zone, label: view === 'organs' ? zone.replaceAll('-', ' ') : name, color };
          group.add(part);
          if (view === 'bones' && /\.r\.?$/i.test(name)) {
            const opposite = part.clone();
            opposite.material = part.material.clone();
            const leftName = name.replace(/\.r\.?$/i, '.l');
            opposite.userData = { ...part.userData, zone: registerBone(leftName), label: leftName };
            opposite.scale.x = -1;
            group.add(opposite);
          }
        });
        const bounds = new T.Box3().setFromObject(group);
        const center = view === 'bones' ? bounds.getCenter(new T.Vector3()) : new T.Vector3(0, -.1758, .39);
        const scale = 4.3 / (view === 'bones' ? bounds.max.y - bounds.min.y : 6.718155);
        for (const part of group.children) {
          if (part.geometry.userData.normalized) continue;
          part.geometry.translate(-center.x, -center.y, -center.z).scale(scale, scale, scale);
          part.geometry.userData.normalized = true;
          if (view === 'overview') {
            part.userData.skin = true;
            const position = part.geometry.attributes.position;
            part.material.onBeforeCompile = shader => {
              shader.vertexShader = 'varying vec3 bodyPosition;\n' + shader.vertexShader.replace(
                '#include <begin_vertex>', '#include <begin_vertex>\nbodyPosition = position;');
              shader.fragmentShader = 'varying vec3 bodyPosition;\n' + shader.fragmentShader.replace(
                '#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
                if (bodyPosition.y < .035 && bodyPosition.y > -.69 && abs(bodyPosition.x) < .54) discard;`);
            };
            part.userData.regions = Array.from({ length: position.count }, (_, i) =>
              bodyZone(position.getX(i), position.getY(i)));
            part.geometry.setAttribute('color', new T.BufferAttribute(new Float32Array(position.count * 3), 3));
          }
        }
        if (view === 'overview') {
          addShorts(group);
        }
        detailed.set(view, group);
        host.dataset.detailedAnatomy = view;
        if (current === view) { model.clear(); model.add(group); highlight(); }
      }).catch(error => console.warn('Detailed anatomy unavailable:', error.message)));
  }

  function addShorts(group) {
    const fabric = 0x203955;
    function seam(profile, x, depth, color, zone) {
      const geometry = new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(r, y)), 48);
      geometry.scale(1, 1, depth);
      const mesh = new T.Mesh(geometry, new T.MeshStandardMaterial({ color, roughness: .92, side: T.DoubleSide }));
      mesh.position.x = x;
      mesh.userData = { color, zone };
      group.add(mesh);
    }
    seam([[0,.059],[.37,.059],[.405,.017],[.458,-.18],[.447,-.35],[.35,-.46],[0,-.46]], 0, .79, fabric, 'pelvis');
    seam([[.367,.068],[.379,.052],[.394,.013]], 0, .81, 0x2d4968, 'pelvis');
    for (const side of [-1, 1]) {
      const zone = side < 0 ? 'right-thigh' : 'left-thigh';
      seam([[0,-.245],[.239,-.245],[.243,-.41],[.212,-.60],[.201,-.703],[.180,-.69]],
        side * .226, 1.30, fabric, zone);
      seam([[.202,-.679],[.204,-.697],[.198,-.707]], side * .226, 1.31, 0x2d4968, zone);
    }
  }

  function bodyZone(px, py) {
      const side = px < 0 ? 'right' : 'left';
      const x = Math.abs(px);
      const y = py;
      let zone;
      if (y > 1.57) zone = 'head';
      else if (y > 1.42 && x < .22) zone = 'neck';
      else if (x > .45 && y > -.83) zone = side + (y < -.24 ? '-hand' : y < .35 ? '-forearm' : '-upper-arm');
      else if (y > .53) zone = 'chest';
      else if (y > .02) zone = 'abdomen';
      else if (y > -.45) zone = 'pelvis';
      else zone = side + (y > -1.17 ? '-thigh' : y > -1.94 ? '-lower-leg' : '-foot');
    return zone;
  }

  function pick(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1,
      1 - (event.clientY - bounds.top) / bounds.height * 2);
    ray.setFromCamera(pointer, camera);
    const hits = ray.intersectObject(model, true);
    if (current === 'overview' && detailed.has(current) && hits.length) {
      const point = model.worldToLocal(hits[0].point.clone());
      const zone = hits[0].object.userData.zone || bodyZone(point.x, point.y);
      return { zone, label: svg.querySelector('[data-zone="' + zone + '"]')?.getAttribute('aria-label') };
    }
    return hits.find(hit => hit.object.userData.zone)?.object.userData;
  }

  const canvas = renderer.domElement;
  canvas.addEventListener('pointerdown', event => {
    if (drag || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch };
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (drag?.id === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.moved ||= Math.hypot(dx, dy) > 4;
      if (drag.moved) {
        yaw = drag.yaw + dx * .012;
        pitch = T.MathUtils.clamp(drag.pitch + dy * .009, -1.35, 1.35);
        draw();
      }
      return;
    }
    const hit = pick(event);
    if (hovered === hit?.zone) return;
    hovered = hit?.zone;
    preview(hit?.label || '');
    highlight();
  });
  canvas.addEventListener('pointerup', event => {
    if (drag?.id !== event.pointerId) return;
    if (!drag.moved) {
      const hit = pick(event);
      if (hit) select(hit.zone);
    }
    drag = null;
  });
  canvas.addEventListener('lostpointercapture', () => { drag = null; });
  canvas.addEventListener('pointerleave', () => { hovered = null; preview(''); highlight(); });
  canvas.addEventListener('keydown', event => {
    const turns = { ArrowLeft: -.15, ArrowRight: .15, ArrowUp: -.12, ArrowDown: .12 };
    if (!(event.key in turns)) return;
    event.preventDefault();
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') pitch = T.MathUtils.clamp(pitch + turns[event.key], -1.35, 1.35);
    else yaw += turns[event.key];
    draw();
  });
  new ResizeObserver(draw).observe(host);
  return {
    view(view) {
      if (current === view) return;
      current = view;
      hovered = null;
      model.clear();
      const group = layers.get(view) || build(view);
      model.add(detailed.get(view) || group);
      if (!detailed.has(view)) {
        const center = new T.Box3().setFromObject(group).getCenter(new T.Vector3());
        group.position.sub(center);
      }
      load(view);
      highlight();
    },
    select(zone) { selected = zone; highlight(); },
    zoom(value) { zoom = value; draw(); },
  };
}
