use crate::proto::SMMCourse::SMMCourse;
use protobuf::Message;
use protobuf::parse_from_bytes;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn deserialize(buffer: &[u8]) -> JsValue {
    let course: SMMCourse = parse_from_bytes(buffer).unwrap();
    JsValue::from_serde(&course).unwrap()
}

#[wasm_bindgen(js_name = deserializeBoxed)]
pub fn deserialize_boxed(buffer: Box<[u8]>) -> JsValue {
    let course: SMMCourse = parse_from_bytes(buffer.to_vec().as_slice()).unwrap();
    JsValue::from_serde(&course).unwrap()
}

#[wasm_bindgen]
pub fn serialize(course: JsValue) -> Box<[u8]> {
    let course: SMMCourse = course.into_serde().expect("Course serialization failed");
    let mut out: Vec<u8> = vec![];
    course.write_to_vec(&mut out).expect("Writing to Vector failed");
    out.into_boxed_slice()
}

