/* SousShift AI — business types shared by the intake (/demo/start/) and the sample app (/demo/try/).
   Add a type here and it shows up in both. Keep the keys in sync with TYPES in the site's /api/intake. */
window.SSAI_API = "https://drizzle-bowl-scores.higgsfield.app/api/intake";
window.SSAI_TYPES = {
  restaurant: { welcome: "10% off your next order", label: "Restaurant", em: "🍽️", list: "Menu", item: "Dish", ex: ["Hibachi Chicken", "$12.95", "grilled chicken, fried rice, veggies"],
    photos: "Your logo or storefront first, then your best-looking plates.", game: ["🍔", "🍟", "🌮", "🍜", "🥤"], tagline: "Order, play, earn rewards" },
  foodtruck: { welcome: "A free drink with your next order", label: "Food truck", em: "🚚", list: "Menu", item: "Item", ex: ["Birria Tacos (3)", "$12", "with consommé"],
    photos: "Your truck first, then your best-looking food.", game: ["🌮", "🌯", "🌶️", "🥤", "🧀"], tagline: "Find the truck, play, earn rewards" },
  cafe: { welcome: "A free pastry with your next drink", label: "Café / bakery", em: "☕", list: "Menu", item: "Item", ex: ["Iced Horchata Latte", "$6.50", "oat milk available"],
    photos: "Your shop first, then drinks and pastries.", game: ["☕", "🥐", "🧁", "🍩", "🧋"], tagline: "Sip, play, earn rewards" },
  barbershop: { welcome: "$5 off your next cut", label: "Barbershop", em: "💈", list: "Services", item: "Service", ex: ["Skin Fade", "$35", "includes line-up"],
    photos: "Your shop or logo first, then your best cuts.", game: ["✂️", "💈", "🪒", "🧴", "👑"], tagline: "Book, play, earn free cuts" },
  salon: { welcome: "$10 off your next visit", label: "Salon / nails / lashes", em: "💅", list: "Services", item: "Service", ex: ["Gel Full Set", "$55", "any shape, any length"],
    photos: "Your salon or logo first, then your best work.", game: ["💅", "💇", "✨", "💄", "🌸"], tagline: "Book, play, earn rewards" },
  gym: { welcome: "A free day pass for a friend", label: "Gym / fitness", em: "🏋️", list: "Classes & memberships", item: "Plan", ex: ["Unlimited Monthly", "$49", "all classes, open gym"],
    photos: "Your gym or logo first, then classes and equipment.", game: ["🏋️", "💪", "🥤", "🔥", "🏆"], tagline: "Check in, play, earn rewards" },
  retail: { welcome: "10% off your next purchase", label: "Shop / retail", em: "🛍️", list: "Products", item: "Product", ex: ["Classic Logo Tee", "$29", "S–3XL"],
    photos: "Your store or logo first, then your best sellers.", game: ["🛍️", "👕", "🧢", "👟", "🎁"], tagline: "Shop, play, earn rewards" },
  other: { welcome: "10% off your next visit", label: "Something else", em: "⭐", list: "What you offer", item: "Item", ex: ["Your best seller", "$25", "short description"],
    photos: "Your logo or place first, then what you're proudest of.", game: ["⭐", "🎁", "💎", "🔥", "🏆"], tagline: "Visit, play, earn rewards" }
};
