/**
 * analyzers.js — rule-based and LLM-powered detection outputs for each scenario.
 *
 * The rule-based outputs reflect the kind of static rules a real click fraud
 * engine ships with: rate limits per IP/ASN, GCLID validation, referrer checks,
 * device fingerprint matches, bounce/scroll/mouse thresholds, known-bad-ASN
 * lists. These are the rules that ClickGUARD-style products have been running
 * on for years and they work great — until they don't.
 *
 * The LLM outputs reflect what a behavioral reasoning layer (Claude / GPT-4)
 * can add on top: cross-session correlation, context interpretation, intent
 * inference, and natural-language explanation. They were drafted by running
 * the scenarios through Claude and hand-editing for tone and accuracy.
 *
 * Both verdict systems use the same three decisions: BLOCK, FLAG, ALLOW.
 * Risk scores are 0-100. Confidence is 0-100.
 */

export const ANALYZERS = {
  //─────────────────────────────────────────────────────────────────────────
  // 1. THE OBVIOUS BOT
  // Expected: rules catch, LLM agrees. Baseline.
  //─────────────────────────────────────────────────────────────────────────
  'obvious-bot': {
    rule: {
      verdict: 'BLOCK',
      risk: 99,
      confidence: 100,
      signals_fired: [
        { rule: 'rate_limit_per_ip', threshold: '5 clicks / 60s', actual: '47 clicks / 118s', severity: 'critical' },
        { rule: 'user_agent_denylist', threshold: 'no curl/wget/python-requests', actual: 'curl/7.88.0', severity: 'critical' },
        { rule: 'datacenter_asn', threshold: 'block known datacenter ASNs', actual: 'AS4224 Luminati', severity: 'critical' },
        { rule: 'missing_device_fingerprint', threshold: 'required', actual: 'null', severity: 'high' },
        { rule: 'zero_mouse_movement', threshold: '< 3 events allowed', actual: '0 events', severity: 'high' },
        { rule: 'bounce_rate_threshold', threshold: '< 0.9', actual: '1.0', severity: 'medium' },
      ],
      explanation: 'Multiple independent hard rules fired. Any one of these would have been enough. Standard rule-engine territory.',
    },
    llm: {
      verdict: 'BLOCK',
      risk: 99,
      confidence: 99,
      signals_read: [
        'curl user agent — this is not even pretending to be a browser',
        'zero behavioral signals — no mouse, no scroll, no time on page',
        'data center ASN (Luminati/Bright Data) — known proxy service',
        'high-frequency repetition from a single source',
      ],
      explanation: 'This is a scripted bot built by someone who either doesn\'t care about being caught or is testing a scraper setup. No sophistication, no evasion. The rule-based detector handles this case perfectly, and it should — this is what rule engines are for. The LLM layer adds no value here, but it also doesn\'t get in the way. Agree with the rule verdict: block.',
      value_add: 'None — this is a baseline case. The LLM layer\'s role is to catch what rules miss, not to second-guess them when they\'re right.',
    },
  },

  //─────────────────────────────────────────────────────────────────────────
  // 2. THE RESIDENTIAL PROXY FARM
  // Expected: rules miss, LLM catches. THE CORE BUSINESS CASE.
  //─────────────────────────────────────────────────────────────────────────
  'residential-proxy-farm': {
    rule: {
      verdict: 'ALLOW',
      risk: 18,
      confidence: 100,
      signals_fired: [
        { rule: 'rate_limit_per_ip', threshold: '5 clicks / 60s', actual: '1 click / unique IP', severity: 'none' },
        { rule: 'user_agent_denylist', threshold: 'no headless browsers', actual: 'Chrome/119 desktop', severity: 'none' },
        { rule: 'datacenter_asn', threshold: 'block datacenter traffic', actual: 'residential ISPs (AT&T, Comcast, Verizon, Cox)', severity: 'none' },
        { rule: 'referrer_validation', threshold: 'same-origin or known platform', actual: 'passed', severity: 'none' },
        { rule: 'device_fingerprint_match', threshold: 'must exist', actual: 'present', severity: 'none' },
      ],
      explanation: 'Every session is individually legitimate. Each one passes every rule. No single-session check can catch this pattern because no single session is suspicious. This is the inherent limit of per-session rule evaluation.',
    },
    llm: {
      verdict: 'BLOCK',
      risk: 92,
      confidence: 88,
      signals_read: [
        'canvas_fingerprint_hash is identical across 12 sessions — this is impossible for 12 independent browsers',
        'mouse_trajectory_hash is identical across 12 sessions — 12 different humans don\'t move a mouse the same way',
        'identical timezone offset, identical screen resolution, identical hardware concurrency',
        'all 12 sessions completed in approximately 2.8 seconds — suspiciously uniform duration',
        '12 clicks within 90 minutes targeting the same ad creative from 12 different residential IPs across 12 different states',
      ],
      explanation: 'This is a coordinated residential-proxy campaign. Someone is paying a proxy service (Luminati, Bright Data, Oxylabs, or similar) to rotate through a pool of compromised residential IPs, running a script that drives each session to the same click with the same browser fingerprint. The script itself is the same; only the IP address changes. Rules can\'t catch this because rules evaluate sessions individually — and each session, taken alone, is indistinguishable from a real user. The pattern only emerges when you correlate across sessions. That correlation is what a behavioral reasoning layer is for.',
      value_add: 'This is exactly the case where the LLM layer pays for itself. The rule engine let 12 fraudulent clicks through; the LLM layer caught all 12. If this advertiser spends $3 per click, that\'s $36 saved from a single batch. Multiply by frequency across thousands of advertisers.',
    },
  },

  //─────────────────────────────────────────────────────────────────────────
  // 3. THE OFF-HOURS CLICK FARM
  // Expected: rules flag cautiously, LLM blocks decisively.
  //─────────────────────────────────────────────────────────────────────────
  'off-hours-click-farm': {
    rule: {
      verdict: 'FLAG',
      risk: 58,
      confidence: 72,
      signals_fired: [
        { rule: 'rate_limit_per_asn', threshold: '100 clicks / hour', actual: '203 clicks / 2.5 hours', severity: 'medium' },
        { rule: 'geo_mismatch', threshold: 'vpn/proxy detection', actual: 'suspected VPN, not confirmed', severity: 'medium' },
        { rule: 'mouse_movement_check', threshold: 'must be present', actual: 'present (entropy low but non-zero)', severity: 'low' },
        { rule: 'device_diversity', threshold: 'check for device homogeneity', actual: '89% same OS patch version', severity: 'medium' },
        { rule: 'conversion_funnel', threshold: 'expected > 0', actual: '0 conversions / 203 clicks', severity: 'medium' },
      ],
      explanation: 'Several rules fire at medium severity, but none fire at critical. The rule engine is designed to be conservative about hard-blocks when there\'s any sign of human interaction — and mouse movement is present, even if suspiciously uniform. Default action: FLAG for manual review. This means a human has to make the call, and in the meantime the clicks are billed to the advertiser.',
    },
    llm: {
      verdict: 'BLOCK',
      risk: 95,
      confidence: 93,
      signals_read: [
        'Device timezone settings consistently reveal Asia/Dhaka origin while the ad creative is targeted at Los Angeles',
        'All 203 clicks cluster between 3am and 5am local Dhaka time — 9am-11am, start of the working day for a low-cost labor click farm',
        'Mouse trajectory entropy is low — fewer than 3 direction changes per session average. Real humans vary more.',
        '89% of devices share the same OS patch version. Real user populations don\'t cluster this tightly.',
        'Zero conversions from 203 clicks. Real traffic converges toward positive conversion rate over volume.',
        'Average session duration is narrowly clustered at ~4.2 seconds — real user session duration has much wider variance.',
      ],
      explanation: 'This is a human-operated click farm, not a bot farm. The distinction matters: rules are tuned to detect bots (no mouse movement, headless browsers, zero session time), so they default to FLAG instead of BLOCK when humans are clearly involved. But the behavioral pattern — click timing concentrated in a foreign country\'s working hours, uniform session lengths, zero conversions, device homogeneity — is unmistakable when you reason about it holistically. These are real people in Dhaka being paid to click on LA-targeted ads. A rule engine can detect any one of these signals; only a reasoning layer can synthesize them into a confident decision.',
      value_add: 'The rule engine\'s FLAG verdict means this attack is successful until a human reviews it — which might be never, or might be too late. 203 clicks at typical CPC is $400-800 in ad waste per batch. The LLM layer converts a soft flag into a hard block, which is the difference between "maybe we\'ll catch it" and "caught."',
    },
  },

  //─────────────────────────────────────────────────────────────────────────
  // 4. THE FRUSTRATED USER
  // Expected: rules false-positive, LLM correctly allows.
  //─────────────────────────────────────────────────────────────────────────
  'frustrated-user': {
    rule: {
      verdict: 'BLOCK',
      risk: 72,
      confidence: 85,
      signals_fired: [
        { rule: 'repeat_clicks_10s', threshold: 'max 2 clicks per 10s window', actual: '4 clicks / 10s', severity: 'high' },
        { rule: 'click_velocity', threshold: 'suspicious > 3 clicks/min', actual: '4 clicks in 10s', severity: 'high' },
      ],
      explanation: 'Rapid-fire repeat clicks from the same IP trigger the repeat-click rule. This rule is tuned aggressively because rapid repeats are a strong bot signal in most traffic. Default action: BLOCK — which is exactly wrong in this case.',
    },
    llm: {
      verdict: 'ALLOW',
      risk: 8,
      confidence: 96,
      signals_read: [
        'Connection downlink is 1.2 Mbps — this is a slow mobile network',
        'Time to first interaction was 8.4 seconds — the page was slow to become responsive',
        'The 4 repeat clicks happened in the first 10 seconds, before the page fully loaded',
        'After the page loaded, the session shows 412 mouse movements, 38 scroll events, and 84% scroll depth',
        'Session duration was 11 minutes with 2 add-to-cart events and a completed checkout for $342.17',
        'Referrer was Instagram — a legitimate paid traffic source',
      ],
      explanation: 'This looks exactly like what it is: a real person on a slow 4G connection, frustrated because the page didn\'t load on the first tap, tapping three more times, then waiting and browsing normally and making a purchase. The repeat-click rule is pattern-matching on a signature that, in most cases, indicates a bot. In this case it indicates a human buyer on bad wifi. Reading the full session context is the only way to distinguish the two. Blocking this click costs the advertiser a paying customer and erodes trust in the click protection system itself.',
      value_add: 'False positives are a silent killer for click fraud products. Every legitimate customer a rule engine blocks is an advertiser who starts wondering if the protection is working against them. LLM-powered context reading is the primary lever for reducing false positive rate without sacrificing detection rate — the two usually trade off in rule engines; they don\'t have to with reasoning.',
    },
  },

  //─────────────────────────────────────────────────────────────────────────
  // 5. THE RETURNING CUSTOMER
  // Expected: both allow, but LLM adds intelligence rules can't.
  //─────────────────────────────────────────────────────────────────────────
  'returning-customer': {
    rule: {
      verdict: 'ALLOW',
      risk: 5,
      confidence: 100,
      signals_fired: [
        { rule: 'rate_limit_per_ip', threshold: '5 clicks / 60s', actual: '1 click', severity: 'none' },
        { rule: 'device_fingerprint_match', threshold: 'exists and valid', actual: 'present', severity: 'none' },
        { rule: 'referrer_validation', threshold: 'same-origin or platform', actual: 'facebook.com (valid)', severity: 'none' },
      ],
      explanation: 'All clear. The rule engine has nothing more to say. It doesn\'t know who this person is; it only knows that this click doesn\'t match any fraud pattern. That\'s all it\'s designed to do.',
    },
    llm: {
      verdict: 'ALLOW',
      risk: 2,
      confidence: 98,
      signals_read: [
        'Device fingerprint matches a returning visitor from 42 days of history',
        'First visit 42 days ago — organic search, 14-minute session, 11 pages viewed, no purchase. High interest, no decision yet.',
        'Second visit 20 days ago — email campaign, added $408 in items to cart, started checkout, did not complete',
        'Third visit today — paid social click, added $219 item, completed checkout',
        'Cross-session intent score (derived): 0.94 — this is as close to a perfect customer journey as you see',
      ],
      explanation: 'Not fraud. This is the opposite of fraud. This is your highest-intent customer pattern — researched the site, came back for a specific product, abandoned cart, returned, and converted. The rule engine sees one click and says "fine." The LLM layer sees a 42-day journey and says "this is your ideal customer — put them in the retargeting pool, not the blocklist, and learn from this pattern."',
      value_add: 'This is where LLM-powered detection stops being a blocker and becomes an intelligence layer. Rule engines exist to answer "allow or block?" Reasoning layers can answer "what is this, and what should we do about it?" For a product that\'s positioning itself as "predictive intelligence," this class of value — turning detection data into actionable customer intelligence — is where the real differentiation lives.',
    },
  },

  //─────────────────────────────────────────────────────────────────────────
  // 6. THE ZOMBIE COOKIE
  // Expected: rules completely blind, LLM catches attribution fraud.
  //─────────────────────────────────────────────────────────────────────────
  'zombie-cookie': {
    rule: {
      verdict: 'ALLOW',
      risk: 0,
      confidence: 100,
      signals_fired: [
        { rule: 'cookie_valid', threshold: 'must be valid and unexpired', actual: 'valid', severity: 'none' },
        { rule: 'attribution_window', threshold: 'within 30 days', actual: '3 days', severity: 'none' },
        { rule: 'click_session_valid', threshold: 'session exists', actual: 'exists', severity: 'none' },
      ],
      explanation: 'The rule engine has no concept of "attribution fraud." It evaluates clicks as they happen — is this click from a bot? — not conversions as they\'re attributed. From the click engine\'s perspective, everything is fine. The affiliate commission is paid, the advertiser is billed, and the fraud is invisible.',
    },
    llm: {
      verdict: 'FLAG',
      risk: 78,
      confidence: 82,
      signals_read: [
        'Attribution cookie was set from an unrelated page (rainbow-recipes-freeware.example.com) — this is not a site that would naturally refer traffic to the advertiser',
        'The cookie-setting click had a duration of 180ms — consistent with an invisible iframe or script, not a real user click',
        'Between cookie set and conversion: zero return visits to the affiliate page, zero brand interactions with the affiliate',
        'Between cookie set and conversion: 4 organic searches for the advertiser brand, 2 direct visits — clear evidence of independent customer intent',
        'The actual conversion path is: user searched → organic click → purchase. The affiliate contributed nothing.',
      ],
      explanation: 'This is classic cookie stuffing. A sketchy affiliate planted a tracking cookie via an invisible iframe on an unrelated page three days ago. Today, the same user made a purchase that had nothing to do with the affiliate — the user discovered the advertiser through organic search. But because the stuffed cookie is still valid within the attribution window, the affiliate takes credit for the conversion and gets paid a commission for work they didn\'t do. This is a whole class of attack — attribution fraud — that rule-based click inspection can\'t catch because it doesn\'t happen at click time. It happens at conversion time, and it requires correlating the purchase event with the cookie history to spot the impossible timing. This is exactly the kind of predictive intelligence you can\'t encode as a rule.',
      value_add: 'Attribution fraud is the highest-ticket category of click fraud because it directly steals commission dollars. Catching it requires reasoning about causation, not pattern matching. It\'s the single strongest argument for adding an LLM layer to a traditional click protection product — and it\'s almost certainly where ClickGUARD\'s "predictive intelligence" roadmap will eventually have to go.',
    },
  },
};
