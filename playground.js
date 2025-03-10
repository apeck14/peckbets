import "dotenv/config"

import { readdir, writeFile } from "node:fs/promises"

import path from "path"

import PlayByPlay from "./src/schemas/PlayByPlay.js"
import {
  getReceivingTeamFromDetail,
  getTeamAbbrByName,
  getTeamAbbreviationsFromPlays,
  loadJSON,
} from "./src/util/functions.js"
import connectDB from "./src/util/mongoose.js"

await connectDB()

// TODO: confirm 201210070car is good to go

async function playground() {
  // ! ---------------------- READ FROM JSON -------------------------------
  // try {
  //   const PLAYBYPLAYs = await PlayByPlay.find({}).lean()
  //   const files = await readdir(path.join(process.cwd(), "data/newPlays"))
  //   const updates = []
  //   for (const f of files) {
  //     const newPlayByPlay = loadJSON(`../../data/newPlays/${f}`)
  //     const oldPlayByPlay = PLAYBYPLAYs.find((g) => g.pfr === newPlayByPlay.pfr)
  //     if (!oldPlayByPlay) continue
  //     const updatedPlays = []
  //     const teams = getTeamAbbreviationsFromPlays(oldPlayByPlay.plays)
  //     const receivingTeam = getReceivingTeamFromDetail(oldPlayByPlay.plays[0].detail)
  //     const receivingTeamAbbr = getTeamAbbrByName(receivingTeam, teams)
  //     const receivingTeamIndex = teams.indexOf(receivingTeamAbbr)
  //     let currentPosIndex = receivingTeamIndex
  //     const score = {
  //       away: 0,
  //       home: 0,
  //     }
  //     const filteredNewPlays = newPlayByPlay.plays.filter((p) => p)
  //     if (filteredNewPlays.length !== oldPlayByPlay.plays.length) {
  //       console.log(newPlayByPlay.pfr, filteredNewPlays.length, oldPlayByPlay.plays.length)
  //       continue
  //     }
  //     for (let i = 0; i < filteredNewPlays.length; i++) {
  //       try {
  //         const newPlay = filteredNewPlays[i]
  //         const oldPlay = oldPlayByPlay.plays[i]
  //         const updatedPlay = { ...oldPlay }
  //         const isCoinToss = newPlay?.detail.includes("coin toss")
  //         if (!isCoinToss) {
  //           // fill in missing scores (non-coin toss entries) & update score
  //           if (updatedPlay.homePts === null) {
  //             if (newPlay.home) {
  //               score.home = parseInt(newPlay.home)
  //             }
  //             updatedPlay.homePts = score.home
  //           }
  //           if (updatedPlay.awayPts === null) {
  //             if (newPlay.away) {
  //               score.away = parseInt(newPlay.away)
  //             }
  //             updatedPlay.awayPts = score.away
  //           }
  //         }
  //         if (newPlay?.isOvertime) {
  //           if (isCoinToss) {
  //             const otRecTeam = getReceivingTeamFromDetail(newPlay.detail)
  //             const otRecTeamAbbr = getTeamAbbrByName(otRecTeam, teams)
  //             const otRecTeamIndex = teams.indexOf(otRecTeamAbbr)
  //             currentPosIndex = otRecTeamIndex
  //           }
  //           updatedPlay.quarter = 5
  //         }
  //         if (newPlay?.changeOfPos) {
  //           if (newPlay?.startOfThirdQuarter) {
  //             currentPosIndex = receivingTeamIndex === 0 ? 1 : 0
  //           } else currentPosIndex = currentPosIndex === 0 ? 1 : 0
  //         }
  //         updatedPlay.possession = isCoinToss ? null : teams[currentPosIndex]
  //         updatedPlays.push(updatedPlay)
  //       } catch (e) {
  //         console.log(e)
  //       }
  //     }
  //     updates.push({ pfr: oldPlayByPlay.pfr, updatedPlays })
  //   }
  //   await writeFile(path.join(process.cwd(), "data/revisedPlays.json"), JSON.stringify(updates, null, 2), "utf-8")
  //   console.log("Updated plays written to /data/revisedPlays")
  // } catch (error) {
  //   console.error("Error processing plays:", error)
  // }
  // ! ---------------------- READ FROM CSV -------------------------------
  // fs.readdir("data/brokenCSVs", async (err, files) => {
  //   if (err) {
  //     console.error("Error reading directory:", err)
  //     return
  //   }
  //   for (const file of files) {
  //     const plays = []
  //     fs.createReadStream(`data/brokenCSVs/${file}`)
  //       .pipe(csvParser())
  //       .on("data", (row) => {
  //         try {
  //           const keys = Object.keys(row)
  //           const entry = {
  //             away: row[keys[5]],
  //             changeOfPos: false,
  //             detail: row.Detail,
  //             home: row[keys[6]],
  //             isOvertime: false,
  //           }
  //           plays.push(entry)
  //         } catch (error) {
  //           console.error("Error processing row:", row, error)
  //         }
  //       })
  //       .on("end", () => {
  //         const pfr = file.split(".")[0]
  //         console.log(pfr)
  //         fs.writeFile(`data/newPlays/${pfr}.json`, JSON.stringify({ pfr, plays }), "utf8", (e) => {
  //           if (e) console.error(e)
  //         })
  //       })
  //       .on("error", (error) => {
  //         console.error("Error processing file:", file, error)
  //       })
  //   }
  // })
  // const revisedPlays = loadJSON("../../data/revisedPlays.json")
  // const updates = revisedPlays.map(({ pfr, updatedPlays }) =>
  //   PlayByPlay.updateOne({ pfr }, { $set: { plays: updatedPlays } }),
  // )
  // await Promise.all(updates)
  // console.log("Done!")
}

playground()
