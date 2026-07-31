---
title: "Open Source Friday #17- Netflix Simian Army"
date: "2026-07-31"
layout: "post"
tags:
    - "choas engineering"
    - "netflix"
    - "OSF"
---
The Netflix Simian Army is a suite of open source, automated testing tools -- featuring Chaos Monkey, Latency Monkey, and Chaos Gorilla -- designed to intentionally disable computer instances, block network traffic, and simulate major data center outages to test cloud system resilience. 

# Now, why is it called Simian? 
Simian means relating to, resembling, or being a monkey or an ape. The simian army brings the chaotic and destructive nature of wild monkeys to test out infrastructures, 

This ecosystem gave birth to the entire discipline now known as Chaos Engineering.

# Diving a bit deeper into these tools: 
- Chaos Monkey - Randomly shuts down production instances during work hours to verify that services automatically recover without customer disruption.  It operates strictly during business hours to ensure engineers are awake and available to observe the fallout. The tool forces microservices to be stateless and redundant; if one instance dies, another must seamlessly spin up to take its place without breaking the user experience
Repo Link : [chaos monkey](https://github.com/netflix/chaosmonkey)

- Chaos Gorilla - Simulates the complete outage of an entire cloud availability zone to test regional load balancing and failover.  It mimics a massive cloud data center blackout. The tool verifies if Netflix's traffic-routing software can instantly shift millions of active video streams to a functioning data center in another zone without dropping connections.
Repo Link: [Functionality is managed inside the master architecture](https://github.com/Netflix/SimianArmy)

- Janitor Monkey (now, Swabbie) - This tool cleans up unneeded or abandoned cloud infrastructure resources. It searches for unused storage volumes, detached network interfaces, or forgotten server images, alerts the resource owner, and automatically deletes them after a set period. It reduces cloud waste and keeps operational costs down
Repo Link : [Swabbie](https://github.com/spinnaker/swabbie)

If you want more of the monkey madness : [Repo Army](https://github.com/Netflix/SimianArmy/wiki/The-Chaos-Monkey-Army)