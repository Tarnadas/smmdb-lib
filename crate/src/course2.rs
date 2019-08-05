use crate::constants2::*;
use crate::decrypt;
use crate::key_tables::*;
use crate::proto::SMM2Course::{
    SMM2Course, SMM2CourseArea, SMM2CourseArea_AutoScroll, SMM2CourseArea_CourseTheme,
    SMM2CourseArea_WaterMode, SMM2CourseArea_WaterSpeed, SMM2CourseHeader,
    SMM2CourseHeader_GameStyle,
};

use chrono::naive::{NaiveDate, NaiveDateTime, NaiveTime};
use itertools::Itertools;
use protobuf::{parse_from_bytes, Message, ProtobufEnum, SingularPtrField};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, PartialEq)]
pub struct Course2 {
    course: SMM2Course,
}

impl Course2 {
    pub fn get_course_ref(&self) -> &SMM2Course {
        &self.course
    }

    pub fn get_course_ref_mut(&mut self) -> &SMM2Course {
        &mut self.course
    }
}

#[wasm_bindgen]
impl Course2 {
    #[wasm_bindgen]
    pub fn from_proto(buffer: &[u8]) -> Course2 {
        let course: SMM2Course = parse_from_bytes(buffer).unwrap();
        Course2 { course }
    }

    #[wasm_bindgen]
    pub fn from_boxed_proto(buffer: Box<[u8]>) -> Course2 {
        let course: SMM2Course = parse_from_bytes(buffer.to_vec().as_slice()).unwrap();
        Course2 { course }
    }

    #[wasm_bindgen]
    pub fn from_js(course: JsValue) -> Course2 {
        let course: SMM2Course = course.into_serde().expect("Course serialization failed");
        Course2 { course }
    }

    #[wasm_bindgen]
    pub fn into_proto(&self) -> Box<[u8]> {
        let mut out: Vec<u8> = vec![];
        self.course
            .write_to_vec(&mut out)
            .expect("Writing to Vector failed");
        out.into_boxed_slice()
    }

    #[wasm_bindgen]
    pub fn into_js(&self) -> JsValue {
        JsValue::from_serde(&self.course).unwrap()
    }

    #[wasm_bindgen]
    pub fn decrypt(course: Vec<u8>) -> Vec<u8> {
        [
            &course[..0x10],
            &decrypt(course[0x10..].to_vec(), &COURSE_KEY_TABLE)[..],
            &course[course.len() - 0x30..],
        ]
        .concat()
    }
}

impl Course2 {
    pub fn from_switch_file(course_data: &mut [u8]) -> Result<Course2, Course2ConvertError> {
        let course_data = Course2::decrypt(course_data.to_vec());

        let header = Course2::get_course_header(&course_data)?;
        let course_area = Course2::get_course_area(&course_data, 0)?;
        let course_sub_area = Course2::get_course_area(&course_data, 1)?;

        Ok(Course2 {
            course: SMM2Course {
                version: VERSION,
                header,
                course_area,
                course_sub_area,
                ..SMM2Course::default()
            },
        })
    }

    fn get_course_header(
        course_data: &[u8],
    ) -> Result<SingularPtrField<SMM2CourseHeader>, Course2ConvertError> {
        let modified = Course2::get_modified(course_data);
        let title =
            Course2::get_utf16_string_from_slice(&course_data[TITLE_OFFSET..TITLE_OFFSET_END]);
        let description = Course2::get_utf16_string_from_slice(
            &course_data[DESCRIPTION_OFFSET..DESCRIPTION_OFFSET_END],
        );
        let game_style = Course2::get_game_style_from_str(
            String::from_utf8(course_data[GAME_STYLE_OFFSET..GAME_STYLE_OFFSET_END].to_vec())
                .map_err(|_| Course2ConvertError::GameStyleParseError)?,
        )?;
        let start_y = course_data[START_Y_OFFSET] as u32;
        let finish_y = course_data[FINISH_Y_OFFSET] as u32;
        let finish_x = u16::from_be_bytes([
            course_data[FINISH_X_OFFSET],
            course_data[FINISH_X_OFFSET + 1],
        ]) as u32;
        let time =
            u16::from_be_bytes([course_data[TIME_OFFSET], course_data[TIME_OFFSET + 1]]) as u32;

        Ok(SingularPtrField::some(SMM2CourseHeader {
            modified,
            title,
            description,
            game_style,
            start_y,
            finish_y,
            finish_x,
            time,
            ..SMM2CourseHeader::default()
        }))
    }

    fn get_course_area(
        course_data: &[u8],
        const_index: usize,
    ) -> Result<SingularPtrField<SMM2CourseArea>, Course2ConvertError> {
        let course_theme = SMM2CourseArea_CourseTheme::from_i32(
            course_data[COURSE_THEME_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2ConvertError::CourseThemeParseError)?;
        let auto_scroll = SMM2CourseArea_AutoScroll::from_i32(
            course_data[AUTO_SCROLL_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2ConvertError::AutoScrollParseError)?;
        let water_max = course_data[WATER_MAX_OFFSET[const_index]] as u32;
        let water_mode =
            SMM2CourseArea_WaterMode::from_i32(course_data[WATER_MODE_OFFSET[const_index]] as i32)
                .ok_or(Course2ConvertError::WaterModeParseError)?;
        let water_speed = SMM2CourseArea_WaterSpeed::from_i32(
            course_data[WATER_SPEED_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2ConvertError::WaterSpeedParseError)?;
        let water_min = course_data[WATER_MIN_OFFSET[const_index]] as u32;

        Ok(SingularPtrField::some(SMM2CourseArea {
            course_theme,
            auto_scroll,
            water_max,
            water_mode,
            water_speed,
            water_min,
            ..SMM2CourseArea::default()
        }))
    }

    fn get_modified(course_data: &[u8]) -> u64 {
        let year = u16::from_le_bytes([course_data[YEAR_OFFSET], course_data[YEAR_OFFSET + 1]]);
        let month = course_data[MONTH_OFFSET];
        let day = course_data[DAY_OFFSET];
        let hour = course_data[HOUR_OFFSET];
        let minute = course_data[MINUTE_OFFSET];
        let time = NaiveDateTime::new(
            NaiveDate::from_ymd(year as i32, month as u32, day as u32),
            NaiveTime::from_hms(hour as u32, minute as u32, 0),
        );
        time.timestamp() as u64
    }

    fn get_utf16_string_from_slice(bytes: &[u8]) -> String {
        let res: Vec<u16> = bytes
            .into_iter()
            .cloned()
            .tuples()
            .map(|(hi, lo)| u16::from_le_bytes([hi, lo]))
            .filter(|e| *e != 0)
            .collect();
        String::from_utf16(&res).expect("[Course::get_utf16_string_from_slice] from_utf16 failed")
    }

    fn get_game_style_from_str(
        s: String,
    ) -> Result<SMM2CourseHeader_GameStyle, Course2ConvertError> {
        match s.as_ref() {
            "M1" => Ok(SMM2CourseHeader_GameStyle::M1),
            "M3" => Ok(SMM2CourseHeader_GameStyle::M3),
            "MW" => Ok(SMM2CourseHeader_GameStyle::MW),
            "WU" => Ok(SMM2CourseHeader_GameStyle::WU),
            "W3" => Ok(SMM2CourseHeader_GameStyle::W3),
            _ => Err(Course2ConvertError::GameStyleParseError),
        }
    }
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
