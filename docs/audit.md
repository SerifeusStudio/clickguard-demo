# Internal Automation Audit — ClickGUARD

**Author:** Raul Contreras
**Date:** April 2026
**Purpose:** A candid read of ClickGUARD's operational surface from the outside, with seven concrete automation opportunities for a 13-person team running a $1.8M-ARR bootstrapped SaaS.

---

## Executive summary

ClickGUARD is in the harder half of the startup journey — past product-market fit, past the first million, now trying to grow a team without losing the velocity that got them here. A 13-person company with 7,000+ customers and only two engineers has the same problem every lean team has: the people who should be building the next version of the product are answering support tickets, onboarding customers, qualifying leads, and writing content instead. This audit identifies seven places where a small amount of AI-assisted automation can give those two engineers back meaningful chunks of their week and help the team get to the next revenue step without a proportional headcount step.

I wrote it before the video interview on purpose. Everything below is backed either by public evidence (customer reviews, case studies, marketing copy, LinkedIn posts) or by pattern-matching against the shape of the business. Whether or not this turns into a hire, the analysis is useful on its own.

---

## Section 1 — Reading ClickGUARD from the outside

Public sources paint a fairly complete picture. ClickGUARD is a click fraud protection SaaS founded by Ralph Perrier (ex-IBM, ex-GE Capital, 20+ years in tech and marketing). The product protects paid campaigns on Google Ads, Microsoft Ads, and Meta Ads — three platforms, three OAuth dances, three data models to keep in sync. Customer count has crossed 7,000 since launch, revenue went from $1.2M in 2023 to $1.8M in 2024, and they operate as a bootstrapped, remote-first team of roughly 13 people with two engineers handling all of development and on-call.

The stack, inferred from their careers page and engineering job listings, is JavaScript and TypeScript on both the frontend and backend, running on Node.js with a MongoDB database accessed through Mongoose. They deploy with Docker and Kubernetes on Google Cloud Platform, and the core product architecture includes real-time click inspection — every click is analyzed against fraud rules within milliseconds. The customer-facing surface uses REST and GraphQL with WebSocket channels for real-time updates. They use Cloudflare for edge, Intercom for support, and ActiveCampaign for email marketing.

The product itself is evolving. The original version was a rule engine — rate limits, IP reputation, device fingerprints, referrer validation, threshold-based behavioral scoring. The current direction, judging by their marketing copy and recent product announcements, is a shift toward AI-powered *predictive intelligence* — moving from detecting and blocking fraud after it happens to predicting and preventing it before the click converts. That's not a marketing phrase; it's an architecture change. It requires a different kind of detection layer, a different kind of data pipeline, and a different kind of engineer to build it.

That's the gap this role fills. And that's the gap this audit is scoped to.

The framing for what follows: ClickGUARD has 13 people doing $1.8M. To get to $5M, the team either hires 20 more people or it automates the repetitive work the current team is doing manually. Every opportunity in this audit is a lever on that math.

---

## Section 2 — Seven automation opportunities

### 1. Onboarding agent — cut the human walkthrough by 80% on self-serve tiers

**The problem.** Every ClickGUARD plan page promises "personalized onboarding" with a real human who walks new customers through setup and helps fine-tune their protection rules. That's a competitive advantage for the Pro and Custom tiers — hands-on setup is worth paying for at the top of the pricing ladder. But on the Essential and Growth tiers, it's a human doing the same walkthrough over and over: "connect your Google Ads account, here's how the dashboard works, let me recommend some starting rules for your industry." For a team of 13, that's hours per day that don't scale with revenue.

**The automation.** An onboarding agent that analyzes the new customer's Google Ads account structure as soon as OAuth completes, reads their industry and ad spend from account metadata, and proposes a starting rule set tuned to their situation — not "here's the default template" but "I see you're a dental practice running $12K/month across Search and Display, here's the ruleset we recommend for that profile, and here's why." The agent handles the routine 80% of onboarding conversations conversationally, and only escalates to a human when the setup is genuinely complex (enterprise accounts, multi-client agencies, edge-case platforms).

**Stack fit.** Node.js + Google Ads API + Intercom conversational surface + an LLM layer that reads account structure and generates recommendations. All sits inside the infrastructure they already have.

**Effort.** Two weeks for a working first version covering Essential tier. Another week to extend to Growth tier.

