//! Super Mario Maker 2 file manipulation.

#![allow(clippy::cast_lossless)]
use crate::proto::SMM2Course::{
    SMM2Course, SMM2CourseArea, SMM2CourseArea_AutoScroll, SMM2CourseArea_CourseTheme,
    SMM2CourseArea_DayTime, SMM2CourseArea_LiquidMode, SMM2CourseArea_LiquidSpeed,
    SMM2CourseArea_Orientation, SMM2CourseArea_ScreenBoundary, SMM2CourseHeader,
    SMM2CourseHeader_ClearConditionType, SMM2CourseHeader_GameStyle,
};
use crate::{
    constants2::*, decrypt, encrypt, errors::Course2ConvertError, fix_crc32, key_tables::*, Error,
    Thumbnail2,
};

use chrono::naive::{NaiveDate, NaiveDateTime, NaiveTime};
use infer::{Infer, Type};
use itertools::Itertools;
use protobuf::{parse_from_bytes, Message, ProtobufEnum, SingularPtrField};
use regex::Regex;
use std::{
    convert::TryFrom,
    io::{Cursor, Read},
};
#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;
use zip::{result::ZipError, ZipArchive};

#[cfg_attr(feature = "wasm", wasm_bindgen)]
#[derive(Clone, Debug, PartialEq)]
pub struct Course2 {
    course: SMM2Course,
    data: Vec<u8>,
    thumb: Option<Thumbnail2>,
}

/// Functions which aren't compatible with WebAssembly.
impl Course2 {
    /// Get a reference to the inner course struct.
    pub fn get_course(&self) -> &SMM2Course {
        &self.course
    }

    /// Get a mutable reference to the inner course struct.
    pub fn get_course_mut(&mut self) -> &mut SMM2Course {
        &mut self.course
    }

    /// Consumes and takes inner course struct.
    pub fn take_course(self) -> SMM2Course {
        self.course
    }

    pub fn get_course_data(&self) -> &Vec<u8> {
        &self.data
    }

    pub fn get_course_data_mut(&mut self) -> &mut Vec<u8> {
        &mut self.data
    }

    pub fn get_course_thumb(&self) -> Option<&Thumbnail2> {
        self.thumb.as_ref()
    }

    pub fn get_course_thumb_mut(&mut self) -> Option<&mut Thumbnail2> {
        self.thumb.as_mut()
    }
}

#[cfg_attr(feature = "wasm", wasm_bindgen)]
impl Course2 {
    #[cfg_attr(feature = "wasm", wasm_bindgen)]
    pub fn from_proto(buffer: &[u8], thumb: Option<Box<[u8]>>) -> Course2 {
        let course: SMM2Course = parse_from_bytes(buffer).unwrap();
        Course2 {
            course,
            data: vec![], // TODO
            thumb: thumb.map(|thumb| Thumbnail2::new(thumb.to_vec())),
        }
    }

    #[cfg_attr(feature = "wasm", wasm_bindgen)]
    pub fn from_boxed_proto(buffer: Box<[u8]>, thumb: Option<Box<[u8]>>) -> Course2 {
        let course: SMM2Course = parse_from_bytes(buffer.to_vec().as_slice()).unwrap();
        Course2 {
            course,
            data: vec![], // TODO
            thumb: thumb.map(|thumb| Thumbnail2::new(thumb.to_vec())),
        }
    }

    #[cfg(feature = "wasm")]
    #[wasm_bindgen]
    pub fn from_js(course: JsValue, thumb: Option<Box<[u8]>>) -> Course2 {
        let course: SMM2Course = course.into_serde().expect("Course serialization failed");
        Course2 {
            course,
            data: vec![], // TODO
            thumb: thumb.map(|thumb| Thumbnail2::new(thumb.to_vec())),
        }
    }

    #[cfg(feature = "wasm")]
    #[wasm_bindgen]
    pub fn from_packed_js(buffer: &[u8]) -> Result<Box<[JsValue]>, JsValue> {
        let courses: Vec<JsValue> = Course2::from_packed(buffer)?
            .iter()
            .map(|course| course.into_js())
            .collect();
        Ok(courses.into_boxed_slice())
    }

