# Course File Documentation

![Alt text](https://raw.githubusercontent.com/Tarnadas/cemu-smm/master/documentation/course_file_block.png)

In this example you see two blocks.

* Every block has 32 bytes
* Placed blocks start at address `0x1B0` and end at address `0x145F0`
* Before that address is data about start and finish
    * TODO
* Yellow are x and y coordinates of type `uint_16`
    * The actual values can be calculated by `x = (readUInt16_BigEndian(OFFSET_OF_2) - 0x50) / 0xA0` and `y = (readUInt16_BigEndian(OFFSET_OF_8) - 0x50) / 0xA0`
* Grey might be some kind of z-Index
    * I tried to change bytes directly but couldn't find any difference
* Green is x and y dimension of type `uint_8`
* Purple is the block's type of type `uint_16`
* Cyan is either `0x00` or `0xFF`
    * if `0x00`: refers to any block with dimension 1,1
    * if `0xFF`: refers to any block that can change its dimension
* Black is always the same for every placed block
* Byte `0x17` sometimes has different values, but changing it had no effect
* Any other byte is zero