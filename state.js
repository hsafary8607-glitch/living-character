// ===== مرحله ۲: موتور وضعیت شخصیت =====
// وضعیت شخصیت (خلق‌وخو، انرژی، آخرین تعامل) اینجا مدیریت و تو localStorage ذخیره میشه.
// این فایل فقط منطقه — به گرافیک (مرحله ۳) یا مدل (مرحله ۴) هنوز وصل نیست.

const STATE_KEY = "zendenama_character_state";

const ENERGY_MAX = 100;
const ENERGY_MIN = 0;
const ENERGY_DECAY_PER_HOUR = 4;      // هر ساعت بی‌تعاملی، انرژی همین‌قدر کم میشه
const ENERGY_GAIN_PER_MESSAGE = 5;    // هر پیام کاربر، همین‌قدر انرژی اضافه میشه

const IGNORED_HOURS_THRESHOLD = 24;   // بعد از این‌همه ساعت بی‌تعاملی، شخصیت "عصبانی" میشه

function defaultState() {
  return {
    energy: 70,
    mood: "neutral",
    lastInteraction: Date.now()
  };
}

function loadState() {
  const raw = localStorage.getItem(STATE_KEY);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed.energy !== "number" || !parsed.lastInteraction) {
      return defaultState();
    }
    return parsed;
  } catch {
    return defaultState();
  }
}

function saveState(state) {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function hoursSince(timestamp) {
  return (Date.now() - timestamp) / (1000 * 60 * 60);
}

// انرژی رو بر اساس زمان سپری‌شده از آخرین تعامل، کم می‌کنه (بدون آپدیت lastInteraction)
function applyDecay(state) {
  const elapsedHours = hoursSince(state.lastInteraction);
  const decayed = state.energy - elapsedHours * ENERGY_DECAY_PER_HOUR;
  state.energy = Math.max(ENERGY_MIN, Math.min(ENERGY_MAX, decayed));
  state.mood = computeMood(state);
  return state;
}

function computeMood(state) {
  const idleHours = hoursSince(state.lastInteraction);

  if (idleHours >= IGNORED_HOURS_THRESHOLD) {
    return "angry"; // مدت زیادیه که کاربر سراغش نیومده
  }
  if (state.energy >= 70) {
    return "happy";
  }
  if (state.energy >= 35) {
    return "neutral";
  }
  return "tired";
}

// وقتی کاربر پیام می‌فرسته صدا زده میشه: انرژی رو بالا می‌بره، آخرین تعامل رو آپدیت می‌کنه
function registerInteraction(state) {
  state.energy = Math.max(ENERGY_MIN, Math.min(ENERGY_MAX, state.energy + ENERGY_GAIN_PER_MESSAGE));
  state.lastInteraction = Date.now();
  state.mood = computeMood(state);
  saveState(state);
  return state;
}

const MOOD_LABELS_FA = {
  happy: "شاد",
  neutral: "خنثی",
  tired: "خسته",
  angry: "عصبانی"
};

function formatIdleTime(timestamp) {
  const hours = hoursSince(timestamp);
  if (hours < 1) {
    const minutes = Math.round(hours * 60);
    return minutes <= 1 ? "همین الان" : minutes + " دقیقه پیش";
  }
  if (hours < 24) {
    return Math.round(hours) + " ساعت پیش";
  }
  return Math.round(hours / 24) + " روز پیش";
}
