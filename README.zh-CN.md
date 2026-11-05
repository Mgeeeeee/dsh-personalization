[English](README.md) | **中文**

# dsh-ui-personalization

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）客户端的个性化插件：把侧栏底部那行账号换成你自己的头像、昵称与账户余额，另外可以隐藏侧栏顶部的品牌标识。dsh 自身不提供这些，本插件以客户端 cordis bundle 的形式挂在它预留的插槽上。

针对 dsh `0.2.1-rc.5` 开发，未在其他版本上测试。

## 安装

```shell
dsh plugin --profile <你的 profile> add github:Mgeeeeee/dsh-ui-personalization
```

装完刷新页面；没生效就重启一次 profile。`dsh plugin` 是 pnpm 的直通，所以目标也可以是本地目录的绝对路径：

```shell
dsh plugin --profile <profile> add /绝对路径/dsh-ui-personalization
```

本插件只从 GitHub 分发，没有发到 npm。设置面板的「添加插件」对话框里照样可以装，填上面那串完整地址即可；只填 `dsh-ui-personalization` 会报「不在 npm 注册表里」——这个失败是有意的，npm 上的旧名 `dsh-personalization` 属于另一位作者的插件，按名字装会装错东西。

dsh 里的 agent 也可以直接装：让它执行 `plugin_manager install_bundle <包目录绝对路径>`。

## 用法

1. 侧栏底部的头像行显示你的头像、昵称，右端是该账户的余额；点它打开设置面板。
2. **设置 → 个性化**：面板左侧导航里的一页，排在「Agent 预设」之后。页面按功能分两张卡片，每张以它自己的开关开头：
   - **身份行**：自定义身份（开关）→ 头像（点头像即选图；鼠标悬停或键盘聚焦时，头像上浮出铅笔图标、右上角浮出叉号，点叉号恢复默认）→ 昵称
   - **界面元素**：隐藏顶部品牌标识（开关）

头像在本地缩放到 128px 方图后存进 localStorage；昵称即时生效。侧栏折叠成图标栏时，昵称与余额不显示（那一行只剩头像）。

## 挂了哪些座位

| 位置 | 插槽 | 说明 |
|---|---|---|
| 侧栏底部 | `settings.launcher`（single） | 以 `priority: -1` 压过系统自带的账号行；「自定义身份」关掉即注销注册，原样恢复 |
| 侧栏顶部品牌 | `sidebar.brand.mark`、`sidebar.brand.name`（single） | 「隐藏顶部品牌标识」打开时顶上、渲染空；关掉即让回 |
| 设置面板导航 | `settings.section`（list，id `ui-personalization`，order `25`） | 一页一条导航项；`label` 是随语言变化的 thunk |

三处都通过 `ctx.slots.inject` 挂载：插槽声明出现时装上，声明消失时自动拆掉。开关控制的注册在状态变化时动态装上或注销。

**品牌行的高度**由壳写死（60px，且没有走 token），只清空上面两个座位会留下一块空白。插件为此额外注入一条规则，且只在开关打开时挂到文档上：

```css
[class*="_logoRow"]:not(:has(button)){height:0;min-height:0;margin:0;padding:0;overflow:hidden}
```

这是整个插件唯一一处伸到自己组件之外的地方。它按壳的 CSS-modules 局部名片段匹配，并拒绝含按钮的行——Windows 上折叠按钮就在那一行里，这条守卫让那边保持原样。壳若改了局部名，规则自动失效，结果是退回"内容空了但留着空行"。

**设置分页打不开指定页**：壳没有对外提供"打开某个分页"的接口，所以点头像只能打开设置面板，落在哪一页由壳自己的选中状态决定。

## 余额

侧栏那一行右端的数字来自账户 Remote，和官方账号页同一条路径：

```
ctx.remote.account.getBalance({ version, locale, timezoneOffsetSeconds })
```

- **客户端版本**：请求头里的 `x-client-version` 取自页面启动清单 `window.__DSH_BOOT__.release.version`。壳构建时内联进自己 bundle 的就是同一个发布版本，因此 dsh 升级不再需要改插件；清单里没有发布版本的部署不显示余额，不会拿一个旧版本去请求。
- **口径**：充值余额 + 赠金余额，同一币种求和；沿用官方账号页的两位小数与不足一分显示规则（`<¥0.01`）。
- **刷新**：账号状态流的每一帧（登录、登出、状态变化都会推动一次）、插件激活时、点开设置面板那一下，另有页面可见时每 3 分钟一次的兜底。凭证要等状态流首帧才可用，所以读取跟在状态流之后。
- **拿不到就不显示**：未登录、离线、接口拒绝、或该部署没有账户 Remote，侧栏那一格直接不渲染，不会显示错数。

