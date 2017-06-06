## Classes

<dl>
<dt><a href="#Course">Course</a></dt>
<dd></dd>
<dt><a href="#Save">Save</a></dt>
<dd></dd>
<dt><a href="#Tnl">Tnl</a></dt>
<dd></dd>
<dt><a href="#Jpeg">Jpeg</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#loadSave">loadSave(pathToSave)</a> ⇒ <code><a href="#Save">Promise.&lt;Save&gt;</a></code></dt>
<dd><p>Loads a save from fs</p>
</dd>
<dt><a href="#loadSaveSync">loadSaveSync(pathToSave)</a> ⇒ <code><a href="#Save">Save</a></code></dt>
<dd><p>Synchronous version of <a href="#loadSave">loadSave</a></p>
</dd>
<dt><a href="#loadCourse">loadCourse(coursePath, [courseId])</a> ⇒ <code><a href="#Course">Promise.&lt;Course&gt;</a></code></dt>
<dd><p>Loads a course from fs</p>
</dd>
<dt><a href="#loadCourseSync">loadCourseSync(coursePath, [courseId])</a> ⇒ <code><a href="#Course">Course</a></code></dt>
<dd><p>Synchronous version of <a href="#loadCourse">loadCourse</a></p>
</dd>
<dt><a href="#decompress">decompress(filePath)</a> ⇒ <code>Promise.&lt;Array.&lt;Course&gt;&gt;</code></dt>
<dd><p>Decompresses a file and loads all included courses into an array</p>
</dd>
<dt><a href="#deserialize">deserialize(buffer)</a> ⇒ <code><a href="#Course">Promise.&lt;Course&gt;</a></code></dt>
<dd><p>Deserializes a course object with compliance to <a href="https://github.com/Tarnadas/smm-protobuf">https://github.com/Tarnadas/smm-protobuf</a></p>
</dd>
<dt><a href="#loadImage">loadImage(pathToFile)</a> ⇒ <code><a href="#Tnl">Tnl</a></code> | <code><a href="#Jpeg">Jpeg</a></code></dt>
<dd><p>Load JPEG or TNL image</p>
</dd>
</dl>

<a name="Course"></a>

## Course
**Kind**: global class  

