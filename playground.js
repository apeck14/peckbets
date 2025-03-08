import "dotenv/config"

import csvParser from "csv-parser"
import fs from "fs"

import Game from "./src/schemas/Game.js"
import PlayByPlay from "./src/schemas/PlayByPlay.js"
import { parseTimeLeft } from "./src/util/functions.js"
import connectDB from "./src/util/mongoose.js"

await connectDB()

// determine W-L-T from all games prior from that season for that team

async function playground() {
  // const STADIUMS = await Stadium.find({}).lean()
  // const GAMES = await Game.find({}).lean()
  // const completedSeasonIds = new Set() // "TEAM-SEASON"
  // const entries = []
  // const findGamesByRegularSeason = (team, season) => {
  //   const games = []
  //   for (const g of GAMES) {
  //     const isRegularSeason = g.type === "REG"
  //     const isTeam = g.home.team === team || g.away.team === team
  //     const isSeason = g.season === season
  //     if (isRegularSeason && isTeam && isSeason) games.push(g)
  //   }
  //   return games.sort((a, b) => a.week - b.week)
  // }
  // const createSeasonObj = (team, season, games) => {
  //   const seasonObj = { id: `${team}-${season}`, regularSeason: [], season, team }
  //   let losses = 0
  //   let streak = 0
  //   let ties = 0
  //   let wins = 0
  //   games.sort((a, b) => a.week - b.week)
  //   for (const g of games) {
  //     const isHome = g.home.team === team
  //     const opponent = isHome ? g.away.team : g.home.team
  //     const result = isHome ? g.result : g.result * -1
  //     const gameObj = {
  //       opponent,
  //       pfr: g.ids.pfr,
  //       record: {
  //         losses,
  //         streak,
  //         ties,
  //         wins,
  //       },
  //       result,
  //       week: g.week,
  //     }
  //     seasonObj.regularSeason.push(gameObj)
  //     if (result > 0) {
  //       wins++
  //       if (streak < 0) streak = 1
  //       else streak++
  //     } else if (result < 0) {
  //       losses++
  //       if (streak > 0) streak = -1
  //       else streak--
  //     } else if (result === 0) {
  //       ties++
  //       streak = 0
  //     }
  //   }
  //   return seasonObj
  // }
  // for (const GAME of GAMES) {
  //   try {
  //     const homeSeasonId = `${GAME.home.team}-${GAME.season}`
  //     const awaySeasonId = `${GAME.away.team}-${GAME.season}`
  //     if (!completedSeasonIds.has(homeSeasonId)) {
  //       const homeGames = findGamesByRegularSeason(GAME.home.team, GAME.season)
  //       const homeSeasonObj = createSeasonObj(GAME.home.team, GAME.season, homeGames)
  //       completedSeasonIds.add(homeSeasonId)
  //       await Season.insertOne(homeSeasonObj)
  //     }
  //     if (!completedSeasonIds.has(awaySeasonId)) {
  //       const awayGames = findGamesByRegularSeason(GAME.away.team, GAME.season)
  //       const awaySeasonObj = createSeasonObj(GAME.away.team, GAME.season, awayGames)
  //       completedSeasonIds.add(awaySeasonId)
  //       await Season.insertOne(awaySeasonObj)
  //     }
  //   } catch (e) {
  //     console.log(e)
  //     continue
  //   }
  // }
  // ! ---------------------- READ FROM JSON -------------------------------
  // const drives1 = JSON.parse(readFileSync("./data/drives1.json", "utf-8"))
  // const drives2 = JSON.parse(readFileSync("./data/drives2.json", "utf-8"))
  // const Drive = mongoose.model("Drive", driveSchema)
  // for (const g of drives1) {
  //   const awayDrives = g.drives.away.map((d) => new Drive(d).toObject())
  //   const homeDrives = g.drives.home.map((d) => new Drive(d).toObject())
  //   await Game.updateOne(
  //     { "ids.pfr": g.pfr },
  //     {
  //       $set: {
  //         "away.stats.drives": awayDrives,
  //         "home.stats.drives": homeDrives,
  //       },
  //     },
  //   )
  //   console.log(g.pfr)
  // }
  // for (const g of drives2) {
  //   const awayDrives = g.drives.away.map((d) => new Drive(d).toObject())
  //   const homeDrives = g.drives.home.map((d) => new Drive(d).toObject())
  //   await Game.updateOne(
  //     { "ids.pfr": g.pfr },
  //     {
  //       $set: {
  //         "away.stats.drives": awayDrives,
  //         "home.stats.drives": homeDrives,
  //       },
  //     },
  //   )
  //   console.log(g.pfr)
  // }
  // ! ---------------------- READ FROM CSV -------------------------------

  const GAMES = await Game.find({}).lean()
  const updates = []

  fs.readdir("data/playByPlays", async (err, files) => {
    if (err) {
      console.error("Error reading directory:", err)
      return
    }

    const filePromises = files.map(
      (file) =>
        new Promise((resolve, reject) => {
          try {
            const game = GAMES.find((g) => g.ids.pfr === file.split(".csv")[0])

            if (!game) {
              console.warn(`Game not found for file: ${file}`)
              resolve() // Skip processing this file
            }

            const entry = {
              pfr: game.ids.pfr,
              plays: [],
              result: game.result,
              season: game.season,
            }

            fs.createReadStream(`data/playByPlays/${file}`)
              .pipe(csvParser())
              .on("data", (row) => {
                try {
                  if (row.Quarter === "Quarter" && row.Detail === "Detail") return

                  const keys = Object.keys(row)
                  const homeTeam = keys.find((key) => file.includes(key.toLowerCase()))

                  const nonAwayKeys = ["Quarter", "Time", "Down", "ToGo", "Location", "Detail", "EPB", "EPA", homeTeam]
                  const awayTeam = keys.find((key) => !nonAwayKeys.includes(key))

                  const awayPts = parseInt(row[awayTeam])
                  const homePts = parseInt(row[homeTeam])
                  const epa = parseFloat(row.EPA)
                  const epb = parseFloat(row.EPB)
                  const ydsToGo = parseInt(row.ToGo)

                  const play = {
                    awayPts: !Number.isNaN(awayPts) ? awayPts : null,
                    detail: row.Detail,
                    down: parseInt(row.Down) || null,
                    epAfter: !Number.isNaN(epa) ? epa : null,
                    epBefore: !Number.isNaN(epb) ? epb : null,
                    homePts: !Number.isNaN(homePts) ? homePts : null,
                    location: row.Location || null,
                    quarter: parseInt(row.Quarter) || null,
                    timeLeftInQuarter: row.Time ? parseTimeLeft(row.Time) : null,
                    ydsUntil1st: !Number.isNaN(ydsToGo) ? ydsToGo : null,
                  }

                  entry.plays.push(play)
                } catch (error) {
                  console.error("Error processing row:", row, error)
                }
              })
              .on("end", () => {
                updates.push(entry)
                resolve() // Resolve the promise when processing is complete
              })
              .on("error", (error) => {
                console.error("Error processing file:", file, error)
                reject(error)
              })
          } catch (error) {
            console.error("Error processing file:", file, error)
            reject(error)
          }
        }),
    )

    console.log("Inserting...")

    // Wait for all files to be processed before inserting into the database
    await Promise.all(filePromises)
    await PlayByPlay.insertMany(updates)
    console.log("Successfully inserted into the database.")
  })
}

playground()
