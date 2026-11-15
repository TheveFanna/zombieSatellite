# zombieSatellite 定位与故事材料

> 用途：本文件是产品定位、S2 目录文案、演示视频脚本与 Devpost 提交文案的统一取材库。所有事实均附来源链接；标注「存疑」的内容，文案引用时必须带保留说法，不得写成定论。
> 红线（不变）：本应用只用公开 TLE 数据做计算与模拟，**绝不声称能接收真实射频信号**。真实信号属于用户自己的电台和天线。

---

## 一、定位与受众

**一句话定位**：给无线电与卫星守听爱好者的「过境参谋」——用一部手机和公开轨道数据，帮他们找到那些死了几十年却还在发信的老卫星：提前算好它何时过境（找）、过境时把手机对准它在天上的真实位置（指）、实时给出多普勒频移好跟着调谐（算）；没有电台的人，也能先在模拟信标里练一遍守听的手感。

**为什么这个定位是真的，不是编的**：

- 「僵尸卫星」这个题材本身就是守听社群创造的。目录里 7 颗星，有 4 颗是被业余爱好者重新发现或持续守听的（LES-1、AO-7、IMAGE、LES-5），发现者里 Scott Tilley 一人占了两颗。专业机构放弃了，是爱好者把它们找了回来。
- 守听者干这件事的真实刚需恰好就是三样数据：过境时刻、天空指向、频率修正。卫星在 VHF/UHF 段的多普勒频移可达数 kHz（145 MHz 约 ±3.4 kHz，435 MHz 约 ±10 kHz），老手要么在过境中手动跟调，要么预先把 AOS（信号出现）/TCA（最近点）/LOS（信号消失）三段频率编进电台存储信道，要么用桌面软件（Gpredict、SatPC32）经 CAT 接口自动控台。来源：[Ham Radio Satellite Operating Guide](https://www.hamradiobase.com/ham-radio-satellite-guide/)、[Doppler correction tips (qsl.net)](https://www.qsl.net/dg7ro/afu/doppl-e.htm)。
- 现有工具的门槛：Gpredict / SatPC32 是桌面软件，要自己维护 TLE、配电台控制、懂 AOS/LOS 这套术语；SatNOGS 是全球最大的开源地面站网络（500+ 在线站、累计观测千万级），但参与方式是自建地面站——RTL-SDR + 树莓派 + 天线，最好还带转台，对新人是硬件工程。来源：[SatNOGS / Libre Space Foundation](https://www.libre.space/projects/satnogs/)、[SatNOGS Wiki](https://wiki.satnogs.org/index.php?title=Main_Page&diff=4056&oldid=1956)。**手机端、零硬件、专为「找死卫星」这个玩法优化的工具，目前是空位。**

**受众分层**：

1. 核心：业余无线电守听者 / SWL（短波收听者）、SDR 玩家、卫星追踪爱好者。他们有电台或 RTL-SDR，需要过境预报和指向、多普勒数据辅助真实守听。
2. 外围：太空与航天史爱好者、STEM 传播人群。他们没有硬件，用模拟模式体验「在正确时刻对准一颗 1965 年的卫星」这件事本身。
3. 练习模式的意义：守听的真实技能（看过境表、对指向、跟多普勒调谐）可以在模拟里先练，再上真设备——这是 SatNOGS / Gpredict 都不提供的入门路径。

**大背景**：据 ESA《空间环境报告》，在轨被跟踪物体约 40,000 个，其中在役载荷仅约 11,000 个；按 ESA 统计口径，仍在轨道上的死卫星约 3,000 颗量级。来源：[ESA Space Environment Report 2025](https://www.esa.int/articles/esa-space-environment-report-2025)、[ESA 统计汇总](https://xrtechgroup.com/how-many-satellites-in-orbit/)。我们目录里的 7 颗，是这几千颗沉默者里极少数「还在说话」的。

---

## 二、每颗星的真实故事（S2 文案取材）

### 1. LES-1（NORAD 1002）· 可玩

- 1965 年 2 月 11 日由 MIT 林肯实验室研制发射（美国空军项目），试验军用通信；因接线错误没能进入预定轨道，1967 年按计划关机后沉默。
- **沉默 45 年后，2012 年 12 月 18 日，英国康沃尔的无线电爱好者 Phil Williams（呼号 G3YPQ）在约 237 MHz 上重新听到它的信号**，随后巴西（PY2ZX）、德国（DD1US）的 Hearsat 社群成员相继证实。推测原因是电池老化短路，阳光照射时太阳能电池直接给发射机供电。
- 它在以约 **4 秒一周**翻滚，信号随之规律地明暗起伏，被聆听者形容为「天上最幽灵的声音」——这正是 S4 里 LES-1 信标音要做的翻滚衰落效果的真实出处。
- 至今仍被 SatNOGS 网络持续跟踪观测到。
- 来源：[Wikipedia: LES-1](https://en.wikipedia.org/wiki/LES-1)、[AMSAT News Service ANS-299](https://www.amsat.org/ans-299-amsat-news-service-bulletins/)、[Drew Ex Machina 专题](https://www.drewexmachina.com/2022/02/11/zombie-satellites-the-tale-of-lincoln-experimental-satellite-1/)
- 注：频率官方/百科口径为 237 MHz；「236.997 MHz」是守听实测的精确载波口径，文案写「约 237 MHz」即可。

### 2. Transit 5B-5（NORAD 965）· 可玩

- **发射年份纠正：1964 年 12 月 13 日**（不是 1965 年；个别访谈中有口误，卫星目录与多家来源一致为 1964 年）。美国海军 Transit 导航系统成员——GPS 的前身，为潜艇提供定位。
- 导航任务仅约 19 天就失败了，但它的遥测发射机一直没停：**在 136.65 MHz 上，只要阳光照到，它就在发信号，被认为是目前已知最老的仍在发射的卫星**，全球爱好者用一根 V 形偶极子天线加 RTL-SDR 就能收到。
- 身份之争（文案必须注明）：近年有 SDR 录音分析认为，这个信号的格式更像另一颗 Transit 5E-5，怀疑目录身份在数字化过程中被混淆。文案口径：「通称 Transit 5B-5；有爱好者分析认为信号可能实际来自 5E-5，身份尚有争议。」
- 来源：[Signal Identification Wiki](https://www.sigidwiki.com/wiki/Category:Satellite)、[SpaceDaily 报道（含更正声明）](https://spacedaily.com/b-there-is-a-single-satellite-launched-by-the-us-navy-in-1964-that-is-still-in-orbit-still-transmitting-and-still-being-used-by-amateur-radio-operators-around-the-world-and-nobody-at-the-nav/)、[RTL-SDR.com 专题](https://www.rtl-sdr.com/category/rtl-sdr/page/30/)
- 注：个别二手报道称其为「核电池供电」，SpaceDaily 已发更正称系误传、实为太阳能供电——**文案不要提核电池**。

### 3. AO-7 / AMSAT-OSCAR 7（NORAD 7530）· 可玩

- 1974 年 11 月 15 日发射，业余无线电卫星组织 AMSAT 造的第二颗 Phase 2 业余卫星，带线性转发器，设计就是给全球火腿互相通联用的。
- 1981 年电池短路，整星死亡，沉默 21 年。**2002 年 6 月 21 日，英国爱好者 Pat Gowen（G3IOR）听到 145.9775 MHz 上的 CW 信标**——短路的电池单体后来变为开路，太阳能电池得以直供整星，和 LES-1 是同一种「死法与活法」。
- 它只在阳光下工作（进地影就关机），模式在 A/B 之间随机；**至今仍被 AMSAT 列为半 operational 状态，真的有火腿每天用它做语音和 CW 通联**——目录里唯一一颗「复活后还在干原活」的星，是 Resurrection 主题最硬的注脚。
- 来源：[AMSAT 2002 年 Weekly Satellite Report](https://www.amsat.org/amsat/ftp/news/news/2002/wsr181.txt)、[AO-7 状态与频率页（SatNOGS 数据）](https://satellites.ham-amplifiers.com/satellite/ao-7)

### 4. Prospero（NORAD 5580）· 可玩（文案带保留）

- 1971 年 10 月 28 日由英国「黑箭」火箭从澳大利亚 Woomera 发射——**史上唯一一颗由英国国产火箭送入轨道的卫星**，讽刺的是黑箭项目在发射前三个月已被取消，团队还是把它打了上去。
- 1973 年磁带记录仪故障后转为每年联系一次，1996 年被英国国防研究机构正式关闭。
- 137.56 MHz 是它的历史下行频率。**存疑**：1996 年之后有「仍能听到其信标」的说法（2004 年 BBC 节目、2006 年爱好者报告），但 BBC 节目中的信号后来被指出实际来自同频的 Orbcomm 卫星——这段「复活」未经证实。2011 年它 40 周年时，UCL 穆勒太空科学实验室曾翻出几十年前的指令文档尝试重新联系，未证实取得双向联系。
- 文案口径：「官方已于 1996 年关闭它。此后有人声称在 137.56 MHz 听到过它，但同频有其他卫星，身份存疑——它是目录里最像都市传说的一颗。」诚实地把传说标成传说，反而符合守听文化。
- 来源：[Wikipedia: Prospero (spacecraft)](https://en.wikipedia.org/wiki/Prospero_(spacecraft))、[FutureScot: Skyrora 寻星计划](https://futurescot.com/astronaut-tim-peake-joins-scottish-space-mission-to-rescue-satellite/)

### 5. IMAGE（NORAD 26113）· 可玩（高难度）

- NASA 的磁层成像卫星，2000 年 3 月 25 日发射，2005 年 12 月 18 日因电源控制器被宇宙射线打翻（单粒子翻转）突然失联；2007 年指望一次长地影让它断电重启，失败，任务宣告结束。
- **2018 年 1 月 20 日，加拿大爱好者 Scott Tilley 在自家后院找一颗传闻失败的机密卫星 Zuma 时，扫到了一个陌生信号；他比对信号的多普勒曲线与公开轨道目录，锁定编号 26113——正是 IMAGE。**1 月 30 日，NASA 解出遥测中的航天器编号 166，确认身份；电池满电，分析显示它至少从 2016 年起就在发射，只是没人听。
- 2018 年 2 月信号变弱，8 月后再度失联，至今未见新的公开接收报告（现状：再次沉默，未证实）。
- 它是高椭圆极轨道，过境稀少且单次时间长——目录里的「高难度目标」，适合做给硬核玩家的挑战条目。
- 来源：[NASA: IMAGE 任务恢复全记录](https://www.nasa.gov/solar-system/a-detailed-timeline-of-the-image-mission-recovery/)、[NASA: IMAGE 再发现报道](https://www.nasa.gov/solar-system/nasas-newly-rediscovered-image-mission-provided-key-aurora-research/)、[Wikipedia: IMAGE (spacecraft)](https://en.wikipedia.org/wiki/IMAGE_(spacecraft))

### 6. Galaxy 15（NORAD 28884）· 仅故事条目

- Intelsat 的地球静止轨道通信卫星。**2010 年 4 月 5 日，它停止响应地面指令，却带着全功率开着的转发器沿静止轨道带一路漂移**，威胁沿途其他卫星的上行信号，运营商们花了八个月不断给其他卫星让路。当年媒体给它的名字就是「zombie satellite（僵尸卫星）」——**这个词正是因这次事件流行起来的**。
- 结局很物理：2010 年 12 月 23 日，它耗尽姿态控制、电池放空，计算机按设计重启，重新听从指令；2011 年回到原槽位恢复服务。2022 年 8 月它又失联过一次（官方归因于空间天气事件）。
- 它在静止轨道、中国上空不可见其槽位，所以只作故事条目——但它是整个品类的命名者，放在目录里是向题材源头致意。
- 来源：[Wikipedia: Galaxy 15](https://en.wikipedia.org/wiki/Galaxy_15)、[Space.com: 太阳爆发或催生僵尸卫星](https://www.space.com/8747-sun-eruption-spawned-zombie-satellite-identified.html)、[USGS: 2010 年 4 月 5 日磁扰与 Galaxy 15 事件](https://www.USGS.gov/programs/geomagnetism/science/april-5-2010-magnetic-disturbance)

### 7. LES-5（NORAD 2866）· 仅故事条目

- LES-1 的同门师弟，同为林肯实验室研制，1967 年 7 月 1 日发射，做 UHF 军用通信试验；1971 年停用，1972 年被送入静止轨道上方的「坟场轨道」，此后被遗忘近半个世纪——它本来有一颗专门负责 5 年后关机的电池，而那颗电池恰好没工作。
- **2020 年 3 月 24 日，Scott Tilley 在疫情封控期间扫频，在 236.7487 MHz 找到一个调制载波，确认是 LES-5 的遥测信标**：只要阳光照着，它就在发。NPR 做了专题报道。
- 它在近静止的坟场轨道上漂移，不构成常规「过境」玩法，故仅作故事条目；它是 Tilley 的第二颗战利品，与 IMAGE 一起构成「一个人找回两颗星」的叙事线。
- 来源：[Wikipedia: Zombie satellite（LES-5 条）](https://en.wikipedia.org/wiki/Zombie_satellite)、[AMSAT ANS-117（转 NPR）](https://www.amsat.org/ans-117-amsat-news-service-weekly-bulletins/)

---

## 三、社群与实操文化背景

**守听者是谁**。他们自称 SWL（shortwave listener，短波收听者）或 satellite listener：不一定发射，就守着频率听——听卫星信标、听遥测、录下瀑布图和声音存档。LES-1 的证实靠的是 Hearsat 邮件组里巴西、德国成员的异地复核；爱好者 DD1US 维护着一个「来自太空的声音」录音档案站，Transit 5B-5 从 1973 年到 2024 年的接收录音都在里面。来源：[DD1US 空间声音档案](https://www.dd1us.de/spacesounds%204b.html)。这个社群的关键词是耐心、日志和复核——我们的产品气质要贴这个，而不是游戏化的热闹。

**Scott Tilley 是谁**。加拿大不列颠哥伦比亚省的无线电爱好者（呼号 VE7TIL），在自家后院架设天线，日常工作之一是扫频寻找机密和失踪的卫星。战绩：2018 年找回 NASA 的 IMAGE（当时他在找 Zuma）；2020 年找回 LES-5；他听过最老的星是 Transit 5B-5。NPR 两次为他做专题，他是这个圈子里公认的「僵尸卫星猎人」。来源：[NPR 专题（经 NCPR 转载）](https://www.northcountrypublicradio.org/news/npr/843493304/long-lost-u-s-military-satellite-found-by-amateur-radio-operator)、[ARRL Letter 2020-04-30](http://www.arrlhq.org/arrlletter?issue=2020-04-30)。**他的工作流就是我们产品的原型：公开轨道目录 + 多普勒曲线比对 + 在正确时刻把天线对准。**区别只在：他用了十几年经验和一屋子设备，我们把其中「找、指、算」三步装进手机。

**多普勒修正是真手艺**。低轨卫星过境只有约 10 分钟，接收频率从高于标称（接近时）滑到低于标称（远离时），145 MHz 上全程约 7 kHz 的滑动。老手的做法：把过境切成 AOS/TCA/LOS 几段、预编存储信道逐段切，或者让 Gpredict/SatPC32 通过 CAT 线实时控台跟调。新手最常见的失败就是不知道要跟调，眼看着信号「飘走」。来源同上 Ham Radio Satellite Operating Guide 与 qsl.net 技巧文。**我们把多普勒曲线直接画出来、把频移数实时读出来、再变成模拟信标的音高变化——等于把这门手艺可视化、可听化。**

**QSL 卡传统**。QSL 是 Q 简语「确认收妥」的意思。自 1916–1919 年起，无线电爱好者互寄明信片大小的卡片确认通联，卡面必备元素是双方呼号、UTC 日期时间、频率/波段、模式、信号报告；短波收听者提交收听报告同样能换到电台的 QSL 卡——「听到」本身在传统里就是值得确认的成就。来源：[Wikipedia: QSL card](https://en.wikipedia.org/wiki/QSL_card)。我们的数字 QSL 卡不是凭空发明的游戏道具，而是把这条百年传统搬进手机：过境结束自动生成，字段就按真实 QSL 的规矩来（卫星名、UTC 时刻、最高仰角、频率、模式），天然可晒、天然有收藏逻辑。

**SatNOGS 的位置**。它证明了「全球爱好者协同守听卫星」是成规模的真实需求（500+ 在线站、每天约一万次计划观测、累计观测千万级，数据全开放）。我们不跟它竞争地面站网络；我们是它的移动端前哨：先用手机找到、认识这些星，将来想真听的人，自然会走向 SDR 和 SatNOGS。来源：[Libre Space Foundation: SatNOGS](https://www.libre.space/projects/satnogs/)。

---

## 四、叙事主线（视频与 Devpost 共用故事弧）

**第一幕 · 开场故事（约 30 秒）**：2018 年 1 月的一个晚上，加拿大一个爱好者在自家后院找一颗刚发射就失踪的机密卫星。他没找到那颗，却扫到一个不该存在的信号——NASA 在 2005 年就放弃的一颗卫星，十二年后还在天上喊，只是没人听。用他的原话收尾这一幕：大多数僵尸卫星，是不再受人类控制、或已部分失效的航天器。（可切 LES-1 的 4 秒明暗信号声做听觉钩子。）

**第二幕 · 痛点（约 30 秒）**：这样的星还有几千颗，少数还在发信。想听它们，你得同时会三件事：算过境、找指向、跟多普勒调谐。现有工具要么是给老手用的桌面软件，要么要先自建一座地面站。新人连第一步都迈不过去——信号就在头顶，却不知道往哪儿听。

**第三幕 · 产品如何辅助（约 90 秒，主体演示）**：手机就是参谋。选星（目录里每颗都有真实档案和频率）→ 过境倒计时 → 举起手机，AR 准星贴着它算出的真实方位走，对准进入 ±10° 就锁定 → 耳机里是按它的真实频率特征和实时多普勒合成的信标声，LES-1 还带着 4 秒翻滚的明暗 → 过境结束，一张按百年 QSL 规矩生成的数字卡落进收藏。手边有电台的人，可以照着屏幕上的实时频移数真调自己的接收机；没有的人，60 倍演示模式随时能练一遍。

**第四幕 · 红线与升华（约 20 秒）**：明说：这个应用不接收任何真实信号——真实的只有轨道数据，和这些星真实存在过、且有的此刻还在发射。找得到它们，靠的不是魔法，是公开数据和算术。最后一句落在轨道遗产上：约 3,000 颗死卫星还在头顶绕，其中几颗还在说话；学会听它们，是普通人离太空最近的一种方式。

---

## 五、文案素材（可直接取用）

中文：

- 「它们死了几十年了。但其中几颗，还在说话。」
- 「找一颗死卫星，你只需要三样东西：公开的轨道数据、一部手机、和正确的那十分钟。」
- 「NASA 放弃了它。十二年后，一个人在自家后院把它找了回来。」
- 「信号是模拟的，轨道是真的，相遇也是真的。」
- 「每四秒明暗一次——那是一颗 1965 年的卫星在太空里翻滚的声音。」

英文（Devpost / 视频字幕）：

- "They died decades ago. A few of them are still talking."
- "In January 2018, NASA's IMAGE satellite had been silent for 12 years — until one amateur with a backyard antenna heard it again. This app puts that hunt in your pocket."
- "Real orbits. Real passes. A simulated ear — until you bring your own radio."
- "Every four seconds, the signal breathes. That's a satellite from 1965, tumbling."
- "Thousands of dead satellites circle overhead. We help you find the ones still transmitting — and be pointing the right way when they pass."

红线句（任何文案里出现接收暗示时必须配）：

- 中文：「本应用不接收真实射频信号；信标声由公开轨道数据实时合成。真实守听请使用你自己的接收设备——我们负责帮你找、帮你指、帮你算。」
- 英文："zombieSatellite receives no RF. Beacon audio is synthesized live from public orbital data. Bring your own radio for the real thing — we do the finding, pointing, and Doppler math."

---

## 六、与评分五项的对应说法

- **Potential Impact**：受众是真实存在、且正在增长的守听/SDR 社群（SatNOGS 500+ 站、千万级观测为证）。产品解决他们入门路径上的真实断点：过境、指向、多普勒三件套的移动化与可视化；同时为航天史传播提供零硬件入口。不是「给所有人」，是「给一群具体的人解决一个具体问题」。
- **Technological Implementation**：Kiro 全程 spec 驱动开发（6 份 spec、steering 约束、数值基线验收）；轨道引擎用 SGP4 + satellite.js 6.0.2，对固定 TLE 快照做 ±0.01° 级基线测试；多普勒由速度矢量法实时计算并通过差分基线验证。
- **Design**：完整产品而非原型：目录—预报—对星—守听—QSL 收藏的闭环，字段与仪式感全部对齐真实守听文化（QSL 卡规矩、AOS/TCA/LOS 节奏、频率与模式标注）。
- **Innovation / Idea**：把「公开 TLE 数据集 + SGP4 + 手机姿态 + WebAudio 多普勒合成」组合成守听辅助工具，此前没有移动端产品专为「僵尸卫星守听」这个题材做找、指、算一体化；选题材本身源于真实社群文化，而非虚构设定。
- **Presentation**：演示按第四节故事弧走：Tilley 找回 IMAGE 的真实故事开场，痛点明确（工具门槛），主体用一次真实过境（或 60 倍演示）完整走完找—指—听—领卡，结尾红线声明 + 轨道遗产数字收束。问题、人群、重要性三件套齐全。

---

## 附：未证实 / 存疑清单（文案红线）

1. Transit 5B-5 发射年份：**1964 年**（简报口径 1965 有误，勿用）。
2. Transit 5B-5 信号身份：有分析认为实为 5E-5，文案须注明争议。
3. Transit 5B-5「核电池」说法：已被 SpaceDaily 更正为误传，禁用。
4. Prospero 1996 年后「被听到」：同频 Orbcomm 干扰，身份未证实，只能写成传说并标注存疑。
5. IMAGE 当前状态：2018 年 8 月后再度失联，之后无公开接收报告；只能说「再次沉默」。
6. LES-1 频率：写「约 237 MHz」；236.997 MHz 为社群实测口径，不作为官方数字引用。
7. LES-5 轨道：近静止坟场轨道漂移，中国可见性不稳定，仅作故事条目，不承诺过境玩法（既定）。
8. Galaxy 15：中国不可见其槽位，仅故事条目（既定）；「僵尸卫星一词因它流行」有 Space.com 等同期报道支撑，可用。
