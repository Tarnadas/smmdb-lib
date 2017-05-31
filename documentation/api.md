## Classes

<dl>
<dt><a href="#Course">Course</a></dt>
<dd></dd>
<dt><a href="#Save">Save</a></dt>
<dd></dd>
</dl>

## Functions

<dl>
<dt><a href="#loadCourse">loadCourse(coursePath, [courseId])</a> ⇒ <code><a href="#Course">Promise.&lt;Course&gt;</a></code></dt>
<dd><p>Loads a course from fs</p>
</dd>
<dt><a href="#loadCourseSync">loadCourseSync(coursePath, [courseId])</a> ⇒ <code><a href="#Course">Course</a></code></dt>
<dd><p>Synchronous version of <a href="#loadCourse">loadCourse</a></p>
</dd>
<dt><a href="#deserialize">deserialize(buffer)</a> ⇒ <code><a href="#Course">Course</a></code></dt>
<dd><p>Deserializes a node buffer or Uint8Array</p>
</dd>
<dt><a href="#loadSave">loadSave(pathToSave)</a> ⇒ <code><a href="#Save">Promise.&lt;Save&gt;</a></code></dt>
<dd><p>Loads a save from fs</p>
</dd>
<dt><a href="#loadSave">loadSave(pathToSave)</a> ⇒ <code><a href="#Save">Promise.&lt;Save&gt;</a></code></dt>
<dd><p>Synchronous version of <a href="#loadSave">loadSave</a></p>
</dd>
<dt><a href="#loadImage">loadImage(pathToFile)</a> ⇒ <code>Tnl</code> | <code>Jpeg</code></dt>
<dd><p>Load JPEG or TNL image</p>
</dd>
</dl>

<a name="Course"></a>

## Course
**Kind**: global class  

