'use strict';

(() => {
  const canvas = document.getElementById('space-models');
  const stationSpace = document.getElementById('death-star-space');
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true });
  if (!gl) return;
  gl.enable(gl.BLEND);
  gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

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
      if (model == 4) {
        float relief = albedo.r - texture2D(planetMap, mapUV + vec2(.0014, -.0014)).r;
        albedo = pow(albedo, vec3(.85)) * (1.12 + relief * .9);
      }
      if (model == 0) {
        float clouds = texture2D(cloudMap, vec2(fract(mapUV.x + time * .0011), mapUV.y)).r;
        albedo = mix(albedo, vec3(.91, .95, 1.), smoothstep(.17, .88, clouds) * .85);
      }
      float day = pow(max(0., dot(n, light)), .65);
      float rim = pow(1. - n.z, 3.) * smoothstep(-.28, .60, dot(n, light));
      gl_FragColor = vec4(albedo * (.045 + .95 * day) + atmosphere * rim * .46, 1.);
    }

    void renderBlackHole() {
      vec2 p = rotation(.28) * uv;
      float r = length(p / vec2(1., .24));
      float shadow = length(p);
      float disk = smoothstep(.27, .35, r) * (1. - smoothstep(.63, .94, r));
      float bands = .72 + .18 * sin(r * 119. + time * .8) + .10 * sin(r * 217.);
      vec2 arc = vec2(p.x, (p.y - .23 * sqrt(max(0., 1. - p.x * p.x * 3.))) * 1.7);
      float halo = exp(-abs(length(arc) - .33) * 38.) * smoothstep(-.05, .07, p.y);
      float visibleDisk = shadow < .29 && p.y > 0. ? 0. : disk;
      float rim = exp(-abs(shadow - .29) * 48.) * .42;
      float brightness = visibleDisk * bands * (.67 + .33 * smoothstep(-.6, .5, p.x));
      gl_FragColor = vec4(mix(vec3(.82, .26, .09), vec3(1., .81, .56), brightness + halo * .35),
        clamp(brightness + halo * .55 + rim, 0., 1.));
      if (shadow < .27 && visibleDisk < .01) gl_FragColor = vec4(.003, .002, .006, 1.);
    }

    void renderSaucer() {
      vec2 p = rotation(.24 + sin(time * .3) * .15) * uv;
      vec3 origin = vec3(p, 2.);
      origin.yz = rotation(-.58) * origin.yz;
      vec3 ray = vec3(0., rotation(-.58) * vec2(0., -1.));
      float distance = 0.;
      for (int i = 0; i < 64; i++) {
        vec3 point = origin + ray * distance;
        vec3 hull = vec3(point.x, point.y * 3.6, point.z);
        vec3 canopy = (point - vec3(0., .13, 0.)) * vec3(1., 1.45, 1.);
        float metal = (length(hull) - .85) / 3.6;
        float glass = (length(canopy) - .32) / 1.45;
        if (min(metal, glass) < .002) {
          bool dome = glass < metal;
          vec3 normal = dome ? normalize(canopy * vec3(1., 1.45, 1.)) : normalize(hull * vec3(1., 3.6, 1.));
          float diffuse = .23 + .77 * max(dot(normal, light), 0.);
          float specular = pow(max(dot(normal, normalize(light - ray)), 0.), 24.);
          float angle = atan(point.x, point.z);
          float lamps = step(.83, cos(angle * 15.)) * smoothstep(.69, .81, length(point.xz));
          vec3 color = dome ? vec3(.12, .34, .48) : vec3(.53, .6, .68);
          if (dome && point.z > 0.) {
            float head = 1. - smoothstep(.85, 1., length((point.xy - vec2(0., .25)) / vec2(.126, .146)));
            float eyes = 1. - smoothstep(.65, 1., length((vec2(abs(point.x), point.y) - vec2(.052, .27)) / vec2(.031, .043)));
            color = mix(color, mix(vec3(.49, .77, .43), vec3(.025, .10, .13), eyes), head * .93);
          }
          gl_FragColor = vec4(color * diffuse + specular * .63 + lamps * vec3(.19, .57, .72), 1.);
          return;
        }
        distance += min(metal, glass);
        if (distance > 3.2) break;
      }
      gl_FragColor = vec4(0.);
    }

    float rocketHull(vec3 p) {
      float radius = .111 * (1. - .97 * smoothstep(.29, .69, p.y));
      float body = max(length(p.xz) - radius, abs(p.y - .13) - .56);
      float nozzle = max(abs(length(p.xz) - .104) - .023, abs(p.y + .45) - .068);
      float fins = box(vec3(abs(p.x), p.y, p.z) - vec3(.13, -.34, 0.), vec3(.088, .105, .021));
      return min(min(body, nozzle), fins);
    }

    void renderRocket() {
      vec2 p = rotation(.78) * uv;
      vec3 origin = vec3(p, 1.8);
      vec3 ray = vec3(0., 0., -1.);
      float distance = 0.;
      for (int i = 0; i < 78; i++) {
        vec3 hit = origin + ray * distance;
        float d = rocketHull(hit);
        if (d < .0018) {
          vec2 e = vec2(.003, 0.);
          vec3 n = normalize(vec3(rocketHull(hit + e.xyy) - rocketHull(hit - e.xyy),
            rocketHull(hit + e.yxy) - rocketHull(hit - e.yxy), rocketHull(hit + e.yyx) - rocketHull(hit - e.yyx)));
          float stripe = 1. - smoothstep(.04, .045, abs(hit.y + .19));
          float windowShape = 1. - smoothstep(.045, .055, length((hit.xy - vec2(0., .25)) * vec2(1., .8)));
          vec3 color = mix(vec3(.83, .88, .93), vec3(.72, .18, .085), stripe);
          if (hit.z > .06) color = mix(color, vec3(.085, .31, .49), windowShape);
          if (hit.y < -.43) color *= .45;
          float shine = pow(max(dot(n, normalize(light - ray)), 0.), 22.);
          gl_FragColor = vec4(color * (.33 + .67 * max(dot(n, light), 0.)) + .31 * shine, 1.);
          return;
        }
        distance += d * .75;
        if (distance > 2.3) break;
      }
      float tail = clamp((-p.y - .49) / .5, 0., 1.);
      float width = mix(.105, .015, tail) * (.84 + .16 * sin(time * 24. + tail * 16.));
      float glow = exp(-pow(abs(p.x) / width, 2.)) * (1. - tail);
      gl_FragColor = vec4(mix(vec3(1., .27, .045), vec3(.78, .92, 1.), glow), glow * step(p.y, -.49));
    }

    void renderSun() {
      vec2 p = uv * 1.38;
      float r = length(p);
      if (r < 1.) {
        vec3 n = vec3(p, sqrt(1. - r * r));
        n.xz = rotation(time * .045) * n.xz;
        float cells = terrainNoise(n * 39.) * .65 + terrainNoise(n * 91.) * .35;
        float activity = terrainNoise(n * 7. + vec3(time * .07)) * .29;
        vec3 gas = mix(vec3(.99, .24, .04), vec3(1., .86, .39), clamp(cells + activity, 0., 1.));
        gl_FragColor = vec4(gas * (.66 + .34 * sqrt(1. - r * r)), 1.);
        return;
      }
      float angle = atan(p.y, p.x);
      float streams = sin(angle * 17. + r * 13.) * .15 + sin(angle * 31. - time * .16) * .13;
      float corona = exp(-(r - 1.) * (11. + 15. * streams)) * (.46 + streams);
      gl_FragColor = vec4(1., .49, .16, corona * (1. - smoothstep(1.21, 1.37, r)));
    }

    void renderDeathStar() {
      vec2 plane = uv * 1.06;
      float r = length(plane);
      if (r >= 1.) {
        gl_FragColor = vec4(0.);
        return;
      }
      vec3 n = vec3(plane, sqrt(1. - r * r));
      vec3 surface = n;
      surface.xy = rotation(-.13) * surface.xy;
      surface.xz = rotation(.28 * sin(time * .22)) * surface.xz;
      vec2 grid = vec2(atan(surface.x, surface.z), asin(surface.y)) * vec2(21., 29.);
      grid.x += mod(floor(grid.y), 2.) * .5;
      vec2 tiles = fract(grid);
      float seams = smoothstep(.03, .095, min(tiles.x, tiles.y));
      float plating = terrainHash(vec3(floor(grid), 7.));
      float details = terrainNoise(surface * 115.);
      float trench = 1. - smoothstep(.022, .046, abs(surface.y + .08));
      float window = step(.94, terrainHash(vec3(floor(grid * 5.), 3.))) *
        (1. - smoothstep(.07, .22, length(fract(grid * 5.) - .5)));
      vec3 metal = mix(vec3(.20, .26, .32), vec3(.66, .72, .76), plating * .42 + details * .32);
      metal *= mix(.67, 1., seams) * (1. - trench * .71);

      vec3 dishAxis = normalize(vec3(-.35, .43, .84));
      vec3 inset = surface - dishAxis * dot(surface, dishAxis);
      float dishRadius = length(inset);
      float dish = (1. - smoothstep(.263, .281, dishRadius)) * step(.5, dot(surface, dishAxis));
      float rings = .83 + .17 * cos(dishRadius * 118.);
      vec3 dishNormal = normalize(dishAxis - inset * 3.6);
      float dishLight = max(0., dot(dishNormal, light));
      vec3 bowl = vec3(.23, .32, .39) * rings * (.43 + dishLight);
      bowl += vec3(.54, .63, .70) * smoothstep(.232, .267, dishRadius) * .52;
      bowl += vec3(.70, .80, .85) * (1. - smoothstep(.023, .047, dishRadius));
      float day = max(0., dot(n, light));
      vec3 color = mix(metal * (.20 + .93 * day) + window * vec3(.38, .56, .68), bowl, dish);
      gl_FragColor = vec4(color, 1. - smoothstep(.994, 1., r));
    }

    void main() {
      if (model == 9) renderDeathStar();
      else if (model == 8) renderSun();
      else if (model == 7) renderRocket();
      else if (model == 5) renderBlackHole();
      else if (model == 6) renderSaucer();
      else if (model == 2) renderSatellite();
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
  let approach;

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
      const lowerPage = Math.max(height * .78, document.body.scrollHeight - height * .64);
      const flight = reducedMotion.matches ? .54 : (now / 8500) % 1;
      const distantMoon = [4, width * .93, height * .64, compact ? 32 : 66];
      const closeMoon = [4, width * (compact ? .28 : .37), height * .48, Math.min(width * .91, 880)];
      const distantMars = [1, width * .88, height * .32, compact ? 28 : 58];
      const closeMars = [1, width * (compact ? .92 : .77), height * .41, Math.min(width * .72, 640)];
      const distantRelay = [2, width * .15, height * .26, compact ? 46 : 82];
      const closeRelay = [2, width * (compact ? .83 : .79), height * .33, Math.min(width * .65, 460)];
      const overview = [
        [0, width * (compact ? .94 : .81), height * .32, Math.min(width * .31, 340)],
        [2, width * .61, height * .18, compact ? 56 : 106],
        distantMoon,
        [2, width * .79, height * 1.22, compact ? 74 : 125],
        [4, width * .16, height * 1.86, Math.min(width * .19, 115)],
        [7, width * (.06 + .88 * flight), lowerPage + height * (.27 - .52 * flight), compact ? 85 : 154],
      ];
      const sectors = {
        journal: [
          closeMoon,
          distantMars,
          [6, width * .13, height * .62, compact ? 52 : 97],
          [2, width * .94, height * 1.22, compact ? 52 : 96],
          [6, width * .85, lowerPage, compact ? 120 : 198],
        ],
        radiation: [
          closeMars,
          distantRelay,
          [5, width * .14, height * .77, compact ? 90 : 176],
          [4, width * .92, height * .64, compact ? 30 : 58],
          [2, width * .15, height * 1.28, compact ? 72 : 120],
          [8, width * .94, lowerPage, Math.min(width * .55, 395)],
        ],
        guide: [
          closeRelay,
          [4, width * .92, height * .67, Math.min(width * .19, 155)],
          [0, width * .67, height * .16, compact ? 28 : 60],
          [6, width * .16, height * .74, compact ? 52 : 92],
          [2, width * .20, height * 1.38, compact ? 76 : 110],
          [5, width * .87, lowerPage, Math.min(width * .46, 335)],
        ],
      };
      const sector = document.body.dataset.sector;
      let objects = sectors[sector] || overview;
      if (sector === 'guide' && stationSpace.offsetHeight) {
        const area = stationSpace.getBoundingClientRect();
        objects.push([9, area.left + area.width * .5, area.top + window.scrollY + area.height * .5,
          Math.min(area.width * .76, area.height * .94, 330)]);
      }
      if (approach && !reducedMotion.matches) {
        const progress = Math.min(1, (now - approach.start) / approach.duration);
        const eased = progress * progress * (3 - 2 * progress);
        const paths = {
          journal: [distantMoon, closeMoon],
          radiation: [distantMars, closeMars],
          guide: [distantRelay, closeRelay],
        };
        const [start, end] = paths[approach.destination];
        const surroundings = objects.filter(object => object !== start).map(([model, x, y, size]) => [
          model, x + (x - start[1]) * eased * .45, y + (y - start[2]) * eased * .45, size * (1 - eased * .85),
        ]);
        objects = [...surroundings, start.map((value, i) => value + (end[i] - value) * eased)];
      }
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
  window.addEventListener('sectorchange', () => {
    approach = undefined;
    refresh();
  });
  window.addEventListener('sectorapproach', event => {
    approach = { start: performance.now(), ...event.detail };
    refresh();
  });
  window.addEventListener('cancelsectorapproach', () => {
    approach = undefined;
    refresh();
  });
  window.addEventListener('scroll', () => {
    if (reducedMotion.matches) refresh();
    else last = -Infinity;
  }, { passive: true });
  document.addEventListener('visibilitychange', refresh);
  reducedMotion.addEventListener('change', refresh);
  canvas.addEventListener('webglcontextlost', () => cancelAnimationFrame(frame));
  refresh();
})();

