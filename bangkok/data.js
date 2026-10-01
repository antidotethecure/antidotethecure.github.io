// All facts checked by live web search on 2026-09-28. Edit here; app.js renders it.
window.DATA = {
  fx: { rate: 33.57, source: 'tradingeconomics.com mid-market', date: '28 Sep 2026' },

  flight: {
    checked: '28 Sep 2026',
    airline: 'Philippine Airlines · Economy · one-way',
    departISO: '2026-10-04T12:25:00-07:00',
    beAtLaxISO: '2026-10-04T09:25:00-07:00',
    checkinClosesISO: '2026-10-04T11:25:00-07:00',
    airportPlan: 'Be at <b>LAX Terminal B (Tom Bradley International)</b> by <b>9:25 AM</b>, 3 hours early, as PAL recommends. Check-in is on Level 3. <b>PAL check-in closes 11:25 AM</b> (60 min before departure). Terminal B is under construction for the 2028 Olympics, so leave extra time for traffic and drop-off.',
    arriveISO: '2026-10-05T22:40:00+07:00',
    layover: '2h 10m layover in Manila (MNL)',
    legs: [
      { flight: 'PR113', date: 'Sun Oct 4', from: 'LAX', fromCity: 'Los Angeles', dep: '12:25', to: 'MNL', toCity: 'Manila', arr: '18:00 (+1, Mon)', duration: '~14h 35m' },
      { flight: 'PR732', date: 'Mon Oct 5', from: 'MNL', fromCity: 'Manila', dep: '20:10', to: 'BKK', toCity: 'Bangkok Suvarnabhumi', arr: '~22:40', duration: '~3h 30m' }
    ],
    notes: [
      '<strong>Online check-in opens Sat Oct 3, 12:25 PM PT</strong> (24h before) and closes 1h before. Do it on the PAL app or <a href="https://www.philippineairlines.com/us/en/check-in-online.html" target="_blank" rel="noopener">philippineairlines.com check-in</a>. It asks for your passport details. Then screenshot the boarding-pass QR and add it with the 🪪 <b>Passport &amp; Ticket</b> button. Your booking reference is in PAL\'s confirmation email (kept off this public page on purpose).',
      '<strong>Seat change:</strong> PAL moved your Manila → Bangkok seat (PR732) from 39A to <b>68K</b> on Sep 28.',
      '<strong>TDAC arrival card</strong>: free at <a href="https://tdac.immigration.go.th" target="_blank" rel="noopener">tdac.immigration.go.th</a>. It opens 72 hours before landing, around <b>8:40 am PT on Fri Oct 2</b>. Use flight <b>PR732</b>, the leg that lands in Thailand. Any site that charges a fee is a scam.',
      '<strong>Carry proof of an onward ticket</strong> dated within your permitted stay (a refundable one is fine). Airlines can refuse to board you without one.',
      '<strong>Visa-exempt stay:</strong> research says US citizens entering from 15 Sep 2026 get <b>30 days</b> (was 60), with one 30-day extension at immigration for 1,900 THB. <b>⚠ Not confirmed with an official source.</b> Check the Thai consulate before signing any lease longer than two months.'
    ],
    manageUrl: 'https://www.philippineairlines.com/',
    statusUrl: 'https://www.flightaware.com/live/flight/PAL732'
  },

  visa: {
    checked: '28 Sep 2026',
    arriveISO: '2026-10-05T22:40:00+07:00',
    exemptEnds: '2026-11-03', extendedEnds: '2026-12-03',
    alert: '<strong>Confirmed:</strong> since 15 Sep 2026, US passports get <b>30 days visa-free (tourism only)</b>, not 60. That\'s one 30-day extension at immigration for ฿1,900, so the ceiling is about <b>3 Dec</b>. GTA 6 launches 19 Nov, so the subathon needs that extension.',
    decision: '<strong>Your plan:</strong> start on <b>tourist stays</b> (visa-free, then the extension, then a Tourist Visa) and go for the <b>DTV later</b>, once the money\'s in place. Nothing DTV-related is required right now.',
    checklist: [
      '<b>Onward ticket proof (PAL can refuse one-way passengers at LAX or Manila):</b> on <b>Sat Oct 3</b>, rent a <b>7-day onward reservation (~$21, e.g. BestOnwardTicket)</b> Bangkok → Kuala Lumpur dated ~<b>Nov 1</b> (must be within your 30 days). A 24-hour one is too short, since LAX check-in to Thai immigration is ~24.5h. Save it in the 🪪 <b>Other</b> slot. Or buy a real ~$70–90 AirAsia/VietJet ticket only if you\'ll actually fly it. Carry ~฿20,000 (~$600) in funds. Leave the TDAC departure-flight field blank (it\'s optional).',
      'File the TDAC arrival card (free) between Oct 2 and Oct 5 at <a href="https://tdac.immigration.go.th" target="_blank" rel="noopener">tdac.immigration.go.th</a>',
      'Check your passport has 6+ months left and a couple of blank pages',
      'Optional: file a $40 Tourist e-Visa today at <a href="https://www.thaievisa.go.th" target="_blank" rel="noopener">thaievisa.go.th</a>. If it\'s approved by Oct 4 you get 60 days instead of 30. If not, fly visa-free anyway.',
      'Keep a few thousand dollars in your regular bank account. Tourist Visa applications ask for a recent bank statement (crypto balances don\'t count).'
    ],
    timeline: [
      { date: 'Mon Oct 5', title: 'Land visa-free', body: '30 days → leave or extend by <b>Nov 3</b>. Immigration counts arrival day as day 1.' },
      { date: 'Move-in day', title: 'TM30 residence report', body: 'Your landlord must file it within 24h. Get the receipt. You need it for the extension.' },
      { date: 'Late Oct (before Nov 3)', title: '30-day extension', body: 'Go to Bangkok immigration with passport, photo, TM30 receipt and ฿1,900. One time only → new limit <b>Dec 3</b>. Covers the GTA 6 launch (Nov 19). Confirm the office (Chaeng Watthana vs IT Square Laksi) before going.' },
      { date: 'Late Nov – Dec 3', title: 'Leave & file a Tourist Visa', body: 'Fly out (Kuala Lumpur is cheap). File a TR e-Visa ($40) online from there, wait for approval, fly back: 60 days + a 30-day extension → ~early Mar 2027. Don\'t count on a second back-to-back visa-free entry.' },
      { date: 'When you\'re ready', title: 'Go for the DTV', body: 'Once ~$16k sits in your bank account (about 3 months, to be safe), get the FBI check (it has to be less than 3 months old when you apply) and file the DTV from outside Thailand. See the DTV card below.' },
      { date: 'Every 90 days', title: '90-day report (TM47)', body: 'On any stay past 90 days, file online at <a href="https://tm47.immigration.go.th/tm47/" target="_blank" rel="noopener">tm47.immigration.go.th</a>. Leaving the country resets the clock.' }
    ],
    options: [
      { tag: { text: 'Later goal', cls: 'best' }, title: 'DTV (Destination Thailand Visa)', cost: '$400 · 5 years · 180 days per entry',
        body: 'Built for remote workers: streaming for US platforms is OK, but no Thai clients. Needs an FBI check ≤3 months old, a US driver\'s license, a <b>฿500k bank statement</b>, and a portfolio. <b>Must be filed from outside Thailand, to LA or DC.</b> Since 31 Aug, Americans can\'t apply at Vientiane, KL, Penang or Phnom Penh. The +180-day extension is discretionary and often refused.<br><br><b>💰 Money, when you\'re ready (not required now):</b> ฿500,000 (~$14,900 today, aim ~$16k for exchange swings) in a regular <b>checking or savings account in your name</b>. <b>Crypto balances don\'t count.</b> Guides say it should sit there ~3 months, and cash moved in from an exchange right before applying is a common rejection. Keep the sale records. Selling crypto can mean US capital-gains tax.',
        link: 'https://thaiconsulatela.thaiembassy.org/en/publicservice/dtv-visa', linkLabel: 'LA consulate DTV page' },
      { tag: { text: 'Now', cls: 'best' }, title: 'Visa-free entry', cost: 'Free · 30 days + 30 (฿1,900)',
        body: 'What you\'ll arrive on. Tourism only: streaming for income is technically outside it, so keep it low-key until you have the DTV.' },
      { tag: { text: 'Your plan · next step', cls: 'best' }, title: 'Tourist Visa (TR)', cost: '~$40 · 60 days + 30',
        body: 'Filed online from outside Thailand. Buys 90 days while you save for the DTV.' },
      { tag: { text: 'Not a fit', cls: 'warn' }, title: 'LTR "Work-from-Thailand"', cost: '฿50,000 · 10 years',
        body: 'Needs $80k/yr income over 2 years, from an employer with $50M+ revenue. A self-employed creator doesn\'t qualify.', link: 'https://ltr.boi.go.th/', linkLabel: 'BOI LTR' },
      { tag: { text: 'Expensive', cls: 'warn' }, title: 'Thailand Privilege (ex-Elite)', cost: 'From ฿650,000 (~$19k), non-refundable',
        body: 'No income test, 5–20 years, but <b>no work rights</b>. Pricier than the DTV\'s refundable ฿500k.', link: 'https://www.thailandprivilege.co.th/', linkLabel: 'Official site' },
      { tag: { text: 'Risky', cls: 'warn' }, title: 'Education (ED) visa', cost: 'School ~฿25–35k/yr',
        body: 'Language school, ~1 year max. Attendance is tracked (~80%) and ~10,000 student visas were revoked in a 2026 crackdown. Only if you really go to class.' }
    ],
    warnings: [
      '<strong>Paid reviews from Thai restaurants or brands = work.</strong> That\'s illegal without a work permit, even on a DTV. Keep paid deals with US businesses.',
      '<strong>Tax:</strong> no Thai tax residency in 2026 (you can\'t reach 180 days). In <b>2027</b>, 180+ days makes you a resident, and money you transfer into Thailand becomes taxable. The US still taxes you. Foreign earned income exclusion is $132,900 for 2026 but doesn\'t remove self-employment tax. See an expat CPA before 2027.',
      '<strong>Banking:</strong> reports say Thai banks are refusing accounts for tourist and DTV holders. Plan to live on your US account + Wise.'
    ],
    unverified: [
      'Whether you can file the DTV online to LA while in Malaysia (one secondary site says yes; official pages are silent). Ask LA.',
      'Minimum bank balance for the Tourist Visa (LA doesn\'t publish one).',
      'Whether ฿500k must be held 3 months (secondary) or just be the ending balance (LA\'s official wording).',
      'What happens to a pending DTV/TR application if you enter Thailand before approval.',
      'Which Bangkok immigration office handles visa-free extensions right now.',
      'thaievisa.go.th, the Foreign Ministry, the Royal Gazette and Bangkok Post couldn\'t be fully loaded. Facts rely on LA consulate pages + reputable secondary sources.'
    ],
    sources: [
      'https://thaiconsulatela.thaiembassy.org/en/publicservice/visa-exemption-and-visa-on-arrival-to-thailand',
      'https://thaiconsulatela.thaiembassy.org/en/publicservice/dtv-visa',
      'https://thaiconsulatela.thaiembassy.org/en/page/frequently-ask-questions-faq-for-visa',
      'https://www.bangkokpost.com/thailand/general/3311970/30day-visafree-stays-to-take-effect-on-sept-15',
      'https://visasnews.com/en/thailand-to-officially-cut-visa-free-stay-to-30-days-on-september-15-2026/',
      'https://www.issacompass.com/insights/thailand-visa-exemption-2026',
      'https://www.issacompass.com/insights/dtv-visa-thailand',
      'https://dtvthaivisa.com/blog/dtv-visa-new-rules-31-august-2026',
      'https://eiglaw.com/thailand-updates-destination-thailand-visa-document-requirements/',
      'https://thethaiger.com/guides/visa-information/thailands-new-dtv-rule-creates-uncertainty',
      'https://ltr.boi.go.th/',
      'https://www.thailandprivilege.co.th/',
      'https://www.legal.co.th/resources/corporate-and-tax-advisory/thailand-corporate-law/yes-foreign-youtubers-need-work-permits-thailand/',
      'https://brerrabbitlegal.co.th/insights/thailand-remittance-tax-exemption-2026-status/',
      'https://tvc.co.th/guides/90-days-report-online',
      'https://thainomadlife.com/dtv-financial-proof-2026/',
      'https://www.stampstay.com/blog/thailand/dtv/bank-statement-requirements'
    ]
  },

  landing: {
    checked: '28 Sep 2026',
    alert: '<strong>Landing at 22:40 means the train is out.</strong> The Airport Rail Link\'s last train leaves around midnight, but it reaches the city after the BTS and MRT have stopped, so you\'d be stuck with bags. Take the <b>official taxi queue</b> or Grab.',
    checklist: [
      'Immigration (Level 2): passport + TDAC QR ready',
      'SIM: AIS counter between Gates 6–7, arrivals hall (passport needed)',
      'Cash: SuperRich Orange on Level B closes <b>23:30</b>. If you miss it, change ~$50 at a bank counter or use one ATM (decline dollar conversion)',
      'Ride: Level 1, taxi kiosks Gates 4–7 (or Grab pickup, Gate 4)',
      'Send the driver your address on LINE / Google Maps, then text someone your ride details',
      '📱 <b>Before you fly:</b> open T-Life → your line → <b>Manage Add-Ons</b>. Check what the $50 actually is (T-Mobile\'s site says $50 = a one-time 10-day pass) and whether it renews.',
      '📱 <b>Before you fly:</b> Settings → Phone → <b>Wi-Fi Calling ON</b> for the T-Mobile line. Calls to US numbers over Wi-Fi are free from Thailand.',
      '📱 <b>After the Thai SIM/eSIM is in:</b> Settings → Cellular → set <b>Cellular Data = Thai line</b>, and turn <b>OFF "Allow Cellular Data Switching"</b> so your T-Mobile pass isn\'t used up.',
      '📱 Keep the <b>T-Mobile line ON</b> for calls, texts, iMessage and bank codes. Your US number keeps working (texts unlimited, calls free on Wi-Fi or with the pass, ~$0.50/min otherwise).',
      '📱 <b>Staying past ~60 days?</b> Call T-Mobile and ask how to keep your number active on a long stay abroad. They can block roaming if most usage is outside the US for ~2 bill cycles.'
    ],
    transport: [
      { tag: { text: 'Best at night', cls: 'best' }, title: 'Official public taxi queue', cost: '฿400–500 · ~$12–15 total',
        body: 'Level 1, kiosks between Gates 4 and 7, 24h. Take the printed ticket (it has the complaint number). The meter runs ~฿280–380, plus the official ฿50 airport fee, plus ฿25–75 expressway tolls that you pay. Insist on the meter and carry small notes. No surge pricing.' },
      { title: 'Grab', cost: '฿450–650 · ~$13–19 at 23:30',
        body: 'Normal fare ฿400–550. Late-night surge can add 20–50%. Pickup: Level 1, Gate 4, points A–D, per the airport\'s own page. Follow the pin in the app. Set up the app and add a card before you fly.',
        flag: 'Fares are ranges from 2026 blogs, not a live quote. One blog says the pickup is on Floor 4.' },
      { title: 'Bolt', cost: '~฿350–550 · ~$10–16 (estimate)',
        body: 'Operates at BKK. You can schedule a pickup that tracks your flight and adjusts if you\'re delayed. A good backup if Grab is surging.',
        flag: 'Bolt airport fare not confirmed by any source.' },
      { tag: { text: 'Not tonight', cls: 'warn' }, title: 'Airport Rail Link', cost: '฿35–45 · ~$1–1.35',
        body: 'Level B. ฿35 to Makkasan (MRT), ฿45 to Phaya Thai (BTS). The last weekday train is ~00:00 and arrives ~00:20–00:30, when the BTS and MRT are shutting. Great in daytime, risky at your arrival time.',
        flag: 'Exact last-train times differ by source (23:51–00:02).' }
    ],
    sims: [
      { tag: { text: 'Works on landing', cls: 'best' }, title: 'Your T-Mobile International Pass', cost: '$50 = 10 days · 15GB (not 30 days)',
        body: 'Confirmed on T-Mobile\'s own page: <b>$50 is the 10-Day Pass</b>, with 15GB high-speed data, free calls and hotspot allowed. The <b>30-Day Pass is $75 for 30GB</b>. After the data runs out you drop to slow speed. It covers Grab, Maps and LINE on landing night, but <b>not your streaming</b>: 15GB is gone in a few hours of live upload. T-Mobile also blocks roaming if most of your usage is abroad for more than about 2 billing cycles. So still get a Thai SIM (AIS ฿1,199 / 30 days, unlimited) in your first days, and keep T-Mobile for US calls, texts and 2FA codes.<br><br><b>Your US number works in Thailand, so you don\'t need WhatsApp-only:</b> unlimited texts, unlimited calls while the pass is active, <b>free Wi-Fi Calling to US numbers</b>, ~$0.50/min for cell calls without a pass. The phone setup steps are in the checklist at the top of this section.',
        link: 'https://www.t-mobile.com/cell-phone-plans/international-roaming-plans/unlimited-calling-data-pass', linkLabel: 'T-Mobile pass page' },
      { tag: { text: 'Pick this for the month', cls: 'best' }, title: 'AIS tourist SIM', cost: '฿399 / 5d · ฿499 / 8d · ฿699 / 15d · ฿1,199 / 30d',
        body: '≈ $12 / $15 / $21 / $36. Unlimited full-speed data plus ฿100 call credit. Counter in the arrivals hall between Gates 6 and 7. Passport required. The 30-day plan covers your first month.',
        flag: '8-day price quoted as both ฿449 and ฿499. The 24h counter hours come from third-party guides.' },
      { title: 'TrueMove H (now includes dtac)', cost: '฿449 / 8d · ฿699 / 15d · ฿1,199 / 30d',
        body: 'Unlimited 5G data plus unlimited local calls. Counters in the arrivals hall. dtac merged into True Corp, so it\'s the same company now. You can buy the eSIM online before the flight to skip the late-night queue.',
        flag: 'One source says the 8-day plan is ฿499 after the merger.' }
    ],
    cash: [
      { tag: { text: 'Best rate', cls: 'best' }, title: 'SuperRich Orange (airport)', cost: 'Open 05:30–23:30',
        body: 'Level B, next to the Airport Rail Link station. No commission and about 1% off mid-market. Saves ~$70 per $1,000 vs the airport bank counters. Bring crisp, undamaged US bills (large bills get the best rate) and your passport. The Green SuperRich airport branch is reported closed.',
        flag: 'Hours come from a third-party site (Oct 2025), not SuperRich\'s own site.' },
      { title: 'Airport bank counters', cost: '~5–7% worse',
        body: 'Open late. Only change $30–50 here if SuperRich is closed. That covers the taxi.' },
      { title: 'ATMs', cost: '฿220 per withdrawal (~$6.55)',
        body: 'Some machines charge ฿250–350; AEON ATMs charge ฿150. Always <b>decline</b> the dollar conversion and choose to be charged in THB. Withdraw large amounts less often. Later, change your main cash at a SuperRich branch in the city.' }
    ],
    downloads: [
      { name: 'Grab', why: 'Rides, food and payments. Add a card before you fly.', ios: 'https://apps.apple.com/app/id647268330', android: 'https://play.google.com/store/apps/details?id=com.grabtaxi.passenger' },
      { name: 'Bolt', why: 'Backup rides. Scheduled airport pickup with flight tracking.', ios: 'https://apps.apple.com/app/id675033630', android: 'https://play.google.com/store/apps/details?id=ee.mtakso.client' },
      { name: 'LINE', why: 'How landlords, hotels, shops and drivers message in Thailand.', ios: 'https://apps.apple.com/app/id443904275', android: 'https://play.google.com/store/apps/details?id=jp.naver.line.android' },
      { name: 'Google Maps + offline Bangkok', why: 'On Wi-Fi before the flight: tap your profile picture, then Offline maps, Select your own map, frame the airport to Sukhumvit, and Download.', ios: 'https://apps.apple.com/app/id585027354', android: 'https://play.google.com/store/apps/details?id=com.google.android.apps.maps' }
    ],
    unverified: [
      'Live Grab/Bolt fares for 23:30 on Oct 5 depend on surge.',
      'Official last-train times for the Airport Rail Link, BTS and MRT, from the operators themselves.',
      'Whether the SIM counters really stay open 24h.'
    ],
    sources: [
      'https://suvarnabhumi.airportthai.co.th/service/transportation/detail/304',
      'https://suvarnabhumi.airportthai.co.th/service/transportation/detail/927',
      'https://go2-thailand.com/blog/bangkok-airport-transfer-guide-2026/',
      'https://bolt.eu/en/airports/bkk/',
      'https://www.thaitrainguide.com/2023/09/20/times-for-first-and-last-trains-for-the-airport-rail-link-in-bangkok/',
      'https://www.t-mobile.com/cell-phone-plans/international-roaming-plans/unlimited-calling-data-pass',
      'https://www.t-mobile.com/customers/roaming-data-alert',
      'https://www.t-mobile.com/customers/unlimited-roaming-sms-data',
      'https://www.t-mobile.com/cell-phone-plans/international-roaming-plans',
      'https://thailandesim.com/mobile-operators/ais/',
      'https://thailandesim.com/mobile-operators/truemove-h/',
      'https://thaiest.com/blog/super-rich-suvarnabhumi-airport-exchange-rates',
      'https://baht-to-usd.com/guides/atm-fees-thailand/',
      'https://support.google.com/maps/answer/6291838',
      'https://tdac.immigration.go.th'
    ]
  },

  stay: {
    starter: {
      "intro": "Rent one of these for <b>one month</b>, live in the area, then pick your real place. Prices as listed on 28 Sep 2026, so confirm before paying. <b>Never pay before a viewing or live video walkthrough.</b> At the viewing, ask for a speed test showing <b>upload</b>.",
      "items": [
        {
          "tag": {
            "text": "Land here night 1",
            "cls": "best"
          },
          "name": "VP Tower Serviced Apartment",
          "area": "BTS Victory Monument · 280 m",
          "room": "Studio 32 m², desk, pool, gym",
          "thb": "15,500",
          "usd": "462",
          "util": "Electric ฿7/unit · water ฿20/unit",
          "net": "Free fiber Wi-Fi (speed not stated)",
          "terms": "1 month · 1 mo deposit + 1 mo advance · ฿1,200/night daily rate",
          "note": "24h reception: check in at midnight on the daily rate, speed-test, then switch to monthly.",
          "url": "https://www.renthub.in.th/en/apartments-for-rent-in-rang-nam-road-vp-tower-serviced-apartment-free-wifi",
          "phone": "+66 94 346 6600",
          "maps": "https://www.google.com/maps/search/?api=1&query=VP+Tower+Serviced+Apartment+Rang+Nam+Bangkok"
        },
        {
          "tag": {
            "text": "Check availability",
            "cls": "best"
          },
          "name": "Sukhumvit 81 Apartments",
          "area": "BTS On Nut · 150–200 m",
          "room": "1BR 40 m², desk + chair, bathtub",
          "thb": "14,000–16,000",
          "usd": "417–477",
          "util": "Electric ฿8/unit · water ฿20/unit",
          "net": "Free Wi-Fi (speed not stated)",
          "terms": "1 month · 1 mo deposit + 1 mo advance",
          "note": "⚠ Update 28 Sep: 1BR units now marked unavailable, and only a 3-month price is posted. Ask about studios (฿10–12k).",
          "url": "https://www.renthub.in.th/en/fully-furnished-apartments-in-sukhumvit-81-convenient-to-transportation-just-200-m-from-bts-on-nut",
          "phone": "+66 2 026 6941",
          "maps": "https://www.google.com/maps/search/?api=1&query=Sukhumvit+81+Apartments+On+Nut+Bangkok"
        },
        {
          "tag": {
            "text": "Bills included",
            "cls": "best"
          },
          "name": "day one space – Sukhumvit 52",
          "area": "BTS On Nut · 380 m",
          "room": "Studio 18 m² (small), desk",
          "thb": "21,600",
          "usd": "643",
          "util": "Water + electric INCLUDED",
          "net": "\"Co-working-grade\" internet included",
          "terms": "1 month (19,000 on 3 mo) · 1 mo deposit + 1 mo advance",
          "note": "Tiny, but no surprise electric bill from running the PC + AC all day.",
          "url": "https://www.renthub.in.th/en/day-one-space-sukhumvit-52-bts-on-nut-free-utilities-high-speed-internet",
          "phone": "",
          "maps": "https://www.google.com/maps/search/?api=1&query=day+one+space+Sukhumvit+52+Bangkok"
        },
        {
          "tag": null,
          "name": "Bamboo For Rest",
          "area": "BTS On Nut · ~250 m",
          "room": "1BR 45 m²",
          "thb": "16,000–18,000",
          "usd": "479–539",
          "util": "Ask",
          "net": "Free Wi-Fi",
          "terms": "1–6 months · 1 mo deposit + 1 mo advance",
          "note": "⚠ Update 28 Sep: every room type now marked unavailable. Ask if anything opens up in October.",
          "url": "https://www.renthub.in.th/en/bamboo-for-rest",
          "phone": "+66 99 191 4463",
          "maps": "https://www.google.com/maps/search/?api=1&query=Bamboo+For+Rest+Sukhumvit+50+Bangkok"
        },
        {
          "tag": {
            "text": "Bills included",
            "cls": "best"
          },
          "name": "Hotel & Residence Phra Khanong",
          "area": "BTS Phra Khanong · 450 m",
          "room": "20–24 m², no desk listed",
          "thb": "14,000–17,000",
          "usd": "417–506",
          "util": "Water + electric INCLUDED · cleaning 2×/week",
          "net": "Free Wi-Fi (speed not stated)",
          "terms": "1 month · only ฿300 key deposit + 1 mo advance",
          "note": "Hotel-style, so a late check-in is likely. Confirm first.",
          "url": "https://www.renthub.in.th/en/hotel-residence-for-rent-in-phra-khanong-sukhumvit-peaceful-and-private-not-far-from-bts",
          "phone": "+66 61 406 9111",
          "maps": "https://www.google.com/maps/search/?api=1&query=Hotel+%26+Residence+Phra+Khanong+Sukhumvit+Bangkok"
        },
        {
          "tag": {
            "text": "Cheapest",
            "cls": "best"
          },
          "name": "Golden Onnut",
          "area": "BTS On Nut · 960 m",
          "room": "38–42 m² rooms",
          "thb": "10,000–12,300",
          "usd": "298–366",
          "util": "Electric ฿5.5/unit (cheap) · water ฿18/unit",
          "net": "Free Wi-Fi",
          "terms": "Accepts 1-month contract · ฿10,000 deposit + 1 mo advance",
          "note": "24h security. Farther walk to the BTS.",
          "url": "https://www.renthub.in.th/en/golden-onnut-soi-onnut8-near-onnut-plaza-accept-contract-1-month",
          "phone": "+66 2 730 3381",
          "maps": "https://www.google.com/maps/search/?api=1&query=Golden+Onnut+On+Nut+Soi+8+Bangkok"
        },
        {
          "tag": {
            "text": "Book online · 500/500",
            "cls": "best"
          },
          "name": "Metro Sky Wutthakat (Monthly Nomad)",
          "area": "BTS Wutthakat · 400 m (Thonburi side)",
          "room": "28 m² 1BR condo, pool, gym, co-working",
          "thb": "20,000",
          "usd": "596",
          "util": "Electric + water extra",
          "net": "500/500 Mbps stated",
          "terms": "1 month (19k on 2–3 mo) · 1 mo deposit + 1 mo advance",
          "note": "Bookable online without a viewing.",
          "url": "https://monthlynomad.com/condo/clock-out-chill-out-modern-bangkok-retreat/",
          "phone": "",
          "maps": "https://www.google.com/maps/search/?api=1&query=Metro+Sky+Wutthakat+Bangkok"
        },
        {
          "tag": {
            "text": "Airbnb · 500/500",
            "cls": "best"
          },
          "name": "Skyline Loft (Airbnb)",
          "area": "BTS On Nut · 5 min",
          "room": "1BR duplex 45 m², dedicated desk",
          "thb": "Ask for a quote",
          "usd": "likely 750–1,050",
          "util": "Host covers water + internet on long stays",
          "net": "500/500 Mbps, desk",
          "terms": "Airbnb monthly · request Oct 5 – Nov 4",
          "note": "4.95★. Probably over budget; ask for the monthly discount.",
          "url": "https://www.airbnb.com/rooms/1054685715989275370",
          "phone": "",
          "maps": "https://www.google.com/maps/search/?api=1&query=On+Nut+BTS+Bangkok"
        },
        {
          "tag": null,
          "name": "Elio Del Ray Sukhumvit 64 (condo)",
          "area": "BTS Punnawithi/Udom Suk · ~700 m",
          "room": "1BR 34 m², work desk, 5th floor",
          "thb": "19,000",
          "usd": "569",
          "util": "Condo = government electric rate",
          "net": "Not stated",
          "terms": "1 mo 19,000 · 3 mo 17,000 · 6 mo 15,000",
          "note": "Real high-rise condo via agent ad.",
          "url": "https://www.livinginsider.com/en/detail/condo-for-rent-elio-del-ray-sukhumvit-64-1bedroom-3190237",
          "phone": "",
          "maps": "https://www.google.com/maps/search/?api=1&query=Elio+Del+Ray+Sukhumvit+64+Bangkok"
        },
        {
          "tag": null,
          "name": "L.A. Tower (Ratchada)",
          "area": "MRT Sutthisan · 650 m",
          "room": "Studio 28–36 m², pool, gym",
          "thb": "13,500–14,000",
          "usd": "402–417",
          "util": "Electric ฿7 · water ฿22 · service ฿300",
          "net": "Ask",
          "terms": "1 month · daily ฿1,000–1,400",
          "note": "Other side of town from On Nut, but has a daily rate for a trial night.",
          "url": "https://www.renthub.in.th/en/l-a-tower",
          "phone": "",
          "maps": "https://www.google.com/maps/search/?api=1&query=L.A.+Tower+Ratchada+Soi+17+Bangkok"
        }
      ],
      "sites": [
        {
          "name": "RentHub",
          "url": "https://www.renthub.in.th/en",
          "why": "Apartment buildings with 1-month contracts and posted prices. Best for month one."
        },
        {
          "name": "LivingInsider",
          "url": "https://www.livinginsider.com/en",
          "why": "Condo ads with 1/3/6-month price tables. Filter \"short-term\"."
        },
        {
          "name": "Monthly Nomad",
          "url": "https://monthlynomad.com/",
          "why": "Book a monthly condo online, speeds often listed."
        },
        {
          "name": "Airbnb (monthly)",
          "url": "https://www.airbnb.com/s/Bangkok/homes?monthly_stay=true",
          "why": "Fastest to book, 20–50% pricier. Filter for Wi-Fi speed."
        },
        {
          "name": "Hipflat",
          "url": "https://www.hipflat.co.th/en",
          "why": "Big condo portal. Most ads are 1-year, so ask about short terms."
        },
        {
          "name": "DDproperty",
          "url": "https://www.ddproperty.com/en",
          "why": "Thailand's largest portal, same deal: ask for 1–3 month terms."
        },
        {
          "name": "FazWaz",
          "url": "https://www.fazwaz.co.th/",
          "why": "English-friendly condo listings with good filters."
        }
      ]
    },
  "checked": "28 Sep 2026",
  "alert": "<strong>Reality check:</strong> the three you named are all <b>over ฿30,000/month</b>. Shama ≈ ฿170,000, Fraser ≈ ฿88,000–100,500, Citadines from ฿46,000. <b>There is no Somerset on Soi 11.</b> The Ascott-brand place there is Citadines Sukhumvit 11. None of these properties publishes a Wi-Fi speed. For streaming, ask each one for a speedtest screenshot showing <b>upload</b>.",
  "items": [
    {
      "name": "Shama Sukhumvit Bangkok",
      "address": "12 Sukhumvit Soi 4, Sukhumvit Road, Klongtoey, Bangkok 10110",
      "maps": "https://www.google.com/maps/search/?api=1&query=Shama+Sukhumvit+Bangkok%2C+12+Sukhumvit+Soi+4%2C+Sukhumvit+Road%2C+Klongtoey%2C+Bangkok+10110",
      "bts": "BTS Nana / Phloen Chit — property says 'within 10 minutes' (walk ~700-900 m)",
      "thb": "170,000",
      "usd": "5,087",
      "basis": "OFFICIAL monthly rate, One Bedroom 66 sqm (shama.com long-stays page, fetched 2026-09-28). Old Nomad Rental archive showed $3,439/mo but that platform is defunct.",
      "wifi": "Complimentary Wi-Fi; no speed published. Reviews mixed: 'good but had glitches', 'barely good enough, no superspeeds', one TripAdvisor review titled 'cleaning poor, no wifi'; Oyster: 'spotty in places'.",
      "book": "https://www.shama.com/sukhumvit/long-stays",
      "photo": "https://media.onyx-hospitality.com/-/media/project/shama/common/property/sukhumvit/share/hotel.jpg?w=1200&rev=f96ec6b4338d42e5ba7046458b359908&hash=3C2F5A2FD1EFF73F53F583A3C0823C0A",
      "flags": [
        "~5.7x over the 30k budget",
        "Wi-Fi reliability complaints in reviews",
        "Some third-party sites cite Soi 2; official address is Soi 4"
      ],
      "tag": {
        "text": "Way over budget",
        "cls": "warn"
      }
    },
    {
      "name": "Citadines Sukhumvit 11 Bangkok (Ascott)",
      "address": "22/22 Sukhumvit Soi 11, Sukhumvit Road, Klongtoey Nua, Wattana, Bangkok 10110",
      "maps": "https://www.google.com/maps/search/?api=1&query=Citadines+Sukhumvit+11+Bangkok%2C+22%2F22+Sukhumvit+Soi+11%2C+Sukhumvit+Road%2C+Klongtoey+Nua%2C+Wattana%2C+Bangkok+10110",
      "bts": "BTS Nana ~400 m (~5-6 min walk); free tuk-tuk shuttle",
      "thb": "46,000",
      "usd": "1,377",
      "basis": "'FROM' price, 1BR ~40 sqm on a 1-year lease (agent listing apartmentforrentbangkok.com; official site shows no monthly rate). Short-term estimate: nightly from THB 1,803 x 30 = ~54,000 THB (h-rez aggregator, room type unclear, unverified).",
      "wifi": "Free in-room Wi-Fi; no speed published. Reviews: 'not always the fastest but it works'; another said 'fast internet connection'.",
      "book": "https://www.discoverasr.com/en/citadines/thailand/citadines-sukhumvit-11-bangkok",
      "photo": "https://www.discoverasr.com/content/dam/tal/media/images/properties/thailand/bangkok/citadines-sukhumvit-11-bangkok/amenities/banner-image-amenities/CS11-Banner-Image-Desktop-Amenities.jpg",
      "flags": [
        "This is the ONLY Ascott-brand property on Soi 11 — there is no Somerset on Soi 11 (Somerset Maison Asoke = Soi 23, Somerset Sukhumvit Thonglor = Soi 55, Somerset Ekamai, Somerset Sukhumvit 71)",
        "Over 30k (1.5x-1.8x)",
        "46k figure assumes 12-month lease; 1-month Oct stay will cost more"
      ],
      "tag": {
        "text": "Over budget",
        "cls": "warn"
      }
    },
    {
      "name": "Fraser Suites Sukhumvit, Bangkok",
      "address": "38/8 Sukhumvit Soi 11, Klong Toey Nua, Wattana, Bangkok 10110",
      "maps": "https://www.google.com/maps/search/?api=1&query=Fraser+Suites+Sukhumvit%2C+Bangkok%2C+38%2F8+Sukhumvit+Soi+11%2C+Klong+Toey+Nua%2C+Wattana%2C+Bangkok+10110",
      "bts": "BTS Nana ~500 m (~6-7 min walk); free shuttle",
      "thb": "88,000-100,500",
      "usd": "2,633-3,008",
      "basis": "NIGHTLY x 30 ESTIMATE: One Bedroom Premier (74 sqm) GBP 64.76-73.69/night (~$88-100) via theapartmentnetwork.com. Condo portal thailand-property lists units from THB 76,999 (studio) to 199,000/mo on 1-yr term. No official monthly rate published.",
      "wifi": "'Complimentary high-speed internet' in-room; no Mbps stated. One review notes the hotel replaced all Wi-Fi routers after connectivity complaints.",
      "book": "https://www.frasershospitality.com/en/thailand/bangkok/fraser-suites-sukhumvit/",
      "photo": "https://www.frasersproperty.com/content/dam/frasers-hospitality/english/properties/thailand/images/fraser_suites_sukhumvit_bangkok/home-page-banner/desktop-1650x430/Fraser%20Suites%20Sukhumvit%20-%2003%20Lobby%20Side-2.jpg",
      "flags": [
        "~3x-3.4x over the 30k budget",
        "Price is an estimate; request a long-stay quote"
      ],
      "tag": {
        "text": "Way over budget",
        "cls": "warn"
      }
    },
    {
      "name": "Waterford Sukhumvit 50 (Waterford Serviced Apartments)",
      "address": "Sukhumvit Soi 50, Phra Khanong, Khlong Toei, Bangkok 10260 (listing unit 890/99)",
      "maps": "https://www.google.com/maps/search/?api=1&query=Waterford+Sukhumvit+50%2C+Sukhumvit+Soi+50%2C+Phra+Khanong%2C+Khlong+Toei%2C+Bangkok+10260+%28listing+unit+890%2F99%29",
      "bts": "BTS On Nut ~1 km; free shuttle every 30 min 06:30-23:30 (~5 min ride)",
      "thb": "25,000",
      "usd": "748",
      "basis": "OFFICIAL monthly rate, 1BR 56.5 sqm: 25,000 THB on a 3-month contract (20,000 on 6-month, 18,000 on 1-year) — waterford.co.th one-bedroom listing.",
      "wifi": "No speed or Wi-Fi inclusion stated on official page; assume you'll need your own fiber line or 5G router.",
      "book": "https://www.waterford.co.th/one-bedroom-copy-4",
      "photo": "https://static.wixstatic.com/media/fd3ac2_f4da6e8da092417a9418c64795e3af9d~mv2.jpg",
      "flags": [
        "UNDER 30k with an actual published contract price",
        "Minimum 3-month contract — a 1-month October stay does not qualify at this rate",
        "Wi-Fi unknown",
        "Not walking distance to BTS without shuttle"
      ],
      "tag": {
        "text": "Best under-30k price",
        "cls": "best"
      }
    },
    {
      "name": "Nantiruj Tower (Sukhumvit Soi 8)",
      "address": "Sukhumvit Soi 8, Khlong Toei, Bangkok 10110",
      "maps": "https://www.google.com/maps/search/?api=1&query=Nantiruj+Tower%2C+Sukhumvit+Soi+8%2C+Khlong+Toei%2C+Bangkok+10110",
      "bts": "BTS Asok ~500 m / BTS Nana ~570 m (~9 min walk); free tuk-tuk to Nana",
      "thb": "26,900",
      "usd": "805",
      "basis": "OFFICIAL short-term monthly rate for the 54 sqm 'Studio' (25,000 on 1-yr). Their true 1BR 'Deluxe' 64 sqm is 34,600 short-term / 33,000 on 1-yr — OVER 30k. (nantiruj.com)",
      "wifi": "In-room Wi-Fi listed; agent listings say complimentary Wi-Fi + cable TV; no speed stated, no reviews found on Wi-Fi.",
      "book": "https://nantiruj.com/",
      "photo": "https://nantiruj.com/wp-content/uploads/2025/10/1-1067x800.jpg",
      "flags": [
        "Only the 54 sqm unit is under 30k and it is labelled STUDIO with no kitchen — not a true 1BR",
        "Official site is a half-finished WordPress theme (placeholder text) — verify by phone/LINE",
        "Short-term lease offered, which suits a 1-month stay"
      ],
      "tag": {
        "text": "Under 30k · studio",
        "cls": "warn"
      }
    },
    {
      "name": "Waterford Diamond Tower (Waterford Serviced Apartments, Sukhumvit 30/1)",
      "address": "758/18 Sukhumvit Soi 30/1, Klongton, Klongtoey, Bangkok 10110",
      "maps": "https://www.google.com/maps/search/?api=1&query=Waterford+Diamond+Tower%2C+758%2F18+Sukhumvit+Soi+30%2F1%2C+Klongton%2C+Klongtoey%2C+Bangkok+10110",
      "bts": "BTS Phrom Phong ~10 min walk (~800 m)",
      "thb": "25,000",
      "usd": "748",
      "basis": "OFFICIAL 'FROM' price, 1 Bedroom (waterford.co.th Sukhumvit 30/1 page). Lease term for that price not stated; homepage says short-term rentals need a 6-month minimum.",
      "wifi": "No speed published. TripAdvisor: Wi-Fi limited to 2 devices (common complaint); one review says 'good internet speed'. For streaming plan to add own fiber (3BB/AIS/True) or 5G router.",
      "book": "https://www.waterford.co.th/thonglor-5-copy",
      "photo": "https://static.wixstatic.com/media/fd3ac2_f77def7434154eb9bf4fc47e42f6fc1e~mv2.jpg",
      "flags": [
        "UNDER 30k — but 'from' price",
        "Likely 6-month minimum; 1-month Oct stay NOT confirmed",
        "Older (early-2000s) building; reviews mention dated bathrooms",
        "Wi-Fi 2-device cap reported",
        "Official site uses odd page slugs (Wix) — enquiry form only, no instant booking"
      ],
      "tag": {
        "text": "Under 30k · 6-mo min?",
        "cls": "warn"
      }
    },
    {
      "name": "Waterford Park Thonglor 5 (Waterford Serviced Apartments)",
      "address": "Sukhumvit Soi 53 (Thonglor Soi 5 / Soi Padi Madi), Khlong Tan Nuea, Watthana, Bangkok 10110",
      "maps": "https://www.google.com/maps/search/?api=1&query=Waterford+Park+Thonglor+5%2C+Sukhumvit+Soi+53+%28Thonglor+Soi+5+%2F+Soi+Padi+Madi%29%2C+Khlong+Tan+Nuea%2C+Watthana%2C+Bangkok+10110",
      "bts": "BTS Thong Lo ~730 m-1.1 km (~10-13 min walk)",
      "thb": "18,000",
      "usd": "539",
      "basis": "OFFICIAL 'FROM' price, 1 Bedroom (waterford.co.th Thonglor 5 page). Almost certainly a 1-year rate; short-term needs 6-month minimum per homepage.",
      "wifi": "Not stated.",
      "book": "https://www.waterford.co.th/sukhumvit-50-copy-copy",
      "photo": "https://static.wixstatic.com/media/fd3ac2_c05adfa741c64e40a5baf9919a6a23bd~mv2.jpg",
      "flags": [
        "UNDER 30k but 'from' / long-lease price",
        "1-month stay unlikely",
        "Wi-Fi unknown",
        "Older condo tower operated as rentals, not hotel-style service"
      ],
      "tag": {
        "text": "Under 30k · long lease",
        "cls": "warn"
      }
    },
    {
      "name": "Sukhumvit 81 Apartments (On Nut)",
      "address": "Sukhumvit Soi 81, Bang Chak, Phra Khanong, Bangkok 10260",
      "maps": "https://www.google.com/maps/search/?api=1&query=Sukhumvit+81+Apartments%2C+Sukhumvit+Soi+81%2C+On+Nut%2C+Bangkok",
      "bts": "BTS On Nut 150–200 m",
      "thb": "14,000–16,000",
      "usd": "417–477",
      "basis": "1BR 40 sqm on a 1-month contract (1 month deposit + 1 month advance). Electricity ฿8/unit. RentHub listing, 28 Sep 2026.",
      "wifi": "Free Wi-Fi, speed not stated. Has a desk and chair. Plan on your own fiber line or a 5G router.",
      "book": "https://www.renthub.in.th/en/fully-furnished-apartments-in-sukhumvit-81-convenient-to-transportation-just-200-m-from-bts-on-nut",
      "phone": "+66 2 026 6941",
      "photo": "",
      "flags": [
        "From your earlier $300–700 search. Viewings are during office hours.",
        "Low-rise apartment building, not a tower."
      ],
      "tag": {
        "text": "In your $300–700 budget",
        "cls": "best"
      }
    }
  ],
  "neighborhoods": [
    {
      "name": "Thong Lor",
      "rent": "12-mo lease: 20,000-35,000 (premium 35k-45k+). Short-term (<6 mo): +15-30% => ~26,000-45,000",
      "vibe": "Densest international restaurant/cafe/nightlife strip, strong co-working; pricier mid-Sukhumvit."
    },
    {
      "name": "Ari",
      "rent": "12-mo lease: 22,000-38,000. Short-term: ~25,000-49,000",
      "vibe": "Leafy, local-hip cafe district on BTS Sukhumvit line north (Ari station); quieter, young Thai professionals; not in Sukhumvit Road area."
    },
    {
      "name": "Phra Khanong",
      "rent": "12-mo lease: 14,000-22,000 (up to ~25k). Short-term: ~16,000-29,000",
      "vibe": "Upper Sukhumvit, growing expat scene with local Thai character; one stop past Ekkamai, calmer."
    },
    {
      "name": "On Nut",
      "rent": "12-mo lease: 15,000-25,000. Short-term: ~17,000-32,000",
      "vibe": "Full expat hub now: newer condos with pools/co-working, Tesco Lotus/Century mall, best value on Sukhumvit line."
    }
  ],
  "tip": "<strong>Night-1 fallback with a 24h desk:</strong> <b>VP Tower Serviced Apartment</b> (BTS Victory Monument, 280 m) has advertised fiber Wi-Fi at ฿1,200/night or ฿15,500/month. Check in at midnight, speed-test the room, then switch to monthly if it holds. <a href=\"https://www.google.com/maps/search/?api=1&query=VP+Tower+Serviced+Apartment+Rang+Nam+Road+Bangkok\" target=\"_blank\" rel=\"noopener\">📍 Map</a> · <a href=\"tel:+66943466600\">📞 +66 94 346 6600</a> · <a href=\"https://www.renthub.in.th/en/apartments-for-rent-in-rang-nam-road-vp-tower-serviced-apartment-free-wifi\" target=\"_blank\" rel=\"noopener\">Listing</a>. The full budget shortlist is in <code>command-center/research/bangkok-housing-2026-10</code>.",
  "unverified": [
    "No property in this list publishes a Wi-Fi speed (Mbps). For live streaming, ask each for a speedtest screenshot or budget for your own fiber line/5G router (short-term fiber contracts are hard to get for 1 month).",
    "Fraser Suites 1BR 'THB 100,000-130,000/mo' appears in a search snippet attributed to Hipflat; Hipflat returned 403, not verified.",
    "Citadines Sukhumvit 11 short-term nightly 'from THB 1,803' (h-rez aggregator, 403 on fetch) — room type unknown.",
    "Lohas Residences Sukhumvit (75 Sukhumvit Soi 2; 1BR 60 sqm, 'high-speed WiFi' + work desk): thailand-property shows rentals THB 23,000-54,999/mo on 1-yr term, but unit types not itemised — could not confirm a 1BR under 30k. Official: https://www.lohasresidences.com/",
    "Aspen Suites Hotel Sukhumvit 2 (65/1 Sukhumvit Soi 2; has 1BR suites, LAN + Wi-Fi): no monthly price found; nightly avg ~$30 per HotelsCombined (x30 = ~30,000 THB but likely for a Deluxe room, not 1BR). Official: https://www.aspenbangkok.com/",
    "Waterford Diamond/Thonglor 5 'from' prices: lease length for those prices not stated; 6-month minimum for short-term per waterford.co.th homepage.",
    "Nomad Rental (Shama $3,439/mo) is discontinued; figure is archival only.",
    "Walk distances are from property/agent sites, not measured."
  ],
  "sources": [
    "https://bangkokrentals.net/listings/nantiruj-tower-sukhumvit-soi-8/",
    "https://nantiruj.com/",
    "https://propertyscout.co.th/en/bangkok/condo/waterford-park-sukhumvit-53-thong-lor-5/",
    "https://thethaiger.com/thai-life/property/bangkok-rent-neighbourhood-budget-2026",
    "https://www.apartmentforrentbangkok.com/properties/citadines-sukhumvit-11-1-bedroom/",
    "https://www.discoverasr.com/en/citadines/thailand/citadines-sukhumvit-11-bangkok",
    "https://www.frasershospitality.com/en/thailand/bangkok/fraser-suites-sukhumvit/",
    "https://www.oyster.com/bangkok/hotels/fraser-suites-sukhumvit/",
    "https://www.oyster.com/bangkok/hotels/shama-sukhumvit-bangkok/",
    "https://www.renthub.in.th/en/nantiruj-tower-sukhumvit-soi-8-near-skytrain-nana-station",
    "https://www.shama.com/sukhumvit/hotel-overview/at-a-glance",
    "https://www.shama.com/sukhumvit/long-stays",
    "https://www.superagent.co/en/blog/the-waterford-diamond-sukhumvit-classic-bangkok-condo-2026-review",
    "https://www.thaibk.com/lifestyle/living/neighborhoods/rents",
    "https://www.thailand-property.com/condo/12967/fraser-suites-sukhumvit",
    "https://www.theapartmentnetwork.com/apartments/fraser-suites-sukhumvit-bangkok/",
    "https://www.tripadvisor.com/Hotel_Review-g293916-d5505268-Reviews-or50-Waterford_Diamond_Tower-Bangkok.html",
    "https://www.tripadvisor.com/Hotel_Review-g293916-d627545-Reviews-Citadines_Sukhumvit_11_Bangkok-Bangkok.html",
    "https://www.tripadvisor.com/ShowUserReviews-g293916-d1913846-r730874256-Shama_Sukhumvit-Bangkok.html",
    "https://www.waterford.co.th/",
    "https://www.waterford.co.th/one-bedroom-copy-4",
    "https://www.waterford.co.th/sukhumvit-50-copy-copy",
    "https://www.waterford.co.th/thonglor-5-copy",
    "https://www.waterford.co.th/thonglor-5-copy-copy"
  ]
},

  vpn: {
    checked: '28 Sep 2026',
    reminder: 'buy the plan, install it on your phone <b>and</b> laptop, log in, and test your US bank and streaming apps. Set up 2FA with an authenticator app, not SMS to a US number, and save the backup codes. Provider sites can be slow abroad.',
    streamingNote: '<strong>Don\'t send your Twitch stream through the VPN.</strong> Bangkok is ~24 ms from Twitch\'s Singapore server but ~200 ms from the US West Coast, and OBS through a VPN drops frames. There\'s no Bangkok Twitch server. In OBS, set the server to <b>Asia Pacific: Singapore</b> (or Auto). Use split tunneling so OBS skips the VPN, or just turn the VPN off while you\'re live. Use the VPN for US banking, Netflix and everything else.',
    recommendation: '<b>Streaming from a Mac → ExpressVPN.</b> It\'s the only one of the two with split tunneling on macOS, so OBS goes straight to Singapore while everything else stays on a US IP. It also renews cheaper ($99.95/yr vs $139.08). <b>Streaming from Windows → NordVPN.</b> It\'s faster in tests, unblocks more Netflix libraries, and split-tunnels OBS on Windows. The Basic tier is enough on either one.',
    legality: 'VPNs are legal for personal use in Thailand. Anything illegal (gambling sites, piracy, content insulting the monarchy) stays illegal on a VPN.',
    providers: [
      { name: 'NordVPN', tag: { text: 'Fastest · Windows pick', cls: 'best' },
        prices: [
          { plan: 'Monthly', price: '$14.99/mo' },
          { plan: '1 year', price: '$5.49/mo', note: '$65.88 first year; renews $139.08/yr' },
          { plan: '2 years', price: '$3.49/mo', note: '$94.23 for 27 months; renews $139.08/yr' }
        ],
        servers: 'Bangkok IP is a "virtual location". Real hubs: Singapore (~24 ms), Hong Kong (~44 ms), Tokyo (~80 ms).',
        perf: '868–903 Mbps to US West Coast (CyberInsider, 26 Sep 2026). 20+ Netflix libraries.',
        split: 'Windows ✅ · Android ✅ · Mac ❌ · iPhone ❌',
        url: 'https://nordvpn.com/pricing/',
        phone: [
          'Buy a plan at nordvpn.com while in the US. Turn on 2FA with an authenticator app and save the backup codes.',
          'Install NordVPN from the App Store and log in.',
          'Tap Allow when iOS asks to add the VPN configuration.',
          'Settings → VPN Protocol → NordLynx.',
          'Connect to a US West Coast city for US apps, or Singapore for speed.',
          'Test your US bank and streaming apps before you fly. Turn the VPN off if you ever go live from the phone.'
        ],
        laptop: [
          'Download from nordvpn.com/download (Windows or Mac) and log in.',
          'Settings → Connection: NordLynx, and turn on the Kill Switch.',
          'Windows: Settings → Split tunneling → add obs64.exe. Mac has no split tunneling, so disconnect while you\'re live.',
          'Connect to Los Angeles, San Francisco or Seattle for US banking and streaming.',
          'In OBS, set the Twitch server to Asia Pacific: Singapore, then run a test stream and check dropped frames.',
          'Optional: a Dedicated US IP add-on if your bank keeps flagging logins.'
        ] },
      { name: 'ExpressVPN', tag: { text: 'Mac streamer pick', cls: 'best' },
        prices: [
          { plan: 'Monthly', price: '$14.99/mo' },
          { plan: '1 year', price: '$74.85 upfront', note: '≈ $4.99/mo, seems to be 15 months; renews $99.95/yr' },
          { plan: '2 years', price: '$2.99/mo', note: '$83.72 for 28 months; renews $99.95/yr' }
        ],
        servers: '"Thailand" server is physically in Singapore. Real hubs: Singapore, Hong Kong, Japan.',
        perf: '444–718 Mbps to US West Coast (same test). Very stable reconnects on hotel Wi-Fi. 11+ Netflix libraries.',
        split: 'Windows ✅ · Mac ✅ (macOS 11+) · Android ✅ · iPhone ⚠ IP-only',
        url: 'https://www.expressvpn.com/pricing',
        phone: [
          'Buy at expressvpn.com while in the US. Use an authenticator app for account security, not US SMS.',
          'Install ExpressVPN from the App Store and sign in (or use your activation code).',
          'Tap Allow to add the VPN configuration.',
          'Options → VPN Protocol → Lightway (or Automatic).',
          'Pick USA – Los Angeles for US apps and banking, or Singapore / Smart Location for speed.',
          'Test your bank and streaming apps before you fly.'
        ],
        laptop: [
          'Log in at expressvpn.com, download the Windows or Mac app, and sign in with your activation code.',
          'Settings: protocol Lightway, and turn on Network Lock (kill switch).',
          'Settings → Split tunneling → "Do not allow selected apps to use the VPN" → add OBS (works on Mac too).',
          'Connect to a US location (LA, San Francisco or Seattle) for banking and streaming.',
          'In OBS, set the Twitch server to Asia Pacific: Singapore, then run a test stream and check dropped frames.',
          'Save your activation code offline in case the site loads slowly abroad.'
        ] }
    ],
    unverified: [
      'ExpressVPN 1-year plan length (the price data suggests 12 + 3 months; the visible page only showed 2-year plans).',
      'Where NordVPN\'s "Thailand" servers physically sit.',
      'No speed test from Bangkok itself for either provider. The figures are from a US 1 Gbps test.',
      'US bank access through a VPN is based on review claims, not a bank-by-bank test.'
    ],
    sources: [
      'https://nordvpn.com/pricing/',
      'https://www.expressvpn.com/pricing',
      'https://nordvpn.com/features/split-tunneling/',
      'https://www.expressvpn.com/features/split-tunneling',
      'https://www.expressvpn.com/support/knowledge-hub/virtual-server-locations/',
      'https://cyberinsider.com/vpn/comparison/expressvpn-vs-nordvpn/',
      'https://ingest.twitch.tv/ingests',
      'https://wondernetwork.com/pings/Bangkok',
      'https://www.anglosiamlaw.com/faq/vpn-legal-thailand'
    ]
  },

  cannabis: {
    checked: '28 Sep 2026',
    alert: '<strong>Heads up:</strong> on 22 Sep 2026 Thailand\'s cabinet approved a draft <b>Cannabis Control Act</b> (medical-only, heavier penalties). It still has to pass parliament, so check the news before each renewal.',
    rules: [
      'Since <b>26 June 2025</b>, cannabis flower is a "controlled herb". Buying it legally requires a Thai prescription on form <b>ภ.ท.33</b> (written "PT-33" / "Phor Thor 33").',
      '<b>Foreign medical cards and prescriptions are not recognized.</b> Bring your passport as ID. You must be 20+.',
      'Issued by a Thai-licensed practitioner: a medical doctor, Thai traditional medicine doctor, dentist, pharmacist or Chinese medicine practitioner. Most shop consults are done by Thai traditional medicine doctors. Common reasons: pain, insomnia, anxiety, appetite. A consult doesn\'t guarantee a prescription.',
      'Consults typically cost <b>฿300–1,500</b> (≈ $9–45), usually issued the same visit. Examples: ThaiCannaMed ฿600 first / ฿400 renewal; some shops advertise free consults.',
      'Each prescription covers <b>up to 30 days</b>, is single-use and has no refills.',
      '<b>No online, delivery or vending-machine sales.</b> Buy in person at a licensed shop. Online-chat prescriptions are legally disputed, so choose an in-person consult.',
      '<b>No public consumption</b>: up to a ฿25,000 fine and/or 3 months in jail. Shops aren\'t allowed smoking areas.',
      'Carry the prescription together with the product. Since Jan 2026 a licensed practitioner must be on site whenever a shop is open.'
    ],
    renewal: 'Your ภ.ท.33 runs out after 30 days at most and can\'t be refilled. Book a new consult around <b>day 25</b> (renewals ~฿400). Set a phone reminder when you get your first one.',
    clinics: [
      { name: 'Wonderland Clinic (Nana)', confidence: 'confirmed', price: 'Consult ~฿600 first / ฿400 renewal (partner rate)',
        address: '93 Sukhumvit Soi 5, Khlong Toei Nuea, Watthana, Bangkok 10110',
        maps: 'https://www.google.com/maps/search/?api=1&query=Wonderland+Clinic+93+Sukhumvit+Soi+5%2C+Khlong+Toei+Nuea%2C+Watthana%2C+Bangkok+10110',
        hours: 'In person 12:00–02:00 daily', phone: '+66 63 228 3318', url: 'https://wonderlandclinics.com/contact/',
        note: 'Its own site names a licensed Thai traditional medicine doctor (licence 28274). Near BTS Nana.' },
      { name: 'Kush House (Phrom Phong)', confidence: 'partial', price: '',
        address: '1 Soi Sukhumvit 22, Khlong Tan, Khlong Toei, Bangkok 10110',
        maps: 'https://www.google.com/maps/search/?api=1&query=Kush+House+1+Soi+Sukhumvit+22%2C+Khlong+Tan%2C+Khlong+Toei%2C+Bangkok+10110',
        hours: '10:00–01:00 (some sources say midnight)', phone: '+66 63 082 8420', url: 'https://kushhousethailand.com/',
        note: 'Under the Holiday Inn, corner of Soi 22. Its site says a Thai traditional medicine doctor is in the shop.' },
      { name: 'Dr Green (Asok)', confidence: 'partial', price: 'Consult advertised free',
        address: '93 Sukhumvit 21 Rd (Soi Asok), Bangkok 10110',
        maps: 'https://www.google.com/maps/search/?api=1&query=Dr+Green+93+Sukhumvit+21+Rd+Bangkok',
        hours: '24/7 (per its site)', phone: '+66 82 171 9192', url: 'https://drgreen-thailand.com/',
        note: 'Ask to see the prescriber\'s licence and a paper ภ.ท.33.' },
      { name: 'HOLYWEED Sukhumvit 22', confidence: 'partial', price: '',
        address: 'Sukhumvit Soi 22, Khlong Toei, Bangkok 10110',
        maps: 'https://www.google.com/maps/search/?api=1&query=HOLYWEED+Sukhumvit+22+Bangkok',
        hours: 'Listed 24h; call to confirm a practitioner is on shift', phone: '+66 94 960 8232', url: 'https://www.holyweedbkk.com/locations.html',
        note: 'Its own site confirms in-clinic consults. No house number published.' },
      { name: 'Cloud Nine Nana', confidence: 'partial', price: 'Consult ~฿600 first / ฿400 renewal',
        address: '221 Sukhumvit Rd, Khlong Toei Nuea, Watthana, Bangkok 10110',
        maps: 'https://www.google.com/maps/search/?api=1&query=Cloud+Nine+Nana+221+Sukhumvit+Rd%2C+Khlong+Toei+Nuea%2C+Bangkok+10110',
        hours: '10:00–02:00 daily', phone: '+66 2 662 7011', url: 'https://ganjabonsai.com/en/cannabis-clinic/cloud-nine-nana/',
        note: 'Only listed in a directory. The consult may be an in-store video call, so ask if the practitioner is physically there.' }
    ],
    unverified: [
      'No clinic was called. Confirm hours and practitioner availability by phone or LINE before going.',
      'Whether prescriptions issued by telemedicine are valid is contested.',
      'What happens to a buyer holding cannabis without a prescription isn\'t clearly spelled out. Published penalties target sellers and public smoking.',
      'Nothing verifiable found in Thong Lor, Ekkamai or On Nut. A sixth listing (MedMen, Soi 11) was dropped: directory-only, no phone.'
    ],
    sources: [
      'https://med-cannabis.dtam.moph.go.th/law/2418/',
      'https://pr.moph.go.th/online/index/news/343199',
      'https://www.tilleke.com/insights/thailands-new-cannabis-controls-impact-doctors-dispensaries-and-growers/',
      'https://www.bangkokbiznews.com/health/public-health/1186723',
      'https://www.nationthailand.com/news/policy/40061973',
      'https://www.thaiexaminer.com/thai-news-foreigners/2026/09/23/another-cannabis-measure-agreed-by-cabinet-on-tuesday-to-rein-in-the-out-of-control-industry-in-thailand/',
      'https://thaicannamed.com/use-your-cannabis-prescription-in-bangkok/',
      'https://cannabisforthailand.com/blog/cannabis-laws-thailand-2026/',
      'https://wonderlandclinics.com/contact/',
      'https://kushhousethailand.com/',
      'https://drgreen-thailand.com/',
      'https://www.holyweedbkk.com/locations.html'
    ]
  },

  quick: {
    checked: '28 Sep 2026',
    emergency: [
      { label: 'Tourist Police (English, 24h)', number: '1155', primary: true },
      { label: 'Ambulance', number: '1669', primary: true },
      { label: 'Police', number: '191' },
      { label: 'Fire', number: '199' },
      { label: 'US State Dept 24/7', number: '+1-202-501-4444' }
    ],
    embassy: {
      name: 'U.S. Embassy Bangkok',
      address: '95 Wireless Road (Thanon Witthayu), Lumphini, Pathum Wan, Bangkok 10330',
      maps: 'https://www.google.com/maps/search/?api=1&query=U.S.+Embassy+Bangkok+95+Wireless+Road+Bangkok+10330',
      phone: '+66-2-205-4000',
      afterHours: '+66-2-205-4000',
      email: 'acsbkk@state.gov',
      hours: 'American Citizen Services: Mon–Fri 7:30–11:00 & 13:00–14:00, by appointment (emergencies any time). The same number works 24h; ask for the duty officer.',
      web: 'https://th.usembassy.gov/acs-bangkok/'
    },
    unverified: [
      'The embassy website blocked direct checking. Address, phone and email were confirmed from embassy page search results and a university emergency sheet.'
    ],
    sources: [
      'https://th.usembassy.gov/acs-bangkok/',
      'https://th.usembassy.gov/consular-section-bangkok/',
      'https://allemergencynum.com/thailand/',
      'https://open.er-api.com (live rate)'
    ]
  }
};
