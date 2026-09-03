---
title: "Open Source Friday #20 - OpenTofu"
date: "2026-08-21"
layout: "post"
tags:
    - "CNCF"
    - "Cloud"
    - "docs"
    - "Linux Foundation"
    - "OSF"
---

OpenTofu is an OSS tool for building, changing, and versioning infrastructure safely and efficiently. It can manage existing and popular service providers (like Azure, AWS, GCP) as well as custom in-house solutions.
It came in as a replacement for HashiCorp's Terraform -- ending its status as a truly open-source tool (changed license from the open-source Mozilla Public License (MPL 2.0) to a restrictive Business Source License (BSL 1.1)). To keep a completely free and open option available, companies like Spacelift, Harness, and env0 launched the project under the neutral stewardship of the Linux Foundation :) 

### How does it work?
- Declarative Approach: Users write human-readable code to define the desired end state of their data centers, networks, and cloud resources.
- HashiCorp Configuration Language (HCL): It uses the exact same declarative syntax as Terraform, meaning existing scripts work seamlessly without changes.
- State Management: It tracks your real-world infrastructure using state files, ensuring changes are predictable and reliable.

### A couple of its key features:
- Resource Graph Execution: Automatically builds a dependency graph of all resources to parallelize operations on non-dependent assets for maximum deployment speed.
- Change Automation: Generates precise execution plans before running modifications, detailing exactly what will be created, updated, or destroyed.
- End-to-End State Encryption: Provides built-in client-side encryption for state files to secure sensitive variables and secrets natively.
- Provider Iteration: Supports for_each loops directly across provider configurations.
- Targeted Deployment (-exclude): Introduces a dedicated -exclude flag to skip specific resources during planning and apply steps.
- Vast Ecosystem: Fully compatible with over 3,900 providers and 23,600 modules through the public OpenTofu Registry.

There are wayyy more layers to OpenTofu -- as it would be in any CNCF project XP, so much that i cannot cover here. They are also, a very active repository!

Repository Link: ![Repo](https://github.com/opentofu/opentofu)
Documentation Link: ![Docs](https://opentofu.org/docs/)