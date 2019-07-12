use crate::constants::*;
use crate::proto::SMMCourse::{
    SMMCourse, SMMCourse_AutoScroll, SMMCourse_CourseTheme, SMMCourse_GameStyle,
};
use crate::proto::Sound::Sound;
use crate::proto::Tile::Tile;

use bytes::Bytes;
use itertools::Itertools;
use protobuf::{parse_from_bytes, Message, ProtobufEnum, RepeatedField};
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
}

impl Course {
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
                .map_err(|_| CourseConvertError::GameStyleParseError)?,
        )?;
        let course_theme = SMMCourse_CourseTheme::from_i32(course_data[COURSE_THEME_OFFSET] as i32)
            .ok_or(CourseConvertError::CourseThemeParseError)?;
        let course_theme_sub =
            SMMCourse_CourseTheme::from_i32(course_data_sub[COURSE_THEME_OFFSET] as i32)
                .ok_or(CourseConvertError::CourseThemeParseError)?;
        let time =
            u16::from_be_bytes([course_data[TIME_OFFSET], course_data[TIME_OFFSET + 1]]) as u32;
        let auto_scroll = SMMCourse_AutoScroll::from_i32(course_data[AUTO_SCROLL_OFFSET] as i32)
            .ok_or(CourseConvertError::AutoScrollParseError)?;
        let auto_scroll_sub =
            SMMCourse_AutoScroll::from_i32(course_data_sub[AUTO_SCROLL_OFFSET] as i32)
                .ok_or(CourseConvertError::AutoScrollParseError)?;
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
        Ok(Course {
            course: SMMCourse {
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
                ..SMMCourse::default()
            },
        })
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
            _ => Err(CourseConvertError::GameStyleParseError),
        }
    }

    fn get_tiles(slice: &[u8]) -> RepeatedField<Tile> {
        let mut tiles: Vec<Tile> = vec![];
        for offset in
            (TILES_OFFSET..TILES_OFFSET + TILE_AMOUNT_OFFSET * TILE_SIZE).step_by(TILE_SIZE)
        {
            let mut tile = Tile::new();
            let tile_data = &slice[offset..offset + TILE_SIZE];
            tile.set_tile_data(Bytes::from(tile_data));
            tiles.push(tile);
        }
        RepeatedField::from_vec(tiles)
    }

    fn get_sounds(slice: &[u8]) -> Result<RepeatedField<Sound>, CourseConvertError> {
        let mut sounds: Vec<Sound> = vec![];
        for offset in (SOUND_OFFSET..SOUND_OFFSET_END).step_by(SOUND_SIZE) {
            let sound_data = &slice[offset..offset + SOUND_SIZE];
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
}

#[derive(Debug)]
pub enum CourseConvertError {
    GameStyleParseError,
    CourseThemeParseError,
    AutoScrollParseError,
    SoundTypeConvertError,
}
