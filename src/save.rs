use crate::{
    constants2::*,
    encryption::{decrypt, encrypt},
    errors::SaveError,
    fix_crc32,
    key_tables::*,
    Course2,
};

use arr_macro::arr;
use generic_array::GenericArray;
use std::{
    fs::File,
    io::{Read, Write},
    path::PathBuf,
};
use typenum::{U180, U60};

type Courses = GenericArray<Option<SavedCourse>, U60>;

#[derive(Debug)]
pub struct Save<'a> {
    path: PathBuf,
    save_file: Vec<u8>,
    own_courses: Courses,
    unknown_courses: Courses,
    downloaded_courses: Courses,
    pending_fs_operations: GenericArray<Option<PendingFsOperation<'a>>, U180>,
}

impl<'a> Save<'a> {
    pub fn new<T: Into<PathBuf>>(path: T) -> Result<Save<'a>, SaveError> {
        let path: PathBuf = path.into();

        let mut save_path = path.clone();
        save_path.push("save.dat");
        let mut file = File::open(save_path)?;
        let mut save_file = vec![];
        file.read_to_end(&mut save_file)?;
        decrypt(&mut save_file[0x10..], &SAVE_KEY_TABLE);

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

    pub fn add_course(&'a mut self, index: u8, course: Course2) -> Result<(), SaveError> {
        let courses = match index {
            i if i < 60 => &mut self.own_courses,
            i if i >= 60 && i < 120 => &mut self.unknown_courses,
            i if i >= 120 && i < 180 => &mut self.downloaded_courses,
            _ => return Err(SaveError::CourseIndexOutOfBounds(index)),
        };
        let offset = SAVE_COURSE_OFFSET as usize + 0x10 + index as usize * 8;
        self.save_file[offset + 1] = 1;
        let course = SavedCourse::new(array_ref!(&self.save_file[..], offset, 8).clone(), course);

        let index = index as usize % 60;
        courses[index] = Some(course);

        self.pending_fs_operations[index] =
            Some(PendingFsOperation::AddOrReplaceCourse(&courses[index]));

        Ok(())
    }

    pub fn remove_course(&mut self, mut index: u8) -> Result<(), SaveError> {
        let courses = match index {
            i if i < 60 => &mut self.own_courses,
            i if i >= 60 && i < 120 => &mut self.unknown_courses,
            i if i >= 120 && i < 180 => &mut self.downloaded_courses,
            _ => return Err(SaveError::CourseIndexOutOfBounds(index)),
        };
        let offset = SAVE_COURSE_OFFSET as usize + 0x10 + index as usize * 8;
        self.save_file[offset + 1] = 0;

        index = index % 60;
        courses[index as usize] = None;

        self.pending_fs_operations[index as usize] = Some(PendingFsOperation::RemoveCourse(index));

        Ok(())
    }

    pub fn save(&mut self) -> Result<(), SaveError> {
        let mut update_save = false;
        for i in 0..180 {
            if let Some(op) = self.pending_fs_operations[i].take() {
                op.run()?;
                update_save = true;
            }
        }
        if update_save {
            let offset = SAVE_COURSE_OFFSET as usize + 0x10;
            let end = self.save_file.len() - 0x30;
            fix_crc32(&mut self.save_file[offset..end]);
            encrypt(&mut self.save_file[0x10..], &SAVE_KEY_TABLE, true);

            let mut save_path = self.path.clone();
            save_path.push("save.dat");
            let mut save_file = File::create(save_path)?;
            save_file.write_all(&self.save_file)?;
            // TODO
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
enum PendingFsOperation<'a> {
    AddOrReplaceCourse(&'a Option<SavedCourse>),
    RemoveCourse(u8),
}

impl<'a> PendingFsOperation<'a> {
    fn run(self) -> Result<(), SaveError> {
        match self {
            Self::AddOrReplaceCourse(course) => {
                // TODO
            }
            Self::RemoveCourse(index) => {
                // TODO
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;

    use std::io::Write;

    #[test]
    fn test_save() {
        let save = Save::new("./tests/assets/saves/smm2/save1").unwrap();
        // let save = Save::new("/home/marior/.local/share/yuzu/nand/user/save/0000000000000000/FDD588AE7826C7A9A70AE93C12A4E9CE/01009B90006DC000");
        // dbg!(&save);
        let mut file = File::create("./save.dat").unwrap();
        file.write_all(&save.save_file).unwrap();
    }
}
