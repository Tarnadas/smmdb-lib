//! Super Mario Maker 2 thumbnail file manipulation.

#[cfg(target_arch = "wasm32")]
use crate::JsResult;
use crate::{decrypt, encrypt, key_tables::*, Error, Result};

use image::{jpeg::JpegEncoder, load_from_memory, DynamicImage, ImageError};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
#[cfg_attr(feature = "with-serde", derive(Serialize))]
#[derive(Clone, Debug, PartialEq)]
pub struct Thumbnail2 {
    encrypted: Vec<u8>,
    jpeg: Vec<u8>,
    jpeg_opt: Option<Vec<u8>>,
}

impl Thumbnail2 {
    #[cfg(not(target_arch = "wasm32"))]
    pub fn from_encrypted(bytes: Vec<u8>) -> Result<Thumbnail2> {
        let mut encrypted = bytes.clone();
        decrypt(&mut encrypted, &THUMBNAIL_KEY_TABLE)?;
        let jpeg = encrypted[..encrypted.len() - 0x30].to_vec();
        Ok(Thumbnail2 {
            encrypted: bytes,
            jpeg,
            jpeg_opt: None,
        })
    }

    #[cfg(not(target_arch = "wasm32"))]
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

    #[cfg(not(target_arch = "wasm32"))]
    pub fn encrypt(bytes: &mut Vec<u8>) {
        let aes_info = encrypt(bytes, &THUMBNAIL_KEY_TABLE);
        bytes.extend_from_slice(&aes_info);
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn decrypt(bytes: &mut [u8]) -> Result<()> {
        decrypt(bytes, &THUMBNAIL_KEY_TABLE)
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn get_encrypted(&self) -> &Vec<u8> {
        &self.encrypted
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn take_encrypted(self) -> Vec<u8> {
        self.encrypted
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn take_jpeg(self) -> Vec<u8> {
        self.jpeg
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn get_jpeg(&self) -> &[u8] {
        if let Some(jpeg) = &self.jpeg_opt {
            &jpeg[..]
        } else {
            &self.jpeg
        }
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn get_jpeg_no_opt(&self) -> &[u8] {
        &self.jpeg
    }

    #[cfg(not(target_arch = "wasm32"))]
    pub fn optimize_jpeg(&mut self) -> Result<()> {
        Self::_optimize_jpeg(self)
    }

    fn _optimize_jpeg(&mut self) -> Result<()> {
        let jpeg = self.get_jpeg();

        let image = load_from_memory(&jpeg)?;
        let color = image.color();

        match image {
            DynamicImage::ImageRgb8(buffer) => {
                let (width, height) = buffer.dimensions();
                let mut opt = vec![];
                let mut encoder = JpegEncoder::new_with_quality(&mut opt, 80);
                encoder
                    .encode(&buffer.into_raw()[..], width, height, color)
                    .map_err(ImageError::from)
                    .map_err(Error::from)?;
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

#[cfg_attr(target_arch = "wasm32", wasm_bindgen)]
impl Thumbnail2 {
    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen]
    pub fn new(bytes: &[u8]) -> Thumbnail2 {
        let mut encrypted = bytes.to_vec();
        decrypt(&mut encrypted, &THUMBNAIL_KEY_TABLE);
        let jpeg = encrypted[..encrypted.len() - 0x30].to_vec();
        Thumbnail2 {
            encrypted: bytes.to_vec(),
            jpeg,
            jpeg_opt: None,
        }
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen(js_name = fromDecrypted)]
    pub fn from_decrypted(bytes: &[u8]) -> Thumbnail2 {
        let mut encrypted = bytes.to_vec();
        encrypted.resize(0x1c000 - 0x30, 0);
        encrypted = Thumbnail2::encrypt(&encrypted);
        Thumbnail2 {
            encrypted,
            jpeg: bytes.to_vec(),
            jpeg_opt: None,
        }
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen]
    pub fn encrypt(bytes: &[u8]) -> Vec<u8> {
        let mut bytes = bytes.to_vec();
        let aes_info = encrypt(&mut bytes, &THUMBNAIL_KEY_TABLE);
        bytes.extend_from_slice(&aes_info);
        bytes
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen]
    pub fn decrypt(bytes: &mut [u8]) {
        decrypt(bytes, &THUMBNAIL_KEY_TABLE);
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen(js_name = getEncrypted)]
    pub fn get_encrypted(self) -> Vec<u8> {
        self.encrypted
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen(js_name = getJpeg)]
    pub fn get_jpeg(&self) -> Box<[u8]> {
        if let Some(jpeg) = &self.jpeg_opt {
            jpeg.clone().into_boxed_slice()
        } else {
            self.jpeg.clone().into_boxed_slice()
        }
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen(js_name = getJpegNoOpt)]
    pub fn get_jpeg_no_opt(&self) -> Box<[u8]> {
        self.jpeg.clone().into_boxed_slice()
    }

    #[cfg(target_arch = "wasm32")]
    #[wasm_bindgen(js_name = optimizeJpeg)]
    pub fn optimize_jpeg(&mut self) -> JsResult<()> {
        Self::_optimize_jpeg(self).map_err(|err| err.into())
    }
}
