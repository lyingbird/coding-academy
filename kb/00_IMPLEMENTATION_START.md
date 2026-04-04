# Implementation Start

This repository has officially moved from planning into implementation.

## Current Step

The first code pass focuses on:

- workspace setup
- shared gameplay schema
- runtime event normalization
- companion state machine
- local persistence
- a small CLI demo
- Claude hook relay ingestion

## Why This Step Comes First

The product must keep its original intention:

- low friction
- cute before deep
- real workflow signals instead of fake game noise

That means the first thing to prove is not the UI.

The first thing to prove is:

- can we turn real coding events into a simple, stable, expressive gameplay loop?

## Current Repository Structure

- `packages/shared`
- `packages/runtime`
- `packages/cli`
- `packages/plugin-claude`

## Next Step After This

Once the runtime loop is stable, the next pass should add:

- richer Claude plugin wiring and commands
- a tiny visible companion renderer
- richer persistence and progression

## Current Verified Milestones

- workspace and package layout created
- shared gameplay schema implemented
- runtime engine implemented
- local persistence implemented
- CLI demo implemented
- Claude hook payload mapping implemented
- plugin relay script implemented and verified with simulated payloads
