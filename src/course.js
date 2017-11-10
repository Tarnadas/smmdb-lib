import crc32 from 'buffer-crc32'
import protobuf from 'protobufjs'
import * as proto from 'smm-protobuf/proto/bundle.json'
import fileType from 'file-type'
import readChunk from 'read-chunk'
import Zip from 'node-7z'
import tmp from 'tmp'
import rimraf from 'rimraf'

import fs from 'fs'
import path from 'path'
import zlib from 'zlib'

import { loadCourse } from '.'
import Tile, { TILE_CONSTANTS } from './tile'
import Sound, { SOUND_CONSTANTS } from './sound'
import {
  Tnl, Jpeg, Image
} from './tnl'

const sound = Buffer.concat([Buffer.from('76246AAE', 'hex'), Buffer.alloc(0xD804)], 0xD808)

const root = protobuf.Root.fromJSON(proto)
const smmCourse = root.lookupType('SMMCourse')

export const COURSE_CONSTANTS = {
  SIZE: 0x15000,

  CRC_LENGTH: 0x10,
  CRC_PRE_BUF: Buffer.from('000000000000000B', 'hex'),
  CRC_POST_BUF: Buffer.alloc(4),

  TIMESTAMP_0_OFFSET: 0x1,
  TIMESTAMP_1_OFFSET: 0x14,

  NAME_OFFSET: 0x29,
  NAME_LENGTH: 0x40,

  MAKER_OFFSET: 0x92,
  MAKER_LENGTH: 0x14,

  GAME_STYLE_OFFSET: 0x6A,
  GAME_STYLE: root.lookupEnum('SMMCourse.GameStyle').values,
  GAME_STYLE_BY_ID: root.lookupEnum('SMMCourse.GameStyle').valuesById,

  THEME_OFFSET: 0x6D,
  THEME: root.lookupEnum('SMMCourse.CourseTheme').values,
  THEME_BY_ID: root.lookupEnum('SMMCourse.CourseTheme').valuesById,

  TIME_OFFSET: 0x70,

  AUTO_SCROLL_OFFSET: 0x72,
  AUTO_SCROLL: root.lookupEnum('SMMCourse.AutoScroll').values,
  AUTO_SCROLL_BY_ID: root.lookupEnum('SMMCourse.AutoScroll').valuesById,

  WIDTH_OFFSET: 0x76,

  TILE_AMOUNT_OFFSET: 0xEE, // uint_16

  TILES_OFFSET: 0xF0,

  SOUND_OFFSET: 0x145F0,
  SOUND_END_OFFSET: 0x14F50,

  DS_HEADER_CRC_OFFSET: 0x4F014,
  DS_HEADER_LENGTH: 0x1C,
  DS_FILE_LENGTH: 0x4301C
}

const courseId = Symbol('courseId')
const coursePath = Symbol('coursePath')
const courseData = Symbol('courseData')
const courseDataSub = Symbol('courseDataSub')
const tnl = Symbol('tnl')
const tnlPreview = Symbol('tnlPreview')
const endiannessBE = Symbol('endiannessBE')
const image3DS = Symbol('image3DS')

/**
 * Represents a Super Mario Maker course
 * @class Course
 */
