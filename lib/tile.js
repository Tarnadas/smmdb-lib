"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.TILE_CONSTANTS = undefined;

var _symbol = require("babel-runtime/core-js/symbol");

var _symbol2 = _interopRequireDefault(_symbol);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const TILE_CONSTANTS = exports.TILE_CONSTANTS = {
  SIZE: 0x20,

  COORDINATE_MULTIPLIER: 0xA0,

  LOC_X_OFFSET: 2, // uint_16
  LOC_Y_OFFSET: 8, // uint_16
  LOC_X_MAX: 0x95B0,
  LOC_Y_MAX: 0x1090,

  DIMENSION_OFFSET: 0xA, // x uint_8, y uint_8

  ORIENTATION_OFFSET: 0xF, // uint_8 >> 4

  Z_INDEX_OFFSET: 0x6, // uint_16

  ENTITY_TYPE_OFFSET: 0x4, // uint_16
  ENTITY_TYPE: {
    STATIC: 0,
    LIVING: 1,
    PLATFORM: 0xFFFF
  },

  TYPE_OFFSET: 0x18, // uint_8

  LINK_OFFSET: 0xD, // uint_8 >> 4

  ID_OFFSET: 0X1A, // uint_16

  COSTUME_OFFSET: 0x1E, // uint_8 x 2

  BLOCK_DEFAULT: Buffer.from(`00000000000000000000000006000840060000400000000000FFFFFFFFFFFFFF`, "hex")
};

const living = (0, _symbol2.default)();
const platform = (0, _symbol2.default)();
const linkable = (0, _symbol2.default)();
const hasId = (0, _symbol2.default)();
const costume = (0, _symbol2.default)();
const unknown0 = (0, _symbol2.default)();
const unknown1 = (0, _symbol2.default)();

class Tile {

  constructor(data) {

    /*this[living]    = false;
    this[platform]  = false;
    this[linkable]  = false;
    this[hasId]     = false;
    this[costume]   = false;
    this[unknown0]  = false;
    this[unknown1]  = false;
      this.x = data.readUInt16BE(BLOCK_CONSTANTS.LOC_X_OFFSET);
    //if (this.x > BLOCK_CONSTANTS.LOC_X_MAX) throw new Error("BLOCK_LOC_X_MAX exceeded");
    this.x /= BLOCK_CONSTANTS.COORDINATE_MULTIPLIER;
    this.y = data.readUInt16BE(BLOCK_CONSTANTS.LOC_Y_OFFSET);
    //if (this.y > BLOCK_CONSTANTS.LOC_Y_MAX) throw new Error("BLOCK_LOC_Y_MAX exceeded");
    this.y /= BLOCK_CONSTANTS.COORDINATE_MULTIPLIER; // TODO tracks have weird y values if they are linked
    this.dimX = (data.readUInt8(BLOCK_CONSTANTS.DIMENSION_OFFSET));
    this.dimY = (data.readUInt8(BLOCK_CONSTANTS.DIMENSION_OFFSET + 1));
    this.orientation = data.readUInt8(BLOCK_CONSTANTS.ORIENTATION_OFFSET);
    this.zIndex = data.readUInt16BE(BLOCK_CONSTANTS.Z_INDEX_OFFSET);
    this.blockType = data.readUInt8(BLOCK_CONSTANTS.TYPE_OFFSET);
    this.entityType = data.readUInt16BE(BLOCK_CONSTANTS.ENTITY_TYPE_OFFSET);
    if (this.entityType === BLOCK_CONSTANTS.ENTITY_TYPE.LIVING) {
        this[living] = true;
    } else if (this.entityType === BLOCK_CONSTANTS.ENTITY_TYPE.PLATFORM) {
        this[platform] = true;
    }
    this.link = data.readUInt8(BLOCK_CONSTANTS.LINK_OFFSET);
    if (this.link !== 0) {
        this[linkable] = true;
    }
    this.id = data.readUInt16BE(BLOCK_CONSTANTS.ID_OFFSET);
    if (this.id !== 0xFFFF) {
        this[hasId] = true;
    }*/

    this.tileData = data;
  }

  toBuffer(lazy) {

    if (lazy) {
      return this.tileData;
    }
  }

}
exports.default = Tile;