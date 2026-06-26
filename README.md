# Pricernu

Pricernu is a local-first mobile app concept for identifying, valuing, and cataloging real-world objects.

The product thesis is simple:

> Most image-to-price apps are dark-pattern subscription wrappers around commodity AI. Pricernu should be fast, local-first, privacy-respecting, and honestly priced.

## Core Idea

Open the app, scan an object, identify it, estimate its market value, and save it into a personal object database.

The app should answer:

- What is this?
- What is it worth?
- Should I buy it?
- What should I sell it for?
- Have I scanned this before?
- What do I own?
- What is my inventory worth?

## Initial Stack Direction

- Expo React Native mobile app
- SQLite local-first persistence
- Clerk optional auth
- Convex cloud sync, canonical object cache, and backend actions
- Brave Search API for pricing discovery
- Local Gemini Nano / local vision path where available
- Cloud fallback only when useful or paid

## Product Philosophy

- Local first
- No account required for first value
- No subscription traps
- Buy once for Pro ownership features
- Credits only for real cloud costs
- Cache before API calls
- AI supports the workflow; it is not the product

## Repository Structure

```txt
/docs       Product, architecture, and decision docs
/tasks      Implementation task specs for human and AI agents
/apps       Future app packages
/backend    Future Convex backend
/packages   Future shared packages
```

Start with `docs/CONSTITUTION.md`, then `docs/PRD.md`, then `docs/ROADMAP.md`.
