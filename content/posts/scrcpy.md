---
title: "Open Source Friday #8 - Scrcpy"
date: "2026-05-29"
layout: "post"
tags:
    - "Android"
    - "TCP/IP"
    - "OSF"
---
I stumbled across this week's repository out of pure necessity when I was trying to mirror games from my android device built for just running emulations, over to my Mac to play the game on a much bigger screen and to stream to game to a couple of friends - then i found scrcpy. 

Scrcpy (pronounced as screencopy) is an application that mirrors Android devices (video and audio) connected via USB or TCP/IP and allows control using the computer's keyboard and mouse. It does not require root access or an app installed on the device. It works on Linux, Windows, and macOS.

# It focuses on:
- lightness: native, displays only the device screen
- performance: 30~120fps, depending on the device
- quality: 1920×1080 or above
- low latency: 35~70ms
- low startup time: ~1 second to display the first image
- non-intrusiveness: nothing is left installed on the Android device

# Its features include:
* audio forwarding (Android 11+)
* recording
* virtual display
* mirroring with Android device screen off
* copy-paste in both directions
* configurable quality and many more 

The application primarily uses the Android Debug Bridge (ADB) via a USB connection to communicate. The software functions by executing a server natively on the Android device, then communicating with the server via a socket over an ADB tunnel. The screen content is streamed as H.264 video, which the software then decodes and displays on the computer. The software pushes keyboard and mouse input to the Android device over the server.

Repository Link: [scrcpy](https://github.com/Genymobile/scrcpy)