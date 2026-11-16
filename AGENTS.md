# 给 AI 代理的安装说明

你的主人把这个仓库交给你，是想让你把这套「皮」披到**她自己的聊天前端**上。先把这一页读完再动手。

## 这是什么，不是什么

- **是**：一层外观。老 iPhone（iOS 4 / 5 年代）「信息」的聊天气泡，加上气泡换色、透明度、换壁纸、聊天方式开关这几样设置。纯 CSS + 原生 JS，没有依赖，没有图片文件。
- **不是**：聊天应用。这里没有模型、没有后端、没有聊天记录、没有账号。宿主（主人的前端）原来怎么收发消息，装完以后还是怎么收发。
- 除了宿主本来就有的请求，这套皮**不发任何网络请求**；所有设置只存在浏览器的 localStorage 里。

「皮」在 `skin/`。`index.html` + `demo/` 是一副演示用的骨头，只是为了让人能直接看到效果，**不要把 `demo/` 搬进宿主**。
`examples/plain-chat/` 是一次完整的示范：`before.html` 是一个结构和 class 名都完全不同的聊天页，`after.html` 是披上皮之后的样子，拿它俩对比着看最快。

## 文件

| 文件 | 是什么 | 什么时候要 |
| --- | --- | --- |
| `skin/bubble-colors.js` | 色卡、自带壁纸的清单、由一个基准色画出整颗气泡、读写选择、把颜色 / 透明度 / 壁纸挂到 `<html>` 上 | 一定要。放在 `<head>` 里**同步**加载（不要 defer / async），这样页面一出来颜色就是对的，不会先闪一下默认色 |
| `skin/ios4.css` | 核心：气泡、时间条、动作小字、壁纸层 | 一定要 |
| `skin/ios4-bars.css` | 导航条和输入条的老 iPhone 样子 | 可选。宿主想保留自己的顶栏和输入框就别加 |
| `skin/ios4-settings.css` | iOS 5 样子的设置页和选色页 | 要用这里自带的设置界面就加 |
| `skin/bubble-settings.js` | 设置界面的逻辑 + `window.DialupBubble` 接口 | 同上；放在 `</body>` 前 |
| `index.html` 里 `▼ 皮 · 选色页` 到 `▲ 皮 · 设置页 结束` 之间的 HTML（三块面板） | 选色页、壁纸页、设置页的结构 | 要用自带的设置界面就整段照抄，**id 不要改** |
| `index.html` 里 `▼ 皮 · 顶栏`、`▼ 皮 · 输入条` 两段 HTML | 顶栏和输入条的结构 | 要用老 iPhone 的顶栏和输入条就照抄，**id 不要改** |

加载顺序：`bubble-colors.js`（head）→ 宿主自己的 CSS → `ios4.css` → `ios4-bars.css`（可选）→ `ios4-settings.css`（可选）→ … → `bubble-settings.js`（body 末尾）。

## 步骤

### 1. 先读宿主，填这张对照表

动手前先在宿主的代码里把下面这些找出来，写给主人看一眼再继续：

| 皮要的 | 宿主里对应的是 |
| --- | --- |
| 一行消息（外层） | ？ |
| 气泡本体（装文字的那个元素） | ？ |
| 怎么区分「我发的」和「对方发的」 | ？ |
| 消息列表的容器 | ？ |
| 时间 / 日期分隔条（没有可以不填） | ？ |
| 渲染消息的那段代码在哪个文件、哪个函数 | ？ |
| 宿主自己给气泡写的样式在哪 | ？ |

### 2. 挂开关

给 `<html>` 加 `data-skin="ios4"`。其实不用手写：`bubble-colors.js` 一加载就会挂上（`ios4` = iMessage 蓝，`ios4-sms` = Classic 绿，按用户上次的选择）。
皮的每一条 CSS 都以 `:root[data-skin^="ios4"]` 开头，拿掉这个属性，皮就整个不生效——这也是卸载和「先装上、默认关着」的办法。

### 3. 让结构对上

皮认的是下面这些 class。两种接法，选一种：

- **接法 A（推荐）**：在宿主渲染消息的地方，给它的元素**补上**这些 class，宿主原来的 class 留着不动。结构不用改。
- **接法 B**：宿主的渲染代码不方便动时，把 `skin/ios4.css` 复制一份，把里面的选择器改成宿主的（例如 `.row.human .bubble` → `.msg[data-from="me"] .text`）。以后皮更新了要重新改一遍，所以能用 A 就用 A。