export default class Course {
  constructor (isWiiU, id, data, dataSub, path) {
    if (isWiiU == null) return this
    if (path && !fs.existsSync(path)) {
      throw new Error(`Path does not exists:\n${path}`)
    }
    this[courseId] = id
    this[coursePath] = path
    if (isWiiU) {
      this[endiannessBE] = true
      this[courseData] = data
      this[courseDataSub] = dataSub
      if (path) {
        [this[tnl], this[tnlPreview]] = this.loadTnl()
        this.loadThumbnailSync()
      }
    } else {
      this[endiannessBE] = false
      this[courseData] = data.slice(0x1C, 0x15000 + 0x1C)
      this[courseDataSub] = data.slice(0x15000 + 0x1C, 2 * 0x15000 + 0x1C)
      this[image3DS] = new Image(data.slice(0x2A05C, 0x2A05C + 0x157C0))
      this.changeEndian()
    }

    if (!this[courseData] || !this[courseDataSub]) return this

    const year = this[courseData].readUInt16BE(0x10)
    const month = this[courseData].readUInt8(0x12)
    const day = this[courseData].readUInt8(0x13)
    const hour = this[courseData].readUInt8(0x14)
    const minute = this[courseData].readUInt8(0x15)
    /**
     * Last modified unix timestamp
     * @member {number}
     * @memberOf Course
     * @instance
     */
    this.modified = (new Date(`${String(year).padStart(4, '0000')}-${String(month).padStart(2, '00')}-${String(day).padStart(2, '00')}T${String(hour).padStart(2, '00')}:${String(minute).padStart(2, '00')}+00:00`)).getTime() / 1000

    /**
     * Title of course
     * @member {string} title
     * @memberOf Course
     * @instance
     */
    this.title = ''
    const titleBuf = this[courseData].slice(COURSE_CONSTANTS.NAME_OFFSET, COURSE_CONSTANTS.NAME_OFFSET + COURSE_CONSTANTS.NAME_LENGTH)
    for (let i = 0; i < COURSE_CONSTANTS.NAME_LENGTH; i += 2) {
      const charBuf = Buffer.allocUnsafe(2)
      charBuf.writeUInt16BE(titleBuf.readUInt16BE(i), 0)
      if (charBuf.readUInt16BE(0) === 0) {
        break
      }
      this.title += charBuf.toString('utf16le')
    }

    /**
     * Maker name
     * @member {string} maker
     * @memberOf Course
     * @instance
     */
    this.maker = ''
    const makerBuf = this[courseData].slice(COURSE_CONSTANTS.MAKER_OFFSET, COURSE_CONSTANTS.MAKER_OFFSET + COURSE_CONSTANTS.MAKER_LENGTH)
    for (let i = 0; i < COURSE_CONSTANTS.MAKER_LENGTH; i += 2) {
      const charBuf = Buffer.allocUnsafe(2)
      charBuf.writeUInt16BE(makerBuf.readUInt16BE(i), 0)
      if (charBuf.readUInt16BE(0) === 0) {
        break
      }
      this.maker += charBuf.toString('utf16le')
    }

    /**
     * Game style of course
     * @member {number} gameStyle
     * @memberOf Course
     * @instance
     */
    this.gameStyle = COURSE_CONSTANTS.GAME_STYLE[this[courseData].slice(COURSE_CONSTANTS.GAME_STYLE_OFFSET, COURSE_CONSTANTS.GAME_STYLE_OFFSET + 2).toString()]

    /**
     * Course theme
     * @member {number} courseTheme
     * @memberOf Course
     * @instance
     */
    this.courseTheme = this[courseData].readUInt8(COURSE_CONSTANTS.THEME_OFFSET)

    /**
     * Course theme sub
     * @member {number} courseThemeSub
     * @memberOf Course
     * @instance
     */
    this.courseThemeSub = this[courseDataSub].readUInt8(COURSE_CONSTANTS.THEME_OFFSET)

    /**
     * Completion time
     * @member {number} time
     * @memberOf Course
     * @instance
     */
    this.time = this[courseData].readUInt16BE(COURSE_CONSTANTS.TIME_OFFSET)

    /**
     * Course auto scroll
     * @member {number} autoScroll
     * @memberOf Course
     * @instance
     */
    this.autoScroll = this[courseData].readUInt8(COURSE_CONSTANTS.AUTO_SCROLL_OFFSET)

    /**
     * CourseSub auto scroll
     * @member {number} autoScrollSub
     * @memberOf Course
     * @instance
     */
    this.autoScrollSub = this[courseDataSub].readUInt8(COURSE_CONSTANTS.AUTO_SCROLL_OFFSET)

    /**
     * Course width
     * @member {number} width
     * @memberOf Course
     * @instance
     */
    this.width = this[courseData].readUInt16BE(COURSE_CONSTANTS.WIDTH_OFFSET)

    /**
     * CourseSub width
     * @member {number} widthSub
     * @memberOf Course
     * @instance
     */
    this.widthSub = this[courseDataSub].readUInt16BE(COURSE_CONSTANTS.WIDTH_OFFSET)

    /**
     * Tiles of main course
     * @member {Array<Tile>} tiles
     * @memberOf Course
     * @instance
     */
    this.tiles = []
    let tileAmount = this[courseData].readUInt16BE(COURSE_CONSTANTS.TILE_AMOUNT_OFFSET)
    for (let i = 0, offset = COURSE_CONSTANTS.TILES_OFFSET; i < tileAmount; i++, offset += TILE_CONSTANTS.SIZE) {
      let tileData = this[courseData].slice(offset, offset + TILE_CONSTANTS.SIZE)
      this.tiles.push(new Tile(tileData))
    }

    /**
     * Tiles of sub course
     * @member {Array<Tile>} tilesSub
     * @memberOf Course
     * @instance
     */
    this.tilesSub = []
    tileAmount = this[courseDataSub].readUInt16BE(COURSE_CONSTANTS.TILE_AMOUNT_OFFSET)
    for (let i = 0, offset = COURSE_CONSTANTS.TILES_OFFSET; i < tileAmount; i++, offset += TILE_CONSTANTS.SIZE) {
      let tileData = this[courseDataSub].slice(offset, offset + TILE_CONSTANTS.SIZE)
      this.tilesSub.push(new Tile(tileData))
    }

    /**
     * Course sounds
     * @member {Array<Sound>} sounds
     * @memberOf Course
     * @instance
     */
    this.sounds = []
    for (let offset = COURSE_CONSTANTS.SOUND_OFFSET; offset < COURSE_CONSTANTS.SOUND_END_OFFSET; offset += SOUND_CONSTANTS.SIZE) {
      if (this[courseData].readUInt8(offset) !== 0xFF) {
        let soundData = this[courseData].slice(offset, offset + SOUND_CONSTANTS.SIZE)
        this.sounds.push(new Sound(soundData))
      }
    }

    /**
     * Course sounds
     * @member {Array<Sound>} soundsSub
     * @memberOf Course
     * @instance
     */
    this.soundsSub = []
    for (let offset = COURSE_CONSTANTS.SOUND_OFFSET; offset < COURSE_CONSTANTS.SOUND_END_OFFSET; offset += SOUND_CONSTANTS.SIZE) {
      if (this[courseDataSub].readUInt8(offset) !== 0xFF) {
        let soundData = this[courseDataSub].slice(offset, offset + SOUND_CONSTANTS.SIZE)
        this.soundsSub.push(new Sound(soundData))
      }
    }
  }

