import "dotenv/config"

import { readFileSync } from "fs"
import mongoose from "mongoose"

import Game, { driveSchema } from "./src/models/Game.js"
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

  const drives1 = JSON.parse(readFileSync("./data/drives1.json", "utf-8"))
  const drives2 = JSON.parse(readFileSync("./data/drives2.json", "utf-8"))

  const Drive = mongoose.model("Drive", driveSchema)

  for (const g of drives1) {
    const awayDrives = g.drives.away.map((d) => new Drive(d).toObject())
    const homeDrives = g.drives.home.map((d) => new Drive(d).toObject())

    await Game.updateOne(
      { "ids.pfr": g.pfr },
      {
        $set: {
          "away.stats.drives": awayDrives,
          "home.stats.drives": homeDrives,
        },
      },
    )

    console.log(g.pfr)
  }

  for (const g of drives2) {
    const awayDrives = g.drives.away.map((d) => new Drive(d).toObject())
    const homeDrives = g.drives.home.map((d) => new Drive(d).toObject())

    await Game.updateOne(
      { "ids.pfr": g.pfr },
      {
        $set: {
          "away.stats.drives": awayDrives,
          "home.stats.drives": homeDrives,
        },
      },
    )

    console.log(g.pfr)
  }

  // ! ---------------------- READ FROM CSV -------------------------------
  // const updates = []
  // fs.createReadStream("data/stadiums.csv")
  //   .pipe(csv())
  //   .on("data", (row) => {
  //     try {
  //       // Push the update promise to an array
  //       updates.push(
  //         Stadium.updateOne(
  //           { pfr: row.pfrId },
  //           {
  //             $set: {
  //               timezone: row.timezone,
  //             },
  //           },
  //         ),
  //       )
  //     } catch (error) {
  //       console.error("Error processing row:", row, error)
  //     }
  //   })
  //   .on("end", async () => {
  //     console.log(`✅ Processing ${updates.length} updates...`)
  //     try {
  //       // await all updates to ensure they complete
  //       await Promise.all(updates)
  //       // const arr = JSON.stringify(missingGametime, null, 2)
  //       // fs.writeFileSync("data/missingGametime.json", arr)
  //       console.log("🚀 All updates completed successfully!")
  //     } catch (error) {
  //       console.error("❌ Error updating documents:", error)
  //     } finally {
  //       process.exit(0)
  //     }
  //   })
  //   .on("error", console.error)
}

playground()
