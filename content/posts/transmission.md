---
title: "Open Source Friday #9 - Transmission"
date: "2026-06-05"
layout: "post"
tags:
    - "BitTor"
    - "P2P"
    - "networking"
    - "OSF"
---

Transmission is an app which is a fast, easy and a free BitTorrent, i.e. for P2P file sharing. It operates on a decentralized network where users simultaneously download and upload pieces of large files (like Linux distributions or media) to each other, rather than relying on a single central server. It requires way lesser CPU and memory usage compared to other clients like muTorrent and its super versatile.  

# What does it offer?
- Remote Control: Features a built-in web server and remote daemon, allowing you to manage your downloads through a web browser on your phone or computer.
- Encryption & Security: Supports encrypted connections, blocklists for restricting malicious peers, and local peer discovery.
- Advanced Controls: Allows users to set global or per-torrent speed limits, assign file priorities, schedule bandwidth limits, and utilize Magnet links

Transmission has different flavors : 
- A native macOS GUI application
- GTK+ and Qt GUI applications for Linux, BSD, etc.
- A Qt-based Windows-compatible GUI application
- A headless daemon for servers and routers
- A web UI for remote controlling any of the above

The documentation for this app is currently being rewritten, and they are looking for volunteers! If you are down, send a pull request their way :) 

Repository Link: [Transmission Repo](https://github.com/transmission/transmission)