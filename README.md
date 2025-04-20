
# PoopBot - 1v1 太空机器人冲刺对战游戏

## 🌌 游戏背景

在遥远的宇宙中，有一座废弃的空间站，漂浮着一群孤独的维修机器人。

由于推进系统失效，它们无法像普通机器人那样走路，只能靠**内部循环系统排出的固体废料**进行喷射前进。

这群机器人逐渐形成了一种新型的竞技方式：

> **“靠💩推进来一决胜负！”**

于是，一种古怪但高能的 1v1 冲刺对战游戏就此诞生——**《PoopBot》**。

---

## 🎮 游戏玩法核心

你和另一个玩家各控制一台机器人，**不能走路**，唯一能做的事情就是：

### ✅ “按住蓄力，松手喷💩冲刺！”

- 机器人头上有一个方向指针，会**不断顺时针旋转**
- 当你按住鼠标/触屏时开始**蓄力**
- 蓄力时间越久，喷射得越远、速度越快、造成的伤害也越高（从 20 到 60 不等）
- 一旦按下就**无法取消蓄力，必须喷出去**

这个设定让你必须**预判方向 + 计算时机 + 心理博弈**，一招冲刺用得好，能直接改变局势！

---

## 💥 战斗规则详解

| 机制            | 描述 |
|------------------|------|
| **血量机制**     | 每个机器人有 **100 HP** |
| **冲刺伤害**     | 命中造成 **20～60 伤害**，视蓄力时间而定 |
| **击退效果**     | 命中会把对方击退一小段距离 |
| **毒圈机制**     | 战斗开始一段时间后，场地开始缩小，站在毒圈外的机器人会**持续掉血**（例如 5 点/秒） |
| **速度提升**     | 随着时间推进，方向盘旋转速度加快，增强战斗节奏感 |
| **胜利条件**     | 击败对方（将 HP 降至 0）或让对方因毒圈掉血致死 |

---

## 🧠 战斗节奏设计

1. **开局对线期**：大家试探出招，练习手感
2. **中期缩圈**：节奏加快，空间变小，开始互相逼位
3. **后期混战**：方向盘加速，圈越来越小，谁先冲错谁就可能一💩送命

---

## 🔥 附加玩法亮点

- 支持**实时匹配**：玩家进入大厅可等待匹配 1v1
- 多个房间**并发对战**，每场战斗互不干扰
- **实时观战**：其他玩家可进入任意房间观看战局
- 未来支持对战录像、排行榜、皮肤系统等扩展

---

## 🎨 美术风格

- 采用**像素风格**+ 太空科幻背景
- 角色为圆头机器宇航员，喷射尾气为棕色粒子流，恶趣味拉满
- UI 界面简洁直观，兼容桌面和移动端操作

---

## 🛠 技术实现简述

- WebSocket 实现实时通信
- 阿里云 OSS 托管前端 & 资源
- ECS 部署游戏逻辑服务器
- Redis / RDS 管理房间和匹配队列
- CDN 加速静态资源分发
- 支持可拓展的观战系统与战斗日志存储

---

## ✅ 英文版

### 💩 PoopBot - 1v1 Space Robot Dash Battle Game

---

## 🌌 **Background Setting**

In the depths of space, aboard a long-abandoned space station, a group of forgotten maintenance robots continue to operate.

With their standard propulsion systems broken down and no gravity to walk on, they resort to the only thrust they have left:

> **Releasing their internal waste.**

Thus, a bizarre but high-stakes competitive sport was born —  
A fast-paced, poop-powered, 1v1 robot battle known as **PoopBot**.

---

## 🎮 **Core Gameplay**

You and another player each control a robot.  
You **can’t walk**, you **can’t jump** — all you can do is:

### ✅ **Hold to charge. Release to dash. Poop for propulsion.**

- A directional arrow above your robot's head **spins clockwise** non-stop.
- Press and hold to charge up thrust.
- Release to dash **in the exact opposite direction** the arrow was pointing **when you started charging**.
- The longer you charge, the faster and farther you dash — and the more damage you deal.
- Once you start charging, **you can’t cancel**. You *must* go.

---

## 💥 **Combat Mechanics**

| Mechanic         | Description |
|------------------|-------------|
| **Health**       | Each robot has **100 HP**. |
| **Damage**       | A successful dash deals **20–60 damage**, depending on charge time. |
| **Knockback**    | Hitting an opponent **pushes them back** slightly. |
| **Poison Zone**  | After a short time, the arena begins to **shrink**. Stepping outside causes **gradual damage** (e.g. 5 HP/sec). |
| **Speedup**      | As the arena shrinks, the **direction spinner rotates faster**, making timing more intense. |
| **Victory**      | First bot to bring the opponent's HP to 0 wins the match. |

---

## 🕹 **Simple Controls, Deep Strategy**

With only **one button**, PoopBot offers surprising depth:

- Time your direction right
- Manage your charge duration
- Predict your opponent’s move
- Knock them into the poison zone before they do it to you

A full round takes **about 1 minute**, but every second is tense, ridiculous, and action-packed.

---

## 🔥 **Key Features**

- **Real-time 1v1 battles** in your browser
- **Matchmaking queue**: join when ready, get paired when someone arrives
- **Multiple battle rooms** can run in parallel
- **Spectator mode**: watch any match live
- **Future-ready**: replay system, skins, rankings, and more planned

---

## 🎨 **Visual Style**

- **Pixel art aesthetic** with a space sci-fi theme
- Robots look like cute astronaut units with spinning head-dials
- Poop propulsion leaves a trail of brown pixel particles (yes, it’s as funny as it sounds)
- Clean UI, responsive on desktop and mobile

---

## ☁️ **Tech Stack (Alibaba Cloud)**

- **Frontend** hosted on **OSS + CDN**
- **Matchmaking & room logic** on **ECS** or **SAE**
- **WebSocket** used for real-time multiplayer sync
- **Redis/RDS** for player queue and game state
- **OSS** for future battle logs and replay storage

---

## ✅ TL;DR

> **PoopBot is a fast, chaotic, poop-powered robot arena where direction is unpredictable, and one bad dash could be your last.**

