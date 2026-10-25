const state = {
  started: false,
  demo: true,
  storySeconds: 0,
  lastTick: 0,
  currentApp: null,
  currentThread: null,
  firedEvents: new Set(),
  ended: false,
  unread: 1,
};

const STORAGE_KEY = "nozue-phone-v5";
const TOTAL_STORY_SECONDS = 15 * 60;
let pinBuffer = "";

const togawaHistory = [
  { mine: true, text: "外川，周日上午有安排吗？", time: "周四 20:13" },
  { mine: false, text: "目前没有。", time: "20:14" },
  { mine: true, text: "上次说的店还没去成。我只是突然想起来。", time: "20:16" },
  { mine: false, text: "我两天前已经查过排队时间。", time: "20:16" },
  { mine: true, text: "……你准备得比‘突然’早。", time: "20:18" },
  { mine: false, text: "十一点前到比较好。", time: "20:18" },
  { sep: "上周日" },
  { mine: true, text: "剩下的菜吃完了吗？", time: "09:22" },
  { mine: false, text: "吃完了。米也没有剩。", time: "09:25" },
  { mine: true, text: "那个饭量，米当然不会剩。", time: "09:27" },
  { mine: false, text: "所以下次请多煮一点。", time: "09:28" },
  { mine: true, text: "你已经把下次也决定好了？", time: "09:29" },
  { mine: false, text: "野末先生没有反对。", time: "09:29" },
  { sep: "今天" },
];

const workHistory = [
  { mine: false, text: "修订稿已上传。给大家添麻烦了。", time: "17:58" },
  { mine: true, text: "看到了。问题不大，周一一起确认。今天先下班。", time: "18:03" },
  { mine: false, text: "收到，课长辛苦了。", time: "18:04" },
];

const peerHistory = [
  { mine: false, text: "你最近气色不错。所谓的抗老化活动这么有效？", time: "昨天 12:11" },
  { mine: true, text: "只是偶尔去吃点以前不会去的东西。", time: "12:14" },
  { mine: false, text: "偶尔？你这周已经第三次提到外川了。", time: "12:15" },
  { mine: true, text: "身为课长，记得部下很正常吧。", time: "12:17" },
];

const sisterHistory = [
  { sep: "昨天" },
  { mine: false, text: "最近是不是又忙到不好好吃饭？", time: "21:08" },
  { mine: true, text: "有按时吃。", time: "21:12" },
  { mine: false, text: "这次回答得这么快，反而很可疑。", time: "21:13" },
];

const friendHistory = [
  { sep: "昨天" },
  { mine: false, text: "你最近周末安排很多啊。", time: "19:31" },
  { mine: true, text: "只是偶尔出门。", time: "19:36" },
  { mine: false, text: "偶尔会提前两天查排队时间？", time: "19:38" },
];

const nakamuraHistory = [
  { sep: "今天" },
  { mine: false, text: "课长，修订部分我已经标出来了。", time: "16:34" },
  { mine: true, text: "谢谢。周一再一起确认。", time: "16:40" },
];

const familyHistory = [
  { sep: "10月18日" },
  { mine: false, text: "天气转凉了，记得加衣服。", time: "08:12" },
  { mine: true, text: "知道了。你们也是。", time: "08:26" },
];

const shopHistory = [
  { sep: "周四" },
  { mine: false, text: "您周日上午十一点的双人座已确认。", time: "14:03" },
  { mine: true, text: "谢谢。", time: "14:06" },
];

const photos = [
  { art: "dessert-art", caption: "两份甜点 · 两周前" },
  { art: "window-art", caption: "甜品店橱窗 · 两周前" },
  { art: "zoo-art", caption: "动物园 · 上周" },
  { art: "market-art", caption: "超市 · 上周" },
  { art: "dinner-art", caption: "晚饭 · 上周" },
  { art: "blur-art", caption: "拍摄失败 · 今天" },
  { art: "sunset-art", caption: "车站外 · 今天" },
  { art: "papers-art", caption: "会议资料 · 今天" },
  { art: "train-art", caption: "回程电车 · 今天" },
  { art: "receipt-art", caption: "甜品店小票 · 周四" },
  { art: "rain-art", caption: "窗外的雨 · 上周" },
  { art: "coffee-art", caption: "咖啡 · 上周" },
];

