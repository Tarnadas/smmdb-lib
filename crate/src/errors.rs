//! Module which contains error types.

use zip::result::ZipError;

/// Error which can occur during Super Mario Maker course file serialization.
#[derive(Debug)]
pub enum CourseConvertError {
    GameStyleParse,
    CourseThemeParse,
    AutoScrollParse,
    SoundTypeConvert,
}

/// Error which can occur during Super Mario Maker 2 course file serialization.
#[derive(Debug)]
pub enum Course2ConvertError {
    GameStyleParse,
    CourseThemeParse,
    AutoScrollParse,
    WaterModeParse,
    WaterSpeedParse,
    SoundTypeConvert,
}

/// Error which can occur during decompression.
#[derive(Debug)]
pub enum DecompressionError {
    /// Failed to decompress zip file
    Zip(ZipError),
}
