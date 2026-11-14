(() => {
  'use strict';
  const panel = document.createElement('section');
  panel.className = 'body-panel';
  panel.setAttribute('aria-labelledby', 'body-title');
  const outline = 'M150 22 C127 22 120 39 123 61 Q126 77 137 82 L137 96 Q119 98 101 110 Q91 119 85 144 L68 203 L54 256 Q49 268 57 274 Q66 278 72 267 L85 229 L102 181 L112 150 L115 204 Q115 230 105 255 Q103 268 112 291 L121 355 L117 414 Q115 432 106 440 Q102 450 114 451 L134 450 Q142 448 141 436 L142 379 L148 315 L150 289 L152 315 L158 379 L159 436 Q158 448 166 450 L186 451 Q198 450 194 440 Q185 432 183 414 L179 355 L188 291 Q197 268 195 255 Q185 230 185 204 L188 150 L198 181 L215 229 L228 267 Q234 278 243 274 Q251 268 246 256 L232 203 L215 144 Q209 119 199 110 Q181 98 163 96 L163 82 Q174 77 177 61 C180 39 173 22 150 22 Z';
  const muscles = [
    'M141 98 L148 123 L116 143 L103 125 Q115 106 141 98',
    'M159 98 L152 123 L184 143 L197 125 Q185 106 159 98',
    'M112 143 Q128 126 147 130 L146 166 Q124 171 114 153',
    'M188 143 Q172 126 153 130 L154 166 Q176 171 186 153',
    'M114 170 L136 179 L135 226 L115 245 L124 204',
    'M186 170 L164 179 L165 226 L185 245 L176 204',
    'M109 267 L145 247 L143 304 L131 351 Q112 313 109 267',
    'M191 267 L155 247 L157 304 L169 351 Q188 313 191 267',
    'M123 361 L139 355 L134 412 L123 428 Q119 395 123 361',
    'M177 361 L161 355 L166 412 L177 428 Q181 395 177 361',
    'M99 133 L109 149 L87 205 L78 204 Q88 153 99 133',
    'M201 133 L191 149 L213 205 L222 204 Q212 153 201 133',
    'M76 212 L85 215 L66 260 L59 263 Z',
    'M224 212 L215 215 L234 260 L241 263 Z',
  ].map(d => '<path d="' + d + '"/>').join('');
  const abs = [172,190,208].map(y => '<rect x="138" y="' + y + '" width="10" height="15" rx="4"/><rect x="152" y="' + y + '" width="10" height="15" rx="4"/>').join('');
  const ribs = [133,145,157,169,181].map((y,i) => '<path d="M148 ' + y + ' Q' + (110+i*2) + ' ' + (y-15) + ' 118 ' + (y+5) + ' Q130 ' + (y+15) + ' 148 ' + (y+7) + ' M152 ' + y + ' Q' + (190-i*2) + ' ' + (y-15) + ' 182 ' + (y+5) + ' Q170 ' + (y+15) + ' 152 ' + (y+7) + '"/>').join('');
  const zones = [
    ['head', 'Head', 'M100 12 H200 V82 H100Z', 'Review sleep and mood, and record any symptoms such as headaches.', ['sleep', 'mood']],
    ['neck', 'Neck', 'M128 82 H172 L178 101 L150 115 L122 101Z', 'Record neck discomfort or stiffness.'],
    ['chest', 'Chest', 'M122 101 L150 115 L178 101 L188 150 L184 176 H116 L112 150Z', 'Review resting heart rate and blood pressure.', ['pulse', 'bp']],
    ['abdomen', 'Abdomen', 'M116 176 H184 L193 228 H107Z', 'Review glucose readings taken in comparable meal contexts and record any digestive symptoms.', ['glucose']],
    ['pelvis', 'Pelvis', 'M107 228 H193 V264 L150 289 L107 264Z', 'Record discomfort or changes in mobility.'],
  ];
  const limbs = [
    ['upper-arm', 'upper arm', 'M90 96 H122 L112 150 L101 184 L78 177Z'],
    ['forearm', 'forearm', 'M78 177 L101 184 L79 248 L51 242Z'],
    ['hand', 'hand', 'M51 242 L79 248 L79 284 H43Z'],
    ['thigh', 'thigh', 'M102 261 L150 289 L146 346 H115Z'],
    ['lower-leg', 'lower leg', 'M115 346 H146 L144 424 H111Z'],
    ['foot', 'foot', 'M111 424 H144 V458 H97Z'],
  ];
  const regions = zones.map(([id, title, shape]) => region(id, title, shape));
  for (const [id, label, shape] of limbs) {
    for (const side of ['right', 'left']) {
      const name = side + '-' + id;
      const title = side[0].toUpperCase() + side.slice(1) + ' ' + label;
      zones.push([name, title, shape, 'Record any discomfort, stiffness or change in movement in this area.']);
      regions.push(region(name, title, shape, side === 'left' ? 'translate(300 0) scale(-1 1)' : ''));
    }
  }

  function region(id, title, shape, transform = '') {
    return '<path class="body-region" data-zone="' + id + '" d="' + shape + '" transform="' + transform +
      '" role="button" tabindex="0" aria-label="' + title + '" aria-pressed="false"><title>' + title + '</title></path>';
  }

  panel.innerHTML = `
    <div class="body-heading"><h2 id="body-title">Body map</h2><span id="body-preview" class="body-preview" aria-hidden="true"></span></div>
    <div class="body-layout">
      <div class="body-view" id="body-view" aria-label="Interactive body illustration">
        <svg viewBox="0 0 300 480" role="group" aria-label="Interactive anatomical zones">
          <defs><clipPath id="body-outline"><path d="${outline}"/></clipPath><linearGradient id="body-muscle"><stop stop-color="#1a4167"/><stop offset=".5" stop-color="#448aa8"/><stop offset="1" stop-color="#283962"/></linearGradient></defs>
          <g class="body-anatomy" id="body-anatomy">
            <path d="${outline}" fill="#0a293b" stroke="#62d7ed" stroke-width="1.3"/>
            <g class="anatomy-layer" data-anatomy="muscles" fill="url(#body-muscle)" stroke="#69aeca" stroke-width=".8">${muscles}${abs}<ellipse cx="150" cy="53" rx="22" ry="29"/><path d="M142 228 L158 228 L150 252Z"/></g>
            <g class="anatomy-layer bones" data-anatomy="bones"><path d="M132 77 Q122 53 131 37 Q150 22 169 37 Q178 53 168 77 L161 83 L139 83Z" fill="#3a94b6"/><ellipse cx="140" cy="55" rx="6" ry="7" fill="#08283e"/><ellipse cx="160" cy="55" rx="6" ry="7" fill="#08283e"/><path d="M150 86 L150 242 M111 119 Q128 107 150 119 Q172 107 189 119 M106 130 L87 198 M83 209 L63 258 M194 130 L213 198 M217 209 L237 258 M125 280 L132 348 M168 348 L175 280 M130 363 L128 428 M170 363 L172 428" stroke-width="7"/><g stroke-width="3.5">${ribs}</g><g stroke-width="1.3">${Array.from({ length: 19 }, (_, i) => `<rect x="145" y="${88 + i * 8}" width="10" height="6" rx="2"/>`).join('')}</g><path d="M150 242 Q123 222 113 245 L119 271 L137 285 L150 266 L163 285 L181 271 L187 245 Q177 222 150 242Z" stroke-width="5"/><path d="M127 436 L115 444 M173 436 L185 444" stroke-width="8"/></g>
            <g class="body-face" pointer-events="none" stroke-linecap="round" stroke-linejoin="round">
              <defs>
                <linearGradient id="face-tissue" x2=".84" y2=".35">
                  <stop stop-color="#3a8498"/><stop offset=".43" stop-color="#86bfc9"/>
                  <stop offset=".72" stop-color="#4d899f"/><stop offset="1" stop-color="#23475c"/>
                </linearGradient>
              </defs>
              <path d="M128 48 Q122 44 123 55 Q124 62 130 62 M172 48 Q178 44 177 55 Q176 62 170 62" fill="#43859a" stroke="#7ac5d2"/>
              <path d="M150 25 C135 25 128 34 128 46 L130 61 Q132 72 140 78 Q150 84 160 78 Q168 72 170 61 L172 46 C172 34 165 25 150 25Z" fill="url(#face-tissue)" stroke="#96deea"/>
              <path d="M150 27 Q142 33 143 43 M150 27 Q158 33 157 43 M133 46 Q139 41 146 46 M154 46 Q161 41 167 46" fill="none" stroke="#c6f0ee" stroke-width="1.2"/>
              <path d="M131 56 Q141 56 146 64 Q139 63 136 70Z M169 56 Q159 56 154 64 Q161 63 164 70Z" fill="#377187" stroke="#a0d9de" stroke-width=".7"/>
              <path d="M134 51 Q139 47 145 51 Q140 55 134 51Z M155 51 Q161 47 166 51 Q161 55 155 51Z" fill="#d8f1ed" stroke="#214b61" stroke-width="1.2"/>
              <path d="M140 50 v2 M160 50 v2" stroke="#163d52" stroke-width="2.2"/>
              <path d="M148 48 Q148 54 145 59 Q149 62 155 59 L152 50" fill="#77aebc" stroke="#325d73" stroke-width="1"/>
              <path d="M142 68 Q147 64 150 67 Q153 64 158 68 Q151 74 142 68Z" fill="#43738a" stroke="#b8e1e1" stroke-width=".8"/>
              <path d="M144 68 Q150 70 156 68 M145 75 Q150 77 155 75" fill="none" stroke="#294f65" stroke-width="1"/>
              <path d="M132 58 L140 64 M134 63 L141 69 M168 58 L160 64 M166 63 L159 69 M140 78 L145 94 M160 78 L155 94" fill="none" stroke="#8ac5d3" stroke-width=".75"/>
              <g class="face-cutaway">
                <path d="M150 25 C165 25 172 34 172 46 L170 61 Q168 72 160 78 Q155 81 150 81Z" fill="#8fa9af" stroke="#d2e4df" stroke-width=".8"/>
                <path d="M151 28 Q163 26 168 37 Q170 40 169 44 L151 43Z" fill="#b78085" stroke="#ead0bb" stroke-width="1.1"/>
                <path d="M154 30 Q158 29 158 33 T162 35 Q166 36 164 40 M153 35 Q155 33 157 37 T160 41 M161 31 Q164 31 165 35 M153 39 Q154 37 157 41 M166 38 Q169 40 167 43" fill="none" stroke="#704e65" stroke-width=".75"/>
                <path d="M154 48 Q160 45 167 48 L165 55 Q161 60 156 56Z M151 54 Q155 58 156 62 L151 63Z" fill="#233d50" stroke="#cae0dc" stroke-width=".8"/>
                <path d="M153 65 Q160 65 167 60 L163 67 Q159 70 153 70Z" fill="#dae7de" stroke="#587986" stroke-width=".65"/>
                <path d="M156 65 v4 M159 64 l1 4 M163 63 l1 3 M153 67 Q159 67 165 64 M152 75 Q159 76 164 70" fill="none" stroke="#587986" stroke-width=".65"/>
                <path d="M150 26 V80" stroke="#e6bd99" stroke-width=".8"/>
              </g>
            </g>
            <g clip-path="url(#body-outline)">${regions.join('')}</g>
          </g>
        </svg>
      </div>
      <div class="body-details">
        <label class="body-picker">Body area
          <select id="body-zone-picker">${zones.map(([id, title]) => '<option value="' + id + '">' + title + '</option>').join('')}</select>
        </label>
        <div aria-live="polite"><h3 id="body-zone-title"></h3><p id="body-zone-description" class="muted"></p></div>
        <div id="body-zone-actions" class="card-actions"></div>
        <div class="body-zoom"><label for="body-zoom">Zoom</label><div><button id="body-zoom-out" aria-label="Zoom out">−</button><input id="body-zoom" type="range" min="0" max="100" value="0" step="1" aria-label="Anatomy zoom"><button id="body-zoom-in" aria-label="Zoom in">＋</button></div></div>
      </div>
    </div>`;
  document.querySelector('#metrics').closest('section').after(panel);
  const slider = panel.querySelector('#body-zoom');
  const picker = panel.querySelector('#body-zone-picker');
  const regionButtons = [...panel.querySelectorAll('[data-zone]')];

  function selectZone(name) {
    const [, title, , description, readings = []] = zones.find(([id]) => id === name);
    picker.value = name;
    panel.querySelector('#body-zone-title').textContent = title;
    panel.querySelector('#body-zone-description').textContent = description;
    regionButtons.forEach(node => node.setAttribute('aria-pressed', String(node.dataset.zone === name)));
    const actions = panel.querySelector('#body-zone-actions');
    actions.replaceChildren();
    if (!readings.length) {
      const checkin = document.createElement('button');
      checkin.className = 'secondary';
      checkin.textContent = 'Record symptoms';
      checkin.addEventListener('click', () => document.querySelector('[data-checkin]').click());
      actions.append(checkin);
    }
    for (const metric of readings) {
      const trigger = document.createElement('button');
      trigger.className = 'secondary';
      trigger.textContent = metrics[metric].label + ' trend';
      trigger.addEventListener('click', () => showTrend(metric));
      actions.append(trigger);
    }
  }
  function setZoom(value) {
    const zoom = Math.max(0, Math.min(100, value));
    slider.value = zoom;
    panel.querySelector('#body-anatomy').style.transform = 'scale(' + (1 + zoom * .001) + ')';
    panel.querySelector('#body-zoom-out').disabled = zoom === 0;
    panel.querySelector('#body-zoom-in').disabled = zoom === 100;
  }
  picker.addEventListener('change', () => selectZone(picker.value));
  const preview = panel.querySelector('#body-preview');
  for (const region of regionButtons) {
    region.addEventListener('pointerenter', () => {
      region.setAttribute('data-preview', '');
      preview.textContent = region.getAttribute('aria-label');
    });
    region.addEventListener('pointerleave', () => {
      region.removeAttribute('data-preview');
      preview.textContent = '';
    });
    const activate = () => selectZone(region.dataset.zone);
    region.addEventListener('click', activate);
    region.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  }
  slider.addEventListener('input', () => setZoom(Number(slider.value)));
  panel.querySelector('#body-zoom-out').addEventListener('click', () => setZoom(Number(slider.value) - 25));
  panel.querySelector('#body-zoom-in').addEventListener('click', () => setZoom(Number(slider.value) + 25));
  selectZone('chest');
  setZoom(0);
})();
