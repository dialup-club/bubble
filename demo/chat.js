/* Dialup Club Bubble — demo 页的逻辑（纯前端、没有后端；消息只在内存里，刷新就回到示例对话）
   ─────────────────────────────────────────────────────────────
   1. iMessage 风格气泡：把一条长回复拆成「几句话一个气泡」（splitSms），整段括号动作显示成一行灰色小字；
      同一个人 5 分钟内连发成一组，只有一组最后一个气泡带尾巴；隔一小时以上（或换天、或第一条）出一行时间条。
   2. 气泡颜色：设置 › Bubble Color › My Bubbles / His Bubbles → 选色页，点一行马上换（存 localStorage）。
   3. 聊天方式：设置 › 聊天方式「发短信 / 在身边」，存 localStorage companion_ios_style。
      前端只记下这个选择；它本来的作用是让后端在系统提示里叠一层「短信模式」规则（见 textingOn()），
      两种方式的气泡拆法完全一样。本 demo 没有后端，所以切换后只有说明文字会变。 */
(function(){
"use strict";
const $ = (s) => document.querySelector(s);
const scrollEl = $("#scroll"), inputEl = $("#input"), sendBtn = $("#sendBtn");

function currentSkin(){ return document.documentElement.getAttribute("data-skin") || "ios4"; }
function skinFamily(k){ return String(k || "ios4").split("-")[0]; }
function smsMode(){ return skinFamily(currentSkin()) === "ios4"; }

/* ── 把一大段回复拆成几条，每条几句话 ──
   先切成小块（空行 > 换行 > 句号/问号/感叹号/动作括号收尾），再从头往后攒：
   攒到两三句、差不多够一条了才断；太短的句子跟后面的并在一起，不会一句一个气泡。
   空行是最想断的地方，但这一条还太短就先不断；括号/引号里面不切；--- 分隔线去掉；有代码块的不拆。 */
const SMS_MIN = 28, SMS_PARA = 40, SMS_MAX = 72;   // 单位：全角字（半角算半个）
/* 整段都在一对括号里的动作（「（伸了个懒腰）」）不做气泡，显示成一行小字。
   「Wharf（码头）」「好啦（笑）」这种括号前面还有字的不算。括号还没写完（正在打字）先当动作。 */
function isActPiece(s){
  s = String(s || "").trim();
  if (s.length < 2 || "（(".indexOf(s[0]) < 0) return false;
  let depth = 0;
  for (let i = 0; i < s.length; i++){
    if ("（(".indexOf(s[i]) >= 0) depth++;
    else if ("）)".indexOf(s[i]) >= 0 && --depth === 0) return i === s.length - 1;   // 第一对括号正好收在末尾
  }
  return true;
}
function actNoteText(s){                             // 小字里不再写括号
  s = String(s || "").trim().replace(/^[（(]\s*/, "");
  return s.replace(/\s*[）)]$/, "");
}
function smsUnits(s){ let u = 0; for (let i = 0; i < s.length; i++) u += s.charCodeAt(i) < 256 ? 0.5 : 1; return u; }
function smsPieces(text){                          // → [{ text, brk }]，brk = 前面断开的力度：3 空行 / 2 换行 / 1 句末
  const OPEN = "（(「『“【", CLOSE = "）)」』”】", END = "。！？!?…～~";
  const pieces = [];
  for (const block of text.split(/\n\s*\n/)){
    const lines = block.split("\n").map((l) => l.trim()).filter((l) => l && !/^([-*_]\s*){3,}$/.test(l));   // 去掉 --- 分隔线
    if (!lines.length) continue;
    lines.forEach((line, li) => {
      let cur = "", depth = 0, b = li === 0 ? (pieces.length ? 3 : 0) : 2;
      const push = () => { if (cur.trim()){ pieces.push({ text: cur, brk: b }); b = 1; } cur = ""; };
      for (let i = 0; i < line.length; i++){
        const ch = line[i];
        cur += ch;
        if (OPEN.indexOf(ch) >= 0) depth++;
        else if (CLOSE.indexOf(ch) >= 0){
          depth = Math.max(0, depth - 1);
          if (depth === 0 && (ch === "）" || ch === ")")) push();          // 一段动作描写收尾
        }
        else if (depth === 0 && END.indexOf(ch) >= 0){
          while (i + 1 < line.length && (END + "”」』").indexOf(line[i + 1]) >= 0) cur += line[++i];   // ……、？！、句末引号一起带走
          push();
        }
      }
      push();
    });
  }
  return pieces;
}
function splitSms(text){
  const t = String(text || "").replace(/\r/g, "").trim();
  if (!t || t.indexOf("```") >= 0) return [t];
  const out = [];
  let buf = "";
  for (const p of smsPieces(t)){
    const piece = p.text.trim();
    if (isActPiece(piece)){                        // 动作：前面攒的先成一条气泡，动作自己一行小字
      if (buf){ out.push(buf); buf = ""; }
      out.push({ act:true, text: piece });
      continue;
    }
    const head =p.brk >= 2 && /^(\*\*|[-·•*]\s|\d+[.、)]\s?|#)/.test(piece);   // 加粗小标题 / 列表项 / 标题：新的一件事
    if (buf){
      const bu = smsUnits(buf), pu = smsUnits(piece);
      const full = bu >= SMS_MAX
        || (bu >= SMS_MIN && bu + pu > SMS_MAX)
        || (p.brk === 3 && bu >= SMS_PARA)
        || (head && bu >= 12);
      if (full){ out.push(buf); buf = ""; }
    }
    if (!buf){ buf = piece; continue; }
    if (p.brk >= 2) buf += (head || !/[。！？!?…～~）)」』”】]$/.test(buf)) ? "\n" : "";   // 句子接着写；标题、链接、没标点收尾的换行
    else buf += (/[\x00-\xff]$/.test(buf) && /^[\x00-\xff]/.test(piece)) ? " " : "";
    buf += piece;
  }
  if (buf) out.push(buf);
  return out.length ? out : [t];
}

/* 聊天方式（发短信 / 在身边）的开关逻辑在 skin/bubble-settings.js，是皮的一部分；当前值用 window.DialupBubble.chatStyle() / textingOn() 读。 */

/* ── 示例对话（内容中性，时间钉在今天 09:41 起） ── */
const _b = new Date(); _b.setHours(9, 41, 0, 0);
const at = (min) => new Date(_b.getTime() + min * 60e3).toISOString();
const messages = [
  { id:1, ts: at(0), from:"ai",    kind:"reply", text:"Hi" },
  { id:2, ts: at(1), from:"human", kind:"user",  text:"你好" },
  { id:3, ts: at(2), from:"ai",    kind:"reply", text:"今天天气不错。要不要出去走走？\n\n（伸了个懒腰）\n\n我刚看完一本书，晚点可以跟你讲讲。" },
  { id:4, ts: at(3), from:"human", kind:"user",  text:"好呀\n等我五分钟" },
  { id:5, ts: at(4), from:"ai",    kind:"reply", text:"Sure, take your time." },
];
let nextId = 6;
const freshKeys = new Set();                       // 刚发/刚收到、待播一次入场动画的消息

/* ── 排行：时间条 / 成组 / 尾巴 / 拆气泡 ── */
const GROUP_GAP = 5 * 60e3;                        // 同一个人 5 分钟内成组
const IOS_STAMP_GAP = 60 * 60e3;                   // 隔一小时以上才出时间条（正好一小时不出）
function tsMs(m){ return new Date(m.ts).getTime(); }
function dayKey(ts){
  const d = new Date(ts);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function fmtTime(ts){ return new Date(ts).toLocaleTimeString("zh-CN", { hour:"2-digit", minute:"2-digit", hour12:false }); }
function fmtClock12(ts){ const d = new Date(ts); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; }
function fmtStamp(ts){ const d = new Date(ts); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()} ${fmtClock12(ts)}`; }
function needStamp(prev, m){                       // m 前面要不要出时间条（prev = 上一条消息）
  if (!prev) return true;
  if (dayKey(prev.ts) !== dayKey(m.ts)) return true;
  const a = tsMs(prev), b = tsMs(m);
  return Number.isFinite(a) && Number.isFinite(b) && b - a > IOS_STAMP_GAP;
}
function buildRows(){
  const rows = [];
  let prevBubble = null, lastFrom = null, prevMsg = null;
  messages.forEach((m) => {
    if (needStamp(prevMsg, m) && Number.isFinite(tsMs(m))){
      rows.push({ type:"day", text:fmtStamp(m.ts) });
      prevBubble = null; lastFrom = null;
    }
    prevMsg = m;
    if (m.from === "ai" && lastFrom !== "ai") rows.push({ type:"aihead" });   // 原实现里的「头像行」，这套皮肤里不显示，留着保证间距一致
    lastFrom = m.from;
    const t = tsMs(m);
    const grouped = !!(prevBubble && prevBubble.from === m.from && Number.isFinite(t) && Number.isFinite(prevBubble.ts) && (t - prevBubble.ts < GROUP_GAP));
    // 对方的回复按段落拆成几条气泡（只是显示，数据还是一条）；自己的一条消息按换行拆
    const rawParts = !smsMode() ? null
      : (m.from === "ai" && m.kind === "reply") ? splitSms(m.text)
      : (m.from === "human" && m.text && m.text.indexOf("\n") >= 0) ? m.text.split(/\n+/).map((x) => x.trim()).filter(Boolean)
      : null;
    const parts = rawParts && rawParts.map((x) => typeof x === "string" ? { text:x, act:false } : { text:x.text, act:!!x.act });
    if (parts && (parts.length > 1 || (parts[0] && parts[0].act))){
      parts.forEach((pt, i) => {
        const prow = { type:"message", message:m, part:{ i, n:parts.length, text:pt.text, act:pt.act }, grouped: i ? true : grouped, tail:!pt.act };
        if (pt.act){ rows.push(prow); return; }    // 动作那行不是气泡：不动上一个气泡的尾巴
        if (prow.grouped && prevBubble && prevBubble.row) prevBubble.row.tail = false;
        rows.push(prow);
        prevBubble = { from:m.from, ts:t, row:prow };
      });
      return;
    }
    const row = { type:"message", message:m, grouped, tail:true };
    if (grouped && prevBubble.row) prevBubble.row.tail = false;
    rows.push(row);
    prevBubble = { from:m.from, ts:t, row };
  });
  return rows;
}

function escapeHtml(s){
  return String(s || "").replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function renderText(t){
  let s = escapeHtml(t);
  s = s.replace(/`([^`]+)`/g, "<code>$1</code>");
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
  s = s.replace(/\n/g, "<br>");
  return s;
}
function makeDay(row){
  const d = document.createElement("div");
  d.className = "day stamp";
  d.textContent = row.text;
  return d;
}
function makeAiHead(){
  const el = document.createElement("div");
  el.className = "aihead";
  return el;
}
function makeMessage(rowData){
  const m = rowData.message;
  const row = document.createElement("div");
  row.className = `row ${m.from === "human" ? "human" : "ai"}${rowData.grouped ? " grouped" : ""}${rowData.tail ? " tail" : ""}`;
  row.dataset.id = m.id; row.dataset.from = m.from; row.dataset.messageKey = m.id;
  if (freshKeys.has(m.id) && (!rowData.part || rowData.part.i === rowData.part.n - 1)){   // 只对刚发/刚收到的那条播一次入场动画
    const cls = m.from === "human" ? "enter-human" : "enter-ai";
    row.classList.add(cls);
    row.addEventListener("animationend", () => row.classList.remove(cls), { once:true });
  }
  const bubble = document.createElement("div");
  bubble.className = "bubble";
  const part = rowData.part || null;               // 拆出来的第 i 条（null = 整条）
  const isLastPart = !part || part.i === part.n - 1;
  if (part && part.act){ row.classList.add("act-note"); bubble.classList.add("note"); }   // 括号动作：一行小字，不是气泡
  const bodyText = part ? (part.act ? actNoteText(part.text) : part.text) : m.text;
  let inner = "";
  if (bodyText) inner += `<span class="txt">${renderText(bodyText)}</span>`;
  inner += `<span class="meta"></span>`;
  bubble.innerHTML = inner;
  if (isLastPart) bubble.querySelector(".meta").innerHTML = `<span>${fmtTime(m.ts)}</span>` + (m.from === "human" ? `<span class="tick">✓✓</span>` : "");
  row.appendChild(bubble);
  return row;
}
function render(){
  const frag = document.createDocumentFragment();
  buildRows().forEach((r) => frag.appendChild(r.type === "day" ? makeDay(r) : r.type === "aihead" ? makeAiHead() : makeMessage(r)));
  scrollEl.textContent = "";
  scrollEl.appendChild(frag);
  freshKeys.clear();
  requestAnimationFrame(() => { scrollEl.scrollTop = scrollEl.scrollHeight; });
}

/* ── 发消息（只在本页内存里）；对方从几句示例回复里轮流回一句 ── */
const DEMO_REPLIES = [
  "好的。",
  "收到！",
  "OK，明白了。我记下了。\n\n（点点头）\n\n还有别的吗？",
  "嗯嗯。",
];
let replyIdx = 0, replyTimer = 0;
let composing = false;
inputEl.addEventListener("compositionstart", () => composing = true);
inputEl.addEventListener("compositionend", () => composing = false);
inputEl.addEventListener("input", () => {
  inputEl.style.height = "auto";
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + "px";
});
inputEl.addEventListener("keydown", (e) => {
  /* iPhone 皮肤：回车只是换行，点「发送」才发；发出去以后每一行是一个气泡。电脑上：Ctrl/⌘ + 回车也能发。 */
  if (e.key === "Enter" && !e.shiftKey && !composing && (e.metaKey || e.ctrlKey)){ e.preventDefault(); doSend(); }
});
function pushMessage(from, text){
  const m = { id: nextId++, ts: new Date().toISOString(), from, kind: from === "ai" ? "reply" : "user", text };
  messages.push(m);
  freshKeys.add(m.id);
  render();
}
function doSend(){
  const text = inputEl.value.replace(/\s+$/, "");
  if (!text.trim()) return;
  inputEl.value = "";
  inputEl.dispatchEvent(new Event("input"));
  pushMessage("human", text);
  clearTimeout(replyTimer);
  replyTimer = setTimeout(() => { pushMessage("ai", DEMO_REPLIES[replyIdx++ % DEMO_REPLIES.length]); }, 1200);
}
sendBtn.addEventListener("click", doSend);

/* ── 设置页（右上角「设置」） ── */
const profilePanel = $("#profilePanel");
let profileCloseTimer = null;
function openProfile(){
  clearTimeout(profileCloseTimer);
  profilePanel.classList.remove("hidden");
  requestAnimationFrame(() => requestAnimationFrame(() => profilePanel.classList.add("open")));   // 两帧后再加 .open，滑入动画才会从屏外开始
}
function closeProfile(){
  profilePanel.classList.remove("open");
  clearTimeout(profileCloseTimer);
  profileCloseTimer = setTimeout(() => profilePanel.classList.add("hidden"), 360);
}
$("#moreBtn").addEventListener("click", openProfile);
$("#profileClose").addEventListener("click", closeProfile);
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !profilePanel.classList.contains("hidden")) closeProfile();
});

