/* Dialup Club Bubble — 设置里的几样界面：气泡颜色（选色页）、透明度、壁纸、聊天方式
   ─────────────────────────────────────────────────────────────
   依赖：先加载 bubble-colors.js（色卡、画法、读写选择、applyBubbleColors / applyWallpaper 都在那里）；样式在 ios4-settings.css。
   这个文件只做一件事：把页面上已有的几个元素接上——找不到某个元素就跳过那一项，不会报错。
   它认的元素（照着仓库里 index.html 的那几段抄，id 不要改；详见 AGENTS.md）：
     .bc-row[data-side="me|him"]  设置页里的两行入口，点了打开选色页；#bubbleMeVal / #bubbleHimVal 显示当前选的名字
     #bubblePanel                 选色页（.profile-panel，靠 .hidden / .open 两个 class 显示和滑入）；#bubbleTopbar、#bubbleClose、#bubbleList
     #bubbleOpacity / #bubbleOpacityVal   透明度滑杆和右边的百分比
     #wallPanel                           壁纸页（和选色页一样是一块 .profile-panel）；设置页里放一个 data-skin-open="wallPanel" 的入口
     #wallGrid / #wallName                壁纸页里自带壁纸的小图格子；设置页入口那一行右边显示的当前壁纸名字
     #wallFile / #wallReset / #wallVal / #wallHint   壁纸：选图、恢复默认、当前状态、说明文字
     #chatStyleSeg / #chatStyleHint       聊天方式：分段开关（两个 button[data-val="text|near"]）和下面那行说明 */
