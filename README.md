# 💩 PoopBot - 1v1 Space Robot Dash Battle Game

---

👉 [中文版](./README-CN.md) | [English Version](./README.md)

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

