// ===== مرحله ۴: لایه‌ی بصری (SVG قطعه‌ای) =====
// این فایل مسئول ساخت و مدیریت گرافیک شخصیت‌ه: دو نسخه‌ی دختر/پسر،
// قطعات جدا برای چشم/دهن/ابرو/مو/لباس، کراس‌فید بین حالت‌های خلق‌وخو،
// لایه‌ی پلک‌زدن مستقل، و اکسسوری فانتزی اختیاری.
// به state.js وصل نیست (فقط mood رو از بیرون می‌گیره) و به مدل هم وصل نیست.

const CUSTOM_KEY = "zendenama_character_custom";

function defaultCustomization() {
  return {
    gender: "girl",       // "girl" | "boy"
    hairColor: "#a56cf2",
    eyeColor: "#4fc3f7",
    clothesColor: "#6c5ce7",
    accessory: "none"      // "none" | "ears" | "wings" | "halo" | "wand"
  };
}

function loadCustomization() {
  const raw = localStorage.getItem(CUSTOM_KEY);
  if (!raw) return defaultCustomization();
  try {
    const parsed = JSON.parse(raw);
    return Object.assign(defaultCustomization(), parsed);
  } catch {
    return defaultCustomization();
  }
}

function saveCustomization(custom) {
  localStorage.setItem(CUSTOM_KEY, JSON.stringify(custom));
}

