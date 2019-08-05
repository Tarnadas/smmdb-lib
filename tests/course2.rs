extern crate cemu_smm;

use cemu_smm::course2::*;
use std::fs::{read, read_dir};
use std::io;
use std::process::Command;

fn decrypt_test_assets() -> io::Result<()> {
    for entry in read_dir("tests/assets/saves/smm2")? {
        let entry = entry?;
        let file_name = entry.file_name();
        let file_name = file_name.to_str().unwrap();
        if file_name.starts_with("course_") && file_name.ends_with(".bcd") {
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

#[test]
fn course_decrypt() {
    decrypt_test_assets().unwrap();
    for entry in read_dir("tests/assets/saves/smm2").unwrap() {
        let entry = entry.unwrap();
        let file_name = entry.file_name();
        let file_name = file_name.to_str().unwrap();
        if file_name.starts_with("course_data_") && file_name.ends_with(".bcd") {
            let path = entry.path();
            let out_path: Vec<&str> = path.to_str().unwrap().split('.').collect();
            let out_path = out_path[0].to_owned() + ".decrypted";
            let expected = read(out_path).unwrap();

            let decrypted = Course2::decrypt(read(path).unwrap());

            // @simontime's implementation truncates non relevant bytes, which we won't do
            assert_eq!(decrypted[0x10..decrypted.len() - 0x30], expected[..]);
        }
    }
}
