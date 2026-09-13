// ===== مرحله ۱: اسکلت پایه =====
// فقط چت متنی ساده با Qwen، بدون گرافیک شخصیت، بدون ذخیره‌سازی دائمی.
// تنظیمات (کلید API، ریجن، مدل) فقط تو حافظه‌ی همین صفحه نگه داشته میشه؛
// با رفرش صفحه پاک میشه — ذخیره‌ی دائمی (localStorage) میره تو مرحله‌ی بعد.

// ===== تنظیمات اتصال (OpenRouter) =====
// کلید و مدل انتخابی تو localStorage ذخیره میشه تا با رفرش/بستن مرورگر از بین نره.

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const SETTINGS_KEY = "zendenama_settings";

function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_KEY);
  if (!raw) return { apiKey: "", model: "qwen/qwen3.6-plus:free" };
  try {
    const parsed = JSON.parse(raw);
    return {
      apiKey: parsed.apiKey || "",
      model: parsed.model || "qwen/qwen3.6-plus:free"
    };
  } catch {
    return { apiKey: "", model: "qwen/qwen3.6-plus:free" };
  }
}

function saveSettingsToStorage(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

let settings = loadSettings();

const apiKeyInput = document.getElementById("api-key");
const modelSelect = document.getElementById("model-select");
const saveBtn = document.getElementById("save-settings");
const statusText = document.getElementById("settings-status");

// نمایش تنظیمات ذخیره‌شده‌ی قبلی
apiKeyInput.value = settings.apiKey;
modelSelect.value = settings.model;

const chatLog = document.getElementById("chat-log");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");
const voiceOutputToggle = document.getElementById("voice-output-toggle");

const conversation = []; // تاریخچه‌ی پیام‌ها برای فرستادن به مدل

const characterStatusEl = document.getElementById("character-status");

// ===== وضعیت شخصیت (مرحله ۲) =====
let characterState = loadState();
applyDecay(characterState);
saveState(characterState);
renderCharacterStatus();

// ===== لایه‌ی بصری (مرحله ۴) =====
const characterStage = document.getElementById("character-stage");
let customization = loadCustomization();
renderCharacter(characterStage, customization);
setMood(characterState.mood);

const genderGirlBtn = document.getElementById("gender-girl-btn");
const genderBoyBtn = document.getElementById("gender-boy-btn");
const hairColorInput = document.getElementById("hair-color-input");
const eyeColorInput = document.getElementById("eye-color-input");
const clothesColorInput = document.getElementById("clothes-color-input");
const accessorySelect = document.getElementById("accessory-select");

hairColorInput.value = customization.hairColor;
eyeColorInput.value = customization.eyeColor;
clothesColorInput.value = customization.clothesColor;
accessorySelect.value = customization.accessory;
updateGenderButtons();

function updateGenderButtons() {
  genderGirlBtn.classList.toggle("active", customization.gender === "girl");
  genderBoyBtn.classList.toggle("active", customization.gender === "boy");
}

function switchGender(gender) {
  customization.gender = gender;
  saveCustomization(customization);
  updateGenderButtons();
  renderCharacter(characterStage, customization);
  setMood(characterState.mood);
}

genderGirlBtn.addEventListener("click", () => switchGender("girl"));
genderBoyBtn.addEventListener("click", () => switchGender("boy"));

hairColorInput.addEventListener("input", () => {
  customization.hairColor = hairColorInput.value;
  saveCustomization(customization);
  applyCustomizationColors(customization);
});

eyeColorInput.addEventListener("input", () => {
  customization.eyeColor = eyeColorInput.value;
  saveCustomization(customization);
  applyCustomizationColors(customization);
});

clothesColorInput.addEventListener("input", () => {
  customization.clothesColor = clothesColorInput.value;
  saveCustomization(customization);
  applyCustomizationColors(customization);
});

accessorySelect.addEventListener("change", () => {
  customization.accessory = accessorySelect.value;
  saveCustomization(customization);
  setAccessory(customization.accessory);
});

// ===== مرحله ۵: صدا (ورودی + خروجی) =====

// --- چک: آیا تو یه context امنه؟ (میکروفون فقط رو HTTPS یا localhost کار می‌کنه) ---
const isSecureContextForVoice =
  window.isSecureContext ||
  location.protocol === "https:" ||
  location.hostname === "localhost" ||
  location.hostname === "127.0.0.1";

// --- خروجی صدا: خوندن جواب شخصیت با speechSynthesis ---
let cachedVoices = [];

function refreshVoices() {
  if ("speechSynthesis" in window) {
    cachedVoices = window.speechSynthesis.getVoices();
  }
}

// لیست صداها معمولاً async لود میشه؛ بار اول getVoices() ممکنه خالی برگرده
refreshVoices();
if ("speechSynthesis" in window && "onvoiceschanged" in window.speechSynthesis) {
  window.speechSynthesis.onvoiceschanged = refreshVoices;
}

// ایموجی‌ها رو قبل از خوندن با صدا حذف می‌کنیم چون بعضی موتورهای TTS
// اسم/توصیف ایموجی رو با صدای بلند می‌خونن که آزاردهنده‌ست.
function stripEmojisForSpeech(text) {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}\uFE0F]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function speakText(text) {
  if (!voiceOutputToggle.checked) return;
  if (!("speechSynthesis" in window)) {
    addMessage("system", "مرورگرت از خروجی صوتی (speechSynthesis) پشتیبانی نمی‌کنه.");
    return;
  }

  const cleanText = stripEmojisForSpeech(text);
  if (!cleanText) return;

  const doSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "fa-IR";
    utterance.rate = 0.92;

    // اگه voice‌ها هنوز لود نشدن (لیست خالیه)، یه بار دیگه سعی کن
    if (cachedVoices.length === 0) {
      refreshVoices();
    }

    const faVoices = cachedVoices.filter(v => v.lang && v.lang.toLowerCase().startsWith("fa"));

    if (faVoices.length > 0) {
      const wantsFemale = customization.gender === "girl";
      const matched = faVoices.find(v =>
        wantsFemale ? /female|زن/i.test(v.name) : /male|مرد/i.test(v.name)
      );
      utterance.voice = matched || faVoices[0];
    } else {
      // هیچ صدای فارسی رو این دستگاه/مرورگر نصب نیست.
      // نکته‌ی مهم: اگه زبان سیستم گوشی فارسیه، navigator.language هم "fa-IR" برمی‌گرده،
      // پس fallback به navigator.language دوباره سکوت ایجاد می‌کنه. صریح می‌ذاریم انگلیسی
      // که مطمئنیم موتور TTS داره (طبق تست صدای گوشی).
      utterance.lang = "en-US";
      if (!speakText._warnedNoFaVoice) {
        speakText._warnedNoFaVoice = true;
        addMessage("system", "هیچ صدای فارسی رو این مرورگر/گوشی نصب نیست؛ صدا با لهجه/زبان دیگه‌ای پخش میشه (یا اصلاً پخش نمیشه). از تنظیمات گوشی، پک زبان فارسی گوگل TTS رو نصب کن.");
      }
    }

    utterance.onerror = (event) => {
      addMessage("system", "خطای خروجی صدا: " + (event.error || "نامشخص"));
    };

    window.speechSynthesis.speak(utterance);
  };

  // باگ شناخته‌شده‌ی کروم اندروید: اگه بلافاصله بعد از cancel() یه speak() جدید بزنی،
  // موتور TTS با خطای synthesis-failed رد میشه. برای رفعش، فقط وقتی واقعاً چیزی
  // در حال پخشه cancel می‌کنیم و بعدش یه تأخیر کوچیک قبل از speak جدید می‌ذاریم.
  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
    setTimeout(doSpeak, 200);
  } else {
    doSpeak();
  }
}

