import * as tf from "@tensorflow/tfjs-node-gpu"
import fs from "fs"
import path from "path"

import { features } from "./NFLDataProcessor.js"

const config = {
  batchSize: 32,
  // Early stopping to prevent overfitting
  earlyStoppingPatience: 10,
  epochs: 100,
  layers: [
    { activation: "relu", units: 64 },
    { activation: "relu", units: 32 },
    { activation: "relu", units: 16 },
    { activation: "sigmoid", units: 1 },
  ],
  validationSplit: 0.2,
}

export default class NFLPredictionModel {
  constructor() {
    this.model = null
    this.modelSavePath = ""
  }

  setModelSavePath(incrementSave = true) {
    const tfModelsDir = path.resolve("tf-models")

    const existingDirs = fs
      .readdirSync(tfModelsDir)
      .filter((item) => fs.statSync(path.join(tfModelsDir, item)).isDirectory())
      .filter((dir) => dir.startsWith("model-"))

    const modelNumber = existingDirs.length + (incrementSave ? 1 : 0)

    const modelPath = path.resolve(`tf-models/model-${modelNumber}`)

    this.modelSavePath = modelPath

    console.log("✅ Model save path set!")
  }

  async saveModel(incrementSave = true) {
    if (!this.model) {
      throw new Error("No model to save. Build and train a model first.")
    }

    if (!this.modelSavePath) {
      console.log("No save path set, generating a new one...")
      this.setModelSavePath(incrementSave)
    }

    // Save the model
    await this.model.save(`file://${this.modelSavePath}`)
    console.log("✅ Model saved!")
  }

  async loadModel() {
    try {
      this.model = await tf.loadLayersModel(`file://${this.modelSavePath}/model.json`)
      console.log(`✅ Model loaded from ${this.modelSavePath}`)

      this.model.compile({
        loss: "binaryCrossentropy",
        metrics: ["accuracy"],
        optimizer: tf.train.adam(0.001),
      })

      return this.model
    } catch (error) {
      console.error("Error loading model:", error)
      return null
    }
  }

  buildModel() {
    this.model = tf.sequential()

    // Input layer
    this.model.add(
      tf.layers.dense({
        activation: config.layers[0].activation,
        inputShape: [Object.keys(features).length],
        units: config.layers[0].units,
      }),
    )

    // Hidden layers
    for (let i = 1; i < config.layers.length - 1; i++) {
      this.model.add(
        tf.layers.dense({
          activation: config.layers[i].activation,
          kernelRegularizer: tf.regularizers.l2({ l2: 0.001 }), // L2 regularization to prevent overfitting
          units: config.layers[i].units,
        }),
      )

      // Add dropout for regularization
      this.model.add(tf.layers.dropout({ rate: 0.2 }))
    }

    // Output layer (sigmoid activation for binary classification)
    this.model.add(
      tf.layers.dense({
        activation: config.layers[config.layers.length - 1].activation,
        units: config.layers[config.layers.length - 1].units,
      }),
    )

    // Compile the model (binary cross-entropy for binary classification)
    this.model.compile({
      loss: "binaryCrossentropy",
      metrics: ["accuracy"],
      optimizer: tf.train.adam(0.001),
    })

    console.log("✅ Model built successfully!")
    this.model.summary()
    return this.model
  }

  async trainModel(xTrain, yTrain, xTest, yTest, incrementSave = true) {
    this.setModelSavePath(incrementSave)

    // Store a reference to this for use in callbacks
    const self = this

    // Callbacks for training
    const callbacks = [
      tf.callbacks.earlyStopping({
        monitor: "val_loss",
        patience: config.earlyStoppingPatience,
      }),
      // Custom callback to save the best model with all required methods
      {
        bestValLoss: Infinity,

        onBatchBegin() {},
        onBatchEnd() {},
        onEpochBegin() {},
        async onEpochEnd(epoch, logs) {
          if (logs.val_loss < this.bestValLoss) {
            this.bestValLoss = logs.val_loss
            // Save model when validation loss improves
            await self.model.save(`file://${self.modelSavePath}`)
            console.log(`Model saved at epoch ${epoch + 1} with val_loss: ${logs.val_loss.toFixed(4)}`)
          }
        },
        onTrainBegin() {
          this.bestValLoss = Infinity
        },
        onTrainEnd() {},

        // Required callback methods
        setModel() {},

        setParams() {},
      },

      // Logging callback with all required methods
      {
        onBatchBegin() {},
        onBatchEnd() {},
        onEpochBegin() {},
        onEpochEnd(epoch, logs) {
          console.log(`Epoch ${epoch + 1}/${config.epochs}`)
          console.log(`Loss: ${logs.loss.toFixed(4)}, Accuracy: ${logs.acc.toFixed(4)}`)
          console.log(`Val Loss: ${logs.val_loss.toFixed(4)}, Val Accuracy: ${logs.val_acc.toFixed(4)}`)
        },
        onTrainBegin() {},
        onTrainEnd() {},

        setModel() {},

        setParams() {},
      },
    ]

    // Train the model
    console.log("Starting training...")
    const startTime = Date.now()

    const history = await this.model.fit(xTrain, yTrain, {
      batchSize: config.batchSize,
      callbacks,
      epochs: config.epochs,
      shuffle: true,
      validationData: [xTest, yTest],
    })

    const trainingTime = (Date.now() - startTime) / 1000
    console.log(`✅ Training completed in ${trainingTime.toFixed(2)} seconds`)

    return history
  }

