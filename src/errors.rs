//! Module which contains error types.

#[cfg(feature = "save")]
use std::io;
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
    #[fail(display = "Course2ConvertError::AutoScrollParse")]
    AutoScrollParse,
    #[fail(display = "Course2ConvertError::ScreenBoundaryParse")]
    ScreenBoundaryParse,
    #[fail(display = "Course2ConvertError::OrientationParse")]
    OrientationParse,
    #[fail(display = "Course2ConvertError::WaterModeParse")]
    WaterModeParse,
    #[fail(display = "Course2ConvertError::WaterSpeedParse")]
    WaterSpeedParse,
    #[fail(display = "Course2ConvertError::DayTimeParse")]
    DayTimeParse,
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

#[cfg(feature = "save")]
#[derive(Debug, Fail)]
pub enum SaveError {
    #[fail(display = "{}", _0)]
    IoError(io::Error),
    #[fail(display = "{}", _0)]
    Course2ConvertError(Course2ConvertError),
    #[fail(display = "index must be between 0 and 180, but received {}", _0)]
    CourseIndexOutOfBounds(u8),
}

#[cfg(feature = "save")]
impl From<io::Error> for SaveError {
    fn from(err: io::Error) -> SaveError {
        SaveError::IoError(err)
    }
}

#[cfg(feature = "save")]
impl From<Course2ConvertError> for SaveError {
    fn from(err: Course2ConvertError) -> SaveError {
        SaveError::Course2ConvertError(err)
    }
}
