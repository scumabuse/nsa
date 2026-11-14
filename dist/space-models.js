'use strict';

(() => {
  const canvas = document.getElementById('space-models');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 corner;
    varying vec2 uv;
    void main() {
      uv = corner;
      gl_Position = vec4(corner, 0., 1.);
    }`;

  const fragmentSource = `
    precision mediump float;
    varying vec2 uv;
    uniform float time;
    uniform int model;
    uniform sampler2D planetMap;
    uniform sampler2D cloudMap;
    const vec3 light = vec3(-.50, .65, .57);

    mat2 rotation(float angle) {
      float c = cos(angle), s = sin(angle);
      return mat2(c, s, -s, c);
    }

    float box(vec3 p, vec3 halfSize) {
      vec3 d = abs(p) - halfSize;
      return length(max(d, 0.)) + min(max(max(d.x, d.y), d.z), 0.);
    }

    vec2 satellite(vec3 p) {
      vec2 surface = vec2(box(p, vec3(.215, .192, .205)) - .022, 1.);
      float rails = box(vec3(abs(p.x), abs(p.y), p.z) - vec3(.21, .185, 0.), vec3(.025, .023, .23));
      if (rails < surface.x) surface = vec2(rails, 3.);
      float radiator = box(p - vec3(0., 0., .224), vec3(.152, .133, .018));
      if (radiator < surface.x) surface = vec2(radiator, 4.);
      vec3 wing = vec3(abs(p.x), p.yz);
      float strut = box(wing - vec3(.31, 0., 0.), vec3(.10, .026, .026));
      if (strut < surface.x) surface = vec2(strut, 1.);
      float frame = box(wing - vec3(.66, 0., 0.), vec3(.272, .133, .016));
      if (frame < surface.x) surface = vec2(frame, 3.);
      float panel = box(wing - vec3(.66, 0., .012), vec3(.257, .119, .013));
      if (panel < surface.x) surface = vec2(panel, 2.);
      float mast = box(p - vec3(0., .30, 0.), vec3(.025, .12, .025));
      float antenna = p.y - .42 + .85 * dot(p.xz, p.xz);
      float dish = max(abs(antenna) - .013, length(p.xz) - .19);
      float feed = min(box(p - vec3(0., .46, 0.), vec3(.012, .07, .012)),
                       length(p - vec3(0., .53, 0.)) - .031);
      float equipment = min(mast, dish);
      if (equipment < surface.x) surface = vec2(equipment, 3.);
      if (feed < surface.x) surface = vec2(feed, 4.);
      return surface;
    }

    vec3 satelliteNormal(vec3 p) {
      vec2 e = vec2(.003, 0.);
      return normalize(vec3(
        satellite(p + e.xyy).x - satellite(p - e.xyy).x,
        satellite(p + e.yxy).x - satellite(p - e.yxy).x,
        satellite(p + e.yyx).x - satellite(p - e.yyx).x
      ));
    }

    void renderSatellite() {
      vec3 origin = vec3(uv * 1.03, 2.3);
      vec3 ray = normalize(vec3(uv * .17, -1.));
      mat2 roll = rotation(.48 + sin(time * .31) * .14);
      mat2 yaw = rotation(.45 + time * .29);
      mat2 pitch = rotation(-.36);
      origin.xy = roll * origin.xy; ray.xy = roll * ray.xy;
      origin.xz = yaw * origin.xz; ray.xz = yaw * ray.xz;
      origin.yz = pitch * origin.yz; ray.yz = pitch * ray.yz;

      float distance = 0.;
      for (int iteration = 0; iteration < 58; iteration++) {
        vec3 p = origin + ray * distance;
        vec2 hit = satellite(p);
        if (hit.x < .002) {
          vec3 normal = satelliteNormal(p);
          vec3 sun = vec3(roll * light.xy, light.z);
          sun.xz = yaw * sun.xz;
          sun.yz = pitch * sun.yz;
          float diffuse = .33 + .67 * max(dot(normal, sun), 0.);
          vec3 color = vec3(.85, .59, .25) * (.91 + .09 * sin(p.y * 86. + sin(p.z * 41.) * 1.7));
          if (hit.y == 2.) {
            vec2 cell = fract((vec2(abs(p.x), p.y) - vec2(.403, -.119)) * vec2(23.35, 16.8));
            float grid = step(.07, cell.x) * step(.07, cell.y);
            color = mix(vec3(.54, .64, .76), vec3(.10, .25, .53) + .10 * cell.y, grid);
          } else if (hit.y == 3.) {
            color = vec3(.83, .87, .91);
          } else if (hit.y == 4.) {
            color = mix(vec3(.19, .25, .32), vec3(.72, .77, .81), step(.34, fract(p.y * 65.)));
          }
          float reflection = pow(max(0., dot(normal, normalize(sun - ray))), 24.);
          gl_FragColor = vec4(color * diffuse + .22 * reflection, 1.);
          return;
        }
        distance += hit.x;
        if (distance > 3.5) break;
      }
      gl_FragColor = vec4(0.);
    }

    float terrainHash(vec3 p) {
      p = fract(p * .1031);
      p += dot(p, p.yzx + 19.19);
      return fract((p.x + p.y) * p.z);
    }

    float terrainNoise(vec3 p) {
      vec3 cell = floor(p);
      vec3 f = fract(p);
      f = f * f * (3. - 2. * f);
      return mix(
        mix(mix(terrainHash(cell), terrainHash(cell + vec3(1,0,0)), f.x),
            mix(terrainHash(cell + vec3(0,1,0)), terrainHash(cell + vec3(1,1,0)), f.x), f.y),
        mix(mix(terrainHash(cell + vec3(0,0,1)), terrainHash(cell + vec3(1,0,1)), f.x),
            mix(terrainHash(cell + vec3(0,1,1)), terrainHash(cell + vec3(1,1,1)), f.x), f.y), f.z);
    }

    float crater(vec3 surface, vec3 center, float size) {
      float d = length(surface - center) / size;
      float floorShade = -.27 * (1. - smoothstep(.48, .94, d));
      float rim = smoothstep(.77, .98, d) * (1. - smoothstep(.98, 1.16, d));
      return floorShade + rim * (.12 + .18 * (surface.x - center.x) / size);
    }

    void renderMars(vec2 plane, float radius) {
      vec3 sun = normalize(vec3(.78, .31, .62));
      vec3 haze = vec3(.93, .48, .31);
      if (radius > 1.) {
        float glow = 1. - smoothstep(1., 1.035, radius);
        float crescent = smoothstep(-.48, .54, dot(normalize(plane), sun.xy));
        gl_FragColor = vec4(haze, glow * glow * crescent * .35);
        return;
      }

      vec3 normal = vec3(plane, sqrt(max(0., 1. - dot(plane, plane))));
      vec3 surface = normal;
      surface.xz = rotation(.28 - time * .072) * surface.xz;
      float broad = terrainNoise(surface * 3.8 + vec3(2., 6., 4.));
      float relief = terrainNoise(surface * 11.) * .55 + terrainNoise(surface * 26.) * .30 +
        terrainNoise(surface * 64.) * .15;
      float dust = smoothstep(.33, .68, broad * .72 + relief * .28);
      vec3 ground = mix(vec3(.36, .16, .115), vec3(1., .56, .33), dust);
      ground *= .80 + .36 * relief + .08 * terrainNoise(surface * 112.);
      ground *= 1. + crater(surface, normalize(vec3(.43, -.42, .8)), .14)
        + crater(surface, normalize(vec3(-.27, .24, .97)), .09)
        + crater(surface, normalize(vec3(.55, .44, .65)), .065)
        + crater(surface, normalize(vec3(-.57, -.28, .77)), .055);
      float frost = smoothstep(.90, .995, abs(surface.y) + .055 * relief);
      ground = mix(ground, vec3(.84, .68, .59), frost * .72);
      float exposure = dot(normal, sun);
      float day = pow(max(0., exposure), .66);
      float rim = pow(1. - normal.z, 3.6) * smoothstep(-.28, .65, exposure);
      gl_FragColor = vec4(ground * (.035 + .96 * day) + haze * rim * .30, 1.);
    }

    void renderPlanet() {
      vec2 plane = uv * 1.12;
      if (model == 3) plane *= 1.77;
      float radius = length(plane);
      if (model == 1) {
        renderMars(plane, radius);
        return;
      }
      vec3 atmosphere = model == 0 ? vec3(.25, .55, 1.) : vec3(0.);
      if (model == 3) {
        atmosphere = vec3(.78, .63, .39);
        vec2 ring = rotation(.32) * plane;
        float orbit = length(ring / vec2(1., .31));
        if (orbit > 1.16 && orbit < 1.72 && (radius > 1. || ring.y < 0.)) {
          float dust = .66 + .12 * sin(orbit * 105.) + .08 * sin(orbit * 239.);
          float gap = smoothstep(.012, .027, abs(orbit - 1.53));
          float shadow = 1. - .45 * smoothstep(.03, .24, ring.x) * (1. - smoothstep(.27, .52, abs(ring.y)));
          gl_FragColor = vec4(vec3(.88, .78, .63) * shadow, dust * gap);
          return;
        }
      }
      if (radius > 1.) {
        float glow = max(0., 1. - (radius - 1.) * 19.);
        gl_FragColor = vec4(atmosphere, model == 4 ? 0. : glow * glow * .39);
        return;
      }
      vec3 n = vec3(plane, sqrt(max(0., 1. - dot(plane, plane))));
      vec3 surface = n;
      surface.xy = rotation(model == 3 ? .32 : -.19) * surface.xy;
      surface.xz = rotation(time * .085) * surface.xz;
      vec2 mapUV = vec2(atan(surface.x, surface.z) / 6.283185 + .5,
                        acos(clamp(surface.y, -1., 1.)) / 3.141593);
      vec3 albedo = texture2D(planetMap, mapUV).rgb;
      if (model == 0) {
        float clouds = texture2D(cloudMap, vec2(fract(mapUV.x + time * .0011), mapUV.y)).r;
        albedo = mix(albedo, vec3(.91, .95, 1.), smoothstep(.17, .88, clouds) * .85);
      }
      float day = pow(max(0., dot(n, light)), .65);
      float rim = pow(1. - n.z, 3.) * smoothstep(-.28, .60, dot(n, light));
      gl_FragColor = vec4(albedo * (.045 + .95 * day) + atmosphere * rim * .46, 1.);
    }

    void main() {
      if (model == 2) renderSatellite();
      else renderPlanet();
    }`;

  const program = gl.createProgram();
  for (const [type, source] of [[gl.VERTEX_SHADER, vertexSource], [gl.FRAGMENT_SHADER, fragmentSource]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return;
    gl.attachShader(program, shader);
    gl.deleteShader(shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const corners = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, corners);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const corner = gl.getAttribLocation(program, 'corner');
  gl.enableVertexAttribArray(corner);
  gl.vertexAttribPointer(corner, 2, gl.FLOAT, false, 0, 0);
  const timeUniform = gl.getUniformLocation(program, 'time');
  const modelUniform = gl.getUniformLocation(program, 'model');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let last = -Infinity;

  function loadPlanetMap(name, placeholder) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([...placeholder, 255]));
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const image = new Image();
    image.onload = () => {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      refresh();
    };
    image.src = './planet-maps/' + name + '.jpg';
    return texture;
  }

  const earth = loadPlanetMap('earth_daymap', [27, 74, 125]);
  const clouds = loadPlanetMap('earth_clouds', [0, 0, 0]);
  const saturn = loadPlanetMap('saturn', [188, 165, 127]);
  const moon = loadPlanetMap('moon', [117, 115, 113]);
  const maps = { 0: earth, 3: saturn, 4: moon };
  gl.uniform1i(gl.getUniformLocation(program, 'planetMap'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'cloudMap'), 1);

  function draw(now) {
    if (now - last >= 32 || reducedMotion.matches) {
      last = now;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const scale = Math.min(devicePixelRatio, 1.5);
      const pixelsWide = Math.round(width * scale);
      const pixelsHigh = Math.round(height * scale);
      if (canvas.width !== pixelsWide || canvas.height !== pixelsHigh) {
        canvas.width = pixelsWide;
        canvas.height = pixelsHigh;
      }
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(timeUniform, reducedMotion.matches ? 0 : (now / 1000) % 180);
      const compact = width < 640;
      const overview = [
        [0, width + (compact ? 35 : 12), height * .34, Math.min(width * .55, 435)],
        [1, compact ? 3 : 32, height * .76, Math.min(width * .37, 240)],
        [2, compact ? 41 : Math.max(66, (width - 1300) / 2), height * .23, compact ? 88 : 170],
        [3, width - (compact ? 6 : 38), height * 1.28, Math.min(width * .38, 310)],
        [4, compact ? -20 : 28, height * 1.82, Math.min(width * .25, 130)],
      ];
      const sectors = {
        journal: [
          [3, 12, height * .42, Math.min(width * .50, 430)],
          [2, width - 58, height * .27, compact ? 80 : 150],
          [4, width - 14, height * .91, Math.min(width * .27, 220)],
        ],
        radiation: [
          [1, width - (compact ? 2 : 90), height * .36, Math.min(width * .61, 450)],
          [2, 42, height * .58, compact ? 78 : 135],
          [1, 12, height * 1.15, Math.min(width * .24, 145)],
        ],
        guide: [
          [0, -25, height * .53, Math.min(width * .52, 410)],
          [3, width - 35, height * .25, Math.min(width * .33, 270)],
          [2, width - 44, height * 1.03, compact ? 70 : 130],
        ],
      };
      const objects = sectors[document.body.dataset.sector] || overview;
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, clouds);
      gl.activeTexture(gl.TEXTURE0);
      for (const [model, x, pageY, size] of objects) {
        const y = pageY - window.scrollY;
        if (y + size / 2 < 0 || y - size / 2 > height) continue;
        const side = Math.round(size * scale);
        gl.viewport(Math.round(x * scale - side / 2), Math.round((height - y) * scale - side / 2), side, side);
        gl.uniform1i(modelUniform, model);
        gl.bindTexture(gl.TEXTURE_2D, maps[model] || earth);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }
    }
    if (!reducedMotion.matches && !document.hidden) frame = requestAnimationFrame(draw);
  }

  function refresh() {
    cancelAnimationFrame(frame);
    last = -Infinity;
    if (!document.hidden) draw(performance.now());
  }
  window.addEventListener('resize', refresh);
  window.addEventListener('sectorchange', refresh);
  window.addEventListener('scroll', () => {
    if (reducedMotion.matches) refresh();
    else last = -Infinity;
  }, { passive: true });
  document.addEventListener('visibilitychange', refresh);
  reducedMotion.addEventListener('change', refresh);
  canvas.addEventListener('webglcontextlost', () => cancelAnimationFrame(frame));
  refresh();
})();

