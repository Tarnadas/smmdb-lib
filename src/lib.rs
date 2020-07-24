//! A utility library for Super Mario Maker and Super Mario Maker 2 to read and manipulate game files.
//!
//! The library compiles to WebAssembly for the web or can be used as a standard Rust Crate.
//!
//! This library is used by my website [SMMDB](https://smmdb.ddns.net), which is the only platform, where you can share Super Mario Maker courses platform independently.
//! This is particularly useful for emulation and the 3DS, which is unable to download specific course files from the Nintendo servers.
//! Courses are serialized via Protocol Buffer.

extern crate aes_soft as aes;

#[macro_use]
extern crate arrayref;

#[macro_use]
extern crate cfg_if;

#[macro_use]
extern crate failure;

#[macro_use]
extern crate serde_derive;

#[cfg(feature = "wasm")]
use wasm_bindgen::prelude::*;

pub mod constants;
pub mod constants2;
pub mod course;
pub mod course2;
mod encryption;
pub mod errors;
pub(crate) mod key_tables;
pub mod proto;
pub mod thumbnail2;

pub use course::*;
pub use course2::*;
pub(crate) use encryption::{decrypt, encrypt, fix_crc32};
pub use errors::*;
pub use thumbnail2::*;

cfg_if! {
    if #[cfg(feature = "wasm")] {
        extern crate console_error_panic_hook;
        use console_error_panic_hook::set_once as set_panic_hook;
    }
}

cfg_if! {
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

#[cfg(feature = "wasm")]
#[wasm_bindgen]
pub fn run() -> Result<(), JsValue> {
    set_panic_hook();

    let window = web_sys::window().expect("should have a Window");
    let document = window.document().expect("should have a Document");

    let p: web_sys::Node = document.create_element("p")?.into();
    p.set_text_content(Some("Hello from Rust, WebAssembly, and Webpack!"));

    let body = document.body().expect("should have a body");
    let body: &web_sys::Node = body.as_ref();
    body.append_child(&p)?;

    Ok(())
}