const eventSchedule = [
  { at: 65, id: "msg1", run: () => incoming("外川", "野末先生，到家了吗？") },
  { at: 130, id: "work", run: () => notify("营业课工作群", "修订稿已上传，周一确认。", "工", { app: "messages", thread: "work" }) },
  { at: 255, id: "weather", run: () => notify("天气", "明日下午可能有短时雨。", "雨", { app: "weather" }) },
  { at: 315, id: "msg2", run: () => incoming("外川", "如果已经上车，不用急着回。到家后告诉我一声。") },
  { at: 390, id: "peer", run: () => notify("同期同事", "你今天又和外川出去了？", "同", { app: "messages", thread: "peer" }) },
  { at: 630, id: "missed", run: () => notify("未接来电", "陌生号码 · 可能来自附近店铺", "电", { app: "phone" }) },
  { at: 690, id: "msg3", run: () => incoming("外川", "我问过店里了。手机可能落在车站附近。我过去看看。") },
  { at: 795, id: "ambient", run: () => notify("车站广播", "下一班列车预计两分钟后到站。", "站", { app: "maps" }) },
  { at: 850, id: "precall", run: vibrateNotice },
  { at: 900, id: "call", run: endStory },
];

const els = {
  lockView: document.getElementById("lockView"),
  homeView: document.getElementById("homeView"),
  appView: document.getElementById("appView"),
  appContent: document.getElementById("appContent"),
  appTitle: document.getElementById("appTitle"),
  appKicker: document.getElementById("appKicker"),
  statusBar: document.getElementById("statusBar"),
  messageBadge: document.getElementById("messageBadge"),
  stack: document.getElementById("notificationStack"),
  toast: document.getElementById("toast"),
  callOverlay: document.getElementById("callOverlay"),
  pinPanel: document.getElementById("pinPanel"),
  island: document.querySelector(".dynamic-island"),
};

document.getElementById("enterButton").addEventListener("click", showPin);
document.getElementById("modeButton").addEventListener("click", toggleMode);
document.getElementById("pinCancel").addEventListener("click", hidePin);
document.querySelectorAll("[data-digit]").forEach(button => button.addEventListener("click", () => pressDigit(button.dataset.digit)));
document.getElementById("backButton").addEventListener("click", goBack);
document.getElementById("homeButton").addEventListener("click", showHome);
document.getElementById("returnHomeButton").addEventListener("click", () => {
  els.callOverlay.classList.remove("open");
  els.callOverlay.setAttribute("aria-hidden", "true");
  showHome();
});
document.getElementById("restartButton").addEventListener("click", restartStory);
document.querySelectorAll(".app-button").forEach(button => button.addEventListener("click", () => openApp(button.dataset.app)));

function toggleMode(event) {
  event.stopPropagation();
  state.demo = !state.demo;
  const button = document.getElementById("modeButton");
  button.textContent = state.demo ? "试玩 · 90 秒" : "完整 · 15 分钟";
  button.setAttribute("aria-pressed", String(!state.demo));
  saveState();
}

function showPin() {
  document.getElementById("lockCopy").style.opacity = ".18";
  document.getElementById("lockNotices").style.opacity = "0";
  els.pinPanel.classList.add("open");
  els.pinPanel.setAttribute("aria-hidden", "false");
}

function hidePin() {
  pinBuffer = "";
  updatePinDots();
  els.pinPanel.classList.remove("open");
  els.pinPanel.setAttribute("aria-hidden", "true");
  document.getElementById("lockCopy").style.opacity = "1";
  document.getElementById("lockNotices").style.opacity = "1";
}

function pressDigit(digit) {
  if (pinBuffer.length >= 4) return;
  pinBuffer += digit;
  if (navigator.vibrate) navigator.vibrate(12);
  updatePinDots();
  if (pinBuffer.length === 4) {
    if (pinBuffer === "1121") {
      setTimeout(startStory, 160);
    } else {
      els.pinPanel.classList.remove("shake");
      void els.pinPanel.offsetWidth;
      els.pinPanel.classList.add("shake");
      setTimeout(() => { pinBuffer = ""; updatePinDots(); }, 380);
    }
  }
}

