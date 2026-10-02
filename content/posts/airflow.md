---
title: "Open Source Friday #26 - Apache Airflow"
date: "2026-10-02"
layout: "post"
tags:
    - "Apache"
    - "Airflow"
    - "Big Data"
    - "OSF"
---

I think its about time we dive into something thats part of the Apache Frameworks. One of my favorite framework that I was introduced to in my Big Data class, is Airflow -- used to delegate tasks in the form of Directed Acyclic Graphs or DAGs. Airflow on its own never processes data, but only delegates tasks to 'worker' nodes.

Airflow is a platform to programmatically author, schedule, and monitor workflows. When workflows are defined as code, they become more maintainable, versionable, testable, and collaborative. It works best with workflows that are mostly static and slowly changing. When the DAG structure is similar from one run to the next, it clarifies the unit of work and continuity. 

Beyond just traditional pipelines, it is widely used to orchestrate Machine Learning workflow - training, retraining, evaluation, and deployment, and increasingly used to orchestrate agentic and LLM workloads coordinating the steps of an AI pipeline (data prep, tool calls, model invocation, evaluation) rather than acting as the agent itself.

One of the key advantages of using DAGs in Airflow for orchestration is that if a task fails during a workflow, the entire pipeline does not need to be rerun. Airflow can resume execution from the last successfully completed task, allowing the workflow to continue from the point of failure.

Airflow is not a streaming solution, but it is often used to process real-time data, pulling data off streams in batches.

Principles
- Dynamic: Pipelines are defined in code, enabling dynamic dag generation and parameterization.
- Extensible: The Airflow framework includes a wide range of built-in operators and can be extended to fit your needs.
- Flexible: Airflow leverages the Jinja templating engine, allowing rich customizations.

A fun fact about airflow -- it was originally a project started by Airbnb in 2014, until it was taken under the apache umbrella in 2016 by being part of the Apache Incubator Project, and finally a top level project in 2019. 

(Also, funny thing, airflow can only run on Linux or MacOS machines XD) 

Repository Link: [Airflow](https://github.com/apache/airflow)

