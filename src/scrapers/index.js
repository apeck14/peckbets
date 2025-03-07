import "dotenv/config"

import fs from "fs"
import puppeteer from "puppeteer-extra"
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

import Game from "../models/Game.js"
import connectDB from "../util/mongoose.js"
import getPFRGameData from "./getPFRGameData.js"

await connectDB()

function splitArray(arr) {
  const mid = Math.floor(arr.length / 2)
  const left = arr.slice(0, mid)
  const right = arr.slice(mid)
  return [left, right]
}

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
      const GAMES = await Game.find({}).lean()

      const [GAMES1, GAMES2] = splitArray(GAMES)

      //* set scrapers to run here
      const [drives] = await Promise.all([getPFRGameData(browser, GAMES2, 350)])

      const arr = JSON.stringify(drives, null, 2)
      fs.writeFileSync("data/drives2.json", arr)
    } catch (e) {
      console.log(e)
    } finally {
      console.log("Done!")
    }

    process.exit()
  })