## 数据

全部状态在 `localStorage['dsh.personalization.v1']`（键沿用改名前 `dsh-personalization` 时期的旧名，改包名不会弄丢已存的头像与昵称）：

```json
{ "enabled": true, "nickname": "示例", "avatar": "data:image/png;base64,...", "hideBrand": false }
```

`enabled` 管自定义身份，`hideBrand` 管顶部品牌标识，互不影响。纯客户端状态：不进 session log、不上云、余额不落盘；换浏览器或清缓存即丢失。

## 已知限制

1. **「退出登录」没有入口。** 系统自带的账号行除了头像和手机号，还挂着一个下拉菜单（设置 / 意见反馈 / 退出登录）。`settings.launcher` 是单占位插槽，接管它就等于接管整个菜单，而退出登录的实现在系统插件内部。需要时到本页把「自定义身份」关掉，原账号行与菜单立刻回来。官方设置本身不受影响，侧栏底部的「设置」行照旧。
2. **品牌行靠一条按类名片段匹配的规则收起**，见上文。壳改结构时会静默失效（只留下空白，不报错）。
3. **导航图标与「通用设置」相同。** 壳按分页 id 固定映射图标，未知 id 落到默认齿轮，注册项本身拿不到图标字段。
4. **头像上的铅笔只在悬停或键盘聚焦时显形。** 触屏没有 hover，点头像仍然能选图，只是没有这层提示；右上角的叉号在 `hover:none` 的设备上常显，不必靠位置去猜。

## 卸载

```shell
dsh plugin --profile <你的 profile> remove dsh-ui-personalization
```

dsh 里的 agent 则可以执行 `plugin_manager remove_bundle dsh-ui-personalization`。

卸载后侧栏恢复系统账号行，设置导航里的一页随之消失；localStorage 里那条记录不会被清除，想清干净就删掉那个键。

一处坑：用 `link:` 装的时候，卸载不会删掉 profile 的 `node_modules/` 下那条软链，它会变成悬空链，卸载后顺手删掉。

## 开发

| 文件 | 作用 |
|---|---|
| `client.js` | 浏览器半边，全部逻辑 |
| `index.js` | 宿主半边，目前为空 |
| `cordis.patch.yml` | 往 cordis 里插入本插件的行 |
| `locale/en.json`、`locale/zh.json` | 插件卡片与详情页的标题、说明 |
| `icon.svg` | 插件卡片图标 |
| `THIRD-PARTY.md` | 抄自 dsh 自带组件的样式与标记清单 |

客户端半边按 `window.__ModuleLoader__.load({ id, factory })` 注册，`id` 必须等于包名；`react` 从页面的模块表里取，不需要自备。样式类名一律用 `dshprf_` 前缀，颜色与间距用 dsh 的主题 token（`--dsw-*`）。写死的颜色只有两类：头像的字母底色（按昵称算出来的图案色），以及覆盖层上的黑底白字——遮罩 `#00000073`、叉号角标 `#000000b3` 和它们的白图标。后者是刻意不跟主题走的：遮罩压在照片上，两种主题下都要是深底浅字。

用 `link:` 装的，改完刷新页面即可；装的是 GitHub 那份实体副本的话，工场里的改动不会进去，升级要卸了再装。新代码没生效就重启 dsh。

本插件自己的版本号写在 `client.js` 顶部的 `PLUGIN_VERSION`，设置页脚注会显示它，两边必须与 `package.json` 的 `version` 一致——结构检查会拦下不一致的发布。余额请求用的壳版本不在这里，见上文「余额」。

## 致谢

这个插件能长得像 dsh 的一部分，是因为 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 本身是开源的：插槽机制、cordis bundle、plugin_manager 全部来自它；界面上的样式、标记与余额显示口径也都参照了它自带的组件（逐条见 [THIRD-PARTY.md](THIRD-PARTY.md)）。谢谢 DeepSeek 把这个项目开放出来。

## 许可

[MIT](LICENSE)。样式与标记的部分来源见 [THIRD-PARTY.md](THIRD-PARTY.md)。