    #[cfg_attr(feature = "wasm", wasm_bindgen)]
    pub fn into_proto(&self) -> Box<[u8]> {
        let mut out: Vec<u8> = vec![];
        self.course
            .write_to_vec(&mut out)
            .expect("Writing to Vector failed");
        out.into_boxed_slice()
    }

    #[cfg(feature = "wasm")]
    #[wasm_bindgen]
    pub fn into_js(&self) -> JsValue {
        JsValue::from_serde(&self.course).unwrap()
    }

    #[cfg_attr(feature = "wasm", wasm_bindgen)]
    pub fn decrypt(course: &mut [u8]) {
        decrypt(&mut course[0x10..], &COURSE_KEY_TABLE);
    }

    #[cfg_attr(feature = "wasm", wasm_bindgen)]
    pub fn encrypt(course: &mut [u8]) {
        let len = course.len() - 0x30;
        fix_crc32(&mut course[..len]);
        encrypt(&mut course[0x10..], &COURSE_KEY_TABLE, true);
    }
}

impl Course2 {
    pub fn from_packed(buffer: &[u8]) -> Result<Vec<Course2>, Error> {
        let mut res = vec![];

        let mime_guess: Type = Infer::new().get(buffer).unwrap();

        match mime_guess.mime.as_ref() {
            "application/zip" => {
                Course2::decompress_zip(&mut res, buffer)?;
            }
            "application/x-tar" => {
                Course2::decompress_x_tar(&mut res, buffer)?;
            }
            mime => {
                return Err(Error::MimeTypeUnsupported(mime.to_string()));
            }
        };

        Ok(res)
    }

    pub fn from_switch_files(
        mut data: Vec<u8>,
        thumb: Option<Vec<u8>>,
        is_encrypted: bool,
    ) -> Result<Course2, Error> {
        if is_encrypted {
            Course2::decrypt(&mut data)
        };

        let header = Course2::get_course_header(&data)?;
        let course_area = Course2::get_course_area(&data, 0)?;
        let course_sub_area = Course2::get_course_area(&data, 1)?;

        Ok(Course2 {
            course: SMM2Course {
                version: VERSION,
                header,
                course_area,
                course_sub_area,
                ..SMM2Course::default()
            },
            data,
            thumb: thumb.map(if is_encrypted {
                Thumbnail2::new
            } else {
                Thumbnail2::from_decrypted
            }),
        })
    }

    fn decompress_zip(res: &mut Vec<Course2>, buffer: &[u8]) -> Result<(), ZipError> {
        let reader = Cursor::new(buffer);
        let mut zip = ZipArchive::new(reader)?;

        let courses = Course2::get_course_files_from_zip_archive(&mut zip);

        for (course, thumb) in courses {
            let course_data = Course2::read_file_from_zip_archive(&mut zip, course)?;
            let course_thumb = Course2::read_file_from_zip_archive(&mut zip, thumb)?;
            if let Ok(course) = Course2::from_switch_files(course_data, Some(course_thumb), true) {
                res.push(course);
            };
        }

        Ok(())
    }

    fn get_course_files_from_zip_archive(
        zip: &mut ZipArchive<Cursor<&[u8]>>,
    ) -> Vec<(String, String)> {
        let mut files: Vec<(String, String)> = vec![];
        for i in 0..zip.len() {
            if let Ok(file_name) = zip.by_index(i).map(|file| file.name().to_owned()) {
                let re_data: Regex = Regex::new(r".*course_data_(\d{3})\.bcd$").unwrap();
                if re_data.is_match(&file_name) {
                    let captures = re_data.captures(&file_name).unwrap();
                    let index = captures.get(1);
                    if let Some(index) = index {
                        let re_thumb: Regex =
                            Regex::new(&format!(r".*course_thumb_{}\.btl$", index.as_str()))
                                .unwrap();
                        if let Some(thumb) = Course2::find_zip_file_by_regex(zip, re_thumb) {
                            files.push((file_name, thumb));
                        }
                    }
                }
            };
        }
        files
    }

    fn find_zip_file_by_regex(zip: &mut ZipArchive<Cursor<&[u8]>>, re: Regex) -> Option<String> {
        for i in 0..zip.len() {
            if let Ok(file) = zip.by_index(i) {
                if re.is_match(file.name()) {
                    return Some(file.name().to_owned());
                }
            };
        }
        None
    }

