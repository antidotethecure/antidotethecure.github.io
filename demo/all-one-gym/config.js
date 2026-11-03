/* ALL-ONE GYM facts: from all-onegym.com (home, /pricing, /shop, /page/vip-transformation) and @all_one_gym, checked 2026-11-02.
   Workout plans and prizes are SAMPLES for the pitch; the gym picks its real ones. */
window.GYM_CFG = {
  name: "ALL-ONE GYM",
  tagline: "Private Club · Lakewood, CA",
  slogan: "SET THE STANDARD",
  about: "A private club in Lakewood with 80+ machines and free weights, two cardio areas, an outdoor gym, boxing bags, a big stretching area and a sauna. We protect the training experience of our members.",
  address: "5436 Woodruff Ave., Lakewood, CA 90713",
  phone: "(562) 483-8129",
  email: "allonegymteam@gmail.com",
  instagram: "https://www.instagram.com/all_one_gym/",
  site: "https://all-onegym.com/",
  hours: [["Mon – Fri", "5 AM – 12 AM"], ["Sat – Sun", "5 AM – 10 PM"], ["ALL ACCESS members", "24 hours Mon – Fri"]],
  perks: ["80+ machines + free weights", "Two cardio areas", "Outdoor gym", "Boxing bags", "Large stretching area", "Sauna", "Towel service", "Private entrance + parking (ALL ACCESS)"],
  shop: [
    { icon: "🥤", name: "RAW Nutrition protein (CBUM)", note: "$55 · at the front desk" },
    { icon: "⚡", name: "RAW creatine", note: "$16 · at the front desk" },
    { icon: "🥛", name: "Isopure protein", note: "$80 · at the front desk" },
    { icon: "🔥", name: "Pre-workout (RAW, C4, Bucked Up)", note: "from $30" },
    { icon: "🧊", name: "Energy drinks", note: "Celsius, Ghost, Alani, C4 and more · $3–5" },
    { icon: "👕", name: "ALL-ONE merch", note: "Stringers, tanks, tees, crewnecks" },
    { icon: "🧖", name: "Sauna towel", note: "$5.50" }
  ],
  /* Memberships + fees: all-onegym.com/pricing. Shop: all-onegym.com/shop (prices as listed 2026-11-02). */
  plans: [
    { key: "allaccess", name: "ALL ACCESS", price: 349.99, tier: "Black Card", perks: ["24 hours Mon – Fri (after-hours access)", "Private parking + private entrance", "Ages 21+"] },
    { key: "standard", name: "Standard", price: 299.99, tier: "Member", perks: ["Mon – Fri 5 AM – 12 AM", "Sat – Sun 5 AM – 10 PM"] },
    { key: "restricted", name: "Restricted", price: 249.99, tier: "Day Member", perks: ["Mon – Fri 10 AM – 3 PM", "Sat – Sun 11 AM – 3 PM"] }
  ],
  extras: [
    { key: "daypass", name: "Guest day pass", price: 100, note: "Bring a friend for one day." },
    { key: "parking", name: "ALL ACCESS parking controller", price: 30, note: "Opens the private lot. ALL ACCESS only.", needs: "allaccess" }
  ],
  vip: { name: "VIP Transformation", note: "Limited memberships. 2 free personal-training sessions a month for your first 3 months, 24/5 VIP access, private parking + entrance, overnight security, premium equipment + sauna. Price on request." },
  fees: "Month to month. $50 one-time enrollment, $50 yearly cleaning fee (first in month 5). 30 days' notice to cancel.",
  catalog: [
    { cat: "Apparel", items: [
      { id: "str-b", name: "ALL-ONE black stringer", price: 35, icon: "🖤" }, { id: "str-w", name: "ALL-ONE white stringer", price: 35, icon: "🤍" },
      { id: "tank-b", name: "Muscle tank, black", price: 40, icon: "🖤" }, { id: "tank-w", name: "Muscle tank, white", price: 40, icon: "🤍" },
      { id: "tee-b", name: "Oversized tee, black", price: 35, icon: "👕" }, { id: "tee-w", name: "Oversized tee, white", price: 35, icon: "👕" },
      { id: "crew-b", name: "ALL-ONE GYM crewneck, black", price: 45, icon: "🧥" }, { id: "crew-w", name: "ALL-ONE GYM crewneck, white", price: 45, icon: "🧥" },
      { id: "towel", name: "Sauna towel", price: 5.5, icon: "🧖" }, { id: "gloves", name: "ALL-ONE lifting gloves", price: null, icon: "🧤", soon: 1 } ] },
    { cat: "Water + drinks", items: [
      { id: "fiji", name: "Fiji water", price: 5, icon: "💧" }, { id: "elev1", name: "Elevate water 1 L", price: 3, icon: "💧" }, { id: "elev5", name: "Elevate water 500 ml", price: 1.75, icon: "💧" },
      { id: "celsius", name: "Celsius", price: 3.5, icon: "⚡" }, { id: "ghost", name: "Ghost Energy", price: 3.5, icon: "👻" }, { id: "alani", name: "Alani Nu", price: 3.5, icon: "🥤" },
      { id: "bum", name: "Bum Energy", price: 3.5, icon: "🥤" }, { id: "rawdrink", name: "RAW protein drink", price: 5, icon: "🥛" }, { id: "lll", name: "L&L Complete Cookie", price: 3, icon: "🍪" } ] },
    { cat: "Protein + supplements", items: [
      { id: "rawcre", name: "RAW Nutrition creatine", price: 16, icon: "⚡" }, { id: "optcre", name: "Optimum creatine", price: 30, icon: "⚡" }, { id: "isocre", name: "Isopure Perfect Creatine", price: 38, icon: "⚡" },
      { id: "cbum-mc", name: "RAW CBUM protein, Milk & Cookies", price: 55, icon: "🥤" }, { id: "cbum-cc", name: "RAW CBUM protein, Cinnamon Crunch", price: 55, icon: "🥤" },
      { id: "iso-ch", name: "Isopure protein, chocolate", price: 80, icon: "🥤" }, { id: "ryse-bm", name: "Ryse Loaded Protein, Blueberry Muffin", price: 45, icon: "🥤" },
      { id: "cbum-pre", name: "CBUM pre-workout", price: 30, icon: "🔥" }, { id: "aminox", name: "BSN AminoX", price: 40, icon: "💊" }, { id: "rawmass", name: "RAW CBUM mass gainer", price: 100, icon: "💪" } ] }
  ],
  restSec: 75,
  /* Prizes for going 10 for 10 in a week. weight = how often the spin lands on it. */
  rewards: [
    { key: "creatine", icon: "⚡", name: "Free tub of RAW creatine", short: "free creatine", note: "Pick it up at the front desk.", weight: 5 },
    { key: "shake", icon: "🥤", name: "Free energy drink + towel", short: "a free drink", note: "Grab it from the cooler on your next visit.", weight: 6 },
    { key: "pct", icon: "🏷️", name: "15% off next month", short: "15% off", note: "Comes off your next membership bill.", weight: 3 },
    { key: "pt", icon: "🏋️", name: "Free personal-training session", short: "a free PT session", note: "Book it with one of our trainers.", weight: 2 },
    { key: "month", icon: "👑", name: "FREE month of membership", short: "a free month", note: "The big one. Front desk applies it.", weight: 1 }
  ],
  programs: [
    { key: "burn", icon: "🔥", name: "Burn", about: "Drop fat, keep muscle. Full-body lifting, intervals and a boxing finisher. 10 sessions a week, most under 40 minutes.",
      sessions: [
        { key: "b1", name: "Full Body A", focus: "Strength circuit", mins: 40, ex: [
          { n: "Goblet squat", i: "🏋️", sets: 3, reps: "12", rest: 60 }, { n: "Dumbbell bench press", i: "💪", sets: 3, reps: "10-12", rest: 60 },
          { n: "Seated cable row", i: "🚣", sets: 3, reps: "12", rest: 60 }, { n: "Walking lunge", i: "🦵", sets: 2, reps: "20", rest: 60 }, { n: "Plank", i: "🧱", sets: 2, sec: 45, bw: 1, rest: 30 }] },
        { key: "b2", name: "Incline Walk", focus: "Fat-burn cardio · Zone 2", mins: 30, ex: [
          { n: "Treadmill incline walk", i: "🚶", sets: 1, sec: 1500, bw: 1, tip: "12% incline, 3.0 mph" }, { n: "Cooldown walk", i: "🌬️", sets: 1, sec: 300, bw: 1 }] },
        { key: "b3", name: "Boxing Bag Rounds", focus: "Conditioning", mins: 25, ex: [
          { n: "Jab-cross rounds", i: "🥊", sets: 6, sec: 120, bw: 1, rest: 45, tip: "Stay on your toes" }, { n: "Burpees", i: "⚡", sets: 3, reps: "10", bw: 1, rest: 45 }] },
        { key: "b4", name: "Full Body B", focus: "Strength circuit", mins: 40, ex: [
          { n: "Romanian deadlift", i: "🏋️", sets: 3, reps: "10", rest: 75 }, { n: "Lat pulldown", i: "🔽", sets: 3, reps: "12", rest: 60 },
          { n: "Leg press", i: "🦵", sets: 3, reps: "15", rest: 60 }, { n: "Shoulder press", i: "💪", sets: 3, reps: "10", rest: 60 }, { n: "Cable crunch", i: "🧱", sets: 2, reps: "15", rest: 45 }] },
        { key: "b5", name: "HIIT Intervals", focus: "Cardio · Zone 4", mins: 20, ex: [
          { n: "Bike sprint", i: "🚴", sets: 8, sec: 30, bw: 1, rest: 60, tip: "All out" }, { n: "Easy spin", i: "🌬️", sets: 1, sec: 240, bw: 1 }] },
        { key: "b6", name: "Core + Stretch", focus: "Recovery", mins: 20, ex: [
          { n: "Dead bug", i: "🪲", sets: 3, reps: "12", bw: 1, rest: 30 }, { n: "Side plank", i: "🧱", sets: 2, sec: 30, bw: 1, rest: 20 }, { n: "Hip + hamstring stretch", i: "🧘", sets: 1, sec: 300, bw: 1 }] },
        { key: "b7", name: "Outdoor Gym Finisher", focus: "Conditioning", mins: 25, ex: [
          { n: "Sled push", i: "🛷", sets: 5, reps: "20 m", rest: 60 }, { n: "Farmer carry", i: "🧳", sets: 4, reps: "40 m", rest: 60 }, { n: "Kettlebell swing", i: "🔔", sets: 3, reps: "15", rest: 45 }] },
        { key: "b8", name: "Full Body C", focus: "Strength circuit", mins: 40, ex: [
          { n: "Trap-bar deadlift", i: "🏋️", sets: 3, reps: "8", rest: 90 }, { n: "Incline dumbbell press", i: "💪", sets: 3, reps: "10", rest: 60 },
          { n: "Single-arm row", i: "🚣", sets: 3, reps: "12", rest: 60 }, { n: "Step-ups", i: "🪜", sets: 2, reps: "12 each", rest: 60 }] },
        { key: "b9", name: "Stairmaster", focus: "Cardio · Zone 3", mins: 25, ex: [
          { n: "Stairmaster climb", i: "🪜", sets: 1, sec: 1200, bw: 1, tip: "Level 7, no leaning" }, { n: "Cooldown stretch", i: "🧘", sets: 1, sec: 240, bw: 1 }] },
        { key: "b10", name: "Sweat + Sauna", focus: "Long cardio + recovery", mins: 45, ex: [
          { n: "Rower steady pace", i: "🚣", sets: 1, sec: 1200, bw: 1 }, { n: "Ab wheel", i: "🛞", sets: 3, reps: "10", bw: 1, rest: 45 }, { n: "Sauna", i: "🧖", sets: 1, sec: 900, bw: 1, tip: "Hydrate before and after" }] }
      ] },
    { key: "build", icon: "💪", name: "Build", about: "Add size. Push / pull / legs twice, plus arms, shoulders and cardio. 10 sessions a week.",
      sessions: [
        { key: "m1", name: "Push A", focus: "Chest · shoulders · triceps", mins: 55, ex: [
          { n: "Barbell bench press", i: "💪", sets: 4, reps: "6-8", rest: 120 }, { n: "Incline dumbbell press", i: "💪", sets: 3, reps: "8-10", rest: 90 }, { n: "Cable fly", i: "🦋", sets: 3, reps: "12", rest: 60 }, { n: "Lateral raise", i: "🙆", sets: 3, reps: "15", rest: 45 }, { n: "Rope pushdown", i: "🔽", sets: 3, reps: "12", rest: 45 }] },
        { key: "m2", name: "Pull A", focus: "Back · biceps", mins: 55, ex: [
          { n: "Deadlift", i: "🏋️", sets: 4, reps: "5", rest: 150 }, { n: "Pull-up", i: "🧗", sets: 3, reps: "AMRAP", bw: 1, rest: 90 }, { n: "Barbell row", i: "🚣", sets: 3, reps: "8", rest: 90 }, { n: "Face pull", i: "🎯", sets: 3, reps: "15", rest: 45 }, { n: "Barbell curl", i: "💪", sets: 3, reps: "10", rest: 45 }] },
        { key: "m3", name: "Legs A", focus: "Quads · glutes", mins: 60, ex: [
          { n: "Back squat", i: "🏋️", sets: 4, reps: "6-8", rest: 150 }, { n: "Leg press", i: "🦵", sets: 3, reps: "12", rest: 90 }, { n: "Leg extension", i: "🦵", sets: 3, reps: "15", rest: 60 }, { n: "Standing calf raise", i: "🦶", sets: 4, reps: "12", rest: 45 }] },
        { key: "m4", name: "Easy Cardio", focus: "Zone 2 · 25 min", mins: 25, ex: [{ n: "Incline walk or bike", i: "🚶", sets: 1, sec: 1500, bw: 1 }] },
        { key: "m5", name: "Push B", focus: "Shoulders · chest", mins: 50, ex: [
          { n: "Overhead press", i: "💪", sets: 4, reps: "6-8", rest: 120 }, { n: "Machine chest press", i: "💪", sets: 3, reps: "10", rest: 75 }, { n: "Dips", i: "⬇️", sets: 3, reps: "10", bw: 1, rest: 75 }, { n: "Cable lateral raise", i: "🙆", sets: 3, reps: "15", rest: 45 }] },
        { key: "m6", name: "Pull B", focus: "Back width", mins: 50, ex: [
          { n: "Lat pulldown", i: "🔽", sets: 4, reps: "10", rest: 75 }, { n: "Chest-supported row", i: "🚣", sets: 3, reps: "10", rest: 75 }, { n: "Straight-arm pulldown", i: "🔽", sets: 3, reps: "12", rest: 45 }, { n: "Hammer curl", i: "🔨", sets: 3, reps: "12", rest: 45 }] },
        { key: "m7", name: "Legs B", focus: "Hamstrings · glutes", mins: 55, ex: [
          { n: "Romanian deadlift", i: "🏋️", sets: 4, reps: "8", rest: 120 }, { n: "Hip thrust", i: "🍑", sets: 3, reps: "10", rest: 90 }, { n: "Lying leg curl", i: "🦵", sets: 3, reps: "12", rest: 60 }, { n: "Bulgarian split squat", i: "🦵", sets: 3, reps: "10 each", rest: 75 }] },
        { key: "m8", name: "Arms + Abs", focus: "Pump day", mins: 40, ex: [
          { n: "EZ-bar curl", i: "💪", sets: 3, reps: "10", rest: 45 }, { n: "Skull crusher", i: "💀", sets: 3, reps: "10", rest: 45 }, { n: "Cable curl", i: "💪", sets: 3, reps: "12", rest: 45 }, { n: "Hanging knee raise", i: "🧱", sets: 3, reps: "15", bw: 1, rest: 45 }] },
        { key: "m9", name: "Boxing Bag", focus: "Conditioning", mins: 20, ex: [{ n: "Bag rounds", i: "🥊", sets: 5, sec: 120, bw: 1, rest: 45 }] },
        { key: "m10", name: "Stretch + Sauna", focus: "Recovery", mins: 30, ex: [{ n: "Full-body stretch", i: "🧘", sets: 1, sec: 600, bw: 1 }, { n: "Sauna", i: "🧖", sets: 1, sec: 900, bw: 1, tip: "Hydrate" }] }
      ] },
    { key: "start", icon: "🌱", name: "Starter", about: "New to lifting or coming back. Machines first, simple form, short sessions. 10 a week, a few are just walks.",
      sessions: [
        { key: "s1", name: "Machine Circuit A", focus: "Full body", mins: 30, ex: [{ n: "Leg press", i: "🦵", sets: 2, reps: "12", rest: 60 }, { n: "Chest press machine", i: "💪", sets: 2, reps: "12", rest: 60 }, { n: "Seated row machine", i: "🚣", sets: 2, reps: "12", rest: 60 }] },
        { key: "s2", name: "Walk 20", focus: "Easy cardio", mins: 20, ex: [{ n: "Treadmill walk", i: "🚶", sets: 1, sec: 1200, bw: 1 }] },
        { key: "s3", name: "Stretch 15", focus: "Mobility", mins: 15, ex: [{ n: "Stretching area routine", i: "🧘", sets: 1, sec: 900, bw: 1 }] },
        { key: "s4", name: "Machine Circuit B", focus: "Full body", mins: 30, ex: [{ n: "Leg curl", i: "🦵", sets: 2, reps: "12", rest: 60 }, { n: "Shoulder press machine", i: "💪", sets: 2, reps: "12", rest: 60 }, { n: "Lat pulldown", i: "🔽", sets: 2, reps: "12", rest: 60 }] },
        { key: "s5", name: "Bike 20", focus: "Easy cardio", mins: 20, ex: [{ n: "Bike, easy pace", i: "🚴", sets: 1, sec: 1200, bw: 1 }] },
        { key: "s6", name: "Core Basics", focus: "Abs", mins: 15, ex: [{ n: "Plank", i: "🧱", sets: 3, sec: 20, bw: 1, rest: 30 }, { n: "Bird dog", i: "🐦", sets: 2, reps: "10 each", bw: 1, rest: 30 }] },
        { key: "s7", name: "Machine Circuit C", focus: "Full body", mins: 30, ex: [{ n: "Leg extension", i: "🦵", sets: 2, reps: "12", rest: 60 }, { n: "Pec deck", i: "🦋", sets: 2, reps: "12", rest: 60 }, { n: "Assisted pull-up", i: "🧗", sets: 2, reps: "8", rest: 60 }] },
        { key: "s8", name: "Walk 25", focus: "Easy cardio", mins: 25, ex: [{ n: "Incline walk", i: "🚶", sets: 1, sec: 1500, bw: 1, tip: "5% incline" }] },
        { key: "s9", name: "Bag Intro", focus: "Fun conditioning", mins: 15, ex: [{ n: "Light bag rounds", i: "🥊", sets: 4, sec: 60, bw: 1, rest: 60 }] },
        { key: "s10", name: "Stretch + Sauna", focus: "Recovery", mins: 25, ex: [{ n: "Stretch", i: "🧘", sets: 1, sec: 600, bw: 1 }, { n: "Sauna", i: "🧖", sets: 1, sec: 600, bw: 1 }] }
      ] }
  ],
  qa: [
    ["What are your hours?", "Monday to Friday 5 AM to midnight, Saturday and Sunday 5 AM to 10 PM. ALL ACCESS members get 24 hours Monday to Friday (24/5, not 24/7)."],
    ["How do I check in?", "Tap the QR button at the bottom of the app and show your pass at the front desk."],
    ["How does 10 for 10 work?", "Your plan has 10 workouts each week (Monday to Sunday). Finish all 10 in the app and you unlock one spin for a prize, like free creatine, 15% off next month, a free PT session or a free month."],
    ["Does it work with my Apple Watch?", "The App Store version reads heart rate and workouts from Apple Watch through Apple Health. In this web preview you can connect a Bluetooth heart-rate strap (Android / Chrome) or watch a demo heart rate."],
    ["What memberships do you have?", "ALL ACCESS, Standard and Restricted, all month to month, plus day passes. Ask the front desk or see all-onegym.com/pricing."],
    ["Do you have personal trainers?", "Yes. You can book a free training session with one of our trainers through the front desk."],
    ["Is there a sauna?", "Yes, plus towel service, a big stretching area, boxing bags and an outdoor gym."],
    ["Do you sell protein or creatine?", "Yes, at the front desk: RAW, Isopure, Optimum Nutrition and more, plus energy drinks and ALL-ONE merch."],
    ["Where is my data stored?", "In this preview, only on this phone. Nothing is sent anywhere. The live app stores it securely with your gym account."]
  ]
};
