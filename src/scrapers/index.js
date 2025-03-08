import "dotenv/config"

import puppeteer from "puppeteer-extra"
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

import Game from "../schemas/Game.js"
import connectDB from "../util/mongoose.js"
import getPFRPlayCSV from "./getPFRPlayCSV.js"

await connectDB()

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
      const missingGames = ["200001300oti"]
      const GAMES = await Game.find({ "ids.pfr": { $in: missingGames } }).lean()

      //* set scrapers to run here
      await getPFRPlayCSV(browser, GAMES, 500)

      // const arr = JSON.stringify(drives, null, 2)
      // fs.writeFileSync("data/drives2.json", arr)
    } catch (e) {
      console.log(e)
    } finally {
      console.log("Done!")
    }

    process.exit()
  })
