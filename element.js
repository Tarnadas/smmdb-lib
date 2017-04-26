const ELEMENT_BITMASK    = "000000000000FFFF00000000FFFFFFFFFFFFFFFF0000000000FFFFFFFFFFFFFF";

const ELEMENT_TYPE_BLOCK = "00000000000059E20000000006000840060008400000000000FFFFFFFFFFFFFF";

const ELEMENT_LOC_X_OFFSET = 2; // uint_16
const ELEMENT_LOC_Y_OFFSET = 8; // uint_16
const ELEMENT_LOC_X_MAX = 0x95B0;
const ELEMENT_LOC_Y_MAX = 0x1090;
const ELEMENT_LOC_START = 0x50;
const ELEMENT_LOC_OFFSET = 0xA0;

const ELEMENT_DIMENSION_OFFSET = 0xA; // x uint_8, y uint_8

module.exports = getElement;

function getElement (data) {
    if (data.or(Buffer.from(ELEMENT_BITMASK, "hex")).compare(Buffer.from(ELEMENT_TYPE_BLOCK, "hex")) === 0) {
        return new Block(data);
    } else {
        return new Element("unknown", data);
    }
}

class Element {
    constructor (type, data) {
        this.type = type;
        this.x = (data.readUInt16BE(ELEMENT_LOC_X_OFFSET) - ELEMENT_LOC_START) / ELEMENT_LOC_OFFSET;
        this.y = (data.readUInt16BE(ELEMENT_LOC_Y_OFFSET) - ELEMENT_LOC_START) / ELEMENT_LOC_OFFSET;
    }
}

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

class Block extends Element {
    constructor (data) {
        super("Block", data);
        this.blockType = data.readUInt8(BLOCK_TYPE_OFFSET);
        this.blockTypeReadable = BLOCK_TYPES[data.readUInt8(BLOCK_TYPE_OFFSET)];
    }
}

Buffer.prototype.or = function (buffer) {
    let length = Buffer.byteLength(buffer);
    if (length !== Buffer.byteLength(this)) {
        throw new Error("Buffers must have same size for OR");
    }
    let orBuffer = Buffer.alloc(length);
    for (let i = 0; i < length; i++) {
        orBuffer.writeUInt8(this.readUInt8(i) & buffer.readUInt8(i), i);
    }
    return orBuffer
};