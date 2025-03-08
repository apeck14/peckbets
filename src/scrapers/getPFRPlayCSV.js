import fs from "fs"

import { sleep } from "../util/functions.js"

// https://www.pro-football-reference.com/boxscores/199909120atl.htm
export default async (browser, games = [], delay = 501) => {
  console.log(`Starting getPFRPlayCSV.js... (Est: ${((games.length * delay) / 1000 / 60).toFixed(1)} mins)`)

  const newEntries = []

  const page = await browser.newPage()
  await page.setDefaultNavigationTimeout(10000)

  for (const g of games) {
    console.log(`${g.ids.pfr}...`)

    try {
      const URL = `https://www.pro-football-reference.com/boxscores/${g.ids.pfr}.htm`

      await page.goto(URL, {
        waitUntil: "networkidle2",
      })

      const xp = '::-p-xpath(//*[@id="pbp_sh"]/div/ul/li[1])'
      const dropdown = await page.waitForSelector(xp)

      await dropdown.click()

      const option = await page.waitForSelector(
        "#pbp_sh > div > ul > li.hasmore.drophover > div > ul > li:nth-child(3) > button",
      )

      await option.tap()

      const csvXp = '::-p-xpath(//*[@id="csv_pbp"]/text()[2])'
      const csv = await page.waitForSelector(csvXp)
      const text = await csv.evaluate((el) => el.textContent.trim())

      fs.writeFile(`data/playByPlays/${g.ids.pfr}.csv`, text, "utf8", (e) => {
        if (e) console.error(e)
      })
    } catch (e) {
      console.error(e)
      continue
    } finally {
      await sleep(delay)
    }
  }

  await browser.close()

  return newEntries
}
