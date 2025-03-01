import fs from "fs"

export const sleep = (time) =>
  new Promise((resolve) => {
    setTimeout(resolve, time)
  })

export const loadJSON = (path) => JSON.parse(fs.readFileSync(new URL(path, import.meta.url)))
