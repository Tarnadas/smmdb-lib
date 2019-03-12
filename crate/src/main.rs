extern crate cemu_smm;

use protobuf::parse_from_bytes;
use std::fs::read;

use cemu_smm::proto::SMMCourse::SMMCourse;

fn main() {
    let file = read("tests/assets/courses/course001/course").unwrap();
    println!("{:?}", file.as_slice());
    let course: SMMCourse = parse_from_bytes(file.as_slice()).unwrap();
    println!("{:?}", course.sounds);
}
