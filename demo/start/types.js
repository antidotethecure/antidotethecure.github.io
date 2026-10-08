/* Second Shift AI — business types shared by the intake (/demo/start/) and the sample app (/demo/try/).
   Add a type here and it shows up in both. Keep the keys in sync with TYPES in the site's /api/intake. */
window.SSAI_API = "https://drizzle-bowl-scores.higgsfield.app/api/intake";
window.SSAI_TYPES = {
  restaurant: { label: "Restaurant", em: "🍽️", list: "Menu", item: "Dish", ex: ["Hibachi Chicken", "$12.95", "grilled chicken, fried rice, veggies"],
    photos: "Your logo or storefront first, then your best-looking plates.", game: ["🍔", "🍟", "🌮", "🍜", "🥤"], tagline: "Order, play, earn rewards" },
  foodtruck: { label: "Food truck", em: "🚚", list: "Menu", item: "Item", ex: ["Birria Tacos (3)", "$12", "with consommé"],
    photos: "Your truck first, then your best-looking food.", game: ["🌮", "🌯", "🌶️", "🥤", "🧀"], tagline: "Find the truck, play, earn rewards" },
  cafe: { label: "Café / bakery", em: "☕", list: "Menu", item: "Item", ex: ["Iced Horchata Latte", "$6.50", "oat milk available"],
    photos: "Your shop first, then drinks and pastries.", game: ["☕", "🥐", "🧁", "🍩", "🧋"], tagline: "Sip, play, earn rewards" },
  barbershop: { label: "Barbershop", em: "💈", list: "Services", item: "Service", ex: ["Skin Fade", "$35", "includes line-up"],
    photos: "Your shop or logo first, then your best cuts.", game: ["✂️", "💈", "🪒", "🧴", "👑"], tagline: "Book, play, earn free cuts" },
  salon: { label: "Salon / nails / lashes", em: "💅", list: "Services", item: "Service", ex: ["Gel Full Set", "$55", "any shape, any length"],
    photos: "Your salon or logo first, then your best work.", game: ["💅", "💇", "✨", "💄", "🌸"], tagline: "Book, play, earn rewards" },
  gym: { label: "Gym / fitness", em: "🏋️", list: "Classes & memberships", item: "Plan", ex: ["Unlimited Monthly", "$49", "all classes, open gym"],
    photos: "Your gym or logo first, then classes and equipment.", game: ["🏋️", "💪", "🥤", "🔥", "🏆"], tagline: "Check in, play, earn rewards" },
  retail: { label: "Shop / retail", em: "🛍️", list: "Products", item: "Product", ex: ["Classic Logo Tee", "$29", "S–3XL"],
    photos: "Your store or logo first, then your best sellers.", game: ["🛍️", "👕", "🧢", "👟", "🎁"], tagline: "Shop, play, earn rewards" },
  other: { label: "Something else", em: "⭐", list: "What you offer", item: "Item", ex: ["Your best seller", "$25", "short description"],
    photos: "Your logo or place first, then what you're proudest of.", game: ["⭐", "🎁", "💎", "🔥", "🏆"], tagline: "Visit, play, earn rewards" }
};
