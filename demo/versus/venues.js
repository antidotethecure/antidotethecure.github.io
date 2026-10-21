/* SousShift AI — Venue Versus: per-venue look for the shared pages in this folder (bar TV, Menu Dash race, owner admin, print).
   The guest app itself configures Versus with window.VERSUS on its own page (see ../versus.js). Add a venue: copy "melody",
   point the paths at that client's folder, and add the same slug to the server's venues.ts. */
window.VERSUS_VENUES = {
  melody: {
    name: "Melody Bar & Grill",
    short: "Melody",
    api: "https://drizzle-bowl-scores.higgsfield.app",
    app: "../melody-lax/",
    logo: "../melody-lax/img/logo.png",
    poster: "../melody-lax/img/review/cover.webp",      // Antidote's review of this spot: always on screen (house rule)
    review: "https://www.youtube.com/watch?v=AhJGIPsywm0",
    halftime: { clips: "../melody-lax/img/review/clips/", src: "../melody-lax/img/review/halftime.mp4", poster: "../melody-lax/img/review/halftime.jpg" },
    theme: { bg: "#0b1220", bg2: "#121b30", panel: "#141e34", edge: "#27324d", accent: "#d4af37", accent2: "#f0d375", wine: "#a33645", ink: "#f6f1e4", dim: "#9aa3b5", go: "#3fbf8f",
      display: "'Playfair Display',Georgia,serif", body: "Barlow,system-ui,-apple-system,sans-serif" },
    fonts: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Barlow:wght@500;700;800;900&display=swap",
    // Menu Dash: the venue's own menu photos become the power-ups (names are the real menu items)
    dash: {
      boost: { name: "Chicken Strips & Fries", img: "../melody-lax/img/game/p_strips.webp" },
      shield: { name: "Mac & Cheese", img: "../melody-lax/img/game/p_mac.webp" },
      magnet: { name: "Lemon Pepper Wings", img: "../melody-lax/img/game/p_wings.webp" },
      rocket: { name: "Melody Burger & Fries", img: "../melody-lax/img/game/p_burger.webp" },
      coins: ["../melody-lax/img/game/p_tacos.webp", "../melody-lax/img/game/p_nachos.webp", "../melody-lax/img/game/p_ribs.webp", "../melody-lax/img/game/p_lobmac.webp"]
    }
  }
};
