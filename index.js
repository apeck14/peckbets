import NFLDataProcessor from "./src/tf/NFLDataProcessor.js"
import NFLPredictionModel from "./src/tf/NFLPredictionModel.js"

async function runNFLPrediction() {
  try {
    console.log("NFL Game Prediction Model")
    console.log("========================")

    // Process data
    console.log("\n1. Loading and processing data...")
    const dataProcessor = new NFLDataProcessor()
    await dataProcessor.loadData(2005)

    // Analyze the dataset
    console.log("\n2. Analyzing dataset...")
    const dataStats = dataProcessor.analyzeData()
    console.log("Data statistics:")
    console.log(JSON.stringify(dataStats, null, 2))

    // Preprocess the data
    const { xTest, xTrain, yTest, yTrain } = dataProcessor.preprocessData(true)

    // Build and train model
    console.log("\n3. Building and training model...")
    const nflModel = new NFLPredictionModel()
    nflModel.buildModel()

    await nflModel.trainModel(xTrain, yTrain, xTest, yTest)

    // Evaluate the model
    console.log("\n4. Evaluating model...")
    const metrics = await nflModel.evaluate(xTest, yTest)

    // Feature importance
    console.log("\n5. Analyzing feature importance...")
    const importance = await nflModel.analyzeFeatureImportance(xTest, yTest)
    console.log("Feature Importance:")
    console.log(importance)

    // Check calibration
    console.log("\n6. Checking probability calibration...")
    const calibration = await nflModel.generateCalibrationCurve(xTest, yTest)
    console.log("Calibration curve (predicted vs. actual win rates):")
    calibration.forEach((bin) => {
      console.log(
        `  ${(bin.binCenter * 100).toFixed(1)}%: predicted=${(bin.avgPrediction * 100).toFixed(1)}%, actual=${(bin.actualWinRate * 100).toFixed(1)}%, games=${bin.count}`,
      )
    })

    // Save the final model
    console.log("\n7. Saving model...")
    await nflModel.saveModel()

    // Example prediction
    console.log("\n8. Example predictions:")
    const examples = [
      [0.75, 0.8, 1], // Example 1: 75% adj win. rate, 80% streak, home team
      [0.25, 0.2, 0], // Example 2: 25% adj. win rate, 20% streak, away team
      [0.5, 0.5, 1], // Example 3: 50% adj. win rate, neutral streak, home team
    ]

    for (let i = 0; i < examples.length; i++) {
      const winProb = nflModel.predict(examples[i])
      console.log(`Example ${i + 1}: ${JSON.stringify(examples[i])}`)
      console.log(`Predicted win probability: ${(winProb * 100).toFixed(2)}%`)
    }

    // Clean up tensors
    xTrain.dispose()
    yTrain.dispose()
    xTest.dispose()
    yTest.dispose()

    console.log("\nProcess completed successfully.")
    return { calibration, importance, metrics }
  } catch (error) {
    console.error("Error in NFL prediction process:", error)
    throw error
  }
}

runNFLPrediction()
