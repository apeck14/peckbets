import "dotenv/config"

import fs from "fs"
import puppeteer from "puppeteer-extra"
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

import Game from "./models/Game.js"
import Stadium from "./models/Stadium.js"
import getGameData from "./src/scrapers/getGameData.js"
import getWeatherData from "./src/scrapers/getWeatherData.js"
import { loadJSON } from "./util/functions.js"
import connectDB from "./util/mongoose.js"

await connectDB()

// async function gatherWeatherEntries() {
//   const ALL_STADIUMS = await Stadium.find({}).lean()
//   const ALL_GAMES = await Game.find({}).lean()

//   const data = []

//   for (const id of missingWeatherGamePfrIds) {
//     const game = ALL_GAMES.find((g) => g.ids.pfr === id)
//   }
//   return [] // [{ city: "", state: "", date: new Date() }]
// }

puppeteer.use(StealthPlugin())
puppeteer.use(AdblockerPlugin({ blockTrackers: true }))

puppeteer
  .launch({
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      '--user-data-dir="/tmp/chromium"',
      "--disable-web-security",
      "--disable-features=site-per-process",
      "--start-maximized",
    ],
    headless: true,
  })
  .then(async (browser) => {
    try {
      const entries = loadJSON("./data/missingGametime.json")

      // set scrapers to run here
      const [gametimes] = await Promise.all([getGameData(browser, entries)])

      const arr = JSON.stringify(gametimes, null, 2)
      fs.writeFileSync("data/missingGametime.json", arr)
    } catch (e) {
      console.log(e)
    } finally {
      console.log("Done!")
    }

    process.exit()
  })
