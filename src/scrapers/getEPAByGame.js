import { sleep } from "../util/functions.js"

const winProbability = (scoreDiff, timeRemaining, fieldPos, yardsToGo) => {
  // Coefficients based on historical NFL data (example values)
  const beta0 = -2.5 // Intercept
  const beta1 = 0.15 // Score Differential weight
  const beta2 = 0.03 // Time Remaining weight
  const beta3 = 0.08 // Field Position weight
  const beta4 = -0.1 // Yards to Go weight

  // Logistic regression equation
  const x = beta0 + beta1 * scoreDiff + beta2 * timeRemaining + beta3 * fieldPos + beta4 * yardsToGo

  // Sigmoid function to convert to probability (0 to 1 range)
  return 1 / (1 + Math.exp(-x))
}

// https://www.pro-football-reference.com/boxscores/199909120atl.htm
export default async (browser, games = [], delay = 501) => {
  console.log(`Starting getEPAByGame.js... (Est: ${((games.length * delay) / 1000 / 60).toFixed(1)} mins)`)

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

      const home = {
        actual: {
          epAfter: 0,
          epBefore: 0,
          plays: 0,
        },
        adj: {
          epAfter: 0,
          epBefore: 0,
          plays: 0,
        },
      }

      const away = {
        actual: {
          epAfter: 0,
          epBefore: 0,
          plays: 0,
        },
        adj: {
          epAfter: 0,
          epBefore: 0,
          plays: 0,
        },
      }

      // * ADJUSTED EPA:
      // exclude punts
      // plays during blowouts (win probability: 6-94%)
      // end of period hail marys, kneels

      const newEntry = { away, home, pfr: g.ids.pfr }

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
