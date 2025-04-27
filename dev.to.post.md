*This is a submission for the [Alibaba Cloud](https://int.alibabacloud.com/m/1000402443/) Challenge: [Build a Web Game](https://dev.to/challenges/alibaba).*

---

## What I Built

I built [**DashBot**]((https://dashbot.jianong.me/)), a 1v1 space robot sprint battle game where players can't walk, only dash forward by jetting out "waste code" to move and attack. just for fun haha^ ^

Basic rule: charge, dash, knock out, or get knocked out. Watch out for shrinking space and bouncing walls — they can save you or throw you off.

---

## Demo

Play here: [Online demo](https://dashbot.jianong.me/)

Source Code: [https://github.com/jianongHe/DashBot](https://github.com/jianongHe/DashBot)

![Screenshot](https://dev-to-uploads.s3.amazonaws.com/uploads/articles/559x3o03monhfqdoxx9i.jpg)

---

## Alibaba Cloud Services Implementation

- **Elastic Compute Service (ECS)**  
> Used for hosting the WebSocket server that handles real-time matchmaking, player sync, and battle logic. ECS gave me full control over networking, which was essential for low-latency gameplay.


- **Object Storage Service (OSS)**  
> All static assets like images, sounds, and frontend code are hosted here. Uploading was fast, and it served global users reliably.


- **Content Delivery Network (CDN)**  
> Accelerated asset delivery from OSS, especially helpful for players outside China. Made loading times much faster.


- **Alibaba Cloud Container Registry (ACR)**  
> Used to store Docker images for my backend services. It helped me manage builds more efficiently.

---

## Game Development Highlights

- Dashed by trashy code snippets, just for fun.
- Real-Time Multiplayer: WebSocket-powered 1v1 matches.
- Built in 1 Week: Fast dev with strong support from Alibaba Cloud.
- Physics Collisions: Charge strength affects damage and knockback.
- Inspired by BattleBots: Focused on chaotic clashes with simple charge-and-dash controls.
- Theme Colors: Based on Evangelion Unit-01—purple and green for a sci-fi vibe.

---

## Problems I Ran Into:
- **Ghost Collision Issue**: Sometimes two players would overlap due to server delay, making collisions feel "soft" or unresponsive. Fixed by tweaking the sync rate and improving client-side prediction.

- **High Refresh Rate Drift**: On Windows with high refresh monitors, physics started breaking. Solved by forcing frame sync.

- **Lag and Desync**: Classic network game problems—adjusted tick rates, interpolation, and still had weird bugs.

- **Collision Bugs**: After dashing into each other, sometimes unexpected stuff happened. Honestly, I just skipped a frame to patch it (￣▽￣)

---

## AI Help:
I used **ChatGPT**/**Gemini**/**Grok**/**v0.dev** during development. It helped a lot by generating usable code quickly, though many parts still needed manual fine-tuning.

---

## P.S.

This was my first time making a real-time multiplayer game, and it was tough but fun. I learned a lot about networking, sync issues, and how chaotic robot battles can be.

I discovered this challenge only one week before the deadline. It was tough to pull off, but I already had the idea in mind and managed to bring it to life. There’s still room for improvement, and I tried to polish it as much as I could within the limited time.

---

Thanks for checking out **DashBot**!
