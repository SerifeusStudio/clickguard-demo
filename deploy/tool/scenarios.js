/**
 * scenarios.js — 6 hand-crafted click fraud scenarios.
 *
 * Each scenario is designed to demonstrate a specific capability gap
 * between rule-based detectors and LLM-powered detectors, ordered from
 * "obvious bot (rules fine)" to "advanced attribution fraud (rules blind)".
 *
 * The `data` field is a representative click payload — the kind of event
 * shape you'd see in a real detection pipeline (GCLID, device fingerprint,
 * referrer, behavioral signals). It's pseudocode JSON, but the fields are
 * the real ones that matter.
 *
 * The `truth` field is the ground truth (what this actually was), used
 * to show which detector got it right at the end of each scenario.
 */

export const SCENARIOS = [
  {
    id: 'obvious-bot',
    index: 1,
    name: 'The Obvious Bot',
    subtitle: 'Rules catch it. LLM agrees. Baseline.',
    teaser: 'Same IP, 47 clicks in 2 minutes, curl user agent. The easy case.',
    truth: {
      verdict: 'fraud',
      label: 'Scripted bot — confirmed',
      summary: 'This was a naive bot run by someone testing their scraping setup. No attempt to look human. Rules catch it, LLM catches it, everyone wins. This is the baseline.',
    },
    data: {
      click_id: 'clk_9f8a2b1e3d4c5f6a7b8c9d0e1f2a3b',
      gclid: 'CjwKCAjw7-SkBhBqEiwA...',
      timestamp: '2026-04-12T14:23:07.412Z',
      session: {
        session_id: 'sess_bf83a1c2',
        clicks_in_session: 47,
        session_duration_ms: 118_000,
        avg_time_between_clicks_ms: 2_510,
      },
      network: {
        ip: '185.220.101.47',
        asn: 'AS4224 (Luminati Networks — known data center)',
        geo: 'US',
        is_tor: false,
        is_datacenter: true,
        residential: false,
      },
      device: {
        user_agent: 'curl/7.88.0',
        browser: null,
        browser_version: null,
        os: null,
        screen_resolution: null,
        device_fingerprint: null,
      },
      behavioral: {
        mouse_movements: 0,
        scroll_events: 0,
        time_to_first_interaction_ms: null,
        bounce_rate: 1.0,
        page_time_ms: 0,
      },
      referrer: {
        url: null,
        same_origin_check: 'failed',
      },
    },
  },

  {
    id: 'residential-proxy-farm',
    index: 2,
    name: 'The Residential Proxy Farm',
    subtitle: 'Rules miss entirely. LLM catches the coordination.',
    teaser: 'Twelve clicks, twelve different residential IPs, twelve different states. Rules see twelve normal sessions. LLM sees one script wearing twelve costumes.',
    truth: {
      verdict: 'fraud',
      label: 'Coordinated residential proxy campaign',
      summary: 'This was a competitor paying a proxy service to drain the advertiser budget. Each session looks independent — unique IPs, unique geos, no single rule fires. The giveaway is behavioral: identical mouse trajectories, identical screen resolution, identical browser fingerprint across all 12 sessions. Rules can\'t correlate across sessions. LLMs can.',
    },
    data: {
      batch_id: 'batch_4a9c2b1e8d3f',
      timestamp_range: '2026-04-12T09:14:00Z → 2026-04-12T10:43:00Z',
      clicks_in_window: 12,
      sessions: [
        { ip: '73.128.44.189', state: 'TX', asn: 'AS7018 AT&T', residential: true, session_ms: 2_841 },
        { ip: '66.194.22.51', state: 'CA', asn: 'AS20115 Charter', residential: true, session_ms: 2_903 },
        { ip: '108.41.16.203', state: 'NY', asn: 'AS701 Verizon', residential: true, session_ms: 2_778 },
        { ip: '173.66.209.44', state: 'FL', asn: 'AS701 Verizon', residential: true, session_ms: 2_866 },
        { ip: '24.17.181.92', state: 'WA', asn: 'AS33651 Comcast', residential: true, session_ms: 2_901 },
        { ip: '75.82.144.167', state: 'AZ', asn: 'AS5650 Frontier', residential: true, session_ms: 2_812 },
        { ip: '98.150.33.11', state: 'OH', asn: 'AS10796 TWC', residential: true, session_ms: 2_889 },
        { ip: '50.197.42.78', state: 'GA', asn: 'AS7018 AT&T', residential: true, session_ms: 2_847 },
        { ip: '71.206.95.203', state: 'IL', asn: 'AS22773 Cox', residential: true, session_ms: 2_798 },
        { ip: '68.47.108.15', state: 'PA', asn: 'AS701 Verizon', residential: true, session_ms: 2_855 },
        { ip: '174.54.177.99', state: 'VA', asn: 'AS22773 Cox', residential: true, session_ms: 2_823 },
        { ip: '67.185.212.34', state: 'OR', asn: 'AS33651 Comcast', residential: true, session_ms: 2_871 },
      ],
      shared_fingerprint: {
        user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ... Chrome/119.0.0.0 Safari/537.36',
        screen_resolution: '1920x1080',
        color_depth: 24,
        timezone_offset: -300,
        hardware_concurrency: 8,
        canvas_fingerprint_hash: 'f4a8c1e9b2d6', // ← IDENTICAL across all 12 sessions
        mouse_trajectory_hash: '7b3e9a1c8d4f', // ← IDENTICAL across all 12 sessions
      },
      per_session_rule_evaluation: 'all passed individually',
      aggregate_pattern_detected: 'behavioral fingerprint reuse across unrelated IPs',
    },
  },

  {
    id: 'off-hours-click-farm',
    index: 3,
    name: 'The Off-Hours Click Farm',
    subtitle: 'Rules flag cautiously. LLM blocks decisively.',
    teaser: 'Humans operating devices, just the wrong humans. 200 clicks from a South Asian timezone between 3am and 5am local — mouse movement present but robotic.',
    truth: {
      verdict: 'fraud',
      label: 'Human-operated click farm',
      summary: 'A low-cost labor-market click farm. Real humans, real devices, real mouse movement — but the pattern is unmistakable to anyone who thinks about it: a concentrated burst during working hours in Dhaka / Lahore / Jakarta, targeting an ad audience in Los Angeles. Rules flag because "mouse movement present" raises the threshold to block, so they default to a soft flag. LLM reads the context and calls it.',
    },
    data: {
      batch_id: 'batch_8d2f1c4b9e3a',
      timestamp_range: '2026-04-12T22:00:00Z → 2026-04-13T00:30:00Z',
      campaign_target_geo: 'US-CA (Los Angeles metro)',
      clicks_in_window: 203,
      source_asn: 'AS45245 (large cluster, known hosting/residential mix in Bangladesh)',
      geo_pattern: {
        stated_geo: 'various US states via VPN',
        inferred_geo: 'Asia/Dhaka (from device timezone settings)',
        timezone_offsets: [ '+0600 (203 sessions)' ],
        local_hour_distribution: {
          '03:00-04:00': 87,
          '04:00-05:00': 116,
        },
      },
      device_profile: {
        unique_devices: 203,
        shared_os_version_within_0_patches: '89% iOS 17.2.1',
        avg_session_ms: 4_200,
        mouse_movement_present: true,
        mouse_trajectory_entropy: 'low (near-linear paths, fewer than 3 direction changes avg)',
        scroll_depth_avg: '22%',
      },
      conversion_rate: 0.0,
      ad_spend_impact_usd: 382.40,
    },
  },

  {
    id: 'frustrated-user',
    index: 4,
    name: 'The Frustrated User',
    subtitle: 'Rules false-positive. LLM correctly allows.',
    teaser: 'A real customer clicked the ad four times in ten seconds. The page was loading slowly. She was frustrated. Then she bought something for $340.',
    truth: {
      verdict: 'legitimate',
      label: 'High-intent buyer, slow page load',
      summary: 'She saw the ad on Instagram, tapped it, the page was slow, she tapped again thinking it didn\'t register, then twice more out of pure human frustration. Then she waited for it to load, browsed for eleven minutes, and bought a $340 item. Rules see "rapid repeat clicks" and block — that\'s a false positive that costs the advertiser a paying customer. LLM reads the full session and sees a buyer.',
    },
    data: {
      click_id: 'clk_8e3a9c1f4b2d7e8a9b1c2d3e4f5a',
      gclid: 'EAIaIQobChMI...',
      timestamp: '2026-04-12T19:47:22.301Z',
      session: {
        session_id: 'sess_92ac8e41',
        repeat_clicks_in_10s: 4,
        total_session_ms: 671_000,
        final_action: 'purchase',
        purchase_amount_usd: 342.17,
      },
      network: {
        ip: '98.44.172.81',
        asn: 'AS7922 Comcast Cable',
        geo: 'US-CA',
        residential: true,
        is_vpn: false,
      },
      device: {
        user_agent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 ... Mobile/15E148 Safari/604.1',
        os: 'iOS 17.3',
        device_model: 'iPhone 14',
        screen_resolution: '390x844',
        network_type: '4G (slow)',
        connection_downlink_mbps: 1.2, // ← SLOW, explains the repeat clicks
      },
      behavioral: {
        time_to_first_interaction_ms: 8_400, // ← page was slow to load
        mouse_movements: 412,
        scroll_events: 38,
        scroll_depth: '84%',
        time_on_page_ms: 663_000, // 11 minutes
        add_to_cart_events: 2,
        checkout_completed: true,
      },
      referrer: {
        url: 'https://www.instagram.com/',
        same_origin_check: 'passed',
      },
    },
  },

  {
    id: 'returning-customer',
    index: 5,
    name: 'The Returning Customer',
    subtitle: 'Both allow. But LLM adds intelligence rules can\'t.',
    teaser: 'Same device, same IP, three visits across six weeks. Not a threat — a retargeting opportunity the rule engine doesn\'t know exists.',
    truth: {
      verdict: 'legitimate',
      label: 'High-intent returning visitor',
      summary: 'She visited the site six weeks ago (deep browsing, no purchase), came back three weeks later (added two items, abandoned cart), then returned today from a paid ad and bought. Rules have nothing to say about this. LLM can read the full history and tell the advertiser: this person is not fraud, she\'s your ideal audience — put her into the retargeting pool, not the blocklist. That intelligence is worth more than the block decision.',
    },
    data: {
      customer_history_window_days: 42,
      current_click: {
        click_id: 'clk_3a1b9c8d2e4f5a6b',
        timestamp: '2026-04-12T16:08:44.112Z',
        ip: '73.128.99.201',
        device_fingerprint: 'df_a91b3c7e8d2f',
        referrer: 'facebook.com',
      },
      prior_visits: [
        {
          visit_at: '2026-03-01T14:22:11Z',
          source: 'organic_search',
          session_ms: 847_000, // 14 minutes
          pages_viewed: 11,
          cart_events: 0,
          purchase: false,
        },
        {
          visit_at: '2026-03-23T19:03:55Z',
          source: 'email_campaign',
          session_ms: 523_000,
          pages_viewed: 7,
          cart_events: 3,
          add_to_cart: [
            { sku: 'HSE-CLN-PREMIUM', price: 189 },
            { sku: 'HSE-CLN-DEEP', price: 219 },
          ],
          checkout_started: true,
          purchase: false,
        },
        {
          visit_at: '2026-04-12T16:08:44Z',
          source: 'paid_social',
          session_ms: 392_000,
          pages_viewed: 5,
          cart_events: 2,
          purchase: true,
          purchase_amount_usd: 219.00,
        },
      ],
      cross_session_intent_score: 0.94, // ← derived post-hoc
      recommended_action: 'add to high-value audience, not blocklist',
    },
  },

  {
    id: 'zombie-cookie',
    index: 6,
    name: 'The Zombie Cookie',
    subtitle: 'Rules completely blind. LLM catches attribution fraud.',
    teaser: 'Affiliate stuffed a tracking cookie three days ago from an unrelated page. Today, a real user makes a real purchase — and the affiliate takes credit. Rules see a clean click. LLM sees the impossible timing.',
    truth: {
      verdict: 'fraud',
      label: 'Cookie stuffing — attribution fraud',
      summary: 'A sketchy affiliate ran an invisible iframe on a completely unrelated page three days ago, silently planting a tracking cookie in the visitor\'s browser. Today, that same visitor saw an organic search result, clicked through to the advertiser, and bought. The affiliate\'s cookie is now credited with the conversion even though the affiliate contributed nothing. Rules have no concept of "did the click that planted this cookie make sense." LLMs can reason about the timeline.',
    },
    data: {
      conversion_id: 'conv_7a8b9c0d1e2f',
      timestamp: '2026-04-12T20:14:33.088Z',
      attributed_affiliate: 'aff_shady_network_47',
      purchase_amount_usd: 187.50,
      commission_paid_usd: 18.75,
      attribution_cookie: {
        cookie_id: 'aff_7a8b9c0d1e2f',
        set_at: '2026-04-09T11:47:21.004Z', // ← 3 days before conversion
        set_from_page: 'https://rainbow-recipes-freeware.example.com/food-blog-post-2024',
        set_from_click_duration_ms: 180, // ← planted via invisible iframe, no real click
        set_from_user_agent_match: true,
        between_set_and_conversion: {
          user_return_visits_to_affiliate_page: 0,
          user_interactions_with_affiliate_brand: 0,
          user_organic_searches_for_advertiser: 4,
          user_direct_visits_to_advertiser: 2,
        },
      },
      conversion_source_of_truth: {
        actual_path: 'user searched Google for advertiser brand name → clicked organic result → browsed → purchased',
        affiliate_contribution: 'none',
        affiliate_last_touch: false,
        affiliate_first_touch: false,
      },
      rule_engine_saw: {
        cookie_valid: true,
        cookie_not_expired: true,
        click_session_valid: true,
        verdict: 'ALLOW — attribute to affiliate',
      },
    },
  },
];
