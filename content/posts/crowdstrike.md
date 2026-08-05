---
title: "Crowdstrike Case Study"
date: "2026-08-05"
layout: "post"
tags:
    - "Cybersecurity"
    - "EDR"
    - "Learning"   
    - "Case Study"
    - "Crowdstrike"
---

# My Learnings on Crowdstrike Falcon related worldwide outage

### To understand how this outage turned out, what is EDR? 
EDR (Endpoint Detection and Response) is a class of product that resides on the endpoint that detects and protects the endpoint against malware and cyberattacks; and allows to respond via forensic(investigates how the attack occured)
To stay on point on what attacks are persistent, EDR regularly pulls updates from the cloud (crowdstrike's for example) and applies them to stay on top of latest attack trends. 

In 2024, in a routine update from Crowdstrike, there was buggy kernel level code (disk layer) that was pushed without testing properly -- specifically, a Falcon Sensor content (cybersecurity agent provided by CrowdStrike Falcon for endpoint protection) for Windows. The EDR just simply pulled and pushed onto windows machines. 
This update in particular had a specific file that caused this issue; to improve how Falcon handled Windows named-pipe communications. 

This caused a massive outage in the world -- windows showing BSODs everywhere. 
It illustrated how a single faulty update in a widely used security product can cause major disruption and have a huge economic update. 
Typical recovery steps included rebooting machines (ideally on Ethernet) to retrieve the fixed update, or booting each PC into Safe Mode/Recovery and manually deleting the problematic driver file. Many IT teams reported that fixing each machine took days, especially for BitLocker‐encrypted devices needing recovery keys. 

### More on Falcon 
- Falcon is an EDR agent. 
- The agent is installed on client PCs and servers to monitor and block threats, running as a Windows kernel-mode driver for deep system access. 
- Falcon runs with the highest privileges (ring 0)* - any fault, can crash the system.

### Channel File 291
- a channel file was part of a rapid response content update, which is a lightweight config file
- the all infamous file, that caused the BSODs 
- Crowdstrikes own investigation, revealed that the file had *one fewer data field* than expected, and the code that parsed it had no bounds-checking. The sensor expected 21 sensor fields -- and only received 20. 
- Because the parser used a fixed-size array without validating its length, loading the file caused an out-of-bounds memory read. 
- This violated a Windows kernel rule, forcing an “invalid page fault” and immediate system crash. 
- Versioning was missing -- outdated file format was not detected. 
- Inadequate testing led to this. 

Crowdstrike's content validation did not flag it either -- due to the combination of all the failures. 

## There was a clear lack in deployment: 
- lack of deployment rollouts (did not follow canary -> dev -> stage ->prod)
- lack of customer opt out in a sandbox, before rollout. 

### As remeditation, crowdstrike implemented these: 
- Enhanced bounds checking 
- staged deployments 
- customer deployment control 
- kernel isolation discussions 

*ring 0 is the highest level of computer security access. it runs directly on hardware, controls the computer's central processing unit and memory, and belongs to the core operating system kernel.
