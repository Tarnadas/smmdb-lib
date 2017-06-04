export const SOUND_CONSTANTS = {
    SIZE: 8,
    LOC_X_OFFSET: 3,
    LOC_Y_OFFSET: 4,
    TYPE_OFFSET: 0,
    VARIATION_OFFSET: 2,
    SOUND_DEFAULT: Buffer.from('FFFF00FFFF000000', 'hex')
};

export default class Sound {
    constructor (data) {
        this.x = data.readUInt8(SOUND_CONSTANTS.LOC_X_OFFSET);
        this.y = data.readUInt8(SOUND_CONSTANTS.LOC_Y_OFFSET);
        this.soundType = data.readUInt8(SOUND_CONSTANTS.TYPE_OFFSET);
        this.variation = data.readUInt8(SOUND_CONSTANTS.VARIATION_OFFSET);
    }
    toBuffer () {
        let buffer = Buffer.from(SOUND_CONSTANTS.SOUND_DEFAULT);
        buffer.writeUInt8(this.x, SOUND_CONSTANTS.LOC_X_OFFSET);
        buffer.writeUInt8(this.y, SOUND_CONSTANTS.LOC_Y_OFFSET);
        buffer.writeUInt8(this.soundType, SOUND_CONSTANTS.TYPE_OFFSET);
        buffer.writeUInt8(+this.variation, SOUND_CONSTANTS.VARIATION_OFFSET);
        return buffer;
    }
    static toBuffer (obj) {
        let buffer = Buffer.from(SOUND_CONSTANTS.SOUND_DEFAULT);
        buffer.writeUInt8(obj.x, SOUND_CONSTANTS.LOC_X_OFFSET);
        buffer.writeUInt8(obj.y, SOUND_CONSTANTS.LOC_Y_OFFSET);
        buffer.writeUInt8(!!obj.soundType ? obj.soundType : 0, SOUND_CONSTANTS.TYPE_OFFSET);
        buffer.writeUInt8(+obj.variation, SOUND_CONSTANTS.VARIATION_OFFSET);
        return buffer;
    }
}