* [Course](#Course)
    * [new Course(id, data, dataSub, path, title, maker, gameStyle, courseTheme)](#new_Course_new)
    * [.writeToSave(id, pathToCourse)](#Course+writeToSave)
    * [.writeCrc()](#Course+writeCrc) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="new_Course_new"></a>

### new Course(id, data, dataSub, path, title, maker, gameStyle, courseTheme)
Represents a Super Mario Maker course


| Param |
| --- |
| id | 
| data | 
| dataSub | 
| path | 
| title | 
| maker | 
| gameStyle | 
| courseTheme | 

<a name="Course+writeToSave"></a>

### course.writeToSave(id, pathToCourse)
Writes course to fs inside save folder.
This function should not be called directly. Instead call save.addCourse(course)

**Kind**: instance method of [<code>Course</code>](#Course)  

| Param | Description |
| --- | --- |
| id | course ID inside save |
| pathToCourse | path on fs to course |

<a name="Course+writeCrc"></a>

### course.writeCrc() ⇒ <code>Promise.&lt;void&gt;</code>
Writes crc checksum of course to fs

**Kind**: instance method of [<code>Course</code>](#Course)  
<a name="Save"></a>

## Save
**Kind**: global class  

* [Save](#Save)
    * [new Save(pathToSave, data)](#new_Save_new)
    * [.pathToSave](#Save+pathToSave) : <code>string</code>
    * [.data](#Save+data) : <code>Buffer</code>
    * [.courses](#Save+courses) : <code>Object.&lt;string, Course&gt;</code>
    * [.writeCrc()](#Save+writeCrc) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.writeCrcSync()](#Save+writeCrcSync)
    * [.reorder()](#Save+reorder) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.reorderSync()](#Save+reorderSync)
    * [.exportJpeg()](#Save+exportJpeg) ⇒ <code>Promise.&lt;void&gt;</code>
    * [.exportJpegSync()](#Save+exportJpegSync)
    * [.importJpeg()](#Save+importJpeg)
    * [.unlockAmiibos()](#Save+unlockAmiibos)
    * [.importJpeg()](#Save+importJpeg) ⇒ <code>Object.&lt;string, Course&gt;</code>
    * [.loadCoursesSync()](#Save+loadCoursesSync)
    * [.addCourse(course)](#Save+addCourse) ⇒ <code>number</code>
    * [.addCourseFromFs(courseDataPath)](#Save+addCourseFromFs) ⇒ <code>number</code>
    * [.deleteCourse(courseId)](#Save+deleteCourse) ⇒ <code>Promise.&lt;void&gt;</code>

<a name="new_Save_new"></a>

### new Save(pathToSave, data)
Represents a Super Mario Maker save


| Param |
| --- |
| pathToSave | 
| data | 

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
<a name="Save+exportJpeg"></a>

### save.exportJpeg() ⇒ <code>Promise.&lt;void&gt;</code>
Exports all course thumbnails as jpeg within course folders

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+exportJpegSync"></a>

### save.exportJpegSync()
Synchronous version of [exportJpeg](#Save+exportJpeg)

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+importJpeg"></a>

### save.importJpeg()
Exports all jpeg thumbnails as tnl within course folders

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+unlockAmiibos"></a>

### save.unlockAmiibos()
Unlocks Amiibos for this save

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+importJpeg"></a>

### save.importJpeg() ⇒ <code>Object.&lt;string, Course&gt;</code>
Load courses and store them in [courses](#Save+courses)

**Kind**: instance method of [<code>Save</code>](#Save)  
<a name="Save+loadCoursesSync"></a>

### save.loadCoursesSync()
Synchronous version of [Save#loadCourses](Save#loadCourses)

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

### save.addCourseFromFs(courseDataPath) ⇒ <code>number</code>
Stores a course from fs in this save

**Kind**: instance method of [<code>Save</code>](#Save)  
**Returns**: <code>number</code> - course slot ID  
**Throws**:

- <code>Error</code> courseDataPath must exist
- <code>Error</code> Save must have an empty slot


| Param | Type | Description |
| --- | --- | --- |
| courseDataPath | [<code>Course</code>](#Course) | course to be stored in save |

<a name="Save+deleteCourse"></a>

### save.deleteCourse(courseId) ⇒ <code>Promise.&lt;void&gt;</code>
Deletes a course from this save

**Kind**: instance method of [<code>Save</code>](#Save)  
**Throws**:

- <code>Error</code> course with courseId must exist


| Param | Type | Description |
| --- | --- | --- |
| courseId | [<code>Course</code>](#Course) | ID of course to be deleted |

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

<a name="deserialize"></a>

## deserialize(buffer) ⇒ [<code>Course</code>](#Course)
Deserializes a node buffer or Uint8Array

**Kind**: global function  

| Param | Type |
| --- | --- |
| buffer | <code>Buffer</code> \| <code>Uint8Array</code> | 

<a name="loadSave"></a>

## loadSave(pathToSave) ⇒ [<code>Promise.&lt;Save&gt;</code>](#Save)
Loads a save from fs

**Kind**: global function  
**Throws**:

- <code>Error</code> pathToSave must exist and must have read/write privileges


| Param | Type | Description |
| --- | --- | --- |
| pathToSave | <code>string</code> | path to save on fs |

<a name="loadSave"></a>

## loadSave(pathToSave) ⇒ [<code>Promise.&lt;Save&gt;</code>](#Save)
Synchronous version of [loadSave](#loadSave)

**Kind**: global function  
**Throws**:

- <code>Error</code> pathToSave must exist and must have read/write privileges


| Param | Type | Description |
| --- | --- | --- |
| pathToSave | <code>string</code> | path to save on fs |

<a name="loadImage"></a>

## loadImage(pathToFile) ⇒ <code>Tnl</code> \| <code>Jpeg</code>
Load JPEG or TNL image

**Kind**: global function  
**Throws**:

- <code>Error</code> pathToFile must exist, must have read/write privileges and file must be JPEG or TNL


| Param | Type | Description |
| --- | --- | --- |
| pathToFile | <code>string</code> | path to image on fs |

