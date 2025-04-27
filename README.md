# DashBot - 1v1 Space Robot Sprint Battle Game

[中文](README-CN.md) | [English](README.md)

## 🌌 Game Background

In a distant galaxy, an abandoned space station drifts with a group of lonely coding robots.

Due to propulsion system failure, they can't walk like normal robots and can only move by **jetting out waste code from their internal cycle system**.

![dashbot_example](https://github.com/user-attachments/assets/c7356d0a-3ab3-4c66-9a86-564de1ecd8b0)

---

## 🎮 Core Gameplay

You and another player each control a robot that **cannot walk**, and the only thing you can do is:

### ✅ "Hold to charge, release to jet forward with code!"

- The robot has a rotating direction pointer that **spins clockwise continuously**
- Hold down the mouse/touch to **charge**
- The longer you charge, the farther and faster you jet, with more damage (from 20 to 60)
- Once you press, **you can't cancel**—you must release and dash!

This forces you to **predict direction + time your move + mind-game your opponent**. One well-timed dash can flip the whole fight!

---

## 💥 Battle Rules

| Mechanic       | Description                                               |
|----------------|-----------------------------------------------------------|
| **HP System**   | Each robot has **100 HP**                                 |
| **Dash Damage** | Hitting deals **20~60 damage**, depending on charge time  |
| **Knockback**   | Hitting knocks the opponent back slightly                 |
| **Map Bounce**  | Hitting map edges causes rebounds, use it to counterattack |
| **Poison Zone** | After a while, the arena shrinks; outside robots **lose HP** (e.g., 5/sec) |
| **Speed Up**    | Pointer spin speeds up over time, increasing battle pace  |
| **Win Condition** | Defeat the opponent (reduce HP to 0) or let them die in poison |

---

## 🧠 Battle Flow

1. **Early Phase**: Test moves, get a feel for timing
2. **Mid Phase**: Arena shrinks, pace quickens, positioning gets tight
3. **Late Game**: Fast pointer, tiny space, one wrong dash could be fatal

---

## 🔥 Extra Features

- Supports **real-time matchmaking**: wait in lobby for 1v1
- **Concurrent matches**: multiple rooms, independent battles
- Future: **live spectating**: watch any match as a viewer
- Future: battle replays, leaderboards, skins, and more

---

## 🎨 Art Style

- **Pixel art** + space sci-fi theme
- Characters are round-headed robot astronauts, jet trails are blue code strings—maybe you’ll spot familiar code!
- Clean, intuitive UI

---

## 🛠 Tech Overview

- Frontend: vite + svelte for UI & client game logic
- Backend: nodejs + websocket + caddy for sync, storage, broadcast
- Github Action for CI/CD
- Alibaba ACR for docker image service
- Alibaba OSS hosts frontend & assets
- Alibaba CDN for static asset delivery
- Alibaba ECS for game websocket logic server

---