| class | 加在哪 | 必须吗 |
| --- | --- | --- |
| `row` + `human` | 「我」发的一行消息的外层元素 | 必须 |
| `row` + `ai` | 「对方」发的一行消息的外层元素 | 必须 |
| `bubble` | 行里面装文字的那个元素（要是 `row` 的直接子元素） | 必须 |
| `tail` | 加在 `row` 上：这一行是一组连发消息里的**最后一条**（或者单独一条）。带这个 class 的气泡才有尾巴 | 必须，不加就全都没有尾巴 |
| `grouped` | 加在 `row` 上：这一行和上一行是同一个人连着发的。只影响行距（挨得更近） | 可选 |
| `day stamp` | 时间 / 日期分隔条 | 可选 |
| `act-note`（在 `row ai` 上）+ `note`（在 `bubble` 上） | 一整段括号里的动作描写，显示成一行灰色小字而不是气泡 | 可选 |
| `txt` | 气泡里包文字的 `<span>` | 可选 |

**成组和尾巴的规则**（原实现）：同一个人、相隔不到 5 分钟的连续消息算一组；一组里只有最后一条有 `tail`，第二条起有 `grouped`。隔了一小时以上（或换了一天、或是第一条）才出一行时间条。宿主有自己的规则就用自己的，只要 `tail` 标对就行。参考实现在 `demo/chat.js` 的 `buildRows()` 和 `makeMessage()`。

把一条长回复拆成「几句话一个气泡」不是 CSS 的事，是渲染时把一条消息画成好几行。想要的话参考 `demo/chat.js` 的 `splitSms()`；不想要就跳过，不影响别的。

### 4. 让宿主自己的气泡样式让路（最容易漏的一步）

宿主原来给气泡写的背景色、圆角、内边距、对齐方式，只要选择器比皮的更「重」（比如带了 id），就会盖在皮上面，结果是气泡四角露出方形底色、或者挤成一条。办法是让那些规则只在没披皮时生效：

```css
/* 原来 */      #log li p { background:#e5e5e5; border-radius:6px; padding:8px 12px; }
/* 改成 */  html:not([data-skin]) #log li p { background:#e5e5e5; border-radius:6px; padding:8px 12px; }
```

只需要处理**消息行和气泡**相关的规则（背景、圆角、边框、内边距、外边距、`text-align` / `float` 对齐、`max-width`）。宿主别处的样式不要碰。

### 5. 顶栏和输入条（可选；加上才是完整的老 iPhone）

加载 `ios4-bars.css`，然后把 `index.html` 里标着 `▼ 皮 · 顶栏` 和 `▼ 皮 · 输入条` 的两段 HTML 照抄进宿主，再做五件事：

1. **把宿主自己的顶栏和输入框藏起来**（只在披皮时藏）：`html[data-skin] .宿主的顶栏, html[data-skin] .宿主的输入框 { display:none; }`
2. **接上宿主自己的发送**：输入框是 `#input`（一个 `<textarea>`），发送键是 `#sendBtn`。点发送键时取 `#input` 的值，交给宿主原来的发送函数，然后清空。皮不管消息发到哪去。
3. **接上名字和两个角上的键**：对方的名字写进 `#peerName`；左上 `#backBtn` 接宿主的「返回 / 菜单」；右上 `#moreBtn` 加上 `data-skin-open="profilePanel"` 就能滑出皮的设置页（下一步）。
4. **给输入条留位置**：输入条是固定在屏幕底部的，消息列表底部要留出它的高度，否则最后一条会被挡住：`html[data-skin] .宿主的消息列表 { padding-bottom: calc(64px + env(safe-area-inset-bottom)); }`

5. **手机键盘弹起来的时候**：输入条固定在屏幕底部，手机上点输入框、键盘弹出来以后，它要跟着升到键盘上面，不然会被键盘盖住。这件事皮**不管**，因为每个前端处理键盘的办法不一样。宿主原来的输入框如果在手机上本来就不会被键盘挡，照它原来的办法处理新的输入条即可；需要参考的话，`demo/chat.js` 里搜 `keyboard-offset`，那一段用 `visualViewport` 量出键盘高度、写进 CSS 变量 `--keyboard-offset`，`ios4-bars.css` 里的输入条会读这个变量往上让。装完一定要在真手机上点一下输入框确认。

