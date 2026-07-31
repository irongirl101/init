---
title: "Open Source Friday #4 - Open Source Rover"
date: "2026-05-01"
layout: "post"
tags:
    - "robotics"
    - "software + robotics"
    - "OSF"
---
Today's highlight, is sorta different. It blends hardware, software and robotics - all open sourced! 

The JPL Open Source Rover is an open source, build it yourself, scaled down version of the 6 wheel rover design that JPL uses to explore the surface of Mars and employs a few of the major driving mechanics that the mars rovers use to traverse rocky surfaces.  

This project, currently maintained by JPL over at NASA for the past 9~ years, made this model open sourced to inspire the next generation of scientists, engineers, and roboticists - to explore the model and iterate. It is an amazing way to get into robotics and understanding how the Mars Rover works! (although, it comes at a steep price).

# A couple of features:
- Rocker-Bogie: Keeps all six wheels in contact with the ground for better stability over obstacles
- Differential Pivot: Balances weight between sides while climbing
- 6-wheel Ackermann steering: Controls wheel angles and speeds for precise turning

A Raspberry Pi acts as the "brain" of this rover for its versatility, accessibility, simplicity, and ability to add and upgrade your own modifications. 
The rover is designed entirely out of consumer off the shelf parts! 

Repository Link: [OpenSourceRover](https://github.com/nasa-jpl/open-source-rover)