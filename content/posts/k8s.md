---
title: "Open Source Friday #10 - Kubernetes"
date: "2026-06-12"
layout: "post"
tags:
    - "Cloud"
    - "Containers"
    - "OSF"
---
After all the niche open source repositories we've explored, its about time we look at a few giants. 

Kubernetes, or K8s is one of the largest open source repositories out there, a system for managing containerized applications across multiple hosts. It provides basic mechanisms for the deployment, maintenance, and scaling of applications. Kubernetes is hosted by the Cloud Native Computing Foundation (CNCF), building upon 15 years of experience of running production workloads at Google, combined with best-of-breed ideas and practices from the community, and built majorly in Go. It is a fundamental tool to learn, as it powers the infrastructure behind almost every major digital service we use daily.

## Why Use Kubernetes?
- Automated Scaling: Automatically scales your application pods up or down based on CPU, memory, or custom metrics.
- Self-Healing: Automatically restarts, replaces, or kills containers that fail or become unresponsive.
- Load Balancing: Automatically distributes network traffic so deployments remain stable and reliable.
- Portability: Can be run across on-premises data centers, public clouds, and hybrid environments without changing your operational tooling.
- Desired State: You tell Kubernetes exactly how you want your application to run (e.g., "keep exactly 5 instances of this container running"), and its controllers work continuously to make it a reality.

Repository Link: [K8s](https://github.com/kubernetes/kubernetes)
Documentations and other stuff: [Docs](https://kubernetes.io)