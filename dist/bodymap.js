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

  const details = { organs: [], bones: [], hands: [], feet: [], nerves: [] };
  function structure(layer, id, title, path, description, readings = [], transform = '') {
    zones.push([id, title, path, description, readings]);
    details[layer].push('<path class="anatomy-structure" data-zone="' + id + '" d="' + path +
      '" transform="' + transform + '" role="button" tabindex="0" aria-label="' + title +
      '" aria-pressed="false"><title>' + title + '</title></path>');
  }

  const organs = [
    ['brain', 'Brain', 'M131 44 Q128 30 142 27 Q151 23 160 29 Q171 34 168 46 Q168 53 158 55 L154 59 L147 53 Q132 55 131 44Z', 'Coordinates movement, sensation and other nervous system functions.'],
    ['trachea', 'Trachea', 'M146 83 H154 L154 118 L162 127 L158 132 L150 124 L142 132 L138 127 L146 118Z', 'Carries air toward the lungs.'],
    ['right-lung', 'Right lung', 'M143 116 Q132 114 124 129 Q115 145 119 171 Q128 179 142 167 L145 142Z', 'Exchanges oxygen and carbon dioxide.'],
    ['left-lung', 'Left lung', 'M157 116 Q168 114 176 129 Q186 149 181 173 Q171 179 162 168 L164 151 L155 143Z', 'Exchanges oxygen and carbon dioxide.'],
    ['heart', 'Heart', 'M151 145 C144 139 139 148 145 158 Q148 169 158 175 Q169 160 164 150 Q160 140 151 145Z', 'Pumps blood through the body.', ['pulse', 'bp']],
    ['liver', 'Liver', 'M119 178 Q136 172 155 181 Q151 192 137 199 L119 197Z', 'Processes nutrients and produces bile.'],
    ['stomach', 'Stomach', 'M161 176 Q158 191 172 188 Q181 188 180 199 Q176 214 161 216 Q150 215 153 207 Q163 195 157 185Z', 'Mixes food and starts its chemical breakdown.'],
    ['right-kidney', 'Right kidney', 'M125 200 C114 195 111 217 120 224 C130 224 137 205 125 200Z', 'Filters blood and helps regulate fluid balance.'],
    ['left-kidney', 'Left kidney', 'M177 203 C186 202 191 218 184 225 C173 227 168 209 177 203Z', 'Filters blood and helps regulate fluid balance.'],
    ['small-intestine', 'Small intestine', 'M135 219 Q149 214 167 220 L170 239 Q158 252 135 242Z', 'Absorbs most nutrients from digested food.'],
    ['large-intestine', 'Large intestine', 'M127 235 L126 218 Q125 211 136 210 Q149 208 168 213 Q179 214 179 223 L177 238 Q176 247 164 250 L162 245 Q171 240 171 235 L172 224 Q172 220 165 219 L135 217 Q131 218 133 236Z', 'Absorbs water and moves waste toward the rectum.'],
    ['bladder', 'Bladder', 'M142 253 Q150 248 158 253 Q164 260 154 271 H146 Q136 260 142 253Z', 'Stores urine.'],
  ];
  for (const entry of organs) structure('organs', ...entry);

  const skeleton = [
    ['skull', 'Skull', 'M150 25 C126 25 125 44 129 60 L135 77 Q150 85 165 77 L171 60 C175 44 174 25 150 25Z'],
    ['spine', 'Spine', 'M146 83 H154 L155 236 Q150 248 145 236Z'],
    ['sternum', 'Sternum', 'M147 111 H153 L155 171 L150 179 L145 171Z'],
    ['pelvic-bone', 'Pelvis', 'M116 231 Q137 223 150 244 Q163 223 184 231 L180 252 L166 273 L150 262 L134 273 L120 252Z'],
  ];
  for (const [id, title, path] of skeleton) structure('bones', 'bone-' + id, title, path, 'Part of the skeletal system.');
  const pairedBones = [
    ['clavicle', 'clavicle', 'M145 115 Q125 103 104 116 L106 121 Q127 112 144 121Z'],
    ['humerus', 'humerus', 'M103 125 Q110 125 108 135 L91 191 Q86 199 81 193 L96 132Z'],
    ['radius', 'radius', 'M82 200 L86 202 L68 253 L63 251Z'],
    ['ulna', 'ulna', 'M88 204 L93 207 L74 252 L70 255Z'],
    ['femur', 'femur', 'M121 269 Q132 265 136 279 L138 338 Q142 349 132 350 L126 344 L122 288Z'],
    ['patella', 'kneecap', 'M126 350 Q132 345 138 351 L137 360 L131 364 L125 358Z'],
    ['tibia', 'tibia', 'M129 365 L138 365 L133 424 L126 427Z'],
    ['fibula', 'fibula', 'M121 366 L126 365 L124 424 L119 423Z'],
  ];
  for (let index = 0; index < 12; index++) {
    const y = 121 + index * 4.8;
    const x = 122 + Math.abs(index - 5) * 1.15;
    pairedBones.push(['rib-' + (index + 1), 'rib ' + (index + 1),
      `M146 ${y} Q${x - 7} ${y - 8} ${x} ${y + 2} Q${x + 8} ${y + 10} 146 ${y + 7} L146 ${y + 9} Q${x + 4} ${y + 12} ${x - 2} ${y + 3} Q${x - 10} ${y - 10} 146 ${y - 2}Z`]);
  }

  const fingers = ['Thumb', 'Index finger', 'Middle finger', 'Ring finger', 'Little finger'];
  const fullBodyHands = [];
  const fullBodyFeet = [];
  const fingerShapes = [
    'M42 165 Q33 166 28 154 L12 130 Q8 122 15 118 Q21 115 27 123 L48 144Z',
    'M43 139 L39 76 Q39 65 46 65 Q53 65 54 75 L58 137Z',
    'M59 137 L58 62 Q58 51 65 51 Q72 51 73 62 L74 137Z',
    'M75 137 L77 73 Q78 64 85 65 Q92 66 91 76 L90 140Z',
    'M91 140 L96 93 Q97 85 103 86 Q110 87 109 96 L105 151Z',
  ];
  for (const side of ['right', 'left']) {
    const label = side === 'right' ? 'Right ' : 'Left ';
    const mirror = side === 'left' ? 'translate(300 0) scale(-1 1)' : '';
    const footView = side === 'right' ? 'translate(35 135)' : 'translate(265 135) scale(-1 1)';
    const bodyFoot = side === 'right' ? 'translate(101 421) scale(.43 .34)' : 'translate(199 421) scale(-.43 .34)';
    const footOutline = 'M32 2 Q50 -3 61 11 Q67 37 72 56 Q69 74 52 78 L15 75 Q7 67 15 49Z';
    details.feet.push('<path class="anatomy-palm" transform="' + footView + '" d="' + footOutline + '"/>');
    fullBodyFeet.push('<path class="anatomy-palm" transform="' + bodyFoot + '" d="' + footOutline + '"/>');
    const toes = [[65, 70, 8, 25], [49, 75, 6, 22], [36, 75, 5.5, 18], [24, 73, 5.2, 15], [13, 69, 4.8, 13]];
    toes.forEach(([x, y, radius, length], index) => {
      const id = side + '-toe-' + index;
      const title = label + (index === 0 ? 'big toe' : 'toe ' + (index + 1));
      const path = `M${x - radius} ${y} a${radius} ${length / 2} 0 0 1 ${radius * 2} 0 v4 a${radius} ${length / 2} 0 0 1 ${-radius * 2} 0Z`;
      structure('feet', id, title, path, 'Record any discomfort or change in sensation or movement.', [], footView);
      fullBodyFeet.push(details.feet.at(-1).replace(footView, bodyFoot));
    });
    const footBones = [
      ['ankle', 'ankle bones', 'M118 418 L129 417 L131 426 L125 432 L118 429Z'],
      ['heel', 'heel bone', 'M120 431 L129 428 L133 436 L128 442 L119 442Z'],
      ['metatarsals', 'metatarsals', 'M118 434 L121 438 L111 447 L106 446Z M124 436 L127 440 L120 449 L116 449Z M130 436 L134 438 L132 449 L127 450Z'],
    ];
    for (const [id, title, path] of footBones) structure('bones', 'bone-' + side + '-' + id, label + title, path, 'Part of the foot skeleton.', [], mirror);
    structure('nerves', side + '-sciatic', label + 'sciatic nerve',
      'M143 247 Q127 267 126 291 L131 345 L127 349 L122 291 Q122 266 139 245Z', 'A major nerve connecting the lower back and leg.', [], mirror);
    structure('nerves', side + '-tibial', label + 'tibial nerve',
      'M131 347 L132 376 L127 424 L124 428 L123 424 L129 377 L128 350Z', 'A nerve that extends toward the sole of the foot.', [], mirror);
    structure('nerves', side + '-fibular', label + 'fibular nerve',
      'M129 346 Q121 350 119 363 L122 403 L119 422 L122 423 L125 403 L122 362 Q123 352 132 349Z', 'A nerve that branches along the outer lower leg.', [], mirror);
    for (const [id, title, path] of pairedBones) {
      structure('bones', 'bone-' + side + '-' + id, label + title, path, 'Part of the skeletal system.', [], mirror);
    }
    const handTransform = side === 'right' ? 'translate(14 114)' : 'translate(286 114) scale(-1 1)';
    structure('hands', side + '-palm', label + 'palm',
      'M42 139 Q74 128 105 145 L104 185 Q97 208 90 215 L90 243 H53 L52 213 Q41 194 42 165 L48 144Z',
      'The palm supports grip and fine movement.', [], handTransform);
    const bodyHand = side === 'right' ? 'translate(77 293) rotate(180) scale(.21)' :
      'translate(223 293) rotate(180) scale(-.21 .21)';
    fullBodyHands.push('<path class="anatomy-palm" transform="' + bodyHand +
      '" d="M42 139 Q74 128 105 145 L104 185 Q97 208 90 215 L90 243 H53 L52 213 Q41 194 42 165 L48 144Z"/>');
    fingers.forEach((finger, index) => {
      structure('hands', side + '-finger-' + index, label + finger.toLowerCase(),
        fingerShapes[index], 'Record any change in sensation, grip or movement.', [], handTransform);
      fullBodyHands.push(details.hands.at(-1).replace(handTransform, bodyHand));
    });
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
          <defs>
            <linearGradient id="cutaway-shell">
              <stop stop-color="#17293a"/><stop offset=".48" stop-color="#263e50"/><stop offset="1" stop-color="#111e2c"/>
            </linearGradient>
            <radialGradient id="cutaway-tissue" cx=".36" cy=".3" r=".78">
              <stop stop-color="#986a7a"/><stop offset=".60" stop-color="#765062"/><stop offset="1" stop-color="#493547"/>
            </radialGradient>
            <radialGradient id="cutaway-heart" cx=".33" cy=".28" r=".83">
              <stop stop-color="#ac7886"/><stop offset=".56" stop-color="#895667"/><stop offset="1" stop-color="#5d3a50"/>
            </radialGradient>
          </defs>
          <g class="body-anatomy" id="body-anatomy"><g data-body-view="overview" class="anatomy-detail anatomical-cutaway">
            <path d="${outline}" fill="url(#cutaway-shell)" stroke="#588393" stroke-width=".85"/>
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
            <g class="cutaway-bones">${details.bones.join('')}</g>
            <g class="cutaway-vessels" aria-hidden="true">
              <path d="M145 88 L146 131 Q143 152 149 176 L149 227 M149 226 Q133 245 129 301 L127 354 L124 430 M149 226 Q164 245 171 301 L173 354 L177 430 M145 111 Q118 106 102 126 L86 183 L61 249 M146 111 Q175 105 197 126 L214 183 L239 249"/>
              <path d="M155 88 L154 132 L154 222 M154 222 Q137 247 135 297 L134 343 L132 423 M154 222 Q160 247 165 297 L167 343 L170 423 M154 110 Q174 112 192 127 L208 184 L233 250"/>
            </g>
            <g class="cutaway-organs">${details.organs.join('')}</g>
            <g class="cutaway-detail" aria-hidden="true">
              <path d="M133 39 Q138 30 146 34 T157 32 Q166 33 165 43 M135 45 Q140 39 145 44 T156 42 M139 49 Q145 46 150 50 T163 48"/>
              <path d="M132 125 Q125 141 122 160 M137 126 Q133 149 129 168 M167 123 Q175 138 178 160 M164 128 Q171 147 171 167"/>
              <path d="M137 222 Q159 219 165 225 Q165 229 142 228 Q136 232 143 234 L162 234 Q168 238 160 241 L142 240"/>
            </g>
            <g class="cutaway-hands">${fullBodyHands.join('')}</g>
            <g class="cutaway-feet">${fullBodyFeet.join('')}</g>
            <g class="cutaway-nerves">${details.nerves.join('')}</g>
            </g>
            <g data-body-view="organs" class="anatomy-detail" hidden><path class="anatomy-outline" d="${outline}"/>${details.organs.join('')}</g>
            <g data-body-view="bones" class="anatomy-detail" hidden><path class="anatomy-outline" d="${outline}"/>${details.bones.join('')}</g>
            <g data-body-view="hands" class="anatomy-detail" hidden>${details.hands.join('')}</g>
            <g data-body-view="feet" class="anatomy-detail" hidden>${details.feet.join('')}</g>
            <g data-body-view="nerves" class="anatomy-detail" hidden><path class="anatomy-outline" d="${outline}"/>${details.nerves.join('')}</g>
          </g>
        </svg>
      </div>
      <div class="body-details">
        <div class="anatomy-modes" role="group" aria-label="Anatomy view">
          <button class="secondary" data-anatomy-mode="overview">Overview</button>
          <button class="secondary" data-anatomy-mode="organs">Organs</button>
          <button class="secondary" data-anatomy-mode="bones">Skeleton</button>
          <button class="secondary" data-anatomy-mode="hands">Hands</button>
          <button class="secondary" data-anatomy-mode="feet">Feet</button>
          <button class="secondary" data-anatomy-mode="nerves">Leg nerves</button>
        </div>
        <p id="anatomy-drag-hint" class="hint" hidden>Drag to rotate. Use the arrows when the model has focus.</p>
        <label class="body-picker">Body area
          <select id="body-zone-picker"></select>
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
  let viewer;
  let currentView;

  function setView(view) {
    currentView = view;
    viewer?.view(view);
    const layer = panel.querySelector('[data-body-view="' + view + '"]');
    for (const group of panel.querySelectorAll('[data-body-view]')) {
      group.toggleAttribute('hidden', group !== layer);
    }
    for (const button of panel.querySelectorAll('[data-anatomy-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.anatomyMode === view));
    }
    const options = [...layer.querySelectorAll('[data-zone]')].map(node =>
      new Option(node.getAttribute('aria-label'), node.dataset.zone));
    picker.replaceChildren(...options);
    selectZone({ overview: 'heart', organs: 'heart', bones: 'bone-skull', hands: 'right-finger-0', feet: 'right-toe-0', nerves: 'right-sciatic' }[view]);
  }
  for (const button of panel.querySelectorAll('[data-anatomy-mode]')) {
    button.addEventListener('click', () => setView(button.dataset.anatomyMode));
  }

  function selectZone(name) {
    const [, title, , description, readings = []] = zones.find(([id]) => id === name);
    if (![...picker.options].some(option => option.value === name)) picker.add(new Option(title, name));
    picker.value = name;
    viewer?.select(name);
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
    viewer?.zoom(zoom);
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
  setView('overview');
  setZoom(0);
  const host = panel.querySelector('#body-view');
  const svg = host.querySelector('svg');
  const loadViewer = async () => {
    try {
      const { createAnatomyViewer } = await import('./anatomy-3d.js');
      viewer = createAnatomyViewer(host, svg, selectZone, text => { preview.textContent = text; }, name => {
        const label = name.replace(/\.r\.?$/i, ' (right)').replace(/\.l\.?$/i, ' (left)');
        const id = 'atlas-bone-' + name;
        if (!zones.some(([key]) => key === id)) zones.push([id, label, '', 'Part of the skeletal system.']);
        return id;
      });
      viewer.view(currentView);
      viewer.select(picker.value);
      viewer.zoom(Number(slider.value));
      svg.hidden = true;
      svg.setAttribute('hidden', '');
      panel.querySelector('#anatomy-drag-hint').hidden = false;
    } catch {
      host.querySelector('.anatomy-canvas')?.remove();
      viewer = undefined;
    }
  };
  const observer = new IntersectionObserver(entries => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    observer.disconnect();
    loadViewer();
  });
  observer.observe(host);
})();
