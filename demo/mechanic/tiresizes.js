/* Factory (OE) tire sizes by make|model. Typical sizes per generation + trim; the door-jamb sticker / sidewall is the final word.
   s = size; r = rear size when the front and rear sizes differ (staggered). y = [first, last] model year inclusive. t = trims (short). */
window.TIRE_SIZES = {
  "toyota|camry": [
    { y: [2012, 2014], t: "L / LE / Hybrid LE", s: "205/65R16" },
    { y: [2012, 2014], t: "SE / XLE / Hybrid XLE", s: "215/55R17" },
    { y: [2012, 2014], t: "SE V6 18in", s: "225/45R18" },
    { y: [2015, 2017], t: "LE / Hybrid LE", s: "205/65R16" },
    { y: [2015, 2017], t: "SE / XLE", s: "215/55R17" },
    { y: [2015, 2017], t: "XSE", s: "225/45R18" },
    { y: [2018, 2020], t: "L / Hybrid LE", s: "205/65R16" },
    { y: [2018, 2024], t: "LE (gas)", s: "215/55R17" },
    { y: [2018, 2024], t: "SE / XLE", s: "235/45R18" },
    { y: [2018, 2024], t: "XSE / TRD", s: "235/40R19" },
    { y: [2021, 2024], t: "Hybrid LE", s: "205/65R16" },
    { y: [2025, 2026], t: "LE", s: "205/65R16" },
    { y: [2025, 2026], t: "SE / XLE", s: "235/45R18" },
    { y: [2025, 2026], t: "XSE", s: "235/40R19" }
  ],
  "honda|civic": [
    { y: [2012, 2013], t: "Si", s: "215/45R17" },
    { y: [2012, 2015], t: "LX / HF / Hybrid", s: "195/65R15" },
    { y: [2012, 2015], t: "EX", s: "205/55R16" },
    { y: [2013, 2015], t: "EX-L", s: "215/45R17" },
    { y: [2014, 2015], t: "Si", s: "225/40R18" },
    { y: [2016, 2021], t: "LX / EX", s: "215/55R16" },
    { y: [2016, 2021], t: "EX-T / EX-L / Touring 17in", s: "215/50R17" },
    { y: [2017, 2021], t: "Sport / Sport Touring / Si / Touring 18in", s: "235/40R18" },
    { y: [2017, 2021], t: "Type R", s: "245/30R20" },
    { y: [2022, 2024], t: "EX / EX-L", s: "215/50R17" },
    { y: [2022, 2026], t: "LX", s: "215/55R16" },
    { y: [2022, 2026], t: "Sport / Touring / Si / Hybrid", s: "235/40R18" },
    { y: [2023, 2026], t: "Type R", s: "265/30R19" }
  ],
  "honda|accord": [
    { y: [2012, 2012], t: "LX / SE", s: "215/60R16" },
    { y: [2012, 2012], t: "EX / EX-L", s: "225/50R17" },
    { y: [2012, 2012], t: "Coupe EX-L V6", s: "235/45R18" },
    { y: [2013, 2015], t: "Sport", s: "235/45R18" },
    { y: [2013, 2017], t: "LX", s: "205/65R16" },
    { y: [2013, 2017], t: "EX / EX-L / LX-S", s: "215/55R17" },
    { y: [2016, 2017], t: "Sport / Touring", s: "235/40R19" },
    { y: [2018, 2022], t: "LX / EX / EX-L / Hybrid", s: "225/50R17" },
    { y: [2018, 2022], t: "Sport / Touring", s: "235/40R19" },
    { y: [2023, 2026], t: "LX / SE / EX / EX-L Hybrid", s: "225/50R17" },
    { y: [2023, 2026], t: "Sport / Sport-L / Touring Hybrid", s: "235/40R19" }
  ],
  "ford|f-150": [
    { y: [2012, 2014], t: "XL / STX 17in", s: "235/75R17" },
    { y: [2012, 2014], t: "XL / XLT 2WD 17in", s: "255/65R17" },
    { y: [2012, 2014], t: "XL / XLT 4WD 17in", s: "265/70R17" },
    { y: [2012, 2014], t: "2WD 18in (XLT / Lariat / FX2)", s: "265/60R18" },
    { y: [2012, 2014], t: "4WD 18in (XLT / Lariat / FX4)", s: "275/65R18" },
    { y: [2012, 2014], t: "20in (Lariat / King Ranch / Platinum)", s: "275/55R20" },
    { y: [2012, 2014], t: "Harley-Davidson / Limited 22in", s: "275/45R22" },
    { y: [2012, 2014], t: "Heavy-Duty Payload", s: "LT245/75R17" },
    { y: [2012, 2014], t: "SVT Raptor", s: "LT315/70R17" },
    { y: [2015, 2020], t: "XL / XLT 2WD 17in", s: "245/70R17" },
    { y: [2015, 2020], t: "XL / XLT 4WD 17in", s: "265/70R17" },
    { y: [2015, 2020], t: "2WD 18in (XLT / Lariat)", s: "265/60R18" },
    { y: [2015, 2020], t: "4WD 18in (XLT / Lariat / FX4)", s: "275/65R18" },
    { y: [2015, 2020], t: "20in (Lariat / King Ranch / Platinum)", s: "275/55R20" },
    { y: [2017, 2020], t: "Raptor", s: "LT315/70R17" },
    { y: [2021, 2026], t: "XL / XLT 2WD 17in", s: "245/70R17" },
    { y: [2021, 2026], t: "XL / XLT 4WD 17in", s: "265/70R17" },
    { y: [2021, 2026], t: "2WD 18in (XLT / Lariat)", s: "265/60R18" },
    { y: [2021, 2026], t: "4WD 18in (XLT / Lariat)", s: "275/65R18" },
    { y: [2021, 2026], t: "20in (XLT / Lariat / King Ranch / Platinum)", s: "275/60R20" },
    { y: [2021, 2026], t: "22in (Limited / Platinum)", s: "275/50R22" },
    { y: [2021, 2026], t: "Tremor", s: "275/70R18" },
    { y: [2021, 2026], t: "Raptor", s: "LT315/70R17" }
  ],
  "chevrolet|silverado 1500": [
    { y: [2012, 2013], t: "WT / LS 17in", s: "P245/70R17" },
    { y: [2012, 2013], t: "LT 17in", s: "P265/70R17" },
    { y: [2012, 2013], t: "LT / LTZ 18in", s: "P265/65R18" },
    { y: [2012, 2013], t: "LTZ 20in", s: "P275/55R20" },
    { y: [2014, 2018], t: "WT / LS 17in", s: "P255/70R17" },
    { y: [2014, 2018], t: "LT 17in", s: "P265/70R17" },
    { y: [2014, 2018], t: "LT / LTZ 18in", s: "P265/65R18" },
    { y: [2014, 2018], t: "LTZ / High Country 20in", s: "P275/55R20" },
    { y: [2014, 2018], t: "High Country / LTZ 22in", s: "P285/45R22" },
    { y: [2019, 2026], t: "WT 17in", s: "255/70R17" },
    { y: [2019, 2026], t: "WT / LT 17in", s: "265/70R17" },
    { y: [2019, 2026], t: "LT / RST / LTZ 18in", s: "265/65R18" },
    { y: [2019, 2026], t: "Custom / LT / RST / LTZ / High Country 20in", s: "275/60R20" },
    { y: [2019, 2026], t: "RST / LTZ / High Country 22in", s: "275/50R22" },
    { y: [2019, 2026], t: "Trail Boss", s: "LT275/65R18" },
    { y: [2022, 2026], t: "ZR2", s: "LT275/70R18" }
  ],
  "toyota|rav4": [
    { y: [2012, 2012], t: "Base 16in", s: "215/70R16" },
    { y: [2012, 2012], t: "Base / Limited 17in", s: "225/65R17" },
    { y: [2012, 2012], t: "Sport", s: "235/55R18" },
    { y: [2013, 2018], t: "LE / XLE", s: "225/65R17" },
    { y: [2013, 2018], t: "Limited / SE / Platinum", s: "235/55R18" },
    { y: [2019, 2025], t: "LE / XLE (gas + hybrid)", s: "225/65R17" },
    { y: [2019, 2025], t: "TRD Off-Road / XSE Hybrid / XLE Prem Hybrid / Limited Hybrid / Prime SE", s: "225/60R18" },
    { y: [2019, 2025], t: "XLE Premium / Adventure / Limited (gas) / Prime XSE", s: "235/55R19" },
    { y: [2026, 2026], t: "LE", s: "235/65R17" },
    { y: [2026, 2026], t: "SE / XLE Premium / Limited 18in", s: "235/60R18" },
    { y: [2026, 2026], t: "Woodland", s: "235/65R18" },
    { y: [2026, 2026], t: "XSE / Limited 20in", s: "235/50R20" }
  ],
  "honda|cr-v": [
    { y: [2012, 2016], t: "LX", s: "215/70R16" },
    { y: [2012, 2016], t: "EX / EX-L / SE", s: "225/65R17" },
    { y: [2015, 2016], t: "Touring", s: "225/60R18" },
    { y: [2017, 2022], t: "LX", s: "235/65R17" },
    { y: [2017, 2022], t: "EX / EX-L / Hybrid", s: "235/60R18" },
    { y: [2017, 2022], t: "Touring", s: "235/55R19" },
    { y: [2023, 2026], t: "LX", s: "235/65R17" },
    { y: [2023, 2026], t: "EX / EX-L / Sport / Sport-L Hybrid", s: "235/60R18" },
    { y: [2023, 2026], t: "Sport Touring Hybrid", s: "235/55R19" }
  ],
  "toyota|corolla": [
    { y: [2012, 2013], t: "L", s: "195/65R15" },
    { y: [2012, 2013], t: "S", s: "205/55R16" },
    { y: [2014, 2019], t: "L / LE Eco", s: "195/65R15" },
    { y: [2014, 2019], t: "LE / XLE", s: "205/55R16" },
    { y: [2014, 2019], t: "S / SE / XSE", s: "215/45R17" },
    { y: [2019, 2019], t: "Hatchback SE", s: "205/55R16" },
    { y: [2019, 2019], t: "Hatchback XSE", s: "225/40R18" },
    { y: [2020, 2022], t: "L / Hybrid LE", s: "195/65R15" },
    { y: [2020, 2026], t: "LE / XLE (sedan); SE Hatchback", s: "205/55R16" },
    { y: [2020, 2026], t: "SE / XSE / Nightshade; XSE Hatchback", s: "225/40R18" }
  ],
  "nissan|altima": [
    { y: [2012, 2012], t: "Sedan 2.5 / 2.5 S / 2.5 SL", s: "215/60R16" },
    { y: [2012, 2012], t: "Sedan 3.5 SR", s: "215/55R17" },
    { y: [2013, 2018], t: "2.5 / 2.5 S", s: "215/60R16" },
    { y: [2013, 2018], t: "2.5 SV / 2.5 SL", s: "215/55R17" },
    { y: [2013, 2018], t: "3.5 / 2.5 SR (2016+)", s: "235/45R18" },
    { y: [2019, 2025], t: "S", s: "215/60R16" },
    { y: [2019, 2026], t: "SV / SL (2019-2022)", s: "215/55R17" },
    { y: [2019, 2026], t: "SR / Platinum / VC-Turbo / SL (2023+)", s: "235/40R19" }
  ],
  "tesla|model y": [   // added by hand 10-23: Tesla owner's manual + tiresize.com 2020-2026
    { y: [2020, 2026], t: "19in (Long Range / base)", s: "255/45R19" },
    { y: [2020, 2026], t: "20in", s: "255/40R20" },
    { y: [2020, 2026], t: "21in Performance", s: "255/35R21", r: "275/35R21" }
  ],
  "tesla|model 3": [
    { y: [2017, 2026], t: "RWD / Long Range 18in", s: "235/45R18" },
    { y: [2017, 2026], t: "RWD / Long Range 19in", s: "235/40R19" },
    { y: [2018, 2023], t: "Performance 20in", s: "235/35ZR20" }
  ],
  "toyota|tacoma": [
    { y: [2012, 2014], t: "X-Runner", s: "255/45R18" },
    { y: [2012, 2015], t: "Base 2WD 4-cyl", s: "215/70R15" },
    { y: [2012, 2015], t: "PreRunner / 4x4", s: "245/75R16" },
    { y: [2012, 2015], t: "TRD Off-Road / TRD Pro", s: "265/70R16" },
    { y: [2012, 2015], t: "TRD Sport", s: "265/65R17" },
    { y: [2016, 2023], t: "SR / SR5", s: "245/75R16" },
    { y: [2016, 2023], t: "TRD Off-Road / TRD Pro", s: "265/70R16" },
    { y: [2016, 2023], t: "TRD Sport", s: "265/65R17" },
    { y: [2016, 2023], t: "Limited", s: "265/60R18" },
    { y: [2024, 2026], t: "SR / SR5", s: "245/70R17" },
    { y: [2024, 2026], t: "TRD PreRunner / TRD Off-Road", s: "265/70R17" },
    { y: [2024, 2026], t: "TRD Sport / Limited", s: "265/65R18" },
    { y: [2024, 2026], t: "TRD Pro / Trailhunter", s: "265/70R18" }
  ],
  "jeep|wrangler": [
    { y: [2012, 2018], t: "Sport (JK)", s: "225/75R16" },
    { y: [2012, 2018], t: "Sahara (JK)", s: "255/70R18" },
    { y: [2012, 2018], t: "Rubicon (JK)", s: "255/75R17" },
    { y: [2018, 2026], t: "Sport / Sport S (JL)", s: "245/75R17" },
    { y: [2018, 2026], t: "Sahara (JL)", s: "255/70R18" },
    { y: [2018, 2026], t: "Rubicon / Willys 2024+", s: "285/70R17" },
    { y: [2021, 2023], t: "Willys", s: "255/75R17" },
    { y: [2022, 2026], t: "Rubicon 392 / Xtreme 35in pkg", s: "315/70R17" }
  ],
  "jeep|grand cherokee": [
    { y: [2012, 2021], t: "SRT8 / SRT / Trackhawk", s: "295/45ZR20" },
    { y: [2012, 2022], t: "Laredo (WK2)", s: "245/70R17" },
    { y: [2012, 2022], t: "Laredo E / Limited / Overland 18in / Trailhawk", s: "265/60R18" },
    { y: [2012, 2022], t: "Limited / Overland / Summit / Altitude 20in", s: "265/50R20" },
    { y: [2022, 2026], t: "Laredo (WL)", s: "245/70R17" },
    { y: [2022, 2026], t: "Laredo X / Altitude / Limited / Trailhawk (WL)", s: "265/60R18" },
    { y: [2022, 2026], t: "Limited / Overland / Summit (WL) 20in", s: "265/50R20" },
    { y: [2022, 2026], t: "Summit Reserve 21in", s: "275/45R21" }
  ],
  "ram|1500": [
    { y: [2012, 2018], t: "ST / Tradesman / SXT / HFE", s: "265/70R17" },
    { y: [2012, 2018], t: "SLT / Big Horn / Sport / Laramie / Longhorn 20in", s: "275/60R20" },
    { y: [2015, 2018], t: "Rebel", s: "285/70R17" },
    { y: [2019, 2024], t: "Classic Tradesman / Express / Warlock", s: "265/70R17" },
    { y: [2019, 2024], t: "Classic 20in", s: "275/60R20" },
    { y: [2019, 2026], t: "Tradesman / Big Horn", s: "275/65R18" },
    { y: [2019, 2026], t: "Big Horn / Laramie / Limited 20in", s: "275/55R20" },
    { y: [2019, 2026], t: "Laramie / Limited / Tungsten 22in", s: "285/45R22" },
    { y: [2019, 2026], t: "Rebel", s: "LT275/70R18" },
    { y: [2021, 2024], t: "TRX", s: "LT325/65R18" },
    { y: [2025, 2026], t: "RHO", s: "LT325/65R18" }
  ],
  "nissan|rogue": [
    { y: [2012, 2013], t: "S", s: "215/70R16" },
    { y: [2012, 2013], t: "SV", s: "225/60R17" },
    { y: [2012, 2013], t: "SL / SV 18in", s: "225/55R18" },
    { y: [2014, 2020], t: "S / SV", s: "225/65R17" },
    { y: [2014, 2020], t: "SL", s: "225/60R18" },
    { y: [2017, 2020], t: "SL Platinum pkg 19in", s: "225/55R19" },
    { y: [2021, 2026], t: "S", s: "225/65R17" },
    { y: [2021, 2026], t: "SV / Midnight Edition", s: "235/60R18" },
    { y: [2021, 2026], t: "SL / Platinum", s: "235/55R19" }
  ],
  "hyundai|elantra": [
    { y: [2012, 2016], t: "GLS / SE", s: "205/55R16" },
    { y: [2012, 2016], t: "Limited / Sport", s: "215/45R17" },
    { y: [2017, 2020], t: "SE / Eco", s: "195/65R15" },
    { y: [2017, 2020], t: "SEL / Value Edition", s: "205/55R16" },
    { y: [2017, 2020], t: "Limited", s: "225/45R17" },
    { y: [2017, 2020], t: "Sport", s: "225/40R18" },
    { y: [2021, 2026], t: "SE", s: "195/65R15" },
    { y: [2021, 2026], t: "SEL 16in / Hybrid Blue", s: "205/55R16" },
    { y: [2021, 2026], t: "SEL 17in / Limited / Hybrid Limited", s: "225/45R17" },
    { y: [2021, 2026], t: "N Line", s: "235/40R18" },
    { y: [2022, 2026], t: "N", s: "245/35R19" }
  ],
  "chevrolet|equinox": [
    { y: [2012, 2017], t: "LS / LT", s: "225/65R17" },
    { y: [2012, 2017], t: "LT 18in / LTZ", s: "235/55R18" },
    { y: [2018, 2024], t: "L / LS / LT", s: "225/65R17" },
    { y: [2018, 2024], t: "LT / Premier 18in", s: "225/60R18" },
    { y: [2018, 2024], t: "Premier / RS 19in", s: "235/50R19" },
    { y: [2025, 2026], t: "LT / ACTIV", s: "235/65R17" },
    { y: [2025, 2026], t: "LT / RS 19in", s: "235/55R19" },
    { y: [2025, 2026], t: "RS 20in", s: "235/50R20" }
  ],
  "ford|explorer": [
    { y: [2012, 2015], t: "Base", s: "245/65R17" },
    { y: [2012, 2019], t: "XLT / Base 2016+", s: "245/60R18" },
    { y: [2012, 2019], t: "Limited / Sport / Platinum / XLT 20in", s: "255/50R20" },
    { y: [2020, 2026], t: "Base / XLT / Active", s: "255/65R18" },
    { y: [2020, 2026], t: "XLT 20in / Limited / King Ranch / ST-Line", s: "255/55R20" },
    { y: [2020, 2026], t: "ST / Platinum 21in", s: "275/45R21" },
    { y: [2021, 2026], t: "Timberline", s: "265/65R18" }
  ],
  "dodge|charger": [
    { y: [2012, 2014], t: "SE / SXT 17in", s: "215/65R17" },
    { y: [2012, 2014], t: "SXT / R/T 18in", s: "235/55R18" },
    { y: [2012, 2014], t: "SXT / R/T AWD 19in", s: "235/55R19" },
    { y: [2012, 2014], t: "R/T 20in / SRT8", s: "245/45R20" },
    { y: [2015, 2023], t: "SE / SXT", s: "215/65R17" },
    { y: [2015, 2023], t: "SXT / GT AWD", s: "235/55R19" },
    { y: [2015, 2023], t: "SXT 20in / GT / R/T / Scat Pack", s: "245/45R20" },
    { y: [2015, 2023], t: "SRT 392 / Hellcat / Scat Pack 275 pkg", s: "275/40ZR20" },
    { y: [2020, 2023], t: "Scat Pack / Hellcat Widebody", s: "305/35ZR20" },
    { y: [2025, 2026], t: "Daytona R/T", s: "245/55R18" },
    { y: [2025, 2026], t: "Daytona R/T Blacktop", s: "255/45R20" },
    { y: [2025, 2026], t: "Daytona Scat Pack", s: "305/35ZR20", r: "325/35ZR20" }
  ],
  "toyota|highlander": [
    { y: [2012, 2013], t: "Base / Plus / SE", s: "245/65R17" },
    { y: [2012, 2013], t: "Limited / Hybrid Limited", s: "245/55R19" },
    { y: [2014, 2019], t: "LE / LE Plus / XLE", s: "245/60R18" },
    { y: [2014, 2019], t: "Limited / Platinum / SE", s: "245/55R19" },
    { y: [2020, 2026], t: "L / LE / XLE", s: "235/65R18" },
    { y: [2020, 2026], t: "Limited / Platinum / XSE", s: "235/55R20" }
  ],
  "kia|sorento": [
    { y: [2012, 2013], t: "LX", s: "235/65R17" },
    { y: [2012, 2013], t: "EX / SX", s: "235/60R18" },
    { y: [2014, 2020], t: "L / LX", s: "235/65R17" },
    { y: [2014, 2020], t: "EX", s: "235/60R18" },
    { y: [2014, 2020], t: "SX / SXL / Limited", s: "235/55R19" },
    { y: [2021, 2023], t: "EX", s: "235/60R18" },
    { y: [2021, 2026], t: "LX / Hybrid S", s: "235/65R17" },
    { y: [2021, 2026], t: "S", s: "235/60R18" },
    { y: [2021, 2026], t: "SX / SX Prestige / X-Line", s: "255/45R20" },
    { y: [2022, 2026], t: "Hybrid / PHEV SX Prestige", s: "235/55R19" },
    { y: [2024, 2026], t: "EX", s: "255/45R20" },
    { y: [2024, 2026], t: "X-Pro", s: "235/65R17" }
  ],
  "hyundai|tucson": [
    { y: [2012, 2015], t: "GLS / SE", s: "225/60R17" },
    { y: [2012, 2015], t: "Limited", s: "225/55R18" },
    { y: [2016, 2018], t: "SE / Eco / Value / SEL", s: "225/60R17" },
    { y: [2016, 2018], t: "Sport / Limited", s: "245/45R19" },
    { y: [2019, 2021], t: "SE / Value", s: "225/60R17" },
    { y: [2019, 2021], t: "SEL / Limited / Ultimate", s: "225/55R18" },
    { y: [2019, 2021], t: "Sport", s: "245/45R19" },
    { y: [2022, 2024], t: "SEL 19in / XRT", s: "235/55R19" },
    { y: [2022, 2026], t: "SE / Blue Hybrid", s: "235/65R17" },
    { y: [2022, 2026], t: "Limited / N Line", s: "235/55R19" },
    { y: [2025, 2026], t: "SEL / XRT", s: "235/60R18" }
  ],
  "subaru|outback": [
    { y: [2012, 2014], t: "2.5i", s: "215/70R16" },
    { y: [2012, 2014], t: "2.5i Premium / Limited / 3.6R", s: "225/60R17" },
    { y: [2015, 2019], t: "2.5i / Premium", s: "225/65R17" },
    { y: [2015, 2019], t: "Limited / Touring / 3.6R", s: "225/60R18" },
    { y: [2020, 2025], t: "Base / Premium / Wilderness", s: "225/65R17" },
    { y: [2020, 2025], t: "Limited / Touring / Onyx XT / XT", s: "225/60R18" },
    { y: [2026, 2026], t: "Premium / Limited / Touring", s: "225/60R18" },
    { y: [2026, 2026], t: "Wilderness", s: "225/65R17" },
    { y: [2026, 2026], t: "Limited XT / Touring XT", s: "225/55R19" }
  ],
  "ford|escape": [
    { y: [2012, 2012], t: "XLS / XLT / Limited / Hybrid", s: "P235/70R16" },
    { y: [2013, 2019], t: "S / SE", s: "235/55R17" },
    { y: [2013, 2019], t: "SE 18in / Titanium (2013-16)", s: "235/50R18" },
    { y: [2013, 2019], t: "Titanium 19in / SE 19in", s: "235/45R19" },
    { y: [2020, 2026], t: "S / SE / Active / Base", s: "225/65R17" },
    { y: [2020, 2026], t: "SEL / PHEV / ST-Line / ST-Line Select", s: "225/60R18" },
    { y: [2020, 2026], t: "Titanium / Platinum / ST-Line Elite", s: "225/55R19" }
  ],
  "nissan|sentra": [
    { y: [2012, 2012], t: "2.0 S / SL / SR", s: "205/55R16" },
    { y: [2012, 2012], t: "SE-R / SE-R Spec V", s: "225/45R17" },
    { y: [2013, 2019], t: "S / FE+ / SV", s: "205/55R16" },
    { y: [2013, 2019], t: "SR / SL / SR Turbo", s: "205/50R17" },
    { y: [2017, 2019], t: "Nismo", s: "225/40R18" },
    { y: [2020, 2025], t: "S / SV", s: "205/60R16" },
    { y: [2020, 2025], t: "SV 17in", s: "215/50R17" },
    { y: [2020, 2025], t: "SR / Midnight", s: "215/45R18" },
    { y: [2026, 2026], t: "S / SV", s: "205/60R16" },
    { y: [2026, 2026], t: "SR", s: "215/45R18" }
  ],
  "chevrolet|malibu": [
    { y: [2012, 2012], t: "LS / LT", s: "215/55R17" },
    { y: [2012, 2012], t: "LT 18in / LTZ", s: "225/50R18" },
    { y: [2013, 2015], t: "LS / LT", s: "215/60R16" },
    { y: [2013, 2015], t: "Eco / LT 17in", s: "225/55R17" },
    { y: [2013, 2015], t: "LTZ / LT 18in", s: "225/50R18" },
    { y: [2013, 2015], t: "LTZ 19in", s: "245/40R19" },
    { y: [2016, 2018], t: "Premier / LT 18in", s: "245/45R18" },
    { y: [2016, 2025], t: "L / LS", s: "205/65R16" },
    { y: [2016, 2025], t: "LT / Hybrid", s: "225/55R17" },
    { y: [2016, 2025], t: "Premier 19in", s: "245/40R19" },
    { y: [2019, 2025], t: "RS", s: "245/45R18" }
  ],
  "toyota|prius": [
    { y: [2012, 2015], t: "Two / Three / Four / Plug-in", s: "195/65R15" },
    { y: [2012, 2015], t: "Five / 17in pkg", s: "215/45R17" },
    { y: [2016, 2022], t: "L Eco / Two / Three / LE / XLE", s: "195/65R15" },
    { y: [2016, 2022], t: "Touring / XLE / Limited 17in", s: "215/45R17" },
    { y: [2023, 2026], t: "LE / Prime SE", s: "195/60R17" },
    { y: [2023, 2026], t: "XLE / Limited / Prime XSE", s: "195/50R19" }
  ],
  "honda|pilot": [
    { y: [2012, 2015], t: "LX", s: "235/65R17" },
    { y: [2012, 2015], t: "EX / EX-L / Touring", s: "235/60R18" },
    { y: [2016, 2022], t: "LX / EX / EX-L / Special Edition", s: "245/60R18" },
    { y: [2016, 2022], t: "Touring / Elite / Black Edition", s: "245/50R20" },
    { y: [2023, 2026], t: "LX / EX-L", s: "255/60R18" },
    { y: [2023, 2026], t: "TrailSport", s: "265/60R18" },
    { y: [2023, 2026], t: "Sport / Touring / Elite / Black Edition", s: "255/50R20" }
  ],
  "gmc|sierra 1500": [
    { y: [2012, 2013], t: "WT / base", s: "245/70R17" },
    { y: [2012, 2013], t: "SLE", s: "265/70R17" },
    { y: [2012, 2013], t: "SLT / Z71 18in", s: "265/65R18" },
    { y: [2012, 2013], t: "Denali / 20in", s: "275/55R20" },
    { y: [2014, 2018], t: "Base / WT", s: "255/70R17" },
    { y: [2014, 2018], t: "SLE", s: "265/70R17" },
    { y: [2014, 2018], t: "SLE / SLT 18in", s: "265/65R18" },
    { y: [2014, 2018], t: "SLT / Denali 20in", s: "275/55R20" },
    { y: [2014, 2018], t: "Denali 22in", s: "285/45R22" },
    { y: [2019, 2026], t: "Pro / SLE 17in", s: "255/70R17" },
    { y: [2019, 2026], t: "SLE / SLT 18in", s: "265/65R18" },
    { y: [2019, 2026], t: "AT4", s: "275/65R18" },
    { y: [2019, 2026], t: "Elevation / SLT / Denali 20in", s: "275/60R20" },
    { y: [2019, 2026], t: "Denali / Denali Ultimate 22in", s: "275/50R22" },
    { y: [2022, 2026], t: "AT4X", s: "275/70R18" }
  ],
  "ford|mustang": [
    { y: [2012, 2012], t: "Shelby GT500", s: "255/40ZR19", r: "285/35ZR19" },
    { y: [2012, 2013], t: "Boss 302", s: "255/40ZR19", r: "285/35ZR19" },
    { y: [2012, 2014], t: "V6 Premium 18in / GT", s: "235/50R18" },
    { y: [2012, 2014], t: "GT 19in / California Special", s: "245/45R19" },
    { y: [2012, 2014], t: "GT Brembo / V6 Performance Pkg", s: "255/40ZR19" },
    { y: [2013, 2014], t: "Shelby GT500", s: "265/40ZR19", r: "285/35ZR20" },
    { y: [2015, 2020], t: "Shelby GT350", s: "295/35ZR19", r: "305/35ZR19" },
    { y: [2015, 2020], t: "Shelby GT350R", s: "305/30ZR19", r: "315/30ZR19" },
    { y: [2015, 2023], t: "V6 / EcoBoost 17in", s: "235/55R17" },
    { y: [2015, 2023], t: "EcoBoost / GT 18in", s: "235/50R18" },
    { y: [2015, 2023], t: "EcoBoost Premium / GT Premium 19in", s: "255/40R19" },
    { y: [2015, 2023], t: "GT Performance Pack / Bullitt / Mach 1", s: "255/40ZR19", r: "275/40ZR19" },
    { y: [2015, 2023], t: "Premium 20in", s: "265/35R20" },
    { y: [2020, 2022], t: "Shelby GT500", s: "305/30ZR20", r: "315/30ZR20" },
    { y: [2024, 2026], t: "EcoBoost 18in", s: "235/50R18" },
    { y: [2024, 2026], t: "GT 18in", s: "255/45R18" },
    { y: [2024, 2026], t: "EcoBoost / GT 19in", s: "255/40R19" },
    { y: [2024, 2026], t: "EcoBoost / GT 20in", s: "265/35R20" },
    { y: [2024, 2026], t: "GT Performance Pack / Dark Horse", s: "255/40ZR19", r: "275/40ZR19" },
    { y: [2024, 2026], t: "Dark Horse Handling Pkg", s: "305/30ZR19", r: "315/30ZR19" }
  ],
  "bmw|3 series": [
    { y: [2012, 2018], t: "320i / 328i / 330i base 17in (F30 sedan)", s: "225/50R17" },
    { y: [2012, 2018], t: "Sport / Luxury / M Sport 18in", s: "225/45R18" },
    { y: [2012, 2018], t: "M Sport / Track pkg staggered 18in", s: "225/45R18", r: "255/40R18" },
    { y: [2016, 2018], t: "340i M Sport staggered 19in", s: "225/40R19", r: "255/35R19" },
    { y: [2019, 2026], t: "330i / 330e / M340i 18in (G20 sedan)", s: "225/45R18" },
    { y: [2019, 2026], t: "M Sport 19in", s: "225/40R19" },
    { y: [2019, 2026], t: "M Sport / M340i staggered 19in", s: "225/40R19", r: "255/35R19" },
    { y: [2020, 2026], t: "M340i staggered 18in", s: "225/45R18", r: "255/40R18" }
  ],
  "chevrolet|tahoe": [
    { y: [2012, 2014], t: "LS / LT 17in", s: "265/70R17" },
    { y: [2012, 2014], t: "LT / LT Z71 / Hybrid 18in", s: "265/65R18" },
    { y: [2012, 2014], t: "LTZ / LT 20in", s: "275/55R20" },
    { y: [2015, 2020], t: "LS / LT / Z71 18in", s: "265/65R18" },
    { y: [2015, 2020], t: "LT / LTZ / Premier 20in", s: "275/55R20" },
    { y: [2015, 2020], t: "RST / Premier 22in", s: "285/45R22" },
    { y: [2021, 2026], t: "LS / LT 18in", s: "265/65R18" },
    { y: [2021, 2026], t: "LT / Z71 / RST / Premier 20in", s: "275/60R20" },
    { y: [2021, 2026], t: "RST / Premier / High Country 22in", s: "275/50R22" },
    { y: [2025, 2026], t: "RST / High Country 24in", s: "285/40R24" }
  ],
  "ford|edge": [
    { y: [2012, 2014], t: "SE 17in", s: "235/65R17" },
    { y: [2012, 2014], t: "SE / SEL / Limited 18in", s: "245/60R18" },
    { y: [2012, 2014], t: "Limited 20in", s: "245/50R20" },
    { y: [2012, 2014], t: "Sport 22in", s: "265/40R22" },
    { y: [2015, 2024], t: "SE / SEL 18in", s: "245/60R18" },
    { y: [2015, 2024], t: "Titanium 19in", s: "245/55R19" },
    { y: [2015, 2024], t: "Titanium / Sport / ST / ST-Line 20in", s: "245/50R20" },
    { y: [2015, 2024], t: "Sport / ST 21in", s: "265/40R21" }
  ],
  "nissan|frontier": [
    { y: [2012, 2019], t: "King Cab S 4cyl 15in", s: "235/75R15" },
    { y: [2012, 2021], t: "S / SV 16in", s: "265/70R16" },
    { y: [2012, 2021], t: "PRO-4X / Desert Runner", s: "265/75R16" },
    { y: [2012, 2021], t: "SL 18in", s: "265/60R18" },
    { y: [2022, 2026], t: "S / SV 16in", s: "265/70R16" },
    { y: [2022, 2026], t: "SV 17in", s: "265/65R17" },
    { y: [2022, 2026], t: "PRO-X / PRO-4X / Midnight / Hardbody", s: "265/70R17" }
  ],
  "chevrolet|traverse": [
    { y: [2012, 2017], t: "LS 17in", s: "245/70R17" },
    { y: [2012, 2017], t: "LT 18in", s: "255/65R18" },
    { y: [2012, 2017], t: "LT / LTZ 20in", s: "255/55R20" },
    { y: [2018, 2023], t: "L / LS / LT 18in", s: "255/65R18" },
    { y: [2018, 2023], t: "LT / RS / Premier / High Country 20in", s: "255/55R20" },
    { y: [2024, 2026], t: "LS / LT 18in", s: "255/65R18" },
    { y: [2024, 2026], t: "LT 20in", s: "255/55R20" },
    { y: [2024, 2026], t: "Z71", s: "265/65R18" },
    { y: [2024, 2026], t: "RS 22in", s: "275/45R22" }
  ],
  "kia|optima": [
    { y: [2012, 2015], t: "LX / Hybrid 16in", s: "205/65R16" },
    { y: [2012, 2015], t: "EX / Hybrid 17in", s: "215/55R17" },
    { y: [2012, 2015], t: "SX / SX Limited / EX 18in", s: "225/45R18" },
    { y: [2016, 2020], t: "LX / LX 1.6T / Hybrid 16in", s: "205/65R16" },
    { y: [2016, 2020], t: "LX / EX / S / Hybrid / PHEV 17in", s: "215/55R17" },
    { y: [2016, 2020], t: "SX / SXL / S 18in", s: "235/45R18" }
  ],
  "kia|k5": [
    { y: [2021, 2026], t: "LX / LXS 16in", s: "205/65R16" },
    { y: [2021, 2026], t: "GT-Line / EX 18in", s: "235/45R18" },
    { y: [2021, 2026], t: "GT 19in", s: "245/40R19" }
  ],
  "hyundai|sonata": [
    { y: [2012, 2014], t: "GLS / Hybrid 16in", s: "205/65R16" },
    { y: [2012, 2014], t: "Limited / Hybrid Limited 17in", s: "215/55R17" },
    { y: [2012, 2014], t: "SE / Limited 2.0T 18in", s: "225/45R18" },
    { y: [2015, 2019], t: "SE / Eco / Hybrid SE 16in", s: "205/65R16" },
    { y: [2015, 2019], t: "Sport / SEL / Limited / Hybrid Ltd / PHEV 17in", s: "215/55R17" },
    { y: [2015, 2019], t: "Sport 2.0T / Limited 2.0T 18in", s: "235/45R18" },
    { y: [2020, 2023], t: "SE / Hybrid Blue 16in", s: "205/65R16" },
    { y: [2020, 2023], t: "SEL / Hybrid SEL / Hybrid Limited 17in", s: "215/55R17" },
    { y: [2020, 2023], t: "Limited 18in", s: "235/45R18" },
    { y: [2020, 2023], t: "SEL Plus / N Line 19in", s: "245/40R19" },
    { y: [2024, 2026], t: "SEL / Hybrid SEL / Hybrid Limited 17in", s: "215/55R17" },
    { y: [2024, 2026], t: "SEL / Limited 18in", s: "235/45R18" },
    { y: [2024, 2026], t: "N Line 19in", s: "245/40R19" }
  ],
  "hyundai|santa fe": [
    { y: [2012, 2012], t: "GLS (old gen)", s: "235/65R17" },
    { y: [2012, 2012], t: "SE / Limited (old gen)", s: "235/60R18" },
    { y: [2013, 2018], t: "Santa Fe Sport base 17in", s: "235/65R17" },
    { y: [2013, 2018], t: "Santa Fe Sport 2.0T / Santa Fe GLS / SE / Limited 18in", s: "235/60R18" },
    { y: [2013, 2018], t: "Santa Fe Sport 2.0T / Santa Fe Limited Ultimate 19in", s: "235/55R19" },
    { y: [2019, 2020], t: "SE / SEL 17in", s: "235/65R17" },
    { y: [2019, 2020], t: "SEL / Limited 18in", s: "235/60R18" },
    { y: [2019, 2020], t: "Limited 2.0T / SEL 2.0T 19in", s: "235/55R19" },
    { y: [2021, 2023], t: "SE / SEL / XRT 18in (Hybrid Blue 17in)", s: "235/60R18" },
    { y: [2021, 2023], t: "Limited / Hybrid Limited / PHEV 19in", s: "235/55R19" },
    { y: [2021, 2023], t: "Calligraphy 20in", s: "255/45R20" },
    { y: [2024, 2026], t: "SE / SEL / Hybrid SEL 18in", s: "235/60R18" },
    { y: [2024, 2026], t: "XRT 18in", s: "245/60R18" },
    { y: [2024, 2026], t: "Limited / Hybrid Limited / Hybrid Calligraphy 20in", s: "255/45R20" },
    { y: [2024, 2026], t: "Calligraphy 21in", s: "245/45R21" }
  ],
  "kia|soul": [
    { y: [2012, 2013], t: "Base 15in", s: "195/65R15" },
    { y: [2012, 2013], t: "+ (Plus) 16in", s: "205/55R16" },
    { y: [2012, 2013], t: "! (Exclaim) 18in", s: "235/45R18" },
    { y: [2014, 2019], t: "Base 16in", s: "205/60R16" },
    { y: [2014, 2019], t: "+ (Plus) 17in", s: "215/55R17" },
    { y: [2014, 2019], t: "! (Exclaim) / + 18in", s: "235/45R18" },
    { y: [2020, 2025], t: "LX / S 16in", s: "205/60R16" },
    { y: [2020, 2025], t: "EX 17in", s: "215/55R17" },
    { y: [2020, 2025], t: "GT-Line / X-Line / Turbo 18in", s: "235/45R18" }
  ],
  "kia|forte": [
    { y: [2012, 2013], t: "LX", s: "195/65R15" },
    { y: [2012, 2013], t: "EX", s: "205/55R16" },
    { y: [2012, 2013], t: "SX", s: "215/45R17" },
    { y: [2014, 2018], t: "LX", s: "195/65R15" },
    { y: [2014, 2018], t: "EX / LX 16in", s: "205/55R16" },
    { y: [2014, 2018], t: "EX / S / SX 17in", s: "215/45R17" },
    { y: [2017, 2018], t: "Forte5 SX Turbo", s: "225/40ZR18" },
    { y: [2019, 2024], t: "FE / LX", s: "195/65R15" },
    { y: [2019, 2024], t: "LXS / EX", s: "205/55R16" },
    { y: [2019, 2024], t: "GT-Line", s: "225/45ZR17" },
    { y: [2020, 2024], t: "GT (1.6T)", s: "225/40ZR18" }
  ],
  "subaru|forester": [
    { y: [2012, 2013], t: "2.5X", s: "215/65R16" },
    { y: [2012, 2013], t: "2.5X Premium / Limited / Touring / XT", s: "225/55R17" },
    { y: [2014, 2018], t: "2.5i / Premium / Limited / Touring", s: "225/60R17" },
    { y: [2014, 2018], t: "2.0XT Premium / Touring", s: "225/55R18" },
    { y: [2019, 2024], t: "Base / Premium", s: "225/60R17" },
    { y: [2019, 2024], t: "Sport / Limited / Touring", s: "225/55R18" },
    { y: [2022, 2024], t: "Wilderness", s: "225/60R17" },
    { y: [2025, 2026], t: "Base / Premium", s: "225/60R17" },
    { y: [2025, 2026], t: "Limited / Premium Hybrid / Limited Hybrid", s: "225/55R18" },
    { y: [2025, 2026], t: "Sport / Touring (incl. Hybrid)", s: "235/50R19" }
  ],
  "subaru|crosstrek": [
    { y: [2013, 2017], t: "2.0i / Premium / Limited / Hybrid", s: "225/55R17" },
    { y: [2018, 2023], t: "Base / Premium / Sport", s: "225/60R17" },
    { y: [2018, 2023], t: "Limited / Hybrid", s: "225/55R18" },
    { y: [2024, 2026], t: "Base / Premium / Wilderness", s: "225/60R17" },
    { y: [2024, 2026], t: "Sport / Limited", s: "225/55R18" }
  ],
  "mazda|cx-5": [
    { y: [2013, 2016], t: "Sport / Touring", s: "225/65R17" },
    { y: [2013, 2016], t: "Grand Touring", s: "225/55R19" },
    { y: [2017, 2026], t: "Sport / Touring / 2.5 S / S Select", s: "225/65R17" },
    { y: [2017, 2026], t: "Grand Touring / Signature / Preferred / Premium / Carbon / Turbo", s: "225/55R19" }
  ],
  "mazda|mazda3": [
    { y: [2012, 2013], t: "i Touring / i Grand Touring", s: "205/55R16" },
    { y: [2012, 2013], t: "s Touring / s Grand Touring", s: "205/50R17" },
    { y: [2012, 2013], t: "Mazdaspeed3", s: "225/40R18" },
    { y: [2014, 2018], t: "i SV / i Sport / i Touring", s: "205/60R16" },
    { y: [2014, 2018], t: "s Touring / s Grand Touring", s: "215/45R18" },
    { y: [2019, 2026], t: "Base / 2.5 S", s: "205/60R16" },
    { y: [2019, 2026], t: "Select / Preferred / Premium / Carbon / Turbo", s: "215/45R18" }
  ],
  "volkswagen|jetta": [
    { y: [2012, 2014], t: "GLI", s: "225/45R17" },
    { y: [2012, 2016], t: "S", s: "195/65R15" },
    { y: [2012, 2018], t: "SE / TDI", s: "205/55R16" },
    { y: [2012, 2018], t: "SEL / Sport", s: "225/45R17" },
    { y: [2015, 2018], t: "GLI", s: "225/40R18" },
    { y: [2019, 2026], t: "S (and 2019-2021 SE)", s: "205/60R16" },
    { y: [2019, 2026], t: "SE / Sport / R-Line / SEL (to 2024)", s: "205/55R17" },
    { y: [2019, 2026], t: "GLI", s: "225/45R18" },
    { y: [2025, 2026], t: "SEL", s: "225/45R18" }
  ],
  "volkswagen|tiguan": [
    { y: [2012, 2017], t: "S", s: "215/65R16" },
    { y: [2012, 2017], t: "SE / SEL 18in", s: "235/50R18" },
    { y: [2013, 2017], t: "R-Line (19in)", s: "255/40R19" },
    { y: [2018, 2020], t: "SEL / SEL R-Line", s: "235/55R18" },
    { y: [2018, 2021], t: "SEL Premium / SEL 19in", s: "235/50R19" },
    { y: [2018, 2024], t: "S (and 2018-2021 SE)", s: "215/65R17" },
    { y: [2018, 2024], t: "SEL Premium R-Line / SEL R-Line 20in", s: "255/40R20" },
    { y: [2022, 2024], t: "SE", s: "235/55R18" }
  ],
  "honda|odyssey": [
    { y: [2012, 2017], t: "LX / EX / EX-L", s: "235/65R17" },
    { y: [2012, 2017], t: "Touring / Touring Elite", s: "235/60R18" },
    { y: [2018, 2024], t: "LX / EX / EX-L / Touring", s: "235/60R18" },
    { y: [2018, 2024], t: "Elite", s: "235/55R19" },
    { y: [2025, 2026], t: "EX-L", s: "235/60R18" },
    { y: [2025, 2026], t: "Sport-L / Touring / Elite", s: "235/55R19" }
  ],
  "toyota|sienna": [
    { y: [2012, 2020], t: "L / LE / XLE (FWD)", s: "235/60R17" },
    { y: [2012, 2020], t: "Limited / AWD", s: "235/55R18" },
    { y: [2012, 2020], t: "SE", s: "235/50R19" },
    { y: [2021, 2026], t: "LE / XLE", s: "235/65R17" },
    { y: [2021, 2026], t: "Limited / Woodland / XSE AWD / Platinum AWD", s: "235/60R18" },
    { y: [2021, 2026], t: "XSE FWD / Platinum FWD", s: "235/50R20" }
  ],
  "toyota|4runner": [
    { y: [2012, 2024], t: "SR5 / Trail / TRD Off-Road / TRD Pro", s: "265/70R17" },
    { y: [2012, 2024], t: "Limited / Nightshade", s: "245/60R20" },
    { y: [2022, 2024], t: "TRD Sport", s: "245/60R20" },
    { y: [2025, 2026], t: "SR5", s: "245/70R17" },
    { y: [2025, 2026], t: "TRD Off-Road / TRD Pro / Trailhunter", s: "265/70R18" },
    { y: [2025, 2026], t: "TRD Sport / Limited / Platinum", s: "265/55R20" }
  ],
  "toyota|tundra": [
    { y: [2012, 2013], t: "Tundra / Grade 18in", s: "255/70R18" },
    { y: [2012, 2013], t: "TRD Off-Road 18in", s: "275/65R18" },
    { y: [2012, 2013], t: "Limited / 20in", s: "275/55R20" },
    { y: [2014, 2021], t: "SR / SR5", s: "255/70R18" },
    { y: [2014, 2021], t: "TRD Off-Road / TRD Pro", s: "275/65R18" },
    { y: [2014, 2021], t: "Limited / Platinum / 1794 / TRD Sport", s: "275/55R20" },
    { y: [2022, 2026], t: "SR", s: "245/75R18" },
    { y: [2022, 2026], t: "SR5 / TRD Off-Road 18in", s: "265/70R18" },
    { y: [2022, 2026], t: "SR5 20in / Limited / Platinum / 1794", s: "265/60R20" },
    { y: [2022, 2026], t: "TRD Pro", s: "285/65R18" },
    { y: [2022, 2026], t: "Capstone 22in", s: "265/50R22" }
  ],
  "chevrolet|colorado": [
    { y: [2012, 2012], t: "WT / LT 2WD", s: "215/70R16" },
    { y: [2012, 2012], t: "WT / LT 4WD", s: "235/75R16" },
    { y: [2012, 2012], t: "LT Z71", s: "265/70R17" },
    { y: [2015, 2022], t: "Base / WT 16in", s: "265/70R16" },
    { y: [2015, 2022], t: "WT / LT / Z71 17in", s: "255/65R17" },
    { y: [2015, 2022], t: "LT / Z71 18in", s: "265/60R18" },
    { y: [2017, 2022], t: "ZR2", s: "265/65R17" },
    { y: [2023, 2026], t: "WT / LT", s: "255/65R17" },
    { y: [2023, 2026], t: "LT 18in", s: "265/60R18" },
    { y: [2023, 2026], t: "Z71", s: "265/65R18" },
    { y: [2023, 2026], t: "ZR2", s: "LT285/70R17" },
    { y: [2024, 2026], t: "ZR2 Bison", s: "LT315/70R17" }
  ],
  "ford|ranger": [
    { y: [2019, 2023], t: "XL", s: "255/70R16" },
    { y: [2019, 2023], t: "XL / XLT 17in", s: "255/65R17" },
    { y: [2019, 2023], t: "FX4 off-road", s: "265/65R17" },
    { y: [2019, 2023], t: "XLT / Lariat 18in", s: "265/60R18" },
    { y: [2024, 2026], t: "XL / XLT", s: "255/70R17" },
    { y: [2024, 2026], t: "XLT 18in / Lariat", s: "255/65R18" },
    { y: [2024, 2026], t: "Raptor", s: "LT285/70R17" }
  ],
  "ford|fusion": [
    { y: [2012, 2012], t: "S", s: "205/60R16" },
    { y: [2012, 2012], t: "SE / SEL / Hybrid", s: "225/50R17" },
    { y: [2012, 2012], t: "SEL 18in / Sport", s: "225/45R18" },
    { y: [2013, 2016], t: "Hybrid / Energi", s: "225/50R17" },
    { y: [2013, 2020], t: "S", s: "215/60R16" },
    { y: [2013, 2020], t: "SE", s: "235/50R17" },
    { y: [2013, 2020], t: "SE 18in / SEL / Titanium", s: "235/45R18" },
    { y: [2013, 2020], t: "Titanium 19in / V6 Sport", s: "235/40R19" }
  ],
  "ford|focus": [
    { y: [2012, 2018], t: "S", s: "195/65R15" },
    { y: [2012, 2018], t: "SE", s: "215/55R16" },
    { y: [2012, 2018], t: "SE 17in / SEL / Titanium", s: "215/50R17" },
    { y: [2012, 2018], t: "Electric", s: "225/50R17" },
    { y: [2012, 2018], t: "Titanium 18in", s: "235/40R18" },
    { y: [2013, 2018], t: "ST", s: "235/40R18" },
    { y: [2016, 2018], t: "RS", s: "235/35R19" }
  ],
  "dodge|grand caravan": [
    { y: [2012, 2013], t: "SE / SXT 16in", s: "225/65R16" },
    { y: [2012, 2020], t: "SE / SXT / Crew / R/T / GT 17in", s: "225/65R17" }
  ],
  "jeep|cherokee": [
    { y: [2014, 2023], t: "Sport / Latitude FWD", s: "225/60R17" },
    { y: [2014, 2023], t: "Sport / Latitude 4x4", s: "225/65R17" },
    { y: [2014, 2023], t: "Limited / Altitude FWD", s: "225/55R18" },
    { y: [2014, 2023], t: "Limited / Altitude 4x4", s: "225/60R18" },
    { y: [2014, 2023], t: "Trailhawk", s: "245/65R17" },
    { y: [2019, 2023], t: "High Altitude / Overland 19in", s: "235/50R19" }
  ],
  "chevrolet|cruze": [
    { y: [2012, 2016], t: "LS / 1LT", s: "215/60R16" },
    { y: [2012, 2016], t: "Eco / Diesel", s: "215/55R17" },
    { y: [2012, 2016], t: "LT 17in", s: "225/50R17" },
    { y: [2012, 2016], t: "LTZ / RS 18in", s: "225/45R18" },
    { y: [2016, 2019], t: "L / LS", s: "195/65R15" },
    { y: [2016, 2019], t: "LT / Diesel", s: "205/55R16" },
    { y: [2016, 2019], t: "LT 17in / Premier", s: "225/45R17" },
    { y: [2016, 2019], t: "Premier / RS 18in", s: "225/40R18" }
  ],
  "nissan|versa": [
    { y: [2012, 2012], t: "Hatchback SL 16in", s: "195/55R16" },
    { y: [2012, 2019], t: "S / SV / SL", s: "185/65R15" },
    { y: [2020, 2025], t: "S", s: "195/65R15" },
    { y: [2020, 2025], t: "SV", s: "205/55R16" },
    { y: [2020, 2025], t: "SR", s: "205/50R17" }
  ],
  "lexus|rx": [
    { y: [2012, 2015], t: "RX 350 / RX 450h", s: "235/60R18" },
    { y: [2012, 2015], t: "19in / F Sport", s: "235/55R19" },
    { y: [2016, 2022], t: "RX 350 / 450h / L", s: "235/65R18" },
    { y: [2016, 2022], t: "20in / F Sport", s: "235/55R20" },
    { y: [2023, 2026], t: "RX 350 / 350h / 450h+", s: "235/60R19" },
    { y: [2023, 2026], t: "Luxury / F Sport / 500h", s: "235/50R21" }
  ],
  "honda|hr-v": [
    { y: [2016, 2022], t: "LX / EX / EX-L", s: "215/55R17" },
    { y: [2019, 2022], t: "Sport / Touring 18in", s: "225/50R18" },
    { y: [2023, 2026], t: "LX / EX-L", s: "215/60R17" },
    { y: [2023, 2026], t: "Sport", s: "225/55R18" }
  ],
  "honda|fit": [
    { y: [2012, 2013], t: "Base", s: "175/65R15" },
    { y: [2012, 2013], t: "Sport", s: "185/55R16" },
    { y: [2015, 2020], t: "LX", s: "185/60R15" },
    { y: [2015, 2020], t: "EX / EX-L / Sport", s: "185/55R16" }
  ],
  "honda|ridgeline": [
    { y: [2012, 2014], t: "RT / RTS", s: "245/65R17" },
    { y: [2012, 2014], t: "Sport / RTL", s: "245/60R18" },
    { y: [2017, 2026], t: "All trims (RT/Sport/RTL/RTL-E/Black Ed./TrailSport)", s: "245/60R18" }
  ],
  "toyota|yaris": [
    { y: [2012, 2018], t: "Hatchback L / LE", s: "175/65R15" },
    { y: [2012, 2018], t: "Hatchback SE", s: "195/50R16" },
    { y: [2017, 2020], t: "Sedan/iA & 2020 Hatch LE / XLE", s: "185/60R16" },
    { y: [2019, 2020], t: "Sedan L", s: "185/65R15" }
  ],
  "toyota|avalon": [
    { y: [2012, 2012], t: "Base / Limited", s: "215/55R17" },
    { y: [2013, 2018], t: "XLE / Hybrid", s: "215/55R17" },
    { y: [2013, 2018], t: "Touring / Limited", s: "225/45R18" },
    { y: [2019, 2022], t: "XLE / Hybrid XLE", s: "215/55R17" },
    { y: [2019, 2022], t: "Limited / Hybrid Limited", s: "235/45R18" },
    { y: [2019, 2022], t: "XSE / Touring / TRD", s: "235/40R19" }
  ],
  "lexus|es": [
    { y: [2012, 2018], t: "ES 350 / ES 300h", s: "215/55R17" },
    { y: [2013, 2018], t: "ES 350 18in", s: "225/45R18" },
    { y: [2019, 2026], t: "ES 250 / 300h / 350 base", s: "215/55R17" },
    { y: [2019, 2026], t: "Luxury / Ultra Luxury 18in", s: "235/45R18" },
    { y: [2019, 2026], t: "F Sport 19in", s: "235/40R19" }
  ],
  "lexus|is": [
    { y: [2012, 2013], t: "IS 250/350 AWD", s: "225/45R17" },
    { y: [2012, 2013], t: "IS 250/350 RWD 17in", s: "225/45R17", r: "245/45R17" },
    { y: [2012, 2014], t: "IS F", s: "225/40R19", r: "255/35R19" },
    { y: [2014, 2020], t: "IS 250 / 200t / 300 base", s: "225/45R17" },
    { y: [2014, 2020], t: "F Sport / IS 350 18in", s: "225/40R18", r: "255/35R18" },
    { y: [2021, 2026], t: "IS 300 / IS 350 base", s: "235/45R18" },
    { y: [2021, 2026], t: "IS 350 F Sport RWD / IS 500", s: "235/40R19", r: "265/35R19" }
  ],
  "lexus|nx": [
    { y: [2015, 2021], t: "NX 200t/300/300h base", s: "225/65R17" },
    { y: [2015, 2021], t: "18in / F Sport", s: "225/60R18" },
    { y: [2022, 2026], t: "NX 250 / 350 / 350h", s: "235/60R18" },
    { y: [2022, 2026], t: "F Sport / 450h+ / 20in", s: "235/50R20" }
  ],
  "nissan|pathfinder": [
    { y: [2012, 2012], t: "S", s: "245/75R16" },
    { y: [2012, 2012], t: "SV / Silver Edition", s: "265/65R17" },
    { y: [2012, 2012], t: "LE", s: "265/60R18" },
    { y: [2013, 2020], t: "S / SV / SL", s: "235/65R18" },
    { y: [2013, 2020], t: "Platinum", s: "235/55R20" },
    { y: [2022, 2026], t: "S / SV / SL", s: "255/60R18" },
    { y: [2022, 2026], t: "SL 20in / Platinum", s: "255/50R20" },
    { y: [2023, 2026], t: "Rock Creek", s: "265/60R18" }
  ],
  "nissan|maxima": [
    { y: [2012, 2014], t: "S / SV", s: "245/45R18" },
    { y: [2012, 2014], t: "SV Sport / Premium 19in", s: "245/40R19" },
    { y: [2016, 2023], t: "S / SV / SL", s: "245/45R18" },
    { y: [2016, 2023], t: "SR / Platinum", s: "245/40R19" }
  ],
  "nissan|murano": [
    { y: [2012, 2014], t: "S / SV / LE 18in", s: "235/65R18" },
    { y: [2012, 2014], t: "LE 20in / CrossCabriolet", s: "235/55R20" },
    { y: [2015, 2018], t: "S / SV / SL", s: "235/65R18" },
    { y: [2015, 2018], t: "Platinum", s: "235/55R20" },
    { y: [2019, 2024], t: "S / SV", s: "235/65R18" },
    { y: [2019, 2024], t: "SL / Platinum", s: "235/55R20" },
    { y: [2025, 2026], t: "SV / SL", s: "255/55R20" },
    { y: [2025, 2026], t: "Platinum", s: "255/50R21" }
  ],
  "nissan|titan": [
    { y: [2012, 2015], t: "S / SV", s: "265/70R18" },
    { y: [2012, 2015], t: "PRO-4X", s: "275/70R18" },
    { y: [2012, 2015], t: "SL", s: "275/60R20" },
    { y: [2016, 2024], t: "Titan XD S / SV", s: "LT245/75R17" },
    { y: [2016, 2024], t: "Titan XD PRO-4X", s: "LT275/65R18" },
    { y: [2016, 2024], t: "Titan XD SL / Platinum Reserve", s: "LT265/60R20" },
    { y: [2017, 2024], t: "S / SV", s: "265/70R18" },
    { y: [2017, 2024], t: "PRO-4X", s: "275/70R18" },
    { y: [2017, 2024], t: "SV 20in / SL / Platinum Reserve", s: "275/60R20" }
  ],
  "nissan|kicks": [
    { y: [2018, 2024], t: "S", s: "205/60R16" },
    { y: [2018, 2024], t: "SV / SR", s: "205/55R17" },
    { y: [2025, 2026], t: "Kicks Play (prev gen)", s: "205/60R16" },
    { y: [2025, 2026], t: "S", s: "215/65R16" },
    { y: [2025, 2026], t: "SV", s: "215/60R17" },
    { y: [2025, 2026], t: "SR", s: "225/45R19" }
  ],
  "infiniti|q50": [
    { y: [2014, 2024], t: "Base / Premium / Pure 17in", s: "225/55R17" },
    { y: [2014, 2024], t: "Sport / Hybrid / Sensory 19in", s: "245/40R19" },
    { y: [2016, 2024], t: "Red Sport 400 RWD", s: "245/40R19", r: "265/35R19" },
    { y: [2016, 2024], t: "Red Sport 400 AWD", s: "245/40R19" },
    { y: [2018, 2024], t: "Luxe 18in", s: "225/50R18" }
  ],
  "chevrolet|suburban": [
    { y: [2012, 2013], t: "2500", s: "LT245/75R16" },
    { y: [2012, 2014], t: "LS / LT", s: "265/70R17" },
    { y: [2012, 2014], t: "LTZ / Z71 18in", s: "265/65R18" },
    { y: [2012, 2014], t: "20in option", s: "275/55R20" },
    { y: [2015, 2020], t: "LS / LT", s: "265/65R18" },
    { y: [2015, 2020], t: "LT / LTZ / Premier 20in", s: "275/55R20" },
    { y: [2015, 2020], t: "22in option", s: "285/45R22" },
    { y: [2021, 2026], t: "LS / LT", s: "265/65R18" },
    { y: [2021, 2026], t: "LT / Z71 / Premier 20in", s: "275/60R20" },
    { y: [2021, 2026], t: "RST / High Country 22in", s: "275/50R22" },
    { y: [2025, 2026], t: "RST / High Country 24in", s: "285/40R24" }
  ],
  "chevrolet|camaro": [
    { y: [2012, 2015], t: "LS / LT 18in", s: "245/55R18" },
    { y: [2012, 2015], t: "LT 19in", s: "245/50R19" },
    { y: [2012, 2015], t: "LT RS / SS 20in", s: "245/45ZR20", r: "275/40ZR20" },
    { y: [2012, 2015], t: "ZL1", s: "285/35ZR20", r: "305/35ZR20" },
    { y: [2013, 2015], t: "SS 1LE", s: "285/35ZR20" },
    { y: [2014, 2015], t: "Z/28", s: "305/30ZR19" },
    { y: [2016, 2024], t: "LS / LT 18in", s: "245/50R18" },
    { y: [2016, 2024], t: "LT RS 20in", s: "245/40R20" },
    { y: [2016, 2024], t: "SS", s: "245/40ZR20", r: "275/35ZR20" },
    { y: [2017, 2024], t: "SS 1LE / ZL1", s: "285/30ZR20", r: "305/30ZR20" },
    { y: [2018, 2024], t: "ZL1 1LE", s: "305/30ZR19", r: "325/30ZR19" },
    { y: [2019, 2024], t: "LT 1LE", s: "245/40R20", r: "275/35R20" }
  ],
  "chevrolet|impala": [
    { y: [2012, 2016], t: "LS (2014-16 = Impala Limited)", s: "225/60R16" },
    { y: [2012, 2016], t: "LTZ (2014-16 = Impala Limited)", s: "235/50R18" },
    { y: [2014, 2020], t: "LS / LT", s: "235/50R18" },
    { y: [2014, 2020], t: "LT / LTZ / Premier 19in", s: "245/45R19" },
    { y: [2014, 2020], t: "LTZ / Premier 20in", s: "245/40R20" }
  ],
  "chevrolet|trax": [
    { y: [2015, 2016], t: "LS / LT", s: "205/70R16" },
    { y: [2015, 2016], t: "LTZ", s: "215/55R18" },
    { y: [2017, 2022], t: "LS / LT", s: "205/70R16" },
    { y: [2017, 2022], t: "LT 18in / Premier", s: "215/55R18" },
    { y: [2024, 2026], t: "LS / LT", s: "225/60R17" },
    { y: [2024, 2026], t: "1RS / 2RS / ACTIV", s: "225/55R18" },
    { y: [2024, 2026], t: "2RS 19in", s: "245/45R19" }
  ],
  "chevrolet|blazer": [
    { y: [2019, 2026], t: "L / LT", s: "235/65R18" },
    { y: [2019, 2026], t: "LT 20in / RS / Premier", s: "235/55R20" },
    { y: [2019, 2026], t: "RS / Premier 21in", s: "265/45R21" }
  ],
  "chevrolet|express": [
    { y: [2012, 2014], t: "1500", s: "P245/70R17" },
    { y: [2012, 2026], t: "2500 / 3500", s: "LT245/75R16" }
  ],
  "chevrolet|corvette": [
    { y: [2012, 2013], t: "Coupe / Convertible (base, Z51)", s: "P245/40ZR18", r: "P285/35ZR19" },
    { y: [2012, 2013], t: "Grand Sport / Z06 / 427", s: "P275/35ZR18", r: "P325/30ZR19" },
    { y: [2012, 2013], t: "ZR1", s: "P285/30ZR19", r: "P335/25ZR20" },
    { y: [2014, 2019], t: "Stingray (base 18/19in)", s: "245/40ZR18", r: "285/35ZR19" },
    { y: [2014, 2019], t: "Stingray Z51", s: "245/35ZR19", r: "285/30ZR20" },
    { y: [2015, 2019], t: "Z06 / Grand Sport (2017+) / ZR1 (2019)", s: "285/30ZR19", r: "335/25ZR20" },
    { y: [2020, 2026], t: "Stingray / Z51", s: "245/35ZR19", r: "305/30ZR20" },
    { y: [2023, 2026], t: "Z06 / E-Ray (2024+) / ZR1 (2025+)", s: "275/30ZR20", r: "345/25ZR21" }
  ],
  "chevrolet|bolt ev": [
    { y: [2017, 2023], t: "LT / Premier (and Bolt EUV 2022-23)", s: "215/50R17" }
  ],
  "gmc|yukon": [
    { y: [2012, 2014], t: "SLE / SLT", s: "P265/70R17" },
    { y: [2012, 2014], t: "SLT 20in / Denali", s: "P275/55R20" },
    { y: [2015, 2020], t: "SLE / SLT 18in", s: "265/65R18" },
    { y: [2015, 2020], t: "SLT / Denali 20in", s: "275/55R20" },
    { y: [2015, 2020], t: "Denali 22in", s: "285/45R22" },
    { y: [2021, 2024], t: "SLE 18in", s: "265/65R18" },
    { y: [2021, 2024], t: "SLT / AT4 / Denali 20in", s: "275/60R20" },
    { y: [2021, 2024], t: "SLT / Denali 22in", s: "275/50R22" },
    { y: [2025, 2026], t: "Elevation / AT4 / Denali 20in", s: "275/60R20" },
    { y: [2025, 2026], t: "Elevation / Denali 22in", s: "275/50R22" },
    { y: [2025, 2026], t: "Denali Ultimate 24in", s: "285/40R24" }
  ],
  "gmc|acadia": [
    { y: [2012, 2016], t: "SL / SLE 18in", s: "255/65R18" },
    { y: [2012, 2016], t: "SLT 19in", s: "255/60R19" },
    { y: [2012, 2016], t: "Denali / 20in", s: "255/55R20" },
    { y: [2017, 2023], t: "SL / SLE 17in", s: "245/65R17" },
    { y: [2017, 2023], t: "SLE / SLT 18in", s: "235/65R18" },
    { y: [2017, 2023], t: "SLT / Denali 20in", s: "235/55R20" },
    { y: [2020, 2023], t: "AT4 17in", s: "255/65R17" },
    { y: [2024, 2026], t: "Elevation 20in", s: "255/55R20" },
    { y: [2024, 2026], t: "AT4", s: "265/65R18" },
    { y: [2024, 2026], t: "Denali 22in", s: "275/45R22" }
  ],
  "gmc|terrain": [
    { y: [2012, 2017], t: "SLE / SLT 17in", s: "235/60R17" },
    { y: [2012, 2017], t: "SLT / Denali 18in", s: "235/55R18" },
    { y: [2013, 2017], t: "Denali / SLT 19in", s: "235/55R19" },
    { y: [2018, 2024], t: "SL / SLE 17in", s: "225/65R17" },
    { y: [2018, 2024], t: "SLE / SLT 18in", s: "225/60R18" },
    { y: [2018, 2024], t: "Denali / 19in", s: "235/50R19" },
    { y: [2025, 2026], t: "Elevation / AT4 17in", s: "235/65R17" },
    { y: [2025, 2026], t: "Elevation Premium / Denali 19in", s: "235/55R19" }
  ],
  "gmc|canyon": [
    { y: [2015, 2022], t: "Base / SL", s: "265/70R16" },
    { y: [2015, 2022], t: "SLE 17in", s: "255/65R17" },
    { y: [2015, 2022], t: "All Terrain / AT4 17in", s: "265/65R17" },
    { y: [2015, 2022], t: "SLE / SLT 18in", s: "265/60R18" },
    { y: [2015, 2022], t: "Denali 20in", s: "255/55R20" },
    { y: [2023, 2026], t: "Elevation", s: "265/65R18" },
    { y: [2023, 2026], t: "AT4", s: "275/65R18" },
    { y: [2023, 2026], t: "Denali / AT4 20in", s: "275/60R20" },
    { y: [2023, 2026], t: "AT4X", s: "LT285/70R17" }
  ],
  "cadillac|escalade": [
    { y: [2012, 2014], t: "Base 18in", s: "P265/65R18" },
    { y: [2012, 2014], t: "Luxury / Premium / Platinum 22in", s: "P285/45R22" },
    { y: [2015, 2020], t: "Base 20in", s: "275/55R20" },
    { y: [2015, 2020], t: "Luxury / Premium / Platinum 22in", s: "285/45R22" },
    { y: [2021, 2026], t: "Luxury / Premium Luxury / Sport / Platinum 22in", s: "275/50R22" },
    { y: [2025, 2026], t: "24in option / V", s: "285/40R24" }
  ],
  "cadillac|xt5": [
    { y: [2017, 2025], t: "Base / Luxury 18in", s: "235/65R18" },
    { y: [2017, 2025], t: "Premium Luxury / Sport / Platinum 20in", s: "235/55R20" }
  ],
  "buick|enclave": [
    { y: [2012, 2017], t: "Base / Convenience 18in", s: "255/65R18" },
    { y: [2012, 2017], t: "Leather 19in", s: "255/60R19" },
    { y: [2012, 2017], t: "Premium 20in", s: "255/55R20" },
    { y: [2018, 2024], t: "Preferred / Essence / Premium 18in", s: "255/65R18" },
    { y: [2018, 2024], t: "Essence / Premium / Avenir 20in", s: "255/55R20" },
    { y: [2025, 2026], t: "Preferred / Sport Touring 20in", s: "255/55R20" },
    { y: [2025, 2026], t: "Avenir 22in", s: "275/45R22" }
  ],
  "buick|encore": [
    { y: [2013, 2022], t: "All trims", s: "215/55R18" }
  ],
  "ford|f-250": [
    { y: [2012, 2016], t: "XL 17in", s: "LT245/75R17" },
    { y: [2012, 2016], t: "XLT / Lariat 18in", s: "LT275/65R18" },
    { y: [2012, 2016], t: "FX4 18in", s: "LT275/70R18" },
    { y: [2012, 2016], t: "King Ranch / Platinum 20in", s: "LT275/65R20" },
    { y: [2017, 2022], t: "XL 17in", s: "LT245/75R17" },
    { y: [2017, 2022], t: "XLT / Lariat 18in", s: "LT275/65R18" },
    { y: [2017, 2022], t: "FX4 18in", s: "LT275/70R18" },
    { y: [2017, 2022], t: "King Ranch / Platinum / Limited 20in", s: "LT275/65R20" },
    { y: [2020, 2022], t: "Tremor", s: "LT285/75R18" },
    { y: [2023, 2026], t: "XL 17in", s: "LT245/75R17" },
    { y: [2023, 2026], t: "XL Off-Road pkg", s: "LT285/70R17" },
    { y: [2023, 2026], t: "XLT 18in", s: "LT275/65R18" },
    { y: [2023, 2026], t: "XLT / Lariat 18in", s: "LT275/70R18" },
    { y: [2023, 2026], t: "Tremor", s: "LT285/75R18" },
    { y: [2023, 2026], t: "Lariat / King Ranch / Platinum / Limited 20in", s: "LT275/65R20" }
  ],
  "ford|expedition": [
    { y: [2012, 2014], t: "XLT 18in", s: "275/65R18" },
    { y: [2012, 2014], t: "XLT / Limited / King Ranch 20in", s: "275/55R20" },
    { y: [2015, 2017], t: "XL / XLT 18in", s: "275/65R18" },
    { y: [2015, 2017], t: "XLT / Limited / King Ranch 20in", s: "275/55R20" },
    { y: [2015, 2017], t: "Platinum / 22in", s: "285/45R22" },
    { y: [2018, 2024], t: "XL / XLT 18in", s: "275/65R18" },
    { y: [2018, 2024], t: "XLT / Limited 20in", s: "275/55R20" },
    { y: [2018, 2024], t: "Limited 22in / King Ranch / Platinum", s: "285/45R22" },
    { y: [2022, 2024], t: "Timberline", s: "265/70R18" },
    { y: [2025, 2026], t: "Active 18in", s: "265/70R18" },
    { y: [2025, 2026], t: "Active / Platinum 20in", s: "275/60R20" },
    { y: [2025, 2026], t: "King Ranch / Platinum 22in", s: "275/50R22" },
    { y: [2025, 2026], t: "Platinum 24in", s: "285/40R24" },
    { y: [2025, 2026], t: "Tremor", s: "275/70R18" }
  ],
  "ford|transit": [
    { y: [2015, 2026], t: "T-150 / T-250 / T-350 SRW (incl. AWD)", s: "LT235/65R16" }
  ],
  "ford|bronco": [
    { y: [2021, 2026], t: "Base", s: "255/70R16" },
    { y: [2021, 2026], t: "Big Bend", s: "255/75R17" },
    { y: [2021, 2026], t: "Black Diamond", s: "LT265/70R17" },
    { y: [2021, 2026], t: "Outer Banks 18in", s: "255/70R18" },
    { y: [2021, 2026], t: "Badlands", s: "LT285/70R17" },
    { y: [2021, 2026], t: "Wildtrak / Sasquatch pkg / Everglades / Heritage", s: "LT315/70R17" }
  ],
  "ford|bronco sport": [
    { y: [2021, 2026], t: "Base / Big Bend / Heritage / Free Wheeling / Badlands", s: "225/65R17" },
    { y: [2021, 2026], t: "Outer Banks 18in", s: "225/60R18" },
    { y: [2025, 2026], t: "Badlands Sasquatch pkg", s: "235/65R17" }
  ],
  "ford|maverick": [
    { y: [2022, 2024], t: "XLT / Lariat 18in", s: "225/60R18" },
    { y: [2022, 2026], t: "XL / XLT 17in", s: "225/65R17" },
    { y: [2022, 2026], t: "FX4 pkg / Tremor", s: "235/65R17" },
    { y: [2025, 2026], t: "XLT / Lariat / Lobo 19in", s: "225/55R19" }
  ],
  "ford|mustang mach-e": [
    { y: [2021, 2023], t: "Select 18in / California Route 1", s: "225/60R18" },
    { y: [2021, 2026], t: "Select / Premium 19in", s: "225/55R19" },
    { y: [2021, 2026], t: "GT", s: "245/45R20" },
    { y: [2024, 2026], t: "Rally", s: "235/55R19" }
  ],
  "lincoln|navigator": [
    { y: [2012, 2014], t: "Base 18in", s: "255/70R18" },
    { y: [2012, 2014], t: "20in", s: "275/55R20" },
    { y: [2015, 2017], t: "Select / Reserve 20in", s: "275/55R20" },
    { y: [2015, 2017], t: "Select / Reserve 22in", s: "285/45R22" },
    { y: [2018, 2024], t: "Standard / Select 20in", s: "275/55R20" },
    { y: [2018, 2024], t: "Reserve / Black Label 22in", s: "285/45R22" },
    { y: [2025, 2026], t: "Reserve / Black Label 22in", s: "275/50R22" },
    { y: [2025, 2026], t: "24in", s: "285/40R24" }
  ],
  "jeep|compass": [
    { y: [2012, 2016], t: "Sport / Latitude 16in", s: "205/70R16" },
    { y: [2012, 2016], t: "Sport / Latitude 17in", s: "215/60R17" },
    { y: [2012, 2016], t: "Freedom Drive II / Trailhawk", s: "215/65R17" },
    { y: [2012, 2016], t: "Limited 18in", s: "215/55R18" },
    { y: [2017, 2021], t: "Sport 16in", s: "215/65R16" },
    { y: [2017, 2025], t: "Latitude 17in (Sport 2022+)", s: "225/60R17" },
    { y: [2017, 2025], t: "Latitude / Altitude / Limited 18in", s: "225/55R18" },
    { y: [2017, 2025], t: "Trailhawk", s: "215/65R17" },
    { y: [2017, 2025], t: "Limited / High Altitude 19in", s: "235/45R19" }
  ],
  "jeep|gladiator": [
    { y: [2020, 2023], t: "Overland", s: "255/70R18" },
    { y: [2020, 2026], t: "Sport / Sport S", s: "245/75R17" },
    { y: [2020, 2026], t: "Willys", s: "LT255/75R17" },
    { y: [2020, 2026], t: "Rubicon / Mojave", s: "LT285/70R17" },
    { y: [2020, 2026], t: "High Altitude / Nighthawk 20in", s: "275/55R20" }
  ],
  "jeep|renegade": [
    { y: [2015, 2023], t: "Sport / Latitude 16in", s: "215/65R16" },
    { y: [2015, 2023], t: "Latitude / Altitude / Upland 17in", s: "215/60R17" },
    { y: [2015, 2023], t: "Trailhawk", s: "215/65R17" },
    { y: [2015, 2023], t: "Limited 18in", s: "225/55R18" },
    { y: [2019, 2023], t: "Limited / High Altitude 19in", s: "235/45R19" }
  ],
  "ram|2500": [
    { y: [2012, 2013], t: "ST / Tradesman", s: "LT245/70R17" },
    { y: [2012, 2013], t: "SLT / Laramie / Longhorn", s: "LT265/70R17" },
    { y: [2012, 2026], t: "Power Wagon", s: "LT285/70R17" },
    { y: [2014, 2026], t: "Tradesman 17in", s: "LT245/70R17" },
    { y: [2014, 2026], t: "Tradesman 18in / Big Horn / SLT / Laramie", s: "LT275/70R18" },
    { y: [2014, 2026], t: "Laramie / Limited / Longhorn 20in", s: "LT285/60R20" }
  ],
  "ram|promaster": [
    { y: [2014, 2026], t: "1500 / 2500 / 3500", s: "LT225/75R16" }
  ],
  "dodge|challenger": [
    { y: [2012, 2014], t: "SRT8 392", s: "245/45ZR20" },
    { y: [2012, 2023], t: "SXT 18in", s: "235/55R18" },
    { y: [2012, 2023], t: "SXT Plus / GT / R/T 20in", s: "245/45R20" },
    { y: [2015, 2023], t: "R/T Scat Pack", s: "245/45ZR20" },
    { y: [2015, 2023], t: "SRT 392 / Hellcat / Redeye", s: "275/40ZR20" },
    { y: [2017, 2023], t: "GT AWD / SXT AWD", s: "235/55R19" },
    { y: [2018, 2023], t: "Widebody (Scat Pack / Hellcat)", s: "305/35ZR20" }
  ],
  "dodge|durango": [
    { y: [2012, 2026], t: "SXT / Crew 18in", s: "265/60R18" },
    { y: [2012, 2026], t: "GT / R/T / Citadel 20in", s: "265/50R20" },
    { y: [2018, 2026], t: "SRT 392 / Hellcat / R/T Tow-N-Go", s: "295/45ZR20" }
  ],
  "chrysler|pacifica": [
    { y: [2017, 2020], t: "Touring L Plus / Limited / Hybrid 18in", s: "235/60R18" },
    { y: [2017, 2026], t: "L / LX / Touring / Hybrid 17in", s: "235/65R17" },
    { y: [2017, 2026], t: "Limited / Pinnacle 20in", s: "245/50R20" },
    { y: [2021, 2026], t: "Hybrid 18in", s: "235/60R18" },
    { y: [2021, 2026], t: "Touring L / Limited 18in (gas)", s: "245/60R18" }
  ],
  "chrysler|300": [
    { y: [2012, 2014], t: "SRT8", s: "245/45ZR20" },
    { y: [2012, 2023], t: "Base / Touring / Limited RWD 17in", s: "215/65R17" },
    { y: [2012, 2023], t: "Limited / Touring L 18in", s: "225/60R18" },
    { y: [2012, 2023], t: "AWD", s: "235/55R19" },
    { y: [2012, 2023], t: "300S / 300C / Limited 20in RWD", s: "245/45R20" }
  ],
  "hyundai|kona": [
    { y: [2018, 2023], t: "SE", s: "205/60R16" },
    { y: [2018, 2023], t: "SEL / Electric", s: "215/55R17" },
    { y: [2018, 2023], t: "Limited / Ultimate / N Line", s: "235/45R18" },
    { y: [2022, 2023], t: "Kona N", s: "235/40R19" },
    { y: [2024, 2026], t: "SE / SEL / Electric", s: "215/60R17" },
    { y: [2024, 2026], t: "N Line / Limited", s: "235/45R19" }
  ],
  "hyundai|palisade": [
    { y: [2020, 2025], t: "SE / SEL 18in", s: "245/60R18" },
    { y: [2020, 2025], t: "SEL 20in / Limited / Calligraphy", s: "245/50R20" },
    { y: [2026, 2026], t: "SE / SEL / Hybrid SEL", s: "235/65R18" },
    { y: [2026, 2026], t: "XRT Pro", s: "255/60R18" },
    { y: [2026, 2026], t: "Limited", s: "255/50R20" },
    { y: [2026, 2026], t: "Calligraphy", s: "265/45R21" }
  ],
  "kia|sportage": [
    { y: [2012, 2013], t: "Base / LX 16in", s: "215/70R16" },
    { y: [2012, 2016], t: "LX 17in", s: "225/60R17" },
    { y: [2012, 2016], t: "EX / SX", s: "235/55R18" },
    { y: [2017, 2022], t: "LX", s: "225/60R17" },
    { y: [2017, 2022], t: "EX", s: "225/55R18" },
    { y: [2017, 2022], t: "SX Turbo", s: "245/45R19" },
    { y: [2023, 2026], t: "LX / X-Pro", s: "235/65R17" },
    { y: [2023, 2026], t: "EX / SX / Hybrid", s: "235/60R18" },
    { y: [2023, 2026], t: "X-Line / SX Prestige / PHEV", s: "235/55R19" }
  ],
  "kia|telluride": [
    { y: [2020, 2026], t: "LX / S / X-Line / X-Pro (18in)", s: "245/60R18" },
    { y: [2020, 2026], t: "EX / SX (20in)", s: "245/50R20" }
  ],
  "subaru|impreza": [
    { y: [2012, 2016], t: "2.0i base", s: "195/65R15" },
    { y: [2012, 2016], t: "Sport / Limited (17in)", s: "205/50R17" },
    { y: [2015, 2016], t: "2.0i Premium", s: "205/55R16" },
    { y: [2017, 2023], t: "Base / Premium", s: "205/55R16" },
    { y: [2017, 2023], t: "Limited", s: "205/50R17" },
    { y: [2017, 2023], t: "Sport", s: "225/40R18" },
    { y: [2024, 2026], t: "Base", s: "205/55R16" },
    { y: [2024, 2026], t: "Sport / RS", s: "225/40R18" }
  ],
  "subaru|ascent": [
    { y: [2019, 2026], t: "Base / Premium / Onyx (18in)", s: "245/60R18" },
    { y: [2019, 2026], t: "Limited / Touring (20in)", s: "245/50R20" }
  ],
  "mazda|cx-9": [
    { y: [2012, 2015], t: "Sport / Touring", s: "245/60R18" },
    { y: [2012, 2015], t: "Grand Touring", s: "245/50R20" },
    { y: [2016, 2023], t: "Sport / Touring", s: "255/60R18" },
    { y: [2016, 2023], t: "Grand Touring / Signature / Carbon Ed.", s: "255/50R20" }
  ],
  "volkswagen|atlas": [
    { y: [2018, 2026], t: "S / SE / SEL V6 (18in)", s: "245/60R18" },
    { y: [2018, 2026], t: "SEL / SEL Premium / R-Line (20in)", s: "255/50R20" },
    { y: [2021, 2026], t: "SEL Premium R-Line (21in)", s: "265/45R21" },
    { y: [2024, 2026], t: "Peak Edition", s: "255/60R18" }
  ],
  "bmw|5 series": [
    { y: [2012, 2016], t: "528i base (17in)", s: "225/55R17" },
    { y: [2012, 2016], t: "535i / 18in", s: "245/45R18" },
    { y: [2012, 2016], t: "528i M Sport 18in", s: "245/45R18", r: "275/40R18" },
    { y: [2012, 2016], t: "535i/550i M Sport 19in", s: "245/40R19", r: "275/35R19" },
    { y: [2017, 2023], t: "530i / 540i (18in)", s: "245/45R18" },
    { y: [2017, 2023], t: "M Sport 19in", s: "245/40R19", r: "275/35R19" },
    { y: [2017, 2023], t: "M Sport 20in", s: "245/35R20", r: "275/30R20" },
    { y: [2024, 2026], t: "530i / 540i (19in)", s: "245/45R19" },
    { y: [2024, 2026], t: "M Sport 20in", s: "245/40R20", r: "275/35R20" },
    { y: [2024, 2026], t: "M Sport 21in", s: "245/35R21", r: "275/30R21" }
  ],
  "bmw|x3": [
    { y: [2012, 2017], t: "xDrive28i base (18in)", s: "245/50R18" },
    { y: [2012, 2017], t: "19in / xLine", s: "245/45R19" },
    { y: [2012, 2017], t: "M Sport 19in", s: "245/45R19", r: "275/40R19" },
    { y: [2012, 2017], t: "M Sport 20in", s: "245/40R20", r: "275/35R20" },
    { y: [2018, 2024], t: "30i base (18in)", s: "225/60R18" },
    { y: [2018, 2024], t: "30i 19in", s: "245/50R19" },
    { y: [2018, 2024], t: "M Sport / M40i 20in", s: "245/45R20", r: "275/40R20" },
    { y: [2018, 2024], t: "M Sport 21in", s: "245/40R21", r: "275/35R21" },
    { y: [2025, 2026], t: "30 xDrive (19in)", s: "245/50R19" },
    { y: [2025, 2026], t: "M Sport / M50 20in", s: "255/45R20", r: "285/40R20" },
    { y: [2025, 2026], t: "M Sport / M50 21in", s: "255/40R21", r: "285/35R21" }
  ],
  "bmw|x5": [
    { y: [2012, 2018], t: "xDrive35i base (18in)", s: "255/55R18" },
    { y: [2012, 2018], t: "19in (Premium / Luxury / xLine)", s: "255/50R19" },
    { y: [2012, 2018], t: "Sport / M Sport 20in", s: "275/40R20", r: "315/35R20" },
    { y: [2019, 2026], t: "40i base (19in)", s: "265/50R19" },
    { y: [2019, 2026], t: "20in", s: "275/45R20", r: "305/40R20" },
    { y: [2019, 2026], t: "M Sport 21in", s: "275/40R21", r: "315/35R21" },
    { y: [2019, 2026], t: "M Sport 22in", s: "275/35R22", r: "315/30R22" }
  ],
  "mercedes-benz|c-class": [
    { y: [2012, 2014], t: "C250 / C300 Luxury", s: "225/45R17" },
    { y: [2012, 2014], t: "Sport", s: "225/45R17", r: "245/40R17" },
    { y: [2012, 2014], t: "Sport 18in", s: "225/40R18", r: "255/35R18" },
    { y: [2015, 2021], t: "C300 (17in)", s: "225/50R17" },
    { y: [2015, 2021], t: "C300 18in", s: "225/45R18", r: "245/40R18" },
    { y: [2015, 2021], t: "Sport / AMG Line 19in / C43", s: "225/40R19", r: "255/35R19" },
    { y: [2022, 2026], t: "C300 (18in)", s: "225/45R18", r: "245/40R18" },
    { y: [2022, 2026], t: "AMG Line 19in", s: "225/40R19", r: "255/35R19" }
  ],
  "mercedes-benz|e-class": [
    { y: [2012, 2016], t: "E350 Luxury / 4MATIC", s: "245/45R17" },
    { y: [2012, 2016], t: "E350 Sport RWD (18in)", s: "245/40R18", r: "265/35R18" },
    { y: [2012, 2016], t: "E350 Sport 4MATIC (18in)", s: "245/40R18" },
    { y: [2017, 2023], t: "E300 / E350 (18in)", s: "245/45R18" },
    { y: [2017, 2023], t: "Sport 19in", s: "245/40R19" },
    { y: [2024, 2026], t: "E350 (18in)", s: "225/55R18" },
    { y: [2024, 2026], t: "19in", s: "245/45R19", r: "275/40R19" },
    { y: [2024, 2026], t: "AMG Line 20in", s: "245/40R20", r: "275/35R20" }
  ],
  "mercedes-benz|gle": [
    { y: [2012, 2015], t: "ML350 19in", s: "255/50R19" },
    { y: [2012, 2015], t: "ML350 / ML550 20in", s: "265/45R20" },
    { y: [2016, 2019], t: "GLE350 / GLE400 19in", s: "255/50R19" },
    { y: [2016, 2019], t: "GLE350 / GLE400 20in", s: "265/45R20" },
    { y: [2020, 2026], t: "GLE350 / GLE450 19in", s: "275/55R19" },
    { y: [2020, 2026], t: "GLE350 / GLE450 20in", s: "275/50R20" },
    { y: [2020, 2026], t: "GLE 21in AMG Line", s: "275/45R21", r: "315/40R21" },
    { y: [2024, 2026], t: "GLE450 / GLE580 22in", s: "285/40R22", r: "325/35R22" }
  ],
  "mercedes-benz|sprinter": [
    { y: [2012, 2026], t: "1500 / 2500 (single rear)", s: "LT245/75R16" },
    { y: [2012, 2026], t: "3500 Dually", s: "LT215/85R16" },
    { y: [2019, 2026], t: "3500 Super Single", s: "LT225/75R16", r: "LT285/65R16" }
  ],
  "audi|a4": [
    { y: [2012, 2016], t: "Premium 17in", s: "225/50R17" },
    { y: [2012, 2016], t: "Sport / Prestige 18in", s: "245/40R18" },
    { y: [2012, 2016], t: "Prestige 19in", s: "255/35R19" },
    { y: [2013, 2016], t: "Premium Plus 17in", s: "245/45R17" },
    { y: [2017, 2024], t: "Premium 17in", s: "225/50R17" },
    { y: [2017, 2025], t: "Premium Plus / Prestige 18in", s: "245/40R18" },
    { y: [2017, 2025], t: "S line 19in", s: "245/35R19" },
    { y: [2017, 2025], t: "allroad", s: "245/45R18" }
  ],
  "audi|q5": [
    { y: [2012, 2017], t: "Premium / Premium Plus 18in", s: "235/60R18" },
    { y: [2012, 2017], t: "Premium Plus / Prestige 19in", s: "235/55R19" },
    { y: [2012, 2017], t: "3.0T / S line 20in", s: "255/45R20" },
    { y: [2018, 2024], t: "Premium 18in", s: "235/60R18" },
    { y: [2018, 2024], t: "Premium Plus / Prestige 19in", s: "235/55R19" },
    { y: [2018, 2024], t: "Prestige / S line 20in", s: "255/45R20" },
    { y: [2021, 2024], t: "Sportback 21in", s: "255/40R21" },
    { y: [2025, 2026], t: "19in", s: "235/55R19" },
    { y: [2025, 2026], t: "20in", s: "255/45R20" },
    { y: [2025, 2026], t: "21in", s: "255/40R21" }
  ],
  "acura|mdx": [
    { y: [2012, 2013], t: "Base / Technology", s: "255/55R18" },
    { y: [2012, 2013], t: "Advance", s: "255/50R19" },
    { y: [2014, 2016], t: "Base / Technology", s: "245/60R18" },
    { y: [2014, 2016], t: "Advance", s: "245/55R19" },
    { y: [2017, 2020], t: "Base", s: "245/60R18" },
    { y: [2017, 2020], t: "Technology / Advance / Sport Hybrid 20in", s: "245/50R20" },
    { y: [2019, 2020], t: "A-Spec / Advance", s: "265/45R20" },
    { y: [2022, 2026], t: "Base", s: "255/55R19" },
    { y: [2022, 2026], t: "Technology / A-Spec / Advance", s: "255/50R20" },
    { y: [2022, 2026], t: "Type S", s: "275/40R21" }
  ],
  "acura|tlx": [
    { y: [2015, 2020], t: "2.4 4-cyl", s: "225/55R17" },
    { y: [2015, 2020], t: "V6", s: "225/50R18" },
    { y: [2015, 2020], t: "V6 Advance / A-Spec 19in", s: "245/40R19" },
    { y: [2021, 2025], t: "Base", s: "235/50R18" },
    { y: [2021, 2025], t: "Technology / A-Spec / Advance", s: "255/40R19" },
    { y: [2021, 2025], t: "Type S", s: "255/35R20" }
  ],
  "tesla|model s": [
    { y: [2012, 2020], t: "19in", s: "245/45R19" },
    { y: [2012, 2020], t: "21in", s: "245/35R21" },
    { y: [2012, 2020], t: "21in staggered (Performance)", s: "245/35R21", r: "265/35R21" },
    { y: [2021, 2026], t: "19in Tempest (Long Range / Plaid)", s: "255/45R19", r: "285/40R19" },
    { y: [2021, 2026], t: "21in Arachnid", s: "265/35R21", r: "295/30R21" }
  ],
  "tesla|model x": [
    { y: [2016, 2020], t: "20in", s: "255/45R20", r: "275/45R20" },
    { y: [2016, 2020], t: "22in", s: "265/35R22", r: "285/35R22" },
    { y: [2021, 2026], t: "20in", s: "265/45R20", r: "275/45R20" },
    { y: [2021, 2026], t: "22in", s: "265/35R22", r: "285/35R22" }
  ],
  "volvo|xc90": [
    { y: [2012, 2014], t: "3.2", s: "235/60R18" },
    { y: [2012, 2014], t: "R-Design 19in", s: "255/50R19" },
    { y: [2012, 2014], t: "R-Design 20in", s: "255/45R20" },
    { y: [2016, 2018], t: "T5 Momentum 18in", s: "235/60R18" },
    { y: [2016, 2026], t: "Momentum / Core 19in", s: "235/55R19" },
    { y: [2016, 2026], t: "Inscription / R-Design / Plus 20in", s: "275/45R20" },
    { y: [2016, 2026], t: "21in", s: "275/40R21" },
    { y: [2016, 2026], t: "22in", s: "275/35R22" }
  ],
  "mitsubishi|outlander": [
    { y: [2012, 2013], t: "ES", s: "215/70R16" },
    { y: [2012, 2013], t: "SE / GT", s: "225/55R18" },
    { y: [2014, 2015], t: "ES", s: "215/70R16" },
    { y: [2014, 2015], t: "SE / GT", s: "225/55R18" },
    { y: [2016, 2020], t: "ES / SE / SEL / GT / PHEV", s: "225/55R18" },
    { y: [2022, 2026], t: "ES / PHEV ES", s: "235/60R18" },
    { y: [2022, 2026], t: "SE / SEL / Ralliart / PHEV SE / SEL", s: "255/45R20" }
  ],
  "hyundai|accent": [
    { y: [2012, 2017], t: "GLS / GS / SE base 14in", s: "175/70R14" },
    { y: [2012, 2017], t: "SE / Sport 16in alloy", s: "195/50R16" },
    { y: [2018, 2022], t: "SE / SEL", s: "185/65R15" },
    { y: [2018, 2022], t: "Limited", s: "205/45R17" }
  ],
  "nissan|armada": [
    { y: [2012, 2015], t: "SV", s: "265/70R18" },
    { y: [2012, 2015], t: "SL / Platinum", s: "275/60R20" },
    { y: [2017, 2024], t: "S / SV", s: "265/70R18" },
    { y: [2017, 2024], t: "SL / Platinum / Midnight 20in", s: "275/60R20" },
    { y: [2020, 2024], t: "Platinum / Platinum Reserve 22in", s: "275/50R22" },
    { y: [2025, 2026], t: "SV", s: "265/70R18" },
    { y: [2025, 2026], t: "SL / PRO-4X / Platinum", s: "275/60R20" },
    { y: [2025, 2026], t: "Platinum Reserve / NISMO 22in", s: "275/50R22" }
  ],
  "mini|cooper": [
    { y: [2012, 2013], t: "Cooper 15in", s: "175/65R15" },
    { y: [2012, 2013], t: "Cooper 16in / Cooper S", s: "195/55R16" },
    { y: [2012, 2013], t: "Cooper S 17in / JCW", s: "205/45R17" },
    { y: [2014, 2024], t: "Cooper 15in", s: "175/65R15" },
    { y: [2014, 2024], t: "Cooper 16in / Cooper S 16in", s: "195/55R16" },
    { y: [2014, 2024], t: "Cooper S 17in / JCW", s: "205/45R17" },
    { y: [2014, 2024], t: "Cooper S / JCW 18in", s: "205/40R18" },
    { y: [2025, 2026], t: "Cooper C / Cooper S 17in", s: "215/45R17" },
    { y: [2025, 2026], t: "Cooper C / Cooper S 18in", s: "215/40R18" }
  ],
  "toyota|sequoia": [
    { y: [2012, 2022], t: "SR5 / Limited 18in / TRD Pro (2020+)", s: "275/65R18" },
    { y: [2012, 2022], t: "Limited 20in / Platinum / TRD Sport / Nightshade", s: "275/55R20" },
    { y: [2023, 2026], t: "SR5 / Limited TRD Off-Road 18in", s: "265/70R18" },
    { y: [2023, 2026], t: "SR5 / Limited / Platinum / 1794 20in", s: "265/60R20" },
    { y: [2023, 2026], t: "Capstone 22in", s: "265/50R22" },
    { y: [2023, 2026], t: "TRD Pro", s: "285/65R18" }
  ],
  "toyota|c-hr": [
    { y: [2018, 2022], t: "XLE / XLE Premium / Limited / Nightshade", s: "225/50R18" },
    { y: [2019, 2021], t: "LE", s: "215/60R17" }
  ],
  "toyota|venza": [
    { y: [2012, 2015], t: "LE / XLE 4-cyl 19in", s: "245/55R19" },
    { y: [2012, 2015], t: "LE V6 / XLE V6 / Limited 20in", s: "245/50R20" },
    { y: [2021, 2024], t: "LE", s: "225/60R18" },
    { y: [2021, 2024], t: "XLE / Limited / Nightshade", s: "225/55R19" }
  ],
  "honda|passport": [
    { y: [2019, 2021], t: "Sport / EX-L", s: "245/50R20" },
    { y: [2019, 2021], t: "Touring / Elite", s: "265/45R20" },
    { y: [2022, 2025], t: "EX-L / Elite / Black Edition", s: "265/45R20" },
    { y: [2022, 2025], t: "TrailSport", s: "245/60R18" },
    { y: [2026, 2026], t: "RTL / RTL Blackout / RTL Towing", s: "265/60R18" },
    { y: [2026, 2026], t: "TrailSport / TrailSport Elite", s: "275/60R18" }
  ],
  "honda|insight": [
    { y: [2012, 2014], t: "Base / LX / EX", s: "185/60R15" },
    { y: [2019, 2022], t: "LX / EX", s: "215/55R16" },
    { y: [2019, 2022], t: "Touring", s: "215/50R17" }
  ],
  "nissan|leaf": [
    { y: [2012, 2025], t: "S / SV (2012-2014) / S Plus", s: "205/55R16" },
    { y: [2013, 2025], t: "SL / SV (2015+) / SV Plus / SL Plus", s: "215/50R17" },
    { y: [2026, 2026], t: "S+ / SV+", s: "215/55R18" },
    { y: [2026, 2026], t: "Platinum+", s: "235/45R19" }
  ],
  "chevrolet|spark": [
    { y: [2013, 2022], t: "LS / LT / ACTIV", s: "185/55R15" }
  ],
  "chevrolet|sonic": [
    { y: [2012, 2016], t: "LS / LT", s: "P195/65R15" },
    { y: [2012, 2016], t: "LTZ / RS", s: "P205/50R17" },
    { y: [2017, 2020], t: "LS / LT sedan", s: "P195/65R15" },
    { y: [2017, 2020], t: "LT hatchback", s: "P205/55R16" },
    { y: [2017, 2020], t: "Premier", s: "P205/50R17" }
  ],
  "chevrolet|silverado 2500hd": [
    { y: [2012, 2019], t: "WT / LT", s: "LT245/75R17" },
    { y: [2012, 2019], t: "LTZ", s: "LT265/70R18" },
    { y: [2015, 2019], t: "High Country / 20in", s: "LT265/60R20" },
    { y: [2020, 2026], t: "WT / LT", s: "LT245/75R17" },
    { y: [2020, 2026], t: "LTZ", s: "LT275/70R18" },
    { y: [2020, 2026], t: "Custom / High Country", s: "LT275/65R20" },
    { y: [2024, 2026], t: "ZR2", s: "LT305/70R18" }
  ],
  "gmc|sierra 2500hd": [
    { y: [2012, 2014], t: "Denali", s: "LT265/70R18" },
    { y: [2012, 2019], t: "Base / SLE", s: "LT245/75R17" },
    { y: [2012, 2019], t: "SLT", s: "LT265/70R18" },
    { y: [2015, 2019], t: "Denali", s: "LT265/60R20" },
    { y: [2020, 2023], t: "AT4", s: "LT275/70R18" },
    { y: [2020, 2026], t: "Pro / SLE", s: "LT245/75R17" },
    { y: [2020, 2026], t: "SLT", s: "LT275/70R18" },
    { y: [2020, 2026], t: "Denali / Denali Ultimate", s: "LT275/65R20" },
    { y: [2024, 2026], t: "AT4 (20in)", s: "LT275/65R20" },
    { y: [2024, 2026], t: "AT4X", s: "LT305/70R18" }
  ],
  "ford|f-350": [
    { y: [2012, 2026], t: "XL / XLT (SRW, 17in)", s: "LT245/75R17" },
    { y: [2012, 2026], t: "XLT / Lariat / King Ranch (SRW, 18in)", s: "LT275/65R18" },
    { y: [2012, 2026], t: "All trims DRW", s: "LT245/75R17" },
    { y: [2013, 2026], t: "Platinum / Limited / King Ranch 20in (SRW)", s: "LT275/65R20" },
    { y: [2020, 2026], t: "Tremor (SRW)", s: "LT285/75R18" }
  ],
  "ford|ecosport": [
    { y: [2018, 2022], t: "S / SE", s: "205/60R16" },
    { y: [2018, 2022], t: "SES / Titanium", s: "205/50R17" }
  ],
  "ford|flex": [
    { y: [2012, 2019], t: "SE", s: "P235/60R17" },
    { y: [2012, 2019], t: "SEL", s: "P235/60R18" },
    { y: [2012, 2019], t: "Limited", s: "P235/55R19" },
    { y: [2012, 2019], t: "Titanium / Limited EcoBoost 20in", s: "P255/45R20" }
  ],
  "ford|taurus": [
    { y: [2012, 2014], t: "SHO", s: "P255/45R19" },
    { y: [2012, 2015], t: "SE", s: "P235/60R17" },
    { y: [2012, 2019], t: "SE 18in / SEL", s: "P235/55R18" },
    { y: [2012, 2019], t: "Limited", s: "P255/45R19" },
    { y: [2015, 2019], t: "SHO", s: "P245/45R20" }
  ],
  "lincoln|mkz": [
    { y: [2012, 2012], t: "Base", s: "P225/50R17" },
    { y: [2013, 2020], t: "Base / Premiere / Select / Reserve I", s: "P245/45R18" },
    { y: [2017, 2020], t: "Black Label / Reserve II 19in", s: "P245/40R19" }
  ],
  "dodge|journey": [
    { y: [2012, 2012], t: "SE / American Value Pkg", s: "P225/70R16" },
    { y: [2012, 2020], t: "SE / SXT", s: "P225/65R17" },
    { y: [2012, 2020], t: "Crew / Lux / Limited / R/T / Crossroad / GT", s: "P225/55R19" }
  ],
  "kia|rio": [
    { y: [2012, 2017], t: "LX / EX", s: "P185/65R15" },
    { y: [2012, 2017], t: "SX", s: "P205/45R17" },
    { y: [2018, 2023], t: "LX / S / EX", s: "P185/65R15" }
  ]
};
window.TIRE_SIZES["chevrolet|silverado"] = window.TIRE_SIZES["chevrolet|silverado 1500"];
window.TIRE_SIZES["ram|ram 1500"] = window.TIRE_SIZES["ram|1500"];
window.TIRE_SIZES["dodge|charger scat pack"] = window.TIRE_SIZES["dodge|charger"];
window.TIRE_SIZES["gmc|sierra"] = window.TIRE_SIZES["gmc|sierra 1500"];
window.TIRE_SIZES["bmw|330i"] = window.TIRE_SIZES["bmw|3 series"];
window.TIRE_SIZES["bmw|m340i"] = window.TIRE_SIZES["bmw|3 series"];
window.TIRE_SIZES["bmw|330e"] = window.TIRE_SIZES["bmw|3 series"];
window.TIRE_SIZES["bmw|3-series"] = window.TIRE_SIZES["bmw|3 series"];
window.TIRE_SIZES["bmw|320i"] = window.TIRE_SIZES["bmw|3 series"];
window.TIRE_SIZES["bmw|328i"] = window.TIRE_SIZES["bmw|3 series"];
window.TIRE_SIZES["bmw|328d"] = window.TIRE_SIZES["bmw|3 series"];
window.TIRE_SIZES["bmw|335i"] = window.TIRE_SIZES["bmw|3 series"];
window.TIRE_SIZES["bmw|340i"] = window.TIRE_SIZES["bmw|3 series"];
window.TIRE_SIZES["mazda|3"] = window.TIRE_SIZES["mazda|mazda3"];
window.TIRE_SIZES["lexus|rx 350"] = window.TIRE_SIZES["lexus|rx"];
window.TIRE_SIZES["lexus|rx350"] = window.TIRE_SIZES["lexus|rx"];
window.TIRE_SIZES["gmc|yukon xl"] = window.TIRE_SIZES["gmc|yukon"];
window.TIRE_SIZES["cadillac|escalade esv"] = window.TIRE_SIZES["cadillac|escalade"];
window.TIRE_SIZES["ford|f-250 super duty"] = window.TIRE_SIZES["ford|f-250"];
window.TIRE_SIZES["ford|expedition max"] = window.TIRE_SIZES["ford|expedition"];
window.TIRE_SIZES["lincoln|navigator l"] = window.TIRE_SIZES["lincoln|navigator"];
window.TIRE_SIZES["ram|promaster 1500"] = window.TIRE_SIZES["ram|promaster"];
window.TIRE_SIZES["ram|promaster 2500"] = window.TIRE_SIZES["ram|promaster"];
window.TIRE_SIZES["ram|promaster 3500"] = window.TIRE_SIZES["ram|promaster"];
window.TIRE_SIZES["bmw|528i"] = window.TIRE_SIZES["bmw|5 series"];
window.TIRE_SIZES["bmw|530i"] = window.TIRE_SIZES["bmw|5 series"];
window.TIRE_SIZES["bmw|535i"] = window.TIRE_SIZES["bmw|5 series"];
window.TIRE_SIZES["bmw|540i"] = window.TIRE_SIZES["bmw|5 series"];
window.TIRE_SIZES["bmw|550i"] = window.TIRE_SIZES["bmw|5 series"];
window.TIRE_SIZES["bmw|530e"] = window.TIRE_SIZES["bmw|5 series"];
window.TIRE_SIZES["bmw|5-series"] = window.TIRE_SIZES["bmw|5 series"];
window.TIRE_SIZES["mercedes-benz|gle-class"] = window.TIRE_SIZES["mercedes-benz|gle"];
window.TIRE_SIZES["mini|hardtop"] = window.TIRE_SIZES["mini|cooper"];
window.TIRE_SIZES["chevrolet|silverado hd"] = window.TIRE_SIZES["chevrolet|silverado 2500hd"];
window.TIRE_SIZES["gmc|sierra hd"] = window.TIRE_SIZES["gmc|sierra 2500hd"];
window.TIRE_SIZES["ford|f-350 super duty"] = window.TIRE_SIZES["ford|f-350"];
/* Research notes (gaps / uncertain or omitted generations):
   - Toyota Camry: 2018-2020 L only (L dropped after 2020). 2025+ is hybrid-only.
   - Honda Civic: 2016-2018 Touring was 17in; 2019-2021 sedan Touring moved to 18in (covered by 18in row). 2012 coupe EX optional 17in omitted.
   - Honda Accord: 2013-2015 Touring sedan omitted (sources conflict 17in vs 18in). 2018-2022 EX-L 2.0T 18in option omitted.
   - Ford F-150: P-prefix dropped (sources list bare metric; 2012-2014 placards were likely P-metric). Omitted: 2015-2020 22in Limited, Heavy-Duty Payload 2015+ (275/65R18 vs 265/70R18 conflict), Raptor 37in (37x12.50R17 not in metric format), Raptor R, F-150 Lightning.
   - Chevrolet Silverado 1500: 2014-2018 Z71 17in all-terrain was LT265/70R17 (not listed separately). 2012-2013 22in option omitted. 2019+ listed without P prefix. Trail Boss 20in (265/60R20) omitted.
   - Toyota RAV4: 2026 (new gen) sizes from tiresize.com + Mavis only; XSE 20in only single-source. RAV4 EV (2012-2014) omitted.
   - Toyota Corolla: 2012-2013 LE omitted (sources conflict 15in vs 16in). Corolla iM and GR Corolla omitted (separate models). 2023+ Hybrid LE moved to 205/55R16 (covered by LE row).
   - Nissan Altima: 2012-2013 Altima Coupe omitted. 2026 trim list partial (only SV/SR confirmed).
   - Tesla Model 3: 2024+ (Highland) Performance staggered 20in omitted: sizes not confirmed by a reliable source.
   - Toyota Tacoma: 2024+ Limited confirmed 265/65R18 (no factory 20in found). X-Runner last sold MY2014. 2026 assumed same as 2024-2025 (same generation, no wheel change found).
   - Jeep Wrangler: JK (2012-2018) and JL (2018-2026) overlap in MY2018. Rubicon/Willys/392 tires are LT-type off-road tires (LT255/75R17, LT285/70R17, LT315/70R17) - prefix not confirmed per year so left plain. JK Sport S (245/75R16 vs 17in) and JL High Altitude 20in omitted as unconfirmed.
   - Jeep Grand Cherokee: MY2022 sold both as carryover WK2 ('Grand Cherokee WK') and new WL. Grand Cherokee L (3-row) Laredo uses 265/60R18 rather than 17in. Trailhawk (WK2 2017-2021) 265/60R18 is an all-terrain.
   - Ram 1500: DS gen 2012-2018, sold on as 'Classic' 2019-2024; DT gen 2019-2026. DS Rebel tire is an all-terrain (likely LT) - prefix not confirmed, left plain. DS 22in (Sport/Limited) omitted.
   - Nissan Rogue: Rogue Select (1st-gen carryover, 2014-2015) and Rogue Sport are separate models, omitted. 2026 assumed same as 2025 (same generation).
   - Hyundai Elantra: Sedan only; Elantra Coupe (2013-2014) and Elantra GT hatch omitted. Some 2012-2016 base GLS/SE manual cars had 195/65R15 steelies - omitted. 2024+ SEL mostly 17in.
   - Chevrolet Equinox: Gas Equinox only; Equinox EV is a separate model, omitted. 2026 assumed same as 2025.
   - Ford Explorer: Explorer Sport launched MY2013, Platinum MY2016. Police Interceptor Utility omitted. 2016 base moving to 18in inferred from 2018 data.
   - Dodge Charger Scat Pack: No Charger sold MY2024 (LD ended MY2023); new-gen Charger Daytona EV rows are MY2025+. Gas new-gen Charger Sixpack (2025/2026) sizes not confirmed, omitted. SRT8 (2012-2014) size per tiresize 245/45R20.
   - Toyota Highlander: Grand Highlander is a separate model, omitted. Hybrid trims share the gas trims' sizes.
   - Kia Sorento: 2025-2026 assumed same as 2024 facelift (not separately fetched). Hybrid EX had 17in or 19in options; omitted as its own row.
   - Hyundai Tucson: 2012 GL base omitted (tiresize says 225/60R17, possibly 16in steel; unconfirmed). 2026 assumed same as 2025. 2022-2024 SEL standard was 17in (235/65R17) with optional 19in.
   - Subaru Outback: 2026 (new gen) sizes from tiresize/iSeeCars/Mavis, not Subaru official spec sheet.
   - Ford Escape: 2012 optional 17in size conflicting across sources (225/65R17 vs 235/60R17) - omitted. 2025-2026 assumed same as 2024.
   - Nissan Sentra: 2012 base '2.0' 15in omitted. 2026 new gen SL listed as 205/50R17 by tiresize only - omitted. 2017-19 Nismo from memory (225/40R18), moderately confident.
   - Chevrolet Malibu: Production ended after MY2025; no 2026. 2016 fleet 'Malibu Limited' (old body) omitted.
   - Toyota Prius: Liftback only; Prius c (175/65R15) and Prius v (205/60R16, 215/50R17) are separate models, excluded. 2026 assumed same as 2024.
   - Honda Pilot: TrueDelta lists 245/65R17 for 2013 LX (likely carried over from 2009-11); Mavis/tiresize say 235/65R17 - used that. 2025-2026 assumed same as 2024.
   - GMC Sierra 1500: Placard sizes on light-duty trims are P-metric on some years; P prefix omitted. 2012-13 trim-to-size mapping approximate (tiresize lists by cab). 2019-2021 and 2023-2026 assumed same as 2022 page. 2014-2018 trim mapping inferred from size list.
   - Ford Mustang: 2012-14 V6 base 17in omitted: sources conflict (P215/65R17 auto vs P225/60R17 manual vs 215/60R17). 2024 EcoBoost base 17in (235/55R17) per Mavis conflicts with iSeeCars 18in - only 18in included. Mach 1 (2021-23) handling pkg 305/30/315/30 omitted. 2015-17 V6 included in 17in row. ZR applied to performance staggered rows per Ford spec; tiresize lists them as R.
   - BMW 3 Series: Sedan only (F30 2012-2018, G20 2019+). Wagon/GT/coupe and M3 omitted. tiresize.com lists G20 330i from 18in up; some early 2019 US 330i may have had 17in base (225/50R17) - not confirmed, left out. Most BMW OE are run-flat. 2025-2026 assumed same as 2024 LCI sizes.
   - Chevrolet Tahoe: 2012-2014 placards may show P-metric (P265/70R17 etc.); tiresize lists without P. 2026 assumed same as 2025. Police/SSV fitments omitted.
   - Ford Edge: Edge discontinued in US after MY2024. Sport 2015-2018, ST 2019-2024.
   - Nissan Frontier: 2022+ SL omitted: tiresize lists 265/65R17 for 2024 SL but not confirmed (older gen SL was 18in). 2020-2021 D40 4cyl dropped so 15in not applicable. 2025-2026 assumed same as 2024.
   - Chevrolet Traverse: 2024 'Traverse Limited' is the carried-over old generation (fleet) using 2018-2023 sizes. 2025-2026 assumed same as 2024.
   - Kia Optima: Replaced by K5 for MY2021 in US. 2014-2015 assumed same as 2013 per tiresize pattern.
   - Kia K5: 2026 assumed same as 2025.
   - Hyundai Sonata: Sonata N (2021-2023 is 'N Line', no full N in US). 2025-2026 assumed same as 2024 refresh.
   - Hyundai Santa Fe: 2013-2018 '3-row Santa Fe' (LWB) and 2-row 'Santa Fe Sport' combined; 2019 Santa Fe XL (carryover LWB) omitted. 2021-2023 Hybrid Blue uses 235/65R17 (not a separate row). 2025-2026 assumed same as 2024.
   - Kia Soul: Soul EV omitted (14-19 EV used 205/60R16). Soul ended after MY2025 in US; no 2026 rows.
   - Kia Forte: Forte replaced by K4 after MY2024 in the US (wheel-size shows a 2025 page; not included). Koup (2012-2016) not separately verified. 2012-2013 SX size from memory consistent with wheel-size offsets; 2014-2018 EX could have 16 or 17in depending on package.
   - Subaru Forester: 2025+ (new gen) Wilderness omitted - tiresize lists 235/60R17 but not confirmed. 2025+ sizes from tiresize 2025 page only.
   - Subaru Crosstrek: Sold as 'XV Crosstrek' 2013-2015. Sport trim 2021-2023 confirmed on 17in (225/60R17). 2026 assumed same as 2024 (same generation).
   - Mazda CX-5: 2026 is the new 3rd-gen CX-5; tiresize and Mavis list the same 225/65R17 (S/Select) and 225/55R19 (Preferred/Premium/Premium Plus) sizes, no Mazda source checked.
   - Mazda Mazda3: 2012-2013 i SV / i Sport omitted (possibly 15in 195/65R15, unconfirmed). Mazdaspeed3 size from memory.
   - Volkswagen Jetta: 2017-2018 S may have 205/55R16 (tiresize). 2012-2014 Hybrid omitted. Mk7 GLI: most sources 225/45R18, Tire Rack shows 225/40R18 (older gen) - verify placard.
   - Volkswagen Tiguan: 2025-2026 (new 3rd gen) omitted - US trim-to-size mapping inconsistent across sources. Tiguan Limited (2017-2018, old body) uses Mk1 sizes. 2015-2016 SE sometimes 235/55R17; 2013 SEL listed with 255/40R19.
   - Honda Odyssey: 2021-2024 Sport trim (19in) not separately listed; 2026 assumed same as 2025.
   - Toyota Sienna: Some early AWD Siennas came on run-flats in 235/55R18. 2026 XLE can be 18in.
   - Toyota 4Runner: 5th-gen placard may read P265/70R17 / P245/60R20; P dropped since sources list without it. 2026 assumed same as 2025.
   - Toyota Tundra: 2012-13 TRD Rock Warrior 285/70R17 omitted. TRD Pro started 2015. 2026 assumed same as 2022-2025 (same generation, not separately checked).
   - Chevrolet Colorado: Not sold in US for MY2013-2014. 2023+ Trail Boss omitted (sources conflict: 265/65R18 vs 275/65R18). Z71 20in and 22in options omitted. 2012 sizes per tiresize.com RPO packages (Z85 standard, Z71 off-road); 2012 ZQ8 sport 235/50R18 omitted. ZR2/Bison LT prefix from Goodyear Territory MT fitment knowledge; tiresize lists without prefix.
   - Ford Ranger: Ranger not sold in US 2012-2018 (old Ranger ended MY2011). 2025-2026 assumed same as 2024 (same generation).
   - Ford Fusion: Discontinued after MY2020. 2017+ Hybrid/Energi variants use 235/50R17 or 235/45R18 (covered by SE/SEL rows).
   - Ford Focus: Discontinued in US after MY2018.
   - Dodge Grand Caravan: 16in 225/65R16 confirmed on 2012 only (2016 lists all trims on 17in); exact year 16in was dropped not verified, so kept to 2012-2013. 2012 also lists alt 235/60R16. Discontinued after MY2020.
   - Jeep Cherokee: Model not sold MY2024+. 19in row confirmed on 2021; assumed for 2019 refresh onward.
   - Chevrolet Cruze: 2016 overlap: first-gen sold as 'Cruze Limited', second gen as new 2016 Cruze. Discontinued after MY2019.
   - Nissan Versa: Versa Note hatchback (2014-2019) not included (separate nameplate). Versa discontinued after MY2025. Possible early-2012 sedan base 14in size not confirmed, omitted.
   - Lexus RX: 2026 assumed same as 2023-2025 (same generation).
   - Honda HR-V: Gen1 US sales began MY2016. 2023+ gen2 sizes from tiresize.com 2023; assumed unchanged through 2026.
   - Honda Fit: No 2014 MY (US); discontinued in US after 2020. Fit EV omitted. Sport trim in gen3 is 2018+.
   - Honda Ridgeline: No 2015-2016 MY. 2012-2014 RTL 18in per tiresize 2013 listing; some early RTLs may be 17in (245/65R17) - check placard. 2024+ TrailSport uses all-terrain 245/60R18 per tiresize.
   - Toyota Yaris: 2017-2018 Yaris iA (Mazda2-based sedan) and 2019-2020 Yaris sedan/hatch share 185/60R16. Discontinued in US after 2020.
   - Toyota Avalon: Discontinued after 2022. 2012 base may have 215/60R16 on some cars (tiresize lists both); omitted.
   - Lexus ES: 2013-2018 ES 350 18in was optional (not standard). 2019+ sizes assumed carried to 2026 (next-gen ES due MY2026/27 not verified).
   - Lexus IS: Staggered setups on RWD F Sport / IS 350 / IS F (s=front, r=rear). AWD IS (esp. 2021+ IS 350 AWD F Sport) may run square sizes - check placard; omitted. 2012-2013 18in staggered option omitted.
   - Lexus NX: Some sources list 235/55R18 for 2018-2021 F Sport; Mavis/Autopadre show 225/60R18 - check placard.
   - Nissan Pathfinder: No 2021 MY (gen5 launched as MY2022).
   - Nissan Maxima: No 2015 MY; discontinued after 2023.
   - Nissan Murano: 2015-2018 SL was 18in per tiresize; SL moved to 20in with 2019 refresh. Hybrid (2016-2017) follows SL/Platinum sizes.
   - Nissan Titan: No half-ton Titan for MY2016 (XD only). Titan discontinued after 2024. XD LT prefixes from iSeeCars; tiresize lists them without LT.
   - Nissan Kicks: Kicks Play (carryover first gen) sold alongside new gen 2025+.
   - Infiniti Q50: Luxe 18in start year approximated (confirmed on 2022). 2014-2015 19in shown square; did not confirm whether early RWD Sport was staggered. Many 19in OE tires are run-flat.
   - Chevrolet Suburban: 2500 (2012-2013) listed as 245/75R16 on tiresize; LT prefix assumed for HD (also had 265/70R17 option, omitted).
   - Chevrolet Camaro: Camaro ended after 2024. 21in staggered (245/40R21 / 275/35R21) was a dealer accessory option, omitted. 6th-gen LT RS 20in listed square per tiresize/Goodyear. Start years of SS 1LE (2017) and ZL1 1LE (2018) from memory of launch years.
   - Chevrolet Impala: Old-body LT 17in omitted: sources disagree (225/55R17 on 2012 vs 235/55R17 on 2014 Limited). Impala Limited 2014-2016 was mostly fleet. Impala ended 2020.
   - Chevrolet Trax: No 2023 model year in US. 2024+ 19in size per tiresize only.
   - Chevrolet Blazer: Gas Blazer only (Blazer EV not included). L trim dropped after early years.
   - Chevrolet Express: Cutaway/dual-rear-wheel 3500/4500 omitted. 1500 dropped after 2014.
   - Chevrolet Corvette: C6 placard sizes carry P. ZR1 C8 (2025+) assumed same sizes as Z06 - verify if critical. Speed letter Z kept for all Corvette sizes.
   - Chevrolet Bolt EV: Not sold MY2024-2026 (next-gen Bolt is MY2027).
   - GMC Yukon: 2012-14 Denali: sources disagree (18in 265/65R18 also listed); Denali row uses 20in. Hybrid trims omitted. Covers Yukon XL 1500 too; 2012-13 XL 2500 omitted.
   - GMC Acadia: 2017 Acadia Limited (carryover gen1) uses gen1 sizes. 2024+ Elevation 18in (255/65R18) also listed by tiresize; omitted as base-fitment unclear.
   - GMC Terrain: 2026 Denali optional 20in (235/50R20) seen on Goodyear only; omitted.
   - GMC Canyon: 2012 Canyon (GMT355, last year 2012) omitted - sizes vary by 2wd/4wd/Z71 and sources unclear. Not sold MY2013-2014. 2023+ AT4 also listed with 265/65R18 depending on package; AT4X AEV (315/70R17) omitted.
   - Cadillac Escalade: Includes ESV. 2012-14 P-prefix assumed per GMT900 placards. 2023-24 Escalade-V wheel size not confirmed; omitted for those years.
   - Cadillac XT5: XT5 US sales ended after MY2025 (not verified for 2026).
   - Buick Enclave: Gen1 trim-to-size mapping approximate (tiresize lists by FWD/AWD only); sizes themselves confirmed.
   - Buick Encore: Encore (not Encore GX) ended in US after MY2022. Encore GX not included.
   - Ford F-250 Super Duty: tiresize.com lists several sizes per cab/trim; trim-to-size mapping is the common factory pairing, 18in sizes vary by package. 265/70R17 (older XL option) omitted. 2025-2026 assumed same as 2023-2024 (same generation).
   - Ford Expedition: 2012-2014 XL base 17in size not confirmed, omitted. Applies to EL/Max too.
   - Ford Transit: Placard size is 235/65R16 C-type (LT). T-350 HD dually omitted: sources conflict (195/75R16 vs 205/75R16 by year). Trail (2023+) and Transit Connect omitted.
   - Ford Bronco: Raptor (37x12.50R17 flotation size) omitted - does not fit size format. 2025-2026 assumed unchanged.
   - Ford Bronco Sport: 235/65R17 on 2025+ only with specific packages (mavis/forum).
   - Ford Maverick: Tremor from 2023 MY.
   - Ford Mustang Mach-E: Whether 18in remained on 2024+ Select not confirmed.
   - Lincoln Navigator: Covers Navigator and Navigator L.
   - Jeep Compass: First gen 2017 carryover year folded into 2016 row set (not separately verified). 2026 not verified, omitted.
   - Jeep Gladiator: Overland dropped after 2023 (not on 2025 list).
   - Jeep Renegade: US sales 2015-2023 only. 19in option began with 2019 facelift.
   - Ram 2500: LT prefix added (HD pickups use LT-metric; tiresize.com lists without prefix). 2013 still 17in per tiresize; 18/20in from 2014. 2023+ Rebel (LT285/60R20 per tiresize) not given its own row.
   - Ram ProMaster: Some builds (esp. cutaway/chassis, and 2024 per Big O) carry 225/75R16C instead; C-type commercial notation can't be expressed in the size regex, so only LT225/75R16 listed.
   - Dodge Challenger: Widebody is square (305/35ZR20 all four), not staggered. 2012-2014 SRT8 optional staggered (255/45 rear) omitted. ZR notation assumed for SRT/Scat/Widebody performance tires.
   - Chrysler Pacifica: 2017+ minivan only. 245/60R18 on gas 18in from 2021 refresh per tiresize.
   - Chrysler 300: Final model year 2023.
   - Hyundai Kona: Kona Electric (2019-2023 215/55R17; 2024+ 215/60R17) folded into rows. tiresize lists 2024 SEL as 215/55R18 - unconfirmed, omitted. 2025-2026 assumed same as 2024 (same generation).
   - Hyundai Palisade: 2026 is all-new 2nd gen; sizes from a single source (tiresize). 2023-2025 XRT omitted.
   - Kia Telluride: First gen only (2020-2026); 2023 facelift kept same sizes. X-Pro uses all-terrain tire in 245/60R18.
   - Subaru Impreza: 2012-2014 Premium assumed on 195/65R15 like base (not separately verified). WRX/STI omitted (separate model from 2015). 2024+ some base cars listed with 205/50R17 option.
   - Subaru Ascent: Onyx Edition wheel size varies by year; door placard rules.
   - Mazda CX-9: Discontinued after 2023 (replaced by CX-90). 2012-2013 assumed same as verified 2014.
   - Volkswagen Atlas: Atlas (3-row) only, not Cross Sport. 21in R-Line start year (2021) not individually verified; confirmed for 2024/2026.
   - BMW 5 Series: Sedan only; M5 omitted. 2024+ some 19in cars listed staggered 245/45R19 / 275/40R19 (unconfirmed for US, omitted). Many other optional wheels exist.
   - BMW X3: X3 M omitted. F25 20in staggered from one source (Goodyear CA). G45 21in from tiresize only.
   - BMW X5: X5 M omitted. 2012-2013 E70 and 2014-2018 F15 share these sizes. G05 20in rear 305/40R20 from one source (BigO); some 20in cars may be square 275/45R20.
   - Mercedes-Benz C-Class: Sedan only. C63 AMG omitted (not web-verified). 2012-2014 18in staggered from tiresize C250 listing.
   - Mercedes-Benz E-Class: Sedan only; AMG E43/E53/E63 omitted. 2017-2023 staggered 245/40R19 / 275/35R19 confirmed only on coupe/E450, so omitted for sedan; some 2017+ sedans list 225/55R17. 2024+ 21in (245/35R21 / 275/30R21) also exists.
   - Mercedes-Benz GLE: 2012-2015 rows are the predecessor ML-Class (W166). 18in base sizes and AMG GLE43/53/63 omitted (not confirmed). 22in staggered only confirmed on 2024 page; 2025-2026 assumed carry-over of 2024 sizes.
   - Mercedes-Benz Sprinter: Covers NCV3 (2012-2018) and VS30 (2019+). Sources list sizes without LT prefix; Sprinter OE fitments are LT-rated. 3500 Super Single seen on 2020/2024 pages only. 2019+ base 2500 235/65R16C option omitted (C-metric, regex can't express). 2026 assumed carry-over.
   - Audi A4: A4 ended after MY2025 in the US (replaced by A5 for 2026). 2012 Premium Plus 17in assumed same as 2013+ not confirmed so starts 2013. S4 omitted.
   - Audi Q5: 2025+ is the new generation; 18in fitment for it not confirmed so omitted. SQ5 omitted. 2026 assumed carry-over.
   - Acura MDX: No 2021 model year MDX. 2017-2018 Advance listed as 245/50R20; 265/45R20 confirmed for 2019 A-Spec/Advance only (2020 assumed). 2026 assumed carry-over.
   - Acura TLX: TLX sold 2015-2025 only (production ended July 2025; no 2026). 2015 4-cyl/V6 assumed same as confirmed 2016. A-Spec added 2018.
   - Tesla Model S: Pre-2021 21in fitment was square on some cars and staggered on others (Performance). 2012-2015 assumed same as confirmed 2016. 2026 assumed carry-over.
   - Tesla Model X: 2015-2020 owner's manual gives 255/45R20 front; newer manual gives 265/45R20 front (tiresize also shows 265 on 2018 pages, so some 2016-2020 cars may carry 265 — check placard). 2026 assumed carry-over.
   - Volvo XC90: No 2015 US XC90 (gen change). 2025+ refresh assumed same sizes as confirmed 2024. 2026 assumed carry-over.
   - Mitsubishi Outlander: No 2021 gas Outlander in US (old-gen PHEV 2018-2022 used 225/55R18; 2022 PHEV rows would apply from 2023). 2015 ES assumed 16in same as 2014. 2026 assumed carry-over.
   - Hyundai Accent: Not sold in US after 2022. Trim names changed in 2016 (GLS/GS -> SE/Sport); sizes unchanged.
   - Nissan Armada: No 2016 model year in US. 2025 SV: tiresize says 265/60R18 but wheel-size, Mavis and iSeeCars say 265/70R18 (used). 2017-2019 Platinum was 20in; 22in from 2020.
   - Mini Cooper: Hardtop 2-door and 4-door (4-door from 2015) share sizes. Mostly run-flats. JCW hardtop sold 2016-2024 for F56 gen. 2025+ JCW omitted: sizes could not be confirmed (wheel-size page truncated). 2012-2013 R56 18in option omitted.
   - Toyota Sequoia: Pre-2018 placards may show P275/65R18; P prefix dropped as unconfirmed.
   - Toyota C-HR: Gas C-HR sold in US 2018-2022. 2026 C-HR BEV omitted: sizes not confirmed. 2022 LE not listed on source, so LE row stops at 2021.
   - Toyota Venza: Not sold in US 2016-2020 or after 2024.
   - Honda Passport: Passport not sold in US 2012-2018.
   - Honda Insight: Not sold in US 2015-2018. 2012-2014 optional 16in sizes omitted (conflicting sources). Mavis lists P185/60R15 for 2012.
   - Nissan Leaf: 2012 had SV/SL only, both 16in. 2026 is the new 3rd-gen crossover; wheel-size also lists 195/60R18 (unassigned), omitted.
   - Chevrolet Spark: Sold in US 2013-2022. Spark EV (2014-2016, 185/55R15 front / 195/55R15 rear) omitted.
   - Chevrolet Sonic: US sales 2012-2020. RS (2013-2016) assumed same 17in size as LTZ. Optional 16in package on 2012-2016 LT not included.
   - Chevrolet Silverado 2500HD: Optional LT265/70R17 on 17in trims omitted. 2025-2026 assumed same as 2024 (same generation). Custom Trail Boss omitted (unverified).
   - GMC Sierra 2500HD: 2017-2019 Denali assumed same as 2016 (same generation). AT4 size switch year (18in->20in) placed at 2024 refresh; 2022-2023 AT4 not directly checked. 2025-2026 assumed same as 2024.
   - Ford F-350 Super Duty: LT275/70R18 listed as an alternate 18in OE size by sizemytires for 2018-2022 but not included as primary. Tremor size from sizemytires 2020-2022 trim grouping; 2023+ Tremor assumed. Platinum 2012 not listed (introduced 2013). XL 4x4 chassis cabs on LT275/65R18.
   - Ford EcoSport: US sales 2018-2022.
   - Ford Flex: Titanium was 2012 only; 2013+ 20in on Limited EcoBoost/optional.
   - Ford Taurus: US sales ended 2019. Police Interceptor omitted. SHO 20in optional earlier years not included.
   - Lincoln MKZ: 2013-2016 rows verified 2014-2015 only. Optional 19in on 2013-2016 and 20in on 2017-2020 3.0T not verified, omitted. MKZ Hybrid shares sizes.
   - Dodge Journey: US sales through 2020. 16in base: verified 2012 only (2014 base already on 17in); 2013 unknown.
   - Kia Rio: US sales ended 2023. Includes sedan and 5-door. 2012-2017 EX optional 16in not included.
   Skipped (no verified data): none
   Note: queue alias "K5" on Kia Optima not mapped; "kia|k5" holds the 2021+ K5 data. */
