extern crate protobuf_codegen_pure;

use protobuf_codegen_pure::{Codegen, Customize};
use std::fs::create_dir;
use std::path::Path;

const OUT_DIR: &str = "src/proto";

fn main() {
    if !Path::new(OUT_DIR).exists() {
        create_dir(OUT_DIR).expect("Creating proto out dir failed");
    }
    #[allow(unused_mut)]
    let mut customize = Customize {
        serde_derive: Some(true),
        carllerche_bytes_for_bytes: Some(true),
        ..Default::default()
    };
    cfg_if::cfg_if! {
        if #[cfg(feature = "actix-paperclip")] {
            customize.custom_derive = Some(vec!["paperclip::actix::Apiv2Schema".to_string()]);
            // customize.custom_use = Some(vec!["paperclip::actix::Apiv2Schema".to_string()]);
        }
    }
    Codegen::new()
        .out_dir(OUT_DIR)
        .inputs(&[
            "proto/SMMCourse.proto",
            "proto/SMM2Course.proto",
            "proto/Sound.proto",
            "proto/Tile.proto",
        ])
        .include("proto")
        .customize(customize)
        .run()
        .expect("protoc failed");
}
