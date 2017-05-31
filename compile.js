const jsdoc2md = require('jsdoc-to-markdown');

const path = require('path');
const fs   = require('fs');

(async () => {
    let files = fs.readdirSync(path.join(__dirname, 'src')).map(file => {
        return path.join(__dirname, 'src/' + file);
    });
    let md = await jsdoc2md.render({
        files,
        configure: path.join(__dirname, 'jsdoc.json')
    });
    fs.writeFileSync(path.join(__dirname, 'docs/api.md'), md);
})();