// ----- ساخت SVG بر اساس جنسیت -----
// بدنه‌ی مشترک (چشم/دهن/ابرو/پلک) یکیه؛ فقط مو و لباس بین دو نسخه فرق دارن.
function buildCharacterSVG(gender) {
  const hairShape = gender === "boy" ? boyHairPath() : girlHairPath();
  const clothesShape = gender === "boy" ? boyClothesPath() : girlClothesPath();

  return `
<svg id="character-svg" viewBox="0 0 240 260" xmlns="http://www.w3.org/2000/svg" style="width:100%;max-width:260px;">

  <!-- لباس -->
  <g id="clothes-layer">${clothesShape}</g>

  <!-- صورت پایه -->
  <ellipse id="face-base" cx="120" cy="115" rx="62" ry="68" fill="#ffdbb4"/>

  <!-- ابرو (لایه‌ی حالت) -->
  <g id="eyebrows-layer">
    <g class="mood-part" data-mood="happy">
      <path d="M85 88 Q98 78 111 87" stroke="#5a3d2b" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M129 87 Q142 78 155 88" stroke="#5a3d2b" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
    <g class="mood-part" data-mood="neutral">
      <path d="M86 89 Q98 85 110 89" stroke="#5a3d2b" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M130 89 Q142 85 154 89" stroke="#5a3d2b" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
    <g class="mood-part" data-mood="tired">
      <path d="M87 92 Q98 90 109 93" stroke="#5a3d2b" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M131 93 Q142 90 153 92" stroke="#5a3d2b" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
    <g class="mood-part" data-mood="angry">
      <path d="M86 92 Q99 82 112 90" stroke="#5a3d2b" stroke-width="5" fill="none" stroke-linecap="round"/>
      <path d="M128 90 Q141 82 154 92" stroke="#5a3d2b" stroke-width="5" fill="none" stroke-linecap="round"/>
    </g>
  </g>

  <!-- چشم (لایه‌ی حالت) -->
  <g id="eyes-layer">
    <g class="mood-part" data-mood="happy">
      <path d="M88 104 Q98 92 108 104" stroke="#3a2a1e" stroke-width="4.5" fill="none" stroke-linecap="round"/>
      <path d="M132 104 Q142 92 152 104" stroke="#3a2a1e" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    </g>
    <g class="mood-part" data-mood="neutral">
      <ellipse cx="98" cy="104" rx="12" ry="14" fill="#fff"/>
      <ellipse cx="142" cy="104" rx="12" ry="14" fill="#fff"/>
      <circle class="iris" cx="98" cy="106" r="7.5" fill="#4fc3f7"/>
      <circle class="iris" cx="142" cy="106" r="7.5" fill="#4fc3f7"/>
      <circle cx="100" cy="103" r="2" fill="#fff"/>
      <circle cx="144" cy="103" r="2" fill="#fff"/>
    </g>
    <g class="mood-part" data-mood="tired">
      <path d="M87 104 Q98 110 109 104" stroke="#3a2a1e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <path d="M131 104 Q142 110 153 104" stroke="#3a2a1e" stroke-width="3.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="98" cy="108" rx="9" ry="6" fill="#fff" opacity="0.85"/>
      <ellipse cx="142" cy="108" rx="9" ry="6" fill="#fff" opacity="0.85"/>
      <circle class="iris" cx="98" cy="108" r="5.5" fill="#4fc3f7"/>
      <circle class="iris" cx="142" cy="108" r="5.5" fill="#4fc3f7"/>
    </g>
    <g class="mood-part" data-mood="angry">
      <ellipse cx="98" cy="106" rx="10" ry="9" fill="#fff"/>
      <ellipse cx="142" cy="106" rx="10" ry="9" fill="#fff"/>
      <circle class="iris" cx="99" cy="107" r="6.5" fill="#4fc3f7"/>
      <circle class="iris" cx="141" cy="107" r="6.5" fill="#4fc3f7"/>
      <path d="M86 96 L110 101" stroke="#3a2a1e" stroke-width="4" stroke-linecap="round"/>
      <path d="M154 96 L130 101" stroke="#3a2a1e" stroke-width="4" stroke-linecap="round"/>
    </g>
  </g>

  <!-- پلک (لایه‌ی مستقل چشمک‌زدن) -->
  <g id="blink-layer">
    <ellipse cx="98" cy="104" rx="13" ry="15" fill="#ffdbb4"/>
    <ellipse cx="142" cy="104" rx="13" ry="15" fill="#ffdbb4"/>
  </g>

  <!-- دهن (لایه‌ی حالت) -->
  <g id="mouth-layer">
    <g class="mood-part" data-mood="happy">
      <path d="M97 132 Q120 156 143 132 Q120 148 97 132 Z" fill="#a83c3c"/>
    </g>
    <g class="mood-part" data-mood="neutral">
      <path d="M107 135 Q120 140 133 135" stroke="#a83c3c" stroke-width="4" fill="none" stroke-linecap="round"/>
    </g>
    <g class="mood-part" data-mood="tired">
      <path d="M106 138 Q120 135 134 138" stroke="#a83c3c" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    </g>
    <g class="mood-part" data-mood="angry">
      <path d="M104 140 Q120 128 136 140" stroke="#a83c3c" stroke-width="4.5" fill="none" stroke-linecap="round"/>
    </g>
  </g>

  <!-- مو (روی صورت، زیر اکسسوری) -->
  <g id="hair-layer">${hairShape}</g>

  <!-- اکسسوری‌های فانتزی (اختیاری، پیش‌فرض مخفی) -->
  <g id="accessory-none" class="accessory" style="display:none;"></g>

  <g id="accessory-ears" class="accessory" style="display:none;">
    <path d="M70 55 L58 15 L92 48 Z" fill="#a56cf2" class="acc-fill"/>
    <path d="M170 55 L182 15 L148 48 Z" fill="#a56cf2" class="acc-fill"/>
    <path d="M72 48 L64 24 L86 44 Z" fill="#ffb6c9"/>
    <path d="M168 48 L176 24 L154 44 Z" fill="#ffb6c9"/>
  </g>

  <g id="accessory-wings" class="accessory" style="display:none;">
    <path d="M40 150 Q5 120 20 80 Q45 100 48 140 Z" fill="#ffffff" opacity="0.85"/>
    <path d="M200 150 Q235 120 220 80 Q195 100 192 140 Z" fill="#ffffff" opacity="0.85"/>
  </g>

  <g id="accessory-halo" class="accessory" style="display:none;">
    <ellipse cx="120" cy="35" rx="26" ry="8" fill="none" stroke="#ffe08a" stroke-width="5"/>
  </g>

  <g id="accessory-wand" class="accessory" style="display:none;">
    <line x1="205" y1="200" x2="235" y2="150" stroke="#caa8f5" stroke-width="5" stroke-linecap="round"/>
    <path d="M235 150 l6 -14 l4 10 l10 -8 l-6 14 l10 6 l-14 2 l2 14 l-10 -10 l-8 10 z" fill="#ffe08a"/>
  </g>

</svg>`;
}

