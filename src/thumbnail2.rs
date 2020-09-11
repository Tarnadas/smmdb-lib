//! Super Mario Maker 2 thumbnail file manipulation.

use crate::{decrypt, encrypt, key_tables::*};

use image::{jpeg::JpegEncoder, load_from_memory, DynamicImage, ImageError};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[derive(Clone, Debug, PartialEq)]
pub struct Thumbnail2 {
    encrypted: Vec<u8>,
    jpeg: Vec<u8>,
    jpeg_opt: Option<Vec<u8>>,
}

impl Thumbnail2 {
    pub fn new(bytes: Vec<u8>) -> Thumbnail2 {
        let mut encrypted = bytes.clone();
        decrypt(&mut encrypted, &THUMBNAIL_KEY_TABLE);
        let jpeg = encrypted[..encrypted.len() - 0x30].to_vec();
        Thumbnail2 {
            encrypted: bytes,
            jpeg,
            jpeg_opt: None,
        }
    }

    pub fn from_decrypted(bytes: Vec<u8>) -> Thumbnail2 {
        let mut encrypted = bytes.clone();
        encrypted.resize(0x1c000 - 0x30, 0);
        Thumbnail2::encrypt(&mut encrypted);
        Thumbnail2 {
            encrypted,
            jpeg: bytes,
            jpeg_opt: None,
        }
    }

    pub fn encrypt(bytes: &mut Vec<u8>) {
        let aes_info = encrypt(bytes, &THUMBNAIL_KEY_TABLE, false).unwrap();
        bytes.extend_from_slice(&aes_info);
    }

    pub fn decrypt(bytes: &mut [u8]) {
        decrypt(bytes, &THUMBNAIL_KEY_TABLE);
    }

    pub fn take_encrypted(self) -> Vec<u8> {
        self.encrypted
    }

    pub fn get_encrypted(&self) -> &Vec<u8> {
        &self.encrypted
    }

    pub fn take_jpeg(self) -> Vec<u8> {
        self.jpeg
    }

    pub fn get_jpeg(&self) -> &[u8] {
        if let Some(jpeg) = &self.jpeg_opt {
            &jpeg[..]
        } else {
            &self.jpeg
        }
    }

    pub fn get_jpeg_no_opt(&self) -> &[u8] {
        &self.jpeg
    }

    pub fn optimize_jpeg(&mut self) -> Result<(), ImageError> {
        let jpeg = self.get_jpeg();

        let image = load_from_memory(jpeg)?;
        let color = image.color();

        match image {
            DynamicImage::ImageRgb8(buffer) => {
                let (width, height) = buffer.dimensions();
                let mut opt = vec![];
                let mut encoder = JpegEncoder::new_with_quality(&mut opt, 80);
                encoder
                    .encode(&buffer.into_raw()[..], width, height, color)
                    .map_err(ImageError::from)?;
                self.jpeg_opt = if opt.len() < jpeg.len() {
                    Some(opt)
                } else {
                    Some(jpeg.to_vec())
                };
                Ok(())
            }
            _ => Ok(()),
        }
    }
}
