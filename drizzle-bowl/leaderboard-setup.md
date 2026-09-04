# Antidote Drizzle Bowl — global weekly leaderboard setup

Right now the game keeps a weekly top-10 on each player's own device. To make ONE
board that collects every player's name and score on the website, hook it to a free
Google Sheet (takes about 5 minutes, no server needed):

## 1. Make the sheet
- Go to https://sheets.new (signed in as antidotethecure@gmail.com)
- Name it something like `Drizzle Bowl Scores`

## 2. Add the script
- In the sheet: **Extensions → Apps Script**
- Delete whatever is in the editor and paste this:

```javascript
const SHEET = 'Scores';
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  const week = String((e.parameter && e.parameter.week) || '');
  const rows = sh.getLastRow() ? sh.getDataRange().getValues() : [];
  const out = rows
    .filter(r => String(r[2]) === week)
    .map(r => ({ name: String(r[0]).slice(0, 12), score: Number(r[1]) || 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
  return ContentService.createTextOutput(JSON.stringify(out))
    .setMimeType(ContentService.MimeType.JSON);
}
function doPost(e) {
  const d = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  const name = String(d.name || '').replace(/[^\w \-\.]/g, '').slice(0, 12);
  const score = Math.max(0, Math.min(450, parseInt(d.score, 10) || 0));
  if (name && score > 0) sh.appendRow([name, score, String(d.week || ''), new Date()]);
  return ContentService.createTextOutput('ok');
}
```

- Click the save icon.

## 3. Deploy it
- **Deploy → New deployment → type: Web app**
- *Execute as:* **Me**
- *Who has access:* **Anyone**
- Click **Deploy**, approve the permissions, and copy the **Web app URL**
  (it looks like `https://script.google.com/macros/s/AKf.../exec`).

## 4. Plug it into the game
- Open `drizzle-bowl/index.html` and find the line near the top:

```javascript
var LEADERBOARD_URL="";
```

- Paste the URL between the quotes:

```javascript
var LEADERBOARD_URL="https://script.google.com/macros/s/AKf.../exec";
```

- Commit and push. Done — every player's name entry now lands in your sheet, and the
  in-game WEEKLY LEADERS board shows the real site-wide top 10. The board resets
  every Monday (scores are stored per week, so past weeks stay in the sheet — you
  can announce a weekly winner from there).

Notes:
- Scores are capped at 450 and names at 12 characters server-side, so junk entries
  can't wreck the board. You can delete any row in the sheet to remove a score.
- The Google-Sheet board only works on the website (antidotethecure.github.io),
  not in the Claude artifact preview — the preview page isn't allowed to call
  outside servers, so there it falls back to the device-local board.
