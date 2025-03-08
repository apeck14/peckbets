import { sleep } from "../util/functions.js"

const parseLos = (losStr, teamStr) => {
  const [team, yards] = losStr.split(" ")
  const parsedYards = parseInt(yards?.trim()) || 50

  if (parsedYards === 50) return 50
  return team === teamStr ? parsedYards : parsedYards + 50
}

const parseTos = (tosStr) => {
  const [minutes, seconds] = tosStr.split(":").map(Number)
  return minutes + seconds / 60
}

// https://www.pro-football-reference.com/boxscores/199909120atl.htm
export default async (browser, games = [], delay = 501) => {
  console.log(`Starting getPFRGameData.js... (Est: ${((games.length * delay) / 1000 / 60).toFixed(1)} mins)`)

  const newEntries = []

  const page = await browser.newPage()
  await page.setDefaultNavigationTimeout(15000)

  for (const g of games) {
    console.log(`${g.ids.pfr}...`)

    try {
      const URL = `https://www.pro-football-reference.com/boxscores/${g.ids.pfr}.htm`

      await page.goto(URL, {
        waitUntil: "networkidle2",
      })

      // * GAMETIME
      // const startTime = await page.evaluate(() => {
      //   const parent = document.querySelector(".scorebox_meta")
      //   if (parent) {
      //     const childDivs = parent.querySelectorAll("div") // Select all child divs
      //     return childDivs.length > 1 ? childDivs[1].textContent.trim() : null
      //   }
      //   return null
      // })

      // const gametime = startTime.slice(startTime.lastIndexOf(" ") + 1)

      // * DRIVES
      // const drives = await page.evaluate(() => {
      //   const drivesObj = { away: [], home: [] }

      //   const homeDrives = document.querySelectorAll("#home_drives tbody tr")
      //   const awayDrives = document.querySelectorAll("#vis_drives tbody tr")

      //   for (const row of homeDrives) {
      //     const driveNum = row.getAttribute("data-row")
      //     const los = row.querySelector("td[data-stat='start_at']")
      //     const netYds = row.querySelector("td[data-stat='net_yds']")
      //     const plays = row.querySelector("td[data-stat='play_count_tip']")
      //     const result = row.querySelector("td[data-stat='end_event']")
      //     const tos = row.querySelector("td[data-stat='time_total']")

      //     drivesObj.home.push({
      //       driveNum: parseInt(driveNum) + 1,
      //       los: los?.textContent.trim(),
      //       netYds: parseInt(netYds?.textContent.trim()),
      //       plays: parseInt(plays?.textContent.trim()),
      //       result: result?.textContent.trim().toUpperCase(),
      //       tos: tos?.textContent.trim(),
      //     })
      //   }

      //   for (const row of awayDrives) {
      //     const driveNum = row.getAttribute("data-row")
      //     const los = row.querySelector("td[data-stat='start_at']")
      //     const netYds = row.querySelector("td[data-stat='net_yds']")
      //     const plays = row.querySelector("td[data-stat='play_count_tip']")
      //     const result = row.querySelector("td[data-stat='end_event']")
      //     const tos = row.querySelector("td[data-stat='time_total']")

      //     drivesObj.away.push({
      //       driveNum: parseInt(driveNum) + 1,
      //       los: los?.textContent.trim(),
      //       netYds: parseInt(netYds?.textContent.trim()),
      //       plays: parseInt(plays?.textContent.trim()),
      //       result: result?.textContent.trim().toUpperCase(),
      //       tos: tos?.textContent.trim(),
      //     })
      //   }

      //   return drivesObj
      // })

      // // convert line of scrimmages & time of possesion to decimals
      // for (const d of drives.home) {
      //   d.tos = parseTos(d.tos)
      //   d.los = parseLos(d.los)
      // }

      // for (const d of drives.away) {
      //   d.tos = parseTos(d.tos)
      //   d.los = parseLos(d.los)
      // }

      const newEntry = { pfr: g.ids.pfr }

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
