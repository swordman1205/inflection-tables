const fs = require('fs');
const path = require('path');
const {DOMParser} = require('xmldom');
const xmlToJSON = require('xmltojson');
// A workaround for Node.js environment
xmlToJSON.stringToXML = (string) => new DOMParser().parseFromString(string, 'text/xml');
const csvParser = require('babyparse');


const inputDir = 'data/';
const latin = {
    outputBaseDir: '../../lib/lang/latin/data/',
    noun: {
        inputFN: 'alph-infl-noun.xml',
        outputSubDir: 'noun/',
        suffixes: {
            outputFN: 'suffixes.csv',
            get outputPath() {
                return path.join(__dirname, latin.outputBaseDir, latin.noun.outputSubDir, this.outputFN)
            },
            get (json) {
                "use strict";

                let data = json['infl-data'][0]['infl-endings'][0]['infl-ending-set'];
                let result = [];

                for (const group of data) {

                    // Iterate over group's individual items
                    for (const suffix of group['infl-ending']) {
                        let footnote = '';
                        if (suffix['_attr'].hasOwnProperty('footnote')) {
                            // There can be multiple footnotes separated by spaces
                            footnote = latin.noun.footnotes.normalizeIndex(suffix['_attr']['footnote']['_value']);
                        }
                        result.push({
                            ['Ending']: suffix['_text'],
                            ['Number']: group['_attr']['num']['_value'],
                            ['Case']: group['_attr']['case']['_value'],
                            ['Declension']: group['_attr']['decl']['_value'],
                            ['Gender']: group['_attr']['gend']['_value'],
                            ['Type']: suffix['_attr']['type']['_value'],
                            ['Footnote']: footnote
                        })

                    }
                }
                return csvParser.unparse(result);
            }

        },
        footnotes: {
            outputFN: 'footnotes.csv',
            get outputPath() {
                return path.join(__dirname, latin.outputBaseDir, latin.noun.outputSubDir, this.outputFN)
            },
            normalizeIndex(index) {
                // There can be multiple footnotes separated by spaces
                let t = index.replace(/[^\d\s]/g, '');
                return t;
            },
            get (json) {
                "use strict";

                let data = json['infl-data'][0].footnotes[0].footnote;
                let result = [];

                // Skip the first item
                for (let i = 1; i < data.length; i++) {
                    result.push({
                        ['Index']: this.normalizeIndex(data[i]['_attr'].id['_value']),
                        ['Text']: data[i]['_text']
                    })
                }
                return csvParser.unparse(result);
            }
        },
    }
};

let readFile = function readFile(filePath) {
    "use strict";
    return fs.readFileSync(filePath, 'utf8');
};

let writeData = function writeData(data, filePath) {
    "use strict";
    fs.writeFileSync(filePath, data, {encoding: 'utf8'});
};


try {
    let data = readFile(path.join(__dirname, inputDir, latin.noun.inputFN));
    let json = xmlToJSON.parseString(data);

    //let temp = latin.noun.suffixes.get(json);

    writeData(latin.noun.suffixes.get(json), latin.noun.suffixes.outputPath);
    writeData(latin.noun.footnotes.get(json), latin.noun.footnotes.outputPath);

} catch (e) {
    console.log('Error:', e.stack);
}
