use aes::{cipher::generic_array::GenericArray, Aes128};
use block_modes::{block_padding::ZeroPadding, BlockMode, Cbc};
use cmac::{Cmac, Mac, NewMac};
use crc::crc32;
use rand::Rng;
use std::convert::TryInto;
use typenum::*;

pub fn decrypt(bytes: &mut [u8], key_table: &[u32]) {
    let end_index = bytes.len() - 0x30;
    let aes_info = &bytes[end_index..];
    let iv = GenericArray::from_slice(&aes_info[0..16]);

    let rand_seed = array_ref!(aes_info, 0x10, 0x10);

    let mut rand_state = [0; 4];
    rand_init(&mut rand_state, &rand_seed);
    let key = gen_key(&mut rand_state, key_table);
    let cmac_key = gen_key(&mut rand_state, key_table);

    type Aes128Cbc = Cbc<Aes128, ZeroPadding>;
    let cipher = Aes128Cbc::new_fix(&key, &iv);
    cipher.decrypt(&mut bytes[..end_index]).unwrap();

    let mut cmac = Cmac::<Aes128>::new(&cmac_key);
    cmac.update(&bytes[..end_index]);
    let cmac_calculated = cmac.finalize().into_bytes();
    let cmac = array_ref!(bytes, end_index + 0x20, 0x10);
    if cmac != cmac_calculated.as_slice() {
        panic!(
            "CMAC WRONG.\nExpected: {:?}\nReceived: {:?}",
            cmac,
            cmac_calculated.as_slice()
        );
    }
}

pub fn encrypt(bytes: &mut [u8], key_table: &[u32]) -> Vec<u8> {
    let end_index = bytes.len();
    let mut rng = rand::thread_rng();

    let iv_rng = rng.gen::<[u8; 16]>();
    let iv = GenericArray::clone_from_slice(&iv_rng);
    let rand_seed: [u8; 0x10] = rng.gen();

    let mut rand_state = [0; 4];
    rand_init(&mut rand_state, &rand_seed);

    let key = gen_key(&mut rand_state, key_table);

    let cmac_key = gen_key(&mut rand_state, key_table);

    let mut cmac = Cmac::<Aes128>::new(&cmac_key);
    cmac.update(&bytes[..end_index]);
    let cmac = cmac.finalize().into_bytes();

    let aes_info = [iv.as_slice(), &rand_seed, cmac.as_slice()].concat();

    type Aes128Cbc = Cbc<Aes128, ZeroPadding>;
    let cipher = Aes128Cbc::new_fix(&key, &iv);
    cipher.encrypt(&mut bytes[..end_index], end_index).unwrap();

    aes_info
}

pub fn fix_crc32(data: &mut [u8]) {
    use std::mem::transmute;

    let checksum = crc32::checksum_ieee(&data[0x10..]);
    let bytes: [u8; 4] = unsafe { transmute(checksum.to_le()) };
    data[0x8] = bytes[0];
    data[0x9] = bytes[1];
    data[0xA] = bytes[2];
    data[0xB] = bytes[3];
}

fn rand_init(rand_state: &mut [u32; 4], rand_seed: &[u8; 0x10]) {
    let in0 = u32::from_le_bytes(rand_seed[..0x4].try_into().unwrap());
    let in1 = u32::from_le_bytes(rand_seed[0x4..0x8].try_into().unwrap());
    let in2 = u32::from_le_bytes(rand_seed[0x8..0xC].try_into().unwrap());
    let in3 = u32::from_le_bytes(rand_seed[0xC..0x10].try_into().unwrap());
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
