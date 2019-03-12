extern crate cemu_smm;

use protobuf::parse_from_bytes;
use wasm_bindgen::prelude::*;
use wasm_bindgen_test::*;

use cemu_smm::course::*;
use cemu_smm::proto::SMMCourse::SMMCourse;

static COURSE_ASSETS: [&[u8]; 6] = [
    include_bytes!("assets/courses/course000/course"),
    include_bytes!("assets/courses/course001/course"),
    include_bytes!("assets/courses/course002/course"),
    include_bytes!("assets/courses/course003/course"),
    include_bytes!("assets/courses/course004/course"),
    include_bytes!("assets/courses/course005/course"),
];

#[wasm_bindgen_test]
fn deserialize_test() {
    for course in COURSE_ASSETS.iter() {
        deserialize_test_once(course);
    }
}

fn deserialize_test_once(course: &[u8]) {
    let expected_course: SMMCourse = parse_from_bytes(course).unwrap();

    let result = deserialize(course);

    assert_eq!(result.into_serde::<SMMCourse>().unwrap(), expected_course);
}

#[wasm_bindgen_test]
fn deserialize_boxed_test() {
    for course in COURSE_ASSETS.iter() {
        deserialize_boxed_test_once(course);
    }
}

fn deserialize_boxed_test_once(course: &[u8]) {
    let expected_course: SMMCourse = parse_from_bytes(course).unwrap();

    let result = deserialize_boxed(course.to_vec().into_boxed_slice());

    assert_eq!(result.into_serde::<SMMCourse>().unwrap(), expected_course);
}

#[wasm_bindgen_test]
fn serialize_test() {
    for course in COURSE_ASSETS.iter() {
        serialize_test_once(course);
    }
}

fn serialize_test_once(file: &[u8]) {
    let course: SMMCourse = parse_from_bytes(file).unwrap();
    let course = JsValue::from_serde(&course).unwrap();

    let result = serialize(course);

    assert_eq!(
        deserialize_boxed(result).into_serde::<SMMCourse>().unwrap(),
        deserialize_boxed(file.to_vec().into_boxed_slice()).into_serde::<SMMCourse>().unwrap()
    );
}

