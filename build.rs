extern crate protobuf_codegen_pure;

use protobuf_codegen_pure::Customize;
use std::fs::create_dir;
use std::path::Path;

const OUT_DIR: &str = "crate/src/proto";

fn main() {
    if !Path::new(OUT_DIR).exists() {
        create_dir(OUT_DIR).expect("Creating proto out dir failed");
    }
    protobuf_codegen_pure::run(protobuf_codegen_pure::Args {
        out_dir: OUT_DIR,
        input: &["proto/SMMCourse.proto", "proto/Sound.proto", "proto/Tile.proto"],
        includes: &["proto"],
        customize: Customize {
            ..Default::default()
        },
    }).expect("protoc");
}
