extern crate cemu_smm;

use wasm_bindgen_test::*;

use cemu_smm::course::*;

static COURSE_ASSETS: [&[u8]; 6] = [
    include_bytes!("assets/courses/course000/course"),
    include_bytes!("assets/courses/course001/course"),
    include_bytes!("assets/courses/course002/course"),
    include_bytes!("assets/courses/course003/course"),
    include_bytes!("assets/courses/course004/course"),
    include_bytes!("assets/courses/course005/course"),
];

#[wasm_bindgen_test]
fn course_from_proto() {
    for course in COURSE_ASSETS.iter() {
        course_from_proto_once(course);
    }
}

fn course_from_proto_once(asset: &[u8]) {
    let course = Course::from_proto(asset);

    assert_eq!(course, Course::from_js(course.to_js()));
}

#[wasm_bindgen_test]
fn course_from_boxed_proto() {
    for course in COURSE_ASSETS.iter() {
        course_from_boxed_proto_once(course.to_vec().into_boxed_slice());
    }
}

fn course_from_boxed_proto_once(asset: Box<[u8]>) {
    let course = Course::from_boxed_proto(asset);

    assert_eq!(course, Course::from_js(course.to_js()));
}

#[wasm_bindgen_test]
fn course_to_proto() {
    for course in COURSE_ASSETS.iter() {
        course_to_proto_once(course);
    }
}

fn course_to_proto_once(asset: &[u8]) {
    let course = Course::from_proto(asset);

    assert_eq!(course, Course::from_proto(&course.to_proto()),);
}
