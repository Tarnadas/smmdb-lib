use crate::constants::*;
use crate::proto::SMM2Course::SMM2Course;

use aes::block_cipher_trait::generic_array::GenericArray;
use aes::Aes128;
use block_modes::{block_padding::*, BlockMode, Cbc};
use protobuf::{parse_from_bytes, Message};
use std::convert::TryInto;
use typenum::*;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, PartialEq)]
pub struct Course2 {
    course: SMM2Course,
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
