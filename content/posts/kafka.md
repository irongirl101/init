---
title: "Kafka"
date: "2026-09-02"
layout: "post"
tags:
    - "Open Source"
    - "Kafka" 
    - "Learning"   
    - "Case Study"
---

Being a month into my Big Data classes at college, apart from all the other kewl apache frameworks we have delved into -- there is one architecture thats keep being mentioned, but not talked about much in detail *yet*. 

Of course, I am talking about apache kafka.

I have heard it come up in Apache Seatunnel, where the connector (as a unified integration platform, it supports decoupling -- the connector can run on multiple engines like Flink or Spark without rewriting it). This is where, my professor mentioned something about kafka messages and kafka connect as a connector. She did not go further, so I decided to go down the rabbit hole myself. 

## Now, what is Kafka? 
It is a **data streaming platform**, that enables platforms to store, publish, process messages in real time and subscribe. Publish/subscribe (pub/sub) systems are characterized by senders pushing messages to a central point for classification. Subscribers receive messages of interest from the central point.

![Kafka Flow](<{{site.base_url}}/assets/images-posts/arch1.png>) _Image 1, ref: redhat :D_

### Messages 
A message is a key-value pair of data for the consumer applications (along with metadata such as its timestamp and offset.). Each message is stored within a topic (a set of grouped messages). It does have a retention policy; where it is persisted and durable during its configured lifespan. 

The key (optional), usually identitfies the message, and determines (by default) which partition stores the message. The value actually contains the content of the message. 

For example:

``` 
Key:   user123
Value: "User bought a laptop"
```

Here, user123 could identify the user associated with the event, while the value describes what happened.

### Partitions
A partition, contains a subset of messages of the topic. Using multiple partitions enables improved performance in case of heavy load, data sharing, and replication. A topic is ultimately the sum of all events of all its partitions. Each partition contains a bunch messages, which is consumed in the order in which it was added. (Partitions can also have replicas on different Brokers!)

For example:

```
Topic: user-events

Partition 0:
    Offset 0 → user101 logged in
    Offset 1 → user102 bought a laptop
    Offset 2 → user101 added an item

Partition 1:
    Offset 0 → user103 logged in
    Offset 1 → user104 bought a phone
```

Fun fact, the way messages are added to a specific partition, is via hashing :D (if theres a key attached, else uses a sticky-partition strategy for batches) 

Right now, our architecture looks somewhat like this: 
![Arch](<{{site.base_url}}/assets/images-posts/arch2.png>)
_Image 2_

But this is not how the cluster looks like (ref to image 1) A typical Kafka cluster contains multiple brokers, topics are 'hosted' on the brokers, and each topic is split into one or more partitions, and ofc course, each partition would have multiple messages(A broker is the central point where messages are published)


### Producers and Consumers 
As it is a pub-sub architecture, the producers publish (appends messages to the partition in a topic), consumers subscribe to that topic, and they can read any offset within a topic partition. 

Extra Info on consumers: Each consumer belongs to a consumer group, a list of consumer instances that ensures fault tolerance and scalable message processing. When a consumer group contains only one consumer, that consumer is responsible for processing all messages of all partitions. With multiple consumers in a group, each consumer receives messages from only a subset of the partitions. Thus, if you add more consumers to a consumer group than the number of partitions for a topic, the extra consumers stay idle without receiving any messages.


### Where do we use Kafka?
Kafka is mainly used when you have a lot of data/events being produced continuously, and you want different systems to consume and process that data reliably.
Its used for 
- Stream Processing
- Connecting microservices
- Log and event collection
- and more :) 

Without Kafka:

Order Service
     │
     ├────► Payment Service
     ├────► Inventory Service
     ├────► Delivery Service
     └────► Notification Service

The Order Service has to directly communicate with every service that needs to know about the order.

With Kafka:

                    Kafka
                      ▲
                      │
                "Order Created"
                      │
                Order Service
                      │
          ┌───────────┼───────────┐
          ▼           ▼           ▼
       Payment    Inventory    Delivery

The Order Service simply publishes an "Order Created" event.

It doesn't need to know which services are consuming that event.

If we later introduce an Analytics Service:

                    Kafka
                      │
       ┌──────────────┼──────────────┐
       ▼              ▼              ▼
    Payment       Inventory      Analytics

we can add another consumer without requiring the Order Service to directly integrate with it.

**This is Decoupling.**

## Conclusion: 
Circling back to why i even looked up on kafka, connectors. The Kafka connector, can move data quickly in and out of Kafka. Kafka Connect, a tool to manage data integration using an Apache Kafka cluster as the hub. Kafka Connect provides prebuilt connectors for databases, services, and other technologies. These connectors can be used to move data into a Kafka cluster from a given source, and out of a Kafka cluster to a given sink; the project has also made multiple tools to define your own connectors! 
Source Connector: Database ─────► Kafka 
Sink Connector: Kafka ────────► Database

And also, decoupling. **Kafka decouples producers from consumers by acting as an intermediary event log, allowing producers to publish events without knowing which consumers will process them or when.**

This is what I learnt from a couple of hours of research, and I hope you did too :) 









