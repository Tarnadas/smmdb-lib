//! Module which contains error types.

use std::io;
use thiserror::Error;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsValue;
use zip::result::ZipError;

#[derive(Debug, Error)]
pub enum SmmdbError {
    #[error("Mime type {0} not supported")]
    MimeTypeUnsupported(String),
    /// Failed to decompress zip file
    #[error(transparent)]
    Zip(#[from] ZipError),
    #[error(transparent)]
    IoError(#[from] io::Error),
    #[error(transparent)]
    CourseConvertError(#[from] CourseConvertError),
    #[error(transparent)]
    Course2ConvertError(#[from] Course2ConvertError),
    #[cfg(feature = "save")]
    #[error(transparent)]
    SaveError(#[from] SaveError),
}

impl Into<String> for SmmdbError {
    fn into(self) -> String {
        format!("{:?}", self)
    }
}

/// Error which can occur during Super Mario Maker course file serialization.
#[derive(Clone, Debug, Error)]
pub enum CourseConvertError {
    #[error("CourseConvertError::GameStyleParse")]
    GameStyleParse,
    #[error("CourseConvertError::CourseThemeParse")]
    CourseThemeParse,
    #[error("CourseConvertError::AutoScrollParse")]
    AutoScrollParse,
    #[error("CourseConvertError::SoundTypeConvert")]
    SoundTypeConvert,
}

/// Error which can occur during Super Mario Maker 2 course file serialization.
#[derive(Clone, Debug, Error)]
pub enum Course2ConvertError {
    #[error("Course2ConvertError::GameStyleParse")]
    GameStyleParse,
    #[error("Course2ConvertError::ClearConditionTypeParse")]
    ClearConditionTypeParse,
    #[error("Course2ConvertError::CourseThemeParse")]
    CourseThemeParse,
    #[error("Course2ConvertError::AutoScrollParse")]
    AutoScrollParse,
    #[error("Course2ConvertError::ScreenBoundaryParse")]
    ScreenBoundaryParse,
    #[error("Course2ConvertError::OrientationParse")]
    OrientationParse,
    #[error("Course2ConvertError::WaterModeParse")]
    WaterModeParse,
    #[error("Course2ConvertError::WaterSpeedParse")]
    WaterSpeedParse,
    #[error("Course2ConvertError::DayTimeParse")]
    DayTimeParse,
    #[error("Course2ConvertError::SoundTypeConvert")]
    SoundTypeConvert,
    #[error("Course2ConvertError::ConvertFromBuffer")]
    ConvertFromBuffer,
}

#[cfg(feature = "save")]
#[derive(Clone, Debug, Error)]
pub enum SaveError {
    #[error("index must be between 0 and 180, but received {0}")]
    CourseIndexOutOfBounds(u8),
    #[error("no course found at index {0}")]
    CourseNotFound(u8),
    #[error("thumbnail is missing for course {0}")]
    ThumbnailRequired(String),
}

#[cfg(target_arch = "wasm32")]
impl From<SmmdbError> for JsValue {
    fn from(err: SmmdbError) -> JsValue {
        JsValue::from(format!("{}", err))
    }
}
