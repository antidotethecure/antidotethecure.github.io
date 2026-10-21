/* Sports Bar Package: leagues + regional team lists (data only). Used by demo/sports/sports.js.
   LEAGUES: ESPN path, trophy wording, and the playoff cutoff seed used for "games back" (null = don't compute).
   REGIONS: [league, ESPN team id, abbreviation, short name]. Teams are matched by ESPN team ID per league, never by name.
   IDs verified against https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams on 2026-10-13.
   Add a region: copy "la", give it a new key, list its teams (look IDs up on the /teams endpoint), and set
   SPORTS_CFG.region to that key on the client page. */
window.SPORTS_LEAGUES = {
  mlb:  { path: "baseball/mlb", name: "MLB", title: "World Series title", cut: 6, gb: "games" },
  nfl:  { path: "football/nfl", name: "NFL", title: "Super Bowl title", cut: 7, gb: "games", single: true },
  nba:  { path: "basketball/nba", name: "NBA", title: "NBA title", cut: 10, gb: "games" },
  nhl:  { path: "hockey/nhl", name: "NHL", title: "Stanley Cup", cut: 8, gb: "points" },
  mls:  { path: "soccer/usa.1", name: "MLS", title: "MLS Cup", cut: 9, gb: "points" },
  wnba: { path: "basketball/wnba", name: "WNBA", title: "WNBA title" },
  cfb:  { path: "football/college-football", name: "College football", q: "&groups=80", college: true },
  cbb:  { path: "basketball/mens-college-basketball", name: "College hoops", q: "&groups=50", college: true },
  ufc:  { path: "mma/ufc", name: "UFC", fights: true }
};
window.SPORTS_REGIONS = {
  la: {
    name: "Los Angeles & California", short: "LA/California",
    teams: [
      ["mlb", "19", "LAD", "Dodgers"], ["mlb", "3", "LAA", "Angels"], ["mlb", "25", "SD", "Padres"], ["mlb", "26", "SF", "Giants"], ["mlb", "11", "ATH", "Athletics"],
      ["nfl", "14", "LAR", "Rams"], ["nfl", "24", "LAC", "Chargers"], ["nfl", "25", "SF", "49ers"],
      ["nba", "13", "LAL", "Lakers"], ["nba", "12", "LAC", "Clippers"], ["nba", "9", "GS", "Warriors"], ["nba", "23", "SAC", "Kings (Sacramento)"],
      ["nhl", "8", "LA", "LA Kings"], ["nhl", "25", "ANA", "Ducks"], ["nhl", "18", "SJ", "Sharks"],
      ["mls", "18966", "LAFC", "LAFC"], ["mls", "187", "LA", "LA Galaxy"], ["mls", "191", "SJ", "Earthquakes"], ["mls", "22529", "SD", "San Diego FC"],
      ["wnba", "6", "LA", "Sparks"], ["wnba", "129689", "GS", "Valkyries"],
      ["cfb", "30", "USC", "USC"], ["cfb", "26", "UCLA", "UCLA"], ["cfb", "25", "CAL", "Cal"], ["cfb", "24", "STAN", "Stanford"],
      ["cbb", "30", "USC", "USC"], ["cbb", "26", "UCLA", "UCLA"], ["cbb", "25", "CAL", "Cal"], ["cbb", "24", "STAN", "Stanford"]
    ]
  }
};
