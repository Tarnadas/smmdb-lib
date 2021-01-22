#[derive(paperclip::actix::Apiv2Schema, Serialize, Deserialize)]
pub struct SMM2Course {
    pub version: u32,
    #[serde(skip)]
    pub unknown_fields: u32,
    pub asd: Asd,
}

#[derive(paperclip::actix::Apiv2Schema, Serialize, Deserialize)]
pub enum Asd {
    One = 0,
    Two = 1,
    Three = 2,
    Four = 3,
}
