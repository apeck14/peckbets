import { sleep } from "../util/functions.js"

// entries: [pfrId]
// https://www.pro-football-reference.com/boxscores/199909120atl.htm
export default async (browser, entries = [], delay = 2001) => {
  console.log(`Starting getPFRGameData.js... (Est: ${((entries.length * delay) / 1000 / 60).toFixed(1)} mins)`)

  const newEntries = []

  const page = await browser.newPage()
  await page.setDefaultNavigationTimeout(15000)

  for (const pfrId of entries) {
    try {
      const URL = `https://www.pro-football-reference.com/boxscores/${pfrId}.htm`

      await page.goto(URL, {
        waitUntil: "networkidle2",
      })

      const startTime = await page.evaluate(() => {
        const parent = document.querySelector(".scorebox_meta")
        if (parent) {
          const childDivs = parent.querySelectorAll("div") // Select all child divs
          return childDivs.length > 1 ? childDivs[1].textContent.trim() : null
        }
        return null
      })

      const gametime = startTime.slice(startTime.lastIndexOf(" ") + 1)
      const newEntry = { gametime, pfr: pfrId }

      newEntries.push(newEntry)

      await sleep(delay)
    } catch (e) {
      console.error(e)
      continue
    }
  }

  await browser.close()

  return newEntries
}