  getPath () {
    return this[coursePath]
  }

  static async fromObject (obj) {
    const course = new Course()
    Object.assign(course, obj)

    const data = [courseData, courseDataSub]
    const courseTheme = ['courseTheme', 'courseThemeSub']
    const autoScroll = ['autoScroll', 'autoScrollSub']
    const width = ['width', 'widthSub']
    const tiles = ['tiles', 'tilesSub']
    const sounds = ['sounds', 'soundsSub']
    for (let i = 0; i < data.length; i++) {
      // meta
      course[data[i]] = Buffer.alloc(COURSE_CONSTANTS.TILES_OFFSET)
      const modified = new Date(parseInt(course.modified, 10) * 1000)
      course[data[i]].writeUInt16BE(modified.getUTCFullYear(), 0x10)
      course[data[i]].writeUInt8(modified.getUTCMonth() + 1, 0x12)
      course[data[i]].writeUInt8(modified.getUTCDate(), 0x13)
      course[data[i]].writeUInt8(modified.getUTCHours(), 0x14)
      course[data[i]].writeUInt8(modified.getUTCMinutes(), 0x15)
      course[data[i]].writeUInt8(0xB, 7)
      course[data[i]].writeUInt16BE(course[tiles[i]].length, COURSE_CONSTANTS.TILE_AMOUNT_OFFSET)
      course[data[i]].write(course.title, COURSE_CONSTANTS.NAME_OFFSET, 'utf16le')
      course[data[i]].write(course.maker, COURSE_CONSTANTS.MAKER_OFFSET, 'utf16le')
      course[data[i]].write(COURSE_CONSTANTS.GAME_STYLE_BY_ID[course.gameStyle], COURSE_CONSTANTS.GAME_STYLE_OFFSET)
      course[data[i]].writeUInt8(course[courseTheme[i]], COURSE_CONSTANTS.THEME_OFFSET)
      course[data[i]].writeUInt16BE(course.time, COURSE_CONSTANTS.TIME_OFFSET)
      course[data[i]].writeUInt8(course[autoScroll[i]], COURSE_CONSTANTS.AUTO_SCROLL_OFFSET)
      course[data[i]].writeUInt16BE(course[width[i]], COURSE_CONSTANTS.WIDTH_OFFSET)

      // tiles
      let tileBuffer = Buffer.alloc(0)
      for (let j = 0; j < course[tiles[i]].length; j++) {
        tileBuffer = Buffer.concat([tileBuffer, course[tiles[i]][j].tileData])
      }
      course[data[i]] = Buffer.concat([course[data[i]], tileBuffer], COURSE_CONSTANTS.SOUND_OFFSET)

      // sounds
      let soundBuffer = Buffer.alloc(0)
      for (let j = 0; j < course[sounds[i]].length; j++) {
        soundBuffer = Buffer.concat([soundBuffer, Sound.toBuffer(course[sounds[i]][j])])
      }
      for (let j = COURSE_CONSTANTS.SOUND_OFFSET + soundBuffer.length; j < COURSE_CONSTANTS.SOUND_END_OFFSET; j += 8) {
        soundBuffer = Buffer.concat([soundBuffer, SOUND_CONSTANTS.SOUND_DEFAULT])
      }
      course[data[i]] = Buffer.concat([course[data[i]], soundBuffer], COURSE_CONSTANTS.SIZE)
    }
    await course.writeCrc()

    try {
      let jpeg = new Jpeg(course.thumbnail)
      course[tnl] = await jpeg.toTnl(true)
      jpeg = new Jpeg(course.thumbnailPreview)
      course[tnlPreview] = await jpeg.toTnl(false)
    } catch (err) {}

    return course
  }