  async evaluate(xTest, yTest) {
    const result = this.model.evaluate(xTest, yTest)
    console.log(`\nEvaluation results:`)

    const loss = result[0].dataSync()[0]
    const accuracy = result[1].dataSync()[0]

    console.log(`Loss: ${loss.toFixed(4)}`)
    console.log(`Accuracy: ${accuracy.toFixed(4)}`)

    // Predictions
    const predictions = this.model.predict(xTest)
    const predArray = predictions.dataSync()
    const yArray = yTest.dataSync()

    let truePositives = 0
    let falsePositives = 0
    let trueNegatives = 0
    let falseNegatives = 0

    for (let i = 0; i < predArray.length; i++) {
      const predicted = predArray[i] >= 0.5 ? 1 : 0
      const actual = yArray[i]

      if (predicted === 1 && actual === 1) truePositives++
      if (predicted === 1 && actual === 0) falsePositives++
      if (predicted === 0 && actual === 0) trueNegatives++
      if (predicted === 0 && actual === 1) falseNegatives++
    }

    // Precision, Recall, F1 Score
    const precision = truePositives / (truePositives + falsePositives || 1)
    const recall = truePositives / (truePositives + falseNegatives || 1)
    const f1Score = (2 * (precision * recall)) / (precision + recall || 1)
    const newAccuracy =
      (truePositives + trueNegatives) / (truePositives + trueNegatives + falsePositives + falseNegatives || 1)

    console.log(`True Positives: ${truePositives}`)
    console.log(`False Positives: ${falsePositives}`)
    console.log(`True Negatives: ${trueNegatives}`)
    console.log(`False Negatives: ${falseNegatives}`)
    console.log(`Updated Accuracy: ${newAccuracy.toFixed(4)}`)
    console.log(`Precision: ${precision.toFixed(4)}`)
    console.log(`Recall: ${recall.toFixed(4)}`)
    console.log(`F1 Score: ${f1Score.toFixed(4)}`)

    // Log Loss Calculation
    let logLoss = 0
    for (let i = 0; i < predArray.length; i++) {
      const pred = Math.max(1e-6, Math.min(1 - 1e-6, predArray[i]))
      logLoss += yArray[i] * Math.log(pred) + (1 - yArray[i]) * Math.log(1 - pred)
    }
    logLoss = -logLoss / predArray.length
    console.log(`Log Loss: ${logLoss.toFixed(4)}`)

    // Brier Score Calculation
    let brierScore = 0
    for (let i = 0; i < predArray.length; i++) {
      brierScore += (predArray[i] - yArray[i]) ** 2
    }
    brierScore /= predArray.length
    console.log(`Brier Score: ${brierScore.toFixed(4)}`)

    // AUC-ROC Calculation
    const sortedPairs = predArray.map((pred, i) => ({ actual: yArray[i], pred })).sort((a, b) => b.pred - a.pred)

    let truePos = 0,
      falsePos = 0
    const totalPos = yArray.filter((y) => y === 1).length
    const totalNeg = yArray.filter((y) => y === 0).length

    let auc = 0,
      prevFpr = 0,
      prevTpr = 0
    for (let i = 0; i < sortedPairs.length; i++) {
      if (sortedPairs[i].actual === 1) truePos++
      else falsePos++

      if (i === sortedPairs.length - 1 || sortedPairs[i].pred !== sortedPairs[i + 1].pred) {
        const tpr = truePos / (totalPos || 1)
        const fpr = falsePos / (totalNeg || 1)

        auc += ((fpr - prevFpr) * (tpr + prevTpr)) / 2
        prevFpr = fpr
        prevTpr = tpr
      }
    }

    console.log(`AUC-ROC: ${auc.toFixed(4)}`)

    return {
      accuracy,
      auc,
      brierScore,
      f1Score,
      falseNegatives,
      falsePositives,
      logLoss,
      loss,
      newAccuracy,
      precision,
      recall,
      trueNegatives,
      truePositives,
    }
  }

  // Predict win probability (not binary outcome)
  predict(features) {
    if (!this.model) {
      throw new Error("No model loaded. Build/load a model first.")
    }

    // Make prediction
    const inputTensor = tf.tensor2d([features])
    const prediction = this.model.predict(inputTensor)
    const winProbability = prediction.dataSync()[0]

    // Clean up tensors
    inputTensor.dispose()
    prediction.dispose()

    return winProbability
  }

