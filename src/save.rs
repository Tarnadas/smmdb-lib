use crate::{
    constants2::*,
    encryption::{decrypt, encrypt},
    errors::{SaveError, Smm2Error},
    fix_crc32,
    key_tables::*,
    Course2, Error, Result,
};

use arr_macro::arr;
use async_std::{
    fs::{remove_file, rename, File},
    prelude::*,
};
use std::{cell::Cell, path::PathBuf};

type Courses = [Option<Box<CourseEntry>>; 60];

#[derive(Clone, Debug)]
pub struct Save {
    path: PathBuf,
    save_file: Vec<u8>,
    own_courses: Courses,
    unknown_courses: Courses,
    downloaded_courses: Courses,
    pending_fs_operations: [Option<PendingFsOperation>; 180],
}

impl Save {
    pub async fn new<T: Into<PathBuf>>(path: T) -> Result<Save> {
        let path: PathBuf = path.into();

        let mut save_path = path.clone();
        save_path.push("save.dat");
        let mut file = File::open(save_path).await?;
        let mut save_file = vec![];
        file.read_to_end(&mut save_file).await?;
        decrypt(&mut save_file[0x10..], &SAVE_KEY_TABLE)?;
        save_file = save_file[..save_file.len() - 0x30].to_vec();

        let mut own_courses = arr![None; 60];
        let mut unknown_courses = arr![None; 60];
        let mut downloaded_courses = arr![None; 60];
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
            let mut course_file = File::open(course_data_path).await?;
            let mut course_data = vec![];
            course_file.read_to_end(&mut course_data).await?;

            let mut thumb_path = path.clone();
            thumb_path.push(format!("course_thumb_{:0>3}.btl", index));
            let mut thumb_file = File::open(thumb_path).await?;
            let mut thumb_data = vec![];
            thumb_file.read_to_end(&mut thumb_data).await?;

            let courses = match index {
                i if i < 60 => &mut own_courses,
                i if (60..120).contains(&i) => &mut unknown_courses,
                i if (120..180).contains(&i) => &mut downloaded_courses,
                _ => panic!(),
            };
            let course = Course2::from_switch_files(&mut course_data, Some(thumb_data), true);
            match course {
                Ok(course) => {
                    courses[index % 60] = Some(Box::new(CourseEntry::SavedCourse(
                        SavedCourse::new(*array_ref!(&save_file[..], offset, 8), course),
                    )));
                }
                Err(Error::Smm2Error(err)) => {
                    courses[index % 60] = Some(Box::new(CourseEntry::CorruptedCourse(err)));
                }
                Err(err) => return Err(err),
            }

            index += 1;
        }

