/* Dialup Club Bubble — 气泡颜色（在 <head> 里同步加载，先把颜色挂上，避免先闪一下默认色）
   ─────────────────────────────────────────────────────────────
   皮肤自带两套原色：<html data-skin="ios4"> = iMessage（蓝），"ios4-sms" = Classic（绿）。存 localStorage companion_skin；
   demo 里网址 ?skin=ios4-sms 可以临时指定。
   气泡颜色：「我的」「对方的」分别选，存 localStorage companion_bubble_me / companion_bubble_him：
     没存          = 皮肤原来的颜色（我的：蓝 / 绿；对方的：银灰），一个变量都不挂；
     色卡里的 id   = BUBBLE_COLORS 里的一个颜色；
     "#rrggbb"     = 自选色（Custom）。
   透明度：存 companion_bubble_me_opacity / companion_bubble_him_opacity（0.2 ~ 1，没存 = 1 = 不透明）。
   画法：色卡和自选色都只给一个基准色，由 bubbleGlass() 推出整颗气泡——中间亮、颜色聚在边缘一圈、顶上白高光、
   底边里侧一道亮线、带颜色的投影（BUBBLE_GLASS 是「中间有多亮」，定死一个值）。轮廓和九宫格切法跟皮肤原来那颗完全一样。

   壁纸：存 companion_wallpaper——"builtin:<id>" = 自带壁纸（BUBBLE_WALLPAPERS，图在本文件旁边的 wallpapers/ 里），
   或者一张缩小过的图（data URL，用户自己选的，只在这台设备的浏览器里）；没存 = 皮肤原来的底色。

   ★ 换一份色卡：只改下面 BUBBLE_COLORS 这一张表（id: [名字, 基准色]），别处都不用动。 */
(function(){
  var k = "ios4";
  try{
    var s = localStorage.getItem("companion_skin"); if (s === "ios4" || s === "ios4-sms") k = s;
    var q = new URLSearchParams(location.search).get("skin"); if (q === "ios4" || q === "ios4-sms") k = q;
  }catch(e){}
  document.documentElement.setAttribute("data-skin", k);
})();

var BUBBLE_COLORS = {
  lipgloss:   ["Lip Gloss",   "f78ddb"],
  flipphone:  ["Flip Phone",  "fca4cc"],
  sparklegif: ["Sparkle.gif", "e7aa8c"],
  gelpen:     ["Gel Pen",     "c8baf5"],
  satellite:  ["Satellite",   "a7b9e6"],
  dialup:     ["Dial-Up",     "5464c3"],
  cyberspace: ["Cyberspace",  "160198"],
  hyperlink:  ["Hyperlink",   "3578fd"],
  bliss:      ["Bliss",       "6bbcf3"],
  aero:       ["Aero",        "42cdfd"],
  dewdrop:    ["Dewdrop",     "abfcfe"],
  spearmint:  ["Spearmint",   "a1f3dd"],
  screensaver:["Screensaver", "a6f3ab"],
  online:     ["Online",      "a7e85a"],
  lemonfizz:  ["Lemon Fizz",  "f1e646"],
  stickynote: ["Sticky Note", "efef9a"],
  cdrom:      ["CD-ROM",      "d6dfdf"]
};
var BUBBLE_GROUPS = [ { head: "Millennium", foot: "", ids: Object.keys(BUBBLE_COLORS) } ];
var BUBBLE_GLASS = 0.62;
var BUBBLE_KEYS = { me: "companion_bubble_me", him: "companion_bubble_him" };
var BUBBLE_OPACITY_KEYS = { me: "companion_bubble_me_opacity", him: "companion_bubble_him_opacity" };
var BUBBLE_SKIN_KEY = "companion_skin";