    fn read_file_from_zip_archive(
        zip: &mut ZipArchive<Cursor<&[u8]>>,
        name: String,
    ) -> Result<Vec<u8>, ZipError> {
        let mut zip_file = zip.by_name(&name)?;
        let mut zip_file_data = vec![0; zip_file.size() as usize];
        zip_file.read_exact(&mut zip_file_data)?;

        Ok(zip_file_data)
    }

    fn decompress_x_tar(res: &mut Vec<Course2>, buffer: &[u8]) -> Result<(), ZipError> {
        let reader = Cursor::new(buffer);
        let tar = tar::Archive::new(reader);

        let courses = Course2::get_course_files_from_tar_archive(tar);

        for (course, thumb) in courses {
            if let Ok(course) = Course2::from_switch_files(course, Some(thumb), true) {
                res.push(course);
            };
        }

        Ok(())
    }

    fn get_course_files_from_tar_archive(
        mut tar: tar::Archive<Cursor<&[u8]>>,
    ) -> Vec<(Vec<u8>, Vec<u8>)> {
        let mut courses = vec![];
        for file in tar.entries().unwrap() {
            let mut file = file.unwrap();
            if let Ok(Some(file_name)) =
                file.path().map(|file| file.to_str().map(|f| f.to_string()))
            {
                let re_data: Regex = Regex::new(r".*course_data_(\d{3})\.bcd$").unwrap();
                if re_data.is_match(&file_name) {
                    let captures = re_data.captures(&file_name).unwrap();
                    let index = captures.get(1);
                    if let Some(index) = index {
                        let mut data = vec![];
                        file.read_to_end(&mut data).unwrap();
                        courses.push((data, index.as_str().to_string()));
                    }
                }
            };
        }
        let mut files = vec![];
        for (data, index) in courses {
            let mut cursor = tar.into_inner();
            cursor.set_position(0);
            tar = tar::Archive::new(cursor);
            let re_thumb: Regex = Regex::new(&format!(r".*course_thumb_{}\.btl$", index)).unwrap();
            if let Some(thumb) = Course2::find_tar_file_by_regex(&mut tar, re_thumb) {
                files.push((data, thumb));
            }
        }
        files
    }

    fn find_tar_file_by_regex(tar: &mut tar::Archive<Cursor<&[u8]>>, re: Regex) -> Option<Vec<u8>> {
        for file in tar.entries().unwrap() {
            let mut file = file.unwrap();
            if let Ok(Some(file_name)) =
                file.path().map(|file| file.to_str().map(|f| f.to_string()))
            {
                if re.is_match(&file_name) {
                    let mut res = vec![];
                    file.read_to_end(&mut res).unwrap();
                    return Some(res);
                }
            };
        }
        None
    }

