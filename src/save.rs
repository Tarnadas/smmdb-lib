use crate::{
    constants2::*,
    encryption::{decrypt, encrypt},
    errors::SaveError,
    fix_crc32,
    key_tables::*,
    Course2, Error,
};

use arr_macro::arr;
use generic_array::GenericArray;
use std::{
    fs::{remove_file, File},
    io::{Read, Write},
    path::PathBuf,
};
use typenum::{U180, U60};

type Courses = GenericArray<Option<SavedCourse>, U60>;

#[derive(Debug)]
pub struct Save {
    path: PathBuf,
    save_file: Vec<u8>,
    own_courses: Courses,
    unknown_courses: Courses,
    downloaded_courses: Courses,
    pending_fs_operations: GenericArray<Option<PendingFsOperation>, U180>,
}

impl Save {
    pub fn new<T: Into<PathBuf>>(path: T) -> Result<Save, Error> {
        let path: PathBuf = path.into();

        let mut save_path = path.clone();
        save_path.push("save.dat");
        let mut file = File::open(save_path)?;
        let mut save_file = vec![];
        file.read_to_end(&mut save_file)?;
        decrypt(&mut save_file[0x10..], &SAVE_KEY_TABLE);
        save_file = save_file[..save_file.len() - 0x30].to_vec();

        let mut own_courses = GenericArray::clone_from_slice(&arr![None; 60]);
        let mut unknown_courses = GenericArray::clone_from_slice(&arr![None; 60]);
        let mut downloaded_courses = GenericArray::clone_from_slice(&arr![None; 60]);
        let mut index = 0;
        let offset = SAVE_COURSE_OFFSET as usize + 0x10;
        while index < 180 {
            let offset: usize = offset + index * 8;
            if save_file[offset + 1] == 0 {
                index += 1;
                continue;
            }

            let mut course_data_path = path.clone();
            course_data_path.push(format!("course_data_{:0>3}.bcd", index));
            let mut course_file = File::open(course_data_path)?;
            let mut course_data = vec![];
            course_file.read_to_end(&mut course_data)?;

            let mut thumb_path = path.clone();
            thumb_path.push(format!("course_thumb_{:0>3}.btl", index));
            let mut thumb_file = File::open(thumb_path)?;
            let mut thumb_data = vec![];
            thumb_file.read_to_end(&mut thumb_data)?;

            let courses: &mut Courses;
            match index {
                i if i < 60 => courses = &mut own_courses,
                i if i >= 60 && i < 120 => courses = &mut unknown_courses,
                i if i >= 120 && i < 180 => courses = &mut downloaded_courses,
                _ => panic!(),
            }
            courses[index % 60] = Some(SavedCourse::new(
                array_ref!(&save_file[..], offset, 8).clone(),
                Course2::from_switch_files(course_data, Some(thumb_data), true)?,
            ));

            index += 1;
        }

        Ok(Save {
            path,
            save_file,
            own_courses,
            unknown_courses,
            downloaded_courses,
            pending_fs_operations: GenericArray::clone_from_slice(&arr![None; 180]),
        })
    }

    pub fn add_course(&mut self, mut index: u8, course: Course2) -> Result<(), Error> {
        let courses = match index {
            i if i < 60 => &mut self.own_courses,
            i if i >= 60 && i < 120 => &mut self.unknown_courses,
            i if i >= 120 && i < 180 => &mut self.downloaded_courses,
            _ => return Err(SaveError::CourseIndexOutOfBounds(index).into()),
        };
        let offset = SAVE_COURSE_OFFSET as usize + 0x10 + index as usize * 8;
        self.save_file[offset + 1] = 1;
        let course = SavedCourse::new(array_ref!(&self.save_file[..], offset, 8).clone(), course);

        self.pending_fs_operations[index as usize] =
            Some(PendingFsOperation::AddOrReplaceCourse(index));

        index = index % 60;
        courses[index as usize] = Some(course);

        Ok(())
    }

    pub fn remove_course(&mut self, mut index: u8) -> Result<(), Error> {
        let courses = match index {
            i if i < 60 => &mut self.own_courses,
            i if i >= 60 && i < 120 => &mut self.unknown_courses,
            i if i >= 120 && i < 180 => &mut self.downloaded_courses,
            _ => return Err(SaveError::CourseIndexOutOfBounds(index).into()),
        };
        let offset = SAVE_COURSE_OFFSET as usize + 0x10 + index as usize * 8;
        self.save_file[offset + 1] = 0;

        self.pending_fs_operations[index as usize] = Some(PendingFsOperation::RemoveCourse(index));

        index = index % 60;
        courses[index as usize] = None;

        Ok(())
    }