/* 皮肤原来那三颗的色标（和 skin/ios4.css 里 --ios-img-out / --ios-img-in 是同一组数；只有调了透明度时才会用到这里） */
var IOS_ORIG = {
  "ios4":     { me: ["6aa6f5 8fc0fd 96c6fe a8d5fe c0e9fe d4f3ff", "2e5a96"] },
  "ios4-sms": { me: ["3ead36 6dbe39 7cc63b a6dd42 beee5c d3ff89", "004a0d"] },
  him: ["f4f4f4 e2e2e2 dddddd dddddd e7e7e7 f4f4f4", "6c6d6f"]
};
var IOS_BUB_PATH = "M14.5,0.5 H22 A14,14 0 0 1 36,14.5 V16.5 C36,23.2 38.9,27.6 43.6,29.4 C39.2,30.1 34.8,29.4 31.5,27.4 C29,28.9 25.8,29.5 22,29.5 H14.5 A14,14 0 0 1 0.5,15.5 V14.5 A14,14 0 0 1 14.5,0.5 Z";
var IOS_BUB_OFFS = ["0", "0.26", "0.48", "0.87", "0.98", "1"];
function bubSvgUrl(svg){
  return 'url("data:image/svg+xml,' + svg.replace(/[<>#,()%]/g, function(c){ return "%" + c.charCodeAt(0).toString(16).toUpperCase(); }) + '")';
}
/* 调了透明度时：投影只留在气泡外面那一圈，免得从变透明的气泡里透出一层灰 */
function bubShadowMask(alpha){
  return alpha < 1 ? ["<mask id='m'><rect width='44' height='31' fill='#fff'/><path d='" + IOS_BUB_PATH + "' fill='#000'/></mask>", " mask='url(#m)'"] : ["", ""];
}
/* 皮肤原来的画法（苹果那颗）：六个色标从上到下。alpha 不给 = 1，出来的字符串和 css 里那张一个字都不差 */
function iosBubbleImg(stops, stroke, mirror, alpha){
  alpha = alpha == null ? 1 : alpha;
  var p = "<path d='" + IOS_BUB_PATH + "'", g = "", m = bubShadowMask(alpha);
  for (var i = 0; i < 6; i++) g += "<stop offset='" + IOS_BUB_OFFS[i] + "' stop-color='#" + stops[i] + "'/>";
  var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='44' height='31' viewBox='0 0 44 31'><defs>"
    + "<linearGradient id='f' x1='0' y1='0' x2='0' y2='30' gradientUnits='userSpaceOnUse'>" + g + "</linearGradient>"
    + "<linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff'/><stop offset='1' stop-color='#fff' stop-opacity='.4'/></linearGradient>"
    + "<clipPath id='c'><path d='" + IOS_BUB_PATH + "'/></clipPath>" + m[0] + "</defs>"
    + "<g" + (mirror ? " transform='translate(44,0) scale(-1,1)'" : "") + ">"
    + p + " fill='#000' fill-opacity='.22' transform='translate(0,.8)'" + m[1] + "/>"
    + p + " fill='url(#f)'" + (alpha < 1 ? " fill-opacity='" + alpha + "'" : "") + "/>"
    + "<g clip-path='url(#c)'>" + p + " fill='none' stroke='#fff' stroke-opacity='.9' stroke-width='1.2' transform='translate(0,1.3)'/></g>"
    + "<rect x='6' y='1.2' width='23' height='11' rx='5.5' fill='url(#s)' opacity='0.8'/>"
    + p + " fill='none' stroke='#" + stroke + "' stroke-width='.7'/></g></svg>";
  return 'url("data:image/svg+xml,' + svg.replace(/[<>#,()]/g, function(c){ return "%" + c.charCodeAt(0).toString(16).toUpperCase(); }) + '")';
}

/* ── 颜色换算（OKLCH：明度、鲜艳度、色相分开调，调亮的时候颜色不会发灰） ── */
function bubHexToLch(h){
  function lin(c){ c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  var r = lin(parseInt(h.slice(0, 2), 16)), g = lin(parseInt(h.slice(2, 4), 16)), b = lin(parseInt(h.slice(4, 6), 16));
  var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b),
      m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b),
      s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  var L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      bb = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return [L, Math.hypot(a, bb), (Math.atan2(bb, a) * 180 / Math.PI + 360) % 360];
}
function bubLchToHex(L, C, H){
  function gam(c){ return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; }
  L = Math.min(1, Math.max(0, L));
  var c = C, v, i, ok;
  for (i = 0; i < 60; i++){                                // 超出屏幕能显示的范围就只降鲜艳度，明度和色相不动
    var a = c * Math.cos(H * Math.PI / 180), b = c * Math.sin(H * Math.PI / 180);
    var l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3),
        m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3),
        s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    v = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
         -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
         -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
    ok = v[0] >= -0.0005 && v[0] <= 1.0005 && v[1] >= -0.0005 && v[1] <= 1.0005 && v[2] >= -0.0005 && v[2] <= 1.0005;
    if (ok) break;
    c *= 0.95;
  }
  return v.map(function(x){ x = Math.round(Math.min(1, Math.max(0, gam(Math.min(1, Math.max(0, x))))) * 255); return (x < 16 ? "0" : "") + x.toString(16); }).join("");
}
/* 一个基准色 → 一颗玻璃气泡要的五个颜色。light = 中间不够亮，字要用白的 */
function bubbleGlass(base){
  var t = BUBBLE_GLASS, B = bubHexToLch(base), L = B[0], C = Math.max(B[1], 0.02), H = B[2];
  var Lc = L + (0.955 - L) * t, Cc = C * (1 - 0.55 * t);
  return {
    top: bubLchToHex(Math.min(0.975, Lc + 0.02), Cc * 0.85, H),
    mid: bubLchToHex(Lc, Cc, H),
    bot: bubLchToHex(Math.min(0.97, Lc + 0.015), Cc * 1.15, H),
    edge: bubLchToHex(L, C * 1.05, H),                     // 边缘那一圈 = 基准色本身
    line: bubLchToHex(Math.max(0.2, L - 0.14), C * 1.1, H), // 最外面的细线：比基准色深一点，不用黑
    light: Lc < 0.62
  };
}
function glassBubbleImg(g, mirror, alpha){
  alpha = alpha == null ? 1 : alpha;
  var p = "<path d='" + IOS_BUB_PATH + "'", m = bubShadowMask(alpha);
  var svg = "<svg xmlns='http://www.w3.org/2000/svg' width='44' height='31' viewBox='0 0 44 31'><defs>"
    + "<linearGradient id='f' x1='0' y1='0' x2='0' y2='30' gradientUnits='userSpaceOnUse'><stop offset='0' stop-color='#" + g.top + "'/><stop offset='.5' stop-color='#" + g.mid + "'/><stop offset='1' stop-color='#" + g.bot + "'/></linearGradient>"
    + "<linearGradient id='s' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#fff' stop-opacity='.98'/><stop offset='1' stop-color='#fff' stop-opacity='.12'/></linearGradient>"
    + "<filter id='b' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='1.7'/></filter>"
    + "<filter id='b2' x='-20%' y='-20%' width='140%' height='140%'><feGaussianBlur stdDeviation='.7'/></filter>"
    + "<clipPath id='c'><path d='" + IOS_BUB_PATH + "'/></clipPath>" + m[0] + "</defs>"
    + "<g" + (mirror ? " transform='translate(44,0) scale(-1,1)'" : "") + ">"
    + p + " fill='#" + g.edge + "' fill-opacity='.34' transform='translate(0,1.1)'" + m[1] + "/>"
    + p + " fill='url(#f)'" + (alpha < 1 ? " fill-opacity='" + alpha + "'" : "") + "/>"
    + "<g clip-path='url(#c)'>"
      + p + " fill='none' stroke='#" + g.edge + "' stroke-width='5.5' stroke-opacity='.9' filter='url(#b)'/>"
      + p + " fill='none' stroke='#fff' stroke-opacity='.85' stroke-width='1.6' transform='translate(0,-1.9)' filter='url(#b2)'/>"
      + p + " fill='none' stroke='#fff' stroke-opacity='.7' stroke-width='1' transform='translate(0,1.2)'/>"
    + "</g>"
    + "<rect x='5.5' y='1.5' width='24' height='9.5' rx='4.75' fill='url(#s)' opacity='0.8'/>"
    + p + " fill='none' stroke='#" + g.line + "' stroke-width='.7' stroke-opacity='.9'/></g></svg>";
  return bubSvgUrl(svg);
}

/* ── 读写选择 ── */
function bubbleChoice(side){            // "" | 色卡 id | "#rrggbb"
  try{
    var v = localStorage.getItem(BUBBLE_KEYS[side]) || "";
    if (BUBBLE_COLORS.hasOwnProperty(v)) return v;
    if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  }catch(e){}
  return "";
}
function bubbleBaseHex(choice){ return !choice ? "" : choice.charAt(0) === "#" ? choice.slice(1) : BUBBLE_COLORS[choice][1]; }
function bubbleOpacity(side){
  try{ var v = parseFloat(localStorage.getItem(BUBBLE_OPACITY_KEYS[side])); if (v >= 0.2 && v <= 1) return v; }catch(e){}
  return 1;
}
/* 给选色页的小图标 / 预览用：某个选择画出来是哪张图（choice 为空 = 皮肤原色，返回 "" 让 css 自己用原图） */
function bubbleImgFor(choice, side, alpha){
  var mirror = side === "him", base = bubbleBaseHex(choice);
  if (base) return glassBubbleImg(bubbleGlass(base), mirror, alpha);
  if (alpha == null || alpha >= 1) return "";
  var skin = document.documentElement.getAttribute("data-skin"), o = mirror ? IOS_ORIG.him : (IOS_ORIG[skin] || IOS_ORIG.ios4).me;
  return iosBubbleImg(o[0].split(" "), o[1], mirror, alpha);
}
/* 把选好的颜色挂到 <html> 上：--bub-me / --bub-him（只有 skin/ios4.css 读它们）；字要用白的就挂 data-bub-me-ink="light"。
   皮肤原色 + 不透明 = 全部拿掉，一个变量都不留。 */
function applyBubbleColors(){
  var de = document.documentElement, ios = (de.getAttribute("data-skin") || "").indexOf("ios4") === 0;
  ["me", "him"].forEach(function(side){
    var choice = ios ? bubbleChoice(side) : "", img = ios ? bubbleImgFor(choice, side, bubbleOpacity(side)) : "", base = bubbleBaseHex(choice);
    if (img) de.style.setProperty("--bub-" + side, img); else de.style.removeProperty("--bub-" + side);
    if (base && bubbleGlass(base).light) de.setAttribute("data-bub-" + side + "-ink", "light"); else de.removeAttribute("data-bub-" + side + "-ink");
  });
}
applyBubbleColors();

/* ── 壁纸：有就挂 --chat-wall 和 data-wall="on"（skin/ios4.css 里 .wall 那一层读它），没有就全部拿掉 ── */
var WALLPAPER_KEY = "companion_wallpaper";
/* 自带壁纸：[id, 名字]，图是 wallpapers/<id>.jpg，小图是 wallpapers/thumbs/<id>.jpg。要加一张就放两个文件、在这里添一行。
   wallpapers/ 文件夹要一直放在本文件旁边（地址是按本文件所在的位置算的，宿主把 skin/ 放在哪都行）。 */
var BUBBLE_WALLPAPERS = [
  ["halftone", "Halftone"], ["sparkle-sky", "Sparkle Sky"], ["blossom", "Blossom"], ["stardust", "Stardust"],
  ["seafoam", "Seafoam"], ["music-box", "Music Box"]
];
var BUBBLE_SKIN_BASE = (function(){
  try{ var s = document.currentScript && document.currentScript.src; return s ? s.slice(0, s.lastIndexOf("/") + 1) : ""; }catch(e){ return ""; }
})();
function bubbleWallpaperUrl(id, thumb){ return BUBBLE_SKIN_BASE + "wallpapers/" + (thumb ? "thumbs/" : "") + id + ".jpg"; }
function wallpaperChoice(){            // "" | 自带壁纸的 id | "custom"
  var v = "";
  try{ v = localStorage.getItem(WALLPAPER_KEY) || ""; }catch(e){}
  if (v.indexOf("data:image/") === 0) return "custom";
  if (v.indexOf("builtin:") === 0){ var id = v.slice(8); for (var i = 0; i < BUBBLE_WALLPAPERS.length; i++) if (BUBBLE_WALLPAPERS[i][0] === id) return id; }
  return "";
}
function applyWallpaper(){
  var de = document.documentElement, c = wallpaperChoice(), url = "";
  if (c === "custom"){ try{ url = localStorage.getItem(WALLPAPER_KEY) || ""; }catch(e){} }
  else if (c) url = bubbleWallpaperUrl(c, false);
  if (url){ de.style.setProperty("--chat-wall", 'url("' + url + '")'); de.setAttribute("data-wall", "on"); }
  else { de.style.removeProperty("--chat-wall"); de.removeAttribute("data-wall"); }
}
applyWallpaper();
