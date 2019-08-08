#![allow(dead_code)]

extern crate cemu_smm;

use cemu_smm::thumbnail2::*;
use std::fs::{read, read_dir, File};
use std::io::{self, prelude::*};
use std::path::PathBuf;
use std::process::Command;

fn decrypt_test_assets() -> io::Result<()> {
    for entry in read_dir("tests/assets/saves/smm2")? {
        let entry = entry?;
        let file_name = entry.file_name();
        let file_name = file_name.to_str().unwrap();
        if file_name.starts_with("course_") && file_name.ends_with(".btl") {
            let path = entry.path();
            let out_path: Vec<&str> = path.to_str().unwrap().split('.').collect();
            let out_path = out_path[0].to_owned() + ".decrypted";
            let mut command = Command::new("./decryptor_linux");
            command.arg(entry.path()).arg(out_path);
            command.output().unwrap();
        }
    }
    Ok(())
}

// #[test]
fn thumbnail_decrypt() {
    decrypt_test_assets().unwrap();
}

#[test]
fn thumbnail_get_jpeg() {
    for (_, thumbnail, expected) in get_test_assets().into_iter() {
        let mut thumbnail = Thumbnail2::new(thumbnail);

        assert_eq!(thumbnail.get_jpeg_no_opt(), &expected[..]);
    }
}

#[test]
fn thumbnail_optimize_jpeg() {
    for (path, thumbnail, decrypted) in get_test_assets().into_iter() {
        let mut thumbnail = Thumbnail2::new(thumbnail);

        thumbnail.optimize_jpeg().unwrap();

        let out_path: Vec<&str> = path.to_str().unwrap().split('.').collect();
        let out_path = out_path[0].to_owned() + ".opt";
        let mut file = File::create(out_path).unwrap();
        file.write_all(thumbnail.get_jpeg()).unwrap();

        assert!(thumbnail.get_jpeg().len() <= decrypted.len());
    }
}

fn get_test_assets() -> Vec<(PathBuf, Vec<u8>, Vec<u8>)> {
    let mut thumbnails = vec![];
    for entry in read_dir("tests/assets/saves/smm2").unwrap() {
        let entry = entry.unwrap();
        let file_name = entry.file_name();
        let file_name = file_name.to_str().unwrap();
        if file_name.starts_with("course_thumb_") && file_name.ends_with(".btl") {
            let path = entry.path();
            let out_path: Vec<&str> = path.to_str().unwrap().split('.').collect();
            let out_path = out_path[0].to_owned() + ".decrypted";
            thumbnails.push((path.clone(), read(path).unwrap(), read(out_path).unwrap()));
        }
    }
    thumbnails
}