        Ok(Save {
            path,
            save_file,
            own_courses,
            unknown_courses,
            downloaded_courses,
            pending_fs_operations: arr![None; 180],
        })
    }

    pub fn add_course(&mut self, mut index: u8, course: Course2) -> Result<()> {
        let courses = match index {
            i if i < 60 => &mut self.own_courses,
            i if (60..120).contains(&i) => &mut self.unknown_courses,
            i if (120..180).contains(&i) => &mut self.downloaded_courses,
            _ => return Err(SaveError::CourseIndexOutOfBounds(index).into()),
        };
        let offset = SAVE_COURSE_OFFSET as usize + 0x10 + index as usize * 8;
        self.save_file[offset + 1] = 1;
        let course = SavedCourse::new(*array_ref!(&self.save_file[..], offset, 8), course);

        self.pending_fs_operations[index as usize] = Some(PendingFsOperation::AddOrReplace(index));

        index %= 60;
        courses[index as usize] = Some(Box::new(CourseEntry::SavedCourse(course)));

        Ok(())
    }

    pub fn swap_course(&mut self, first: u8, second: u8) -> Result<()> {
        let courses_as_cell = [
            Cell::from_mut(&mut self.own_courses[..]).as_slice_of_cells(),
            Cell::from_mut(&mut self.unknown_courses[..]).as_slice_of_cells(),
            Cell::from_mut(&mut self.downloaded_courses[..]).as_slice_of_cells(),
        ];

        if first >= 180 {
            return Err(SaveError::CourseIndexOutOfBounds(first).into());
        }
        let first_course = &courses_as_cell[first as usize / 60][first as usize % 60];

        if second >= 180 {
            return Err(SaveError::CourseIndexOutOfBounds(second).into());
        }
        let second_course = &courses_as_cell[second as usize / 60][second as usize % 60];

        let first_offset = SAVE_COURSE_OFFSET as usize + 0x10 + first as usize * 8 + 1;
        let second_offset = SAVE_COURSE_OFFSET as usize + 0x10 + second as usize * 8 + 1;
        match (self.save_file[first_offset], self.save_file[second_offset]) {
            (1, 0) => {
                self.pending_fs_operations[first as usize] =
                    Some(PendingFsOperation::Move(first, second));
                self.save_file[first_offset] = 0;
                self.save_file[second_offset] = 1;
            }
            (0, 1) => {
                self.pending_fs_operations[first as usize] =
                    Some(PendingFsOperation::Move(second, first));
                self.save_file[first_offset] = 1;
                self.save_file[second_offset] = 0;
            }
            (1, 1) => {
                self.pending_fs_operations[first as usize] =
                    Some(PendingFsOperation::Swap(first, second))
            }
            (_, _) => return Err(SaveError::CourseNotFound(first).into()),
        }

        first_course.swap(second_course);

        Ok(())
    }

    pub fn remove_course(&mut self, mut index: u8) -> Result<()> {
        let courses = match index {
            i if i < 60 => &mut self.own_courses,
            i if (60..120).contains(&i) => &mut self.unknown_courses,
            i if (120..180).contains(&i) => &mut self.downloaded_courses,
            _ => return Err(SaveError::CourseIndexOutOfBounds(index).into()),
        };
        let offset = SAVE_COURSE_OFFSET as usize + 0x10 + index as usize * 8;
        self.save_file[offset + 1] = 0;

        self.pending_fs_operations[index as usize] = Some(PendingFsOperation::Remove(index));

        index %= 60;
        courses[index as usize] = None;

        Ok(())
    }

    pub async fn save(&mut self) -> Result<()> {
        let mut update_save = true;
        for i in 0..180 {
            if let Some(op) = self.pending_fs_operations[i].take() {
                op.run(
                    self.path.clone(),
                    &self.own_courses,
                    &self.unknown_courses,
                    &self.downloaded_courses,
                )
                .await?;
                update_save = true;
            }
        }
        if update_save {
            let offset = SAVE_COURSE_OFFSET as usize;
            fix_crc32(&mut self.save_file[offset..]);
            let mut save_data = self.save_file.clone();
            let aes_info = encrypt(&mut save_data[0x10..], &SAVE_KEY_TABLE);
            save_data.extend_from_slice(&aes_info);

            let mut save_path = self.path.clone();
            save_path.push("save.dat");
            let mut save_file = File::create(save_path).await?;
            save_file.write_all(&save_data).await?;
        }
        Ok(())
    }

    pub fn get_own_courses(&self) -> &Courses {
        &self.own_courses
    }

    pub fn get_unknown_courses(&self) -> &Courses {
        &self.unknown_courses
    }

    pub fn get_downloaded_courses(&self) -> &Courses {
        &self.downloaded_courses
    }
}

#[derive(Clone, Debug)]
pub enum CourseEntry {
    SavedCourse(SavedCourse),
    CorruptedCourse(Smm2Error),
}

#[derive(Clone, Debug, PartialEq)]
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

    pub fn get_index(&self) -> u8 {
        self.index
    }

    pub fn get_course(&self) -> &Course2 {
        &self.course
    }
}

#[derive(Clone, Debug)]
enum PendingFsOperation {
    AddOrReplace(u8),
    Swap(u8, u8),
    Move(u8, u8),
    Remove(u8),
}

