extern crate smmdb;

use bytes::Bytes;
use smmdb::course::*;
#[cfg(target_arch = "wasm32")]
use wasm_bindgen_test::*;

#[derive(Clone)]
struct CourseTestAssets {
    proto: &'static [u8],
    zip: &'static [u8],
    course_data: &'static [u8],
    course_data_sub: &'static [u8],
    thumbnail_0: &'static [u8],
    thumbnail_1: &'static [u8],
}

static COURSE_ASSETS: [CourseTestAssets; 6] = [
    CourseTestAssets {
        proto: include_bytes!("assets/courses/course000/course"),
        zip: include_bytes!("assets/courses/course000/course.zip"),
        course_data: include_bytes!("assets/courses/course000/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course000/course_data_sub.cdt"),
        thumbnail_0: include_bytes!("assets/courses/course000/thumbnail0.tnl"),
        thumbnail_1: include_bytes!("assets/courses/course000/thumbnail1.tnl"),
    },
    CourseTestAssets {
        proto: include_bytes!("assets/courses/course001/course"),
        zip: include_bytes!("assets/courses/course001/course.zip"),
        course_data: include_bytes!("assets/courses/course001/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course001/course_data_sub.cdt"),
        thumbnail_0: include_bytes!("assets/courses/course001/thumbnail0.tnl"),
        thumbnail_1: include_bytes!("assets/courses/course001/thumbnail1.tnl"),
    },
    CourseTestAssets {
        proto: include_bytes!("assets/courses/course002/course"),
        zip: include_bytes!("assets/courses/course002/course.zip"),
        course_data: include_bytes!("assets/courses/course002/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course002/course_data_sub.cdt"),
        thumbnail_0: include_bytes!("assets/courses/course002/thumbnail0.tnl"),
        thumbnail_1: include_bytes!("assets/courses/course002/thumbnail1.tnl"),
    },
    CourseTestAssets {
        proto: include_bytes!("assets/courses/course003/course"),
        zip: include_bytes!("assets/courses/course003/course.zip"),
        course_data: include_bytes!("assets/courses/course003/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course003/course_data_sub.cdt"),
        thumbnail_0: include_bytes!("assets/courses/course003/thumbnail0.tnl"),
        thumbnail_1: include_bytes!("assets/courses/course003/thumbnail1.tnl"),
    },
    CourseTestAssets {
        proto: include_bytes!("assets/courses/course004/course"),
        zip: include_bytes!("assets/courses/course004/course.zip"),
        course_data: include_bytes!("assets/courses/course004/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course004/course_data_sub.cdt"),
        thumbnail_0: include_bytes!("assets/courses/course004/thumbnail0.tnl"),
        thumbnail_1: include_bytes!("assets/courses/course004/thumbnail1.tnl"),
    },
    CourseTestAssets {
        proto: include_bytes!("assets/courses/course005/course"),
        zip: include_bytes!("assets/courses/course005/course.zip"),
        course_data: include_bytes!("assets/courses/course005/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course005/course_data_sub.cdt"),
        thumbnail_0: include_bytes!("assets/courses/course005/thumbnail0.tnl"),
        thumbnail_1: include_bytes!("assets/courses/course005/thumbnail1.tnl"),
    },
];

#[test]
fn course_from_wii_u_files() {
    for course in COURSE_ASSETS.clone().iter_mut() {
        course_from_wii_u_file(course);
    }
}

