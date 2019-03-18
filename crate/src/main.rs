extern crate cemu_smm;

use protobuf::Message;
use protobuf::parse_from_bytes;
use std::fs::read;

use cemu_smm::proto::SMMCourse::SMMCourse;

fn main() {
    let file = read("tests/assets/courses/course001/course").unwrap();
    let course: SMMCourse = parse_from_bytes(file.as_slice()).unwrap();
    println!("{:?}", course.sounds);

    let mut out: Vec<u8> = vec![];
    course.write_to_vec(&mut out).unwrap();
    let new_course: SMMCourse = parse_from_bytes(out.as_slice()).unwrap();
    println!("{:?}", new_course.sounds);
}
