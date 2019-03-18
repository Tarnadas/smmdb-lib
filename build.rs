extern crate protobuf_codegen_pure;

use protobuf_codegen_pure::{Args, Customize, run};
use std::fs::create_dir;
use std::path::Path;

const OUT_DIR: &str = "crate/src/proto";

fn main() {
    if !Path::new(OUT_DIR).exists() {
        create_dir(OUT_DIR).expect("Creating proto out dir failed");
    }
    run(Args {
        out_dir: OUT_DIR,
        input: &["proto/SMMCourse.proto", "proto/Sound.proto", "proto/Tile.proto"],
        includes: &["proto"],
        customize: Customize {
            serde_derive: Some(true),
            carllerche_bytes_for_bytes: Some(true),
            ..Default::default()
        },
    }).expect("protoc");
}
