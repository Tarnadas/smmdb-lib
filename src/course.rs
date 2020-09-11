//! Super Mario Maker file manipulation.

#![allow(clippy::cast_lossless)]
use crate::proto::SMMCourse::{
    SMMCourse, SMMCourse_AutoScroll, SMMCourse_CourseTheme, SMMCourse_GameStyle,
};
use crate::proto::Sound::Sound;
use crate::proto::Tile::Tile;
use crate::{constants::*, errors::CourseConvertError, Error};

use bytes::Bytes;
use chrono::naive::{NaiveDate, NaiveDateTime, NaiveTime};
use infer::{Infer, Type};
use itertools::Itertools;
use protobuf::{parse_from_bytes, Message, ProtobufEnum, RepeatedField};
use regex::Regex;
use std::io::{Cursor, Read};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;
use zip::{result::ZipError, ZipArchive};

/// Super Mario Maker course file.
///
/// This struct is a wrapper to hold a [SMMCourse](crate::proto::SMMCourse) struct which can be serialized via Protocol Buffer.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Debug, PartialEq)]
pub struct Course {
    course: SMMCourse,
}

/// WebAssembly compatible functions.
#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl Course {
    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn from_proto(buffer: &[u8]) -> Course {
        let course: SMMCourse = parse_from_bytes(buffer).unwrap();
        Course { course }
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn from_boxed_proto(buffer: Box<[u8]>) -> Course {
        let course: SMMCourse = parse_from_bytes(buffer.to_vec().as_slice()).unwrap();
        Course { course }
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen]
    pub fn from_js(course: JsValue) -> Course {
        let course: SMMCourse = course.into_serde().expect("Course serialization failed");
        Course { course }
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen]
    pub fn from_packed_js(buffer: &[u8]) -> Result<Box<[JsValue]>, JsValue> {
        let courses: Vec<JsValue> = Course::from_packed(buffer)?
            .iter()
            .map(|course| course.into_js())
            .collect();
        Ok(courses.into_boxed_slice())
    }

    #[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
    pub fn into_proto(&self) -> Box<[u8]> {
        let mut out: Vec<u8> = vec![];
        self.course
            .write_to_vec(&mut out)
            .expect("Writing to Vector failed");
        out.into_boxed_slice()
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen]
    pub fn into_js(&self) -> JsValue {
        JsValue::from_serde(&self.course).unwrap()
    }
}

/// Functions which aren't compatible with WebAssembly.
impl Course {
    /// Get a reference to the inner course struct.
    pub fn get_course(&self) -> &SMMCourse {
        &self.course
    }

    /// Get a mutable reference to the inner course struct.
    pub fn get_course_mut(&mut self) -> &mut SMMCourse {
        &mut self.course
    }

    /// Consumes and takes inner course struct.
    pub fn take_course(self) -> SMMCourse {
        self.course
    }

    /// Sets the "last modified" timestamp as Unix timestamp.
    pub fn set_modified(&mut self, modified: u64) {
        self.course.set_modified(modified);
    }

    /// Set tiles.
    pub fn set_tiles(&mut self, tiles: Vec<Tile>) {
        self.course.tiles = tiles.into();
    }

    /// Set thumbnail.
    pub fn set_thumbnail(&mut self, thumbnail: Bytes) {
        self.course.set_thumbnail(thumbnail);
    }

    /// Set thumbnail preview image.
    pub fn set_thumbnail_preview(&mut self, thumbnail: Bytes) {
        self.course.set_thumbnail_preview(thumbnail);
    }

    pub fn from_packed(buffer: &[u8]) -> Result<Vec<Course>, Error> {
        let mut res = vec![];

        let mime_guess: Type = Infer::new().get(buffer).unwrap();

        match mime_guess.mime.as_ref() {
            "application/zip" => {
                Course::decompress_zip(&mut res, buffer)?;
            }
            mime => {
                return Err(Error::MimeTypeUnsupported(mime.to_string()));
            }
        };

        Ok(res)
    }

