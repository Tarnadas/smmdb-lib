export const BLOCK_CONSTANTS = {
    SIZE: 0x20,

    LOC_X_OFFSET: 2, // uint_16
    LOC_Y_OFFSET: 8, // uint_16

    LOC_X_MAX: 0x95B0,
    LOC_Y_MAX: 0x1090,

    LOC_START: 0x50,
    LOC_OFFSET: 0xA0,
};


const BLOCK_DIMENSION_OFFSET = 0xA; // x uint_8, y uint_8

const BLOCK_TYPE_OFFSET = 0x18; // uint_8

export default class Block {
    constructor (data) {
        this.x = (data.readUInt16BE(BLOCK_CONSTANTS.LOC_X_OFFSET) - BLOCK_CONSTANTS.LOC_START);
        if (this.x > BLOCK_CONSTANTS.LOC_X_MAX) throw new Error("BLOCK_LOC_X_MAX exceeded");
        this.x /= BLOCK_CONSTANTS.LOC_OFFSET;
        this.y = (data.readUInt16BE(BLOCK_CONSTANTS.LOC_Y_OFFSET) - BLOCK_CONSTANTS.LOC_START);
        if (this.y > BLOCK_CONSTANTS.LOC_Y_MAX) throw new Error("BLOCK_LOC_Y_MAX exceeded");
        this.y /= BLOCK_CONSTANTS.LOC_OFFSET;
        this.dimX = (data.readUInt8(BLOCK_DIMENSION_OFFSET));
        this.dimY = (data.readUInt8(BLOCK_DIMENSION_OFFSET + 1));
        this.blockType = data.readUInt8(BLOCK_TYPE_OFFSET);
    }

    toBuffer () {

    }
}