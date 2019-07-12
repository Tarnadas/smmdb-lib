pub const COURSE_SIZE: usize = 0x15000;
pub const CRC_LENGTH: usize = 0x10;
//   CRC_PRE_BUF: Buffer.from('000000000000000B', 'hex'),
//   CRC_POST_BUF: Buffer.alloc(4),

//   TIMESTAMP_0_OFFSET: 0x1,
//   TIMESTAMP_1_OFFSET: 0x14,

pub const TITLE_OFFSET: usize = 0x29;
pub const TITLE_LENGTH: usize = 0x40;
pub const TITLE_OFFSET_END: usize = TITLE_OFFSET + TITLE_LENGTH;

pub const MAKER_OFFSET: usize = 0x92;
pub const MAKER_LENGTH: usize = 0x14;
pub const MAKER_OFFSET_END: usize = MAKER_OFFSET + MAKER_LENGTH;

pub const GAME_STYLE_OFFSET: usize = 0x6A;
pub const GAME_STYLE_OFFSET_END: usize = GAME_STYLE_OFFSET + 2;

pub const COURSE_THEME_OFFSET: usize = 0x6D;

pub const TIME_OFFSET: usize = 0x70;

pub const AUTO_SCROLL_OFFSET: usize = 0x72;

pub const WIDTH_OFFSET: usize = 0x76;

pub const TILE_AMOUNT_OFFSET: usize = 0xEE;
pub const TILE_SIZE: usize = 0x20;
pub const TILES_OFFSET: usize = 0xF0;

pub const SOUND_SIZE: usize = 8;
pub const SOUND_OFFSET: usize = 0x145F0;
pub const SOUND_OFFSET_END: usize = 0x14F50;
pub const SOUND_X_OFFSET: usize = 3;
pub const SOUND_Y_OFFSET: usize = 4;
pub const SOUND_TYPE_OFFSET: usize = 0;
pub const SOUND_VARIATION_OFFSET: usize = 2;

//   DS_HEADER_CRC_OFFSET: 0x4F014,
//   DS_HEADER_LENGTH: 0x1C,
//   DS_FILE_LENGTH: 0x4301C
// }
