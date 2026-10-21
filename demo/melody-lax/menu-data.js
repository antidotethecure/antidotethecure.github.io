/* Melody Bar & Grill menu data: ONE place for the menu items + prices, drinks, seasonal specials and the happy-hour
   card. Used by the guest app (demo/melody-lax/index.html) and by Christian HQ › 💲 Prices & specials (the manager/owner
   editor), so both always list the same items.
   - Prices here are the menu's own prices (food from melodylax.com; drinks are sample prices until Melody signs off).
   - Owners / Melody Management change a price, special or the happy-hour lines in Christian HQ. That is saved on the
     backend (Code.gs, Script Property MENU) and laid over these values by demo/christian-live.js (SSAI_CHRISTIAN.applyMenu).
     Edit THIS file only to add / remove items or to fold saved changes back in.
   - Food: [name, price, description, image key, effect]  effect: steam | herbs | none
   - Drinks: [name, price, description, image key, pour color]
   - Specials: SAMPLES built from the real menu (no prices invented). See demo/specials.js for the fields. */
window.SSAI_MENU = window.SSAI_MENU || {};
window.SSAI_MENU["melody-bar-grill"] = {
food: [
 {id:"starters",name:"Starters",items:[
  ["Lemon Pepper Wings",16.00,"Crispy wings dusted in lemon pepper. Ranch or buffalo on the side.","wings","herbs"],
  ["Avocado Toast",13.00,"Vine ripened avocados on sourdough with micro greens, tomato, olive oil, sea salt, lemon and a pinch of cayenne pepper.","avocado-toast","none"],
  ["BBQ Rib Grilled Cheese Bites",15.00,"Melted jack and cheddar cheese with bbq baby back rib meat on grilled sourdough.","rib-grilled-cheese","steam"],
  ["Buttermilk Chicken Strips & Fries",16.00,"Chicken breast dipped in buttermilk breading and fried. Served with ranch and bbq dipping sauce.","chicken-strips","steam"],
  ["Chicken Pot Stickers",15.00,"Made with free range chicken, cabbage and garlic. Served with honey soy dipping sauce.","potstickers","steam"],
  ["Fried Green Beans",13.00,"Hand battered green beans served with ranch and spicy aioli.","green-beans","steam"],
  ["Fried Shrimp",18.25,"Southern spice blend, breaded and fried.","fried-shrimp","herbs"],
  ["Jalapeno Calamari",16.00,"Lemon pepper breaded squid and jalapeno pieces lightly fried. Cocktail sauce & spicy aioli.","calamari","herbs"],
  ["Lettuce Wraps",16.00,"Seasoned umami chicken, water chestnuts, onions, peanuts and cilantro.","lettuce-wraps","none"],
  ["Baby Back Ribs & Fries",20.25,"Slow cooked baby back ribs slathered in our house-made bourbon BBQ sauce.","ribs","steam"]]},
 {id:"mac",name:"Mac & Cheese",note:"Fusilli in a creamy cheese blend, baked to order.",items:[
  ["Lobster Mac & Cheese",21.50,"Fusilli in a creamy cheese blend with lobster and a baked parmesan crust.","lobster-mac","herbs"],
  ["Melody Burger Mac & Cheese",19.25,"Ground beef, caramelized onions, spinach & gorgonzola.","burger-mac","herbs"],
  ["Bacon, Cheddar & Jalapeno Mac & Cheese",17.25,"Caramelized bacon, cheddar cheese & jalapeno.","bacon-mac","steam"],
  ["Chicken Parmesan Mac & Cheese",18.25,"Chicken parmesan in a vodka sauce.","chicken-parm-mac","herbs"],
  ["Parmesan & Mushroom Mac & Cheese",17.25,"Baked parmesan and mushroom crust.","mushroom-mac","herbs"],
  ["House Mac",15.00,"Fusilli pasta in a creamy cheese blend.","house-mac","steam"]]},
 {id:"burgers",name:"Burgers",note:"Mondays: half off burgers 11–3.",items:[
  ["Melody Burger",19.25,"Grilled Angus beef on a pretzel bun with caramelized onions, Gorgonzola blue cheese, apple-smoked bacon, spinach & BBQ sauce. Served with fries.","melody-burger","steam"]]},
 {id:"fries",name:"Fries",items:[
  ["Gilroy Garlic Fries",6.75,"Shoestring fries tossed with sizzling garlic & Italian herbs.","garlic-fries","herbs"],
  ["Melody Fries",5.75,"Shoestring fries, sea salt & pepper. Add cheese +$2.00","melody-fries","steam"],
  ["Onion Strings",9.75,"Fried onion strings served with jalapeño ketchup.","onion-strings","steam"],
  ["Phat Fries",7.75,"Add cheese +$2.00","phat-fries","steam"],
  ["Philly Cheese Steak Fries",17.25,"Shoestring fries topped with thinly sliced Angus steak, grilled onions, peppers, mushrooms & Swiss cheese.","philly-fries","steam"],
  ["Sweet Potato Fries",7.75,"Served with spicy aioli dipping sauce.","sweet-potato-fries","steam"]]},
 {id:"soups",name:"Soups",items:[
  ["French Onion Soup (Bowl)",15.00,"Served with grilled cheese dunker.","french-onion","steam"],
  ["French Onion Soup (Cup)",11.00,"Served with 1/2 grilled cheese dunker.","french-onion","steam"],
  ["Tomato Bisque Soup (Bowl)",15.00,"Served with grilled cheese dunker.","tomato-bisque","steam"],
  ["Tomato Bisque Soup (Cup)",11.00,"Served with 1/2 grilled cheese dunker.","tomato-bisque","steam"],
  ["Black Bean Soup (Bowl)",14.00,"Olive oil garlic toast.","black-bean-soup","steam"],
  ["Black Bean Soup (Cup)",9.75,"Olive oil garlic toast.","black-bean-soup","steam"]]},
 {id:"tacos",name:"Tacos & Burritos",note:"Taco Tuesday: every taco on the menu is $4.",items:[
  ["Shrimp Tacos",16.00,"2 tacos, cajun spiced shrimp sautéed with butter, garlic & onions, cabbage, cilantro, sweet honey jalapeños & spicy aioli.","shrimp-tacos","herbs"],
  ["Salmon Tacos",16.00,"2 blackened salmon with onions, cilantro, lettuce, & creme de lemon.","salmon-tacos","herbs"],
  ["Carnitas Tacos",14.00,"2 slow roasted pork topped with onions, cilantro & lettuce.","carnitas-tacos","herbs"],
  ["Chicken Tacos",13.00,"2 grilled chicken tacos, onions, cilantro, & lettuce.","chicken-tacos","herbs"],
  ["Avocado Tacos",13.00,"2 panko crusted avocado, chimichurri, onion, cilantro, tomato & cabbage.","avocado-tacos","herbs"],
  ["Beyond Tacos",14.00,"2 tacos, beyond meat, black bean, pico de gallo, & lettuce.","beyond-tacos","herbs"],
  ["Nachos",15.00,"Melted cheddar and jack, jalapenos, pico de gallo, & sour cream. + Chicken $4 · Pulled Pork $5 · Steak $6","nachos","steam"],
  ["Cheese Quesadilla",15.00,"Melted mozzarella on a flour tortilla, salsa & sour cream.","quesadilla","steam"],
  ["Carnitas Burrito",18.25,"Pulled pork, black beans, pico de gallo & shredded cheese.","carnitas-burrito","steam"],
  ["Steak Burrito",18.25,"Chopped steak, black beans, pico de gallo & shredded cheese.","steak-burrito","steam"],
  ["Chicken Burrito",17.25,"Chopped chicken, black beans, pico de gallo & shredded cheese.","chicken-burrito","steam"],
  ["Bean & Cheese Burrito",14.00,"Black beans and shredded cheese.","bean-burrito","steam"]]}
],
drinks: [
 ["Mango Margarita",12,"Fresh mango, tequila, lime, chili-lime rim. A Melody favorite.","mango-marg","#f6a21a"],
 ["House Margarita",12,"Tequila, fresh lime, salted rim. $6 on Tuesdays.","margarita","#d9e88a"],
 ["Paloma",12,"Tequila, grapefruit, lime, salt rim.","paloma","#f7a0a0"],
 ["Old Fashioned",14,"Bourbon, bitters, orange peel, big rock.","old-fashioned","#b5651d"],
 ["Moscow Mule",13,"Vodka, ginger beer, lime, copper mug.","moscow-mule","#e8d9a0"],
 ["Espresso Martini",15,"Vodka, espresso, coffee liqueur.","espresso-martini","#3b2414"],
 ["Long Island",14,"Five spirits, cola, lemon.","long-island","#a0612a"],
 ["Michelada",10,"Cold beer, lime, spice, tajin rim.","michelada","#c2401f"],
 ["Draft Beer",8,"Ask what's on tap tonight.","draft-beer","#e9b83a"],
 ["Mimosa",10,"Bubbles and fresh orange juice.","mimosa","#ffb347"],
 ["Round of Shots",10,"Pick your tequila or whiskey. Per shot.","shots","#e0c27a"],
 ["Bucket of Beers (5)",30,"Five ice-cold bottles for the table.","beer-bucket","#e9b83a"]
],
specials: [
 {id:"halloween",holiday:"halloween",title:"Spooky Mac Night",desc:"Bacon, Cheddar & Jalapeño Mac & Cheese with a side of Phat Fries, all Halloween week.",item:"Bacon, Cheddar & Jalapeno Mac & Cheese",start:"10-20",end:"10-31",code:"BOO"},
 {id:"thanksgiving",holiday:"thanksgiving",title:"Harvest Soup & Bites",desc:"A bowl of Tomato Bisque with BBQ Rib Grilled Cheese Bites for dipping.",item:"BBQ Rib Grilled Cheese Bites",start:"11-20",end:"11-28"},
 {id:"christmas",holiday:"christmas",title:"Holiday Lobster Mac",desc:"Lobster Mac & Cheese with Gilroy Garlic Fries, the treat-yourself holiday plate.",item:"Lobster Mac & Cheese",start:"12-15",end:"12-25"},
 {id:"newyear",holiday:"newyear",title:"Countdown Wings",desc:"Lemon Pepper Wings for the table + 20% off Espresso Martinis (21+, with ID).",item:"Lemon Pepper Wings",start:"12-29",end:"01-01"},
 {id:"valentines",holiday:"valentines",title:"Date Night Tacos for Two",desc:"Shrimp Tacos and Salmon Tacos to share, plus Sweet Potato Fries.",item:"Shrimp Tacos",start:"02-07",end:"02-14"},
 {id:"stpatricks",holiday:"stpatricks",title:"Lucky Green Plate",desc:"Fried Green Beans + Chicken Pot Stickers, and 20% off Draft Beer (21+).",item:"Fried Green Beans",start:"03-14",end:"03-17"},
 {id:"cinco",holiday:"cinco",title:"Cinco Taco Fiesta",desc:"Carnitas Tacos + Nachos to share, and 20% off House Margaritas (21+).",item:"Carnitas Tacos",start:"05-01",end:"05-05"},
 {id:"july4",holiday:"july4",title:"Fourth of July Ribs",desc:"Baby Back Ribs & Fries with a side of Onion Strings for the fireworks crew.",item:"Baby Back Ribs & Fries",start:"07-01",end:"07-04"}
],
// What still needs fixing (shows on Christian HQ's red to-do list + the Prices tab). Update when it's fixed:
//   realPhotos = dishes that already have a REAL photo (keep in step with realphotos.js); every other item needs one.
//   unconfirmed = "drinks" while the drink prices are still samples, plus any item name whose price/description Melody must check.
realPhotos: ["Lemon Pepper Wings","Lobster Mac & Cheese","Melody Burger Mac & Cheese","Chicken Parmesan Mac & Cheese","Mango Margarita"],
unconfirmed: ["drinks"],
weekly: ["Happy hour 3–6 daily","Mon: half off burgers 11–3","Tue: $4 tacos (every taco) & $6 margaritas","Thu: half off sandwiches 11–3","Fri: $3 sliders 11–3"]
};
