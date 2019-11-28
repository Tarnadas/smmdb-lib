#![allow(unused_variables)]
#![doc(hidden)]

extern crate cemu_smm;

// use protobuf::parse_from_bytes;
// use protobuf::Message;
use std::fs::{read, write};

// use cemu_smm::constants2::*;
// use cemu_smm::course::Course;
use cemu_smm::course2::Course2;
// use cemu_smm::proto::SMM2Course::{SMM2Course, SMM2CourseArea_DayTime};

fn main() {
    // let mut file = read("tests/assets/saves/smm2/course_data_125.bcd").unwrap();
    // let mut course = Course2::from_switch_files(&file, None).unwrap();
    // dbg!(course.get_course_mut().get_course_sub_area().day_time);
    // file[DAY_TIME_OFFSET[1]] = 2;
    // let res = Course2::encrypt(file);
    // write("tests/assets/saves/smm2/course_data_125_with_2.bcd", res).unwrap();

    // let mut file = read("tests/assets/saves/smm2/course_data_146.bcd").unwrap();
    // let mut course = Course2::from_switch_files(&file, None).unwrap();
    // dbg!(course.get_course_mut().get_course_sub_area().day_time);
    // file[DAY_TIME_OFFSET[1]] = 0;
    // let res = Course2::encrypt(file);
    // write("tests/assets/saves/smm2/course_data_146_with_0.bcd", res).unwrap();

    let file = read("tests/assets/saves/smm2/custom.zip").unwrap();
    let res = Course2::from_packed(&file[..]).unwrap();
    dbg!(res.len());
}
