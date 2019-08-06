use zip::result::ZipError;

#[derive(Debug)]
pub enum CourseConvertError {
    GameStyleParseError,
    CourseThemeParseError,
    AutoScrollParseError,
    SoundTypeConvertError,
}

#[derive(Debug)]
pub enum Course2ConvertError {
    GameStyleParseError,
    CourseThemeParseError,
    AutoScrollParseError,
    WaterModeParseError,
    WaterSpeedParseError,
    SoundTypeConvertError,
}

#[derive(Debug)]
pub enum DecompressionError {
    Zip(ZipError),
}
