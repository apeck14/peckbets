import "dotenv/config"

import * as tf from "@tensorflow/tfjs-node-gpu"
import fs from "fs"

import Game from "../models/Game.js"
import Season from "../models/Season.js"
import { normalize } from "../util/functions.js"
import connectDB from "../util/mongoose.js"

export const features = {
  adjustedSeasonWinPerc: ({ i, record, seasonLength }) => {
    const gamesCompleted = normalize(i, 0, seasonLength - 1)
    const seasonWinPerc = record.losses + record.wins === 0 ? 0.5 : record.wins / (record.losses + record.wins)
    return seasonWinPerc * gamesCompleted
  },
  isHomeTeam: ({ isHomeTeam }) => (isHomeTeam ? 1 : 0),
  winLossStreak: ({ i, record, seasonLength }) => (i === 0 ? 0.5 : normalize(record.streak, -i, seasonLength - 1)),
}

export default class NFLDataProcessor {
  constructor() {
    this.trainingData = []
    this.testData = []
    this.xTrain = null
    this.yTrain = null
    this.xTest = null
    this.yTest = null
  }

  // Load and normalize all training data
  async loadData(startingSeason = 1999, endingSeason = 2024, testSeasons = [2023, 2024]) {
    try {
      await connectDB()

      const [SEASONS, GAMES] = await Promise.all([
        Season.find({ season: { $gte: startingSeason, $lte: endingSeason } }).lean(),
        Game.find({ season: { $gte: startingSeason, $lte: endingSeason } }).lean(),
      ])

      console.log("✅ Training data successfully loaded!")

      const trainingData = []
      const testData = []

      for (const s of SEASONS) {
        for (let i = 0; i < s.regularSeason.length; i++) {
          const g = s.regularSeason[i]
          const { home, wasPlayedAtHome } = GAMES.find((ga) => ga.ids.pfr === g.pfr)

          // skip ties
          if (g.result === 0) continue

          const normalizeParams = {
            i,
            isHomeTeam: wasPlayedAtHome && home.team === s.team,
            record: g.record,
            result: g.result,
            seasonLength: s.regularSeason.length,
          }

          // initialize data with outcome
          const gameObj = {
            outcome: g.result > 0 ? 1 : 0,
          }

          // set features and run normalize functions
          for (const feature of Object.keys(features)) {
            gameObj[feature] = features[feature](normalizeParams)
          }

          if (testSeasons.includes(s.season)) testData.push(gameObj)
          else trainingData.push(gameObj)
        }
      }

      this.trainingData = trainingData
      this.testData = testData
      console.log("✅ Training data successfully normalized!")

      return true
    } catch (e) {
      console.log(e)
    }
  }

  // Process and split into testing and training data
  preprocessData(writeToFile = false) {
    try {
      const featureKeys = Object.keys(features)

      // Create feature arrays
      const trainXs = this.trainingData.map((d) => featureKeys.map((f) => d[f]))
      const testXs = this.testData.map((d) => featureKeys.map((f) => d[f]))

      // Create label arrays
      const trainYs = this.trainingData.map((d) => [d.outcome])
      const testYs = this.testData.map((d) => [d.outcome])

      // Convert to tensors
      this.xTrain = tf.tensor2d(trainXs, [trainXs.length, featureKeys.length])
      this.yTrain = tf.tensor2d(trainYs, [trainYs.length, 1])
      this.xTest = tf.tensor2d(testXs, [testXs.length, featureKeys.length])
      this.yTest = tf.tensor2d(testYs, [testYs.length, 1])

      console.log(`Data split: ${this.trainingData.length} training samples, ${this.testData.length} testing samples`)

      if (writeToFile) {
        fs.writeFileSync("data/testData.json", JSON.stringify(this.testData))
        fs.writeFileSync("data/trainingData.json", JSON.stringify(this.trainingData))
        console.log("✅ Test & training data succefully written!")
      }

      return {
        xTest: this.xTest,
        xTrain: this.xTrain,
        yTest: this.yTest,
        yTrain: this.yTrain,
      }
    } catch (e) {
      console.log(e)
    }
  }

  // Generate statistics about the data
  analyzeData() {
    const stats = {}

    for (const feature of Object.keys(features)) {
      const values = this.trainingData.map((row) => parseFloat(row[feature]))
      stats[feature] = {
        max: Math.max(...values),
        mean: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        std: Math.sqrt(
          values.reduce((sum, val) => {
            const mean = values.reduce((s, v) => s + v, 0) / values.length
            return sum + (val - mean) ** 2
          }, 0) / values.length,
        ),
      }
    }

    // Analyze win/loss distribution
    let wins = 0
    let losses = 0
    let homeTeamWins = 0
    let homeGames = 0

    for (const d of this.trainingData) {
      if (d.outcome === 1) wins++
      else if (d.outcome === 0) losses++

      if (d.isHomeTeam === 1) {
        homeGames++

        if (d.outcome === 1) homeTeamWins++
      }
    }

    stats.outcomes = {
      losses,
      totalGames: wins + losses,
      wins,
    }

    stats.homeAdvantage = {
      homeGames,
      homeWinPercentage: `${((homeTeamWins / homeGames) * 100).toFixed(2)}%`,
      homeWins: homeTeamWins,
    }

    return stats
  }
}
