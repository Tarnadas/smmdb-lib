export const BLOCK_CONSTANTS = {
    SIZE: 0x20,

    LOC_X_OFFSET: 2, // uint_16
    LOC_Y_OFFSET: 8, // uint_16
    LOC_X_MAX: 0x95B0,
    LOC_Y_MAX: 0x1090,
    LOC_START: 0x50,
    LOC_OFFSET: 0xA0,
    
    DIMENSION_OFFSET: 0xA; // x uint_8, y uint_8
    
    ORIENTATION_OFFSET: 0xF; // uint_8 >> 4
    
    Z_INDEX_OFFSET: 0x6; // uint_16
    
    ENTITY_TYPE_OFFSET: 0x4; // uint_16
    ENTITY_TYPE: {
        STATIC: 0,
        LIVING: 1,
        PLATFORM: 0xFFFF
    }
    
    TYPE_OFFSET: 0x18; // uint_8
    
    LINK_OFFSET: 0xD; // uint_8 >> 4
};

const living   = Symbol();
const platform = Synbol();
const linkable = Synbol();
const hasId    = Synbol();
const costume  = Synbol();
const unknown0 = Synbol();
const unknown1 = Synbol();

export default class Block {
    
    constructor (data) {
        
        this[living]   = false;
        this[platform] = false;
        this[linkable] = false;
        this[hasId]    = false;
        this[costume]  = false;
        this[unknown0] = false;
        this[unknown1] = false;
        
        this.x = (data.readUInt16BE(BLOCK_CONSTANTS.LOC_X_OFFSET) - BLOCK_CONSTANTS.LOC_START);
        if (this.x > BLOCK_CONSTANTS.LOC_X_MAX) throw new Error("BLOCK_LOC_X_MAX exceeded");
        this.x /= BLOCK_CONSTANTS.LOC_OFFSET;
        this.y = (data.readUInt16BE(BLOCK_CONSTANTS.LOC_Y_OFFSET) - BLOCK_CONSTANTS.LOC_START);
        if (this.y > BLOCK_CONSTANTS.LOC_Y_MAX) throw new Error("BLOCK_LOC_Y_MAX exceeded");
        this.y /= BLOCK_CONSTANTS.LOC_OFFSET;
        this.dimX = (data.readUInt8(BLOCK_CONSTANTS.DIMENSION_OFFSET));
        this.dimY = (data.readUInt8(BLOCK_CONSTANTS.DIMENSION_OFFSET + 1));
        this.orientation = data.readUInt8(BLOCK_CONSTANTS.ORIENTATION_OFFSET) >> 4;
        this.zIndex = data.readUInt16BE(BLOCK_CONSTANTS.Z_INDEX_OFFSET);
        this.blockType = data.readUInt8(BLOCK_CONSTANTS.TYPE_OFFSET);
        this.entityType = data.readUInt16BE(BLOCK_CONSTANTS.ENTITY_TYPE_OFFSET);
        if (this.entityType === BLOCK_CONSTANTS.ENTITY_TYPE.LIVING) {
            this[living] = true;
        } else if (this.entityType === BLOCK_CONSTANTS.ENTITY_TYPE.PLATFORM) {
            this[platform] = true;
        }
        this.link = data.readUInt8(BLOCK_CONSTANTS.LINK_OFFSET) >> 4;
        
        
    }

    toBuffer () {

    }
    
}