extern crate smmdb;

#[cfg(not(target_arch = "wasm32"))]
use smmdb::constants2::*;
use smmdb::{course2::*, errors::Smm2Error, Error};
use std::{
    collections::HashSet,
    fs::{read, read_dir},
    io,
    process::Command,
};
#[cfg(target_arch = "wasm32")]
use wasm_bindgen::JsValue;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen_test::*;

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
            if file_name.starts_with("course_") && file_name.ends_with(".bcd") {
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
fn course2_encryption() {
    use rayon::prelude::*;

    decrypt_test_assets().unwrap();
    let save_folders = vec![
        "tests/assets/saves/smm2/save1",
        "tests/assets/saves/smm2/save2",
    ];
    for folder in save_folders {
        let entries: Vec<_> = read_dir(folder)
            .unwrap()
            .par_bridge()
            .map(|entry| {
                let entry = entry.unwrap();
                (entry.file_name(), entry.path())
            })
            .collect();

        entries.par_iter().for_each(|(file_name, path)| {
            let file_name = file_name.to_str().unwrap();
            if file_name.starts_with("course_data_") && file_name.ends_with(".bcd") {
                let mut expected = read(path).unwrap();
                let expected_course =
                    Course2::from_switch_files(&mut expected, None, true).unwrap();

                let out_path: Vec<&str> = path.to_str().unwrap().split('.').collect();
                let out_path = out_path[0].to_owned() + ".decrypted";
                let expected_decrypted = read(out_path).unwrap();

                let mut decrypted = read(path).unwrap();
                Course2::decrypt(&mut decrypted).unwrap();
                assert_eq!(
                    decrypted[0x10..decrypted.len() - 0x30],
                    expected_decrypted[..]
                );

                #[cfg(target_arch = "wasm32")]
                let encrypted = decrypted;
                #[cfg(not(target_arch = "wasm32"))]
                let mut encrypted = decrypted;
                #[cfg(target_arch = "wasm32")]
                let mut encrypted = Course2::encrypt(&encrypted);
                #[cfg(not(target_arch = "wasm32"))]
                Course2::encrypt(&mut encrypted);

                assert_eq!(encrypted.len(), expected.len());

                let course = Course2::from_switch_files(&mut encrypted, None, true).unwrap();
                assert_eq!(course.get_course(), expected_course.get_course());
                assert_eq!(
                    course.get_course_data()[..100],
                    expected_course.get_course_data()[..100]
                );
            }
        });
    }
}

#[cfg(not(target_arch = "wasm32"))]
#[test]
fn course2_from_packed() -> Result<(), Error> {
    decrypt_test_assets().unwrap();

    _course2_from_packed()
}

#[cfg(target_arch = "wasm32")]
#[wasm_bindgen_test]
fn course2_from_packed() {
    _course2_from_packed()
        .map_err(|err| -> JsValue { err.into() })
        .unwrap();
}

fn _course2_from_packed() -> Result<(), Error> {
    use std::io::Write;
    use zip::ZipWriter;

    let w = std::io::Cursor::new(Vec::new());
    let mut zip = ZipWriter::new(w);

    let options =
        zip::write::FileOptions::default().compression_method(zip::CompressionMethod::Deflated);

    let course_120 = include_bytes!("assets/saves/smm2/save1/course_data_120.bcd");
    let course_thumb_120 = include_bytes!("assets/saves/smm2/save1/course_thumb_120.btl");

    let course_121 = include_bytes!("assets/saves/smm2/save1/course_data_121.bcd");
    let course_thumb_121 = include_bytes!("assets/saves/smm2/save1/course_thumb_121.btl");

    zip.start_file("course_data_120.bcd", options)?;
    zip.write_all(course_120)?;
    zip.start_file("course_thumb_120.btl", options)?;
    zip.write_all(course_thumb_120)?;
    zip.start_file("course_data_121.bcd", options)?;
    zip.write_all(course_121)?;
    zip.start_file("course_thumb_121.btl", options)?;
    zip.write_all(course_thumb_121)?;

    let zip_file = zip.finish()?.into_inner();

    let res = Course2::from_packed(&zip_file[..])?;

    let mut course = course_120.to_vec();
    Course2::decrypt(&mut course).unwrap();
    assert_eq!(res.get(0).unwrap().get_course_data(), &course[..0x5bfd0]);
    assert_eq!(
        &res.get(0)
            .unwrap()
            .get_course_thumb()
            .unwrap()
            .clone()
            .get_encrypted()[..],
        &course_thumb_120[..]
    );

    let mut course = course_121.to_vec();
    Course2::decrypt(&mut course).unwrap();
    assert_eq!(res.get(1).unwrap().get_course_data(), &course[..0x5bfd0]);
    assert_eq!(
        &res.get(1)
            .unwrap()
            .get_course_thumb()
            .unwrap()
            .clone()
            .get_encrypted()[..],
        &course_thumb_121[..]
    );

    Ok(())
}

#[test]
fn course2_from_packed_2() {
    let save_files = vec![
        "tests/assets/saves/smm2/save1.zip",
        "tests/assets/saves/smm2/save2.zip",
        "tests/assets/saves/smm2/save3.zip",
    ];
    for save in save_files {
        let save = read(save).unwrap();
        let courses = Course2::from_packed(&save).unwrap();

        assert_eq!(courses.len(), 60);
        for course in courses {
            let header = course.get_course().get_header();
            assert!(
                (header.game_version as f32).log2() as u32 <= header.completion_version,
                "testing game version {} against completion version {}",
                header.game_version,
                header.completion_version
            );
        }
    }
}

#[test]
fn course2_from_packed_tar() {
    let zip_save = read("tests/assets/saves/smm2/save1.zip").unwrap();
    let zip_courses = Course2::from_packed(&zip_save).unwrap();

    let tar_save = read("tests/assets/saves/smm2/save1.tar").unwrap();
    let tar_courses = Course2::from_packed(&tar_save).unwrap();

    assert_eq!(tar_courses.len(), 60);
    assert_eq!(
        zip_courses
            .into_iter()
            .map(|course| course.get_course().get_header().get_title().to_string())
            .collect::<HashSet<_>>(),
        tar_courses
            .into_iter()
            .map(|course| course.get_course().get_header().get_title().to_string())
            .collect::<HashSet<_>>()
    );
}

#[test]
#[cfg(not(target_arch = "wasm32"))]
fn course2_bad_modified() {
    let mut course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
    Course2::decrypt(&mut course_data).unwrap();
    course_data[DAY_OFFSET] = 69;

    Course2::encrypt(&mut course_data);

    let course = Course2::from_switch_files(&mut course_data, None, true);

    assert!(course.is_err());
}

#[test]
fn course2_set_description() {
    let mut course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
    let mut course = Course2::from_switch_files(&mut course_data, None, true).unwrap();

    let description = "Hey there!".to_string();
    course.set_description(description.clone()).unwrap();

    let course_res = Course2::from_switch_files(course.get_course_data_mut(), None, false).unwrap();

    assert_eq!(
        course_res.get_course().get_header().get_description(),
        description
    );
}

#[test]
fn course2_set_description_fail() {
    let mut course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
    let mut course = Course2::from_switch_files(&mut course_data, None, true).unwrap();

    let description =
        "This description is larger than seventy-five characters and results in an error!"
            .to_string();
    assert_eq!(
        format!(
            "{}",
            course.set_description(description.clone()).unwrap_err()
        ),
        format!(
            "{}",
            Error::Smm2Error(Smm2Error::StringTooLong(description.len()))
        )
    );
}

#[test]
fn course2_set_smmdb_id() {
    let mut course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
    let mut course = Course2::from_switch_files(&mut course_data, None, true).unwrap();

    let smmdb_id = "5f6850b100284286006b7c68".to_string();
    course.set_smmdb_id(smmdb_id.clone()).unwrap();

    let course_res = Course2::from_switch_files(course.get_course_data_mut(), None, false).unwrap();

    assert_eq!(course_res.get_smmdb_id(), Some(smmdb_id));
}

#[test]
fn course2_set_smmdb_id_no_hex() {
    let mut course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
    let mut course = Course2::from_switch_files(&mut course_data, None, true).unwrap();

    let smmdb_id = "xf6850b100284286006b7c68".to_string();
    let res = course.set_smmdb_id(smmdb_id);

    assert!(res.is_err());
}

#[test]
fn course2_get_smmdb_id_return_none_when_unset() {
    let mut course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
    let course = Course2::from_switch_files(&mut course_data, None, true).unwrap();

    assert_eq!(course.get_smmdb_id(), None);
}

#[test]
fn course2_reset_clear_check() {
    let mut course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
    let mut course = Course2::from_switch_files(&mut course_data, None, true).unwrap();

    course.reset_clear_check();
    let new_course = Course2::from_switch_files(course.get_course_data_mut(), None, false).unwrap();

    assert_eq!(
        course.get_course().get_header().get_management_flags() & 0b10,
        0
    );
    assert_eq!(course.get_course().get_header().get_clear_check_tries(), 0);
    assert_eq!(
        course.get_course().get_header().get_clear_check_time(),
        0xffffffff
    );
    assert_eq!(
        course.get_course().get_header(),
        new_course.get_course().get_header()
    );
}