    fn get_course_header(course_data: &[u8]) -> Result<SingularPtrField<SMM2CourseHeader>, Error> {
        let modified = Course2::get_modified(course_data);
        let title =
            Course2::get_utf16_string_from_slice(&course_data[TITLE_OFFSET..TITLE_OFFSET_END]);
        let description = Course2::get_utf16_string_from_slice(
            &course_data[DESCRIPTION_OFFSET..DESCRIPTION_OFFSET_END],
        );
        let game_style = Course2::get_game_style_from_str(
            String::from_utf8(course_data[GAME_STYLE_OFFSET..GAME_STYLE_OFFSET_END].to_vec())
                .map_err(|_| Course2ConvertError::GameStyleParse)?,
        )?;
        let start_y = course_data[START_Y_OFFSET] as u32;
        let finish_y = course_data[FINISH_Y_OFFSET] as u32;
        let finish_x = u16::from_le_bytes([
            course_data[FINISH_X_OFFSET],
            course_data[FINISH_X_OFFSET + 1],
        ]) as u32;
        let time =
            u16::from_le_bytes([course_data[TIME_OFFSET], course_data[TIME_OFFSET + 1]]) as u32;
        let clear_condition_type = SMM2CourseHeader_ClearConditionType::from_i32(
            course_data[CLEAR_CONDITION_TYPE_OFFSET] as i32,
        )
        .ok_or(Course2ConvertError::ClearConditionTypeParse)?;
        let clear_condition = u32::from_le_bytes([
            course_data[CLEAR_CONDITION_OFFSET],
            course_data[CLEAR_CONDITION_OFFSET + 1],
            course_data[CLEAR_CONDITION_OFFSET + 2],
            course_data[CLEAR_CONDITION_OFFSET + 3],
        ]);
        let clear_condition_amount = u16::from_le_bytes([
            course_data[CLEAR_CONDITION_AMOUNT_OFFSET],
            course_data[CLEAR_CONDITION_AMOUNT_OFFSET + 1],
        ]) as u32;
        let clear_check_tries = u32::from_le_bytes([
            course_data[CLEAR_CHECK_TRIES_OFFSET],
            course_data[CLEAR_CHECK_TRIES_OFFSET + 1],
            course_data[CLEAR_CHECK_TRIES_OFFSET + 2],
            course_data[CLEAR_CHECK_TRIES_OFFSET + 3],
        ]);
        let clear_check_time = u32::from_le_bytes([
            course_data[CLEAR_CHECK_TIME_OFFSET],
            course_data[CLEAR_CHECK_TIME_OFFSET + 1],
            course_data[CLEAR_CHECK_TIME_OFFSET + 2],
            course_data[CLEAR_CHECK_TIME_OFFSET + 3],
        ]);
        let game_version = u32::from_le_bytes([
            course_data[GAME_VERSION_OFFSET],
            course_data[GAME_VERSION_OFFSET + 1],
            course_data[GAME_VERSION_OFFSET + 2],
            course_data[GAME_VERSION_OFFSET + 3],
        ]);
        let management_flags = u32::from_le_bytes([
            course_data[MANAGEMENT_FLAGS_OFFSET],
            course_data[MANAGEMENT_FLAGS_OFFSET + 1],
            course_data[MANAGEMENT_FLAGS_OFFSET + 2],
            course_data[MANAGEMENT_FLAGS_OFFSET + 3],
        ]);
        let creation_id = u32::from_le_bytes([
            course_data[CREATION_ID_OFFSET],
            course_data[CREATION_ID_OFFSET + 1],
            course_data[CREATION_ID_OFFSET + 2],
            course_data[CREATION_ID_OFFSET + 3],
        ]);
        let upload_id = u64::from_le_bytes([
            course_data[UPLOAD_ID_OFFSET],
            course_data[UPLOAD_ID_OFFSET + 1],
            course_data[UPLOAD_ID_OFFSET + 2],
            course_data[UPLOAD_ID_OFFSET + 3],
            course_data[UPLOAD_ID_OFFSET + 4],
            course_data[UPLOAD_ID_OFFSET + 5],
            course_data[UPLOAD_ID_OFFSET + 6],
            course_data[UPLOAD_ID_OFFSET + 7],
        ]);
        let completion_version = u32::from_le_bytes([
            course_data[COMPLETION_VERSION_OFFSET],
            course_data[COMPLETION_VERSION_OFFSET + 1],
            course_data[COMPLETION_VERSION_OFFSET + 2],
            course_data[COMPLETION_VERSION_OFFSET + 3],
        ]);

        Ok(SingularPtrField::some(SMM2CourseHeader {
            modified,
            title,
            description,
            game_style,
            start_y,
            finish_y,
            finish_x,
            time,
            clear_condition_type,
            clear_condition,
            clear_condition_amount,
            clear_check_tries,
            clear_check_time,
            game_version,
            management_flags,
            creation_id,
            upload_id,
            completion_version,
            ..SMM2CourseHeader::default()
        }))
    }