    pub fn from_wii_u_files(
        course_data: &[u8],
        course_data_sub: &[u8],
        thumbnail: &[u8],
        thumbnail_preview: &[u8],
    ) -> Result<Course, Error> {
        let modified = Course::get_modified(course_data);
        let title =
            Course::get_utf16_string_from_slice(&course_data[TITLE_OFFSET..TITLE_OFFSET_END]);
        let maker =
            Course::get_utf16_string_from_slice(&course_data[MAKER_OFFSET..MAKER_OFFSET_END]);
        let game_style = Course::get_game_style_from_str(
            String::from_utf8(course_data[GAME_STYLE_OFFSET..GAME_STYLE_OFFSET_END].to_vec())
                .map_err(|_| CourseConvertError::GameStyleParse)?,
        )?;
        let course_theme = SMMCourse_CourseTheme::from_i32(course_data[COURSE_THEME_OFFSET] as i32)
            .ok_or(CourseConvertError::CourseThemeParse)?;
        let course_theme_sub =
            SMMCourse_CourseTheme::from_i32(course_data_sub[COURSE_THEME_OFFSET] as i32)
                .ok_or(CourseConvertError::CourseThemeParse)?;
        let time =
            u16::from_be_bytes([course_data[TIME_OFFSET], course_data[TIME_OFFSET + 1]]) as u32;
        let auto_scroll = SMMCourse_AutoScroll::from_i32(course_data[AUTO_SCROLL_OFFSET] as i32)
            .ok_or(CourseConvertError::AutoScrollParse)?;
        let auto_scroll_sub =
            SMMCourse_AutoScroll::from_i32(course_data_sub[AUTO_SCROLL_OFFSET] as i32)
                .ok_or(CourseConvertError::AutoScrollParse)?;
        let width =
            u16::from_be_bytes([course_data[WIDTH_OFFSET], course_data[WIDTH_OFFSET + 1]]) as u32;
        let width_sub = u16::from_be_bytes([
            course_data_sub[WIDTH_OFFSET],
            course_data_sub[WIDTH_OFFSET + 1],
        ]) as u32;
        let tiles = Course::get_tiles(&course_data);
        let tiles_sub = Course::get_tiles(&course_data_sub);
        let sounds = Course::get_sounds(&course_data)?;
        let sounds_sub = Course::get_sounds(&course_data_sub)?;
        let thumbnail = Course::get_thumbnail(&thumbnail);
        let thumbnail_preview = Course::get_thumbnail(&thumbnail_preview);
        Ok(Course {
            course: SMMCourse {
                modified,
                title,
                maker,
                game_style,
                course_theme,
                course_theme_sub,
                time,
                auto_scroll,
                auto_scroll_sub,
                width,
                width_sub,
                tiles,
                tiles_sub,
                sounds,
                sounds_sub,
                thumbnail,
                thumbnail_preview,
                ..SMMCourse::default()
            },
        })
    }

