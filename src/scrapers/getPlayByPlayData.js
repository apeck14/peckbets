import fs from "fs"

import { sleep } from "../util/functions.js"

// https://www.pro-football-reference.com/boxscores/199909120atl.htm
export default async (browser, games = [], delay = 251) => {
  console.log(`Starting getPlayByPlayData.js... (Min: ${((games.length * delay) / 1000 / 60).toFixed(1)} mins)`)

  const page = await browser.newPage()
  await page.setDefaultNavigationTimeout(10000)

  const errors = []

  for (let i = 0; i < games.length; i++) {
    const g = games[i]
    console.log(`${g.ids.pfr}... ${i + 1} / ${games.length}`)

    try {
      const URL = `https://www.pro-football-reference.com/boxscores/${g.ids.pfr}.htm`

      await page.goto(URL, {
        waitUntil: "networkidle2",
      })

      const allNewRows = []

      const tableXp = '::-p-xpath(//*[@id="pbp"]/tbody)'
      const tBody = await page.waitForSelector(tableXp, { timeout: 10000 })

      const rows = await page.evaluate((tbody) => {
        let coinTossHappened = false
        let startOfThirdQuarter = false

        return Array.from(tbody.querySelectorAll("tr")).map((tr) => {
          const isHeaderRow = tr.classList.contains("thead")

          if (isHeaderRow) {
            // check for 3rd quarter to set changeOfPos true for next data row
            const td = tr.querySelector("td")
            const text = td?.innerText.trim()

            if (text === "3rd Quarter") startOfThirdQuarter = true

            return null
          }

          const detailTd = tr.querySelector('td[data-stat="detail"]')
          const quarterTh = tr.querySelector('th[data-stat="quarter"]')
          const homeTd = tr.querySelector('td[data-stat="pbp_score_hm"]')
          const awayTd = tr.querySelector('td[data-stat="pbp_score_aw"]')

          const detail = detailTd?.innerText.trim()

          const isCoinToss = detail?.includes("coin toss")
          const isOvertimeKickoff = detail?.includes("overtime kickoff")

          if (isCoinToss && !isOvertimeKickoff) {
            if (coinTossHappened) {
              return null
            }
            coinTossHappened = true
          }

          const changeOfPos = tr.classList.contains("divider")
          const isOvertime = quarterTh?.innerText.trim() === "OT" || isOvertimeKickoff

          if (startOfThirdQuarter) {
            startOfThirdQuarter = false

            return {
              away: awayTd?.innerText.trim(),
              changeOfPos: true,
              detail,
              home: homeTd?.innerText.trim(),
              isOvertime,
              startOfThirdQuarter: true,
            }
          }

          return { away: awayTd?.innerText.trim(), changeOfPos, detail, home: homeTd?.innerText.trim(), isOvertime }
        })
      }, tBody)

      allNewRows.push(...rows)

      const tableXp2 = '::-p-xpath(//*[@id="pbp"]/tbody[2])'
      const tBody2 = await page.waitForSelector(tableXp2, { timeout: 2000 }).catch(() => {})

      if (tBody2) {
        const rows2 = await page.evaluate((tbody) => {
          let coinTossHappened = false
          let startOfThirdQuarter = false

          return Array.from(tbody.querySelectorAll("tr")).map((tr) => {
            const isHeaderRow = tr.classList.contains("thead")

            if (isHeaderRow) {
              // check for 3rd quarter to set changeOfPos true for next data row
              const td = tr.querySelector("td")
              const text = td?.innerText.trim()

              if (text === "3rd Quarter") startOfThirdQuarter = true

              return null
            }

            const detailTd = tr.querySelector('td[data-stat="detail"]')
            const quarterTh = tr.querySelector('th[data-stat="quarter"]')
            const homeTd = tr.querySelector('td[data-stat="pbp_score_hm"]')
            const awayTd = tr.querySelector('td[data-stat="pbp_score_aw"]')

            const detail = detailTd?.innerText.trim()

            const isCoinToss = detail?.includes("coin toss")
            const isOvertimeKickoff = detail?.includes("overtime kickoff")

            if (isCoinToss && !isOvertimeKickoff) {
              if (coinTossHappened) {
                return null
              }
              coinTossHappened = true
            }

            const changeOfPos = tr.classList.contains("divider")
            const isOvertime = quarterTh?.innerText.trim() === "OT" || isOvertimeKickoff

            if (startOfThirdQuarter) {
              startOfThirdQuarter = false

              return {
                away: awayTd?.innerText.trim(),
                changeOfPos: true,
                detail,
                home: homeTd?.innerText.trim(),
                isOvertime,
                startOfThirdQuarter: true,
              }
            }

            return { away: awayTd?.innerText.trim(), changeOfPos, detail, home: homeTd?.innerText.trim(), isOvertime }
          })
        }, tBody2)

        allNewRows.push(...rows2)
      }

      fs.writeFile(
        `data/newPlays/${g.ids.pfr}.json`,
        JSON.stringify({ pfr: g.ids.pfr, plays: allNewRows }),
        "utf8",
        (e) => {
          if (e) console.error(e)
        },
      )
    } catch (e) {
      console.error(e)
      errors.push(g.ids.pfr)
      continue
    } finally {
      await sleep(delay)
    }
  }

  console.log(`Errors:\n${errors}`)

  await browser.close()
  return errors
}
