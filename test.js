import "dotenv/config"

import * as tf from "@tensorflow/tfjs-node"
import fs from "fs"
import path from "path"

import Season from "./models/Season.js"
import connectDB from "./src/util/mongoose.js"
import { normalize } from "./train.js"

await connectDB()

async function getTestData(includedSeasons = [2023, 2024], write = true) {
  try {
    const SEASONS = await Season.find({ season: { $in: includedSeasons } }).lean()

    const games = []

    for (const s of SEASONS) {
      for (let i = 0; i < s.regularSeason.length; i++) {
        const g = s.regularSeason[i]

        if (g.result === 0) continue // skip ties

        const winPerc = g.record.losses + g.record.wins === 0 ? 0.5 : g.record.wins / (g.record.losses + g.record.wins)

        const gameObj = {
          // gamesCompleted: scaleData(i, 0, s.regularSeason.length - 1),
          outcome: g.result > 0 ? 1 : 0,
          streak: i === 0 ? 0.5 : normalize(g.record.streak, -i, s.regularSeason.length - 1),
          winPerc,
        }

        games.push(gameObj)
      }
    }

    const output = {
      features: games.map((g) => [g.winPerc, g.streak]),
      labels: games.map((g) => [g.outcome]),
    }

    if (write) {
      fs.writeFileSync("data/testData.json", JSON.stringify(output))
      console.log("✅ Test data writen to testData.json!")
    }

    return output
  } catch (e) {
    console.log(e)
  }
}

async function evaluateModel(modelNum, data) {
  // Load the trained model
  const modelPath = path.resolve(`tf-models/model-${modelNum}/model.json`)
  const model = await tf.loadLayersModel(`file://${modelPath}`)

  const { features, labels } = data

  // Prepare the new data (make sure it's in the right shape, e.g., a 2D tensor)
  const featureTensor = tf.tensor2d(features, [features.length, features[0].length])
  const labelTensor = tf.tensor2d(labels, [labels.length, labels[0].length])

  const predictions = model.predict(featureTensor)
  const predictionValues = predictions.dataSync()

  console.log("Predictions: ", predictionValues)

  let truePositives = 0
  let trueNegatives = 0
  let falsePositives = 0
  let falseNegatives = 0
  let correctPredictions = 0

  for (let i = 0; i < labels.length; i++) {
    const actual = labels[i][0]
    const predicted = predictionValues[i] >= 0.5 ? 1 : 0

    if (predicted === actual) {
      correctPredictions++
      if (actual === 1) {
        truePositives++
      } else {
        trueNegatives++
      }
    } else if (predicted === 1) {
      falsePositives++
    } else {
      falseNegatives++
    }
  }

  const accuracy = correctPredictions / labels.length
  const precision = truePositives / (truePositives + falsePositives) || 0
  const recall = truePositives / (truePositives + falseNegatives) || 0
  const f1Score = (2 * (precision * recall)) / (precision + recall) || 0

  featureTensor.dispose()
  labelTensor.dispose()
  predictions.dispose()

  const metrics = {
    confusionMatrix: {
      falseNegatives,
      falsePositives,
      trueNegatives,
      truePositives,
    },
    metrics: {
      accuracy, // Out of all the predictions we made, how many were true?
      f1Score,
      precision, // Out of all the positive predictions we made, how many were true?
      recall, // Out of all the data points that should be predicted as true, how many did we correctly predict as true?
    },
  }

  console.log(metrics)

  return metrics
}

// const data = await gatherTrainingData([2023, 2024], true)
getTestData().then((data) => evaluateModel(3, data))
