---
title: "Open Source Friday #2 - LocalSend"
date: "2026-04-17"
layout: "post"
tags:
    - "localsend"
    - "goat"
    - "protocol" 
    - "Docs"
    - "networking"
    - "OSF"
---
# What is localsend?
LocalSend is an app that allows you to securely share files and messages with nearby devices over your local network without needing an internet connection. 

(this is the best app to share files between iOS, Windows, MacOS or Linux; in my humble opinion) 

# Why LocalSend?
- It effectively acts like a decentralized alternative to options like airdrop, allowing you to share files, folders and clipboard content, across different OSs!
- LocalSend uses a secure communication protocol that allows devices to communicate with each other using a REST API. 
- All data is sent securely over HTTPS, and the TLS/SSL certificate is generated on the fly on each device, ensuring maximum security, and making it super fast!

As for the tech stack, it its primarily built with Dart and Flutter (both are open sourced languages built and maintained by Google!)

They use their own protocol called the LocalSend Protocol 
- so as to have a simple REST protocol that does not rely on any external servers.
- makes sure that machines can communicate, as some devices might not support multicast or might not be allowed to have an HTTP server running.
- It uses both TCP(HTTP) and UDP (multicast)

Repository: [Localsend](https://github.com/localsend/localsend)
Documentation for protocol: [Docs](https://github.com/localsend/protocol)