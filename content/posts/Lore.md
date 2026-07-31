---
title: "Open Source Friday #15 - Lore VCS"
date: "2026-07-17"
layout: "post"
tags:
    - "VCS"
    - "git"
    - "games"   
    - "vfx"
    - "OSF"
    - "docs"
---

Lore is an open sourced version control system, designed for unprecedented scalability of both data and teams. It is optimized for projects that combine code with large binary assets -- primarily for game assets and entertainment, catering to devs and artists alike. Although, mainly built for Unreal Engine based games, the maintainers are actively expanding it to become the definitive ecosystem-agnostic VCS for games, VFX, and machine learning.

Lore is a centralized, content-addressed system. It represents repository states using cryptographically secure Merkle trees and an immutable revision chain. This design choice allows for binary-first storage, robust data deduplication, and sparse, on-demand data hydration at a scale that leaves older systems sweating.

## Lore v Git or Perforce 
- Handling Large Files: Git requires extensions like Git LFS (Large File Storage) for big assets, which can be slow. Lore natively chunk-addresses data -- if you change a few kilobytes in a massive 20GB asset, it only re-uploads the modified bytes.
- System Architecture: While Git is distributed and CLI-first, and Perforce is centralized but strictly proprietary, Lore acts as a high-performance hybrid. Built entirely in Rust, it is API-first, exposing its full range of capabilities via uniform SDK bindings for C/C++, C#, Python, Go, and JavaScript.
- Compression and Speed: Lore compresses media data far more efficiently than Git or Perforce, due to its usage of modern algorithms like BLAKE3 hashing. 

It is still in the 'non-prod-ready' stage. However, it is quickly proving to be one of the most exciting shifts in modern version control architecture!

Repository Link: [Lore](https://github.com/EpicGames/lore)
Documentation Link: [Docs](https://epicgames.github.io/lore/)