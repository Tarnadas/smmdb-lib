extern crate smmdb;

use smmdb::{course2::*, errors::Course2Error, Error};
use std::{
    collections::HashSet,
    fs::{read, read_dir},
    io,
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
fn course2_decrypt() {
    decrypt_test_assets().unwrap();
    let save_folders = vec![
        "tests/assets/saves/smm2/save1",
        "tests/assets/saves/smm2/save2",
    ];
    for folder in save_folders {
        for entry in read_dir(folder).unwrap() {
            let entry = entry.unwrap();
            let file_name = entry.file_name();
            let file_name = file_name.to_str().unwrap();
            if file_name.starts_with("course_data_") && file_name.ends_with(".bcd") {
                let path = entry.path();
                let out_path: Vec<&str> = path.to_str().unwrap().split('.').collect();
                let out_path = out_path[0].to_owned() + ".decrypted";
                let expected = read(out_path).unwrap();

                let mut decrypted = read(path).unwrap();
                Course2::decrypt(&mut decrypted);

                // @simontime's implementation truncates non relevant bytes, which we won't do
                assert_eq!(decrypted[0x10..decrypted.len() - 0x30], expected[..]);
            }
        }
    }
}

#[test]
fn course2_encrypt() {
    let save_folders = vec![
        "tests/assets/saves/smm2/save1",
        "tests/assets/saves/smm2/save2",
    ];
    for folder in save_folders {
        for entry in read_dir(folder).unwrap() {
            let entry = entry.unwrap();
            let file_name = entry.file_name();
            let file_name = file_name.to_str().unwrap();
            if file_name.starts_with("course_data_") && file_name.ends_with(".bcd") {
                let path = entry.path();
                let expected = read(&path).unwrap();

                let mut decrypted = read(path).unwrap();
                Course2::decrypt(&mut decrypted);
                let mut encrypted = decrypted.clone();
                Course2::encrypt(&mut encrypted);

                assert_eq!(encrypted.len(), expected.len());
                assert_eq!(encrypted[..0x100], expected[..0x100]);
            }
        }
    }
}

#[test]
fn course2_from_packed() -> Result<(), Error> {
    decrypt_test_assets().unwrap();

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

    zip.start_file("course_data_120.bcd", options.clone())?;
    zip.write_all(course_120)?;
    zip.start_file("course_thumb_120.btl", options.clone())?;
    zip.write_all(course_thumb_120)?;
    zip.start_file("course_data_121.bcd", options.clone())?;
    zip.write_all(course_121)?;
    zip.start_file("course_thumb_121.btl", options.clone())?;
    zip.write_all(course_thumb_121)?;

    let zip_file = zip.finish()?.into_inner();

    let res = Course2::from_packed(&zip_file[..])?;

    let mut course = course_120.to_vec();
    &Course2::decrypt(&mut course);
    assert_eq!(res.get(0).unwrap().get_course_data(), &course);
    assert_eq!(
        &res.get(0)
            .unwrap()
            .get_course_thumb()
            .unwrap()
            .get_encrypted()[..],
        &course_thumb_120[..]
    );

    let mut course = course_121.to_vec();
    &Course2::decrypt(&mut course);
    assert_eq!(res.get(1).unwrap().get_course_data(), &course);
    assert_eq!(
        &res.get(1)
            .unwrap()
            .get_course_thumb()
            .unwrap()
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
fn course2_set_description() {
    let course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
    let mut course = Course2::from_switch_files(course_data, None, true).unwrap();

    let description = "Hey there!".to_string();
    course.set_description(description.clone()).unwrap();

    let course_res =
        Course2::from_switch_files(course.get_course_data().clone(), None, false).unwrap();

    assert_eq!(
        course_res.get_course().get_header().get_description(),
        description
    );
}

#[test]
fn course2_set_description_fail() {
    let course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
    let mut course = Course2::from_switch_files(course_data, None, true).unwrap();

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
            Error::Course2Error(Course2Error::StringTooLong(description.len()))
        )
    );
}

// #[test]
// fn course2_set_smmdb_id() {
//     // TODO
//     use std::{env, fs};

//     let course_data = read("tests/assets/saves/smm2/save1/course_data_120.bcd").unwrap();
//     let course_thumb = read("tests/assets/saves/smm2/save1/course_thumb_120.btl").unwrap();
//     let mut course = Course2::from_switch_files(course_data, None, true).unwrap();

//     // let description = "Hey there!".to_string();
//     // course.set_description(description.clone()).unwrap();

//     let mut encrypted_data = course.get_course_data().clone();
//     Course2::encrypt(&mut encrypted_data);

//     fs::write(
//         format!("{}/.local/share/yuzu/nand/user/save/0000000000000000/FDD588AE7826C7A9A70AE93C12A4E9CE/01009B90006DC000/course_data_000.bcd",
//         env::var("HOME").unwrap()),
//         encrypted_data
//     ).unwrap();
// }
