//const BLOCK_BITMASK_BUF    = Buffer.from("000000000000FFFF00000000FFFFFFFFFFFFFFFF0000000000FFFFFFFFFFFFFF", "hex");

//const BLOCK_TYPE_BLOCK_BUF = Buffer.from("00000000000059E20000000006000840060008400000000000FFFFFFFFFFFFFF", "hex");

const BLOCK_LOC_X_OFFSET = 2; // uint_16
const BLOCK_LOC_Y_OFFSET = 8; // uint_16
const BLOCK_LOC_X_MAX = 0x95B0;
const BLOCK_LOC_Y_MAX = 0x1090;
const BLOCK_LOC_START = 0x50;
const BLOCK_LOC_OFFSET = 0xA0;

const BLOCK_DIMENSION_OFFSET = 0xA; // x uint_8, y uint_8

const BLOCK_TYPE_OFFSET = 0x18; // uint_8

const BLOCK_TYPE_NORMAL = 0x4;
const BLOCK_TYPE_QUESTIONMARK = 0x5;
const BLOCK_TYPE_HARD = 0x6;
const BLOCK_TYPE_GROUND = 0x7;
const BLOCK_TYPE_FALLING = 0x15;
const BLOCK_TYPE_CLOUD = 0x16;
const BLOCK_TYPE_NOTE = 0x17;
const BLOCK_TYPE_KAIZO = 0x1D;
const BLOCK_TYPE_SPIKE = 0x2B;
const BLOCK_TYPE_ICE = 0x3F;

const BLOCK_TYPES = {};
BLOCK_TYPES[BLOCK_TYPE_NORMAL] = "Normal";
BLOCK_TYPES[BLOCK_TYPE_QUESTIONMARK] = "Question Mark";
BLOCK_TYPES[BLOCK_TYPE_HARD] = "Hard";
BLOCK_TYPES[BLOCK_TYPE_GROUND] = "Ground";
BLOCK_TYPES[BLOCK_TYPE_FALLING] = "Falling";
BLOCK_TYPES[BLOCK_TYPE_CLOUD] = "Cloud";
BLOCK_TYPES[BLOCK_TYPE_NOTE] = "Note";
BLOCK_TYPES[BLOCK_TYPE_KAIZO] = "Kaizo";
BLOCK_TYPES[BLOCK_TYPE_SPIKE] = "Spike";
BLOCK_TYPES[BLOCK_TYPE_ICE] = "Ice";

export default class Block {
    constructor (data) {
        this.x = (data.readUInt16BE(BLOCK_LOC_X_OFFSET) - BLOCK_LOC_START);
        if (this.x > BLOCK_LOC_X_MAX) throw new Error("BLOCK_LOC_X_MAX exceeded");
        this.x /= BLOCK_LOC_OFFSET;
        this.y = (data.readUInt16BE(BLOCK_LOC_Y_OFFSET) - BLOCK_LOC_START);
        if (this.y > BLOCK_LOC_Y_MAX) throw new Error("BLOCK_LOC_Y_MAX exceeded");
        this.y /= BLOCK_LOC_OFFSET;
        this.dimX = (data.readUInt8(BLOCK_DIMENSION_OFFSET) - BLOCK_LOC_START);
        if (this.dimX > BLOCK_LOC_X_MAX) throw new Error("BLOCK_LOC_X_MAX exceeded");
        this.dimX /= BLOCK_LOC_OFFSET;
        this.blockType = data.readUInt8(BLOCK_TYPE_OFFSET);
    }
}