//! A utility library for Super Mario Maker and Super Mario Maker 2 to read and manipulate game files.
//!
//! The library compiles to WebAssembly for the web or can be used as a standard Rust Crate.
//!
//! This library is used by my website [SMMDB](https://smmdb.ddns.net), which is the only platform, where you can share Super Mario Maker courses platform independently.
//! This is particularly useful for emulation and the 3DS, which is unable to download specific course files from the Nintendo servers.
//! Courses are serialized via Protocol Buffer.

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
#[cfg(all(feature = "save", not(target_arch = "wasm32")))]
pub mod save;
pub mod thumbnail2;

pub use course::*;
pub use course2::*;
pub(crate) use encryption::{decrypt, encrypt, fix_crc32};
pub use errors::{SmmdbError as Error, SmmdbResult as Result};
#[cfg(all(feature = "save", not(target_arch = "wasm32")))]
pub use save::*;
pub use thumbnail2::*;

#[cfg(target_arch = "wasm32")]
pub type JsResult<T> = core::result::Result<T, JsValue>;

cfg_if! {
    if #[cfg(target_arch = "wasm32")] {
        /// Setup panic hook for WebAssembly calls.
        /// This will forward Rust panics to console.error
        #[wasm_bindgen(js_name = setupPanicHook)]
        pub fn setup_panic_hook() {
            console_error_panic_hook::set_once();
        }
    }
}
