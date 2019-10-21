#![allow(unused_variables)]
#![doc(hidden)]

extern crate cemu_smm;

use protobuf::parse_from_bytes;
use protobuf::Message;
use std::fs::read;

use cemu_smm::course::Course;
use cemu_smm::course2::Course2;
use cemu_smm::proto::SMMCourse::SMMCourse;

fn main() {
    let file = read("tests/assets/courses/course001/course").unwrap();
    let course: SMMCourse = parse_from_bytes(file.as_slice()).unwrap();
    // println!("{:?}", course.sounds);

    let mut out: Vec<u8> = vec![];
    course.write_to_vec(&mut out).unwrap();
    let new_course: SMMCourse = parse_from_bytes(out.as_slice()).unwrap();
    // println!("{:?}", new_course.sounds);

    let course = Course::from_wii_u_files(
        &read("tests/assets/courses/course001/course_data.cdt").unwrap(),
        &read("tests/assets/courses/course001/course_data_sub.cdt").unwrap(),
        &read("tests/assets/courses/course001/thumbnail0.tnl").unwrap(),
        &read("tests/assets/courses/course001/thumbnail1.tnl").unwrap(),
    );
    // dbg!(&course);

    let mut file = read("tests/assets/saves/smm2/course_data_120.bcd").unwrap();
    let course = Course2::from_switch_files(&mut file[..], None).unwrap();
    // dbg!(&course);
    // dbg!(&course.get_course().get_header().game_style);
    // dbg!(&course.get_course().get_course_area().auto_scroll);
    // dbg!(&course.get_course().get_course_sub_area().auto_scroll);

    let file = read("tests/assets/saves/save.zip").unwrap();
    let courses = Course2::from_packed(&file[..]).unwrap();
    for course in &courses {
        // dbg!(&course.get_course().get_header().time);
        // dbg!(&course.get_course().get_header().finish_x);
        // dbg!(&course.get_course().get_header().clear_check_tries);
        // dbg!(&course.get_course().get_header().clear_check_time);
        println!(
            "game_version {:#08b}",
            &course.get_course().get_header().game_version
        );
        println!(
            "management_flags {:#08b}",
            &course.get_course().get_header().management_flags
        );
        // println!(
        //     "creation_id {:X}",
        //     &course.get_course().get_header().creation_id
        // );
        // println!(
        //     "upload_id {:X}",
        //     &course.get_course().get_header().upload_id
        // );
        // dbg!(&course.get_course().get_header().completion_flag);
        // dbg!(&course.get_course().get_course_area().object_count);
        // dbg!(&course.get_course().get_course_area().sound_effect_count);
    }
    let courses: Vec<String> = courses
        .into_iter()
        .map(|course| course.get_course().get_header().get_title().to_owned())
        .collect();
    // dbg!(courses);

    // let decrypted = cemu_smm::course2::Course2::decrypt(file.to_vec());
    // dbg!(decrypted[0xF1] as char, decrypted[0xF2] as char);
}