    pub fn save(&mut self) -> Result<(), Error> {
        let mut update_save = true;
        for i in 0..180 {
            if let Some(op) = self.pending_fs_operations[i].take() {
                op.run(
                    &self.path,
                    &self.own_courses,
                    &self.unknown_courses,
                    &self.downloaded_courses,
                )?;
                update_save = true;
            }
        }
        if update_save {
            let offset = SAVE_COURSE_OFFSET as usize;
            fix_crc32(&mut self.save_file[offset..]);
            let mut save_data = self.save_file.clone();
            let aes_info = encrypt(&mut save_data[0x10..], &SAVE_KEY_TABLE, false).unwrap();
            save_data.extend_from_slice(&aes_info);

            let mut save_path = self.path.clone();
            save_path.push("save.dat");
            dbg!(&save_path);
            let mut save_file = File::create(save_path)?;
            save_file.write_all(&save_data)?;
        }
        Ok(())
    }
}

#[derive(Clone, Debug)]
pub struct SavedCourse {
    index: u8,
    exists: u8,
    buf: [u8; 8],
    course: Course2,
}

impl SavedCourse {
    fn new(buf: [u8; 8], course: Course2) -> SavedCourse {
        SavedCourse {
            index: buf[0],
            exists: buf[1],
            buf,
            course,
        }
    }
}

#[derive(Clone, Debug)]
enum PendingFsOperation {
    AddOrReplaceCourse(u8),
    RemoveCourse(u8),
}

impl PendingFsOperation {
    fn run(
        self,
        path: &PathBuf,
        own_courses: &Courses,
        unknown_courses: &Courses,
        downloaded_courses: &Courses,
    ) -> Result<(), Error> {
        match self {
            Self::AddOrReplaceCourse(index) => {
                let course = match index {
                    i if i < 60 => own_courses[index as usize].as_ref().unwrap(),
                    i if i >= 60 && i < 120 => unknown_courses[index as usize].as_ref().unwrap(),
                    i if i >= 120 && i < 180 => {
                        downloaded_courses[index as usize].as_ref().unwrap()
                    }
                    _ => return Err(SaveError::CourseIndexOutOfBounds(index).into()),
                };

                let mut course_path = path.clone();
                course_path.push(format!("course_data_{:0>3}.bcd", index));
                let mut course_file = File::create(course_path)?;
                let mut course_data = course.course.get_course_data().clone();
                Course2::encrypt(&mut course_data);
                course_file.write_all(&course_data)?;

                let thumb_data = course.course.get_course_thumb().ok_or_else(|| -> Error {
                    SaveError::ThumbnailRequired(
                        course
                            .course
                            .get_course()
                            .get_header()
                            .get_title()
                            .to_string(),
                    )
                    .into()
                })?;
                let mut thumb_path = path.clone();
                thumb_path.push(format!("course_thumb_{:0>3}.btl", index));
                let mut thumb_file = File::create(thumb_path)?;
                thumb_file.write_all(thumb_data.get_encrypted())?;
            }
            Self::RemoveCourse(index) => {
                let mut course_path = path.clone();
                course_path.push(format!("course_data_{:0>3}.bcd", index));
                remove_file(course_path)?;

                let mut thumb_path = path.clone();
                thumb_path.push(format!("course_thumb_{:0>3}.btl", index));
                remove_file(thumb_path)?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;

    use fs_extra::dir::{copy, CopyOptions};

    #[test_case]
    fn test_save() -> Result<(), Error> {
        let mut options = CopyOptions::new();
        options.copy_inside = true;
        options.overwrite = true;
        copy(
            "./tests/assets/saves/smm2/save1",
            "tests/assets/saves/smm2/tmp",
            &options,
        )
        .unwrap();
        let mut save = Save::new("./tests/assets/saves/smm2/tmp")?;

        let file = include_bytes!("../tests/assets/saves/smm2/save1.zip");
        let courses = Course2::from_packed(file).unwrap();
        save.add_course(0, courses[0].clone()).unwrap();
        save.add_course(1, courses[1].clone()).unwrap();
        save.add_course(2, courses[2].clone()).unwrap();
        save.add_course(5, courses[3].clone()).unwrap();
        save.add_course(6, courses[4].clone()).unwrap();
        save.add_course(9, courses[5].clone()).unwrap();
        save.add_course(12, courses[6].clone()).unwrap();
        save.remove_course(122).unwrap();
        save.remove_course(126).unwrap();
        save.save()?;

        let offset = SAVE_COURSE_OFFSET as usize;
        let checksum = crc::crc32::checksum_ieee(&save.save_file[offset + 0x10..]);
        let bytes: [u8; 4] = unsafe { std::mem::transmute(checksum.to_le()) };
        assert_eq!(save.save_file[offset + 0x8], bytes[0]);
        assert_eq!(save.save_file[offset + 0x9], bytes[1]);
        assert_eq!(save.save_file[offset + 0xA], bytes[2]);
        assert_eq!(save.save_file[offset + 0xB], bytes[3]);

        Ok(())
    }
}
