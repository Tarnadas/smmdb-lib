extern crate cemu_smm;

use bytes::Bytes;
use cemu_smm::course::*;
use wasm_bindgen_test::*;

#[derive(Clone)]
struct CourseAssets {
    proto: &'static [u8],
    course_data: &'static [u8],
    course_data_sub: &'static [u8],
    thumbnail0: &'static [u8],
    thumbnail1: &'static [u8],
}

static COURSE_ASSETS: [CourseAssets; 6] = [
    CourseAssets {
        proto: include_bytes!("assets/courses/course000/course"),
        course_data: include_bytes!("assets/courses/course000/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course000/course_data_sub.cdt"),
        thumbnail0: include_bytes!("assets/courses/course000/thumbnail0.tnl"),
        thumbnail1: include_bytes!("assets/courses/course000/thumbnail1.tnl"),
    },
    CourseAssets {
        proto: include_bytes!("assets/courses/course001/course"),
        course_data: include_bytes!("assets/courses/course001/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course001/course_data_sub.cdt"),
        thumbnail0: include_bytes!("assets/courses/course001/thumbnail0.tnl"),
        thumbnail1: include_bytes!("assets/courses/course001/thumbnail1.tnl"),
    },
    CourseAssets {
        proto: include_bytes!("assets/courses/course002/course"),
        course_data: include_bytes!("assets/courses/course002/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course002/course_data_sub.cdt"),
        thumbnail0: include_bytes!("assets/courses/course002/thumbnail0.tnl"),
        thumbnail1: include_bytes!("assets/courses/course002/thumbnail1.tnl"),
    },
    CourseAssets {
        proto: include_bytes!("assets/courses/course003/course"),
        course_data: include_bytes!("assets/courses/course003/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course003/course_data_sub.cdt"),
        thumbnail0: include_bytes!("assets/courses/course003/thumbnail0.tnl"),
        thumbnail1: include_bytes!("assets/courses/course003/thumbnail1.tnl"),
    },
    CourseAssets {
        proto: include_bytes!("assets/courses/course004/course"),
        course_data: include_bytes!("assets/courses/course004/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course004/course_data_sub.cdt"),
        thumbnail0: include_bytes!("assets/courses/course004/thumbnail0.tnl"),
        thumbnail1: include_bytes!("assets/courses/course004/thumbnail1.tnl"),
    },
    CourseAssets {
        proto: include_bytes!("assets/courses/course005/course"),
        course_data: include_bytes!("assets/courses/course005/course_data.cdt"),
        course_data_sub: include_bytes!("assets/courses/course005/course_data_sub.cdt"),
        thumbnail0: include_bytes!("assets/courses/course005/thumbnail0.tnl"),
        thumbnail1: include_bytes!("assets/courses/course005/thumbnail1.tnl"),
    },
];

#[test]
fn course_from_wii_u_files() {
    for course in COURSE_ASSETS.clone().iter_mut() {
        course_from_wii_u_file(course);
    }
}

fn course_from_wii_u_file(assets: &mut CourseAssets) {
    let mut course = Course::from_wii_u_files(
        assets.course_data,
        assets.course_data_sub,
        assets.thumbnail0,
        assets.thumbnail1,
    )
    .unwrap();
    let mut course_proto = Course::from_proto(assets.proto);

    let modified = course_proto.get_course_ref().modified;
    course_proto.set_modified((modified / 60) * 60);
    assert_eq!(
        course.get_course_ref().modified,
        course_proto.get_course_ref().modified
    );
    assert_eq!(
        course.get_course_ref().title,
        course_proto.get_course_ref().title
    );
    assert_eq!(
        course.get_course_ref().maker,
        course_proto.get_course_ref().maker
    );
    assert_eq!(
        course.get_course_ref().game_style,
        course_proto.get_course_ref().game_style
    );
    assert_eq!(
        course.get_course_ref().course_theme,
        course_proto.get_course_ref().course_theme
    );
    assert_eq!(
        course.get_course_ref().course_theme_sub,
        course_proto.get_course_ref().course_theme_sub
    );
    assert_eq!(
        course.get_course_ref().time,
        course_proto.get_course_ref().time
    );
    assert_eq!(
        course.get_course_ref().auto_scroll,
        course_proto.get_course_ref().auto_scroll
    );
    assert_eq!(
        course.get_course_ref().auto_scroll_sub,
        course_proto.get_course_ref().auto_scroll_sub
    );
    assert_eq!(
        course.get_course_ref().width,
        course_proto.get_course_ref().width
    );
    assert_eq!(
        course.get_course_ref().width_sub,
        course_proto.get_course_ref().width_sub
    );
    let course_tiles = &course.get_course_ref().tiles;
    let course_tiles_sub = &course.get_course_ref().tiles_sub;
    let course_proto_tiles = &course_proto.get_course_ref().tiles;
    let course_proto_tiles_sub = &course_proto.get_course_ref().tiles_sub;
    assert_eq!(course_tiles.len(), course_proto_tiles.len());
    assert_eq!(course_tiles_sub.len(), course_proto_tiles_sub.len());
    for i in 0..course_tiles.len() {
        assert_eq!(course_tiles[i], course_proto_tiles[i]);
    }
    for i in 0..course_tiles_sub.len() {
        assert_eq!(course_tiles_sub[i], course_proto_tiles_sub[i]);
    }
    let course_sounds = &course.get_course_ref().sounds;
    let course_sounds_sub = &course.get_course_ref().sounds_sub;
    let course_proto_sounds = &course_proto.get_course_ref().sounds;
    let course_proto_sounds_sub = &course_proto.get_course_ref().sounds_sub;
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

#[wasm_bindgen_test]
fn course_from_proto() {
    for course in COURSE_ASSETS.iter() {
        course_from_proto_once(course.proto);
    }
}

fn course_from_proto_once(asset: &[u8]) {
    let course = Course::from_proto(asset);

    assert_eq!(course, Course::from_js(course.to_js()));
}

#[wasm_bindgen_test]
fn course_from_boxed_proto() {
    for course in COURSE_ASSETS.iter() {
        course_from_boxed_proto_once(course.proto.to_vec().into_boxed_slice());
    }
}

fn course_from_boxed_proto_once(asset: Box<[u8]>) {
    let course = Course::from_boxed_proto(asset);

    assert_eq!(course, Course::from_js(course.to_js()));
}

#[wasm_bindgen_test]
fn course_to_proto() {
    for course in COURSE_ASSETS.iter() {
        course_to_proto_once(course.proto);
    }
}

fn course_to_proto_once(asset: &[u8]) {
    let course = Course::from_proto(asset);

    assert_eq!(course, Course::from_proto(&course.to_proto()),);
}
