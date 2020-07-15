use aes::block_cipher::generic_array::GenericArray;
use aes::Aes128;
use block_modes::{block_padding::*, BlockMode, Cbc};
use crc::crc32;
use std::convert::TryInto;
use typenum::*;

pub fn decrypt(mut bytes: Vec<u8>, key_table: &[u32]) -> Vec<u8> {
    let end_index = bytes.len() - 0x30;
    let end = &bytes[end_index..];
    let iv = GenericArray::from_slice(&end[0..16]);

    let mut rand_state = [0; 4];
    rand_init(
        &mut rand_state,
        u32::from_le_bytes(end[0x10..0x14].try_into().unwrap()),
        u32::from_le_bytes(end[0x14..0x18].try_into().unwrap()),
        u32::from_le_bytes(end[0x18..0x1C].try_into().unwrap()),
        u32::from_le_bytes(end[0x1C..0x20].try_into().unwrap()),
    );
    let key = gen_key(&mut rand_state, key_table);

    type Aes128Cbc = Cbc<Aes128, ZeroPadding>;
    let cipher = Aes128Cbc::new_fix(&key, &iv);
    cipher.decrypt(&mut bytes[..end_index]).unwrap();

    bytes[..end_index].to_vec()
}

pub fn encrypt(mut bytes: Vec<u8>, key_table: &[u32]) -> Vec<u8> {
    let end_index = bytes.len() - 0x30;
    let end = &bytes[end_index..];
    let iv = GenericArray::from_slice(&end[0..16]);

    let mut rand_state = [0; 4];
    rand_init(
        &mut rand_state,
        u32::from_le_bytes(end[0x10..0x14].try_into().unwrap()),
        u32::from_le_bytes(end[0x14..0x18].try_into().unwrap()),
        u32::from_le_bytes(end[0x18..0x1C].try_into().unwrap()),
        u32::from_le_bytes(end[0x1C..0x20].try_into().unwrap()),
    );
    let key = gen_key(&mut rand_state, key_table);

    type Aes128Cbc = Cbc<Aes128, ZeroPadding>;
    let cipher = Aes128Cbc::new_fix(&key, &iv);
    cipher.encrypt(&mut bytes, end_index).unwrap();

    bytes[..end_index].to_vec()
}

pub fn fix_crc32(save_header: &[u8], course_data: &[u8]) -> Vec<u8> {
    use std::mem::transmute;

    let checksum = crc32::checksum_ieee(course_data);
    let bytes: [u8; 4] = unsafe { transmute(checksum.to_le()) };
    [&save_header[..0x8], &bytes[..], &save_header[0xC..]].concat()
}

fn rand_init(rand_state: &mut [u32; 4], in0: u32, in1: u32, in2: u32, in3: u32) {
    let cond = (in0 | in1 | in2 | in3) != 0;
    rand_state[0] = if cond { in0 } else { 1 };
    rand_state[1] = if cond { in1 } else { 0x6C07_8967 };
    rand_state[2] = if cond { in2 } else { 0x714A_CB41 };
    rand_state[3] = if cond { in3 } else { 0x4807_7044 };
}

fn gen_key(rand_state: &mut [u32; 4], key_table: &[u32]) -> GenericArray<u8, U16> {
    let mut key = [0u32; 4];
    for k in key.iter_mut() {
        for _j in 0..4 {
            *k <<= 8;
            *k |= (key_table[(rand_gen(rand_state) >> 26) as usize]
                >> ((rand_gen(rand_state) >> 27) & 24))
                & 0xFF;
        }
    }
    let mut u8_key = vec![];
    key.iter().for_each(|i| {
        u8_key.push((*i & 0xFF) as u8);
        u8_key.push(((*i & 0xFF00) >> 8) as u8);
        u8_key.push(((*i & 0x00FF_0000) >> 16) as u8);
        u8_key.push(((*i & 0xFF00_0000) >> 24) as u8);
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
