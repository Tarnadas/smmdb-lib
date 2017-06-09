const SAR_CONSTANTS = {
    SARC_HEADER: {
        MAGIC_OFFSET: 0,
        MAGIC_SIZE: 4,
        MAGIC_VALUE: 0x53415243,

        HEADER_LENGTH_OFFSET: 4,
        HEADER_LENGTH_SIZE: 2,
        HEADER_VALUE: 0x14,

        ENDIANNESS_OFFSET: 6,
        ENDIANNESS_SIZE: 2,
        ENDIANNESS_BIG_ENDIAN: 0xFEFF,
        ENDIANNESS_LITTLE_ENDIAN: 0xFFFE,

        FILE_SIZE_OFFSET: 8,
        FILE_SIZE_SIZE: 2,

        DATA_BEGINNING_OFFSET: 0xC,
        DATA_BEGINNING_SIZE: 4,

        UNKNOWN_OFFSET: 0x10,
        UNKNOWN_SIZE: 4,
        UNKNOWN_VALUE: 0x10000000
    }
};

export default class SARC {

}