// --- ورودی صدا: تشخیص گفتار کاربر با SpeechRecognition ---
const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognizer = null;
let isListening = false;

const SPEECH_ERROR_LABELS_FA = {
  "not-allowed": "دسترسی به میکروفون رد شد (یا صفحه رو HTTPS/localhost باز نشده).",
  "service-not-allowed": "دسترسی به سرویس تشخیص گفتار رد شد (معمولاً چون آدرس HTTPS نیست).",
  "no-speech": "صدایی شنیده نشد، دوباره امتحان کن.",
  "audio-capture": "میکروفونی پیدا نشد.",
  "network": "خطای شبکه (تشخیص گفتار به اینترنت نیاز داره).",
  "aborted": "ضبط لغو شد."
};

if (!SpeechRecognitionAPI) {
  micBtn.disabled = true;
  micBtn.title = "مرورگرت از ورودی صوتی پشتیبانی نمی‌کنه";
} else if (!isSecureContextForVoice) {
  // میکروفون فقط رو HTTPS یا localhost کار می‌کنه؛ رو HTTP معمولی (حتی تو شبکه‌ی محلی) مرورگر اجازه نمی‌ده.
  micBtn.disabled = true;
  micBtn.title = "برای ورودی صوتی باید صفحه رو از آدرس HTTPS یا localhost باز کنی.";
  addMessage("system", "ورودی صوتی غیرفعاله چون صفحه از آدرس HTTP معمولی باز شده (نه HTTPS/localhost). مرورگرها اجازه‌ی دسترسی به میکروفون رو فقط تو آدرس امن می‌دن.");
} else {
  recognizer = new SpeechRecognitionAPI();
  recognizer.lang = "fa-IR";
  recognizer.interimResults = true;
  recognizer.continuous = false;
  recognizer.maxAlternatives = 1;

  recognizer.onstart = () => {
    isListening = true;
    micBtn.classList.add("listening");
  };

  recognizer.onend = () => {
    isListening = false;
    micBtn.classList.remove("listening");
  };

  recognizer.onerror = (event) => {
    isListening = false;
    micBtn.classList.remove("listening");
    const label = SPEECH_ERROR_LABELS_FA[event.error] || event.error;
    addMessage("system", "خطای تشخیص گفتار: " + label);
  };

  recognizer.onresult = (event) => {
    let transcript = "";
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    chatInput.value = transcript;
    if (isFinal && transcript.trim()) {
      chatForm.requestSubmit();
    }
  };

  micBtn.addEventListener("click", () => {
    if (isListening) {
      recognizer.stop();
    } else {
      try {
        recognizer.start();
      } catch {
        // اگه از قبل در حال اجرا بود یا خطای دیگه‌ای داد
      }
    }
  });
}