  /**
   * Writes course to file system inside save folder.
   * This function should not be called directly. Instead call save.addCourse(course)
   * @function writeToSave
   * @memberOf Course
   * @instance
   * @param {number} id - course ID inside save
   * @param {string} pathToCourse - path to course on file system
   * @returns {Promise<void>}
   */
  async writeToSave (id, pathToCourse) {
    this[courseId] = id
    if (pathToCourse) {
      this[coursePath] = pathToCourse
    }
    if (!this[tnl]) {
      await this.loadThumbnail()
    }
    if (!fs.existsSync(this[coursePath])) {
      fs.mkdirSync(this[coursePath])
    }
    fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data.cdt`), this[courseData])
    fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data_sub.cdt`), this[courseDataSub])
    fs.writeFileSync(path.resolve(`${this[coursePath]}/sound.bwv`), sound)
    fs.writeFileSync(path.resolve(`${this[coursePath]}/thumbnail0.tnl`), this[tnl])
    fs.writeFileSync(path.resolve(`${this[coursePath]}/thumbnail1.tnl`), this[tnlPreview])
  }

  /**
   * Writes CRC checksum of course to file system
   * @function writeCrc
   * @memberOf Course
   * @instance
   * @param {boolean} [writeToFs=false] - should file on file system be overwritten with new CRC checksum
   * @returns {Promise<void>}
   */
  writeCrc (writeToFs = false) {
    return Promise.all([
      new Promise(async (resolve, reject) => {
        try {
          const fileWithoutCrc = this[courseData].slice(16)
          const crc = Buffer.alloc(4)
          crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0)
          const crcBuffer = Buffer.concat([COURSE_CONSTANTS.CRC_PRE_BUF, crc, COURSE_CONSTANTS.CRC_POST_BUF], COURSE_CONSTANTS.CRC_LENGTH)
          this[courseData] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_CONSTANTS.SIZE)
          if (writeToFs) {
            fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data.cdt`), this[courseData])
          }
          resolve()
        } catch (err) {
          reject(err)
        }
      }),
      new Promise(async (resolve, reject) => {
        try {
          const fileWithoutCrc = this[courseDataSub].slice(16)
          const crc = Buffer.alloc(4)
          crc.writeUInt32BE(crc32.unsigned(fileWithoutCrc), 0)
          const crcBuffer = Buffer.concat([COURSE_CONSTANTS.CRC_PRE_BUF, crc, COURSE_CONSTANTS.CRC_POST_BUF], COURSE_CONSTANTS.CRC_LENGTH)
          this[courseDataSub] = Buffer.concat([crcBuffer, fileWithoutCrc], COURSE_CONSTANTS.SIZE)
          if (writeToFs) {
            fs.writeFileSync(path.resolve(`${this[coursePath]}/course_data_sub.cdt`), this[courseDataSub])
          }
          resolve()
        } catch (err) {
          reject(err)
        }
      })
    ])
  }

  setHeader (fileBuffer) {
    let hash = 1
    for (let i = COURSE_CONSTANTS.DS_HEADER_LENGTH; i < fileBuffer.length; i += 2) {
      hash += fileBuffer.readUInt16LE(i)
    }
    const crc = ((COURSE_CONSTANTS.DS_HEADER_CRC_OFFSET + hash) << 32) >>> 32
    fileBuffer.writeUInt32LE(crc, 0)
  }

  async to3DS () {
    this.changeEndian()
    let res = Buffer.concat([
      Buffer.from('00000000043004007D000000DDBAFECA3BA0B2B86E55298B00C01000', 'hex'),
      this[courseData],
      this[courseDataSub],
      Buffer.alloc(0x40),
      await (new Image(this.thumbnailPreview, this.thumbnail)).to3DS(),
      Buffer.alloc(0x3800)
    ])
    res.writeUInt8(0x80, 0x2A023)
    let crc = crc32(res.slice(0x2A020, 0x2A020 + 0x157C0 - 4)).readUInt32BE(0)
    res.writeUInt32LE(crc, 0x2A01C)
    this.setHeader(res)
    this.changeEndian()
    return res
  }

  changeEndian () {
    this[endiannessBE] = !this[endiannessBE]
    let chEnd = (buf) => {
      return Buffer.concat([
        buf.slice(0x0, 0x4),
        buf.slice(0x4, 0x8).swap32(),
        buf.slice(0x8, 0x10),
        buf.slice(0x10, 0x12).swap16(),
        buf.slice(0x12, 0x28),
        buf.slice(0x28, 0x6A).swap16(),
        buf.slice(0x6A, 0x70),
        buf.slice(0x70, 0x72).swap16(),
        buf.slice(0x72, 0x74),
        buf.slice(0x74, 0x78).swap32(),
        buf.slice(0x78, 0xEC),
        buf.slice(0xEC, 0xF0).swap32()
      ].concat(Array.from((function * () {
        for (let i = 0xF0; i < 0x145F0; i += 0x20) {
          yield buf.slice(i, i + 4).swap32()
          yield buf.slice(i + 4, i + 8).swap32()
          yield buf.slice(i + 8, i + 0xA).swap16()
          yield buf.slice(i + 0xA, i + 0xC)
          yield buf.slice(i + 0xC, i + 0x10).swap32()
          yield buf.slice(i + 0x10, i + 0x14).swap32()
          yield buf.slice(i + 0x14, i + 0x18).swap32()
          yield buf.slice(i + 0x18, i + 0x1A)
          yield buf.slice(i + 0x1A, i + 0x1C).swap16()
          yield buf.slice(i + 0x1C, i + 0x1E).swap16()
          yield buf.slice(i + 0x1E, i + 0x20)
        }
      })())).concat(Array.from((function * () {
        for (let i = 0x145F0; i < 0x14F50; i += 0x8) {
          yield buf.slice(i, i + 0x8)
        }
      })())), 0x15000)
    };
    [this[courseData], this[courseDataSub]] = [
      chEnd(this[courseData]), chEnd(this[courseDataSub])
    ]
    let crc0 = crc32.unsigned(this[courseData].slice(0x10))
    let crc1 = crc32.unsigned(this[courseDataSub].slice(0x10))
    if (this[endiannessBE]) {
      this[courseData].writeUInt32BE(crc0, 8)
      this[courseDataSub].writeUInt32BE(crc1, 8)
    } else {
      this[courseData].writeUInt32LE(crc0, 8)
      this[courseDataSub].writeUInt32LE(crc1, 8)
    }
  }

  /**
   * Sets a new title for this course and optionally recalculates CRC checksum
   * @function setTitle
   * @memberOf Course
   * @instance
   * @param {string} title - new title
   * @param {boolean} [writeCrc=true] - should CRC checksum be recalculated
   * @returns {Promise<void>}
   */
  setTitle (title, writeCrc = true) {
    for (let i = COURSE_CONSTANTS.NAME_OFFSET, j = 0; i < COURSE_CONSTANTS.NAME_OFFSET + COURSE_CONSTANTS.NAME_LENGTH; i += 2, j++) {
      if (j < title.length) {
        this[courseData].write(title.charAt(j), i, 'utf16le')
        this[courseDataSub].write(title.charAt(j), i, 'utf16le')
      } else {
        this[courseData].writeUInt16BE(0, i)
        this[courseDataSub].writeUInt16BE(0, i)
      }
    }
    this.title = title.substr(0, COURSE_CONSTANTS.NAME_LENGTH / 2)
    if (writeCrc) {
      return this.writeCrc()
    }
  }

  /**
   * Sets a new maker for this course and optionally recalculates CRC checksum
   * @function setMaker
   * @memberOf Course
   * @instance
   * @param {string} makerName - new maker
   * @param {boolean} [writeCrc=true] - should CRC checksum be recalculated
   * @returns {Promise<void>}
   */
  setMaker (makerName, writeCrc = true) {
    for (let i = COURSE_CONSTANTS.MAKER_OFFSET, j = 0; i < COURSE_CONSTANTS.MAKER_OFFSET + COURSE_CONSTANTS.MAKER_LENGTH; i += 2, j++) {
      if (j < makerName.length) {
        this[courseData].write(makerName.charAt(j), i, 'utf16le')
        this[courseDataSub].write(makerName.charAt(j), i, 'utf16le')
      } else {
        this[courseData].writeUInt16BE(0, i)
        this[courseDataSub].writeUInt16BE(0, i)
      }
    }
    this.maker = makerName.substr(0, COURSE_CONSTANTS.MAKER_LENGTH / 2)
    if (writeCrc) {
      return this.writeCrc()
    }
  }

  setModified (modified, writeCrc = true) {
    const date = new Date(modified * 1000)
    this[courseData].writeUInt16BE(0x10, date.getUTCFullYear())
    this[courseData].writeUInt8(0x12, date.getUTCMonth())
    this[courseData].writeUInt8(0x13, date.getUTCDate())
    this[courseData].writeUInt8(0x14, date.getUTCHours())
    this[courseData].writeUInt8(0x15, date.getUTCMinutes())
    this.modified = modified
    if (writeCrc) {
      return this.writeCrc()
    }
  }

  /**
   * Load TNL thumbnails from file system.
   * Implicitly called by constructor
   * @function loadTnl
   * @memberOf Course
   * @instance
   * @returns {Array<Tnl>}
   */
  loadTnl () {
    return [
      (new Tnl(path.join(this[coursePath], '/thumbnail0.tnl'))).readFileSync().data,
      (new Tnl(path.join(this[coursePath], '/thumbnail1.tnl'))).readFileSync().data
    ]
  }

  /**
   * Convert TNL thumbnails to JPEG thumbnails
   * @function loadThumbnail
   * @memberOf Course
   * @instance
   * @returns {Promise<Jpeg[]>} [ thumbnail wide, thumbnail 4:3 ]
   */
  async loadThumbnail () {
    if (this[image3DS]) {
      [this.thumbnail, this.thumbnailPreview] = await this[image3DS].from3DS()
      this[tnl] = await (new Jpeg(this.thumbnail)).toTnl()
      this[tnlPreview] = await (new Jpeg(this.thumbnailPreview)).toTnl()
    } else {
      this.thumbnail = await new Tnl(this[tnl]).toJpeg()
      this.thumbnailPreview = await new Tnl(this[tnlPreview]).toJpeg()
    }
    return [ this.thumbnail, this.thumbnailPreview ]
  }

  /**
   * Synchronous version of {@link Course#loadThumbnail}
   * @function loadThumbnailSync
   * @memberOf Course
   * @instance
   * @returns {Jpeg[]} [ thumbnail wide, thumbnail 4:3 ]
   */
  loadThumbnailSync () {
    if (this[image3DS]) {
      // TODO
      this[tnl] = new Jpeg(this.thumbnail).toTnlSync()
      this[tnlPreview] = new Jpeg(this.thumbnailPreview).toTnlSync()
    } else {
      this.thumbnail = new Tnl(this[tnl]).toJpegSync()
      this.thumbnailPreview = new Tnl(this[tnlPreview]).toJpegSync()
    }
    return [ this.thumbnail, this.thumbnailPreview ]
  }

  /**
   * Change thumbnail of this course
   * @function setThumbnail
   * @memberOf Course
   * @instance
   * @param {Buffer | ArrayBuffer} thumbnail - thumbnail Buffer
   * @param {boolean} [isWide] - is thumbnail wide
   * @param {boolean} [doClip] - should thumbnail be clipped
   * @returns {Promise<Jpeg>} converted thumbnail
   */
  async setThumbnail (thumbnail, isWide, doClip) {
    const jpeg = new Jpeg(thumbnail)
    if (isWide) {
      this[tnl] = new Tnl(await jpeg.toTnl(true, doClip))
      this.thumbnail = await this[tnl].toJpeg()
      return this.thumbnail
    } else {
      this[tnlPreview] = new Tnl(await jpeg.toTnl(false, doClip))
      this.thumbnailPreview = await this[tnlPreview].toJpeg()
      return this.thumbnailPreview
    }
  }

  /**
   * Change thumbnail of this course.
   * If second argument is not provided, it will use the first file path for both thumbnail calculations
   * @function setThumbnailFromFs
   * @memberOf Course
   * @instance
   * @param {string} pathToThumbnail - path to new thumbnail on file system
   * @param {string} [pathToThumbnailPreview] - path to new thumbnailPreview on file system
   * @returns {Promise<Jpeg[]>} [ thumbnail wide, thumbnail 4:3 ]
   */
  async setThumbnailFromFs (pathToThumbnail, pathToThumbnailPreview) {
    let jpeg = new Jpeg(path.resolve(pathToThumbnail))
    this[tnl] = new Tnl(await jpeg.toTnl(true))
    this.thumbnail = await this[tnl].toJpeg()
    if (pathToThumbnailPreview) {
      jpeg = new Jpeg(path.resolve(pathToThumbnailPreview))
    } else {
      jpeg = new Jpeg(path.resolve(pathToThumbnail))
    }
    this[tnlPreview] = new Tnl(await jpeg.toTnl(false, true))
    this.thumbnailPreview = await this[tnlPreview].toJpeg()
    return [ this.thumbnail, this.thumbnailPreview ]
  }

  /**
   * Check if this course's thumbnail has been generated by Cemu versions prior to 1.9.1
   * @function isThumbnailBroken
   * @memberOf Course
   * @instance
   * @returns {Promise<boolean>}
   */
  async isThumbnailBroken () {
    if (this[tnl] && !this.thumbnail) {
      await this.loadThumbnail()
    }
    return (new Jpeg(this.thumbnailPreview)).isBroken()
  }

  /**
   * Write TNL thumbnail to file system
   * @function writeThumbnail
   * @memberOf Course
   * @instance
   * @returns {Promise<void>}
   * @throws {Error} course must be part of a {@link Save}
   */
  async writeThumbnail () {
    return Promise.all([
      new Promise(resolve => {
        fs.writeFile(path.join(this[coursePath], 'thumbnail0.tnl'), this[tnl].data, () => {
          resolve()
        })
      }),
      new Promise(resolve => {
        fs.writeFile(path.join(this[coursePath], 'thumbnail1.tnl'), this[tnlPreview].data, () => {
          resolve()
        })
      })
    ])
  }

  /**
   * Write JPEG thumbnail to file system
   * @function exportThumbnail
   * @memberOf Course
   * @instance
   * @returns {Promise<void>}
   * @throws {Error} course must be part of a {@link Save}
   * @throws {Error} thumbnail must not be null
   */
  async exportThumbnail () {
    if (!this[coursePath]) throw new Error('Course does not exist on file system')
    if (!this[tnl] && !this.thumbnail) throw new Error('Could not find thumbnail')
    if (!this.thumbnail) {
      await this.loadThumbnail()
    }
    return Promise.all([
      new Promise(async (resolve, reject) => {
        fs.writeFile(path.join(this[coursePath], '/thumbnail0.jpg'), this.thumbnail, null, err => {
          if (err) reject(err)
          resolve()
        })
      }),
      new Promise(async (resolve, reject) => {
        fs.writeFile(path.join(this[coursePath], '/thumbnail1.jpg'), this.thumbnailPreview, null, err => {
          if (err) reject(err)
          resolve()
        })
      })
    ])
  }

  /**
   * Synchronous version of {@link Course#exportThumbnail}
   * @function exportThumbnailSync
   * @memberOf Course
   * @instance
   * @throws {Error} course must be part of a {@link Save}
   * @throws {Error} thumbnail must not be null
   */
  exportThumbnailSync () {
    if (!this[coursePath]) throw new Error('Course does not exist on file system')
    if (!this[tnl] && !this.thumbnail) throw new Error('Could not find thumbnail')
    if (!this.thumbnail) {
      this.loadThumbnailSync()
    }
    fs.writeFileSync(path.join(this[coursePath], '/thumbnail0.jpg'), this.thumbnail)
    fs.writeFileSync(path.join(this[coursePath], '/thumbnail1.jpg'), this.thumbnailPreview)
  }

  /**
   * Decompresses a file and loads all included courses into an array.
   * Requires p7zip for Unix and 7z.exe for Windows (Place exe in same folder as package.json or add to PATH)
   * @function decompress
   * @memberOf Course
   * @instance
   * @param {string | Buffer} filePath - path of compressed file
   * @returns {Promise<Course[]>}
   */
  static async decompress (filePath) {
    const mime = fileType(readChunk.sync(filePath, 0, 4100)).mime
    if (mime !== 'application/x-rar-compressed' && mime !== 'application/zip' && mime !== 'application/x-7z-compressed' && mime !== 'application/x-tar') {
      throw new Error(`Could not decompress file! Unknown format: ${mime}`)
    }

    // decompress
    const tmpDir = await new Promise((resolve, reject) => {
      tmp.dir({ unsafeCleanup: true }, (err, path) => {
        if (err) reject(err)
        resolve(path)
      })
    })
    const zip = new Zip()
    try {
      await zip.extractFull(filePath, tmpDir)
    } catch (err) {
      console.error(err)
      return null
    }

    // get course folders
    const courseFolders = []
    const getCourseFolders = async (filePath) => {
      await new Promise((resolve) => {
        fs.readdir(filePath, async (err, files) => {
          if (err) throw err
          for (let i = 0; i < files.length; i++) {
            const isFolder = /^[^.]+$/.test(files[i])
            const isCourseFolder = /[c|C]ourse\d{3}$/.test(files[i])
            if (isCourseFolder) {
              courseFolders.push(path.join(filePath, files[i]))
            } else if (isFolder) {
              await getCourseFolders(path.join(filePath, files[i]))
            }
          }
          resolve()
        })
      })
    }
    await getCourseFolders(tmpDir)

    // load courses
    const courses = []
    for (let i = 0; i < courseFolders.length; i++) {
      courses.push(await loadCourse(courseFolders[i]))
    }
    rimraf(tmpDir, () => {})
    return courses
  }

  /**
   * Serializes a course object with compliance to {@link https://github.com/Tarnadas/smm-protobuf}
   * @function serialize
   * @memberOf Course
   * @instance
   * @returns {Promise<Buffer>}
   */
  async serialize () {
    if (!this.thumbnail) {
      await this.loadThumbnail()
    }
    return Buffer.from(JSON.parse(JSON.stringify(smmCourse.encode(this).finish())))
  }

  /**
   * Serializes and gzips
   * @function serializeGzipped
   * @memberOf Course
   * @instance
   * @returns {Promise<Buffer>}
   */
  async serializeGzipped () {
    if (!this.thumbnail) {
      await this.loadThumbnail()
    }
    return new Promise((resolve, reject) => {
      zlib.gzip(Buffer.from(JSON.parse(JSON.stringify(smmCourse.encode(this).finish()))), (err, buffer) => {
        if (err) reject(err)
        resolve(buffer)
      })
    })
  }

  /**
   * Deserializes a course object with compliance to {@link https://github.com/Tarnadas/smm-protobuf}
   * @function deserialize
   * @memberOf Course
   * @instance
   * @param {Buffer | Uint8Array} buffer - Node Buffer or Uint8Array to be converted to a {@link Course}
   * @returns {Promise<Course>}
   */
  static deserialize (buffer) {
    try {
      buffer = zlib.gunzipSync(buffer)
    } catch (err) {}
    const obj = smmCourse.toObject(smmCourse.decode(Buffer.from(buffer)), {
      arrays: true
    })
    return this.fromObject(obj)
  }
}
