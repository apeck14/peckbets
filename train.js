/* eslint-disable import/prefer-default-export */
import "dotenv/config"

import * as tf from "@tensorflow/tfjs-node"
import fs from "fs"
import path from "path"

import Season from "./models/Season.js"
import connectDB from "./src/util/mongoose.js"

await connectDB()

/**
 * Normalizes a value to a range between 0 and 1.
 *
 * @param {number} value - The value to normalize
 * @param {number} min - The minimum value in the dataset
 * @param {number} max - The maximum value in the dataset
 * @returns {number} - Normalized value between 0 and 1
 */
export function normalize(value, min, max) {
  // Handle edge cases
  if (min === max) return 0.5 // If all values are the same, return middle of range
  if (value <= min) return 0 // Handle values at or below minimum
  if (value >= max) return 1 // Handle values at or above maximum

  // Perform normalization
  return (value - min) / (max - min)
}

async function saveModel(model, incrementSave = true) {
  const tfModelsDir = path.resolve("tf-models")

  const existingDirs = fs
    .readdirSync(tfModelsDir)
    .filter((item) => fs.statSync(path.join(tfModelsDir, item)).isDirectory())
    .filter((dir) => dir.startsWith("model-"))

  const increment =
    existingDirs.length > 0
      ? Math.max(...existingDirs.map((dir) => parseInt(dir.split("-")[1]) || 0)) + (incrementSave ? 1 : 0)
      : 1

  const modelPath = path.resolve(`tf-models/model-${increment}`)
  console.log(`Saving model to: ${modelPath}`)

  // Save the model
  await model.save(`file://${modelPath}`)
  console.log("✅ Model trained and saved!")
}

async function getTrainingData(excludedSeasons = [2023, 2024], write = false) {
  try {
    const SEASONS = await Season.find({ season: { $nin: excludedSeasons } }).lean()

    const games = []

    for (const s of SEASONS) {
      for (let i = 0; i < s.regularSeason.length; i++) {
        const g = s.regularSeason[i]

        if (g.result === 0) continue

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
      fs.writeFileSync("data/trainingData.json", JSON.stringify(output))
      console.log("✅ Training data writen to trainingData.json!")
    }

    return output
  } catch (e) {
    console.log(e)
  }
}

async function trainAndSave(data, incrementSave = true) {
  const model = tf.sequential()

  // Add layers
  model.add(
    tf.layers.dense({
      activation: "relu",
      biasInitializer: "zeros",
      inputShape: [2],
      kernelInitializer: "glorotNormal",
      units: 16,
    }),
  )

  model.add(
    tf.layers.dense({
      activation: "relu",
      biasInitializer: "zeros",
      kernelInitializer: "glorotNormal",
      units: 8,
    }),
  )

  model.add(
    tf.layers.dense({
      activation: "sigmoid",
      biasInitializer: "zeros",
      kernelInitializer: "glorotNormal",
      units: 1,
    }),
  )

  model.compile({
    loss: "binaryCrossentropy",
    metrics: ["accuracy"],
    optimizer: tf.train.adam(0.0005, 0.9, 0.999, 1e-7), // Lower learning rate and epsilon
  })

  const xs = tf.tensor2d(data.features, [data.features.length, data.features[0].length])
  const ys = tf.tensor2d(data.labels, [data.labels.length, data.labels[0].length])

  console.log("Training model...")
  const history = await model.fit(xs, ys, {
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        if (epoch % 10 === 0) {
          console.log(
            `Epoch ${epoch}: loss = ${logs.loss?.toFixed(4) || "NaN"}, accuracy = ${logs.acc?.toFixed(4) || "NaN"}`,
          )
        }

        // Check for NaN and stop training if detected
        if (Number.isNaN(logs.loss)) {
          console.error("NaN loss detected. Stopping training.")
          model.stopTraining = true
        }
      },
    },
    epochs: 100,
    validationSplit: 0.2,
  })

  console.log("\nTraining complete!")
  console.log(`Final Loss: ${history.history.loss[history.history.loss.length - 1].toFixed(4)}`)
  console.log(`Final Accuracy: ${(history.history.acc[history.history.acc.length - 1] * 100).toFixed(2)}%`)
  console.log(`Validation Loss: ${history.history.val_loss[history.history.val_loss.length - 1].toFixed(4)}`)
  console.log(`Validation Accuracy: ${(history.history.val_acc[history.history.val_acc.length - 1] * 100).toFixed(2)}%`)

  saveModel(model, incrementSave)
}

// getTrainingData([1999, 2000, 2001, 2002, 2003, 2004, 2005, 2023, 2024], true).then(trainAndSave)