键上的字（「信息」「设置」「发送」）是写在 `ios4-bars.css` 里的（搜 `content:`），要改就改那里。输入框里的提示语是 `<textarea>` 的 `placeholder`，随宿主改。`#addBtn`（加号）和 `#emojiBtn`（笑脸）只是摆在那儿的样子，宿主有对应功能就接上，没有可以留着或删掉。

### 6. 设置界面：两条路

**路一：用这里自带的设置页和选色页。** 加载 `ios4-settings.css` 和 `bubble-settings.js`，把 `index.html` 里 `▼ 皮 · 选色页` 到 `▲ 皮 · 设置页 结束` 之间的 HTML 整段抄到宿主 `<body>` 末尾（一共三块盖满屏幕的面板：选色页、壁纸页、设置页，平时都隐藏）。然后在宿主自己的界面上放一个入口：

```html
<button type="button" data-skin-open="profilePanel">外观</button>
```

面板里的返回键加 `data-skin-close` 就能关。只想把其中某一组（比如 Bubble Color）嵌进宿主已有的设置页也可以：把那个 `<section class="settings-card">…</section>` 搬过去，外面包一层 `id="profilePanel"` 的元素（样式是按这个 id 写的），选色页那一整块仍然照抄。

**路二：宿主用自己的设置界面。** 不加载 `ios4-settings.css`，只加载 `bubble-settings.js`（或者连它也不要，直接读写 localStorage 再调 `applyBubbleColors()`）。接口见下面。

### 7. 壁纸

自带的六张壁纸在 `skin/wallpapers/`（大图）和 `skin/wallpapers/thumbs/`（壁纸页里的小图）。设置页里只有一行「Choose Wallpaper」，点进去是单独的壁纸页（`#wallPanel`），自带的图和「Choose Photo」都在那一页里。这个文件夹**要一直放在 `bubble-colors.js` 旁边**——图片地址是按那个脚本所在的位置算出来的，所以 `skin/` 整个搬到宿主的哪个目录都行，但别把它拆开。不想要自带壁纸，删掉这个文件夹，再把 `bubble-colors.js` 里的 `BUBBLE_WALLPAPERS` 清空成 `[]`，壁纸页里那一格小图会自己消失。

用户选的图会挂成 `<html>` 上的 CSS 变量 `--chat-wall`，同时 `<html>` 多一个属性 `data-wall="on"`。皮自己认的背景层是 class 为 `wall` 的元素。宿主没有这样一层的话，在宿主的聊天背景元素上加一条即可：

```css
:root[data-wall="on"] .宿主的聊天背景 { background: var(--chat-wall) center / cover no-repeat; }
```

没选壁纸时，老 iPhone 的聊天底色是 `#dbe2ed`，想还原得彻底可以把宿主的聊天背景也设成它。

### 8. 聊天方式开关（发短信 / 在身边）

这个开关**自己不会改变对方说话的方式**。皮只负责记住用户选了哪个，并把当前值交出来：`DialupBubble.chatStyle()` 返回 `"text"` 或 `"near"`。
要让它真的有用，宿主在把消息发给自己的模型时读这个值：选了「发短信」就在系统提示里加一段「像隔着手机发短信那样回：短句、分几条、少写动作」，选了「在身边」就不加（或加一段「像面对面，可以在括号里写动作」）。这段提示词怎么写由主人定。宿主不打算接的话，把设置页里「聊天方式」那一组删掉，免得摆一个按了没反应的开关。

## 接口

`skin/bubble-colors.js`（全局函数）：`applyBubbleColors()`、`applyWallpaper()`、`bubbleChoice(side)`、`bubbleOpacity(side)`、`bubbleImgFor(choice, side, alpha)`；色卡在 `BUBBLE_COLORS` / `BUBBLE_GROUPS`。

`skin/bubble-settings.js`：`window.DialupBubble`

| | |
| --- | --- |
| `setChoice(side, value)` / `getChoice(side)` | `side` = `"me"` 或 `"him"`；`value` = `""`（对方的默认银灰）、`"skin:ios4"` / `"skin:ios4-sms"`（我的原色，同时切换皮肤）、色卡 id、或 `"#rrggbb"` |
| `setOpacity(side, 0.2~1)` / `getOpacity(side)` | 透明度，1 = 不透明 |
| `imageFor(choice, side)` | 返回那颗气泡的 CSS `url(...)`，给宿主自己画小色块用 |
| `setWallpaperFromFile(file)` / `resetWallpaper()` | 壁纸 |
| `chatStyle()` / `textingOn()` | 聊天方式的当前值 |
| `openPanel(id)` / `closePanel(id)` / `openPicker(side)` | 开关面板 |
| `refresh()` | 宿主自己改了 localStorage 之后调一次 |

