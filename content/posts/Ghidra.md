---
title: "Open Source Friday #7 - Ghidra"
date: "2026-05-22"
layout: "post"
tags:
    - "Cybersec"
    - "c++"
    - "SRE"
    - "OSF"
---
# What is Ghrida
Ghidra is a software reverse engineering (SRE) framework created and maintained by the National Security Agency (NSA) Research Directorate. This framework includes a suite of full-featured, high-end software analysis tools that enable users to analyze compiled code. It was built to solve scaling and teaming problems on complex SRE efforts, and to provide a customizable and extensible SRE research platform.

Ghidra includes capabilities like disassembly, assembly, decompilation, graphing, and scripting, and supports a wide variety of processor instruction sets and executable formats and can be run in both user-interactive and automated modes. 

It has been applied to a variety of problems that involve analyzing malicious code and generating deep insights for SRE analysts who seek a better understanding of potential vulnerabilities in networks and systems.

The software is written in Java using the Swing framework for the GUI. The decompiler component is written in C++, and is therefore usable in a stand-alone form.
Scripts to perform automated analysis with Ghidra can be written in Java or Python (via Jython), though this feature is extensible and support for other programming languages is available via community plugins. 

Repository Link: [Ghidra](https://github.com/NationalSecurityAgency/ghidra)