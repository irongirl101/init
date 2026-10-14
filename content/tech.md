---
title: "Tech Stack & Celestial Orbit"
layout: "tech"
subtitle: "An Earth-anchored 3D observatory. Each planet is a core language or technology, orbited by moons representing launched projects."
planets:
  - id: "python"
    name: "Python"
    short_name: "PY"
    tagline: "Core Backend & Tooling Systems"
    experience: "3+ Years • Primary"
    color: "#10b981"
    glow_color: "#34d399"
    distance: 140
    orbit_speed: 0.0035
    size: 6.5
    texture_type: "bands"
    frameworks:
      - "Django"
      - "FastAPI"
      - "Jinja2"
      - "Pygments"
      - "AWS S3 SDK"
    moons:
      - id: "django-portal"
        name: "School Django Portal"
        type: "Full Stack"
        summary: "First Django app built in 12th grade for school usage — where the engineering passion ignited."
        link: "https://github.com/irongirl101"
        distance: 16
        orbit_speed: 0.03
        color: "#6ee7b7"
        size: 1.8
      - id: "mettu-ssg"
        name: "Mettu Site Engine"
        type: "SSG Engine"
        summary: "Custom markdown-to-static pipeline with Python parsing and Vite compilation."
        link: "https://github.com/Andy34G7/mettu"
        distance: 24
        orbit_speed: -0.02
        color: "#a7f3d0"
        size: 2.0
      - id: "py-automation"
        name: "Automation Scripts"
        type: "CLI & Tooling"
        summary: "Utilities for background media preprocessing, hashing, and build verification."
        link: "https://github.com/irongirl101"
        distance: 31
        orbit_speed: 0.015
        color: "#34d399"
        size: 1.5

  - id: "typescript"
    name: "TypeScript / Web"
    short_name: "TS"
    tagline: "Interactive Canvas & Modern Frontend"
    experience: "2+ Years • Advanced"
    color: "#38bdf8"
    glow_color: "#60a5fa"
    distance: 210
    orbit_speed: 0.0024
    size: 7.2
    has_rings: true
    texture_type: "rings"
    frameworks:
      - "TypeScript"
      - "HTML5 Canvas"
      - "Three.js"
      - "Vite"
      - "Tailwind CSS"
      - "Perlin Noise"
    moons:
      - id: "hades-gallery"
        name: "Underworld Art Gallery"
        type: "Interactive Canvas"
        summary: "House of Hades art exhibition maze with mini-map radar and live auction ledger."
        link: "/init/portfolio/"
        distance: 18
        orbit_speed: 0.028
        color: "#93c5fd"
        size: 2.1
      - id: "retro-arcade"
        name: "16-Bit Gaming Shelf"
        type: "Pixel Web App"
        summary: "Physical pixel-art bookshelf featuring tactile CD/disc spines and live review dossier."
        link: "/init/games/"
        distance: 26
        orbit_speed: -0.018
        color: "#60a5fa"
        size: 2.0
      - id: "topography-engine"
        name: "Topography Noise Lattice"
        type: "Generative Physics"
        summary: "Interactive Perlin noise contour field with fluid particle repulsion and lattice webs."
        link: "/init/"
        distance: 34
        orbit_speed: 0.014
        color: "#bae6fd"
        size: 1.7

  - id: "swift"
    name: "Swift"
    short_name: "SW"
    tagline: "Native Apple Ecosystem & SwiftUI"
    experience: "1+ Year • macOS & iOS"
    color: "#f97316"
    glow_color: "#fb923c"
    distance: 280
    orbit_speed: 0.0018
    size: 5.6
    texture_type: "aurora"
    frameworks:
      - "SwiftUI"
      - "AppKit"
      - "macOS MenuBar"
      - "CoreAnimation"
    moons:
      - id: "macos-island"
        name: "macOS Dynamic Island"
        type: "Desktop App"
        summary: "Interactive dynamic island utility designed for macOS notch displays using SwiftUI."
        link: "https://github.com/irongirl101"
        distance: 17
        orbit_speed: 0.026
        color: "#fdba74"
        size: 2.0

  - id: "c-systems"
    name: "C / Systems"
    short_name: "C"
    tagline: "Low-Level Systems & Networking"
    experience: "Academic & Systems Deep-Dives"
    color: "#c084fc"
    glow_color: "#d8b4fe"
    distance: 345
    orbit_speed: 0.0013
    size: 5.2
    texture_type: "magma"
    frameworks:
      - "C"
      - "Libcurl"
      - "POSIX"
      - "Memory Management"
      - "GDB"
    moons:
      - id: "curl-client"
        name: "Libcurl API Client"
        type: "Systems Networking"
        summary: "Low-level C network application performing raw HTTP requests and API integrations."
        link: "https://github.com/irongirl101"
        distance: 16
        orbit_speed: 0.032
        color: "#e9d5ff"
        size: 1.8

  - id: "foss-devops"
    name: "FOSS & DevOps"
    short_name: "OS"
    tagline: "Open Source Stewardship & Linux"
    experience: "Community Founder & Contributor"
    color: "#818cf8"
    glow_color: "#a5b4fc"
    distance: 410
    orbit_speed: 0.0009
    size: 6.0
    texture_type: "nodes"
    frameworks:
      - "Git"
      - "Linux"
      - "Bash"
      - "Docker"
      - "QEMU"
      - "OpenTofu"
      - "Kafka"
    moons:
      - id: "pes-os-club"
        name: "PES OS Community"
        type: "FOSS Leadership"
        summary: "Co-founded and scaled campus open-source student club to 900+ active developers."
        link: "/init/posts/PESOS/"
        distance: 18
        orbit_speed: 0.024
        color: "#c7d2fe"
        size: 2.2
      - id: "gitgud-workshop"
        name: "GitGud Workshop"
        type: "Education"
        summary: "Hands-on Git & GitHub bootcamp training 150+ students in collaborative workflows."
        link: "/init/posts/first-blog/"
        distance: 27
        orbit_speed: -0.019
        color: "#a5b4fc"
        size: 1.9
      - id: "open-source-fridays"
        name: "Open Source Fridays"
        type: "Publication"
        summary: "Weekly deep-dive articles breaking down architectures of global open-source projects."
        link: "/init/blog/"
        distance: 35
        orbit_speed: 0.013
        color: "#818cf8"
        size: 1.6

  - id: "gamedev-3d"
    name: "Game Dev & 3D"
    short_name: "3D"
    tagline: "Interactive 3D Art & AR/VR"
    experience: "Creative Computing & Asset Pipelines"
    color: "#f43f5e"
    glow_color: "#fb7185"
    distance: 470
    orbit_speed: 0.0007
    size: 5.6
    texture_type: "terrestrial"
    frameworks:
      - "Blender"
      - "3D Shaders"
      - "AR/VR"
      - "Godot"
      - "FiniteLoop"
    moons:
      - id: "gamejam-2025"
        name: "GameJam 2025"
        type: "Game Project"
        summary: "Handmade game assets, environment design, and 3D modeling fueling AR/VR love."
        link: "https://github.com/irongirl101"
        distance: 17
        orbit_speed: 0.026
        color: "#fda4af"
        size: 2.0
      - id: "finiteloop-intern"
        name: "FiniteLoop Product & Cyber"
        type: "Internship"
        summary: "Built full product end-to-end and explored cyber defense & systems engineering."
        link: "/init/"
        distance: 26
        orbit_speed: -0.018
        color: "#f43f5e"
        size: 1.8
---