    fn get_course_area(
        course_data: &[u8],
        const_index: usize,
    ) -> Result<SingularPtrField<SMM2CourseArea>, Error> {
        let course_theme = SMM2CourseArea_CourseTheme::from_i32(
            course_data[COURSE_THEME_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2ConvertError::CourseThemeParse)?;
        let auto_scroll = SMM2CourseArea_AutoScroll::from_i32(
            course_data[AUTO_SCROLL_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2ConvertError::AutoScrollParse)?;
        let screen_boundary = SMM2CourseArea_ScreenBoundary::from_i32(
            course_data[SCREEN_BOUNDARY_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2ConvertError::ScreenBoundaryParse)?;
        let orientation = SMM2CourseArea_Orientation::from_i32(
            course_data[ORIENTATION_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2ConvertError::OrientationParse)?;
        let liquid_max = course_data[LIQUID_MAX_OFFSET[const_index]] as u32;
        let liquid_mode = SMM2CourseArea_LiquidMode::from_i32(
            course_data[LIQUID_MODE_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2ConvertError::WaterModeParse)?;
        let liquid_speed = SMM2CourseArea_LiquidSpeed::from_i32(
            course_data[LIQUID_SPEED_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2ConvertError::WaterSpeedParse)?;
        let liquid_min = course_data[LIQUID_MIN_OFFSET[const_index]] as u32;
        let right_boundary = u32::from_le_bytes([
            course_data[RIGHT_BOUNDARY_OFFSET[const_index]],
            course_data[RIGHT_BOUNDARY_OFFSET[const_index] + 1],
            course_data[RIGHT_BOUNDARY_OFFSET[const_index] + 2],
            course_data[RIGHT_BOUNDARY_OFFSET[const_index] + 3],
        ]);
        let top_boundary = u32::from_le_bytes([
            course_data[TOP_BOUNDARY_OFFSET[const_index]],
            course_data[TOP_BOUNDARY_OFFSET[const_index] + 1],
            course_data[TOP_BOUNDARY_OFFSET[const_index] + 2],
            course_data[TOP_BOUNDARY_OFFSET[const_index] + 3],
        ]);
        let left_boundary = u32::from_le_bytes([
            course_data[LEFT_BOUNDARY_OFFSET[const_index]],
            course_data[LEFT_BOUNDARY_OFFSET[const_index] + 1],
            course_data[LEFT_BOUNDARY_OFFSET[const_index] + 2],
            course_data[LEFT_BOUNDARY_OFFSET[const_index] + 3],
        ]);
        let bottom_boundary = u32::from_le_bytes([
            course_data[BOTTOM_BOUNDARY_OFFSET[const_index]],
            course_data[BOTTOM_BOUNDARY_OFFSET[const_index] + 1],
            course_data[BOTTOM_BOUNDARY_OFFSET[const_index] + 2],
            course_data[BOTTOM_BOUNDARY_OFFSET[const_index] + 3],
        ]);
        let day_time =
            SMM2CourseArea_DayTime::from_i32(course_data[DAY_TIME_OFFSET[const_index]] as i32)
                .ok_or(Course2ConvertError::DayTimeParse)?;
        let object_count = u32::from_le_bytes([
            course_data[OBJECT_COUNT_OFFSET[const_index]],
            course_data[OBJECT_COUNT_OFFSET[const_index] + 1],
            course_data[OBJECT_COUNT_OFFSET[const_index] + 2],
            course_data[OBJECT_COUNT_OFFSET[const_index] + 3],
        ]);
        let sound_effect_count = u32::from_le_bytes([
            course_data[SOUND_EFFECT_COUNT_OFFSET[const_index]],
            course_data[SOUND_EFFECT_COUNT_OFFSET[const_index] + 1],
            course_data[SOUND_EFFECT_COUNT_OFFSET[const_index] + 2],
            course_data[SOUND_EFFECT_COUNT_OFFSET[const_index] + 3],
        ]);
        let snake_block_count = u32::from_le_bytes([
            course_data[SNAKE_BLOCK_COUNT_OFFSET[const_index]],
            course_data[SNAKE_BLOCK_COUNT_OFFSET[const_index] + 1],
            course_data[SNAKE_BLOCK_COUNT_OFFSET[const_index] + 2],
            course_data[SNAKE_BLOCK_COUNT_OFFSET[const_index] + 3],
        ]);
        let clear_pipe_count = u32::from_le_bytes([
            course_data[CLEAR_PIPE_COUNT_OFFSET[const_index]],
            course_data[CLEAR_PIPE_COUNT_OFFSET[const_index] + 1],
            course_data[CLEAR_PIPE_COUNT_OFFSET[const_index] + 2],
            course_data[CLEAR_PIPE_COUNT_OFFSET[const_index] + 3],
        ]);
        let piranha_creeper_count = u32::from_le_bytes([
            course_data[PIRANHA_CREEPER_COUNT_OFFSET[const_index]],
            course_data[PIRANHA_CREEPER_COUNT_OFFSET[const_index] + 1],
            course_data[PIRANHA_CREEPER_COUNT_OFFSET[const_index] + 2],
            course_data[PIRANHA_CREEPER_COUNT_OFFSET[const_index] + 3],
        ]);
        let exclamation_block_count = u32::from_le_bytes([
            course_data[EXCLAMATION_BLOCK_COUNT_OFFSET[const_index]],
            course_data[EXCLAMATION_BLOCK_COUNT_OFFSET[const_index] + 1],
            course_data[EXCLAMATION_BLOCK_COUNT_OFFSET[const_index] + 2],
            course_data[EXCLAMATION_BLOCK_COUNT_OFFSET[const_index] + 3],
        ]);
        let track_block_count = u32::from_le_bytes([
            course_data[TRACK_BLOCK_COUNT_OFFSET[const_index]],
            course_data[TRACK_BLOCK_COUNT_OFFSET[const_index] + 1],
            course_data[TRACK_BLOCK_COUNT_OFFSET[const_index] + 2],
            course_data[TRACK_BLOCK_COUNT_OFFSET[const_index] + 3],
        ]);
        let tile_count = u32::from_le_bytes([
            course_data[TILE_COUNT_OFFSET[const_index]],
            course_data[TILE_COUNT_OFFSET[const_index] + 1],
            course_data[TILE_COUNT_OFFSET[const_index] + 2],
            course_data[TILE_COUNT_OFFSET[const_index] + 3],
        ]);
        let track_count = u32::from_le_bytes([
            course_data[TRACK_COUNT_OFFSET[const_index]],
            course_data[TRACK_COUNT_OFFSET[const_index] + 1],
            course_data[TRACK_COUNT_OFFSET[const_index] + 2],
            course_data[TRACK_COUNT_OFFSET[const_index] + 3],
        ]);
        let icicle_count = u32::from_le_bytes([
            course_data[ICICLE_COUNT_OFFSET[const_index]],
            course_data[ICICLE_COUNT_OFFSET[const_index] + 1],
            course_data[ICICLE_COUNT_OFFSET[const_index] + 2],
            course_data[ICICLE_COUNT_OFFSET[const_index] + 3],
        ]);

        Ok(SingularPtrField::some(SMM2CourseArea {
            course_theme,
            auto_scroll,
            screen_boundary,
            orientation,
            liquid_max,
            liquid_mode,
            liquid_speed,
            liquid_min,
            right_boundary,
            top_boundary,
            left_boundary,
            bottom_boundary,
            day_time,
            object_count,
            sound_effect_count,
            snake_block_count,
            clear_pipe_count,
            piranha_creeper_count,
            exclamation_block_count,
            track_block_count,
            tile_count,
            track_count,
            icicle_count,
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
            .iter()
            .cloned()
            .tuples()
            .map(|(hi, lo)| u16::from_le_bytes([hi, lo]))
            .filter(|e| *e != 0)
            .collect();
        String::from_utf16(&res).expect("[Course::get_utf16_string_from_slice] from_utf16 failed")
    }

    fn get_game_style_from_str(s: String) -> Result<SMM2CourseHeader_GameStyle, Error> {
        match s.as_ref() {
            "M1" => Ok(SMM2CourseHeader_GameStyle::M1),
            "M3" => Ok(SMM2CourseHeader_GameStyle::M3),
            "MW" => Ok(SMM2CourseHeader_GameStyle::MW),
            "WU" => Ok(SMM2CourseHeader_GameStyle::WU),
            "3W" => Ok(SMM2CourseHeader_GameStyle::W3),
            _ => Err(Course2ConvertError::GameStyleParse.into()),
        }
    }
}

impl TryFrom<Vec<u8>> for Course2 {
    type Error = Error;

    fn try_from(data: Vec<u8>) -> Result<Course2, Self::Error> {
        Course2::from_packed(&data[..])?
            .pop()
            .ok_or_else(|| Error::Course2ConvertError(Course2ConvertError::ConvertFromBuffer))
    }
}
