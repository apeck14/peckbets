import "dotenv/config"

import puppeteer from "puppeteer-extra"
import AdblockerPlugin from "puppeteer-extra-plugin-adblocker"
import StealthPlugin from "puppeteer-extra-plugin-stealth"

import Game from "../schemas/Game.js"
import connectDB from "../util/mongoose.js"
import getPlayByPlayData from "./getPlayByPlayData.js"

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
      const errors = ["201312020sea", "201909150atl"]
      const GAMES = await Game.find({ "ids.pfr": { $in: errors } }).lean()

      /*
      broken tables:
      200009030nwe... 1 / 12
      200009100cin... 2 / 12
      200009100sdg... 3 / 12
      200009240atl... 4 / 12
      200010080chi... 5 / 12
      200010150nor... 6 / 12
      200010160oti... 7 / 12
      200011120sdg... 8 / 12
      200012310rav... 9 / 12
      200109300was... 10 / 12
      200112090ram... 11 / 12
      201810280rai... 12 / 12

      overtime:
      200010230nyj
      */

      //* set scrapers to run here
      await getPlayByPlayData(browser, GAMES)
    } catch (e) {
      console.log(e)
    } finally {
      console.log("Done!")
    }

    process.exit()
  })
