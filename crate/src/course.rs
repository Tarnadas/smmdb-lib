use crate::proto::SMMCourse::SMMCourse;

use protobuf::parse_from_bytes;
use protobuf::Message;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, PartialEq)]
pub struct Course {
    course: SMMCourse,
}

impl Course {
    pub fn get_course_ref(&self) -> &SMMCourse {
        &self.course
    }

}

#[wasm_bindgen]
impl Course {
    #[wasm_bindgen]
    pub fn from_proto(buffer: &[u8]) -> Course {
        let course: SMMCourse = parse_from_bytes(buffer).unwrap();
        Course { course }
    }

    #[wasm_bindgen]
    pub fn from_boxed_proto(buffer: Box<[u8]>) -> Course {
        let course: SMMCourse = parse_from_bytes(buffer.to_vec().as_slice()).unwrap();
        Course { course }
    }

    #[wasm_bindgen]
    pub fn from_js(course: JsValue) -> Course {
        let course: SMMCourse = course.into_serde().expect("Course serialization failed");
        Course { course }
    }

    #[wasm_bindgen]
    pub fn to_proto(&self) -> Box<[u8]> {
        let mut out: Vec<u8> = vec![];
        self.course
            .write_to_vec(&mut out)
            .expect("Writing to Vector failed");
        out.into_boxed_slice()
    }

    #[wasm_bindgen]
    pub fn to_js(&self) -> JsValue {
        JsValue::from_serde(&self.course).unwrap()
    }
}