localStorage 键（都只在本机）：`companion_skin`、`companion_bubble_me`、`companion_bubble_him`、`companion_bubble_me_opacity`、`companion_bubble_him_opacity`、`companion_wallpaper`、`companion_ios_style`。宿主已经用了同名的键就在两个 JS 文件顶部改掉。

**换色卡**：只改 `skin/bubble-colors.js` 里的 `BUBBLE_COLORS`，一行一个颜色（`id: ["名字", "六位色值"]`）。整颗气泡是由这一个基准色算出来的，别处不用动。

## 装完自检

把宿主页面和本仓库的 `index.html` 并排打开，逐项对：

1. 「我」的气泡靠右、尾巴在右下；「对方」的靠左、尾巴在左下。
2. 连发的几条里只有最后一条有尾巴。
3. 气泡四角是圆的，**外面没有露出方形的底色**。
4. 短消息的气泡只有文字那么宽，不会撑满整行；长消息会换行，宽度不超过大约三分之二。
5. 选一个色卡里的颜色：两边气泡各自变色，刷新后还在。
6. 透明度拉到 50%：能看见气泡后面的背景。
7. 换一张壁纸：铺满聊天区；Reset 后恢复。
8. 用了皮的顶栏和输入条的话：能正常发出消息；最后一条消息没有被输入条挡住；在 iPhone 的 Safari 里顶部刘海和底部横条没有挡住东西。
9. 把 `<html>` 的 `data-skin` 属性删掉：页面回到宿主原来的样子。

## 常见症状

| 看到的 | 原因 |
| --- | --- |
| 气泡四角露出方形底色 | 宿主自己的气泡背景 / 圆角没让路（步骤 4） |
| 气泡撑满一整行、「我」的没有靠右 | 行元素上没加 `row human` / `row ai`，或者 `bubble` 不是 `row` 的直接子元素 |
| 所有气泡都没有尾巴 | 没加 `tail` |
| 最后一条消息被输入条挡住 | 消息列表底部没留位置（步骤 5 第 4 点） |
| 页面上有两个顶栏 / 两个输入框 | 宿主自己的没藏（步骤 5 第 1 点） |
| 手机上一打字，输入条被键盘盖住 | 键盘弹起没处理（步骤 5 第 5 点） |
| 所有气泡都有尾巴、挤在一起 | 每一行都加了 `tail`，应该只加在一组的最后一条 |
| 页面一打开先闪一下蓝色再变成选的颜色 | `bubble-colors.js` 没放在 `<head>` 里，或者加了 defer / async |
| 颜色选了没反应 | `<html>` 上没有 `data-skin`；或者宿主是 Shadow DOM / iframe，CSS 变量和属性要挂到那一层的根上 |
| 设置页打开是一片乱的 | 没加载 `ios4-settings.css`，或者那两段 HTML 的 id 被改了 |
| 壁纸页里自带壁纸的小图是一排灰块 | `wallpapers/` 文件夹没跟着 `bubble-colors.js` 一起搬，或者宿主的打包工具把脚本合并挪了位置（那就把 `BUBBLE_SKIN_BASE` 直接写成壁纸文件夹的网址） |
| 设置页被宿主的东西盖住 | 面板的 `z-index` 是 900 / 950，宿主有更高的层就把它调高 |

## 卸载

删掉引入的几个文件和那两段 HTML，把步骤 4 里加的 `html:not([data-skin])` 去掉，清掉上面列的 localStorage 键。

## 这份说明验证到了哪一步

- 验证过：在 `examples/plain-chat/` 那副陌生骨头上，按上面的步骤（接法 A + 步骤 4 + 步骤 5 + 路一）装成功——顶栏、气泡、输入条、用输入条发消息、换色、设置页、选色页都正常。
- 验证过：本仓库的 demo 在 Chrome 里的各个页面。
- **没有验证**：真机 iPhone Safari、宿主是 React / Vue 这类框架（原理一样：在组件里把 class 补上）、Shadow DOM、以及任何带后端的真实前端。在这些情况下遇到这页没写到的问题，请如实告诉你的主人，不要硬凑。
