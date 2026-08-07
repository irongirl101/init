---
title: "Open Source Friday #18 - OSS-Fuzz"
date: "2026-08-07"
layout: "post"
tags:
    - "Fuzzing"
    - "Cybersecurity"
    - "google" 
    - "docs"  
    - "OSF"
---

Oss-fuzz is a continuous fuzzing tool for Open Source Software.

### What is fuzzing?
It is a technique for uncovering programming errors in software, by injecting random, invalid or malformed data. The goal is to see how the program reacts, find errors and spot security flaws.

## About this repo
This repo, maintained by Google, in cooperation with core infrastructure initiative and OpenSSF, to secure critical open source softwares. They combine modern fuzzing techniques with scalable, distributed execution.

Currently, OSS-Fuzz supports C/C++, Rust, Go, Python, Java/JVM, JavaScript and Lua code. Other languages supported by LLVM may work too. OSS-Fuzz supports fuzzing x86_64 and i386 builds.
It also integrates engines like libFuzzer, AFL++, Honggfuzz, and Centipede.

OSS-Fuzz was launched in 2016 in response to the Heartbleed vulnerability, discovered in OpenSSL, one of the most popular open source projects for encrypting web traffic. If exploited, it would have caused major damage to every internet user -- and it was a simple bug, potential for a buffer overflow. 

Since then, as of May 2025, OSS-Fuzz has helped identify and fix over 13,000 vulnerabilities and 50,000 bugs across 1,000 projects.

Repository Link:[Oss-Fuzz](https://github.com/google/oss-fuzz)

Documentation:[Docs](https://google.github.io/oss-fuzz/)