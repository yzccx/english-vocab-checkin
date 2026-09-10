(function () {
  "use strict";

  const STORE_KEY = "englishVocabCheckin.v1";
  const BANK_ORDER = ["kaoyan", "cet4", "cet6"];
  const BANK_LABELS = {
    kaoyan: "考研必备",
    cet4: "四级必备",
    cet6: "六级必备"
  };
  const MODE_LABELS = { flash: "逐词学习", passage: "短文学习" };

  const app = {
    state: null,
    currentPage: "home",
    selectedBank: "kaoyan",
    homeView: "select", // select | flash | passageList | passageRead
    flash: null,
    readingPassageId: null,
    wordIndex: new Map(),
    bankWords: { kaoyan: [], cet4: [], cet6: [] },
    toastTimer: null
  };

  /* ---------------- 基础工具 ---------------- */

  function pad2(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function dateKey(d) {
    return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate());
  }

  function todayKey() {
    return dateKey(new Date());
  }

  function shiftDate(d, days) {
    const nd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    nd.setDate(nd.getDate() + days);
    return nd;
  }

  function parseKey(key) {
    const parts = key.split("-").map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function weekdayCN(day) {
    return ["日", "一", "二", "三", "四", "五", "六"][day];
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeRegExp(s) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  function $id(id) {
    return document.getElementById(id);
  }

  function showToast(text, ms) {
    const el = $id("toast");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("hidden");
    clearTimeout(app.toastTimer);
    app.toastTimer = setTimeout(function () {
      el.classList.add("hidden");
    }, ms || 2600);
  }

  /* ---------------- 状态存取 ---------------- */

  function defaultState() {
    return {
      version: 1,
      settings: { dailyGoal: 20, activeBank: "kaoyan" },
      days: {},
      wordStates: {},
      customWords: [],
      customPassages: [],
      exportedAt: null
    };
  }

  function loadState() {
    const base = defaultState();
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (!raw) return base;
      const data = JSON.parse(raw);
      if (!data || typeof data !== "object") return base;
      const merged = Object.assign({}, base, data);
      merged.settings = Object.assign({}, base.settings, data.settings || {});
      merged.days = data.days && typeof data.days === "object" ? data.days : {};
      merged.wordStates =
        data.wordStates && typeof data.wordStates === "object"
          ? data.wordStates
          : {};
      merged.customWords = Array.isArray(data.customWords) ? data.customWords : [];
      merged.customPassages = Array.isArray(data.customPassages)
        ? data.customPassages
        : [];
      return merged;
    } catch (e) {
      console.warn("读取本地数据失败，已使用默认设置", e);
      return base;
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(app.state));
    } catch (e) {
      console.error("保存本地数据失败", e);
      showToast("保存失败：浏览器存储可能已满");
    }
  }

  function ensureDay(key) {
    if (!app.state.days[key]) {
      app.state.days[key] = {
        words: [],
        byMode: { flash: [], passage: [] },
        checked: false
      };
    }
    return app.state.days[key];
  }

  function getToday() {
    return ensureDay(todayKey());
  }

  function normalizeKey(word) {
    return String(word || "").trim().toLowerCase();
  }

  function markWordLearned(word, mode) {
    const key = normalizeKey(word);
    if (!key) return null;
    const today = getToday();
    const before = today.words.length;
    if (today.byMode[mode] && !today.byMode[mode].includes(key)) {
      today.byMode[mode].push(key);
    }
    if (!today.words.includes(key)) {
      today.words.push(key);
    }
    saveState();
    refreshHeader();
    if (today.words.length > before) {
      const goal = app.state.settings.dailyGoal;
      if (today.words.length >= goal && before < goal && !today.checked) {
        showToast("已达到今日目标，可以去打卡啦！");
      }
    }
    return today.words.length;
  }

  function isLearnedToday(word) {
    const today = app.state.days[todayKey()];
    return !!today && today.words.includes(normalizeKey(word));
  }

  function updateWordState(word, known) {
    const key = normalizeKey(word);
    if (!key) return;
    const rec = app.state.wordStates[key] || {};
    rec.known = known === true || known === false ? known : null;
    rec.seen = (rec.seen || 0) + 1;
    rec.last = todayKey();
    app.state.wordStates[key] = rec;
    saveState();
  }

  /* ---------------- 词库 ---------------- */

  function initWordIndex() {
    app.wordIndex = new Map();
    app.bankWords = { kaoyan: [], cet4: [], cet6: [] };
    const rows = window.VOCAB_DATA || [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      addToIndex(row[0], row[1], row[2], row[3] || []);
    }
    const custom = app.state ? app.state.customWords : [];
    for (let i = 0; i < custom.length; i++) {
      const w = custom[i];
      addToIndex(w.word, w.phonetic || "", w.def, w.banks || []);
    }
  }

  function addToIndex(word, phonetic, def, banks) {
    const key = normalizeKey(word);
    if (!key || !def) return;
    if (!app.wordIndex.has(key)) {
      app.wordIndex.set(key, {
        word: String(word).trim(),
        phonetic: phonetic || "",
        def: def,
        banks: banks || []
      });
    }
    const bankList = Array.isArray(banks) ? banks : [];
    for (let i = 0; i < bankList.length; i++) {
      const b = bankList[i];
      if (BANK_ORDER.indexOf(b) > -1) {
        const exists = app.bankWords[b].some(function (obj) {
          return obj.key === key;
        });
        if (!exists) {
          app.bankWords[b].push({
            key: key,
            word: String(word).trim(),
            phonetic: phonetic || "",
            def: def
          });
        }
      }
    }
  }

  function lookupWord(word) {
    const key = normalizeKey(word);
    return key ? app.wordIndex.get(key) : null;
  }

  function bankTotal(bank) {
    return app.bankWords[bank] ? app.bankWords[bank].length : 0;
  }

  /* ---------------- 打卡与连续天数 ---------------- */

  function countToday() {
    const day = app.state.days[todayKey()];
    return day ? day.words.length : 0;
  }

  function checkedSet() {
    const set = {};
    const keys = Object.keys(app.state.days);
    for (let i = 0; i < keys.length; i++) {
      if (app.state.days[keys[i]].checked) set[keys[i]] = true;
    }
    return set;
  }

  function currentStreak() {
    const set = checkedSet();
    let cursor = todayKey();
    if (!set[cursor]) cursor = dateKey(shiftDate(new Date(), -1));
    if (!set[cursor]) return 0;
    let n = 0;
    while (set[cursor]) {
      n++;
      cursor = dateKey(shiftDate(parseKey(cursor), -1));
    }
    return n;
  }

  function canCheckin() {
    const today = getToday();
    return !today.checked && today.words.length >= app.state.settings.dailyGoal;
  }

  function doCheckin() {
    const today = getToday();
    if (today.checked) {
      showToast("今天已经打过卡了");
      return;
    }
    if (today.words.length < app.state.settings.dailyGoal) {
      showToast("还差 " + (app.state.settings.dailyGoal - today.words.length) + " 个单词才能打卡");
      return;
    }
    today.checked = true;
    saveState();
    renderStats();
    refreshHeader();
    showToast("打卡成功，连续 " + currentStreak() + " 天 🎉", 3000);
  }

  /* ---------------- 顶部与页面导航 ---------------- */

  function refreshHeader() {
    const dateEl = $id("headerDate");
    const goalEl = $id("headerGoal");
    const streakEl = $id("headerStreak");
    if (dateEl) {
      const d = new Date();
      dateEl.textContent =
        d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 " +
        "星期" + weekdayCN(d.getDay());
    }
    if (goalEl) {
      goalEl.textContent = countToday() + " / " + app.state.settings.dailyGoal;
    }
    if (streakEl) {
      streakEl.textContent = "连续 " + currentStreak() + " 天";
    }
  }

  function go(page) {
    app.currentPage = page;
    const navBtns = document.querySelectorAll(".nav-btn");
    for (let i = 0; i < navBtns.length; i++) {
      navBtns[i].classList.toggle("active", navBtns[i].dataset.page === page);
    }
    const pages = document.querySelectorAll(".page");
    for (let i = 0; i < pages.length; i++) {
      pages[i].classList.toggle("active", pages[i].id === "page-" + page);
    }
    if (page === "home") {
      if (app.homeView === "flash" && !app.flash) app.homeView = "select";
      if (app.homeView === "passageRead" && !app.readingPassageId) {
        app.homeView = "passageList";
      }
      renderHome();
    } else if (page === "stats") {
      renderStats();
    } else if (page === "settings") {
      renderSettings();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function startFlash(bank) {
    app.selectedBank = bank;
    app.state.settings.activeBank = bank;
    const pool = (app.bankWords[bank] || []).filter(function (obj) {
      const rec = app.state.wordStates[obj.key];
      return !(rec && rec.known === true);
    });
    if (!pool.length) {
      app.homeView = "flash";
      app.flash = {
        bank: bank,
        queue: [],
        index: 0,
        revealed: false,
        done: true
      };
    } else {
      app.homeView = "flash";
      app.flash = {
        bank: bank,
        queue: shuffle(pool),
        index: 0,
        revealed: false,
        done: false
      };
    }
    saveState();
    renderHome();
  }

  /* ---------------- 首页渲染 ---------------- */

  function renderHome() {
    refreshHeader();
    const box = $id("homeContent");
    if (!window.VOCAB_DATA || !window.VOCAB_DATA.length) {
      box.innerHTML =
        '<div class="card empty-tip">词库文件加载失败，请确认 js/data/words.js 存在。</div>';
      return;
    }
    if (app.homeView === "flash") renderFlash(box);
    else if (app.homeView === "passageList") renderPassageList(box);
    else if (app.homeView === "passageRead") renderPassageRead(box);
    else renderHomeSelect(box);
  }

  function renderHomeSelect(box) {
    const html =
      '<p class="section-title">选择词库</p>' +
      '<div class="bank-grid">' +
      BANK_ORDER.map(function (bank) {
        const selected = app.selectedBank === bank ? " selected" : "";
        return (
          '<button class="bank-card' + selected + '" data-action="selectBank" data-bank="' +
          bank + '">' +
          '<div class="bank-name">' + escapeHtml(BANK_LABELS[bank]) + "</div>" +
          '<div class="bank-count">' + bankTotal(bank) + " 词</div>" +
          "</button>"
        );
      }).join("") +
      "</div>" +
      '<p class="section-title">选择学习方式</p>' +
      '<div class="mode-grid">' +
      '<button class="mode-card" data-action="startFlash" data-bank="' + app.selectedBank + '">' +
      '<div class="mode-icon">🗂️</div><h3>逐个单词学</h3>' +
      "<p>看单词回忆释义，点开确认后标记掌握程度</p>" +
      "</button>" +
      '<button class="mode-card" data-action="showPassages" data-bank="' + app.selectedBank + '">' +
      '<div class="mode-icon">📖</div><h3>通过短文学习</h3>' +
      "<p>读英文短文，点文章里的重点词看释义</p>" +
      "</button>" +
      "</div>" +
      '<p class="muted center">今日已学 <strong>' + countToday() +
      "</strong> 词，目标 " + app.state.settings.dailyGoal +
      " 词 · 当天单词两种方式去重计数</p>";
    box.innerHTML = html;
  }

  function currentWord() {
    const f = app.flash;
    return f.queue[f.index];
  }

  function renderFlash(box) {
    const f = app.flash;
    const bank = f.bank;
    const back =
      '<div class="back-row"><button class="back-btn" data-action="backSelect">← 返回选词</button>' +
      '<span class="muted">' + escapeHtml(BANK_LABELS[bank]) + "</span></div>";

    if (f.done || !f.queue.length) {
      box.innerHTML =
        back +
        '<div class="card center">' +
        '<h2>本轮完成</h2>' +
        '<p class="muted">今日已学 ' + countToday() + " / " + app.state.settings.dailyGoal + " 词</p>" +
        '<div class="btn-row" style="justify-content:center">' +
        '<button class="btn primary" data-action="restartFlash" data-bank="' + bank + '">再学一轮</button>' +
        '<button class="btn" data-action="backSelect">换个词库</button>' +
        "</div></div>";
      return;
    }

    const item = currentWord();
    const seen = f.index;
    const total = f.queue.length;
    const progress = total ? Math.round((seen / total) * 100) : 0;
    const phonetic = item.phonetic ? "/" + item.phonetic + "/" : "";
    const speakHtml =
      typeof speechSynthesis !== "undefined"
        ? '<button class="speak-btn" data-action="speak" data-word="' +
          escapeHtml(item.word) + '">🔊 发音</button>'
        : "";

    box.innerHTML =
      back +
      '<div class="card">' +
      '<div class="flash-top">' +
      "<div>" +
      '<strong>第 ' + (seen + 1) + " 个</strong> / 本批 " + total + " 个" +
      "</div>" +
      '<div class="flash-progress">今日已学 <strong>' + countToday() + "</strong> / " +
      app.state.settings.dailyGoal + "</div>" +
      "</div>" +
      '<div class="flash-bar"><i style="width:' + progress + '%"></i></div>' +
      '<div class="word-card">' +
      '<div class="word-main">' + escapeHtml(item.word) + "</div>" +
      (phonetic
        ? '<div class="word-phonetic">' + escapeHtml(phonetic) + speakHtml + "</div>"
        : '<div class="word-phonetic">' + speakHtml + "</div>") +
      (f.revealed
        ? '<div class="word-def">' + escapeHtml(item.def) + "</div>"
        : '<div class="reveal-area"><button class="btn primary" data-action="flashReveal">先想想，再显示释义</button></div>') +
      "</div>" +
      (f.revealed
        ? '<div class="rate-row">' +
          '<button class="rate-btn good" data-action="flashRate" data-rate="known">认识</button>' +
          '<button class="rate-btn mid" data-action="flashRate" data-rate="fuzzy">模糊</button>' +
          '<button class="rate-btn bad" data-action="flashRate" data-rate="again">再学</button>' +
          "</div>"
        : "") +
      "</div>" +
      '<p class="muted center">提示：看完释义并点一个掌握程度后，该词会计入今日学习。</p>';
  }

  function renderPassageList(box) {
    const bank = app.selectedBank;
    const builtins = (window.PASSAGES || []).filter(function (p) {
      return p.bank === bank;
    });
    const customs = (app.state.customPassages || []).filter(function (p) {
      return p.bank === bank || p.bank === "all";
    });
    const all = builtins.concat(customs);
    const items = all.length
      ? all.map(function (p) {
          const customHtml = p.userPassage
            ? '<span class="chip">自建</span>' +
              '<button class="btn ghost" style="padding:2px 10px;font-size:12px" data-action="deletePassage" data-id="' +
              escapeHtml(p.id) + '">删除</button>'
            : "";
          return (
            '<div class="article-list-item" role="button" data-action="openPassage" data-id="' +
            escapeHtml(p.id) + '">' +
            '<h4>' + escapeHtml(p.title) + customHtml + "</h4>" +
            '<div class="muted">重点词 ' + (p.targets || []).length + " 个 · 点击文章中的高亮词查看释义并计入今日学习</div>" +
            "</div>"
          );
        }).join("")
      : '<div class="empty-tip">该词库还没有短文，可到“设置”自行添加。</div>';

    box.innerHTML =
      '<div class="back-row">' +
      '<button class="back-btn" data-action="backSelect">← 返回选词</button>' +
      '<span class="muted">' + escapeHtml(BANK_LABELS[bank]) + " · 短文</span>" +
      "</div>" +
      '<div class="card">' + items + "</div>" +
      '<button class="btn block ghost" data-action="showPassageForm">＋ 添加一篇自己的短文</button>';
  }

  function findPassage(id) {
    const builtins = window.PASSAGES || [];
    for (let i = 0; i < builtins.length; i++) {
      if (builtins[i].id === id) return builtins[i];
    }
    const customs = app.state.customPassages || [];
    for (let i = 0; i < customs.length; i++) {
      if (customs[i].id === id) return customs[i];
    }
    return null;
  }

  function renderPassageRead(box) {
    const passage = findPassage(app.readingPassageId);
    if (!passage) {
      app.homeView = "passageList";
      renderHome();
      return;
    }
    const today = getToday();
    let clickedCount = 0;
    const targets = passage.targets || [];
    for (let i = 0; i < targets.length; i++) {
      if (today.byMode.passage.indexOf(normalizeKey(targets[i])) > -1) {
        clickedCount++;
      }
    }
    box.innerHTML =
      '<div class="back-row">' +
      '<button class="back-btn" data-action="passageBack">← 返回文章列表</button>' +
      "</div>" +
      '<div class="card">' +
      "<h2>" + escapeHtml(passage.title) + "</h2>" +
      '<div class="passage-meta">' +
      '<span class="chip">' + escapeHtml(BANK_LABELS[passage.bank] || "通用") + "</span>" +
      '<span class="chip">重点词 ' + targets.length + " 个</span>" +
      '<span class="chip">已读标记 ' + clickedCount + " / " + targets.length + "</span>" +
      "</div>" +
      '<div class="passage-text" id="passageText"></div>' +
      '<div class="passage-done">' +
      '<span class="muted">点击高亮词查看释义后自动计入今日学习</span>' +
      '<button class="btn primary" data-action="goStats">去打卡统计</button>' +
      "</div>" +
      "</div>";

    const holder = $id("passageText");
    renderPassageContent(holder, passage);
  }

  function renderPassageContent(holder, passage) {
    const content = passage.content || "";
    const targets = (passage.targets || []).slice().sort(function (a, b) {
      return b.length - a.length;
    });
    if (!targets.length) {
      holder.textContent = content;
      return;
    }
    const pattern = new RegExp(
      "\\b(" + targets.map(function (t) { return escapeRegExp(normalizeKey(t)); }).join("|") + ")\\b",
      "gi"
    );
    const parts = content.split(pattern);
    const today = getToday();
    for (let i = 0; i < parts.length; i++) {
      const text = parts[i];
      if (!text) continue;
      if (i % 2 === 1) {
        const key = normalizeKey(text);
        const learned = today.byMode.passage.indexOf(key) > -1;
        const span = document.createElement("span");
        span.className = "term" + (learned ? " learned" : "");
        span.dataset.word = key;
        span.textContent = text;
        holder.appendChild(span);
      } else {
        holder.appendChild(document.createTextNode(text));
      }
    }
  }

  /* ---------------- 短文交互 ---------------- */

  function openPassage(id) {
    const passage = findPassage(id);
    if (!passage) return;
    app.readingPassageId = id;
    app.homeView = "passageRead";
    renderHome();
  }

  function onTermClick(termEl) {
    const word = termEl.dataset.word;
    const info = lookupWord(word);
    if (!info) {
      showToast("「" + word + "」未在内置词库中，可到设置里添加该单词");
      return;
    }
    const beforeCount = countToday();
    const firstToday = !isLearnedToday(word);
    markWordLearned(word, "passage");
    termEl.classList.add("learned");
    openWordModal(info, "passage", firstToday);
    const afterCount = countToday();
    if (afterCount > beforeCount) {
      showToast("已通过短文学习 " + info.word);
    } else {
      showToast("今天已学过 " + info.word);
    }
    renderHomePassageStatsOnly();
  }

  function renderHomePassageStatsOnly() {
    if (app.currentPage !== "home" || app.homeView !== "passageRead") return;
    const passage = findPassage(app.readingPassageId);
    if (!passage) return;
    const chips = document.querySelectorAll(".passage-meta .chip");
    if (!chips.length) return;
    const today = getToday();
    const targets = passage.targets || [];
    let clicked = 0;
    for (let i = 0; i < targets.length; i++) {
      if (today.byMode.passage.indexOf(normalizeKey(targets[i])) > -1) clicked++;
    }
    if (chips.length >= 3) {
      chips[2].textContent = "已读标记 " + clicked + " / " + targets.length;
    }
    refreshHeader();
  }

  function openWordModal(info, source, firstToday) {
    const phonetic = info.phonetic ? "/" + info.phonetic + "/" : "";
    const speakHtml =
      typeof speechSynthesis !== "undefined"
        ? '<button class="speak-btn" data-action="speak" data-word="' +
          escapeHtml(info.word) + '">🔊 发音</button>'
        : "";
    const note =
      source === "passage"
        ? firstToday
          ? '<p class="muted">已计入今日“短文学习”</p>'
          : '<p class="muted">该词今天已经学过了，不重复计数</p>'
        : "";
    showModal(
      '<div class="center">' +
        '<div class="word-main" style="font-size:34px">' + escapeHtml(info.word) + "</div>" +
        (phonetic
          ? '<div class="word-phonetic">' + escapeHtml(phonetic) + speakHtml + "</div>"
          : '<div class="word-phonetic">' + speakHtml + "</div>") +
        '<div class="word-def">' + escapeHtml(info.def) + "</div>" +
        note +
        '<button class="btn primary block big" data-action="closeModal">继续</button>' +
        "</div>"
    );
  }

  /* ---------------- 统计页 ---------------- */

  function renderStats() {
    refreshHeader();
    const box = $id("statsContent");
    const today = getToday();
    const goal = app.state.settings.dailyGoal;
    const count = today.words.length;
    const flashCount = today.byMode.flash.length;
    const passageCount = today.byMode.passage.length;
    const percent = goal ? Math.min(100, Math.round((count / goal) * 100)) : 0;
    const remaining = Math.max(0, goal - count);

    const checkinHtml = today.checked
      ? '<div class="checkin-card card"><span class="done-text">✓ 今日已打卡</span>' +
        '<p class="muted">连续打卡 ' + currentStreak() + " 天</p></div>"
      : '<div class="checkin-card card">' +
        (canCheckin()
          ? '<button class="btn good big" data-action="checkin">今日打卡</button>' +
            '<p class="muted">今日目标已达成，点此打卡</p>'
          : '<button class="btn big" disabled>今日打卡</button>' +
            "<p class='muted'>还差 " + remaining + " 个单词即可打卡</p>") +
        "</div>";

    box.innerHTML =
      '<div class="stats-summary">' +
      '<div class="card">' +
      "<h2>今日学习</h2>" +
      '<div class="big-num">' + count + "</div>" +
      '<div class="muted">目标 ' + goal + " 个单词</div>" +
      '<div class="progress-track" style="margin-top:12px"><div class="progress-fill' +
      (count >= goal ? " done" : "") + '" style="width:' + percent + '%"></div></div>' +
      '<div class="mode-break">' +
      '<div class="mode-line"><span>逐词学习</span><strong>' + flashCount + " 词</strong></div>" +
      '<div class="mode-line"><span>短文学习</span><strong>' + passageCount + " 词</strong></div>" +
      '<div class="mode-line"><span>去重合计</span><strong>' + count + " 词</strong></div>" +
      "</div>" +
      "</div>" +
      checkinHtml +
      "</div>" +
      '<div class="card">' +
      "<h3>" + new Date().getFullYear() + " 年 " + (new Date().getMonth() + 1) + " 月打卡</h3>" +
      '<div id="calendar"></div>' +
      "</div>" +
      '<div class="card">' +
      "<h3>最近 30 天</h3>" +
      '<div class="recent30" id="recent30"></div>' +
      '<p class="muted">数字为该日学习的去重单词数；绿色为已打卡</p>' +
      "</div>";
    renderCalendar($id("calendar"));
    renderRecent30($id("recent30"));
  }

  function renderCalendar(el) {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const first = new Date(y, m, 1);
    const offset = first.getDay();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const set = checkedSet();
    const cells = [];
    const heads = [];
    for (let w = 0; w < 7; w++) {
      heads.push('<div class="cal-head">' + weekdayCN(w) + "</div>");
    }
    for (let i = 0; i < offset; i++) {
      cells.push('<div class="cal-day"></div>');
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const key = y + "-" + pad2(m + 1) + "-" + pad2(d);
      const day = app.state.days[key];
      const isToday = key === todayKey();
      const future = new Date(y, m, d) > now;
      const cls = ["cal-day"];
      if (future) cls.push("future");
      if (day && day.words.length) cls.push("has-data");
      if (set[key]) cls.push("checked");
      if (isToday) cls.push("today");
      const dot =
        day && day.words.length && !set[key]
          ? '<span class="day-dot"></span>'
          : "";
      cells.push(
        '<div class="' + cls.join(" ") + '" title="' +
          (day && day.words.length ? "学过 " + day.words.length + " 词" : "未学习") +
          (set[key] ? "，已打卡" : "") + '"><span class="day-num">' + d + "</span>" + dot + "</div>"
      );
    }
    el.innerHTML =
      '<div class="calendar-grid">' + heads.join("") + cells.join("") + "</div>";
  }

  function renderRecent30(el) {
    const set = checkedSet();
    const html = [];
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const d = shiftDate(today, -i);
      const key = dateKey(d);
      const day = app.state.days[key];
      const cls = ["rday"];
      if (day && day.words.length) cls.push("has-data");
      if (set[key]) cls.push("checked");
      html.push(
        '<div class="' + cls.join(" ") + '" title="' +
          (day && day.words.length ? day.words.length + " 词" : "未学习") +
          (set[key] ? "，已打卡" : "") + '">' +
          (day && day.words.length ? day.words.length : "·") +
          '<div class="rdate">' + (d.getMonth() + 1) + "/" + d.getDate() + "</div>" +
          "</div>"
      );
    }
    el.innerHTML = html.join("");
  }

  /* ---------------- 设置页 ---------------- */

  function renderSettings() {
    refreshHeader();
    const box = $id("settingsContent");
    const goal = app.state.settings.dailyGoal;
    const customWords = (app.state.customWords || []).map(function (w) {
      return (
        '<div class="stat-item"><span><strong>' + escapeHtml(w.word) +
        "</strong> <span class='muted'>" + escapeHtml(w.def) + "</span></span>" +
        '<button class="btn ghost" data-action="deleteWord" data-key="' +
        escapeHtml(normalizeKey(w.word)) + '" style="padding:4px 10px">删除</button></div>'
      );
    }).join("");

    box.innerHTML =
      '<div class="card"><h2>每日目标</h2>' +
      '<div class="settings-row"><label for="goalInput">每天学习多少个单词后可以打卡？</label>' +
      '<div class="btn-row"><input id="goalInput" class="input" type="number" min="1" max="500" value="' +
      goal + '" style="max-width:130px">' +
      '<button class="btn primary" id="saveGoalBtn">保存目标</button></div></div>' +
      '<div id="goalMsg" class="muted"></div></div>' +

      '<div class="card"><h2>词库统计</h2>' +
      BANK_ORDER.map(function (bank) {
        const known = (app.bankWords[bank] || []).filter(function (o) {
          const r = app.state.wordStates[o.key];
          return r && r.known === true;
        }).length;
        return (
          '<div class="kv-line"><span>' + escapeHtml(BANK_LABELS[bank]) + "</span>" +
          "<span>" + bankTotal(bank) + " 词 · 已掌握 " + known + "</span></div>"
        );
      }).join("") +
      "</div>" +

      '<div class="card"><h2>添加自定义单词</h2>' +
      '<form id="addWordForm"><div class="form-grid">' +
      '<div class="settings-row"><label>单词 *</label><input class="input" name="word" required placeholder="例如：society"></div>' +
      '<div class="settings-row"><label>中文释义 *</label><input class="input" name="def" required placeholder="例如：n. 社会"></div>' +
      '<div class="settings-row"><label>音标（可选）</label><input class="input" name="phonetic" placeholder="例如：/səˈsaɪəti/"></div>' +
      '<div class="settings-row"><label>加入词库</label><select class="select" name="bank">' +
      '<option value="all">全部（考研/四级/六级）</option>' +
      BANK_ORDER.map(function (b) {
        return '<option value="' + b + '">' + escapeHtml(BANK_LABELS[b]) + "</option>";
      }).join("") +
      "</select></div>" +
      "</div>" +
      '<button class="btn primary block" type="submit">添加单词</button>' +
      '<div id="addWordMsg" class="muted"></div></form>' +
      (customWords
        ? "<hr>" + customWords
        : '<p class="muted">还没有自定义单词</p>') +
      "</div>" +

      '<div class="card"><h2>添加自己的英文短文</h2>' +
      '<form id="addPassageForm"><div class="form-grid">' +
      '<div class="settings-row"><label>标题 *</label><input class="input" name="title" required placeholder="例如：我的第一篇文章"></div>' +
      '<div class="settings-row"><label>所属词库</label><select class="select" name="bank">' +
      BANK_ORDER.map(function (b) {
        return '<option value="' + b + '"' + (app.selectedBank === b ? " selected" : "") + ">" +
          escapeHtml(BANK_LABELS[b]) + "</option>";
      }).join("") +
      '<option value="all">通用（所有词库可见）</option>' +
      "</select></div>" +
      '<div class="settings-row"><label>正文 *</label><textarea class="textarea" name="content" required placeholder="粘贴英文短文正文"></textarea></div>' +
      '<div class="settings-row"><label>重点词（用逗号或空格分隔，需与正文单词一致）*</label>' +
      '<textarea class="textarea" name="targets" required style="min-height:60px" placeholder="例如：society, environment, challenge"></textarea></div>' +
      "</div>" +
      '<button class="btn primary block" type="submit">保存短文</button>' +
      '<div id="addPassageMsg" class="muted"></div></form></div>' +

      '<div class="card"><h2>数据备份</h2>' +
      '<div class="btn-row">' +
      '<button class="btn" id="exportBtn">导出备份 JSON</button>' +
      '<button class="btn" id="importBtn">导入备份</button>' +
      '<input type="file" id="importFile" accept="application/json,.json" hidden>' +
      "</div>" +
      '<p class="muted">学习记录保存在当前浏览器里，建议定期导出；换浏览器或清理缓存前请先备份。</p></div>' +

      '<div class="card"><h2>危险操作</h2>' +
      '<button class="btn danger" data-action="resetAll">清空全部学习记录</button>' +
      '<p class="muted">只清空浏览器中的进度与自定义内容，不会删除内置词库文件。</p></div>';

    bindSettingsForms();
  }

  function bindSettingsForms() {
    const goalBtn = $id("saveGoalBtn");
    if (goalBtn) {
      goalBtn.addEventListener("click", function () {
        const input = $id("goalInput");
        let v = Math.round(Number(input.value));
        if (!isFinite(v) || v < 1) v = 1;
        if (v > 500) v = 500;
        input.value = v;
        app.state.settings.dailyGoal = v;
        saveState();
        $id("goalMsg").textContent = "每日目标已设为 " + v + " 词";
        refreshHeader();
      });
    }

    const addWordForm = $id("addWordForm");
    if (addWordForm) {
      addWordForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const fd = new FormData(addWordForm);
        const word = String(fd.get("word") || "").trim();
        const def = String(fd.get("def") || "").trim();
        const phonetic = String(fd.get("phonetic") || "").trim();
        const bank = String(fd.get("bank") || "all");
        if (!word || !def) return;
        const key = normalizeKey(word);
        if (lookupWord(key)) {
          $id("addWordMsg").textContent = "「" + word + "」已经在词库中，无需重复添加。";
          return;
        }
        const banks =
          bank === "all"
            ? BANK_ORDER.slice()
            : BANK_ORDER.indexOf(bank) > -1 ? [bank] : [];
        app.state.customWords.push({
          word: word,
          def: def,
          phonetic: phonetic,
          banks: banks
        });
        saveState();
        initWordIndex();
        addWordForm.reset();
        showToast("已添加自定义单词 " + word);
        renderSettings();
      });
    }

    const addPassageForm = $id("addPassageForm");
    if (addPassageForm) {
      addPassageForm.addEventListener("submit", function (e) {
        e.preventDefault();
        const fd = new FormData(addPassageForm);
        const title = String(fd.get("title") || "").trim();
        const bank = String(fd.get("bank") || "all");
        const content = String(fd.get("content") || "").trim();
        const targets = String(fd.get("targets") || "")
          .split(/[,，、\s]+/)
          .map(function (s) { return s.trim(); })
          .filter(Boolean);
        const msg = $id("addPassageMsg");
        if (!title || !content || !targets.length) {
          msg.textContent = "标题、正文和重点词都不能为空。";
          return;
        }
        const plain = content.toLowerCase();
        for (let i = 0; i < targets.length; i++) {
          const t = normalizeKey(targets[i]);
          if (!t) continue;
          const info = lookupWord(t);
          if (!info) {
            msg.textContent = "「" + targets[i] +
              "」不在内置词库中，请先在上方“添加自定义单词”里补上。";
            return;
          }
          const re = new RegExp("\\b" + escapeRegExp(t) + "\\b");
          if (!re.test(plain)) {
            msg.textContent = "「" + targets[i] + "」没有以完整单词形式出现在正文里，请检查。";
            return;
          }
        }
        const id = "user-" + Date.now().toString(36);
        app.state.customPassages.push({
          id: id,
          bank: bank,
          title: title,
          content: content,
          targets: targets,
          userPassage: true
        });
        saveState();
        showToast("短文已保存，可以在学习页找到它");
        if (bank !== "all") app.selectedBank = bank;
        app.state.settings.activeBank =
          bank !== "all" ? bank : app.selectedBank;
        saveState();
        app.homeView = "passageList";
        app.readingPassageId = null;
        go("home");
      });
    }

    const exportBtn = $id("exportBtn");
    if (exportBtn) {
      exportBtn.addEventListener("click", exportBackup);
    }
    const importBtn = $id("importBtn");
    const fileInput = $id("importFile");
    if (importBtn && fileInput) {
      importBtn.addEventListener("click", function () {
        fileInput.click();
      });
      fileInput.addEventListener("change", function () {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = function () {
          try {
            const data = JSON.parse(String(reader.result));
            importBackup(data);
          } catch (err) {
            showToast("备份文件解析失败，请确认是导出的 JSON");
          }
        };
        reader.readAsText(file, "utf-8");
        fileInput.value = "";
      });
    }
  }

  function exportBackup() {
    app.state.exportedAt = new Date().toISOString();
    saveState();
    const blob = new Blob([JSON.stringify(app.state, null, 2)], {
      type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "单词打卡备份-" + todayKey() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("已导出备份文件");
  }

  function importBackup(data) {
    if (!data || typeof data !== "object") {
      showToast("备份内容无效");
      return;
    }
    const base = defaultState();
    app.state = {
      version: 1,
      settings: Object.assign({}, base.settings, data.settings || {}),
      days: data.days && typeof data.days === "object" ? data.days : {},
      wordStates:
        data.wordStates && typeof data.wordStates === "object" ? data.wordStates : {},
      customWords: Array.isArray(data.customWords) ? data.customWords : [],
      customPassages: Array.isArray(data.customPassages) ? data.customPassages : [],
      exportedAt: data.exportedAt || new Date().toISOString()
    };
    initWordIndex();
    saveState();
    refreshHeader();
    renderSettings();
    showToast("备份导入成功");
  }

  /* ---------------- 弹窗 ---------------- */

  function showModal(html) {
    $id("modalBody").innerHTML = html;
    $id("modal").classList.remove("hidden");
  }

  function closeModal() {
    $id("modal").classList.add("hidden");
    $id("modalBody").innerHTML = "";
  }

  /* ---------------- 全局事件 ---------------- */

  function handleAction(el) {
    const action = el.dataset.action;
    const bank = el.dataset.bank;
    switch (action) {
      case "selectBank":
        app.selectedBank = bank;
        app.state.settings.activeBank = bank;
        saveState();
        renderHome();
        break;
      case "startFlash":
        startFlash(bank || app.selectedBank);
        break;
      case "showPassages":
        app.selectedBank = bank || app.selectedBank;
        app.homeView = "passageList";
        renderHome();
        break;
      case "showPassageForm":
        go("settings");
        setTimeout(function () {
          const form = $id("addPassageForm");
          if (form) form.scrollIntoView({ behavior: "smooth", block: "center" });
        }, 80);
        break;
      case "backSelect":
        app.homeView = "select";
        app.flash = null;
        app.readingPassageId = null;
        renderHome();
        break;
      case "flashReveal":
        if (app.flash) {
          app.flash.revealed = true;
          renderFlash($id("homeContent"));
        }
        break;
      case "flashRate": {
        const rate = el.dataset.rate;
        const item = currentWord();
        if (!item) return;
        markWordLearned(item.key, "flash");
        updateWordState(
          item.key,
          rate === "known" ? true : rate === "fuzzy" ? null : false
        );
        app.flash.revealed = false;
        app.flash.index++;
        if (app.flash.index >= app.flash.queue.length) {
          app.flash.done = true;
        }
        renderFlash($id("homeContent"));
        break;
      }
      case "restartFlash":
        startFlash(el.dataset.bank || app.selectedBank);
        break;
      case "openPassage":
        openPassage(el.dataset.id);
        break;
      case "passageBack":
        app.homeView = "passageList";
        app.readingPassageId = null;
        renderHome();
        break;
      case "deletePassage": {
        const id = el.dataset.id;
        const p = findPassage(id);
        if (p && p.userPassage && confirm("确定删除短文《" + p.title + "》？")) {
          app.state.customPassages = app.state.customPassages.filter(function (x) {
            return x.id !== id;
          });
          saveState();
          renderHome();
          showToast("短文已删除");
        }
        break;
      }
      case "deleteWord": {
        const key = el.dataset.key;
        if (confirm("确定删除自定义单词「" + key + "」？")) {
          app.state.customWords = app.state.customWords.filter(function (w) {
            return normalizeKey(w.word) !== key;
          });
          saveState();
          initWordIndex();
          renderSettings();
          showToast("单词已删除");
        }
        break;
      }
      case "checkin":
        doCheckin();
        break;
      case "goStats":
        go("stats");
        break;
      case "speak": {
        const word = el.dataset.word;
        if (typeof speechSynthesis !== "undefined" && word) {
          speechSynthesis.cancel();
          const u = new SpeechSynthesisUtterance(word);
          u.lang = "en-US";
          u.rate = 0.9;
          speechSynthesis.speak(u);
        }
        break;
      }
      case "resetAll":
        if (
          confirm(
            "确定清空全部学习记录吗？包括打卡、进度和自定义内容。建议先导出备份。"
          )
        ) {
          app.state = defaultState();
          saveState();
          initWordIndex();
          refreshHeader();
          renderSettings();
          showToast("已清空全部记录");
        }
        break;
      case "closeModal":
        closeModal();
        break;
    }
  }

  document.addEventListener("click", function (e) {
    const modal = $id("modal");
    if (modal && e.target === modal) {
      closeModal();
      return;
    }
    const term = e.target.closest(".term");
    if (term && app.homeView === "passageRead") {
      onTermClick(term);
      return;
    }
    const actionEl = e.target.closest("[data-action]");
    if (actionEl) handleAction(actionEl);
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeModal();
  });

  $id("brandBtn").addEventListener("click", function () {
    go("home");
  });

  $id("modalClose").addEventListener("click", closeModal);

  const nav = document.getElementById("topNav");
  nav.addEventListener("click", function (e) {
    const btn = e.target.closest(".nav-btn");
    if (btn) go(btn.dataset.page);
  });

  /* ---------------- 启动 ---------------- */

  app.state = loadState();
  app.selectedBank =
    BANK_ORDER.indexOf(app.state.settings.activeBank) > -1
      ? app.state.settings.activeBank
      : "kaoyan";
  initWordIndex();
  refreshHeader();
  renderHome();

  const footer = $id("appFooter");
  const total = (window.VOCAB_META && window.VOCAB_META.total_unique) || 0;
  footer.innerHTML =
    "词库共收录去重词条 " + total +
    " 个；数据整理自开源项目 " +
    '<a href="https://github.com/KyleBing/english-vocabulary" target="_blank" rel="noopener">KyleBing/english-vocabulary</a> 与 ' +
    '<a href="https://github.com/kajweb/dict" target="_blank" rel="noopener">kajweb/dict</a>，仅供学习交流。' +
    "学习进度仅保存在本机浏览器中。";
})();