fn course_from_wii_u_file(assets: &mut CourseTestAssets) {
    let mut course = Course::from_wii_u_files(
        assets.course_data,
        assets.course_data_sub,
        assets.thumbnail_0,
        assets.thumbnail_1,
    )
    .unwrap();
    let mut course_proto = Course::from_proto(assets.proto);

    let modified = course_proto.get_course().modified;
    course_proto.set_modified((modified / 60) * 60);
    assert_eq!(
        course.get_course().modified,
        course_proto.get_course().modified
    );
    assert_eq!(course.get_course().title, course_proto.get_course().title);
    assert_eq!(course.get_course().maker, course_proto.get_course().maker);
    assert_eq!(
        course.get_course().game_style,
        course_proto.get_course().game_style
    );
    assert_eq!(
        course.get_course().course_theme,
        course_proto.get_course().course_theme
    );
    assert_eq!(
        course.get_course().course_theme_sub,
        course_proto.get_course().course_theme_sub
    );
    assert_eq!(course.get_course().time, course_proto.get_course().time);
    assert_eq!(
        course.get_course().auto_scroll,
        course_proto.get_course().auto_scroll
    );
    assert_eq!(
        course.get_course().auto_scroll_sub,
        course_proto.get_course().auto_scroll_sub
    );
    assert_eq!(course.get_course().width, course_proto.get_course().width);
    assert_eq!(
        course.get_course().width_sub,
        course_proto.get_course().width_sub
    );
    let course_tiles = &course.get_course().tiles;
    let course_tiles_sub = &course.get_course().tiles_sub;
    let course_proto_tiles = &course_proto.get_course().tiles;
    let course_proto_tiles_sub = &course_proto.get_course().tiles_sub;
    assert_eq!(course_tiles.len(), course_proto_tiles.len());
    assert_eq!(course_tiles_sub.len(), course_proto_tiles_sub.len());
    for i in 0..course_tiles.len() {
        assert_eq!(course_tiles[i], course_proto_tiles[i]);
    }
    for i in 0..course_tiles_sub.len() {
        assert_eq!(course_tiles_sub[i], course_proto_tiles_sub[i]);
    }
    let course_sounds = &course.get_course().sounds;
    let course_sounds_sub = &course.get_course().sounds_sub;
    let course_proto_sounds = &course_proto.get_course().sounds;
    let course_proto_sounds_sub = &course_proto.get_course().sounds_sub;
    assert_eq!(course_sounds.len(), course_proto_sounds.len());
    assert_eq!(course_sounds_sub.len(), course_proto_sounds_sub.len());
    for i in 0..course_sounds.len() {
        assert_eq!(course_sounds[i], course_proto_sounds[i]);
    }
    for i in 0..course_sounds_sub.len() {
        assert_eq!(course_sounds_sub[i], course_proto_sounds_sub[i]);
    }
    // ignore thumbnails, because they have been converted
    course.set_thumbnail(Bytes::new());
    course_proto.set_thumbnail(Bytes::new());
    course.set_thumbnail_preview(Bytes::new());
    course_proto.set_thumbnail_preview(Bytes::new());
    assert_eq!(course, course_proto);
}

#[test]
fn course_from_packed() {
    for course in COURSE_ASSETS.iter() {
        course_from_packed_once(course.zip);
    }
}

fn course_from_packed_once(asset: &[u8]) {
    let courses = Course::from_packed(asset).unwrap();

    assert_eq!(courses.len(), 1);
}

#[test]
fn course_from_proto() {
    for course in COURSE_ASSETS.iter() {
        course_from_proto_once(course.proto, course.zip);
    }
}

fn course_from_proto_once(asset: &[u8], zip: &[u8]) {
    let mut course = Course::from_proto(asset);
    let mut course_packed = Course::from_packed(zip).unwrap().pop().unwrap();

    let modified = course.get_course().modified;
    course.set_modified((modified / 60) * 60);
    course.set_thumbnail(Bytes::new());
    course_packed.set_thumbnail(Bytes::new());
    course.set_thumbnail_preview(Bytes::new());
    course_packed.set_thumbnail_preview(Bytes::new());

    assert_eq!(course, course_packed);
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "with-serde")]
#[wasm_bindgen_test]
fn course_from_proto_wasm() {
    for course in COURSE_ASSETS.iter() {
        course_from_proto_wasm_once(course.proto);
    }
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "with-serde")]
fn course_from_proto_wasm_once(asset: &[u8]) {
    let course = Course::from_proto(asset);

    assert_eq!(course, Course::from_js(course.into_js()));
}

#[test]
fn course_from_boxed_proto() {
    for course in COURSE_ASSETS.iter() {
        course_from_boxed_proto_once(course.proto.to_vec().into_boxed_slice(), course.zip);
    }
}

fn course_from_boxed_proto_once(asset: Box<[u8]>, zip: &[u8]) {
    let mut course = Course::from_boxed_proto(asset);
    let mut course_packed = Course::from_packed(zip).unwrap().pop().unwrap();

    let modified = course.get_course().modified;
    course.set_modified((modified / 60) * 60);
    course.set_thumbnail(Bytes::new());
    course_packed.set_thumbnail(Bytes::new());
    course.set_thumbnail_preview(Bytes::new());
    course_packed.set_thumbnail_preview(Bytes::new());

    assert_eq!(course, course_packed);
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "with-serde")]
#[wasm_bindgen_test]
fn course_from_boxed_proto_wasm() {
    for course in COURSE_ASSETS.iter() {
        course_from_boxed_proto_wasm_once(course.proto.to_vec().into_boxed_slice());
    }
}

#[cfg(target_arch = "wasm32")]
#[cfg(feature = "with-serde")]
fn course_from_boxed_proto_wasm_once(asset: Box<[u8]>) {
    let course = Course::from_boxed_proto(asset);

    assert_eq!(course, Course::from_js(course.into_js()));
}

#[test]
#[cfg_attr(target_arch = "wasm32", wasm_bindgen_test)]
fn course_into_proto() {
    for course in COURSE_ASSETS.iter() {
        course_into_proto_once(course.proto);
    }
}

fn course_into_proto_once(asset: &[u8]) {
    let course = Course::from_proto(asset);

    assert_eq!(course, Course::from_proto(&course.into_proto()),);
}
