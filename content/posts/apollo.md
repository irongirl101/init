---
title: "Open Source Friday #16 - Apollo 11"
date: "2026-07-24"
layout: "post"
tags:
    - "Apollo11"
    - "Assembly"
    - "history"   
    - "AGC"
    - "Emulation"
    - "RAD"
    - "OSF"
---
This repo, contains the ORIGINAL Apollo 11 guidance computer (AGC) source code for Command Module (Comanche055) and Lunar Module (Luminary099). Written entirely in custom AGC Assembly, this software wasn't just used to land humanity on the Moon—it also powered subsequent Apollo missions and early fly-by-wire aviation experiments. (also, it acts more like a calc rather than a full blown out computer XP) 

However, writing in the whole thing in AGC assembly language, requires more memory would have been needed for program storage than was actually physically provided within the AGC. 

There is a lot I would love to talk about AGC, but I am just gonna highlight on of the major problems they ran into: 

The AGC had no capability of loading programs into memory at runtime, except for extremely tiny code fragments (keyed in manually by the astronauts or uploaded via telemetry uplink). 
All of the software needed for the mission was encoded in the "core ropes", and these had to be manufactured and hermetically sealed within the computer unit. In other words, all of the software needed to fit within the 38,912 15-bit words of core memory (36K of core rope and 2K of RAM).

To solve this problem, the designers (Margaret Hamilton my goat + other MIT engineers) of the AGC chose to use part of the precious core memory to implement a virtual computer-within-the-computer--in much the same way as yaAGC is a virtual computer within another computer. This virtual computer, the "interpreter", was a subprogram (within the larger Colossus or Luminary program) which when activated, read its own instructions from memory and executed them. 

(It is important also to understand that yaAGC has no special support for the interpreter: yaAGC simply runs AGC4 machine code and, as far as it is concerned, the interpreter is just like any other subprogram within Luminary or Colossus. It "just works" with interpreter code.)

Theres now a RAD (Rapid Application Development) Environment for the AGC!
(A RAD is a software-development tool that's typically used for quickly throwing together a graphical user interface, by dragging widgets around on the display screen to where you want them, and then writing some code that glues these widgets together.) 
RAD here: [RAD](https://github.com/NeilFraser/AGC-code)

Coming back to the apollo 11 code, theres multiple random easter eggs the devs have written to the astronauts that you can find! (hint: lines 247-248 in Luminary099/THE_LUNAR_LANDING.agc.)
As silicon RAM/ROM didn't exist in large quantities, the software was literally woven by hand. Female factory workers (many from local textile mills) used needles to thread copper wire through a magnetic core ring for a binary 1, and around it for a binary 0. The manufacturing process was so specialized that engineers nicknamed it the LOL (Little Old Ladies) method, and the code memory was called LOL memory. Changing a single line of code required re-weaving the rope entirely, taking weeks!

theres a lot more yap about the language + how stuff works here: [Manual](https://www.ibiblio.org/apollo/assembly_language_manual.html#gsc.tab=0) 
also, if you want to try and emulate it: [Emulation](https://github.com/virtualagc/virtualagc)
Repository Link: [Apollo11](https://github.com/chrislgarry/Apollo-11)