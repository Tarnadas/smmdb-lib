use crate::constants::*;
use crate::proto::SMMCourse::{SMMCourse, SMMCourse_CourseTheme, SMMCourse_GameStyle};

use itertools::Itertools;
use protobuf::{parse_from_bytes, Message, ProtobufEnum};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, PartialEq)]
pub struct Course {
    course: SMMCourse,
}

impl Course {
    pub fn get_course_ref(&self) -> &SMMCourse {
        &self.course
    }
}

#[wasm_bindgen]
impl Course {
    #[wasm_bindgen]
    pub fn from_proto(buffer: &[u8]) -> Course {
        let course: SMMCourse = parse_from_bytes(buffer).unwrap();
        Course { course }
    }

    #[wasm_bindgen]
    pub fn from_boxed_proto(buffer: Box<[u8]>) -> Course {
        let course: SMMCourse = parse_from_bytes(buffer.to_vec().as_slice()).unwrap();
        Course { course }
    }

    #[wasm_bindgen]
    pub fn from_js(course: JsValue) -> Course {
        let course: SMMCourse = course.into_serde().expect("Course serialization failed");
        Course { course }
    }

    #[wasm_bindgen]
    pub fn to_proto(&self) -> Box<[u8]> {
        let mut out: Vec<u8> = vec![];
        self.course
            .write_to_vec(&mut out)
            .expect("Writing to Vector failed");
        out.into_boxed_slice()
    }

    #[wasm_bindgen]
    pub fn to_js(&self) -> JsValue {
        JsValue::from_serde(&self.course).unwrap()
    }

    pub fn from_wii_u_course_data(
        course_data: &[u8],
        course_data_sub: &[u8],
    ) -> Result<Course, CourseConvertError> {
        let title =
            Course::get_utf16_string_from_slice(&course_data[TITLE_OFFSET..TITLE_OFFSET_END]);
        let maker =
            Course::get_utf16_string_from_slice(&course_data[MAKER_OFFSET..MAKER_OFFSET_END]);
        let game_style = Course::get_game_style_from_str(
            String::from_utf8(course_data[GAME_STYLE_OFFSET..GAME_STYLE_OFFSET_END].to_vec())
                .map_err(|_| CourseConvertError::GAME_STYLE_PARSE_ERROR)?,
        )?;
        let course_theme = SMMCourse_CourseTheme::from_i32(course_data[COURSE_THEME_OFFSET] as i32)
            .ok_or(CourseConvertError::COURSE_THEME_PARSE_ERROR)?;
        let course_theme_sub =
            SMMCourse_CourseTheme::from_i32(course_data_sub[COURSE_THEME_OFFSET] as i32)
                .ok_or(CourseConvertError::COURSE_THEME_PARSE_ERROR)?;
        let course = Course {
            course: SMMCourse {
                title,
                maker,
                game_style,
                course_theme,
                course_theme_sub,
                ..SMMCourse::default()
            },
        };
        dbg!(&course.course);
        Ok(course)
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

    fn get_game_style_from_str(s: String) -> Result<SMMCourse_GameStyle, CourseConvertError> {
        match s.as_ref() {
            "M1" => Ok(SMMCourse_GameStyle::M1),
            "M3" => Ok(SMMCourse_GameStyle::M3),
            "MW" => Ok(SMMCourse_GameStyle::MW),
            "WU" => Ok(SMMCourse_GameStyle::WU),
            _ => Err(CourseConvertError::GAME_STYLE_PARSE_ERROR),
        }
    }
}

pub enum CourseConvertError {
    GAME_STYLE_PARSE_ERROR,
    COURSE_THEME_PARSE_ERROR,
}
