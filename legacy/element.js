"use strict";

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ELEMENT_BITMASK_BUF = Buffer.from("000000000000FFFF00000000FFFFFFFFFFFFFFFF0000000000FFFFFFFFFFFFFF", "hex");

var ELEMENT_TYPE_BLOCK_BUF = Buffer.from("00000000000059E20000000006000840060008400000000000FFFFFFFFFFFFFF", "hex");

var ELEMENT_LOC_X_OFFSET = 2; // uint_16
var ELEMENT_LOC_Y_OFFSET = 8; // uint_16
var ELEMENT_LOC_X_MAX = 0x95B0;
var ELEMENT_LOC_Y_MAX = 0x1090;
var ELEMENT_LOC_START = 0x50;
var ELEMENT_LOC_OFFSET = 0xA0;

var ELEMENT_DIMENSION_OFFSET = 0xA; // x uint_8, y uint_8

module.exports = getElement;

function getElement(data) {
    if (data.or(ELEMENT_BITMASK_BUF).compare(ELEMENT_TYPE_BLOCK_BUF) === 0) {
        return new Block(data);
    } else {
        return new Element("unknown", data);
    }
}

var Element = function Element(type, data) {
    _classCallCheck(this, Element);

    this.type = type;
    this.x = (data.readUInt16BE(ELEMENT_LOC_X_OFFSET) - ELEMENT_LOC_START) / ELEMENT_LOC_OFFSET;
    this.y = (data.readUInt16BE(ELEMENT_LOC_Y_OFFSET) - ELEMENT_LOC_START) / ELEMENT_LOC_OFFSET;
};

var BLOCK_TYPE_OFFSET = 0x18; // uint_8

var BLOCK_TYPE_NORMAL = 0x4;
var BLOCK_TYPE_QUESTIONMARK = 0x5;
var BLOCK_TYPE_HARD = 0x6;
var BLOCK_TYPE_GROUND = 0x7;
var BLOCK_TYPE_FALLING = 0x15;
var BLOCK_TYPE_CLOUD = 0x16;
var BLOCK_TYPE_NOTE = 0x17;
var BLOCK_TYPE_KAIZO = 0x1D;
var BLOCK_TYPE_SPIKE = 0x2B;
var BLOCK_TYPE_ICE = 0x3F;

var BLOCK_TYPES = {};
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

var Block = function (_Element) {
    _inherits(Block, _Element);

    function Block(data) {
        _classCallCheck(this, Block);

        var _this = _possibleConstructorReturn(this, (Block.__proto__ || Object.getPrototypeOf(Block)).call(this, "Block", data));

        _this.blockType = data.readUInt8(BLOCK_TYPE_OFFSET);
        _this.blockTypeReadable = BLOCK_TYPES[data.readUInt8(BLOCK_TYPE_OFFSET)];
        return _this;
    }

    return Block;
}(Element);

Buffer.prototype.or = function (buffer) {
    var length = Buffer.byteLength(buffer);
    if (length !== Buffer.byteLength(this)) {
        throw new Error("Buffers must have same size for OR");
    }
    var orBuffer = Buffer.alloc(length);
    for (var i = 0; i < length; i++) {
        orBuffer.writeUInt8(this.readUInt8(i) & buffer.readUInt8(i), i);
    }
    return orBuffer;
};