(function(){
"use strict";
const $ = (s) => document.querySelector(s);

/* ── 气泡颜色（设置页「Bubble Color」：My Bubbles / His Bubbles 两行 → 选色页）──
   颜色表、画法、挂到 <html> 上都在 skin/bubble-colors.js（<head> 里早设防闪）；这里只管两个页面。
   点一行马上换（存 localStorage，聊天里所有气泡一起变），停在选色页上，和 iOS 选铃声一样；左上「设置」回去。
   第一组 = 皮肤自带的原色：我的 = iMessage（蓝）/ Classic（绿）二选一，顺带切换皮肤（发送键跟着变色）；对方的 = Default（银灰）。
   第二组起 = 色卡（BUBBLE_GROUPS）。再往下：Custom（系统取色器，自己挑一个颜色）、Opacity（透明度滑杆，默认不透明）。 */
const bubblePanel = $("#bubblePanel"), bubbleList = $("#bubbleList"), bubbleTopbar = $("#bubbleTopbar"), bubbleCloseBtn = $("#bubbleClose");
const bubbleOpacityEl = $("#bubbleOpacity"), bubbleOpacityVal = $("#bubbleOpacityVal");
let bubbleSide = "me", bubbleCloseTimer = 0;
const SKIN_NAMES = { "ios4": "iMessage", "ios4-sms": "Classic" };
function currentSkin(){ return document.documentElement.getAttribute("data-skin") === "ios4-sms" ? "ios4-sms" : "ios4"; }
function setSkin(k){
  if (!SKIN_NAMES[k]) return;
  document.documentElement.setAttribute("data-skin", k);
  try{ localStorage.setItem(BUBBLE_SKIN_KEY, k); }catch(_){}
}
function bubbleName(side){
  const c = bubbleChoice(side);
  if (!c) return side === "me" ? SKIN_NAMES[currentSkin()] : "Default";
  return c.charAt(0) === "#" ? "Custom" : BUBBLE_COLORS[c][0];
}
function syncBubbleRows(){
  const me = $("#bubbleMeVal"), him = $("#bubbleHimVal");
  if (me) me.textContent = bubbleName("me");
  if (him) him.textContent = bubbleName("him");
}
/* 一行对应的值：skin:ios4 / skin:ios4-sms（我的原色）、""（对方的 Default）、色卡 id、custom */
function bubbleRowActive(side, key){
  const c = bubbleChoice(side);
  if (key === "custom") return c.charAt(0) === "#";
  if (key.indexOf("skin:") === 0) return !c && key.slice(5) === currentSkin();
  return key === c;
}
function setBubbleChoice(side, key){
  try{
    if (key.indexOf("skin:") === 0){ setSkin(key.slice(5)); localStorage.removeItem(BUBBLE_KEYS[side]); }
    else if (BUBBLE_COLORS.hasOwnProperty(key) || /^#[0-9a-f]{6}$/i.test(key)) localStorage.setItem(BUBBLE_KEYS[side], key.toLowerCase());
    else localStorage.removeItem(BUBBLE_KEYS[side]);
  }catch(_){}
  applyBubbleColors();
  syncBubbleRows();
  syncBubblePanel();
}
function setBubbleOpacity(side, v){
  v = Math.min(1, Math.max(0.2, v));
  try{ if (v >= 1) localStorage.removeItem(BUBBLE_OPACITY_KEYS[side]); else localStorage.setItem(BUBBLE_OPACITY_KEYS[side], String(v)); }catch(_){}
  applyBubbleColors();
  syncBubbleOpacity();
}
function syncBubbleOpacity(){
  if (!bubbleOpacityEl) return;
  const pct = Math.round(bubbleOpacity(bubbleSide) * 100);
  bubbleOpacityEl.value = pct;
  bubbleOpacityEl.style.setProperty("--f", String((pct - 20) / 80));   // 蓝色那段填到滑块正中
  if (bubbleOpacityVal) bubbleOpacityVal.textContent = pct + "%";
}
/* 不重画列表，只更新打勾和 Custom 那行的小图 */
function syncBubblePanel(){
  if (!bubbleList) return;
  const side = bubbleSide, c = bubbleChoice(side);
  bubbleList.querySelectorAll(".bp-row").forEach((r) => r.classList.toggle("active", bubbleRowActive(side, r.dataset.key)));
  const cw = bubbleList.querySelector(".bp-row.custom");
  if (cw){
    const isCustom = c.charAt(0) === "#", sw = cw.querySelector(".bp-sw"), inp = cw.querySelector("input");
    sw.classList.toggle("wheel", !isCustom);
    sw.style.backgroundImage = isCustom ? bubbleImgFor(c, side) : "";
    if (isCustom && inp) inp.value = c;
  }
  syncBubbleOpacity();
}
function renderBubbleList(){
  if (!bubbleList) return;
  const side = bubbleSide;
  bubbleList.textContent = "";
  const row = (key, name, img, cls) => {
    const b = document.createElement(key === "custom" ? "label" : "button");
    if (key !== "custom") b.type = "button";
    b.className = "bp-row" + (cls ? " " + cls : ""); b.dataset.key = key;
    const sw = document.createElement("span"); sw.className = "bp-sw";
    if (img) sw.style.backgroundImage = img;
    const nm = document.createElement("span"); nm.className = "bp-name"; nm.textContent = name;
    b.append(sw, nm);
    return b;
  };
  const group = (rows, info) => {
    const g = document.createElement("div"); g.className = "bp-group";
    if (info && info.head){ const h = document.createElement("div"); h.className = "bp-head"; h.textContent = info.head; g.append(h); }
    const cells = document.createElement("div"); cells.className = "bp-cells";
    rows.forEach((r) => cells.append(r));
    g.append(cells);
    if (info && info.foot){ const f = document.createElement("div"); f.className = "bp-foot"; f.textContent = info.foot; g.append(f); }
    bubbleList.append(g);
  };
  /* 皮肤原色：小图直接用皮肤那张原图（iosBubbleImg 不带透明度 = 和 css 里的一个字都不差） */
  if (side === "me") group(["ios4", "ios4-sms"].map((k) => row("skin:" + k, SKIN_NAMES[k], iosBubbleImg(IOS_ORIG[k].me[0].split(" "), IOS_ORIG[k].me[1], false))), null);
  else group([row("", "Default", iosBubbleImg(IOS_ORIG.him[0].split(" "), IOS_ORIG.him[1], true))], null);
  BUBBLE_GROUPS.forEach((gr) => group(gr.ids.map((id) => row(id, BUBBLE_COLORS[id][0], bubbleImgFor(id, side))), gr));
  /* Custom：整行就是一个系统取色器（<input type="color"> 透明地盖在这一行上，手指直接点到它，iPhone / Mac 的 Safari 弹出来的是系统自带的色谱） */
  const cw = row("custom", "Custom", "", "custom");
  const inp = document.createElement("input");
  inp.type = "color"; inp.className = "bp-color"; inp.setAttribute("aria-label", "Custom color");
  const cur = bubbleChoice(side);
  inp.value = cur.charAt(0) === "#" ? cur : "#" + (bubbleBaseHex(cur) || "6bbcf3");
  inp.addEventListener("input", () => setBubbleChoice(bubbleSide, inp.value));
  cw.append(inp);
  group([cw], { head: "", foot: "从色谱里自己挑一个颜色，气泡会按同一种画法画出来。" });
  syncBubblePanel();
}
function openBubblePanel(side){
  bubbleSide = side === "him" ? "him" : "me";
  bubblePanel.dataset.side = bubbleSide;
  if (bubbleTopbar) bubbleTopbar.dataset.title = bubbleSide === "him" ? "His Bubbles" : "My Bubbles";
  renderBubbleList();
  clearTimeout(bubbleCloseTimer);
  const sc = bubblePanel.querySelector(".profile-scroll");
  if (sc) sc.scrollTop = 0;
  bubblePanel.classList.remove("hidden");
  requestAnimationFrame(() => requestAnimationFrame(() => bubblePanel.classList.add("open")));
}
function closeBubblePanel(){
  bubblePanel.classList.remove("open");
  clearTimeout(bubbleCloseTimer);
  bubbleCloseTimer = setTimeout(() => bubblePanel.classList.add("hidden"), 360);
}
document.querySelectorAll(".bc-row[data-side]").forEach((b) => b.addEventListener("click", () => openBubblePanel(b.dataset.side)));
if (bubbleCloseBtn) bubbleCloseBtn.addEventListener("click", closeBubblePanel);
if (bubbleList) bubbleList.addEventListener("click", (e) => {
  const r = e.target.closest(".bp-row");
  if (r && r.dataset.key !== "custom") setBubbleChoice(bubbleSide, r.dataset.key);
});
if (bubbleOpacityEl) bubbleOpacityEl.addEventListener("input", () => setBubbleOpacity(bubbleSide, bubbleOpacityEl.value / 100));
window.addEventListener("keydown", (e) => {          // Esc 先关这一页（别连设置页一起关）
  if (e.key === "Escape" && bubblePanel.classList.contains("open")){ e.stopPropagation(); closeBubblePanel(); }
}, true);
syncBubbleRows();

/* ── 壁纸（设置页「Wallpaper」）──
   上面一格是自带的几张壁纸（BUBBLE_WALLPAPERS），点一张就换上。
   Choose Photo：从自己设备里挑一张图。图在浏览器里缩到最长边 1600、转成 JPEG 后存进 localStorage（companion_wallpaper），
   不发给任何服务器；存不下就自动再压一点。Reset to Default：删掉，回到皮肤原来的底色。挂到页面上的事在 skin/bubble-colors.js 的 applyWallpaper()。 */
const wallFile = $("#wallFile"), wallReset = $("#wallReset"), wallVal = $("#wallVal"), wallHint = $("#wallHint");
const WALL_HINT = wallHint ? wallHint.textContent : "";
const wallGrid = $("#wallGrid");
function syncWallRows(msg){
  const c = wallpaperChoice(), w = BUBBLE_WALLPAPERS.find((x) => x[0] === c);
  if (wallVal) wallVal.textContent = c === "custom" ? "Custom" : "";
  if (wallReset) wallReset.hidden = !c;
  if (wallHint) wallHint.textContent = msg || WALL_HINT;
  if (wallGrid) wallGrid.querySelectorAll(".wp-thumb").forEach((b) => b.classList.toggle("active", b.dataset.id === c));
  const nm = $("#wallName"); if (nm) nm.textContent = w ? w[1] : c === "custom" ? "Custom" : "Default";
}
/* 自带壁纸的小图格子：点一张马上换上 */
if (wallGrid){
  BUBBLE_WALLPAPERS.forEach((w) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "wp-thumb"; b.dataset.id = w[0]; b.title = w[1]; b.setAttribute("aria-label", w[1]);
    b.style.backgroundImage = 'url("' + bubbleWallpaperUrl(w[0], true) + '")';
    wallGrid.append(b);
  });
  wallGrid.addEventListener("click", (e) => {
    const b = e.target.closest(".wp-thumb");
    if (!b) return;
    try{ localStorage.setItem(WALLPAPER_KEY, "builtin:" + b.dataset.id); }catch(_){}
    applyWallpaper(); syncWallRows();
  });
}
function setWallpaperFromFile(file){
  if (!file || !/^image\//.test(file.type)) return;
  const img = new Image(), url = URL.createObjectURL(file);
  img.onload = () => {
    const k = Math.min(1, 1600 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(img.naturalWidth * k)); c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    let saved = false;
    for (let q = 0.86; q >= 0.38 && !saved; q -= 0.12){
      try{ localStorage.setItem(WALLPAPER_KEY, c.toDataURL("image/jpeg", q)); saved = true; }catch(_){}
    }
    applyWallpaper();
    syncWallRows(saved ? "" : "这张图太大，浏览器存不下，换一张小一点的试试。");
  };
  img.onerror = () => { URL.revokeObjectURL(url); syncWallRows("这张图打不开，换一张试试。"); };
  img.src = url;
}
if (wallFile) wallFile.addEventListener("change", () => { setWallpaperFromFile(wallFile.files && wallFile.files[0]); wallFile.value = ""; });
if (wallReset) wallReset.addEventListener("click", () => { try{ localStorage.removeItem(WALLPAPER_KEY); }catch(_){} applyWallpaper(); syncWallRows(); });
syncWallRows();

/* ── 聊天方式（设置页「聊天方式」）──
   text = 发短信 / near = 在身边。这个开关只管「对方怎么说」，不管气泡：两种方式拆气泡都一样（splitSms）。
   它自己不会让对方换一种说话方式——皮肤只负责记下选择（localStorage companion_ios_style）并把当前值交出来：
   window.DialupBubble.chatStyle() 返回 "text" | "near"，textingOn() 返回 true | false。
   宿主怎么用：发消息给自己的后端 / 模型时带上这个值，选了「发短信」就在系统提示里加一段「像隔着手机发短信那样说话」的规则，
   选了「在身边」就不加。那段规则怎么写由宿主自己定，不在本仓库里。 */
const IOS_STYLE_KEY = "companion_ios_style";
function iosStyle(){ try{ return localStorage.getItem(IOS_STYLE_KEY) === "near" ? "near" : "text"; }catch(_){ return "text"; } }
function textingOn(){ return (document.documentElement.getAttribute("data-skin") || "").indexOf("ios4") === 0 && iosStyle() === "text"; }
const chatStyleSeg = $("#chatStyleSeg"), chatStyleHint = $("#chatStyleHint");
function syncChatStyle(){
  const v = iosStyle();
  if (chatStyleSeg) chatStyleSeg.querySelectorAll("button").forEach((b) => b.classList.toggle("active", b.dataset.val === v));
  if (chatStyleHint) chatStyleHint.textContent = v === "near"
    ? "在身边：像面对面那样说话，动作照常描写。"
    : "发短信：像隔着手机发消息那样说话，动作描写偶尔一句。";
}
syncChatStyle();
if (chatStyleSeg) chatStyleSeg.addEventListener("click", (e) => {
  const b = e.target.closest("button[data-val]");
  if (!b) return;
  try{ localStorage.setItem(IOS_STYLE_KEY, b.dataset.val); }catch(_){}
  syncChatStyle();
});

/* ── 给宿主用的入口 ──
   1) 不写代码的接法：任何元素加 data-skin-open="profilePanel"（或别的面板 id），点它就把那块面板滑出来；
      面板里任何元素加 data-skin-close，点它就收回去。
   2) 写代码的接法：window.DialupBubble 里的函数。宿主想用自己的设置界面、不要这里的选色页，也可以只调这些。 */
function openPanel(id){
  const el = document.getElementById(id);
  if (!el) return;
  if (id === "bubblePanel"){ openBubblePanel(bubbleSide); return; }
  el.classList.remove("hidden");
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add("open")));
}
function closePanel(id){
  const el = document.getElementById(id);
  if (!el) return;
  if (id === "bubblePanel"){ closeBubblePanel(); return; }
  el.classList.remove("open");
  setTimeout(() => { if (!el.classList.contains("open")) el.classList.add("hidden"); }, 360);
}
document.addEventListener("click", (e) => {
  const o = e.target.closest("[data-skin-open]");
  if (o){ openPanel(o.getAttribute("data-skin-open")); return; }
  const c = e.target.closest("[data-skin-close]");
  if (c){ const p = c.closest(".profile-panel"); if (p) closePanel(p.id); }
});
window.DialupBubble = {
  colors: BUBBLE_COLORS, groups: BUBBLE_GROUPS,
  getChoice: bubbleChoice, setChoice: setBubbleChoice,        // side = "me" | "him"；值 = "" | "skin:ios4" | "skin:ios4-sms" | 色卡 id | "#rrggbb"
  getOpacity: bubbleOpacity, setOpacity: setBubbleOpacity,    // 0.2 ~ 1
  imageFor: bubbleImgFor,                                     // 某个选择画出来的那张气泡图（CSS 的 url(...)），给宿主自己画小色块用
  setWallpaperFromFile, resetWallpaper: () => { try{ localStorage.removeItem(WALLPAPER_KEY); }catch(_){} applyWallpaper(); syncWallRows(); },
  chatStyle: iosStyle, textingOn,                             // 聊天方式开关的当前值
  openPicker: openBubblePanel, closePicker: closeBubblePanel, openPanel, closePanel,
  refresh: () => { applyBubbleColors(); applyWallpaper(); syncBubbleRows(); syncWallRows(); }
};

})();
