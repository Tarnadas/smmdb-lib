import fs from 'fs'
import path from 'path'

import Save from './save'
import Course from './course'
import { Tnl, Jpeg } from './image'

export const courseProto = Course.prototype

/**
 * Loads a save from file system
 * @function loadSave
 * @param {string} pathToSave - path to save on file system
 * @return {Promise<Save>}
 * @throws {Error} pathToSave must exist and must have read/write privileges
 */
export function loadSave (pathToSave) {
  return new Promise((resolve, reject) => {
    pathToSave = path.resolve(pathToSave)
    if (!fs.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`)
    fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, (err) => {
      if (err) reject(new Error('Please close your emulator before executing your script'))
    })
    fs.readFile(path.resolve(`${pathToSave}/save.dat`), (err, data) => {
      if (err) reject(err)
      resolve(new Save(pathToSave, data))
    })
  })
}

/**
 * Synchronous version of {@link loadSave}
 * @function loadSaveSync
 * @param {string} pathToSave - path to save on file system
 * @return {Save}
 * @throws {Error} pathToSave must exist and must have read/write privileges
 */
export function loadSaveSync (pathToSave) {
  pathToSave = path.resolve(pathToSave)
  if (!fs.existsSync(pathToSave)) throw new Error(`No such folder exists:\n${pathToSave}`)
  fs.access(pathToSave, fs.constants.R_OK | fs.constants.W_OK, (err) => {
    if (err) throw new Error('Please close your emulator before executing your script')
  })
  const data = fs.readFileSync(path.resolve(`${pathToSave}/save.dat`))
  return new Save(pathToSave, data)
}

/**
 * Loads a course from file system
 * @function loadCourse
 * @param {string} coursePath - path to course on file system
 * @param {number} [courseId] - course ID inside save
 * @return {Promise<Course>}
 */
export function loadCourse (coursePath, courseId, isWiiU = true) {
  return new Promise((resolve, reject) => {
    if (isWiiU) {
      fs.readFile(path.resolve(`${coursePath}/course_data.cdt`), async (err, data) => {
        if (err) {
          reject(err)
        }
        if (!data) {
          reject(new Error('Did not receive any data'))
        }
        const dataSub = await new Promise((resolve, reject) => {
          fs.readFile(path.resolve(`${coursePath}/course_data_sub.cdt`), async (err, data) => {
            if (err) {
              reject(err)
            }
            if (!data) {
              reject(new Error('Did not receive any data'))
            }
            resolve(data)
          })
        })
        try {
          const course = new Course(true, courseId, data, dataSub, coursePath)
          resolve(course)
        } catch (err) {
          reject(err)
        }
      })
    } else {
      const data = fs.readFileSync(coursePath)
      const course = new Course(false, courseId, data, null, coursePath)
      resolve(course)
    }
  })
}

/**
 * Synchronous version of {@link loadCourse}
 * @function loadCourseSync
 * @param {string} coursePath - path to course on file system
 * @param {number} [courseId] - course ID inside save
 * @returns {Course}
 */
export function loadCourseSync (coursePath, courseId, isWiiU = true) {
  if (isWiiU) {
    let data = fs.readFileSync(path.resolve(`${coursePath}/course_data.cdt`))
    let dataSub = fs.readFileSync(path.resolve(`${coursePath}/course_data_sub.cdt`))
    return new Course(true, courseId, data, dataSub, coursePath)
  } else {
    let data = fs.readFileSync(coursePath)
    return new Course(false, courseId, data, null, coursePath)
  }
}

/**
 * Decompresses a file and loads all included courses into an array.
 * Requires p7zip for Unix and 7z.exe for Windows (Place exe in same folder as package.json or add to PATH)
 * @function decompress
 * @param {string} filePath - path of compresses file
 * @returns {Promise<Course[]>}
 */
export function decompress (filePath) {
  return Course.decompress(filePath)
}

/**
 * Deserializes a course object with compliance to {@link https://github.com/Tarnadas/smm-protobuf}
 * @function deserialize
 * @param {Buffer|Uint8Array} buffer - Node Buffer or Uint8Array to be converted to a {@link Course}
 * @returns {Promise<Course>}
 */
export function deserialize (buffer) {
  return Course.deserialize(buffer)
}

/**
 * Load JPEG or TNL image
 * @function loadImage
 * @param {string} pathToFile - path to image on file system
 * @return {Tnl | Jpeg}
 * @throws {Error} pathToFile must exist, must have read/write privileges and file must be JPEG or TNL
 */
export function loadImage (pathToFile) {
  let split = pathToFile.split('.')
  let ending = split[split.length - 1]
  if (ending === 'tnl') {
    return new Tnl(pathToFile)
  } else {
    // TODO check magic value
    return new Jpeg(pathToFile)
  }
}
