//! Module which contains error types.

use zip::result::ZipError;

/// Error which can occur during Super Mario Maker course file serialization.
#[derive(Debug, Fail)]
pub enum CourseConvertError {
    #[fail(display = "CourseConvertError::GameStyleParse")]
    GameStyleParse,
    #[fail(display = "CourseConvertError::CourseThemeParse")]
    CourseThemeParse,
    #[fail(display = "CourseConvertError::AutoScrollParse")]
    AutoScrollParse,
    #[fail(display = "CourseConvertError::SoundTypeConvert")]
    SoundTypeConvert,
}

/// Error which can occur during Super Mario Maker 2 course file serialization.
#[derive(Debug, Fail)]
pub enum Course2ConvertError {
    #[fail(display = "Course2ConvertError::GameStyleParse")]
    GameStyleParse,
    #[fail(display = "Course2ConvertError::ClearConditionTypeParse")]
    ClearConditionTypeParse,
    #[fail(display = "Course2ConvertError::CourseThemeParse")]
    CourseThemeParse,
    #[fail(display = "Course2ConvertError::CompletionFlagParse")]
    CompletionFlagParse,
    #[fail(display = "Course2ConvertError::AutoScrollParse")]
    AutoScrollParse,
    #[fail(display = "Course2ConvertError::WaterModeParse")]
    WaterModeParse,
    #[fail(display = "Course2ConvertError::WaterSpeedParse")]
    WaterSpeedParse,
    #[fail(display = "Course2ConvertError::SoundTypeConvert")]
    SoundTypeConvert,
}

/// Error which can occur during decompression.
#[derive(Debug, Fail)]
pub enum DecompressionError {
    /// Failed to decompress zip file
    #[fail(display = "{}", _0)]
    Zip(ZipError),
}
