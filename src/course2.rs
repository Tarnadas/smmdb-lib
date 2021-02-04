//! Super Mario Maker 2 file manipulation.

#![allow(clippy::cast_lossless)]

#[cfg(target_arch = "wasm32")]
use crate::JsResult;
use crate::{
    constants2::*,
    decrypt, encrypt,
    errors::{Course2Error, Course2Result},
    fix_crc32,
    key_tables::*,
    proto::SMM2Course::{
        SMM2Course, SMM2CourseArea, SMM2CourseArea_AutoScroll, SMM2CourseArea_CourseTheme,
        SMM2CourseArea_DayTime, SMM2CourseArea_LiquidMode, SMM2CourseArea_LiquidSpeed,
        SMM2CourseArea_Orientation, SMM2CourseArea_ScreenBoundary, SMM2CourseHeader,
        SMM2CourseHeader_ClearConditionType, SMM2CourseHeader_GameStyle,
    },
    Error, Result, Thumbnail2,
};

#[cfg(not(target_arch = "wasm32"))]
use brotli2::read::BrotliDecoder;
use chrono::naive::{NaiveDate, NaiveDateTime, NaiveTime};
use infer::{Infer, Type};
use itertools::Itertools;
use protobuf::{Message, ProtobufEnum, SingularPtrField};
use regex::Regex;
use std::{
    convert::TryFrom,
    io::{Cursor, Read},
};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
use zip::ZipArchive;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[cfg_attr(feature = "with-serde", derive(Serialize))]
#[derive(Clone, Debug, PartialEq)]
pub struct Course2 {
    course: SMM2Course,
    data: Vec<u8>,
    thumb: Option<Thumbnail2>,
}

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

    /// Returns decrypted course data.
    pub fn get_course_data(&self) -> &Vec<u8> {
        &self.data
    }

    /// Returns mutable decrypted course data.
    pub fn get_course_data_mut(&mut self) -> &mut Vec<u8> {
        &mut self.data
    }

    pub fn get_course_thumb(&self) -> Option<&Thumbnail2> {
        self.thumb.as_ref()
    }

    pub fn get_course_thumb_mut(&mut self) -> Option<&mut Thumbnail2> {
        self.thumb.as_mut()
    }

    /// Set the description of this course.
    ///
    /// This might fail, if the given description is longer than 75 characters.
    pub fn set_description(&mut self, description: String) -> Result<()> {
        if description.len() > 75 {
            return Err(Error::Course2Error(Course2Error::StringTooLong(
                description.len(),
            )));
        }
        let mut course_header = self.get_course().get_header().clone();
        course_header.set_description(description.clone());
        let mut description: Vec<u8> = description
            .encode_utf16()
            .map(|byte| byte.to_le_bytes())
            .fold(vec![], |mut acc, cur| {
                for byte in cur.iter() {
                    acc.push(*byte);
                }
                acc
            });
        (description.len()..150).for_each(|_| description.push(0));
        self.data
            .splice(DESCRIPTION_OFFSET..DESCRIPTION_OFFSET_END, description);
        self.get_course_mut().set_header(course_header);
        Ok(())
    }

    /// Set SMMDB ID of this course.
    ///
    /// This must be a 12 byte hex string from MongoDB.
    pub fn set_smmdb_id(&mut self, smmdb_id: String) -> Result<()> {
        let smmdb_id = hex::decode(smmdb_id)?;
        self.data.splice(SMMDB_OFFSET..SMMDB_OFFSET_END, smmdb_id);
        Ok(())
    }

    /// Get SMMDB ID of this course.
    /// If ID could not be found, this returns a `None`
    pub fn get_smmdb_id(&self) -> Option<String> {
        let smmdb_id = hex::encode(self.data[SMMDB_OFFSET..SMMDB_OFFSET_END].to_vec());
        if smmdb_id == "000000000000000000000000" {
            None
        } else {
            Some(smmdb_id)
        }
    }

    /// Reset everything related to clear checks that the game saved.
    /// Afterwards the course can no longer be uploaded.
    pub fn reset_clear_check(&mut self) {
        let management_flags_lower_byte: u8 = {
            let header = self.get_course_mut().mut_header();

            let mut management_flags = header.get_management_flags();
            management_flags -= 2;
            header.set_management_flags(management_flags);

            header.set_clear_check_tries(0);
            header.set_clear_check_time(4294967295);

            (management_flags & 0xff) as u8
        };

        self.data[MANAGEMENT_FLAGS_OFFSET] = management_flags_lower_byte;
        self.data.splice(
            CLEAR_CHECK_TRIES_OFFSET..CLEAR_CHECK_TRIES_OFFSET + 4,
            vec![0, 0, 0, 0],
        );
        self.data.splice(
            CLEAR_CHECK_TIME_OFFSET..CLEAR_CHECK_TIME_OFFSET + 4,
            vec![0xff, 0xff, 0xff, 0xff],
        );
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn encrypt(course: &mut Vec<u8>) {
        Course2::encrypt_vec(course);
    }

    fn encrypt_vec(course: &mut Vec<u8>) {
        let preserved_aes = course.len() == 0x5c000;
        let len = 0x5bfd0;
        fix_crc32(&mut course[..len]);
        let aes_info = encrypt(&mut course[0x10..len], &COURSE_KEY_TABLE);
        if preserved_aes {
            for (index, byte) in aes_info.iter().enumerate() {
                course[len + index] = *byte;
            }
        } else {
            course.extend_from_slice(&aes_info);
        }
    }
    #[cfg(not(target_arch = "wasm32"))]
    pub fn from_proto(buffer: &[u8], thumb: Option<Vec<u8>>) -> Course2 {
        let course: SMM2Course = Message::parse_from_bytes(buffer).unwrap();
        Course2 {
            course,
            data: vec![], // TODO
            thumb: thumb.map(|thumb| Thumbnail2::new(thumb)),
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn from_boxed_proto(buffer: Box<[u8]>, thumb: Option<Box<[u8]>>) -> Course2 {
        let course: SMM2Course = Message::parse_from_bytes(buffer.to_vec().as_slice()).unwrap();
        Course2 {
            course,
            data: vec![], // TODO
            thumb: thumb.map(|thumb| Thumbnail2::new(thumb.to_vec())),
        }
    }

    pub fn from_packed(buffer: &[u8]) -> Result<Vec<Course2>> {
        let mut res = vec![];

        let mime_guess: Type = Infer::new().get(buffer).unwrap();

        match mime_guess.mime_type() {
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

    #[cfg(not(target_arch = "wasm32"))]
    pub fn from_switch_files(
        data: &mut [u8],
        thumb: Option<Vec<u8>>,
        is_encrypted: bool,
    ) -> Course2Result<Course2> {
        Self::_from_switch_files(data, thumb, is_encrypted)
    }
}

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl Course2 {
    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen(js_name = fromProto)]
    pub fn from_proto(buffer: &[u8], thumb: Option<Box<[u8]>>) -> Course2 {
        let course: SMM2Course = Message::parse_from_bytes(buffer).unwrap();
        Course2 {
            course,
            data: vec![], // TODO
            thumb: thumb.map(|thumb| Thumbnail2::new(&thumb)),
        }
    }

    #[cfg(target_arch = "wasm32")]
    #[cfg(feature = "with-serde")]
    #[wasm_bindgen(js_name = fromObject)]
    pub fn from_js_object(course: JsValue, thumb: Option<Box<[u8]>>) -> Course2 {
        let course: SMM2Course = course.into_serde().expect("Course serialization failed");
        Course2 {
            course,
            data: vec![], // TODO
            thumb: thumb.map(|thumb| Thumbnail2::new(&thumb)),
        }
    }

    #[cfg(target_arch = "wasm32")]
    #[cfg(feature = "with-serde")]
    #[wasm_bindgen(js_name = fromBytes)]
    pub fn from_packed_js(buffer: &[u8]) -> JsResult<Box<[JsValue]>> {
        let courses: Vec<JsValue> = Course2::from_packed(buffer)?
            .iter()
            .map(|course| course.get_js_object())
            .collect();
        Ok(courses.into_boxed_slice())
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen(js_name = getProto))]
    pub fn get_proto(&self) -> Box<[u8]> {
        let mut out: Vec<u8> = vec![];
        self.course
            .write_to_vec(&mut out)
            .expect("Writing to Vector failed");
        out.into_boxed_slice()
    }

    // TODO remove this once the protobuf library has support for wasm-bindgen
    #[cfg(target_arch = "wasm32")]
    #[cfg(feature = "with-serde")]
    fn get_js_object(&self) -> JsValue {
        JsValue::from_serde(&self).unwrap()
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn decrypt(course: &mut [u8]) {
        decrypt(&mut course[0x10..], &COURSE_KEY_TABLE);
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen]
    pub fn encrypt(course: &[u8]) -> Box<[u8]> {
        let mut course = course.to_vec();
        Course2::encrypt_vec(&mut course);
        course.into_boxed_slice()
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen]
    pub fn from_switch_files(
        data: &mut [u8],
        thumb: Option<Box<[u8]>>,
        is_encrypted: bool,
    ) -> JsResult<Course2> {
        Self::_from_switch_files(data, thumb.map(|t| t.to_vec()), is_encrypted)
            .map_err(|err| err.into())
    }
}

impl Course2 {
    fn decompress_zip(res: &mut Vec<Course2>, buffer: &[u8]) -> Result<()> {
        let reader = Cursor::new(buffer);
        let mut zip = ZipArchive::new(reader)?;

        let courses = Course2::get_course_files_from_zip_archive(&mut zip);

        for (course, thumb) in courses {
            let mut course_data = Course2::read_file_from_zip_archive(&mut zip, course)?;
            let course_thumb = Course2::read_file_from_zip_archive(&mut zip, thumb)?;

            if let Ok(course) =
                Course2::_from_switch_files(&mut course_data, Some(course_thumb), true)
            {
                res.push(course);
            };
        }

        Ok(())
    }

    fn get_course_files_from_zip_archive(
        zip: &mut ZipArchive<Cursor<&[u8]>>,
    ) -> Vec<(String, String)> {
        let mut course_files: Vec<(String, String)> = vec![];
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
                            course_files.push((file_name, thumb));
                        }
                    }
                }
            };
        }
        course_files
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
    ) -> Result<Vec<u8>> {
        let mut zip_file = zip.by_name(&name)?;
        let mut zip_file_data = vec![0; zip_file.size() as usize];
        zip_file.read_exact(&mut zip_file_data)?;

        Ok(zip_file_data)
    }

    fn decompress_x_tar(res: &mut Vec<Course2>, buffer: &[u8]) -> Result<()> {
        let reader = Cursor::new(buffer);
        let tar = tar::Archive::new(reader);

        let courses = Course2::get_course_files_from_tar_archive(tar);

        for (mut course, thumb) in courses {
            if let Ok(course) = Course2::_from_switch_files(&mut course, Some(thumb), true) {
                res.push(course);
            };
        }

        Ok(())
    }

    fn get_course_files_from_tar_archive(
        mut tar: tar::Archive<Cursor<&[u8]>>,
    ) -> Vec<(Vec<u8>, Vec<u8>)> {
        let mut course_files = vec![];
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
                        course_files.push((data, index.as_str().to_string()));
                    }
                    #[cfg(not(target_arch = "wasm32"))]
                    continue;
                }
                #[cfg(not(target_arch = "wasm32"))]
                {
                    let re_br_data: Regex = Regex::new(r".*course_data_(\d{3})\.br$").unwrap();
                    if re_br_data.is_match(&file_name) {
                        let captures = re_br_data.captures(&file_name).unwrap();
                        let index = captures.get(1);
                        if let Some(index) = index {
                            let mut data = vec![];
                            file.read_to_end(&mut data).unwrap();
                            let mut course = vec![];
                            let mut decoder = BrotliDecoder::new(Cursor::new(data));
                            decoder.read_to_end(&mut course).unwrap();
                            Course2::encrypt(&mut course);
                            course_files.push((course, index.as_str().to_string()));
                        }
                    }
                }
            };
        }
        let mut files = vec![];
        for (data, index) in course_files {
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

    fn _from_switch_files(
        data: &mut [u8],
        thumb: Option<Vec<u8>>,
        is_encrypted: bool,
    ) -> Course2Result<Course2> {
        if is_encrypted {
            Course2::decrypt(data)
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
            data: data.to_vec(),
            #[cfg(target_arch = "wasm32")]
            thumb: thumb.as_deref().map(if is_encrypted {
                Thumbnail2::new
            } else {
                Thumbnail2::from_decrypted
            }),
            #[cfg(not(target_arch = "wasm32"))]
            thumb: thumb.map(if is_encrypted {
                Thumbnail2::new
            } else {
                Thumbnail2::from_decrypted
            }),
        })
    }

    fn get_course_header(course_data: &[u8]) -> Course2Result<SingularPtrField<SMM2CourseHeader>> {
        let modified = Course2::get_modified(course_data)?;
        let title =
            Course2::get_utf16_string_from_slice(&course_data[TITLE_OFFSET..TITLE_OFFSET_END]);
        let description = Course2::get_utf16_string_from_slice(
            &course_data[DESCRIPTION_OFFSET..DESCRIPTION_OFFSET_END],
        );
        let game_style = Course2::get_game_style_from_str(
            String::from_utf8(course_data[GAME_STYLE_OFFSET..GAME_STYLE_OFFSET_END].to_vec())
                .map_err(|_| Course2Error::GameStyleParse)?,
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
        .ok_or(Course2Error::ClearConditionTypeParse)?;
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
    ) -> Course2Result<SingularPtrField<SMM2CourseArea>> {
        let course_theme = SMM2CourseArea_CourseTheme::from_i32(
            course_data[COURSE_THEME_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2Error::CourseThemeParse)?;
        let auto_scroll = SMM2CourseArea_AutoScroll::from_i32(
            course_data[AUTO_SCROLL_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2Error::AutoScrollParse)?;
        let screen_boundary = SMM2CourseArea_ScreenBoundary::from_i32(
            course_data[SCREEN_BOUNDARY_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2Error::ScreenBoundaryParse)?;
        let orientation = SMM2CourseArea_Orientation::from_i32(
            course_data[ORIENTATION_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2Error::OrientationParse)?;
        let liquid_max = course_data[LIQUID_MAX_OFFSET[const_index]] as u32;
        let liquid_mode = SMM2CourseArea_LiquidMode::from_i32(
            course_data[LIQUID_MODE_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2Error::WaterModeParse)?;
        let liquid_speed = SMM2CourseArea_LiquidSpeed::from_i32(
            course_data[LIQUID_SPEED_OFFSET[const_index]] as i32,
        )
        .ok_or(Course2Error::WaterSpeedParse)?;
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
                .ok_or(Course2Error::DayTimeParse)?;
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

    fn get_modified(course_data: &[u8]) -> Course2Result<u64> {
        let year = u16::from_le_bytes([course_data[YEAR_OFFSET], course_data[YEAR_OFFSET + 1]]);
        let month = course_data[MONTH_OFFSET];
        let day = course_data[DAY_OFFSET];
        let hour = course_data[HOUR_OFFSET];
        let minute = course_data[MINUTE_OFFSET];
        let time = NaiveDateTime::new(
            NaiveDate::from_ymd_opt(year as i32, month as u32, day as u32).ok_or_else(|| {
                Course2Error::InvalidDate {
                    year,
                    month,
                    day,
                    hour,
                    minute,
                }
            })?,
            NaiveTime::from_hms_opt(hour as u32, minute as u32, 0).ok_or_else(|| {
                Course2Error::InvalidDate {
                    year,
                    month,
                    day,
                    hour,
                    minute,
                }
            })?,
        );
        Ok(time.timestamp() as u64)
    }

    fn get_utf16_string_from_slice(bytes: &[u8]) -> String {
        let res: Vec<u16> = bytes
            .iter()
            .cloned()
            .tuples()
            .map(|(hi, lo)| u16::from_le_bytes([hi, lo]))
            .take_while(|e| *e != 0)
            .collect();
        String::from_utf16(&res).expect("[Course::get_utf16_string_from_slice] from_utf16 failed")
    }

    fn get_game_style_from_str(s: String) -> Course2Result<SMM2CourseHeader_GameStyle> {
        match s.as_ref() {
            "M1" => Ok(SMM2CourseHeader_GameStyle::M1),
            "M3" => Ok(SMM2CourseHeader_GameStyle::M3),
            "MW" => Ok(SMM2CourseHeader_GameStyle::MW),
            "WU" => Ok(SMM2CourseHeader_GameStyle::WU),
            "3W" => Ok(SMM2CourseHeader_GameStyle::W3),
            _ => Err(Course2Error::GameStyleParse.into()),
        }
    }
}

impl TryFrom<Vec<u8>> for Course2 {
    type Error = Error;

    fn try_from(data: Vec<u8>) -> Result<Course2> {
        Course2::from_packed(&data[..])?
            .pop()
            .ok_or_else(|| Error::Course2Error(Course2Error::ConvertFromBuffer))
    }
}
