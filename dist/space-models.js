'use strict';

(() => {
  const canvas = document.getElementById('space-models');
  const flag = document.getElementById('pavlodar-flag');
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
    uniform float rocketAngle;
    uniform sampler2D planetMap;
    uniform sampler2D detailMap;
    const vec3 light = vec3(-.50, .65, .57);

    mat2 rotation(float angle) {
      float c = cos(angle), s = sin(angle);
      return mat2(c, s, -s, c);
    }

    float box(vec3 p, vec3 halfSize) {
      vec3 d = abs(p) - halfSize;
      return length(max(d, 0.)) + min(max(max(d.x, d.y), d.z), 0.);
    }

    float rod(vec3 p, vec3 a, vec3 b, float radius) {
      vec3 axis = b - a;
      return length(p - a - axis * clamp(dot(p - a, axis) / dot(axis, axis), 0., 1.)) - radius;
    }

    vec2 satellite(vec3 p) {
      vec2 surface = vec2(box(p, vec3(.215, .192, .205)) - .022, 1.);
      float rails = box(vec3(abs(p.x), abs(p.y), p.z) - vec3(.21, .185, 0.), vec3(.025, .023, .23));
      if (rails < surface.x) surface = vec2(rails, 3.);
      float radiator = box(p - vec3(0., 0., .224), vec3(.152, .133, .018));
      if (radiator < surface.x) surface = vec2(radiator, 4.);
      float radiatorBolts = length(vec3(abs(p.x), abs(p.y), p.z) - vec3(.13, .109, .245)) - .014;
      if (radiatorBolts < surface.x) surface = vec2(radiatorBolts, 3.);
      vec3 wing = vec3(abs(p.x), p.yz);
      float strut = box(wing - vec3(.31, 0., 0.), vec3(.10, .026, .026));
      if (strut < surface.x) surface = vec2(strut, 1.);
      float hinge = rod(wing, vec3(.385, -.15, 0.), vec3(.385, .15, 0.), .018);
      float panelX = abs(wing.x - .66) - .142;
      float frame = box(vec3(panelX, wing.yz), vec3(.133, .157, .018)) - .004;
      frame = min(frame, hinge);
      if (frame < surface.x) surface = vec2(frame, 3.);
      float panel = box(vec3(panelX, wing.y, abs(wing.z) - .017), vec3(.122, .143, .012));
      if (panel < surface.x) surface = vec2(panel, 2.);
      float mast = box(p - vec3(0., .30, 0.), vec3(.025, .12, .025));
      float antenna = p.y - .42 + .85 * dot(p.xz, p.xz);
      float dish = max(abs(antenna) - .013, length(p.xz) - .19);
      float feed = min(box(p - vec3(0., .46, 0.), vec3(.012, .07, .012)),
                       length(p - vec3(0., .53, 0.)) - .031);
      float equipment = min(mast, dish);
      equipment = min(equipment, rod(p, vec3(-.157, .40, .08), vec3(0., .53, 0.), .009));
      equipment = min(equipment, rod(p, vec3(.157, .40, .08), vec3(0., .53, 0.), .009));
      equipment = min(equipment, rod(p, vec3(0., .39, -.173), vec3(0., .53, 0.), .009));
      float engine = max(abs(length(p.xz) - mix(.055, .088, clamp((-p.y - .21) * 9., 0., 1.))) - .013,
        abs(p.y + .266) - .063);
      if (engine < surface.x) surface = vec2(engine, 5.);
      float cable = min(rod(p, vec3(.14, .18, .237), vec3(.204, .12, .251), .009),
                        rod(p, vec3(.204, .12, .251), vec3(.204, -.14, .24), .009));
      if (cable < surface.x) surface = vec2(cable, 5.);
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
      mat2 yaw = rotation(.30 + sin(time * .28) * .45);
      mat2 pitch = rotation(.32);
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
          float foil = sin(p.y * 120. + sin(p.z * 61. + p.x * 48.) * 2.)
            * sin(p.x * 91. - p.z * 113. + sin(p.y * 87.));
          vec3 color = mix(vec3(.43, .26, .08), vec3(1., .75, .33), .63 + .23 * foil);
          if (hit.y == 2.) {
            vec2 cell = fract(vec2(abs(p.x) - .394, p.y + .143) * vec2(32., 21.));
            float grid = smoothstep(.035, .095, min(cell.x, cell.y));
            float contact = 1. - smoothstep(.015, .055, abs(cell.x - .51));
            vec3 silicon = mix(vec3(.065, .14, .32), vec3(.20, .34, .62), cell.y);
            color = mix(vec3(.47, .53, .61), silicon + contact * .17, grid);
          } else if (hit.y == 3.) {
            color = vec3(.83, .87, .91);
          } else if (hit.y == 4.) {
            color = mix(vec3(.19, .25, .32), vec3(.72, .77, .81), step(.34, fract(p.y * 65.)));
          } else if (hit.y == 5.) {
            color = vec3(.22, .25, .29);
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

    vec3 terrainNormal(vec3 surface, vec2 uv) {
      vec2 slope = (texture2D(detailMap, uv).rg * 255. - 128.) / 127.;
      vec3 east = normalize(vec3(surface.z, 0., -surface.x) + vec3(.00001, 0., 0.));
      return normalize(surface + east * slope.x + cross(east, surface) * slope.y);
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
      mat2 tilt = rotation(.16);
      mat2 spin = rotation(1.55 - time * .045);
      surface.xy = tilt * surface.xy;
      surface.xz = spin * surface.xz;
      vec2 uv = vec2(atan(surface.x, surface.z) / 6.283185 + .5,
                     acos(clamp(surface.y, -1., 1.)) / 3.141593);
      vec3 ground = texture2D(planetMap, uv).rgb;
      ground = mix(ground, vec3(dot(ground, vec3(.30, .59, .11))), .16);
      vec3 localSun = sun;
      localSun.xy = tilt * localSun.xy;
      localSun.xz = spin * localSun.xz;
      float exposure = dot(normal, sun);
      float incidence = max(0., dot(terrainNormal(surface, uv), localSun));
      float day = pow(incidence, .69) * smoothstep(-.06, .09, exposure);
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
        vec3 reliefNormal = terrainNormal(surface, mapUV);
        vec3 sun = normalize(vec3(-.66, .28, .55));
        sun.xy = rotation(-.19) * sun.xy;
        sun.xz = rotation(time * .085) * sun.xz;
        float incidence = max(0., dot(reliefNormal, sun));
        float emission = max(.05, n.z);
        float day = smoothstep(-.07, .08, dot(surface, sun));
        float scatter = incidence / (incidence + emission);
        vec3 lunarColor = pow(albedo, vec3(.83)) * (.025 + day * (.67 * scatter + .57 * incidence));
        gl_FragColor = vec4(lunarColor, 1. - smoothstep(.996, 1., radius));
        return;
      }
      if (model == 0) {
        float clouds = texture2D(detailMap, vec2(fract(mapUV.x + time * .0011), mapUV.y)).r;
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
      vec2 p = rotation(rocketAngle) * uv;
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

    vec2 astronaut(vec3 p) {
      float torso = box(p - vec3(0., .10, 0.), vec3(.17, .22, .105)) - .05;
      float helmet = length(p - vec3(0., .48, .015)) - .183;
      float limbs = rod(p, vec3(-.16,.24,0.), vec3(-.34,.06,.011), .079);
      limbs = min(limbs, rod(p, vec3(-.34,.06,.011), vec3(-.46,.18,.11), .062));
      limbs = min(limbs, rod(p, vec3(.16,.22,0.), vec3(.34,.02,-.04), .080));
      limbs = min(limbs, rod(p, vec3(.34,.02,-.04), vec3(.45,-.06,.10), .065));
      limbs = min(limbs, rod(p, vec3(-.095,-.08,0.), vec3(-.19,-.40,.07), .087));
      limbs = min(limbs, rod(p, vec3(-.19,-.40,.07), vec3(-.26,-.66,.095), .073));
      limbs = min(limbs, rod(p, vec3(.10,-.08,0.), vec3(.24,-.33,.11), .087));
      limbs = min(limbs, rod(p, vec3(.24,-.33,.11), vec3(.22,-.61,.25), .073));
      vec2 hit = vec2(min(min(torso, helmet), limbs), 1.);
      float visor = length((p - vec3(0., .487, .119)) * vec3(1., 1.22, 1.15)) - .153;
      if (visor < hit.x) hit = vec2(visor, 2.);
      float pack = box(p - vec3(0., .12, -.165), vec3(.142,.218,.055)) - .022;
      float controls = box(p - vec3(0., .20, .155), vec3(.089,.064,.022)) - .009;
      float boots = min(box(p - vec3(-.26,-.68,.14), vec3(.074,.051,.106)),
                        box(p - vec3(.22,-.63,.29), vec3(.074,.049,.096))) - .019;
      float hardware = min(min(pack, controls), boots);
      if (hardware < hit.x) hit = vec2(hardware, 3.);
      float hose = rod(p, vec3(-.095,.14,.165), vec3(-.153,-.02,.12), .021);
      hose = min(hose, rod(p, vec3(-.153,-.02,.12), vec3(-.198,-.045,-.12), .018));
      if (hose < hit.x) hit = vec2(hose, 4.);
      return hit;
    }

    void renderAstronaut() {
      mat2 roll = rotation(.32 + sin(time * .21) * .32);
      mat2 yaw = rotation(-.36 + sin(time * .17) * .65);
      vec3 origin = vec3(roll * uv, 2.1);
      vec3 ray = vec3(0., 0., -1.);
      origin.xz = yaw * origin.xz;
      ray.xz = yaw * ray.xz;
      vec3 sun = vec3(roll * light.xy, light.z);
      sun.xz = yaw * sun.xz;
      float distance = 0.;
      for (int i = 0; i < 64; i++) {
        vec3 p = origin + ray * distance;
        vec2 hit = astronaut(p);
        if (hit.x < .0018) {
          vec2 e = vec2(.003, 0.);
          vec3 n = normalize(vec3(astronaut(p+e.xyy).x - astronaut(p-e.xyy).x,
            astronaut(p+e.yxy).x - astronaut(p-e.yxy).x, astronaut(p+e.yyx).x - astronaut(p-e.yyx).x));
          float diffuse = .25 + .75 * max(dot(n, sun), 0.);
          float specular = pow(max(dot(n, normalize(sun-ray)), 0.), 24.);
          float seam = .90 + .10 * smoothstep(-.45, .35, sin(p.y * 79. + sin(p.x * 30.)));
          vec3 color = vec3(.81,.86,.88) * seam;
          if (abs(p.x) > .29 && p.y > -.21 && p.y < -.12) color = vec3(.68,.15,.095);
          if (hit.y == 2.) {
            float rim = pow(1. - max(dot(n,-ray),0.), 2.);
            color = mix(vec3(.21,.13,.08), vec3(.90,.63,.26), rim + .32 * max(n.y,0.));
            specular *= 3.;
          }
          if (hit.y == 3.) {
            color = vec3(.42,.53,.60);
            if (p.z > .16 && p.y > .145) color *= .72 + .28 * step(.61, fract(p.x * 37.));
          }
          if (hit.y == 4.) color = vec3(.27,.34,.39);
          gl_FragColor = vec4(color * diffuse + .22 * specular, 1.);
          return;
        }
        distance += hit.x * .82;
        if (distance > 3.1) break;
      }
      gl_FragColor = vec4(0.);
    }

    void main() {
      if (model == 10) renderAstronaut();
      else if (model == 9) renderDeathStar();
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
  const rocketAngleUniform = gl.getUniformLocation(program, 'rocketAngle');
  const modelUniform = gl.getUniformLocation(program, 'model');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = 0;
  let last = -Infinity;
  let approach;

  function loadPlanetMap(filename, placeholder) {
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
    image.src = './planet-maps/' + filename;
    return texture;
  }

  const earth = loadPlanetMap('earth_daymap.jpg', [27, 74, 125]);
  const clouds = loadPlanetMap('earth_clouds.jpg', [0, 0, 0]);
  const saturn = loadPlanetMap('saturn.jpg', [188, 165, 127]);
  const moon = loadPlanetMap('moon.jpg', [117, 115, 113]);
  const lunarRelief = loadPlanetMap('moon-relief.webp', [128, 128, 0]);
  const mars = loadPlanetMap('mars.jpg', [169, 103, 73]);
  const marsRelief = loadPlanetMap('mars-relief.webp', [128, 128, 0]);
  const maps = { 0: earth, 1: mars, 3: saturn, 4: moon };
  const details = { 0: clouds, 1: marsRelief, 4: lunarRelief };
  gl.uniform1i(gl.getUniformLocation(program, 'planetMap'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'detailMap'), 1);

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
      const leg = reducedMotion.matches ? .54 : (now / 8500) % 2;
      const returning = leg >= 1;
      const flight = returning ? 2 - leg : leg;
      const rocketSize = compact ? 85 : 154;
      const travel = width + 2 * rocketSize;
      const climb = height * .52;
      gl.uniform1f(rocketAngleUniform, Math.atan2(travel, climb) + (returning ? Math.PI : 0));
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
        [7, -rocketSize + travel * flight, lowerPage + height * .27 - climb * flight, rocketSize],
        [10, width * .89, height * .94, compact ? 71 : 144],
      ];
      const sectors = {
        journal: [
          closeMoon,
          distantMars,
          [6, width * .13, height * .62, compact ? 52 : 97],
          [2, width * .94, height * 1.22, compact ? 52 : 96],
          [6, width * .85, lowerPage, compact ? 120 : 198],
          [10, width * .07, height * 1.16, compact ? 65 : 136],
        ],
        radiation: [
          closeMars,
          distantRelay,
          [5, width * .14, height * .77, compact ? 90 : 176],
          [4, width * .92, height * .64, compact ? 30 : 58],
          [2, width * .15, height * 1.28, compact ? 72 : 120],
          [8, width * .94, lowerPage, Math.min(width * .55, 395)],
          [10, width * .79, lowerPage - height * .29, compact ? 65 : 121],
        ],
        guide: [
          closeRelay,
          [4, width * .92, height * .67, Math.min(width * .19, 155)],
          [0, width * .67, height * .16, compact ? 28 : 60],
          [6, width * .16, height * .74, compact ? 52 : 92],
          [2, width * .20, height * 1.38, compact ? 76 : 110],
          [5, width * .87, lowerPage, Math.min(width * .46, 335)],
          [10, width * .13, lowerPage + height * .05, compact ? 65 : 130],
        ],
      };
      const sector = document.body.dataset.sector;
      let objects = sectors[sector] || overview;
      let flagMoon = sector === 'journal' ? closeMoon : null;
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
        const target = start.map((value, i) => value + (end[i] - value) * eased);
        objects = [...surroundings, target];
        if (approach.destination === 'journal') flagMoon = target;
        else if (sector === 'journal') flagMoon = surroundings.find(([model]) => model === 4);
      }
      flag.hidden = !flagMoon || flagMoon[3] < 80;
      if (!flag.hidden) {
        const [, x, y, size] = flagMoon;
        flag.style.left = `${x + size * .397}px`;
        flag.style.top = `${y - window.scrollY - size * .18}px`;
        flag.style.width = `${size * .105}px`;
      }
      for (const [model, baseX, pageY, size] of objects) {
        const drift = model === 10 && !reducedMotion.matches ? now / 1000 : 0;
        const x = baseX + Math.sin(drift * .43) * size * .24;
        const y = pageY - window.scrollY + Math.sin(drift * .34) * size * .18;
        if (x + size / 2 < 0 || x - size / 2 > width) continue;
        if (y + size / 2 < 0 || y - size / 2 > height) continue;
        const side = Math.round(size * scale);
        gl.viewport(Math.round(x * scale - side / 2), Math.round((height - y) * scale - side / 2), side, side);
        gl.uniform1i(modelUniform, model);
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, details[model] || clouds);
        gl.activeTexture(gl.TEXTURE0);
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

