---
title: "Open Source Friday #24 - wasm-bindgen"
date: "2026-09-18"
layout: "post"
tags:
    - "Rust"
    - "WASM"
    - "Tutorial"
    - "OSF"
---
It is a Rust CLI tool that facilitate high-level interactions between Wasm modules and JavaScript. The wasm-bindgen tool and crate are only one part of the Rust and WebAssembly ecosystem. (if you do not know what wasm is, its a portable binary instruction format for a stack-based virtual machine that lets you compile programs (like C/C++, C#, and Rust) to run efficiently in a web browser. It’s designed to run alongside JavaScript so both can work together in the same app) 

The wasm-bindgen tool is sort of half polyfill (it temporarily recreates and simulates features of an upcoming WebAssembly standard, specifically the Component Model that browsers don't natively support yet.) for features like the component model proposal and half features for empowering high-level interactions between JS and wasm-compiled code (currently mostly from Rust). More specifically this project allows JS/wasm to communicate with strings, JS objects, classes, etc, as opposed to purely integers and floats. Using wasm-bindgen for example you can define a JS class in Rust or take a string from JS or return one. (The functionality is growing as well!)

A couple of features offered by them: 
- Importing JS functionality in to Rust such as DOM manipulation, console logging, or performance monitoring.
- Exporting Rust functionality to JS such as classes, functions, etc.
- Working with rich types like strings, numbers, classes, closures, and objects rather than simply u32 and floats.
- Automatically generating TypeScript bindings for Rust code being consumed by JS.

A fun fact about this project, it is a dual licensed project with both Apache 2.0 and the MIT License! 

Tutorial : [wasm-bindgen tutorial](https://wasm-bindgen.github.io/wasm-bindgen/)
Rust X Wasm Book: [BOOK](https://rustwasm.github.io/docs/book/game-of-life/introduction.html)
Repository Link: [wasm-bingden](https://github.com/wasm-bindgen/wasm-bindgen)