/* 选色页（Bubble Color）和壁纸（Wallpaper）的界面逻辑在 skin/bubble-settings.js，是皮的一部分，不在这里。 */

/* ── 布局用的几个变量：屏幕高、输入条实际高度、键盘弹起的偏移 ── */
function applyPhysicalScreenVars(){
  const screenH = window.screen && window.screen.height ? Math.round(window.screen.height) : Math.round(window.innerHeight || 0);
  if (screenH) document.documentElement.style.setProperty("--screen-height", screenH + "px");
}
applyPhysicalScreenVars();
window.addEventListener("orientationchange", () => setTimeout(applyPhysicalScreenVars, 250));
(function trackComposerHeight(){                   // 输入条真实高度 → --composer-live（消息区底部留白用）
  const comp = document.querySelector("footer.composer");
  if (!comp || !window.ResizeObserver) return;
  let last = -1;
  const apply = () => {
    const h = Math.round(comp.getBoundingClientRect().height);
    if (!h || h === last) return;
    last = h;
    document.documentElement.style.setProperty("--composer-live", h + "px");
    requestAnimationFrame(() => { scrollEl.scrollTop = scrollEl.scrollHeight; });
  };
  try{ new ResizeObserver(apply).observe(comp, { box: "border-box" }); }
  catch(_){ new ResizeObserver(apply).observe(comp); }
  window.addEventListener("resize", apply);
  apply();
})();
if (window.visualViewport){                        // 手机键盘弹起：只上移输入条和消息区，不改整体页面高度
  const vv = window.visualViewport, appEl = $("#app");
  const applyVV = () => {
    const rawOffset = (window.innerHeight || 0) - (vv.height || 0) - (vv.offsetTop || 0);
    const kbOpen = rawOffset > 80;
    document.documentElement.style.setProperty("--keyboard-offset", (kbOpen ? Math.max(0, Math.round(rawOffset)) : 0) + "px");
    appEl.classList.toggle("kb", kbOpen);
  };
  vv.addEventListener("resize", applyVV);
  vv.addEventListener("scroll", applyVV);
  applyVV();
}

render();
window.DialupBubbleDemo = { splitSms, openProfile };   // 方便在控制台里试
})();