* [Course](#Course)
    * [new Course()](#new_Course_new)
    * [.title](#Course+title) : <code>string</code>
    * [.maker](#Course+maker) : <code>string</code>
    * [.gameStyle](#Course+gameStyle) : <code>number</code>
    * [.courseTheme](#Course+courseTheme) : <code>number</code>
    * [.courseThemeSub](#Course+courseThemeSub) : <code>number</code>
    * [.time](#Course+time) : <code>number</code>
    * [.autoScroll](#Course+autoScroll) : <code>number</code>
    * [.autoScrollSub](#Course+autoScrollSub) : <code>number</code>
    * [.width](#Course+width) : <code>number</code>
    * [.widthSub](#Course+widthSub) : <code>number</code>
    * [.blocks](#Course+blocks) : <code>Array.&lt;Block&gt;</code>
    * [.blocksSub](#Course+blocksSub) : <code>Array.&lt;Block&gt;</code>
    * [.sounds](#Course+sounds) : <code>Array.&lt;Sound&gt;</code>
    * [.soundsSub](#Course+soundsSub) : <code>Array.&lt;Sound&gt;</code>
    * [.writeToSave(id, pathToCourse)](#Course+writeToSave)
    * [.writeCrc(writeToFs)](#Course+writeCrc) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.setTitle(title, [writeCrc])](#Course+setTitle) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.setMaker(makerName, [writeCrc])](#Course+setMaker) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.loadTnl()](#Course+loadTnl) ⇒ [<code>Array.&lt;Tnl&gt;</code>](#Tnl)
    * [.loadThumbnail()](#Course+loadThumbnail) ⇒ <code>null</code>
    * [.loadThumbnailSync()](#Course+loadThumbnailSync)
    * [.setThumbnail(pathToThumbnail)](#Course+setThumbnail) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.isThumbnailBroken()](#Course+isThumbnailBroken) ⇒ <code>Promise.&lt;boolean&gt;</code>
    * [.writeThumbnail()](#Course+writeThumbnail) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.exportThumbnail()](#Course+exportThumbnail) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.exportThumbnailSync()](#Course+exportThumbnailSync)
    * [.serialize()](#Course+serialize) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.decompress(filePath)](#Course+decompress) ⇒ [<code>Array.&lt;Course&gt;</code>](#Course)
    * [.serializeGzipped()](#Course+serializeGzipped) ⇒ <code>Promise.&lt;Buffer&gt;</code>
    * [.deserialize(buffer)](#Course+deserialize) ⇒ [<code>Promise.&lt;Course&gt;</code>](#Course)

<a name="new_Course_new"></a>

### new Course()
Represents a Super Mario Maker course

<a name="Course+title"></a>

### course.title : <code>string</code>
Title of course

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+maker"></a>

### course.maker : <code>string</code>
Maker name

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+gameStyle"></a>

### course.gameStyle : <code>number</code>
Game style of course

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+courseTheme"></a>

### course.courseTheme : <code>number</code>
Course theme

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+courseThemeSub"></a>

### course.courseThemeSub : <code>number</code>
Course theme sub

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+time"></a>

### course.time : <code>number</code>
Completion time

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+autoScroll"></a>

### course.autoScroll : <code>number</code>
Course auto scroll

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+autoScrollSub"></a>

### course.autoScrollSub : <code>number</code>
CourseSub auto scroll

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+width"></a>

### course.width : <code>number</code>
Course width

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+widthSub"></a>

### course.widthSub : <code>number</code>
CourseSub width

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+blocks"></a>

### course.blocks : <code>Array.&lt;Block&gt;</code>
Blocks of main course

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+blocksSub"></a>

### course.blocksSub : <code>Array.&lt;Block&gt;</code>
Blocks of sub course

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+sounds"></a>

### course.sounds : <code>Array.&lt;Sound&gt;</code>
Course sounds

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+soundsSub"></a>

### course.soundsSub : <code>Array.&lt;Sound&gt;</code>
Course sounds

**Kind**: instance property of [<code>Course</code>](#Course)  
<a name="Course+writeToSave"></a>

### course.writeToSave(id, pathToCourse)
Writes course to fs inside save folder.
This function should not be called directly. Instead call save.addCourse(course)

**Kind**: instance method of [<code>Course</code>](#Course)  

| Param | Type | Description |
| --- | --- | --- |
| id | <code>number</code> | course ID inside save |
| pathToCourse | <code>string</code> | path to course on fs |

<a name="Course+writeCrc"></a>

### course.writeCrc(writeToFs) ⇒ <code>Promise.&lt;void&gt;</code>
Writes crc checksum of course to fs

**Kind**: instance method of [<code>Course</code>](#Course)  

| Param | Type | Description |
| --- | --- | --- |
| writeToFs | <code>boolean</code> | should file on fs be overwritten with new CRC checksum |

<a name="Course+setTitle"></a>

### course.setTitle(title, [writeCrc]) ⇒ <code>Promise.&lt;void&gt;</code>
Sets a new title for this course and optionally recalculates crc checksum

**Kind**: instance method of [<code>Course</code>](#Course)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| title | <code>string</code> |  | new title |
| [writeCrc] | <code>boolean</code> | <code>true</code> | should crc checksum be recalculated |

<a name="Course+setMaker"></a>

### course.setMaker(makerName, [writeCrc]) ⇒ <code>Promise.&lt;void&gt;</code>
Sets a new maker for this course and optionally recalculates crc checksum

**Kind**: instance method of [<code>Course</code>](#Course)  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| makerName | <code>string</code> |  | new maker |
| [writeCrc] | <code>boolean</code> | <code>true</code> | should crc checksum be recalculated |

<a name="Course+loadTnl"></a>

### course.loadTnl() ⇒ [<code>Array.&lt;Tnl&gt;</code>](#Tnl)
Load TNL thumbnails from fs.
Implicitly called by constructor

**Kind**: instance method of [<code>Course</code>](#Course)  
<a name="Course+loadThumbnail"></a>

### course.loadThumbnail() ⇒ <code>null</code>
Convert TNL thumbnails to JPEG thumbnails

**Kind**: instance method of [<code>Course</code>](#Course)  
<a name="Course+loadThumbnailSync"></a>

### course.loadThumbnailSync()
Synchronous version of [loadThumbnail](#Course+loadThumbnail)

**Kind**: instance method of [<code>Course</code>](#Course)  
<a name="Course+setThumbnail"></a>

### course.setThumbnail(pathToThumbnail) ⇒ <code>Promise.&lt;void&gt;</code>
Change thumbnail of this course

**Kind**: instance method of [<code>Course</code>](#Course)  

| Param | Type | Description |
| --- | --- | --- |
| pathToThumbnail | <code>string</code> | path to new thumbnail on fs |

<a name="Course+isThumbnailBroken"></a>

### course.isThumbnailBroken() ⇒ <code>Promise.&lt;boolean&gt;</code>
Check if this course's thumbnail is broken

**Kind**: instance method of [<code>Course</code>](#Course)  
<a name="Course+writeThumbnail"></a>

### course.writeThumbnail() ⇒ <code>Promise.&lt;void&gt;</code>
Write TNL thumbnail to fs

**Kind**: instance method of [<code>Course</code>](#Course)  
**Throws**:

- <code>Error</code> course must be part of a [Save](#Save)

<a name="Course+exportThumbnail"></a>

### course.exportThumbnail() ⇒ <code>Promise.&lt;void&gt;</code>
Write JPEG thumbnail to fs

**Kind**: instance method of [<code>Course</code>](#Course)  
**Throws**:

- <code>Error</code> course must be part of a [Save](#Save)
- <code>Error</code> thumbnail must not be null

<a name="Course+exportThumbnailSync"></a>

### course.exportThumbnailSync()
Synchronous version of [exportThumbnail](#Course+exportThumbnail)

**Kind**: instance method of [<code>Course</code>](#Course)  
**Throws**:

- <code>Error</code> course must be part of a [Save](#Save)
- <code>Error</code> thumbnail must not be null

<a name="Course+serialize"></a>

### course.serialize() ⇒ <code>Promise.&lt;Buffer&gt;</code>
Serializes a course object with compliance to [https://github.com/Tarnadas/smm-protobuf](https://github.com/Tarnadas/smm-protobuf)

**Kind**: instance method of [<code>Course</code>](#Course)  
<a name="Course+decompress"></a>

### course.decompress(filePath) ⇒ [<code>Array.&lt;Course&gt;</code>](#Course)
Decompresses a file and loads all included courses into an array

**Kind**: instance method of [<code>Course</code>](#Course)  

| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> | path of compressed file |

<a name="Course+serializeGzipped"></a>

### course.serializeGzipped() ⇒ <code>Promise.&lt;Buffer&gt;</code>
Serializes and gzips

**Kind**: instance method of [<code>Course</code>](#Course)  
<a name="Course+deserialize"></a>

### course.deserialize(buffer) ⇒ [<code>Promise.&lt;Course&gt;</code>](#Course)
Deserializes a course object with compliance to [https://github.com/Tarnadas/smm-protobuf](https://github.com/Tarnadas/smm-protobuf)

**Kind**: instance method of [<code>Course</code>](#Course)  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> \| <code>Uint8Array</code> | Node Buffer or Uint8Array to be converted to a [Course](#Course) |

<a name="Save"></a>

## Save
**Kind**: global class  

* [Save](#Save)
    * [new Save()](#new_Save_new)
    * [.pathToSave](#Save+pathToSave) : <code>string</code>
    * [.data](#Save+data) : <code>Buffer</code>
    * [.courses](#Save+courses) : <code>Object.&lt;string, Course&gt;</code>
    * [.writeCrc()](#Save+writeCrc) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.writeCrcSync()](#Save+writeCrcSync)
    * [.reorder()](#Save+reorder) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.reorderSync()](#Save+reorderSync)
    * [.exportThumbnail()](#Save+exportThumbnail) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.exportThumbnailSync()](#Save+exportThumbnailSync)
    * [.importThumbnail()](#Save+importThumbnail) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.unlockAmiibos()](#Save+unlockAmiibos) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.loadCourses()](#Save+loadCourses) ⇒ <code>Object.&lt;string, Course&gt;</code>
    * [.loadCoursesSync()](#Save+loadCoursesSync) ⇒ <code>Object.&lt;string, Course&gt;</code>
    * [.addCourse(course)](#Save+addCourse) ⇒ <code>number</code>
    * [.addCourseFromFs(coursePath)](#Save+addCourseFromFs) ⇒ <code>number</code>
    * [.deleteCourse(courseId)](#Save+deleteCourse) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="new_Save_new"></a>

### new Save()
Represents a Super Mario Maker save

<a name="Save+pathToSave"></a>

### save.pathToSave : <code>string</code>
Path to save

**Kind**: instance property of [<code>Save</code>](#Save)  
<a name="Save+data"></a>

### save.data : <code>Buffer</code>
Node buffer of save.dat file

**Kind**: instance property of [<code>Save</code>](#Save)  
<a name="Save+courses"></a>

### save.courses : <code>Object.&lt;string, Course&gt;</code>
Courses belonging to this save

**Kind**: instance property of [<code>Save</code>](#Save)  
<a name="Save+writeCrc"></a>

### save.writeCrc() ⇒ <code>Promise.&lt;void&gt;</code>
Writes crc checksum of save.dat

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+writeCrcSync"></a>

### save.writeCrcSync()
Synchronous version of [writeCrc](#Save+writeCrc)

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+reorder"></a>

### save.reorder() ⇒ <code>Promise.&lt;void&gt;</code>
Reorders course folders to match actual in game appearance

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+reorderSync"></a>

### save.reorderSync()
Synchronous version of [reorder](#Save+reorder)

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+exportThumbnail"></a>

### save.exportThumbnail() ⇒ <code>Promise.&lt;void&gt;</code>
Exports all course thumbnails as JPEG within course folders

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+exportThumbnailSync"></a>

### save.exportThumbnailSync()
Synchronous version of [exportThumbnail](#Save+exportThumbnail)

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+importThumbnail"></a>

### save.importThumbnail() ⇒ <code>Promise.&lt;void&gt;</code>
Imports all JPEG thumbnails as TNL within course folders

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+unlockAmiibos"></a>

### save.unlockAmiibos() ⇒ <code>Promise.&lt;void&gt;</code>
Unlocks Amiibos for this save

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+loadCourses"></a>

### save.loadCourses() ⇒ <code>Object.&lt;string, Course&gt;</code>
Load courses and store them in [courses](#Save+courses)

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+loadCoursesSync"></a>

### save.loadCoursesSync() ⇒ <code>Object.&lt;string, Course&gt;</code>
Synchronous version of [loadCourses](#Save+loadCourses)

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+addCourse"></a>

### save.addCourse(course) ⇒ <code>number</code>
Stores a course in this save

**Kind**: instance method of [<code>Save</code>](#Save)  
**Returns**: <code>number</code> - course slot ID  
**Throws**:

- <code>Error</code> Save must have an empty slot


| Param | Type | Description |
| --- | --- | --- |
| course | [<code>Course</code>](#Course) | course to be stored in save |

<a name="Save+addCourseFromFs"></a>

### save.addCourseFromFs(coursePath) ⇒ <code>number</code>
Stores a course from fs in this save

**Kind**: instance method of [<code>Save</code>](#Save)  
**Returns**: <code>number</code> - course slot ID  
**Throws**:

- <code>Error</code> courseDataPath must exist
- <code>Error</code> Save must have an empty slot


| Param | Type | Description |
| --- | --- | --- |
| coursePath | <code>string</code> | course to be stored in save |

<a name="Save+deleteCourse"></a>

### save.deleteCourse(courseId) ⇒ <code>Promise.&lt;void&gt;</code>
Deletes a course from this save

**Kind**: instance method of [<code>Save</code>](#Save)  
**Throws**:

- <code>Error</code> course with courseId must exist


| Param | Type | Description |
| --- | --- | --- |
| courseId | <code>number</code> | ID of course to be deleted |

<a name="Tnl"></a>

## Tnl
**Kind**: global class  

* [Tnl](#Tnl)
    * [new Tnl()](#new_Tnl_new)
    * [.toJpeg()](#Tnl+toJpeg) ⇒ <code>Promise.&lt;(Buffer\|ArrayBuffer)&gt;</code>
    * [.toJpegSync()](#Tnl+toJpegSync) ⇒ <code>Buffer</code> \| <code>ArrayBuffer</code>
    * [.isBroken()](#Tnl+isBroken) ⇒ <code>Promise.&lt;boolean&gt;</code>

<a name="new_Tnl_new"></a>

### new Tnl()
A TNL file

<a name="Tnl+toJpeg"></a>

### tnl.toJpeg() ⇒ <code>Promise.&lt;(Buffer\|ArrayBuffer)&gt;</code>
Convert to JPEG

**Kind**: instance method of [<code>Tnl</code>](#Tnl)  
<a name="Tnl+toJpegSync"></a>

### tnl.toJpegSync() ⇒ <code>Buffer</code> \| <code>ArrayBuffer</code>
Synchronous version of [Tnl.toJpeg](Tnl.toJpeg)

**Kind**: instance method of [<code>Tnl</code>](#Tnl)  
<a name="Tnl+isBroken"></a>

### tnl.isBroken() ⇒ <code>Promise.&lt;boolean&gt;</code>
Check if TNL thumbnail is broken and needs fix

**Kind**: instance method of [<code>Tnl</code>](#Tnl)  
<a name="Jpeg"></a>

## Jpeg
**Kind**: global class  

* [Jpeg](#Jpeg)
    * [new Jpeg()](#new_Jpeg_new)
    * [.toTnl()](#Jpeg+toTnl) ⇒ <code>Promise.&lt;(Buffer\|ArrayBuffer)&gt;</code>

<a name="new_Jpeg_new"></a>

### new Jpeg()
A JPEG file

<a name="Jpeg+toTnl"></a>

### jpeg.toTnl() ⇒ <code>Promise.&lt;(Buffer\|ArrayBuffer)&gt;</code>
Convert to TNL

**Kind**: instance method of [<code>Jpeg</code>](#Jpeg)  
<a name="loadSave"></a>

## loadSave(pathToSave) ⇒ [<code>Promise.&lt;Save&gt;</code>](#Save)
Loads a save from fs

**Kind**: global function  
**Throws**:

- <code>Error</code> pathToSave must exist and must have read/write privileges


| Param | Type | Description |
| --- | --- | --- |
| pathToSave | <code>string</code> | path to save on fs |

<a name="loadSaveSync"></a>

## loadSaveSync(pathToSave) ⇒ [<code>Save</code>](#Save)
Synchronous version of [loadSave](#loadSave)

**Kind**: global function  
**Throws**:

- <code>Error</code> pathToSave must exist and must have read/write privileges


| Param | Type | Description |
| --- | --- | --- |
| pathToSave | <code>string</code> | path to save on fs |

<a name="loadCourse"></a>

## loadCourse(coursePath, [courseId]) ⇒ [<code>Promise.&lt;Course&gt;</code>](#Course)
Loads a course from fs

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| coursePath | <code>string</code> | path to course on fs |
| [courseId] | <code>number</code> | course ID inside save |

<a name="loadCourseSync"></a>

## loadCourseSync(coursePath, [courseId]) ⇒ [<code>Course</code>](#Course)
Synchronous version of [loadCourse](#loadCourse)

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| coursePath | <code>string</code> | path to course on fs |
| [courseId] | <code>number</code> | course ID inside save |

<a name="decompress"></a>

## decompress(filePath) ⇒ <code>Promise.&lt;Array.&lt;Course&gt;&gt;</code>
Decompresses a file and loads all included courses into an array

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| filePath | <code>string</code> | path of compresses file |

<a name="deserialize"></a>

## deserialize(buffer) ⇒ [<code>Promise.&lt;Course&gt;</code>](#Course)
Deserializes a course object with compliance to [https://github.com/Tarnadas/smm-protobuf](https://github.com/Tarnadas/smm-protobuf)

**Kind**: global function  

| Param | Type | Description |
| --- | --- | --- |
| buffer | <code>Buffer</code> \| <code>Uint8Array</code> | Node Buffer or Uint8Array to be converted to a [Course](#Course) |

<a name="loadImage"></a>

## loadImage(pathToFile) ⇒ [<code>Tnl</code>](#Tnl) \| [<code>Jpeg</code>](#Jpeg)
Load JPEG or TNL image

**Kind**: global function  
**Throws**:

- <code>Error</code> pathToFile must exist, must have read/write privileges and file must be JPEG or TNL


| Param | Type | Description |
| --- | --- | --- |
| pathToFile | <code>string</code> | path to image on fs |

