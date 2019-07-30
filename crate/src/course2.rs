use crate::constants2::*;
use crate::proto::SMM2Course::{
    SMM2Course, SMM2CourseArea, SMM2CourseArea_AutoScroll, SMM2CourseArea_CourseTheme,
    SMM2CourseArea_WaterMode, SMM2CourseArea_WaterSpeed, SMM2CourseHeader,
    SMM2CourseHeader_GameStyle,
};

use aes::block_cipher_trait::generic_array::GenericArray;
use aes::Aes128;
use block_modes::{block_padding::*, BlockMode, Cbc};
use itertools::Itertools;
use protobuf::{parse_from_bytes, Message, ProtobufEnum, SingularPtrField};
use std::convert::TryInto;
use typenum::*;
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
    pub fn decrypt(mut course: Vec<u8>) -> Vec<u8> {
        let end_index = course.len() - 0x30;
        let end = &course[end_index..];
        let iv = GenericArray::from_slice(&end[0..16]);

        let mut rand_state = [0; 4];
        Course2::rand_init(
            &mut rand_state,
            u32::from_le_bytes(end[0x10..0x14].try_into().unwrap()),
            u32::from_le_bytes(end[0x14..0x18].try_into().unwrap()),
            u32::from_le_bytes(end[0x18..0x1C].try_into().unwrap()),
            u32::from_le_bytes(end[0x1C..0x20].try_into().unwrap()),
        );
        let key = Course2::gen_key(&mut rand_state);

        type Aes128Cbc = Cbc<Aes128, ZeroPadding>;
        let cipher = Aes128Cbc::new_fix(&key, &iv);
        cipher.decrypt(&mut course[0x10..end_index]).unwrap();

        course
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

    fn rand_init(rand_state: &mut [u32; 4], in0: u32, in1: u32, in2: u32, in3: u32) {
        let cond = (in0 | in1 | in2 | in3) != 0;
        rand_state[0] = if cond { in0 } else { 1 };
        rand_state[1] = if cond { in1 } else { 0x6C078967 };
        rand_state[2] = if cond { in2 } else { 0x714ACB41 };
        rand_state[3] = if cond { in3 } else { 0x48077044 };
    }

    fn gen_key(rand_state: &mut [u32; 4]) -> GenericArray<u8, U16> {
        let mut key = [0u32; 4];
        for i in 0..4 {
            for _j in 0..4 {
                key[i] <<= 8;
                key[i] |= (AES_KEY_TABLE[(Course2::rand_gen(rand_state) >> 26) as usize]
                    >> ((Course2::rand_gen(rand_state) >> 27) & 24))
                    & 0xFF;
            }
        }
        let mut u8_key = vec![];
        key.iter().for_each(|i| {
            u8_key.push((*i & 0xFF) as u8);
            u8_key.push(((*i & 0xFF00) >> 8) as u8);
            u8_key.push(((*i & 0xFF0000) >> 16) as u8);
            u8_key.push(((*i & 0xFF000000) >> 24) as u8);
        });
        GenericArray::clone_from_slice(u8_key.as_slice())
    }

    fn rand_gen(rand_state: &mut [u32; 4]) -> u32 {
        let mut n: u32 = rand_state[0] ^ rand_state[0] << 11;
        n ^= n >> 8 ^ rand_state[3] ^ rand_state[3] >> 19;

        rand_state[0] = rand_state[1];
        rand_state[1] = rand_state[2];
        rand_state[2] = rand_state[3];
        rand_state[3] = n;
        n
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