function girlHairPath() {
  return `
    <path d="M120 40 C75 40 58 78 58 112 C58 145 66 175 70 190 C60 165 55 140 62 108 C68 82 88 62 120 62 C152 62 172 82 178 108 C185 140 180 165 170 190 C174 175 182 145 182 112 C182 78 165 40 120 40 Z" fill="#a56cf2" class="hair-fill"/>
    <path d="M120 45 C100 45 90 60 88 78 C95 68 106 62 120 62 C134 62 145 68 152 78 C150 60 140 45 120 45 Z" fill="#a56cf2" class="hair-fill" opacity="0.9"/>
  `;
}

function boyHairPath() {
  return `
    <path d="M120 45 C90 45 68 62 64 90 C78 80 96 74 120 74 C144 74 162 80 176 90 C172 62 150 45 120 45 Z" fill="#a56cf2" class="hair-fill"/>
    <path d="M75 70 L82 48 L95 68 Z" fill="#a56cf2" class="hair-fill"/>
    <path d="M120 44 L127 20 L135 46 Z" fill="#a56cf2" class="hair-fill"/>
    <path d="M165 70 L158 48 L145 68 Z" fill="#a56cf2" class="hair-fill"/>
  `;
}

function girlClothesPath() {
  return `<path d="M45 260 Q60 195 95 178 L120 200 L145 178 Q180 195 195 260 Z" fill="#6c5ce7" class="clothes-fill"/>
          <path d="M108 185 L120 205 L132 185 L120 178 Z" fill="#ffffff" opacity="0.5"/>`;
}

function boyClothesPath() {
  return `<path d="M50 260 Q62 200 92 182 L120 202 L148 182 Q178 200 190 260 Z" fill="#6c5ce7" class="clothes-fill"/>
          <path d="M112 188 L120 205 L128 188 L120 180 Z" fill="#ffffff" opacity="0.6"/>`;
}

// ----- رندر و مدیریت زنده‌ی شخصیت -----
let blinkTimer = null;

function renderCharacter(container, custom) {
  container.innerHTML = buildCharacterSVG(custom.gender);
  applyCustomizationColors(custom);
  setAccessory(custom.accessory);
  restartBlinking();
}

function applyCustomizationColors(custom) {
  document.querySelectorAll(".hair-fill").forEach(el => el.setAttribute("fill", custom.hairColor));
  document.querySelectorAll(".iris").forEach(el => el.setAttribute("fill", custom.eyeColor));
  document.querySelectorAll(".clothes-fill").forEach(el => el.setAttribute("fill", custom.clothesColor));
}

function setAccessory(name) {
  document.querySelectorAll(".accessory").forEach(el => (el.style.display = "none"));
  const target = document.getElementById("accessory-" + name);
  if (target) target.style.display = "";
}

// کراس‌فید بین حالت‌های خلق‌وخو: با opacity+transition تو CSS، اینجا فقط کلاس active رو جابه‌جا می‌کنیم
function setMood(mood) {
  ["eyebrows-layer", "eyes-layer", "mouth-layer"].forEach(layerId => {
    const layer = document.getElementById(layerId);
    if (!layer) return;
    layer.querySelectorAll(".mood-part").forEach(part => {
      part.classList.toggle("active", part.getAttribute("data-mood") === mood);
    });
  });
}

// چشمک زدن دوره‌ای، مستقل از حالت خلق‌وخو
function restartBlinking() {
  if (blinkTimer) clearInterval(blinkTimer);
  blinkTimer = setInterval(() => {
    const blinkLayer = document.getElementById("blink-layer");
    if (!blinkLayer) return;
    blinkLayer.classList.add("blink");
    setTimeout(() => blinkLayer.classList.remove("blink"), 140);
  }, 3000 + Math.random() * 3000);
}