function updatePinDots() {
  document.querySelectorAll("#pinDots i").forEach((dot, index) => dot.classList.toggle("filled", index < pinBuffer.length));
}

function startStory() {
  if (state.started) return;
  state.started = true;
  state.lastTick = performance.now();
  switchView(els.homeView);
  toast("已解锁");
  saveState();
  requestAnimationFrame(tick);
}

function tick(now) {
  if (!state.started || state.ended) return;
  const delta = Math.min((now - state.lastTick) / 1000, 2);
  state.lastTick = now;
  state.storySeconds = Math.min(TOTAL_STORY_SECONDS, state.storySeconds + delta * (state.demo ? 10 : 1));
  updateClocks();
  eventSchedule.forEach(event => {
    if (state.storySeconds >= event.at && !state.firedEvents.has(event.id)) {
      state.firedEvents.add(event.id);
      event.run();
    }
  });
  saveState();
  requestAnimationFrame(tick);
}

function updateClocks() {
  const totalMinutes = 18 * 60 + 40 + Math.floor(state.storySeconds / 60);
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  const value = `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  ["statusTime", "lockTime"].forEach(id => { const element = document.getElementById(id); if (element) element.textContent = value; });
  const battery = Math.max(27, 79 - Math.floor(state.storySeconds / 24));
  document.getElementById("batteryFill").style.width = `${battery}%`;
}

function switchView(view) {
  [els.lockView, els.homeView, els.appView].forEach(item => item.classList.remove("active"));
  view.classList.add("active");
  els.statusBar.classList.toggle("light", view !== els.appView);
  els.statusBar.classList.toggle("in-app", view === els.appView);
}

function showHome() {
  state.currentApp = null;
  state.currentThread = null;
  switchView(els.homeView);
}

function goBack() {
  if (state.currentApp === "messages" && state.currentThread) {
    state.currentThread = null;
    renderMessages();
    return;
  }
  showHome();
}

function openApp(app) {
  state.currentApp = app;
  state.currentThread = null;
  switchView(els.appView);
  els.appView.dataset.app = app;
  els.appView.classList.remove("thread-mode");
  document.getElementById("backButton").innerHTML = '‹ <span>主屏幕</span>';
  document.getElementById("homeButton").innerHTML = "";
  els.statusBar.classList.toggle("light", ["weather", "clock", "music"].includes(app));
  const labels = {
    messages: ["信息", "最近对话"], photos: ["照片", "最近项目"], notes: ["备忘录", "文件夹"],
    maps: ["地图", "最近地点"], browser: ["Safari", "历史记录"], calendar: ["日历", "10月24日"],
    weather: ["天气", "东京"], mail: ["邮件", "收件箱"], clock: ["时钟", "世界时钟"],
    settings: ["设置", "野末"], phone: ["电话", "最近通话"], music: ["音乐", "最近播放"],
  };
  [els.appTitle.textContent, els.appKicker.textContent] = labels[app] || ["应用", ""];
  const renderers = { messages: renderMessages, photos: renderPhotos, notes: renderNotes, maps: renderMaps, browser: renderBrowser };
  (renderers[app] || (() => renderPlaceholder(app)))();
}

function renderMessages() {
  els.appView.classList.remove("thread-mode");
  document.getElementById("backButton").innerHTML = '‹ <span>主屏幕</span>';
  document.getElementById("homeButton").innerHTML = "";
  els.appTitle.textContent = "信息";
  els.appKicker.textContent = state.currentThread ? "对话" : "最近对话";
  if (state.currentThread) return renderThread(state.currentThread);
  state.unread = 0;
  updateBadges();
  const latest = getTogawaMessages().at(-1)?.text || "野末先生，到家了吗？";
  els.appContent.innerHTML = `<div class="chat-app">
    <header class="chat-list-header"><h1>聊天</h1><div class="chat-actions" aria-hidden="true"><span class="search-glyph"></span><span class="chat-plus-glyph">＋</span><span class="gear-glyph">⚙</span></div></header>
    <div class="chat-list">
      ${contactButton("togawa", "外", "外川", latest, storyTimeLabel(), state.unread)}
      ${contactButton("sister", "姉", "姐姐", "这次回答得这么快，反而很可疑。", "昨天")}
      ${contactButton("peer", "同", "同期同事", "你今天又和外川出去了？", "昨天")}
      ${contactButton("work", "営", "营业课工作群", "修订稿已上传，周一确认。", "18:42")}
      ${contactButton("friend", "桐", "桐岛（同期）", "偶尔会提前两天查排队时间？", "昨天")}
      ${contactButton("nakamura", "中", "中村", "课长，修订部分我已经标出来了。", "16:34")}
      ${contactButton("family", "家", "家人", "天气转凉了，记得加衣服。", "10月18日")}
      ${contactButton("shop", "店", "甜品店预约", "周日上午十一点的双人座已确认。", "周四")}
    </div>
    <nav class="chat-tabs" aria-label="信息标签栏"><span>♙<small>好友</small></span><span class="active">◯<small>聊天</small></span><span>◡<small>开放聊天</small></span><span>▢<small>购物</small></span><span>•••<small>更多</small></span></nav>
  </div>`;
  els.appContent.querySelectorAll(".contact-row").forEach(button => button.addEventListener("click", () => {
    state.currentThread = button.dataset.thread;
    renderThread(state.currentThread);
  }));
}

function contactButton(thread, avatar, name, preview, time, unread = 0) {
  return `<button class="contact-row" data-thread="${thread}"><span class="avatar">${avatar}</span><span class="contact-copy"><b>${name}</b><p>${escapeHtml(preview)}</p></span><span class="contact-meta"><time>${time}</time>${unread ? `<i>${unread}</i>` : ""}</span></button>`;
}

function renderThread(thread) {
  const map = {
    togawa: ["外川", getTogawaMessages()], peer: ["同期同事", peerHistory], work: ["营业课工作群", workHistory],
    sister: ["姐姐", sisterHistory], friend: ["桐岛（同期）", friendHistory], nakamura: ["中村", nakamuraHistory],
    family: ["家人", familyHistory], shop: ["甜品店预约", shopHistory],
  };
  const [title, messages] = map[thread];
  els.appView.classList.add("thread-mode");
  els.appTitle.textContent = title;
  els.appKicker.textContent = "对话";
  document.getElementById("backButton").innerHTML = '‹ <span>8</span>';
  document.getElementById("homeButton").innerHTML = '<span class="thread-search"></span><span class="thread-menu">☰</span>';
  els.appContent.innerHTML = `<div class="thread-shell" style="min-height:100%;background:#b9cad9;overflow:hidden"><div class="thread" style="width:100%;overflow:hidden;padding:12px 10px 75px">${messages.map(message => renderBubble(message, title)).join("")}</div><div class="composer"><button aria-label="添加">＋</button><span>输入消息</span><button aria-label="表情">☺</button></div></div>`;
  els.appContent.scrollLeft = 0;
  els.appContent.scrollTop = els.appContent.scrollHeight;
}

function getTogawaMessages() {
  const incomingMessages = [];
  if (state.firedEvents.has("msg1")) incomingMessages.push({ mine: false, text: "野末先生，到家了吗？", time: "18:41" });
  if (state.firedEvents.has("msg2")) incomingMessages.push({ mine: false, text: "如果已经上车，不用急着回。到家后告诉我一声。", time: "18:45" });
  if (state.firedEvents.has("msg3")) incomingMessages.push({ mine: false, text: "我问过店里了。手机可能落在车站附近。我过去看看。", time: "18:51" });
  return [...togawaHistory, ...incomingMessages];
}

function renderBubble(message, title = "") {
  if (message.sep) return `<div class="thread-date" style="width:max-content;margin:10px auto 14px;padding:5px 12px;border-radius:999px;background:rgba(83,100,117,.3);color:#fff;font-size:10px">${message.sep}</div>`;
  if (message.mine) {
    return `<div class="bubble-row mine" style="display:flex;justify-content:flex-end;width:100%;margin:8px 0"><div class="bubble-line" style="display:flex;flex-direction:row-reverse;align-items:flex-end;gap:5px;max-width:88%"><div class="bubble" style="max-width:215px;padding:8px 10px;border-radius:13px 13px 4px 13px;background:#fee500;color:#2d281c;font-size:13px;line-height:1.45;overflow-wrap:anywhere">${escapeHtml(message.text)}</div><time style="flex:0 0 auto;margin-bottom:1px;color:#677686;font-size:8px">${message.time}</time></div></div>`;
  }
  return `<div class="bubble-row" style="display:flex;align-items:flex-start;gap:7px;width:100%;margin:8px 0"><span class="chat-avatar" style="display:grid;place-items:center;flex:0 0 38px;width:38px;height:38px;border-radius:15px;background:#8298aa;color:#fff;font-size:14px">${escapeHtml(title.slice(0, 1))}</span><div class="bubble-stack" style="min-width:0;max-width:calc(100% - 45px)"><span class="sender-name" style="display:block;margin:1px 0 3px;color:#687582;font-size:9px">${escapeHtml(title)}</span><div class="bubble-line" style="display:flex;align-items:flex-end;gap:5px;max-width:100%"><div class="bubble" style="max-width:215px;padding:8px 10px;border-radius:13px 13px 13px 4px;background:#fff;font-size:13px;line-height:1.45;overflow-wrap:anywhere">${escapeHtml(message.text)}</div><time style="flex:0 0 auto;margin-bottom:1px;color:#677686;font-size:8px">${message.time}</time></div></div></div>`;
}

function renderPhotos() {
  els.appContent.innerHTML = `<div class="photos-app"><header class="photos-heading"><button type="button">选择</button><h1>图库</h1><p>${photos.length} 张照片</p></header><h2>2026年10月</h2><div class="photo-grid">${photos.map((photo, index) => `<button class="photo-card" data-photo="${index}" aria-label="${photo.caption}"><span class="photo-art ${photo.art}"></span></button>`).join("")}</div><nav class="photos-tabs"><span>年</span><span>月</span><b>所有照片</b></nav></div>`;
  els.appContent.querySelectorAll("[data-photo]").forEach(button => button.addEventListener("click", () => toast(photos[Number(button.dataset.photo)].caption)));
}

function renderNotes() {
  const notes = [
    { title: "周日", items: ["十一点前", "下午可能下雨", "车站东口", "咖啡不要太甜", "回程看情况"], edited: "周四 20:08" },
    { title: "做饭", items: ["米多一点", "青椒、豆腐、肉", "冰箱里没有蔬菜", "调味料下次补"], edited: "上周日 22:17" },
    { title: "营业课", items: ["中村：修订稿", "佐佐木：请假", "外川：客户资料／周日天气"], edited: "今天 16:42" },
    { title: "要买的东西", items: ["咖啡豆", "洗衣液", "外川说过的辣酱"], edited: "昨天 21:04" },
    { title: "想看的书", items: ["散步地图", "甜点图鉴", "借给外川的那一本"], edited: "10月19日" },
    { title: "健康检查", items: ["预约改到上午", "前一天不要熬夜"], edited: "10月12日" },
    { title: "年末", items: ["排班", "家里的礼物", "问外川假期安排"], edited: "10月6日" },
  ];
  els.appContent.innerHTML = `<div class="notes-app"><div class="notes-folder">‹ 文件夹</div><h1>备忘录</h1><div class="notes-search"><span class="note-search-glyph"></span>搜索</div><p class="notes-label">📌 置顶</p><div class="notes-group">${notes.map(note => `<article class="note-row"><h3>${note.title}</h3><p><time>${note.edited}</time> ${note.items.join(" / ")}</p></article>`).join("")}</div><footer><span>${notes.length}个备忘录</span><b class="compose-glyph"></b></footer></div>`;
}

function renderMaps() {
  els.appContent.innerHTML = `<div class="maps-app"><div class="map-canvas"><span class="road r1"></span><span class="road r2"></span><span class="road r3"></span><span class="map-block" style="left:8%;top:12%;width:92px;height:55px"></span><span class="map-block" style="right:8%;bottom:18%;width:100px;height:48px"></span><span class="map-name n1m">甜品店</span><span class="map-name n2m">车站小公园</span><span class="map-pin p1"></span><span class="map-pin p2"></span><button class="map-layer">▱</button><button class="map-locate">➤</button></div><section class="map-sheet"><i></i><div class="map-search">⌕&nbsp; 搜索地图</div><header><b>个人收藏</b><button>更多</button></header><div class="map-faves"><span><b>⌂</b>家<small>当前位置</small></span><span><b>⌂</b>外川<small>4分钟</small></span><span><b>♨</b>甜品店<small>9分钟</small></span><span><b>＋</b>添加<small>&nbsp;</small></span></div><p>最近</p><div class="map-recent"><div><b>甜品店 → 车站小公园</b><small>今天 18:22 · 步行 9 分钟</small></div><div><b>外川住处附近的超市</b><small>上周日 · 查看 4 次</small></div><div><b>动物园 → 安静咖啡店</b><small>上周 · 路线已保存</small></div></div></section></div>`;
}

function renderBrowser() {
  const searches = [["周日 人少 甜点", "周四"], ["不太甜 咖啡", "周四"], ["动物园 下午 雨", "上周"], ["麻婆豆腐 调味料", "上周"], ["部下 恋爱 作为上司 距离", "上周"], ["手机照片 模糊 删除", "今天"]];
  const favs = [["営", "公司门户"], ["予", "预约系统"], ["図", "图书馆"], ["店", "甜品店"], ["天", "天气"], ["路", "路线"], ["料", "食谱"], ["新", "新闻"]];
  els.appContent.innerHTML = `<div class="safari-app"><h2>个人收藏</h2><div class="safari-faves">${favs.map(([icon,label])=>`<span><b>${icon}</b><small>${label}</small></span>`).join("")}</div><h2>隐私报告</h2><div class="privacy-card"><b>◈</b><p>过去 7 天，Safari 已阻止 <strong>14 个跟踪器</strong>分析你的个人资料。</p></div><h2>最近搜索</h2><div class="safari-history">${searches.slice(0,3).map(([query,time])=>`<div><span>⌕ ${query}</span><small>${time}</small></div>`).join("")}</div><div class="safari-bottom"><div><b>大小</b><span>搜索或输入网站名称</span><i>♩</i></div><nav>‹　›　♧　▢　▣</nav></div></div>`;
}

function renderPlaceholder(app) {
  const screens = {
    calendar: `<div class="native-app calendar-app"><header><span>2026年</span><button>＋</button></header><h1>10月</h1><div class="weekdays"><b>日</b><b>一</b><b>二</b><b>三</b><b>四</b><b>五</b><b>六</b></div><div class="month-grid">${Array.from({length:35},(_,i)=>`<span class="${i===23?'today':''}">${i<4?'':i-3}</span>`).join("")}</div><h2>24日 · 星期六</h2><div class="event-line"><i></i><p><b>甜品店</b><small>上午11:00 · 车站东口</small></p></div><div class="event-line violet"><i></i><p><b>回信</b><small>今天</small></p></div></div>`,
    weather: `<div class="native-app weather-app"><header>东京 ↗</header><div class="weather-main"><h1>17°</h1><p>多云</p><small>最高19°　最低12°</small></div><div class="weather-panel"><p>明日下午可能有短时雨。</p><div class="hour-strip"><span>现在<b>17°</b></span><span>20时<b>16°</b></span><span>21时<b>15°</b></span><span>22时<b>14°</b></span><span>23时<b>14°</b></span></div></div></div>`,
    mail: `<div class="native-app mail-app"><header><span>邮箱</span><button>编辑</button></header><h1>收件箱</h1><div class="mail-search">⌕ 搜索</div>${[["人事部","年末安排确认","今天 17:12"],["营业课","修订稿已上传","今天 16:58"],["餐厅预约","周日预约确认","周四"],["系统通知","密码将在30天后到期","周三"]].map(([a,b,c])=>`<article><i></i><div><b>${a}</b><p>${b}</p></div><time>${c}</time></article>`).join("")}</div>`,
    clock: `<div class="native-app clock-app"><header><span>世界时钟</span><button>＋</button></header><h1>世界时钟</h1><article><div><small>今天，+0小时</small><b>东京</b></div><time>18:40</time></article><article><div><small>今天，-1小时</small><b>首尔</b></div><time>18:40</time></article><nav>◷<span>世界时钟</span>　⏰<span>闹钟</span>　◴<span>秒表</span></nav></div>`,
    settings: `<div class="native-app settings-app"><h1>设置</h1><div class="settings-search">⌕ 搜索</div><section class="owner-card"><span>野</span><div><b>野末</b><small>Apple账户、iCloud等</small></div><i>›</i></section><section>${[["◉","飞行模式"],["▣","无线局域网"],["ᯤ","蓝牙"],["◐","蜂窝网络"]].map(([i,t])=>`<div><span>${i}</span><b>${t}</b><em>›</em></div>`).join("")}</section><section>${[["◌","通知"],["◒","声音与触感"],["☾","专注模式"],["⌛","屏幕使用时间"]].map(([i,t])=>`<div><span>${i}</span><b>${t}</b><em>›</em></div>`).join("")}</section></div>`,
    phone: `<div class="native-app phone-app"><header><button>编辑</button><span>全部　未接来电</span></header><h1>最近通话</h1>${[["外川","昨天 22:14","6分钟"],["营业课","今天 17:55","已接来电"],["陌生号码","今天 18:50","未接来电"],["外川","上周日","18分钟"]].map(([a,b,c],i)=>`<article class="${i===2?'missed':''}"><span>◉</span><div><b>${a}</b><p>${b}</p></div><small>${c}　ⓘ</small></article>`).join("")}<nav>☆<small>个人收藏</small>　◷<small>最近通话</small>　♙<small>通讯录</small></nav></div>`,
    music: `<div class="native-app music-app"><header>音乐</header><h1>现在播放</h1><div class="album-art">通勤</div><h2>晚间通勤</h2><p>野末的播放列表</p><div class="progress"><i></i></div><div class="controls">◀　　▶　　▶</div><h3>最近播放</h3><div class="music-row"><span>♪</span><div><b>慢一点</b><small>播放列表 · 12首歌</small></div></div></div>`,
  };
  els.appContent.innerHTML = screens[app] || `<div class="native-app"><h1>应用</h1></div>`;
}

function updateBadges() {
  els.messageBadge.textContent = state.unread;
  els.messageBadge.classList.toggle("hidden", state.unread === 0);
}

function incoming(name, text) {
  state.unread += 1;
  notify(name, text, "外", { app: "messages", thread: "togawa" });
  updateBadges();
  if (state.currentApp === "messages" && state.currentThread === "togawa") renderThread("togawa");
}

function notify(title, text, icon = "信", target = null) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "notification";
  item.setAttribute("aria-label", `${title}：${text}`);
  item.innerHTML = `<span class="mini-app messages-mini">${escapeHtml(icon)}</span><div><b>${escapeHtml(title)}</b><p>${escapeHtml(text)}</p></div>`;
  els.stack.appendChild(item);
  els.island.classList.add("active");
  setTimeout(() => els.island.classList.remove("active"), 1400);
  attachNotificationGestures(item, target);
}

function attachNotificationGestures(item, target) {
  let startX = 0;
  let startY = 0;
  let deltaX = 0;
  let deltaY = 0;
  let dragging = false;
  let removed = false;
  const autoTimer = setTimeout(() => dismissNotification(item, 0, -90), 6200);

  const resetPosition = () => {
    item.style.transition = "transform .22s var(--ease), opacity .22s";
    item.style.transform = "translate3d(0,0,0)";
    item.style.opacity = "1";
    setTimeout(() => { if (!removed) item.style.transition = ""; }, 230);
  };

  const openTarget = () => {
    if (!target) return;
    openApp(target.app);
    if (target.thread) {
      state.currentThread = target.thread;
      renderThread(target.thread);
    }
  };

  const finish = () => {
    if (!dragging || removed) return;
    dragging = false;
    const shouldDismiss = deltaY < -42 || Math.abs(deltaX) > 58;
    if (shouldDismiss) {
      clearTimeout(autoTimer);
      removed = true;
      dismissNotification(item, deltaX, deltaY);
      return;
    }
    const isTap = Math.abs(deltaX) < 9 && Math.abs(deltaY) < 9;
    resetPosition();
    if (isTap && target) {
      clearTimeout(autoTimer);
      removed = true;
      dismissNotification(item, 0, -45);
      openTarget();
    }
  };

  item.addEventListener("pointerdown", event => {
    if (removed) return;
    dragging = true;
    startX = event.clientX;
    startY = event.clientY;
    deltaX = 0;
    deltaY = 0;
    item.style.animation = "none";
    item.style.transition = "none";
    if (item.setPointerCapture) item.setPointerCapture(event.pointerId);
  });

  item.addEventListener("pointermove", event => {
    if (!dragging || removed) return;
    deltaX = event.clientX - startX;
    deltaY = event.clientY - startY;
    const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
    const moveX = horizontal ? deltaX : 0;
    const moveY = horizontal ? 0 : Math.min(10, deltaY);
    const distance = horizontal ? Math.abs(moveX) : Math.max(0, -moveY);
    item.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`;
    item.style.opacity = String(Math.max(.28, 1 - distance / 145));
  });

  item.addEventListener("pointerup", finish);
  item.addEventListener("pointercancel", () => { dragging = false; resetPosition(); });
  item.addEventListener("click", () => {
    if (removed || !target) return;
    clearTimeout(autoTimer);
    removed = true;
    dismissNotification(item, 0, -45);
    openTarget();
  });
  item.addEventListener("keydown", event => {
    if ((event.key === "Enter" || event.key === " ") && target) {
      event.preventDefault();
      clearTimeout(autoTimer);
      removed = true;
      dismissNotification(item, 0, -45);
      openTarget();
    }
  });
}