    fn get_modified(course_data: &[u8]) -> u64 {
        let year = u16::from_be_bytes([course_data[YEAR_OFFSET], course_data[YEAR_OFFSET + 1]]);
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

    fn get_game_style_from_str(s: String) -> Result<SMMCourse_GameStyle, CourseConvertError> {
        match s.as_ref() {
            "M1" => Ok(SMMCourse_GameStyle::M1),
            "M3" => Ok(SMMCourse_GameStyle::M3),
            "MW" => Ok(SMMCourse_GameStyle::MW),
            "WU" => Ok(SMMCourse_GameStyle::WU),
            _ => Err(CourseConvertError::GameStyleParse),
        }
    }

    fn get_tiles(slice: &[u8]) -> RepeatedField<Tile> {
        let mut tiles: Vec<Tile> = vec![];
        let tile_amount =
            u16::from_be_bytes([slice[TILE_AMOUNT_OFFSET], slice[TILE_AMOUNT_OFFSET + 1]]) as usize;
        for offset in (TILES_OFFSET..TILES_OFFSET + tile_amount * TILE_SIZE).step_by(TILE_SIZE) {
            let mut tile = Tile::new();
            let tile_data = &slice[offset..offset + TILE_SIZE];
            tile.set_tile_data(Bytes::copy_from_slice(tile_data));
            tiles.push(tile);
        }
        RepeatedField::from_vec(tiles)
    }

    fn get_sounds(slice: &[u8]) -> Result<RepeatedField<Sound>, CourseConvertError> {
        let mut sounds: Vec<Sound> = vec![];
        for offset in (SOUND_OFFSET..SOUND_OFFSET_END).step_by(SOUND_SIZE) {
            let sound_data = &slice[offset..offset + SOUND_SIZE];
            if sound_data == SOUND_DEFAULT {
                continue;
            }
            let x = sound_data[SOUND_X_OFFSET] as u32;
            let y = sound_data[SOUND_Y_OFFSET] as u32;
            let sound_type = sound_data[SOUND_TYPE_OFFSET] as u32;
            let variation = sound_data[SOUND_VARIATION_OFFSET] != 0;
            let sound = Sound {
                x,
                y,
                sound_type,
                variation,
                ..Sound::default()
            };
            sounds.push(sound);
        }
        Ok(RepeatedField::from_vec(sounds))
    }

    fn get_thumbnail(slice: &[u8]) -> Bytes {
        let length = u32::from_be_bytes([slice[4], slice[5], slice[6], slice[7]]) as usize;
        Bytes::copy_from_slice(&slice[8..8 + length])
    }

    fn decompress_zip(res: &mut Vec<Course>, buffer: &[u8]) -> Result<(), ZipError> {
        let reader = Cursor::new(buffer);
        let mut zip = zip::ZipArchive::new(reader)?;

        let mut courses = vec![];
        for i in 0..zip.len() {
            if let Ok(file) = zip.by_index(i) {
                let re: Regex = Regex::new(r"course\d{3}/$").unwrap();
                if re.is_match(file.name()) {
                    courses.push(file.name().to_owned());
                }
            };
        }
        for course in courses {
            let course_assets = Course::get_course_assets(&mut zip, course)?;
            if let Ok(course) = Course::from_wii_u_files(
                &course_assets.course_data[..],
                &course_assets.course_data_sub[..],
                &course_assets.thumbnail_0[..],
                &course_assets.thumbnail_1[..],
            ) {
                res.push(course);
            };
        }

        Ok(())
    }

    fn get_course_assets(
        zip: &mut ZipArchive<Cursor<&[u8]>>,
        course: String,
    ) -> Result<CourseAssets, ZipError> {
        let mut course_data_file = zip.by_name(&format!("{}{}", course, COURSE_DATA_NAME))?;
        let mut course_data = vec![0; course_data_file.size() as usize];
        course_data_file.read_exact(&mut course_data)?;
        drop(course_data_file);

        let mut course_data_sub_file =
            zip.by_name(&format!("{}{}", course, COURSE_DATA_SUB_NAME))?;
        let mut course_data_sub = vec![0; course_data_sub_file.size() as usize];
        course_data_sub_file.read_exact(&mut course_data_sub)?;
        drop(course_data_sub_file);

        let mut thumbnail_0_file = zip.by_name(&format!("{}{}", course, THUMBNAIL_0_NAME))?;
        let mut thumbnail_0 = vec![0; thumbnail_0_file.size() as usize];
        thumbnail_0_file.read_exact(&mut thumbnail_0)?;
        drop(thumbnail_0_file);

        let mut thumbnail_1_file = zip.by_name(&format!("{}{}", course, THUMBNAIL_1_NAME))?;
        let mut thumbnail_1 = vec![0; thumbnail_1_file.size() as usize];
        thumbnail_1_file.read_exact(&mut thumbnail_1)?;
        drop(thumbnail_1_file);

        Ok(CourseAssets {
            course_data,
            course_data_sub,
            thumbnail_0,
            thumbnail_1,
        })
    }
}

struct CourseAssets {
    course_data: Vec<u8>,
    course_data_sub: Vec<u8>,
    thumbnail_0: Vec<u8>,
    thumbnail_1: Vec<u8>,
}
