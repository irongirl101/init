---
title: "Open Source Friday #6 - The X Algorithm"
date: "2026-05-15"
layout: "post"
tags:
    - "Algorithms"
    - "ML"
    - "pipelines"
    - "OSF"
---
It combines in-network content (from accounts the user follows) (also known as Thunder) with out-of-network content (discovered through ML-based retrieval) and ranks everything using a Grok-based transformer model called Phoenix. 

It works on a multi stage pipeline, and curates a couple 100 feeds from billions of them for the user in under 200 milliseconds. 

# This is how the algorithm works (based on pipeline stages): 
- Query Hydration - engagement history and metadata of the user
- Candidate sourcing and hydration - using thunder and phoenix to get metadata of the posts 
- Pre Scoring Filters: removes posts according to age, duplicates etc. 
- Scoring : based on predictions from Phoenix and other weights. 
- Selection : sort by score and select the top K candidates
- Post-Selection Processing: Final validation of post candidates to be served

The weights for engagement have also been made public - A reply that gets a reply from the author is worth 150x more than a like. A retweet is worth 20x a like. A bookmark is worth 10x.

The code (based on Rust and Python) also includes the logic for the Home Mixer, which orchestrates the feed, and the logic for Community Notes ranking.

More in depth points can be found in this link: [XAlg](https://github.com/xai-org/x-algorithm)