function dismissNotification(item, deltaX = 0, deltaY = -90) {
  if (!item.isConnected) return;
  const horizontal = Math.abs(deltaX) > Math.abs(deltaY);
  const outX = horizontal ? (deltaX < 0 ? -440 : 440) : 0;
  const outY = horizontal ? 0 : -110;
  item.style.animation = "none";
  item.style.transition = "transform .24s var(--ease), opacity .2s";
  item.style.transform = `translate3d(${outX}px, ${outY}px, 0)`;
  item.style.opacity = "0";
  setTimeout(() => item.remove(), 250);
}

function toast(text) {
  els.toast.textContent = text;
  els.toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function vibrateNotice() {
  if (navigator.vibrate) navigator.vibrate([80, 50, 80]);
  toast("手机短促地震动了一下");
}

function endStory() {
  state.ended = true;
  document.getElementById("callEnding").innerHTML = "他没有再发第四条消息。<br>因为这一次，他已经亲自来了。";
  els.callOverlay.classList.add("open");
  els.callOverlay.setAttribute("aria-hidden", "false");
  saveState();
}

function restartStory() {
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

function storyTimeLabel() {
  const minute = 40 + Math.floor(state.storySeconds / 60);
  return `18:${String(Math.min(55, minute)).padStart(2, "0")}`;
}

function saveState() {
  const data = {
    demo: state.demo,
    storySeconds: state.storySeconds,
    firedEvents: [...state.firedEvents],
    ended: state.ended,
    unread: state.unread,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (!saved) return;
    state.demo = saved.demo !== false;
    state.storySeconds = Math.min(Number(saved.storySeconds) || 0, TOTAL_STORY_SECONDS);
    state.firedEvents = new Set(saved.firedEvents || []);
    state.ended = Boolean(saved.ended);
    state.unread = Number(saved.unread) || 0;
    document.getElementById("modeButton").textContent = state.demo ? "试玩 · 90 秒" : "完整 · 15 分钟";
    if (state.storySeconds > 0) {
      state.started = true;
      switchView(els.homeView);
      if (state.ended) {
        endStory();
      } else {
        state.lastTick = performance.now();
        requestAnimationFrame(tick);
        setTimeout(() => toast("已恢复上次的故事进度"), 350);
      }
    }
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>\"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char]));
}

loadState();
updateBadges();
updateClocks();
