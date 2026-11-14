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
  panel.innerHTML = `
    <div class="body-heading"><div><p class="eyebrow">Explore your health</p><h2 id="body-title">Body map</h2></div><span id="body-layer-label" class="status">Skin</span></div>
    <div class="body-layout">
      <div class="body-view" id="body-view" aria-label="Interactive body illustration">
        <svg viewBox="0 0 300 480" role="img" aria-label="Human body with skin, muscle and bone layers">
          <defs><linearGradient id="body-skin" x1="0" x2="1"><stop stop-color="#618da9"/><stop offset=".48" stop-color="#b6d4dc"/><stop offset="1" stop-color="#527c98"/></linearGradient><linearGradient id="body-muscle" x1="0" x2="1"><stop stop-color="#80536a"/><stop offset=".5" stop-color="#e6a499"/><stop offset="1" stop-color="#9e6476"/></linearGradient></defs>
          <g class="body-anatomy" id="body-anatomy">
            <path d="${outline}" fill="#172d40" stroke="#6e96a8" stroke-width="1.3"/>
            <g class="anatomy-layer" data-anatomy="skin"><path d="${outline}" fill="url(#body-skin)" stroke="#bfd9e5"/><path d="M150 102 L150 230 M117 144 Q132 152 146 147 M154 147 Q168 152 183 144 M126 252 Q150 266 174 252 M134 57 Q140 60 145 57 M155 57 Q160 60 166 57 M144 71 Q150 74 156 71" fill="none" stroke="#406880" stroke-width="1.5" opacity=".55"/></g>
            <g class="anatomy-layer" data-anatomy="muscles" style="opacity:0" fill="url(#body-muscle)" stroke="#f0bcb1" stroke-width=".8">${muscles}${abs}<ellipse cx="150" cy="53" rx="22" ry="29"/><path d="M142 228 L158 228 L150 252Z"/></g>
            <g class="anatomy-layer bones" data-anatomy="bones" style="opacity:0"><path d="M132 77 Q122 53 131 37 Q150 22 169 37 Q178 53 168 77 L161 83 L139 83Z" fill="#d2dce1"/><ellipse cx="140" cy="55" rx="6" ry="7" fill="#294256"/><ellipse cx="160" cy="55" rx="6" ry="7" fill="#294256"/><path d="M150 86 L150 242 M111 119 Q128 107 150 119 Q172 107 189 119 M106 130 L87 198 M83 209 L63 258 M194 130 L213 198 M217 209 L237 258 M125 280 L132 348 M168 348 L175 280 M130 363 L128 428 M170 363 L172 428" stroke-width="7"/><g stroke-width="3.5">${ribs}</g><path d="M150 242 Q123 222 113 245 L119 271 L137 285 L150 266 L163 285 L181 271 L187 245 Q177 222 150 242Z" stroke-width="5"/><path d="M127 436 L115 444 M173 436 L185 444" stroke-width="8"/></g>
          </g>
        </svg>
        <button class="body-hotspot body-head" data-zone="recovery" aria-label="Sleep and mood">＋</button>
        <button class="body-hotspot body-heart" data-zone="heart" aria-label="Heart and circulation">＋</button>
        <button class="body-hotspot body-leg" data-zone="movement" aria-label="Muscles and bones">＋</button>
      </div>
      <div class="body-details">
        <div class="body-zones" role="group" aria-label="Body systems"><button data-zone="heart">Heart & circulation</button><button data-zone="movement">Muscles & bones</button><button data-zone="recovery">Sleep & mood</button></div>
        <h3 id="body-zone-title"></h3><p id="body-zone-description" class="muted"></p>
        <div id="body-zone-actions" class="card-actions"></div>
        <div class="body-zoom"><label for="body-zoom">Explore anatomy</label><div><button id="body-zoom-out" aria-label="Zoom out">−</button><input id="body-zoom" type="range" min="0" max="100" value="0" step="1" aria-label="Anatomy zoom"><button id="body-zoom-in" aria-label="Zoom in">＋</button></div><div class="body-layer-buttons"><button data-layer="0">Skin</button><button data-layer="50">Muscles</button><button data-layer="100">Bones</button></div><p class="hint">Zoom into the body to reveal the next layer.</p></div>
      </div>
    </div>`;
  document.querySelector('#overview .hero').after(panel);
  const slider = panel.querySelector('#body-zoom');
  const systems = {
    heart: { title: 'Heart & circulation', description: 'Review resting heart rate and blood pressure. Compare measurements taken in similar conditions and note recent activity.', metrics: ['pulse', 'bp'] },
    movement: { title: 'Muscles & bones', description: 'Record discomfort, stiffness or recent exercise during your check-in. Muscle strength and bone density need dedicated tests under the mission protocol.', metrics: [] },
    recovery: { title: 'Sleep & mood', description: 'Review sleep duration and daily mood together. Note interrupted sleep, schedule changes and how you feel.', metrics: ['sleep', 'mood'] },
  };
  function selectZone(name) {
    const system = systems[name];
    panel.querySelector('#body-zone-title').textContent = system.title;
    panel.querySelector('#body-zone-description').textContent = system.description;
    panel.querySelectorAll('[data-zone]').forEach(node => node.setAttribute('aria-pressed', String(node.dataset.zone === name)));
    const actions = panel.querySelector('#body-zone-actions');
    actions.replaceChildren();
    if (name === 'movement') {
      const checkin = document.createElement('button');
      checkin.className = 'secondary';
      checkin.textContent = 'Record symptoms';
      checkin.addEventListener('click', () => document.querySelector('[data-checkin]').click());
      actions.append(checkin);
    }
    for (const metric of system.metrics) {
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
    const skin = Math.max(0, 1 - zoom / 50);
    const bones = Math.max(0, (zoom - 50) / 50);
    const muscle = 1 - skin - bones;
    panel.querySelector('[data-anatomy="skin"]').style.opacity = skin;
    panel.querySelector('[data-anatomy="muscles"]').style.opacity = muscle;
    panel.querySelector('[data-anatomy="bones"]').style.opacity = bones;
    panel.querySelector('#body-layer-label').textContent = zoom < 25 ? 'Skin' : zoom < 75 ? 'Muscles' : 'Bones';
    panel.querySelector('#body-anatomy').style.transform = 'scale(' + (1 + zoom * .001) + ')';
    panel.querySelectorAll('[data-layer]').forEach(node => node.setAttribute('aria-pressed', String(Number(node.dataset.layer) === (zoom < 25 ? 0 : zoom < 75 ? 50 : 100))));
    panel.querySelector('#body-zoom-out').disabled = zoom === 0;
    panel.querySelector('#body-zoom-in').disabled = zoom === 100;
  }
  panel.querySelectorAll('[data-zone]').forEach(node => node.addEventListener('click', () => selectZone(node.dataset.zone)));
  panel.querySelectorAll('[data-layer]').forEach(node => node.addEventListener('click', () => setZoom(Number(node.dataset.layer))));
  slider.addEventListener('input', () => setZoom(Number(slider.value)));
  panel.querySelector('#body-zoom-out').addEventListener('click', () => setZoom(Number(slider.value) - 25));
  panel.querySelector('#body-zoom-in').addEventListener('click', () => setZoom(Number(slider.value) + 25));
  panel.querySelector('#body-view').addEventListener('wheel', event => {
    event.preventDefault();
    setZoom(Number(slider.value) - Math.sign(event.deltaY) * 8);
  }, { passive: false });
  selectZone('heart');
  setZoom(0);
})();