function renderCharacterStatus() {
  const moodLabel = MOOD_LABELS_FA[characterState.mood] || characterState.mood;
  const energyPct = Math.round(characterState.energy);
  const idleText = formatIdleTime(characterState.lastInteraction);
  characterStatusEl.textContent =
    "حالت: " + moodLabel + " | انرژی: " + energyPct + "% | آخرین تعامل: " + idleText;
  setMood(characterState.mood);
}

function addMessage(role, text) {
  const div = document.createElement("div");
  div.className = "msg " + role;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

saveBtn.addEventListener("click", () => {
  settings.apiKey = apiKeyInput.value.trim();
  settings.model = modelSelect.value;

  if (!settings.apiKey) {
    statusText.style.color = "#e77";
    statusText.textContent = "کلید API رو وارد کن.";
    return;
  }

  saveSettingsToStorage(settings);
  statusText.style.color = "#8fd694";
  statusText.textContent = "تنظیمات ذخیره شد (تا رفرش/بستن مرورگر هم می‌مونه).";
});

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  if (!settings.apiKey) {
    addMessage("system", "اول باید کلید API رو وارد و ذخیره کنی.");
    return;
  }

  addMessage("user", text);
  conversation.push({ role: "user", content: text });
  chatInput.value = "";
  sendBtn.disabled = true;
  addMessage("system", "در حال فکر کردن...");

  registerInteraction(characterState);
  renderCharacterStatus();

  try {
    const reply = await callQwen(conversation, settings);
    // حذف پیام "در حال فکر کردن..."
    chatLog.removeChild(chatLog.lastChild);
    addMessage("character", reply);
    conversation.push({ role: "assistant", content: reply });
    speakText(reply);
  } catch (err) {
    chatLog.removeChild(chatLog.lastChild);
    addMessage("system", "خطا: " + err.message);
  } finally {
    sendBtn.disabled = false;
  }
});

async function callQwen(messages, settings) {
  // OpenRouter حداکثر ۳ مدل تو لیست fallback قبول می‌کنه.
  const FALLBACK_FREE_MODELS = [
    "qwen/qwen3.6-plus:free",
    "meta-llama/llama-3.2-3b-instruct:free"
  ];
  const PAID_SAFETY_NET = "deepseek/deepseek-chat"; // آخرین راه‌حل: پولی (اگه هیچ رایگانی جواب نداد)

  let modelList;
  if (settings.model.includes(":free")) {
    modelList = [settings.model, ...FALLBACK_FREE_MODELS.filter(m => m !== settings.model)];
    modelList = modelList.slice(0, 2); // فقط ۲ تا رایگان
    modelList.push(PAID_SAFETY_NET); // جمعاً ۳ تا
  } else {
    modelList = [settings.model];
  }

  const response = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + settings.apiKey
    },
    body: JSON.stringify({
      models: modelList,
      messages: messages
    })
  });

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error("درخواست ناموفق (" + response.status + "): " + errBody);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("پاسخ نامعتبر از سرور.");
  }
  return content;
}

// ===== دکمه‌ی تست مستقیم صدا (تشخیص مشکل: کد یا خود گوشی؟) =====
const voiceTestBtn = document.getElementById("voice-test-btn");
if (voiceTestBtn) {
  voiceTestBtn.addEventListener("click", () => {
    if (!("speechSynthesis" in window)) {
      addMessage("system", "تست صدا: مرورگرت اصلاً speechSynthesis نداره.");
      return;
    }
    addMessage("system", "تست صدا: در حال تلاش برای پخش صدای انگلیسی ساده...");
    const u = new SpeechSynthesisUtterance("Hello, this is a voice test.");
    u.lang = "en-US";
    u.volume = 1;
    u.rate = 1;
    u.onstart = () => addMessage("system", "تست صدا: پخش شروع شد (onstart فایر شد).");
    u.onend = () => addMessage("system", "تست صدا: پخش تموم شد (onend فایر شد). اگه صدایی نشنیدی، مشکل از گوشیه (صدای مدیا/موتور TTS)، نه کد.");
    u.onerror = (e) => addMessage("system", "تست صدا: خطا -> " + (e.error || "نامشخص"));
    window.speechSynthesis.cancel();
    setTimeout(() => window.speechSynthesis.speak(u), 100);
  });
}