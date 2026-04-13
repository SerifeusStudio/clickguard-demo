# ClickGUARD Application — Raul Contreras

Two artifacts built for my application to the AI Automation Engineer role at ClickGUARD.

**Live URLs:**
- Landing: <https://raulcontrerasherrera.com/clickguard/>
- Interactive tool: <https://raulcontrerasherrera.com/clickguard/tool/>
- Written audit: <https://raulcontrerasherrera.com/clickguard/audit/>

## What's in here

### 1. Click Fraud Intelligence Lab (`deploy/tool/`)

An interactive single-page demo that walks through 6 hand-crafted click scenarios, showing what a rule-based detector catches vs. what an LLM-powered detector catches. The scenarios are designed to tell a coherent story — from obvious bots (rules fine) to residential proxy farms and cookie stuffing (rules blind, LLM catches).

Each scenario shows the raw click data, the rule-based verdict + reasoning, and the LLM-powered verdict + reasoning. The point is to make the business case for ClickGUARD's AI transformation in a way that's concrete and measurable.

Stack: vanilla JavaScript (ES modules), hand-written CSS, no framework, no build step. Deployed as static files served by Caddy with `file_server`.

### 2. Internal Ops Automation Audit (`deploy/audit/`, source in `docs/audit.md`)

A written analysis of ClickGUARD's public footprint identifying 6 concrete automation opportunities for their 13-person team. Each opportunity includes:

- The problem (inferred from their public stack, product, and team size)
- The automation (specific approach, fits their existing stack)
- Rough effort estimate
- Expected impact

The audit closes with a 30-day prioritization plan — how I'd sequence these in my first month if hired.

## Why I built this

The role posting called for an engineer who finds inefficiencies and automates them, and who ships with AI tools daily. A video interview plus a resume can't prove either. Building the artifacts and shipping them before the conversation is the fastest way to demonstrate both.

Total build time: one weekend.

## Repository layout

```
clickguard-demo/
├── README.md                 ← you are here
├── deploy/                   ← static files deployed to raulcontrerasherrera.com/clickguard/
│   ├── index.html            ← landing page
│   ├── tool/
│   │   ├── index.html
│   │   ├── styles.css
│   │   ├── scenarios.js      ← the 6 scenarios as typed data
│   │   ├── analyzers.js      ← rule-based + LLM outputs for each scenario
│   │   └── main.js           ← UI controller
│   └── audit/
│       └── index.html        ← audit rendered with custom typography
└── docs/
    └── audit.md              ← markdown source of the audit
```

## A note on the implementation

The LLM analyses in the tool are pre-computed for a specific reason: shipping a live OpenAI key in a static site is a security failure, and asking a reviewer to bring their own key is friction I don't want to introduce. The analyses were drafted by running the scenarios through Claude and then hand-edited for tone and accuracy. In a production version, this would be a real API call with the user's click data flowing to an LLM in a properly secured backend.

The rule-based detector is also hand-authored, but it matches the shape of rule engines I'd expect ClickGUARD to have internally: rate limits per IP/ASN, GCLID validation, referrer checks, device fingerprint, behavioral thresholds (bounce, mouse, scroll).

## Contact

- Portfolio: <https://raulcontrerasherrera.com/>
- LinkedIn: <https://linkedin.com/in/raulcontrerasherrera>
- Email: raultucsons@gmail.com

— Raul Contreras, April 2026
