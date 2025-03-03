import fs from "fs"

export const sleep = (time) =>
  new Promise((resolve) => {
    setTimeout(resolve, time)
  })

export const loadJSON = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)))

export const normalize = (value, min, max) => {
  // Handle edge cases
  if (min === max) return 0.5 // If all values are the same, return middle of range
  if (value <= min) return 0 // Handle values at or below minimum
  if (value >= max) return 1 // Handle values at or above maximum

  // Perform normalization
  return (value - min) / (max - min)
}
