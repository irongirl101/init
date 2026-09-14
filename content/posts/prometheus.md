---
title: "Open Source Friday #23 - Prometheus"
date: "2026-09-11"
layout: "post"
tags:
    - "Prometheus"
    - "CNCF"
    - "Monitoring"
    - "OSF"
---

Prometheus, a CNCF project, is a systems and service monitoring system. It collects metrics from configured targets at given intervals, evaluates rule expressions, displays the results, and can trigger alerts when specified conditions are observed. Designed for the cloud native world, Prometheus integrates with Kubernetes and other cloud and container managers to continuously discover and monitor services. It is the second project to graduate from the CNCF after Kubernetes.

Key Features, which makes prometheus different from any other monitoring system: 
* A multi-dimensional data model  - models time series in a flexible dimensional data model. Time series are identified by a metric name and a set of key-value pairs.
* PromQL - The PromQL query language allows you to query, correlate, and transform  time series data in powerful ways for visualizations, alerts, and more -- allowing leveraging this dimensionality
* No dependency on distributed storage; single server nodes are autonomous
* An HTTP pull model for time series collection
* Pushing time series is supported via an intermediary gateway for batch jobs
* Targets are discovered via service discovery or static configuration
* Multiple modes of graphing and dashboarding support
* Support for hierarchical and horizontal federation
* Precise alerting- Alerting rules are based on PromQL and make full use of the dimensional data model. A separate Alertmanager component handles notifications and silencing.
* Simple operation - Prometheus servers operate independently and only rely on local storage. Developed in Go, the statically linked binaries are easy to deploy across various environments.
* Ubiquitous integrations - Prometheus comes with hundreds of official and community-contributed integrations that allow you to easily extract metrics from existing systems.

Repository Link : [Prometheus](https://github.com/prometheus/prometheus)
Documentation : [Docs](https://prometheus.io)