#![allow(dead_code)]

extern crate smmdb;

use smmdb::thumbnail2::*;
use std::{
    fs::{read, read_dir, File},
    io::{self, prelude::*},
    path::PathBuf,
    process::Command,
};

fn decrypt_test_assets() -> io::Result<()> {
    let save_folders = vec![
        "tests/assets/saves/smm2/save1",
        "tests/assets/saves/smm2/save2",
    ];
    for folder in save_folders {
        for entry in read_dir(folder)? {
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
    }
    Ok(())
}

#[test]
fn thumbnail_decrypt() {
    for (_, mut thumbnail, decrypted) in get_test_assets().into_iter() {
        Thumbnail2::decrypt(&mut thumbnail);

        assert_eq!(thumbnail.len() - 0x30, decrypted.len());
        assert_eq!(&thumbnail[..100], &decrypted[..100]);
    }
}

#[test]
fn thumbnail_decrypt_all() {
    decrypt_test_assets().unwrap();
}

#[test]
fn thumbnail_encrypt() {
    for (_, encrypted_ext, decrypted) in get_test_assets().into_iter() {
        let encrypted = Thumbnail2::encrypt(decrypted.clone());
        assert_eq!(encrypted_ext.len(), encrypted.len());

        let mut thumbnail = Thumbnail2::new(encrypted);

        assert_eq!(decrypted.len(), thumbnail.get_jpeg_no_opt().len());
        assert_eq!(decrypted, thumbnail.get_jpeg_no_opt());
    }
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
    let save_folders = vec![
        "tests/assets/saves/smm2/save1",
        "tests/assets/saves/smm2/save2",
    ];
    for folder in save_folders {
        for entry in read_dir(folder).unwrap() {
            let entry = entry.unwrap();
            let file_name = entry.file_name();
            let file_name = file_name.to_str().unwrap();
            if file_name.starts_with("course_thumb_") && file_name.ends_with(".btl") {
                let path = entry.path();
                let out_path: Vec<&str> = path.to_str().unwrap().split('.').collect();
                let out_path = out_path[0].to_owned() + ".decrypted";
                let out_data = read(out_path).unwrap();
                if out_data.len() == 0 {
                    // FIXME flaky test workaround
                    continue;
                };
                thumbnails.push((path.clone(), read(path).unwrap(), out_data));
            }
        }
    }
    thumbnails
}