  // Batch prediction for multiple games
  predictBatch(featuresBatch) {
    if (!this.model) {
      throw new Error("No model loaded. Build/load a model first.")
    }

    // Make predictions
    const inputTensor = tf.tensor2d(featuresBatch)
    const predictions = this.model.predict(inputTensor)
    const winProbabilities = predictions.dataSync()

    // Clean up tensors
    inputTensor.dispose()
    predictions.dispose()

    return Array.from(winProbabilities)
  }

  async analyzeFeatureImportance(xTest, yTest, numSamples = 100) {
    if (!this.model) {
      throw new Error("No model loaded. Build/load a model first.")
    }

    const featureKeys = Object.keys(features)

    if (featureKeys.length !== xTest.shape[1]) {
      throw new Error("Feature count mismatch: Ensure `features` matches input shape.")
    }

    // Select a subset of test data for analysis
    const sampleSize = Math.min(numSamples, xTest.shape[0])
    const xSample = xTest.slice([0, 0], [sampleSize, xTest.shape[1]])
    const ySample = yTest.slice([0, 0], [sampleSize, 1])

    // Get baseline predictions and loss
    const baselinePreds = this.model.predict(xSample)
    const baselinePerformance = this.model.evaluate(xSample, ySample)
    const baselineLoss = baselinePerformance[0].dataSync()[0]

    baselinePreds.dispose()

    // For each feature, permute values and measure impact
    const featureImportance = {}

    for (let i = 0; i < featureKeys.length; i++) {
      // Create a copy of the sample data
      const xPermuted = xSample.clone()
      const xData = xPermuted.arraySync()

      // Shuffle the values for the current feature
      const featureValues = xData.map((row) => row[i])
      tf.util.shuffle(featureValues)

      // Replace the original values with shuffled values
      for (let j = 0; j < xData.length; j++) {
        xData[j][i] = featureValues[j]
      }

      // Convert back to tensor
      const xPermutedTensor = tf.tensor2d(xData, [sampleSize, xTest.shape[1]])

      // Get new predictions and calculate loss
      const permutedPreds = this.model.predict(xPermutedTensor)
      const permutedLossTensor = tf.metrics.meanSquaredError(ySample, permutedPreds)
      const permutedLoss = permutedLossTensor.dataSync()[0]

      // Store importance as loss difference
      featureImportance[featureKeys[i]] = permutedLoss - baselineLoss

      // Cleanup tensors
      xPermutedTensor.dispose()
      permutedPreds.dispose()
      permutedLossTensor.dispose()
    }

    // Normalize to percentages
    const totalImportance = Object.values(featureImportance).reduce((sum, val) => sum + Math.abs(val), 0)
    const normalizedImportance = {}

    for (const feature in featureImportance) {
      if (!Object.prototype.hasOwnProperty.call(featureImportance, feature)) continue

      normalizedImportance[feature] = `${((Math.abs(featureImportance[feature]) / totalImportance) * 100).toFixed(2)}%`
    }

    return {
      normalized: normalizedImportance,
      raw: featureImportance,
    }
  }

  // Generate calibration curve to check if predicted probabilities match actual win rates
  async generateCalibrationCurve(xTest, yTest, bins = 10) {
    if (!this.model) {
      throw new Error("No model loaded. Build/load a model first.")
    }

    if (bins <= 0) {
      throw new Error("Number of bins must be greater than 0.")
    }

    // Make predictions
    const predictions = this.model.predict(xTest)
    const predArray = predictions.dataSync()
    const yArray = yTest.dataSync()

    // Create bins
    const binSize = 1.0 / bins
    const calibration = []

    for (let i = 0; i < bins; i++) {
      const lowerBound = i * binSize
      const upperBound = (i + 1) * binSize

      // Find predictions in this bin
      const indices = []
      for (let j = 0; j < predArray.length; j++) {
        if (predArray[j] >= lowerBound && predArray[j] < upperBound) {
          indices.push(j)
        }
      }

      // Calculate actual win rate in this bin
      let actualWins = 0
      for (const idx of indices) {
        if (yArray[idx] === 1) {
          actualWins++
        }
      }

      const binCount = indices.length
      const avgPrediction =
        indices.length > 0 ? indices.reduce((sum, idx) => sum + predArray[idx], 0) / indices.length : 0
      const actualWinRate = indices.length > 0 ? actualWins / indices.length : 0

      calibration.push({
        actualWinRate,
        avgPrediction,
        binCenter: (lowerBound + upperBound) / 2,
        binLowerBound: lowerBound,
        binUpperBound: upperBound,
        count: binCount,
      })
    }

    // Clean up
    predictions.dispose()

    return calibration
  }
}