**Impact.** 80% reduction in human time spent on self-serve onboarding. Activation rate climbs because customers get to "protection is active" faster. The humans who previously ran these walkthroughs get their afternoons back and can focus on Pro/Custom accounts where personalized setup actually justifies its cost.

---

### 2. AI-powered lead qualification — route hot leads, automate the rest

**The problem.** A case study on ClickGUARD's own marketing surface revealed that free-trial conversions were underperforming, and the recommendation that came out of it was to offer a free audit instead — because the sales team converts much better on qualified leads than on trial tire-kickers. That tells you the sales motion is working the right way but the funnel shape is wrong: sales is manually qualifying every inbound, which means they're spending time on people who aren't going to buy. At a team of 13 with revenue growing 50% year-over-year, that's 2-3 people whose time is partially consumed by lead triage that doesn't need a human at all.

**The automation.** An AI qualifier that intercepts every inbound lead from the website form, runs a conversational micro-qualification (what's your monthly ad spend, what platforms are you on, have you seen suspicious traffic patterns, are you currently on a competitor), and routes the result based on what it learned. Hot leads — high ad spend, active fraud concerns, mid-funnel buying signals — go straight to a sales demo slot with pre-filled context. Warm leads get a personalized audit offer instead of a generic trial. Cold leads get nurture content and a gentle follow-up without consuming a human.

**Stack fit.** Node.js + the form handler they already have + a lightweight conversational LLM layer + their CRM and ActiveCampaign for routing. This is exactly the kind of multi-step qualifier I've built for home service lead funnels in my current role.

**Effort.** One week for the conversational qualifier. Another week to wire up the routing logic and the CRM integration.

**Impact.** The sales team stops eating cold inbounds. Demo-booking conversion climbs because demos become pre-qualified. The audit offer — which the case study already suggested — gets delivered automatically to warm leads instead of requiring a human to send it.

---

### 3. Support ticket auto-triage and "why was this blocked" resolver

**The problem.** For a fraud protection product, the single most common ticket type is almost certainly "a click got blocked, why?" — usually from an advertiser whose legitimate customer got caught in the net, or from a fraud-savvy customer who wants to understand the rule trace. Answering each one requires a human to query the detection engine, read the rule trace, interpret the signals, and write a plain-English explanation. With only two engineers on the team, every one of these tickets that requires technical investigation pulls engineering attention away from building. That's the #1 way engineering focus leaks.

**The automation.** An AI triage layer that sits in front of Intercom. Incoming tickets are classified by intent (blocked click inquiry / setup help / billing / bug report / feature request). For blocked-click inquiries the triage layer automatically pulls the detection trace from MongoDB, feeds it to an LLM with a prompt that knows how to translate rule signals into customer language, and posts the draft reply directly into the Intercom conversation for the support agent to one-click send (or auto-send if confidence is high). It also surfaces patterns — "three customers in the last 24 hours all reported the same false positive from rule X" — so engineering finds out about rule-tuning opportunities without waiting for a human to notice.

**Stack fit.** Intercom's API supports webhook-based event handling and conversation injection. The triage layer is a Node.js service that subscribes to new tickets, classifies, looks up context in MongoDB, generates a response with an LLM, and posts back. Everything lives in the existing stack.

**Effort.** One week to ship the first version covering just the blocked-click category. Two more weeks to cover the other ticket classes and add the pattern-surfacing dashboard.

**Impact.** Eliminates the most frequent engineer interrupt. Unblocked focus time for the two engineers is the actual output of this automation, not the customer response time — though response time drops from minutes-to-hours to seconds as a side effect, and that's a visible quality-of-life improvement customers will talk about.

---

### 4. Intelligent rule configuration — fix the setup-complexity pain point

**The problem.** Real customer reviews from Capterra call out ClickGUARD's setup complexity directly. One reviewer wrote: *"You need to be very careful and not be too aggressive when setting up the rules, as I ended up blocking some real users by accident."* Another said: *"ClickGUARD may be somewhat overwhelming to set up at first."* This is a product gap with named, public evidence. The AI-driven mode exists to solve it, but the reviews suggest it isn't solving it fully — users are still asked to make configuration decisions they don't have the context to make well.

**The automation.** An intelligent rule recommendation engine that looks at the client's actual traffic patterns for the first 72 hours after they connect their ad account, analyzes where the threshold edges are for their specific business, and proposes a complete ruleset tuned to their fraud risk profile. Not generic defaults — actual recommendations: "your current rule for rate limiting is set at 5 clicks per minute, which is catching 12% of your legitimate mobile checkout users; based on your traffic shape I'd recommend 7 per minute with a secondary check on bounce rate, which eliminates the false positive while still catching the bot pattern I can see in your data." The engine is LLM-reasoning on top of real customer traffic data, and it explains its reasoning in plain language.

**Stack fit.** Node.js + MongoDB click logs + an LLM layer that reasons about threshold tradeoffs + the existing rule configuration UI. This is a direct upgrade path for the "AI-driven mode" already in the product.

**Effort.** Two to three weeks — this one is meatier because it touches the real detection engine and has to be evaluated carefully for accuracy before it ships to customers. But the first version can be a "suggestions" layer that recommends without automatically applying, which ships in a week.

**Impact.** Directly addresses a pain point named by real customers on a public review site. Reduces the #1 reason users churn early ("I couldn't figure out how to set it up without blocking real traffic") and becomes a feature worth talking about in sales conversations.

---

### 5. Plain-English weekly fraud briefings — differentiate from every competitor

**The problem.** ClickGUARD already generates automated reports for customers. Interpreting those reports still falls on the customer. For most small advertisers — who are the bulk of the customer base — reports full of percentages and blocked-click counts don't translate into decisions. They want to know two things: *did I save money this week, and what should I do differently?* Right now the customer has to answer both questions themselves by reading a dashboard.

**The automation.** An LLM-powered weekly briefing that takes the raw click data, the blocked patterns, and the advertiser's campaign configuration, and produces a plain-English one-paragraph summary like: *"Last week we blocked 340 fraudulent clicks on your Google Ads account, primarily from three IP ranges in Southeast Asia targeting your Display campaigns. That saved you an estimated $2,100 in ad waste. Our recommendation: exclude these placements entirely — you're not getting real conversions from them. We also noticed unusual click velocity on your Search campaigns at 3am your time; if you don't run ads in that window you might want to add a dayparting rule. Full details in the dashboard."* Delivered as an email through ActiveCampaign every Monday morning.

**Stack fit.** Node.js + MongoDB click logs + LLM + ActiveCampaign. All existing infrastructure.

**Effort.** One week for a working first version. The core work is the prompt design and the data shape — once that's tuned, generating and delivering the emails is straightforward.

**Impact.** Competitor products (ClickCease, PPC Protect, ClickMagick) all ship automated reports. None of them that I've found ship *reasoned* briefings. This is a differentiation feature that shows up in every customer's inbox every Monday — which means it's also a retention feature, because customers are reminded of ClickGUARD's value every week without having to log in. For a bootstrapped SaaS where retention compounds, that's a genuinely strategic feature.

---

### 6. AI-assisted content pipeline — scale the marketing team of one

**The problem.** ClickGUARD publishes a regular stream of content — blog posts about click fraud, Google Ads strategy guides, video ad fraud patterns, product updates on LinkedIn. A one-person marketing team writing this content is a bottleneck by definition. The topics they already cover show where the expertise lives: fraud pattern taxonomies, platform-specific protection strategies, industry case studies. An LLM has no trouble drafting in these shapes; the hard part is being specific and accurate, which requires access to the internal knowledge base and real customer data.

**The automation.** A content drafting agent that pulls from three sources — the existing blog and knowledge base (to learn the voice), the fraud pattern data the detection engine already surfaces (to ground the draft in real findings), and a weekly trending topics feed scoped to PPC and click fraud — and produces draft posts. The marketing person reviews and edits rather than writing from scratch. Same voice, same quality, 2-3x the output.

**Stack fit.** Node.js + their CMS + LLM + a lightweight trend scanner. Zero new infrastructure.

**Effort.** Four days for a working drafting agent. Another week if you want a proper editorial workflow UI on top of it.

**Impact.** The marketing team's output per week triples without hiring. For a content-driven SaaS where inbound SEO traffic compounds over time, content velocity is a durable competitive advantage.

---

### 7. Adversarial test case generator — red-team bot for the detection engine

**The problem.** ClickGUARD's product is fundamentally adversarial. Every week, someone somewhere is building a new script, renting a new residential proxy pool, or iterating on a new behavioral mimicry technique. The rules that caught last month's attackers don't catch this month's. Writing test cases for new attack patterns is a manual, mostly reactive process — a customer reports a false negative, an engineer reproduces it, a new rule gets written, a test case is added. That's fine for a handful of attacks but it doesn't scale to the "predictive intelligence" product you're building toward.

**The automation.** A synthetic adversarial traffic generator that continuously produces new attack variants and runs them against the detection engine in a staging environment. The generator takes templates — "scripted bot," "residential proxy coordinated campaign," "click farm during off-hours," "cookie-stuffing attribution fraud" — and uses an LLM to produce novel variations of each, with realistic parameter drift. The output is a corpus of synthetic click events fed into the detection engine; a scoreboard tracks which rules catch which attacks and which fall through. When a new attack pattern slips through, the scoreboard surfaces it before it shows up in production as a customer complaint.

**Stack fit.** Node.js + LLM + your existing detection engine running in a staging namespace. The red-team bot doesn't touch production traffic; it runs as a parallel pipeline. Over time, its outputs also become a regression suite — every attack pattern you've ever defended against stays in the corpus and gets rerun on every deploy.

**Effort.** Two weeks for the first version with three attack templates. Incremental additions after that are cheap because the scaffolding is in place.

**Impact.** You catch detection blind spots before your customers do. For a product whose entire value prop is "we find what rules miss," that's not a nice-to-have — it's table stakes for the AI-first direction you're heading in.

> *Relevant context:* I built exactly this kind of red-team lab for the AI platform I shipped at my current company. 26 adversarial scenarios, including prompt injection attacks against agent tools and privilege escalation attempts against the internal API. 26/26 passed before any client went live. The scaffolding is the same; the attack templates change. This is the one opportunity on this list where my prior work is a near-direct match.

---

## Section 3 — How I'd sequence this in my first 30 days

If I joined as the AI Automation Engineer, here's how I'd prioritize:

**Week 1: Listen and ship the smallest thing.** Shadow the two engineers and one or two support and sales folks for a day each. Read the last 60 days of Intercom tickets. Read the last 30 days of engineering commits. Sit in on a sales qualification call. Talk to the CEO about what a good outcome from this role looks like three months in. Then ship a first version of #6 (content drafting agent) — four days of work, removes a recurring bottleneck from one person's week, and proves I can land a feature end-to-end before asking for trust on anything bigger.

**Week 2: Land the biggest visible win.** Ship #3 (support ticket auto-triage) scoped to just the blocked-click category. This is the highest-leverage automation on the list because it directly frees engineering focus, which is the actual scarce resource at a 13-person team. A week of work, the result is visible by day three, and it sets up the audience for the bigger bets.

**Weeks 3–4: Attack the public pain points.** Ship #5 (plain-English weekly briefings) — one week, massive customer-facing differentiation. Start the scaffolding for #4 (intelligent rule configuration) since it's the meatiest and needs the most care. Both of these move the needle on retention, which matters most for a bootstrapped SaaS.

**After week 4:** #2 (lead qualification) and #1 (onboarding agent) come next, in that order — they require more domain familiarity than I'd have in the first month. #7 (red-team bot) is the AI transformation play and should be scheduled as a 2-week block once the shorter-term wins have established trust.

The through-line: start with quick wins to earn trust, ship the differentiators next, then invest in the foundational AI transformation work once the audience is bought in.

---

## Closing

Everything on this list is work I've either done before or work that maps closely to what I've shipped in the last 90 days. The onboarding agent is the same shape as the customer concierge agents I built for home service businesses. The lead qualifier is the same shape as the intake flows I built for client-facing forms at my current company. The support triage is the same shape as the internal assistant I built for agents. The rule configuration engine is the same class of problem as the agent configuration layer I built into my platform. The weekly briefings are the same shape as the Monday-morning reports I wrote into my 17-page operations dashboard. The content pipeline is the same shape as the content agents in my current product stack. The red-team bot is directly what I built for the security lab that has passed 26/26 adversarial scenarios.

None of this is theoretical. It's all the same kind of work, just in a different domain.

I wrote this because I wanted you to see how I think about the role before we talk, not as a pitch but as a good-faith estimate of where I'd spend my first month if you hired me. If the priorities are wrong — if there's something more important I can't see from the outside — that's the most useful first conversation we could have.

Either way, thanks for reading.

— Raul Contreras, April 2026

<https://raulcontrerasherrera.com/> · <https://linkedin.com/in/raulcontrerasherrera>
