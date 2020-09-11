//! A utility library for Super Mario Maker and Super Mario Maker 2 to read and manipulate game files.
//!
//! The library compiles to WebAssembly for the web or can be used as a standard Rust Crate.
//!
//! This library is used by my website [SMMDB](https://smmdb.ddns.net), which is the only platform, where you can share Super Mario Maker courses platform independently.
//! This is particularly useful for emulation and the 3DS, which is unable to download specific course files from the Nintendo servers.
//! Courses are serialized via Protocol Buffer.

#![feature(async_closure)]
#![feature(custom_test_frameworks)]
#![feature(fn_traits)]
#![feature(future_readiness_fns)]
#![test_runner(test_runner)]

extern crate aes_soft as aes;

#[macro_use]
extern crate arrayref;

#[macro_use]
extern crate cfg_if;

#[cfg_attr(feature = "with-serde", macro_use)]
extern crate serde_derive;

#[cfg(target_arch = "wasm32")]
use wasm_bindgen::prelude::*;

pub mod constants;
pub mod constants2;
pub mod course;
pub mod course2;
mod encryption;
pub mod errors;
pub(crate) mod key_tables;
pub mod proto;
#[cfg(feature = "save")]
pub mod save;
pub mod thumbnail2;

pub use course::*;
pub use course2::*;
pub(crate) use encryption::{decrypt, encrypt, fix_crc32};
pub use errors::SmmdbError as Error;
#[cfg(feature = "save")]
pub use save::*;
pub use thumbnail2::*;

cfg_if! {
    if #[cfg(target_arch = "wasm32")] {
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

#[cfg(target_arch = "wasm32")]
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

#[cfg(feature = "save")]
#[cfg(test)]
pub struct Test {
    name: &'static str,
    test: &'static dyn Fn() -> std::pin::Pin<
        Box<dyn std::future::Future<Output = Result<(), Error>>>,
    >,
}

#[cfg(feature = "save")]
#[cfg(test)]
impl Test {
    fn name(&self) -> &str {
        self.name
    }

    fn run(&self) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<(), Error>>>> {
        self.test.call(())
    }
}

#[cfg(feature = "save")]
#[cfg(test)]
fn test_runner(test_cases: &[&Test]) {
    use async_std::task;
    use colored::*;
    use fs_extra::dir::remove;

    task::block_on(async {
        println!("Custom Test Framework running {} tests", test_cases.len());
        for test_case in test_cases {
            print!("test {} ... ", test_case.name());
            if let Err(err) = test_case.run().await {
                remove("./tests/assets/saves/smm2/tmp").unwrap();
                panic!("{:?}", err);
                // TODO collect errors
            }
            println!("{}", "ok".green());
        }
        remove("./tests/assets/saves/smm2/tmp").unwrap();
    });
}

#[cfg(not(feature = "save"))]
#[cfg(test)]
fn test_runner(_: &[&dyn Fn()]) {}