impl PendingFsOperation {
    async fn run(
        self,
        path: PathBuf,
        own_courses: &Courses,
        unknown_courses: &Courses,
        downloaded_courses: &Courses,
    ) -> Result<()> {
        match self {
            Self::AddOrReplace(index) => {
                let course = match index {
                    i if i < 60 => own_courses[index as usize].as_ref().unwrap(),
                    i if (60..120).contains(&i) => {
                        unknown_courses[index as usize].as_ref().unwrap()
                    }
                    i if (120..180).contains(&i) => {
                        downloaded_courses[index as usize].as_ref().unwrap()
                    }
                    _ => return Err(SaveError::CourseIndexOutOfBounds(index).into()),
                };

                let mut course_path = path.clone();
                course_path.push(format!("course_data_{:0>3}.bcd", index));
                let mut course_file = File::create(course_path).await?;
                match &**course {
                    CourseEntry::SavedCourse(course) => {
                        let course = &course.course;
                        let mut course_data = course.get_course_data().to_vec();
                        Course2::encrypt(&mut course_data);
                        course_file.write_all(&course_data).await?;

                        let thumb_data = course.get_course_thumb().ok_or_else(|| -> Error {
                            SaveError::ThumbnailRequired(
                                course.get_course().get_header().get_title().to_string(),
                            )
                            .into()
                        })?;
                        let mut thumb_path = path.clone();
                        thumb_path.push(format!("course_thumb_{:0>3}.btl", index));
                        let mut thumb_file = File::create(thumb_path).await?;
                        thumb_file.write_all(thumb_data.get_encrypted()).await?;
                    }
                    CourseEntry::CorruptedCourse(err) => {
                        return Err(SaveError::CorruptedCourse(err.clone()).into())
                    }
                }
            }
            Self::Swap(first, second) => {
                // TODO only works for immediate swap
                let mut first_course_path = path.clone();
                let mut swap_course_path = first_course_path.clone();
                first_course_path.push(format!("course_data_{:0>3}.bcd", first));
                swap_course_path.push("swap.bcd");
                rename(first_course_path.clone(), swap_course_path.clone()).await?;

                let mut first_thumb_path = path.clone();
                let mut swap_thumb_path = first_thumb_path.clone();
                first_thumb_path.push(format!("course_thumb_{:0>3}.btl", first));
                swap_thumb_path.push("swap.btl");
                rename(first_thumb_path.clone(), swap_thumb_path.clone()).await?;

                let mut second_course_path = path.clone();
                second_course_path.push(format!("course_data_{:0>3}.bcd", second));
                rename(second_course_path.clone(), first_course_path).await?;

                let mut second_thumb_path = path.clone();
                second_thumb_path.push(format!("course_thumb_{:0>3}.btl", second));
                rename(second_thumb_path.clone(), first_thumb_path).await?;

                rename(swap_course_path, second_course_path).await?;
                rename(swap_thumb_path, second_thumb_path).await?;
            }
            Self::Move(start, end) => {
                let mut start_course_path = path.clone();
                let mut end_course_path = start_course_path.clone();
                start_course_path.push(format!("course_data_{:0>3}.bcd", start));
                end_course_path.push(format!("course_data_{:0>3}.bcd", end));
                rename(start_course_path, end_course_path).await?;

                let mut start_thumb_path = path.clone();
                let mut end_thumb_path = start_thumb_path.clone();
                start_thumb_path.push(format!("course_thumb_{:0>3}.btl", start));
                end_thumb_path.push(format!("course_thumb_{:0>3}.btl", end));
                rename(start_thumb_path, end_thumb_path).await?;
            }
            Self::Remove(index) => {
                let mut course_path = path.clone();
                course_path.push(format!("course_data_{:0>3}.bcd", index));
                remove_file(course_path).await?;

                let mut thumb_path = path.clone();
                thumb_path.push(format!("course_thumb_{:0>3}.btl", index));
                remove_file(thumb_path).await?;
            }
        }

        Ok(())
    }
}

#[cfg(test)]
mod test {
    use super::*;

    use crc::{Crc, CRC_32_ISO_HDLC};
    use fs_extra::dir::{copy, remove, CopyOptions};

    #[async_std::test]
    pub async fn test_save() -> anyhow::Result<()> {
        remove("./tests/assets/saves/smm2/tmp")?;
        let mut options = CopyOptions::new();
        options.copy_inside = true;
        options.overwrite = true;
        copy(
            "./tests/assets/saves/smm2/save1",
            "tests/assets/saves/smm2/tmp",
            &options,
        )?;
        let mut save = Save::new("./tests/assets/saves/smm2/tmp").await?;

        let file = include_bytes!("../tests/assets/saves/smm2/save1.zip");
        let courses = Course2::from_packed(file)?;
        save.add_course(0, courses[0].clone())?;
        save.add_course(1, courses[1].clone())?;
        save.add_course(2, courses[2].clone())?;
        save.add_course(5, courses[3].clone())?;
        save.add_course(6, courses[4].clone())?;
        save.add_course(9, courses[5].clone())?;
        save.add_course(12, courses[6].clone())?;
        save.remove_course(122)?;
        save.remove_course(126)?;
        save.save().await?;

        let offset = SAVE_COURSE_OFFSET as usize;
        let crc = Crc::<u32>::new(&CRC_32_ISO_HDLC);
        let checksum = crc.checksum(&save.save_file[offset + 0x10..]);
        let bytes: [u8; 4] = checksum.to_le().to_ne_bytes();
        assert_eq!(save.save_file[offset + 0x8], bytes[0]);
        assert_eq!(save.save_file[offset + 0x9], bytes[1]);
        assert_eq!(save.save_file[offset + 0xA], bytes[2]);
        assert_eq!(save.save_file[offset + 0xB], bytes[3]);
        Ok(())
    }
}
