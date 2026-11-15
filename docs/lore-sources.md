# 角色内容与素材来源

整理日期：2026-11-06。范围仅限《Slay the Spire》第一代；不包含第二代、Downfall 或其他模组。

## 内容边界

`dist/characters.js` 导出 16 个不同人物／敌人的内容。`lore` 只写能在角色介绍、事件文字或战斗行为中核对的信息；`reading` 是明确标注的同人联想，`association` 说明是故事、事件还是玩法意象。MBTI 对应不是 Mega Crit 的官方设定，也不是对这些虚构人物的心理评估。`summary` 是供读者对照的倾向描述，`strength`、`growth` 是实践建议，不承诺读者具备某种能力。

所有 `quote` 均为本项目原创短句，不是角色台词，展示时不应添加“原作台词”标签。

角色的正邪、力量大小或作为首领的地位，都不代表对应人格的道德或能力高低。敌人对白有限，因此若干对应来自战斗职责的拟人化阅读，而非详细的心理传记。

## 角色与依据

| 类型 | 一代角色 | 核对的事实 | 来源 |
| --- | --- | --- | --- |
| INTJ | 时间吞噬者 / Time Eater | 十二张牌触发时间扭曲；半血以下的一次恢复行动 | [Time Eater](https://slaythespire.wiki.gg/wiki/Time_Eater) |
| INTP | 故障机器人 / The Defect | 觉醒自我意识的机械；操纵充能球；感知石里无法定义平衡的片段 | [Defect](https://slaythespire.gg/characters/Defect)、[Sensory Stone](https://slaythespire.wiki.gg/wiki/Sensory_Stone) |
| ENTJ | 收藏家 / The Collector | 召唤火炬头；增强己方；施加多种负面状态 | [The Collector](https://slaythespire.wiki.gg/wiki/The_Collector)、[战斗数据镜像](https://slaythespire.gg/bosses/The_Collector) |
| ENTP | 商人 / The Merchant | 商店售卖与移除卡牌服务；浏览购买时主动闲聊 | [Merchant](https://slay-the-spire.fandom.com/wiki/Merchant)、[The Merchant](https://slaythespire.wiki.gg/wiki/The_Merchant) |
| INFJ | 观者 / The Watcher | 盲眼苦行者、评估尖塔；姿态；感知石的观察使命与失联同伴 | [Watcher](https://slaythespire.gg/characters/Watcher)、[Sensory Stone](https://slaythespire.wiki.gg/wiki/Sensory_Stone) |
| INFP | 涅奥 / Neow | 开局祝福；诅咒书本记载的复活、流放、复仇与利用外来者 | [Neow](https://slaythespire.wiki.gg/wiki/Neow) |
| ENFJ | 甜圈 / Donu | 力量之环同时为自己和八体增加力量 | [八体与甜圈](https://sts.huijiwiki.com/wiki/八体＆甜圈) |
| ENFP | 兰伟德 / Ranwid | 事件中热情招呼与换物；遗物引言中的好奇与研究兴趣 | [We Meet Again!](https://slaythespire.wiki.gg/wiki/We_Meet_Again%21)、[兰伟德](https://sts.huijiwiki.com/wiki/兰伟德) |
| ISTJ | 守护者 / The Guardian | 攻防模式切换、伤害阈值、防御模式尖刺外壳 | [The Guardian](https://slaythespire.wiki.gg/wiki/The_Guardian) |
| ISFJ | 八体 / Deca | 防御屏障为双方提供格挡；攻击加入晕眩 | [八体与甜圈](https://sts.huijiwiki.com/wiki/八体＆甜圈) |
| ESTJ | 地精首领 / Gremlin Leader | 召集小地精、增加力量并保护随从 | [Gremlin Leader](https://slaythespire.wiki.gg/wiki/Gremlin_Leader)、[战斗数据镜像](https://slaythespire.gg/elites/Gremlin_Leader) |
| ESFJ | 牧师 / The Cleric | 热情大声招呼；收费治疗与移除卡牌 | [The Cleric](https://slaythespire.wiki.gg/wiki/The_Cleric) |
| ISTP | 静默猎手 / The Silent | 女猎手；匕首与毒；感知石的狩猎仪式 | [Silent](https://slaythespire.gg/characters/Silent)、[Sensory Stone](https://slaythespire.wiki.gg/wiki/Sensory_Stone) |
| ISFP | 换脸商 / Face Trader | 静止如雕像、轻声留客、触碰或交换面孔 | [换脸商](https://sts.huijiwiki.com/wiki/换脸商)、[Face Trader](https://slaythespire.wiki.gg/wiki/Face_Trader) |
| ESTP | 铁甲战士 / The Ironclad | 军团幸存者、恶魔契约；燃烧之血与生命／消耗相关手段 | [Ironclad](https://slay-the-spire.fandom.com/wiki/Ironclad) |
| ESFP | 邪教徒 / Cultist | 开局仪式、持续攻击与力量增长；前三幕出现及觉醒者战 | [Cultist](https://slaythespire.wiki.gg/wiki/Cultist) |

## 特别核对与未采用的说法

- 中文名采用一代简体中文习惯：Donu 是“甜圈”，Deca 是“八体”；Face Trader 是“换脸商”。初步讨论中的“咚咚”“换脸师”未进入最终模块。
- 不把“时间吞噬者就是观者失联的同伴”写成已确认事实；这是玩家推测。
- 不把静默猎手记忆里的幽灵生物直接认定为天罚，也不编造“家乡被毁、因此复仇”的故事。
- 不把涅奥单纯写成慈爱的救世者。她寻求复仇、利用复活者的描写在原作事件中有依据。
- 不把换脸商写成已知的艺术家，也不为甜圈、八体或守护者补写未经证实的身世。
- 不采用搜索结果中的二代同名角色、二代伪商人、模组内容或第三方同人画作。

## 图片

16 个本地文件位于 `dist/assets/characters/`。其中 14 张来自 [SlayTheSpire.gg](https://slaythespire.gg/)；商人来自 [Slay the Spire Wiki](https://slaythespire.wiki.gg/wiki/The_Merchant)，八体来自 [GuideSlayTheSpire 一代图鉴仓库](https://github.com/xxxawenxxx/GuideSlayTheSpire)。这些都是非官方资料来源；游戏角色与美术权利归 Mega Crit 及相应权利人。来源站未授予本项目独占权利，素材不能描述成本站原创或自由版权图片。

逐文件下载 URL、尺寸、文件大小、SHA-256 与采集日期记录在 `dist/assets/characters/provenance.json`。图片保留下载时的字节，没有在本地裁剪、重绘或生成新的角色美术。多数源 URL 以 `.png` 结尾，实际返回 WebP；本地按真实格式保存扩展名。商人通过 wsrv.nl 公共图片缓存获取百科原图，清单同时保留原始地址和实际获取地址。

| 本地文件 | 内容与展示说明 |
| --- | --- |
| `ironclad.webp` | 铁甲战士透明立绘，366 × 259 |
| `silent.webp` | 静默猎手透明立绘，259 × 237 |
| `defect.webp` | 故障机器人透明立绘，242 × 233 |
| `watcher.webp` | 观者透明立绘，429 × 288 |
| `time-eater.webp` | 时间吞噬者，700 × 700 |
| `collector.webp` | 收藏家，300 × 407 |
| `guardian.webp` | 守护者，700 × 700 |
| `donu-deca.webp` | **实际仅含甜圈**，351 × 365；源站文件名为 `donu_and_deca.png`，不得用于八体卡片 |
| `gremlin-leader.webp` | 地精首领，221 × 292 |
| `cultist.png` | 邪教徒，700 × 700 |
| `neow.webp` | 涅奥事件头像，100 × 100 |
| `cleric.webp` | 牧师事件头像，100 × 100 |
| `face-trader.webp` | 换脸商事件头像，100 × 100 |
| `ranwid.webp` | 兰伟德事件头像，100 × 100 |
| `merchant.png` | 一代商人与地毯、货物的独立透明原图，432 × 302 |
| `deca.png` | 一代八体独立透明立绘，310 × 333 |

所有角色均有独立的本地图片。商人和八体经过视觉核对，未使用二代伪商人、甜圈、钱袋图标、未组装的动画纹理或第三方同人画作代替。100px 事件头像适合小尺寸展示，避免拉伸至整幅插画。

## 2026-11-06 逻辑复核更新

- 重写16段联想，显示对应来自故事、相遇场景还是战斗机制。弱联想不再写成“最直接的依据”或“证明此类型”；没有比当前对应更有依据的替代角色，因此未互换角色来制造确定性。
- 时间吞噬者的计数、守护者的脚本模式，不能推出独立思考或主动规划；收藏家与地精首领的召唤机制不能支持N/S区分；甜圈、八体的全体增益不能证明关怀动机。涅奥、换脸商与邪教徒只保留有限的形象联想。
- 修正铁甲战士的标签为“燃烧之血”、商人分类为“商店角色”；补齐换脸商触摸选项的生命代价；区分守护者触发转换与随后获得尖刺的时机。依据：[燃烧之血](https://sts.huijiwiki.com/wiki/燃烧之血)、[守护者行动表](https://slay-the-spire.fandom.com/wiki/The_Guardian)、[换脸商选项](https://slaythespire.wiki.gg/wiki/Face_Trader)。
- 16条“你能……”式长处改为可以实践的方向；8段摘要去掉能力承诺。reading当前统一以“同人联想”开头，原验收记录中的“同人解读”是上一版措辞。

## 访问与验证记录

Firecrawl 与 Tavily 在主任务中分别报告额度／限流错误，资料检索因此使用网页搜索回退。wiki.gg、Fandom 与灰机的直接正文抓取部分返回 403；可用的搜索索引提供了角色、事件或战斗条目的正文。SlayTheSpire.gg 可直接读取和下载图片。部分镜像叙述带有未经核实的推断，仅使用与游戏文本或其他 wiki 相互吻合的内容。

已用 Node 读取模块并检查：16 种类型齐全、16 个名字互不重复、必需字段完整、每项 3 个标签、每项有来源、每段解读以“同人解读”开头；16 个图片路径均存在。图片经过格式校验，四位主角与甜圈、时间吞噬者、守护者、邪教徒、涅奥、商人、八体另作视觉核对。补齐两图前后，已有 14 个图片文件的 SHA-256 保持不变。未使用浏览器标签页。
