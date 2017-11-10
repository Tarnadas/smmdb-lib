import crc32 from 'buffer-crc32'
import copydir from 'copy-dir'
import rimraf from 'rimraf'

import fs from 'fs'
import path from 'path'

import {
  loadCourse, loadCourseSync
} from '.'
import {
  Jpeg
} from './image'

const SAVE_SIZE = 0xA000

const SAVE_ORDER_OFFSET = 0x4340
const SAVE_ORDER_SIZE = 120
const SAVE_ORDER_EMPTY = 0xFF

const SAVE_AMIIBO_OFFSET = 0x85E0
const SAVE_AMIIBO_LENGTH = 0x14

const SAVE_CRC_LENGTH = 0x10
const SAVE_CRC_PRE_BUF = Buffer.from('0000000000000015', 'hex')
const SAVE_CRC_POST_BUF = Buffer.alloc(4)

const slotToIndex = Symbol('slotToIndex')

/**
 * Represents a Super Mario Maker save
 * @class Save
 */
export default class Save {
  constructor (pathToSave, data) {
    /**
     * Path to save
     * @member {string} pathToSave
     * @memberOf Save
     * @instance
     */
    this.pathToSave = pathToSave

    /**
     * Node buffer of save.dat file
     * @member {Buffer} data
     * @memberOf Save
     * @instance
     */
    this.data = data

    /**
     * Courses belonging to this save
     * @member {Object.<string,Course>} courses
     * @memberOf Save
     * @instance
     */
    this.courses = {}

    this[slotToIndex] = {}
    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
      let index = this.data.readUInt8(SAVE_ORDER_OFFSET + i)
      if (index !== 255) {
        this[slotToIndex][i] = index
      }
    }
  }

  /**
   * Writes CRC checksum of save.dat
   * @function writeCrc
   * @memberOf Save
   * @instance
   * @returns {Promise<void>}
   */
  writeCrc () {
    return new Promise((resolve, reject) => {
      try {
        let fileWithoutCrc = this.data.slice(16)
        let crc = Buffer.alloc(4)
        crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0)
        let crcBuffer = Buffer.concat([SAVE_CRC_PRE_BUF, crc, SAVE_CRC_POST_BUF], SAVE_CRC_LENGTH)
        this.data = Buffer.concat([crcBuffer, fileWithoutCrc], SAVE_SIZE)
        fs.writeFile(path.resolve(`${this.pathToSave}/save.dat`), this.data, null, () => {
          resolve()
        })
      } catch (err) {
        reject(err)
      }
    })
  }

  /**
   * Synchronous version of {@link Save#writeCrc}
   * @function writeCrcSync
   * @memberOf Save
   * @instance
   */
  writeCrcSync () {
    let fileWithoutCrc = this.data.slice(16)
    let crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0)
    let crcBuffer = Buffer.concat([SAVE_CRC_PRE_BUF, crc, SAVE_CRC_POST_BUF], SAVE_CRC_LENGTH)
    this.data = Buffer.concat([crcBuffer, fileWithoutCrc], SAVE_SIZE)
    fs.writeFileSync(path.resolve(`${this.pathToSave}/save.dat`), this.data)
  }

  /**
   * Reorders course folders to match actual in game appearance
   * @function reorder
   * @memberOf Save
   * @instance
   * @returns {Promise<void>}
   */
  reorder () {
    return new Promise(async (resolve, reject) => {
      try {
        // rename course folders
        let promises = []
        const sti = {}
        Object.assign(sti, this[slotToIndex])
        for (let i in sti) {
          promises.push(new Promise((resolve, reject) => {
            try {
              const value = sti[i]
              const srcPath = path.resolve(`${this.pathToSave}/course${String(i).padStart(3, '000')}`)
              const dstPath = path.resolve(`${this.pathToSave}/course${String(value).padStart(3, '000')}_reorder`)
              fs.rename(srcPath, dstPath, () => {
                this[slotToIndex][value] = value
                this.data.writeUInt8(value, SAVE_ORDER_OFFSET + value)
                resolve()
              })
              resolve()
            } catch (err) {
              reject(err)
            }
          }))
        }
        await Promise.all(promises)
        promises = []
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
          promises.push(new Promise((resolve, reject) => {
            try {
              const srcPath = path.resolve(`${this.pathToSave}/course${String(i).padStart(3, '000')}_reorder`)
              const dstPath = path.resolve(`${this.pathToSave}/course${String(i).padStart(3, '000')}`)
              fs.rename(srcPath, dstPath, (err) => {
                if (err) {
                  if (this[slotToIndex][i]) {
                    delete this[slotToIndex][i]
                  }
                  this.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + i)
                }
                resolve()
              })
            } catch (err) {
              reject(err)
            }
          }))
        }
        await Promise.all(promises)
        promises = []
        for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
          promises.push(new Promise((resolve) => {
            fs.access(path.resolve(`${this.pathToSave}/course${String(i).padStart(3, '000')}`), fs.constants.R_OK | fs.constants.W_OK, (err) => {
              if (!err) {
                this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i)
              }
              resolve()
            })
          }))
        }
        await Promise.all(promises)

        // recalculate checksum
        await this.writeCrc()

        resolve()
      } catch (err) {
        reject(err)
        // TODO undo changes
      }
    })
  }

  /**
   * Synchronous version of {@link Save#reorder}
   * @function reorderSync
   * @memberOf Save
   * @instance
   */
  reorderSync () {
    try {
      // rename course folders
      const sti = {}
      Object.assign(sti, this[slotToIndex])
      for (let i in sti) {
        const value = sti[i]
        const srcPath = path.resolve(`${this.pathToSave}/course${String(i).padStart(3, '000')}`)
        const dstPath = path.resolve(`${this.pathToSave}/course${String(value).padStart(3, '000')}_reorder`)
        fs.renameSync(srcPath, dstPath)
        this[slotToIndex][value] = value
        this.data.writeUInt8(value, SAVE_ORDER_OFFSET + value)
      }
      for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
        const srcPath = path.resolve(`${this.pathToSave}/course${String(i).padStart(3, '000')}_reorder`)
        const dstPath = path.resolve(`${this.pathToSave}/course${String(i).padStart(3, '000')}`)
        try {
          fs.renameSync(srcPath, dstPath)
        } catch (err) {
          if (this[slotToIndex][i]) {
            delete this[slotToIndex][i]
          }
          this.data.writeUInt8(SAVE_ORDER_EMPTY, SAVE_ORDER_OFFSET + i)
        }
      }
      for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
        try {
          fs.accessSync(path.resolve(`${this.pathToSave}/course${String(i).padStart(3, '000')}`), fs.constants.R_OK | fs.constants.W_OK)
          this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i)
        } catch (err) {}
      }

      // recalculate checksum
      this.writeCrc()
    } catch (err) {
      throw err
      // TODO undo changes
    }
  }

  /**
   * Exports all course thumbnails as JPEG within course folders
   * @function exportThumbnail
   * @memberOf Save
   * @instance
   * @returns {Promise<void>}
   */
  async exportThumbnail () {
    let promises = []
    if (this.courses === {}) {
      await this.loadCourses()
    }
    for (const course of this.courses) {
      promises.push(new Promise(async (resolve, reject) => {
        try {
          await course.exportThumbnail()
        } catch (err) {
          reject(err)
        }
        resolve()
      }))
    }
    return Promise.all(promises)
  }

  /**
   * Synchronous version of {@link Save#exportThumbnail}
   * @function exportThumbnailSync
   * @memberOf Save
   * @instance
   */
  exportThumbnailSync () {
    if (this.courses === {}) {
      this.loadCoursesSync()
    }
    for (const course of this.courses) {
      course.exportThumbnailSync()
    }
  }

  /**
   * Imports all JPEG thumbnails as TNL within course folders
   * @function importThumbnail
   * @memberOf Save
   * @instance
   * @returns {Promise<void>}
   */
  importThumbnail () {
    const promises = []
    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
      const coursePath = path.resolve(`${this.pathToSave}/course${String(i).padStart(3, '000')}/`)
      promises.push(new Promise(async (resolve, reject) => {
        const exists = await new Promise(resolve => {
          fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, err => {
            resolve(!err)
          })
        })
        if (exists) {
          await Promise.all([
            new Promise(async (resolve, reject) => {
              try {
                const jpeg = new Jpeg(`${coursePath}/thumbnail0.jpg`)
                const tnl = await jpeg.toTnl(true)
                fs.writeFile(`${coursePath}/thumbnail0.tnl`, tnl, null, err => {
                  if (err) reject(err)
                  resolve()
                })
              } catch (err) {
                reject(err)
              }
            }),
            new Promise(async (resolve, reject) => {
              try {
                const jpeg = new Jpeg(`${coursePath}/thumbnail1.jpg`)
                const tnl = await jpeg.toTnl(false)
                fs.writeFile(`${coursePath}/thumbnail1.tnl`, tnl, null, err => {
                  if (err) reject(err)
                  resolve()
                })
              } catch (err) {
                reject(err)
              }
            })
          ])
        }
        resolve()
      }))
    }
    return Promise.all(promises)
  }

  /**
   * Unlocks Amiibos for this save
   * @function unlockAmiibos
   * @memberOf Save
   * @instance
   * @returns {Promise<void>}
   */
  unlockAmiibos () {
    return new Promise(async (resolve) => {
      for (let i = 0; i < SAVE_AMIIBO_LENGTH; i++) {
        this.data.writeUInt8(0xFF, SAVE_AMIIBO_OFFSET + i)
      }
      await this.writeCrc()
      resolve()
    })
  }

  /**
   * Load courses and store them in {@link Save#courses}
   * @function loadCourses
   * @memberOf Save
   * @instance
   * @returns {Object<string,Course>}
   */
  async loadCourses () {
    const promises = []
    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
      promises.push(new Promise(async (resolve) => {
        const courseName = `course${String(i).padStart(3, '000')}`
        const coursePath = path.resolve(`${this.pathToSave}/${courseName}/`)
        const exists = await new Promise((resolve) => {
          fs.access(coursePath, fs.constants.R_OK | fs.constants.W_OK, err => {
            resolve(!err)
          })
        })
        if (exists) {
          try {
            this.courses[courseName] = await loadCourse(coursePath, i)
            this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i)
          } catch (err) {
            this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + i)
          }
        } else {
          this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + i)
        }
        resolve()
      }))
    }
    await Promise.all(promises)
    await this.writeCrc()
    return this.courses
  }

  /**
   * Synchronous version of {@link Save#loadCourses}
   * @function loadCoursesSync
   * @memberOf Save
   * @instance
   * @returns {Object<string,Course>}
   */
  loadCoursesSync () {
    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
      let courseName = `course${String(i).padStart(3, '000')}`
      let coursePath = path.resolve(`${this.pathToSave}/${courseName}/`)
      try {
        fs.accessSync(coursePath, fs.constants.R_OK | fs.constants.W_OK)
        this.courses[courseName] = loadCourseSync(coursePath, i)
        this.data.writeUInt8(i, SAVE_ORDER_OFFSET + i)
      } catch (err) {
        this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + i)
      }
    }
    this.writeCrcSync()
    return this.courses
  }

  /**
   * Stores a course in this save
   * @function addCourse
   * @memberOf Save
   * @instance
   * @param {Course} course - course to be stored in save
   * @returns {Promise<number>} course slot ID
   * @throws {Error} Save must have an empty slot
   */
  async addCourse (course) {
    let emptySlotName = ''
    let emptySlot = -1
    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
      let courseName = `course${String(i).padStart(3, '000')}`
      if (!this.courses[courseName]) {
        emptySlotName = courseName
        emptySlot = i
        break
      }
    }
    if (emptySlot === -1) {
      throw new Error('No empty slot inside save')
    }
    let cemuSavePath = path.join(this.pathToSave, emptySlotName)
    await course.writeToSave(emptySlot, cemuSavePath)
    this.data.writeUInt8(emptySlot, SAVE_ORDER_OFFSET + emptySlot)
    this.courses[emptySlotName] = course
    await this.writeCrc()
    return emptySlot
  }

  /**
   * Stores a course from file system in this save
   * @function addCourseFromFs
   * @memberOf Save
   * @instance
   * @param {string} coursePath - course to be stored in save
   * @returns {Promise<number>} course slot ID
   * @throws {Error} courseDataPath must exist
   * @throws {Error} Save must have an empty slot
   */
  async addCourseFromFs (coursePath) {
    if (this.courses === {}) {
      await this.loadCourses()
    }
    if (!fs.existsSync(coursePath)) {
      throw new Error(`Path does not exist:\n${coursePath}`)
    }
    let emptySlotName = ''
    let emptySlot = -1
    for (let i = 0; i < SAVE_ORDER_SIZE; i++) {
      let courseName = `course${String(i).padStart(3, '000')}`
      if (!this.courses[courseName]) {
        emptySlotName = courseName
        emptySlot = i
        break
      }
    }
    if (emptySlot === -1) {
      throw new Error('No empty slot inside save')
    }
    let cemuSavePath = path.join(this.pathToSave, emptySlotName)
    try {
      return new Promise((resolve, reject) => {
        rimraf(cemuSavePath, async (err) => {
          if (err) reject(err)
          try {
            fs.mkdirSync(cemuSavePath)
            copydir.sync(coursePath, cemuSavePath)
            this.data.writeUInt8(emptySlot, SAVE_ORDER_OFFSET + emptySlot)
            this.courses[emptySlotName] = await loadCourse(cemuSavePath, emptySlot)
            await this.writeCrc()
          } catch (err) {
            reject(err)
          }
          resolve(emptySlot)
        })
      })
    } catch (err) {
      throw err
    }
  }

  /**
   * Deletes a course from this save
   * @function deleteCourse
   * @memberOf Save
   * @instance
   * @param {number} courseId - ID of course to be deleted
   * @returns {Promise<void>}
   * @throws {Error} course with courseId must exist
   */
  async deleteCourse (courseId) {
    if (this.courses === {}) {
      await this.loadCourses()
    }
    let courseName = `course${String(courseId).padStart(3, '000')}`
    let coursePath = path.join(this.pathToSave, courseName)
    if (!fs.existsSync(coursePath)) {
      throw new Error(`Course does not exist: course${String(courseId).padStart(3, '000')}`)
    }
    try {
      return new Promise((resolve, reject) => {
        rimraf(coursePath, async (err) => {
          if (err) reject(err)
          try {
            this.data.writeUInt8(0xFF, SAVE_ORDER_OFFSET + courseId)
            delete this.courses[courseName]
            await this.writeCrc()
          } catch (err) {
            reject(err)
          }
          resolve()
        })
      })
    } catch (err) {
      throw err
    }
  }
}
