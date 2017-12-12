import { Constants, Feature, FeatureList, FeatureType, Homonym, LatinLanguageModel } from 'alpheios-data-models';

/**
 * Shared data structures and functions
 */

const languages = {
  type: 'language',
  latin: 'lat',
  greek: 'grc',
  isAllowed (language) {
    if (language === this.type) {
      return false
    } else {
      return Object.values(this).includes(language)
    }
  }
};

/**
 * Stores inflection language data
 */
class LanguageDataset {
    /**
     * Initializes a LanguageDataset.
     * @param {string} language - A language of a data set, from an allowed languages list (see 'languages' object).
     */
  constructor (language) {
    if (!language) {
            // Language is not supported
      throw new Error('Language data cannot be empty.')
    }

    if (!languages.isAllowed(language)) {
            // Language is not supported
      throw new Error('Language "' + language + '" is not supported.')
    }
    this.language = language;
    this.suffixes = []; // An array of suffixes.
    this.footnotes = []; // Footnotes
  };

    /**
     * Each grammatical feature can be either a single or an array of Feature objects. The latter is the case when
     * an ending can belong to several grammatical features at once (i.e. belong to both 'masculine' and
     * 'feminine' genders
     *
     * @param {string | null} suffixValue - A text of a suffix. It is either a string or null if there is no suffix.
     * @param {Feature[]} featureValue
     * @return {Suffix} A newly added suffix value (can be used to add more data to the suffix).
     */
  addSuffix (suffixValue, featureValue, extendedLangData) {
        // TODO: implement run-time error checking
    let suffixItem = new Suffix(suffixValue);
    suffixItem.extendedLangData = extendedLangData;

        // Build all possible combinations of features
    let multiValueFeatures = [];

        // Go through all features provided
    for (let feature of featureValue) {
            // If this is a footnote. Footnotes should go in a flat array
            // because we don't need to split by them
      if (feature.type === Feature.types.footnote) {
        suffixItem[Feature.types.footnote] = suffixItem[Feature.types.footnote] || [];
        suffixItem[Feature.types.footnote].push(feature.value);
        continue
      }

            // If this ending has several grammatical feature values then they will be in an array
      if (Array.isArray(feature)) {
        if (feature.length > 0) {
          if (feature[0]) {
            let type = feature[0].type;
                    // Store all multi-value features to create a separate copy of a a Suffix object for each of them
            multiValueFeatures.push({type: type, features: feature});
          } else {
            console.log(feature);
          }
        } else {
                    // Array is empty
          throw new Error('An empty array is provided as a feature argument to the "addSuffix" method.')
        }
      } else {
        suffixItem.features[feature.type] = feature.value;
      }
    }

        // Create a copy of an Suffix object for each multi-value item
    if (multiValueFeatures.length > 0) {
      for (let featureGroup of multiValueFeatures) {
        let endingItems = suffixItem.split(featureGroup.type, featureGroup.features);
        this.suffixes = this.suffixes.concat(endingItems);
      }
    } else {
      this.suffixes.push(suffixItem);
    }
  };

    /**
     * Stores a footnote item.
     * @param {Feature} partOfSpeech - A part of speech this footnote belongs to
     * @param {number} index - A footnote's index.
     * @param {string} text - A footnote's text.
     */
  addFootnote (partOfSpeech, index, text) {
    if (!index) {
      throw new Error('Footnote index data should not be empty.')
    }

    if (!text) {
      throw new Error('Footnote text data should not be empty.')
    }

    let footnote = new Footnote(index, text, partOfSpeech.value);
    footnote.index = index;

    this.footnotes.push(footnote);
  };

  getSuffixes (homonym) {
        // Add support for languages
    let result = new LexicalData(homonym);
    let inflections = {};

        // Find partial matches first, and then full among them

        // TODO: do we ever need lemmas?
    for (let lexema of homonym.lexemes) {
      for (let inflection of lexema.inflections) {
                // Group inflections by a part of speech
        let partOfSpeech = inflection[Feature.types.part];
        if (!partOfSpeech) {
          throw new Error('Part of speech data is missing in an inflection.')
        }

        if (!inflections.hasOwnProperty(partOfSpeech)) {
          inflections[partOfSpeech] = [];
        }
        inflections[partOfSpeech].push(inflection);
      }
    }

        // Scan for matches for all parts of speech separately
    for (const partOfSpeech in inflections) {
      if (inflections.hasOwnProperty(partOfSpeech)) {
        let inflectionsGroup = inflections[partOfSpeech];

        result[Feature.types.part].push(partOfSpeech);
        result[partOfSpeech] = {};
        result[partOfSpeech].suffixes = this.suffixes.reduce(this['reducer'].bind(this, inflectionsGroup), []);
        result[partOfSpeech].footnotes = [];

                // Create a set so all footnote indexes be unique
        let footnotesIndex = new Set();
                // Scan all selected suffixes to build a unique set of footnote indexes
        for (let suffix of result[partOfSpeech].suffixes) {
          if (suffix.hasOwnProperty(Feature.types.footnote)) {
                        // Footnote indexes are stored in an array
            for (let index of suffix[Feature.types.footnote]) {
              footnotesIndex.add(index);
            }
          }
        }
                // Add footnote indexes and their texts to a result
        for (let index of footnotesIndex) {
          let footnote = this.footnotes.find(footnoteElement =>
                        footnoteElement.index === index && footnoteElement[Feature.types.part] === partOfSpeech
                    );
          result[partOfSpeech].footnotes.push({index: index, text: footnote.text});
        }
                // Sort footnotes according to their index numbers
        result[partOfSpeech].footnotes.sort((a, b) => parseInt(a.index) - parseInt(b.index));
      }
    }

    return result
  }

  reducer (inflections, accumulator, suffix) {
    let result = this.matcher(inflections, suffix);
    if (result) {
      accumulator.push(result);
    }
    return accumulator
  }
}

/**
 * Stores one or several language datasets, one for each language
 */
class LanguageData {
    /**
     * Combines several language datasets for different languages. Allows to abstract away language data.
     * This function is chainable.
     * @param {LanguageDataset[]} languageData - Language datasets of different languages.
     * @return {LanguageData} Self instance for chaining.
     */
  constructor (languageData) {
    this.supportedLanguages = [];

    if (languageData) {
      for (let dataset of languageData) {
        this[dataset.language] = dataset;
        this.supportedLanguages.push(dataset.language);
      }
    }
    return this
  }

    /**
     * Loads data for all data sets.
     * This function is chainable.
     * @return {LanguageData} Self instance for chaining.
     */
  loadData () {
    for (let language of this.supportedLanguages) {
      try {
        this[language].loadData();
      } catch (e) {
        console.log(e);
      }
    }
    return this
  }

    /**
     * Finds matching suffixes for a homonym.
     * @param {Homonym} homonym - A homonym for which matching suffixes must be found.
     * @return {LexicalData} A return value of an inflection query.
     */
  getSuffixes (homonym) {
    let language = homonym.language;
    if (this.supportedLanguages.includes(language)) {
      return this[homonym.language].getSuffixes(homonym)
    } else {
      // throw new Error(`"${language}" language data is missing. Unable to get suffix data.`)
      return new LexicalData(homonym)
    }
  }
}

/**
 * Suffix is an ending of a word with none or any grammatical features associated with it.
 * Features are stored in properties whose names are type of a grammatical feature (i.e. case, gender, etc.)
 * Each feature can have a single or multiple values associated with it (i.e. gender can be either 'masculine',
 * a single value, or 'masculine' and 'feminine'. That's why all values are stored in an array.
 */
class Suffix {
    /**
     * Initializes a Suffix object.
     * @param {string | null} suffixValue - A suffix text or null if suffix is empty.
     */
  constructor (suffixValue) {
    if (suffixValue === undefined) {
      throw new Error('Suffix should not be empty.')
    }
    this.value = suffixValue;
    this.features = {};
    this.featureGroups = {};

        /*
        Extended language data stores additional suffix information that is specific for a particular language.
        It uses the following schema:
        {string} language(key): {object} extended language data. This object is specific for each language
        and is defined in a language model.
         */
    this.extendedLangData = {};
    this.match = undefined;
  }

  static readObject (jsonObject) {
    let suffix = new Suffix(jsonObject.value);

    if (jsonObject.features) {
      for (let key in jsonObject.features) {
        if (jsonObject.features.hasOwnProperty(key)) {
          suffix.features[key] = jsonObject.features[key];
        }
      }
    }

    if (jsonObject.featureGroups) {
      for (let key in jsonObject.featureGroups) {
        if (jsonObject.featureGroups.hasOwnProperty(key)) {
          suffix.featureGroups[key] = [];
          for (let value of jsonObject.featureGroups[key]) {
            suffix.featureGroups[key].push(value);
          }
        }
      }
    }

    if (jsonObject[Feature.types.footnote]) {
      suffix[Feature.types.footnote] = [];
      for (let footnote of jsonObject[Feature.types.footnote]) {
        suffix[Feature.types.footnote].push(footnote);
      }
    }

    if (jsonObject.match) {
      suffix.match = MatchData.readObject(jsonObject.match);
    }

    for (const lang in jsonObject.extendedLangData) {
      if (jsonObject.extendedLangData.hasOwnProperty(lang)) {
        suffix.extendedLangData[lang] = ExtendedLanguageData.readObject(jsonObject.extendedLangData[lang]);
      }
    }
    return suffix
  }

    /**
     * Returns a copy of itself. Used in splitting suffixes with multi-value features.
     * @returns {Suffix}
     */
  clone () {
        // TODO: do all-feature two-level cloning
    let clone = new Suffix(this.value);
    for (const key in this.features) {
      if (this.features.hasOwnProperty(key)) {
        clone.features[key] = this.features[key];
      }
    }
    for (const key in this.featureGroups) {
      if (this.featureGroups.hasOwnProperty(key)) {
        clone.featureGroups[key] = this.featureGroups[key];
      }
    }

    if (this.hasOwnProperty(Feature.types.footnote)) {
      clone[Feature.types.footnote] = this[Feature.types.footnote];
    }

    for (const lang in this.extendedLangData) {
      if (this.extendedLangData.hasOwnProperty(lang)) {
        clone.extendedLangData[lang] = this.extendedLangData[lang];
      }
    }
    return clone
  };

    /**
     * Checks if suffix has a feature that is a match to the one provided.
     * @param {string} featureType - Sets a type of a feature we need to match with the ones stored inside the suffix
     * @param {string[]} featureValues - A list of feature values we need to match with the ones stored inside the suffix
     * @returns {string | undefined} - If provided feature is a match, returns a first feature that matched.
     * If no match found, return undefined.
     */
  featureMatch (featureType, featureValues) {
    if (this.features.hasOwnProperty(featureType)) {
      for (let value of featureValues) {
        if (value === this.features[featureType]) {
          return value
        }
      }
    }
    return undefined
  }

    /**
     * Find feature groups in Suffix.featureGroups that are the same between suffixes provided
     * @param suffixes
     */
  static getCommonGroups (suffixes) {
    let features = Object.keys(suffixes[0].featureGroups);

    let commonGroups = features.filter(feature => {
      let result = true;
      for (let i = 1; i < suffixes.length; i++) {
        result = result && suffixes[i].features.hasOwnProperty(feature);
      }
      return result
    });
    return commonGroups
  }

    /**
     * Finds out if an suffix is in the same group with some other suffix. The other suffix is provided as a function argument.
     * Two suffixes are considered to be in the same group if they are:
     * a. Have at least one common group in featureGroups;
     * b. Have the same suffix
     * c. Have values of all features the same except for those that belong to a common group(s)
     * d. Values of the common group features must be complementary. Here is an example:
     * Let's say a 'gender' group can have values such as 'masculine' and 'feminine'. Then suffixes will be combined
     * only if gender value of one suffix is 'masculine' and the other value is 'feminine'. If both suffixes have the same
     * either 'masculine' or 'feminine' value, they sill not be combined as are not being complementary.
     * @param {Suffix} suffix - An other suffix that we compare this suffix with.
     * @returns {boolean} - True if both suffixes are in the same group, false otherwise.
     */
  isInSameGroupWith (suffix) {
    let commonGroups = Suffix.getCommonGroups([this, suffix]);
    if (commonGroups.length < 1) {
            // If elements do not have common groups in Suffix.featureGroups then they are not in the same group
      return false
    }

    let commonValues = {};
    commonGroups.forEach((feature) => { commonValues[feature] = new Set([this.features[feature]]); });

    let result = true;
    result = result && this.value === suffix.value;
        // If suffixes does not match don't check any further
    if (!result) {
      return false
    }

        // Check all features to be a match, except those that are possible group values
    for (let feature of Object.keys(this.features)) {
      if (commonGroups.indexOf(feature) >= 0) {
        commonValues[feature].add(suffix.features[feature]);

                // Do not compare common groups
        continue
      }
      result = result && this.features[feature] === suffix.features[feature];
            // If feature mismatch discovered, do not check any further
      if (!result) {
        return false
      }
    }

    commonGroups.forEach(feature => {
      result = result && commonValues[feature].size === 2;
    });

    return result
  }

    /**
     * Splits a suffix that has multiple values of one or more grammatical features into an array of Suffix objects
     * with each Suffix object having only a single value of those grammatical features. Initial multiple values
     * are stored in a featureGroups[featureType] property as an array of values.
     * @param {string} featureType - A type of a feature
     * @param {Feature[]} featureValues - Multiple grammatical feature values.
     * @returns {Suffix[]} - An array of suffixes.
     */
  split (featureType, featureValues) {
    let copy = this.clone();
    let values = [];
    featureValues.forEach(element => values.push(element.value));
    copy.features[featureType] = featureValues[0].value;
    copy.featureGroups[featureType] = values;
    let suffixItems = [copy];
    for (let i = 1; i < featureValues.length; i++) {
      copy = this.clone();
      copy.features[featureType] = featureValues[i].value;
      copy.featureGroups[featureType] = values;
      suffixItems.push(copy);
    }
    return suffixItems
  };

    /**
     * Combines suffixes that are in the same group together. Suffixes to be combined must have their values listed
     * in an array stored as featureGroups[featureType] property.
     * @param {Suffix[]} suffixes - An array of suffixes to be combined.
     * @param {function} mergeFunction - A function that will merge two suffixes. By default it uses Suffix.merge,
     * but provides a way to supply a presentation specific functions. Please see Suffix.merge for more
     * information on function format.
     * @returns {Suffix[]} An array of suffixes with some items possibly combined together.
     */
  static combine (suffixes, mergeFunction = Suffix.merge) {
    let matchFound = false;
    let matchIdx;

    do {
      matchFound = false;

            /*
            Go through an array of suffixes end compare each suffix with each other (two-way compare) one time. \
            If items are in the same group, merge two suffixes, break out of a loop,
            and remove one matching suffix (the second one) from an array.
            Then repeat on a modified array until no further matches found.
             */
      for (let i = 0; i < suffixes.length; i++) {
        if (matchFound) {
          continue
        }
        for (let j = i + 1; j < suffixes.length; j++) {
          if (suffixes[i].isInSameGroupWith(suffixes[j])) {
            matchIdx = j;
            matchFound = true;
            mergeFunction(suffixes[i], suffixes[j]);
          }
        }
      }

      if (matchFound) {
        suffixes.splice(matchIdx, 1);
      }
    }
    while (matchFound)
    return suffixes
  }

    /**
     * This function provide a logic of to merge data of two suffix object that were previously split together.
     * @param {Suffix} suffixA - A first of two suffixes to merge (to be returned).
     * @param {Suffix} suffixB - A second ending to merge (to be discarded).
     * @returns {Suffix} A modified value of ending A.
     */
  static merge (suffixA, suffixB) {
    let commonGroups = Suffix.getCommonGroups([suffixA, suffixB]);
    for (let type of commonGroups) {
            // Combine values using a comma separator. Can do anything else if we need to.
      suffixA.features[type] = suffixA.features[type] + ', ' + suffixB.features[type];
    }
    return suffixA
  };
}

class Footnote {
  constructor (index, text, partOfSpeech) {
    this.index = index;
    this.text = text;
    this[Feature.types.part] = partOfSpeech;
  }

  static readObject (jsonObject) {
    this.index = jsonObject.index;
    this.text = jsonObject.text;
    this[Feature.types.part] = jsonObject[Feature.types.part];
    return new Footnote(jsonObject.index, jsonObject.text, jsonObject[Feature.types.part])
  }
}

/**
 * Detailed information about a match type.
 */
class MatchData {
  constructor () {
    this.suffixMatch = false; // Whether two suffixes are the same.
    this.fullMatch = false; // Whether two suffixes and all grammatical features, including part of speech, are the same.
    this.matchedFeatures = []; // How many features matches each other.
  }

  static readObject (jsonObject) {
    let matchData = new MatchData();
    matchData.suffixMatch = jsonObject.suffixMatch;
    matchData.fullMatch = jsonObject.fullMatch;
    for (let feature of jsonObject.matchedFeatures) {
      matchData.matchedFeatures.push(feature);
    }
    return matchData
  }
}

class ExtendedLanguageData {
  constructor () {
    this._type = undefined; // This is a base class
  }

  static types () {
    return {
      EXTENDED_GREEK_DATA: 'ExtendedGreekData'
    }
  }

  static readObject (jsonObject) {
    if (!jsonObject._type) {
      throw new Error('Extended language data has no type information. Unable to deserialize.')
    } else if (jsonObject._type === ExtendedLanguageData.types().EXTENDED_GREEK_DATA) {
      return ExtendedGreekData.readObject(jsonObject)
    } else {
      throw new Error(`Unsupported extended language data of type "${jsonObject._type}".`)
    }
  }
}

class ExtendedGreekData extends ExtendedLanguageData {
  constructor () {
    super();
    this._type = ExtendedLanguageData.types().EXTENDED_GREEK_DATA; // For deserialization
    this.primary = false;
  }

  static readObject (jsonObject) {
    let data = new ExtendedGreekData();
    data.primary = jsonObject.primary;
    return data
  }

  merge (extendedGreekData) {
    if (this.primary !== extendedGreekData.primary) {
      console.log('Mismatch', this.primary, extendedGreekData.primary);
    }
    let merged = new ExtendedGreekData();
    merged.primary = this.primary;
    return merged
  }
}

class SelectedWord {
  constructor (language, word) {
    this.language = language;
    this.word = word;
  }

  static readObjects (jsonObject) {
    return new SelectedWord(jsonObject.language, jsonObject.word)
  }
}

/**
 * A return value for inflection queries
 */
class LexicalData {
  constructor (homonym) {
    this.homonym = homonym;
    this[Feature.types.part] = []; // What parts of speech are represented by this object.
  }

  static readObject (jsonObject) {
    let homonym = Homonym.readObject(jsonObject.homonym);

    let lexicalData = new LexicalData(homonym);
    lexicalData[Feature.types.part] = jsonObject[Feature.types.part];

    for (let part of lexicalData[Feature.types.part]) {
      let partData = jsonObject[part];
      lexicalData[part] = {};

      if (partData.suffixes) {
        lexicalData[part].suffixes = [];
        for (let suffix of partData.suffixes) {
          lexicalData[part].suffixes.push(Suffix.readObject(suffix));
        }
      }

      if (partData.footnotes) {
        lexicalData[part].footnotes = [];
        for (let footnote of partData.footnotes) {
          lexicalData[part].footnotes.push(Footnote.readObject(footnote));
        }
      }
    }

    return lexicalData
  }

  get word () {
    return this.homonym.targetWord
  }

  set word (word) {
    this.homonym.targetWord = word;
  }

  get language () {
    return this.homonym.language
  }
}

/**
 * Load text data form an external fil with an asynchronous XHR request.
 * @param {string} filePath - A path to a file we need to load.
 * @returns {Promise} - A promise that will be resolved with either
 * file content (a string) in case of success of with a status message
 * in case of failure.
 */
let loadData = function loadData (filePath) {
  return new Promise((resolve, reject) => {
    const xhr = new window.XMLHttpRequest();
    xhr.open('GET', filePath);
    xhr.onload = () => resolve(xhr.responseText);
    xhr.onerror = () => reject(xhr.statusText);
    xhr.send();
  })
};

let messages$1 = {
  Number: 'Number',
  Case: 'Case',
  Declension: 'Declension',
  Gender: 'Gender',
  Type: 'Type',
  Voice: 'Voice',
  'Conjugation Stem': 'Conjugation Stem',
  Mood: 'Mood',
  Person: 'Person'
};

let messages$2 = {
  Number: 'Number (GB)',
  Case: 'Case (GB)',
  Declension: 'Declension (GB)',
  Gender: 'Gender (GB)',
  Type: 'Type (GB)',
  Voice: 'Voice (GB)',
  'Conjugation Stem': 'Conjugation Stem (GB)',
  Mood: 'Mood (GB)',
  Person: 'Person (GB)'
};

/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

var hop = Object.prototype.hasOwnProperty;

function extend(obj) {
    var sources = Array.prototype.slice.call(arguments, 1),
        i, len, source, key;

    for (i = 0, len = sources.length; i < len; i += 1) {
        source = sources[i];
        if (!source) { continue; }

        for (key in source) {
            if (hop.call(source, key)) {
                obj[key] = source[key];
            }
        }
    }

    return obj;
}

/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

// Purposely using the same implementation as the Intl.js `Intl` polyfill.
// Copyright 2013 Andy Earnshaw, MIT License

var realDefineProp = (function () {
    try { return !!Object.defineProperty({}, 'a', {}); }
    catch (e) { return false; }
})();

var defineProperty = realDefineProp ? Object.defineProperty :
        function (obj, name, desc) {

    if ('get' in desc && obj.__defineGetter__) {
        obj.__defineGetter__(name, desc.get);
    } else if (!hop.call(obj, name) || 'value' in desc) {
        obj[name] = desc.value;
    }
};

var objCreate = Object.create || function (proto, props) {
    var obj, k;

    function F() {}
    F.prototype = proto;
    obj = new F();

    for (k in props) {
        if (hop.call(props, k)) {
            defineProperty(obj, k, props[k]);
        }
    }

    return obj;
};

/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

function Compiler$1(locales, formats, pluralFn) {
    this.locales  = locales;
    this.formats  = formats;
    this.pluralFn = pluralFn;
}

Compiler$1.prototype.compile = function (ast) {
    this.pluralStack        = [];
    this.currentPlural      = null;
    this.pluralNumberFormat = null;

    return this.compileMessage(ast);
};

Compiler$1.prototype.compileMessage = function (ast) {
    if (!(ast && ast.type === 'messageFormatPattern')) {
        throw new Error('Message AST is not of type: "messageFormatPattern"');
    }

    var elements = ast.elements,
        pattern  = [];

    var i, len, element;

    for (i = 0, len = elements.length; i < len; i += 1) {
        element = elements[i];

        switch (element.type) {
            case 'messageTextElement':
                pattern.push(this.compileMessageText(element));
                break;

            case 'argumentElement':
                pattern.push(this.compileArgument(element));
                break;

            default:
                throw new Error('Message element does not have a valid type');
        }
    }

    return pattern;
};

Compiler$1.prototype.compileMessageText = function (element) {
    // When this `element` is part of plural sub-pattern and its value contains
    // an unescaped '#', use a `PluralOffsetString` helper to properly output
    // the number with the correct offset in the string.
    if (this.currentPlural && /(^|[^\\])#/g.test(element.value)) {
        // Create a cache a NumberFormat instance that can be reused for any
        // PluralOffsetString instance in this message.
        if (!this.pluralNumberFormat) {
            this.pluralNumberFormat = new Intl.NumberFormat(this.locales);
        }

        return new PluralOffsetString(
                this.currentPlural.id,
                this.currentPlural.format.offset,
                this.pluralNumberFormat,
                element.value);
    }

    // Unescape the escaped '#'s in the message text.
    return element.value.replace(/\\#/g, '#');
};

Compiler$1.prototype.compileArgument = function (element) {
    var format = element.format;

    if (!format) {
        return new StringFormat(element.id);
    }

    var formats  = this.formats,
        locales  = this.locales,
        pluralFn = this.pluralFn,
        options;

    switch (format.type) {
        case 'numberFormat':
            options = formats.number[format.style];
            return {
                id    : element.id,
                format: new Intl.NumberFormat(locales, options).format
            };

        case 'dateFormat':
            options = formats.date[format.style];
            return {
                id    : element.id,
                format: new Intl.DateTimeFormat(locales, options).format
            };

        case 'timeFormat':
            options = formats.time[format.style];
            return {
                id    : element.id,
                format: new Intl.DateTimeFormat(locales, options).format
            };

        case 'pluralFormat':
            options = this.compileOptions(element);
            return new PluralFormat(
                element.id, format.ordinal, format.offset, options, pluralFn
            );

        case 'selectFormat':
            options = this.compileOptions(element);
            return new SelectFormat(element.id, options);

        default:
            throw new Error('Message element does not have a valid format type');
    }
};

Compiler$1.prototype.compileOptions = function (element) {
    var format      = element.format,
        options     = format.options,
        optionsHash = {};

    // Save the current plural element, if any, then set it to a new value when
    // compiling the options sub-patterns. This conforms the spec's algorithm
    // for handling `"#"` syntax in message text.
    this.pluralStack.push(this.currentPlural);
    this.currentPlural = format.type === 'pluralFormat' ? element : null;

    var i, len, option;

    for (i = 0, len = options.length; i < len; i += 1) {
        option = options[i];

        // Compile the sub-pattern and save it under the options's selector.
        optionsHash[option.selector] = this.compileMessage(option.value);
    }

    // Pop the plural stack to put back the original current plural value.
    this.currentPlural = this.pluralStack.pop();

    return optionsHash;
};

// -- Compiler Helper Classes --------------------------------------------------

function StringFormat(id) {
    this.id = id;
}

StringFormat.prototype.format = function (value) {
    if (!value && typeof value !== 'number') {
        return '';
    }

    return typeof value === 'string' ? value : String(value);
};

function PluralFormat(id, useOrdinal, offset, options, pluralFn) {
    this.id         = id;
    this.useOrdinal = useOrdinal;
    this.offset     = offset;
    this.options    = options;
    this.pluralFn   = pluralFn;
}

PluralFormat.prototype.getOption = function (value) {
    var options = this.options;

    var option = options['=' + value] ||
            options[this.pluralFn(value - this.offset, this.useOrdinal)];

    return option || options.other;
};

function PluralOffsetString(id, offset, numberFormat, string) {
    this.id           = id;
    this.offset       = offset;
    this.numberFormat = numberFormat;
    this.string       = string;
}

PluralOffsetString.prototype.format = function (value) {
    var number = this.numberFormat.format(value - this.offset);

    return this.string
            .replace(/(^|[^\\])#/g, '$1' + number)
            .replace(/\\#/g, '#');
};

function SelectFormat(id, options) {
    this.id      = id;
    this.options = options;
}

SelectFormat.prototype.getOption = function (value) {
    var options = this.options;
    return options[value] || options.other;
};

var parser = (function() {
  "use strict";

  /*
   * Generated by PEG.js 0.9.0.
   *
   * http://pegjs.org/
   */

  function peg$subclass(child, parent) {
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor();
  }

  function peg$SyntaxError(message, expected, found, location) {
    this.message  = message;
    this.expected = expected;
    this.found    = found;
    this.location = location;
    this.name     = "SyntaxError";

    if (typeof Error.captureStackTrace === "function") {
      Error.captureStackTrace(this, peg$SyntaxError);
    }
  }

  peg$subclass(peg$SyntaxError, Error);

  function peg$parse(input) {
    var options = arguments.length > 1 ? arguments[1] : {},
        parser  = this,

        peg$FAILED = {},

        peg$startRuleFunctions = { start: peg$parsestart },
        peg$startRuleFunction  = peg$parsestart,

        peg$c0 = function(elements) {
                return {
                    type    : 'messageFormatPattern',
                    elements: elements,
                    location: location()
                };
            },
        peg$c1 = function(text) {
                var string = '',
                    i, j, outerLen, inner, innerLen;

                for (i = 0, outerLen = text.length; i < outerLen; i += 1) {
                    inner = text[i];

                    for (j = 0, innerLen = inner.length; j < innerLen; j += 1) {
                        string += inner[j];
                    }
                }

                return string;
            },
        peg$c2 = function(messageText) {
                return {
                    type : 'messageTextElement',
                    value: messageText,
                    location: location()
                };
            },
        peg$c3 = /^[^ \t\n\r,.+={}#]/,
        peg$c4 = { type: "class", value: "[^ \\t\\n\\r,.+={}#]", description: "[^ \\t\\n\\r,.+={}#]" },
        peg$c5 = "{",
        peg$c6 = { type: "literal", value: "{", description: "\"{\"" },
        peg$c7 = ",",
        peg$c8 = { type: "literal", value: ",", description: "\",\"" },
        peg$c9 = "}",
        peg$c10 = { type: "literal", value: "}", description: "\"}\"" },
        peg$c11 = function(id, format) {
                return {
                    type  : 'argumentElement',
                    id    : id,
                    format: format && format[2],
                    location: location()
                };
            },
        peg$c12 = "number",
        peg$c13 = { type: "literal", value: "number", description: "\"number\"" },
        peg$c14 = "date",
        peg$c15 = { type: "literal", value: "date", description: "\"date\"" },
        peg$c16 = "time",
        peg$c17 = { type: "literal", value: "time", description: "\"time\"" },
        peg$c18 = function(type, style) {
                return {
                    type : type + 'Format',
                    style: style && style[2],
                    location: location()
                };
            },
        peg$c19 = "plural",
        peg$c20 = { type: "literal", value: "plural", description: "\"plural\"" },
        peg$c21 = function(pluralStyle) {
                return {
                    type   : pluralStyle.type,
                    ordinal: false,
                    offset : pluralStyle.offset || 0,
                    options: pluralStyle.options,
                    location: location()
                };
            },
        peg$c22 = "selectordinal",
        peg$c23 = { type: "literal", value: "selectordinal", description: "\"selectordinal\"" },
        peg$c24 = function(pluralStyle) {
                return {
                    type   : pluralStyle.type,
                    ordinal: true,
                    offset : pluralStyle.offset || 0,
                    options: pluralStyle.options,
                    location: location()
                }
            },
        peg$c25 = "select",
        peg$c26 = { type: "literal", value: "select", description: "\"select\"" },
        peg$c27 = function(options) {
                return {
                    type   : 'selectFormat',
                    options: options,
                    location: location()
                };
            },
        peg$c28 = "=",
        peg$c29 = { type: "literal", value: "=", description: "\"=\"" },
        peg$c30 = function(selector, pattern) {
                return {
                    type    : 'optionalFormatPattern',
                    selector: selector,
                    value   : pattern,
                    location: location()
                };
            },
        peg$c31 = "offset:",
        peg$c32 = { type: "literal", value: "offset:", description: "\"offset:\"" },
        peg$c33 = function(number) {
                return number;
            },
        peg$c34 = function(offset, options) {
                return {
                    type   : 'pluralFormat',
                    offset : offset,
                    options: options,
                    location: location()
                };
            },
        peg$c35 = { type: "other", description: "whitespace" },
        peg$c36 = /^[ \t\n\r]/,
        peg$c37 = { type: "class", value: "[ \\t\\n\\r]", description: "[ \\t\\n\\r]" },
        peg$c38 = { type: "other", description: "optionalWhitespace" },
        peg$c39 = /^[0-9]/,
        peg$c40 = { type: "class", value: "[0-9]", description: "[0-9]" },
        peg$c41 = /^[0-9a-f]/i,
        peg$c42 = { type: "class", value: "[0-9a-f]i", description: "[0-9a-f]i" },
        peg$c43 = "0",
        peg$c44 = { type: "literal", value: "0", description: "\"0\"" },
        peg$c45 = /^[1-9]/,
        peg$c46 = { type: "class", value: "[1-9]", description: "[1-9]" },
        peg$c47 = function(digits) {
            return parseInt(digits, 10);
        },
        peg$c48 = /^[^{}\\\0-\x1F \t\n\r]/,
        peg$c49 = { type: "class", value: "[^{}\\\\\\0-\\x1F\\x7f \\t\\n\\r]", description: "[^{}\\\\\\0-\\x1F\\x7f \\t\\n\\r]" },
        peg$c50 = "\\\\",
        peg$c51 = { type: "literal", value: "\\\\", description: "\"\\\\\\\\\"" },
        peg$c52 = function() { return '\\'; },
        peg$c53 = "\\#",
        peg$c54 = { type: "literal", value: "\\#", description: "\"\\\\#\"" },
        peg$c55 = function() { return '\\#'; },
        peg$c56 = "\\{",
        peg$c57 = { type: "literal", value: "\\{", description: "\"\\\\{\"" },
        peg$c58 = function() { return '\u007B'; },
        peg$c59 = "\\}",
        peg$c60 = { type: "literal", value: "\\}", description: "\"\\\\}\"" },
        peg$c61 = function() { return '\u007D'; },
        peg$c62 = "\\u",
        peg$c63 = { type: "literal", value: "\\u", description: "\"\\\\u\"" },
        peg$c64 = function(digits) {
                return String.fromCharCode(parseInt(digits, 16));
            },
        peg$c65 = function(chars) { return chars.join(''); },

        peg$currPos          = 0,
        peg$savedPos         = 0,
        peg$posDetailsCache  = [{ line: 1, column: 1, seenCR: false }],
        peg$maxFailPos       = 0,
        peg$maxFailExpected  = [],
        peg$silentFails      = 0,

        peg$result;

    if ("startRule" in options) {
      if (!(options.startRule in peg$startRuleFunctions)) {
        throw new Error("Can't start parsing from rule \"" + options.startRule + "\".");
      }

      peg$startRuleFunction = peg$startRuleFunctions[options.startRule];
    }

    function location() {
      return peg$computeLocation(peg$savedPos, peg$currPos);
    }

    function peg$computePosDetails(pos) {
      var details = peg$posDetailsCache[pos],
          p, ch;

      if (details) {
        return details;
      } else {
        p = pos - 1;
        while (!peg$posDetailsCache[p]) {
          p--;
        }

        details = peg$posDetailsCache[p];
        details = {
          line:   details.line,
          column: details.column,
          seenCR: details.seenCR
        };

        while (p < pos) {
          ch = input.charAt(p);
          if (ch === "\n") {
            if (!details.seenCR) { details.line++; }
            details.column = 1;
            details.seenCR = false;
          } else if (ch === "\r" || ch === "\u2028" || ch === "\u2029") {
            details.line++;
            details.column = 1;
            details.seenCR = true;
          } else {
            details.column++;
            details.seenCR = false;
          }

          p++;
        }

        peg$posDetailsCache[pos] = details;
        return details;
      }
    }

    function peg$computeLocation(startPos, endPos) {
      var startPosDetails = peg$computePosDetails(startPos),
          endPosDetails   = peg$computePosDetails(endPos);

      return {
        start: {
          offset: startPos,
          line:   startPosDetails.line,
          column: startPosDetails.column
        },
        end: {
          offset: endPos,
          line:   endPosDetails.line,
          column: endPosDetails.column
        }
      };
    }

    function peg$fail(expected) {
      if (peg$currPos < peg$maxFailPos) { return; }

      if (peg$currPos > peg$maxFailPos) {
        peg$maxFailPos = peg$currPos;
        peg$maxFailExpected = [];
      }

      peg$maxFailExpected.push(expected);
    }

    function peg$buildException(message, expected, found, location) {
      function cleanupExpected(expected) {
        var i = 1;

        expected.sort(function(a, b) {
          if (a.description < b.description) {
            return -1;
          } else if (a.description > b.description) {
            return 1;
          } else {
            return 0;
          }
        });

        while (i < expected.length) {
          if (expected[i - 1] === expected[i]) {
            expected.splice(i, 1);
          } else {
            i++;
          }
        }
      }

      function buildMessage(expected, found) {
        function stringEscape(s) {
          function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

          return s
            .replace(/\\/g,   '\\\\')
            .replace(/"/g,    '\\"')
            .replace(/\x08/g, '\\b')
            .replace(/\t/g,   '\\t')
            .replace(/\n/g,   '\\n')
            .replace(/\f/g,   '\\f')
            .replace(/\r/g,   '\\r')
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
        }

        var expectedDescs = new Array(expected.length),
            expectedDesc, foundDesc, i;

        for (i = 0; i < expected.length; i++) {
          expectedDescs[i] = expected[i].description;
        }

        expectedDesc = expected.length > 1
          ? expectedDescs.slice(0, -1).join(", ")
              + " or "
              + expectedDescs[expected.length - 1]
          : expectedDescs[0];

        foundDesc = found ? "\"" + stringEscape(found) + "\"" : "end of input";

        return "Expected " + expectedDesc + " but " + foundDesc + " found.";
      }

      if (expected !== null) {
        cleanupExpected(expected);
      }

      return new peg$SyntaxError(
        message !== null ? message : buildMessage(expected, found),
        expected,
        found,
        location
      );
    }

    function peg$parsestart() {
      var s0;

      s0 = peg$parsemessageFormatPattern();

      return s0;
    }

    function peg$parsemessageFormatPattern() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsemessageFormatElement();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsemessageFormatElement();
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c0(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsemessageFormatElement() {
      var s0;

      s0 = peg$parsemessageTextElement();
      if (s0 === peg$FAILED) {
        s0 = peg$parseargumentElement();
      }

      return s0;
    }

    function peg$parsemessageText() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$currPos;
      s3 = peg$parse_();
      if (s3 !== peg$FAILED) {
        s4 = peg$parsechars();
        if (s4 !== peg$FAILED) {
          s5 = peg$parse_();
          if (s5 !== peg$FAILED) {
            s3 = [s3, s4, s5];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
      } else {
        peg$currPos = s2;
        s2 = peg$FAILED;
      }
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$currPos;
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            s4 = peg$parsechars();
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s3 = [s3, s4, s5];
                s2 = s3;
              } else {
                peg$currPos = s2;
                s2 = peg$FAILED;
              }
            } else {
              peg$currPos = s2;
              s2 = peg$FAILED;
            }
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c1(s1);
      }
      s0 = s1;
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = peg$parsews();
        if (s1 !== peg$FAILED) {
          s0 = input.substring(s0, peg$currPos);
        } else {
          s0 = s1;
        }
      }

      return s0;
    }

    function peg$parsemessageTextElement() {
      var s0, s1;

      s0 = peg$currPos;
      s1 = peg$parsemessageText();
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c2(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parseargument() {
      var s0, s1, s2;

      s0 = peg$parsenumber();
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        s1 = [];
        if (peg$c3.test(input.charAt(peg$currPos))) {
          s2 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s2 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c4); }
        }
        if (s2 !== peg$FAILED) {
          while (s2 !== peg$FAILED) {
            s1.push(s2);
            if (peg$c3.test(input.charAt(peg$currPos))) {
              s2 = input.charAt(peg$currPos);
              peg$currPos++;
            } else {
              s2 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c4); }
            }
          }
        } else {
          s1 = peg$FAILED;
        }
        if (s1 !== peg$FAILED) {
          s0 = input.substring(s0, peg$currPos);
        } else {
          s0 = s1;
        }
      }

      return s0;
    }

    function peg$parseargumentElement() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 123) {
        s1 = peg$c5;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c6); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parseargument();
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$currPos;
              if (input.charCodeAt(peg$currPos) === 44) {
                s6 = peg$c7;
                peg$currPos++;
              } else {
                s6 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c8); }
              }
              if (s6 !== peg$FAILED) {
                s7 = peg$parse_();
                if (s7 !== peg$FAILED) {
                  s8 = peg$parseelementFormat();
                  if (s8 !== peg$FAILED) {
                    s6 = [s6, s7, s8];
                    s5 = s6;
                  } else {
                    peg$currPos = s5;
                    s5 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s5;
                  s5 = peg$FAILED;
                }
              } else {
                peg$currPos = s5;
                s5 = peg$FAILED;
              }
              if (s5 === peg$FAILED) {
                s5 = null;
              }
              if (s5 !== peg$FAILED) {
                s6 = peg$parse_();
                if (s6 !== peg$FAILED) {
                  if (input.charCodeAt(peg$currPos) === 125) {
                    s7 = peg$c9;
                    peg$currPos++;
                  } else {
                    s7 = peg$FAILED;
                    if (peg$silentFails === 0) { peg$fail(peg$c10); }
                  }
                  if (s7 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c11(s3, s5);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseelementFormat() {
      var s0;

      s0 = peg$parsesimpleFormat();
      if (s0 === peg$FAILED) {
        s0 = peg$parsepluralFormat();
        if (s0 === peg$FAILED) {
          s0 = peg$parseselectOrdinalFormat();
          if (s0 === peg$FAILED) {
            s0 = peg$parseselectFormat();
          }
        }
      }

      return s0;
    }

    function peg$parsesimpleFormat() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c12) {
        s1 = peg$c12;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c13); }
      }
      if (s1 === peg$FAILED) {
        if (input.substr(peg$currPos, 4) === peg$c14) {
          s1 = peg$c14;
          peg$currPos += 4;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c15); }
        }
        if (s1 === peg$FAILED) {
          if (input.substr(peg$currPos, 4) === peg$c16) {
            s1 = peg$c16;
            peg$currPos += 4;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c17); }
          }
        }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$currPos;
          if (input.charCodeAt(peg$currPos) === 44) {
            s4 = peg$c7;
            peg$currPos++;
          } else {
            s4 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
          if (s4 !== peg$FAILED) {
            s5 = peg$parse_();
            if (s5 !== peg$FAILED) {
              s6 = peg$parsechars();
              if (s6 !== peg$FAILED) {
                s4 = [s4, s5, s6];
                s3 = s4;
              } else {
                peg$currPos = s3;
                s3 = peg$FAILED;
              }
            } else {
              peg$currPos = s3;
              s3 = peg$FAILED;
            }
          } else {
            peg$currPos = s3;
            s3 = peg$FAILED;
          }
          if (s3 === peg$FAILED) {
            s3 = null;
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c18(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsepluralFormat() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c19) {
        s1 = peg$c19;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c20); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c7;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsepluralStyle();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c21(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseselectOrdinalFormat() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 13) === peg$c22) {
        s1 = peg$c22;
        peg$currPos += 13;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c23); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c7;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = peg$parsepluralStyle();
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c24(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseselectFormat() {
      var s0, s1, s2, s3, s4, s5, s6;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 6) === peg$c25) {
        s1 = peg$c25;
        peg$currPos += 6;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c26); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          if (input.charCodeAt(peg$currPos) === 44) {
            s3 = peg$c7;
            peg$currPos++;
          } else {
            s3 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c8); }
          }
          if (s3 !== peg$FAILED) {
            s4 = peg$parse_();
            if (s4 !== peg$FAILED) {
              s5 = [];
              s6 = peg$parseoptionalFormatPattern();
              if (s6 !== peg$FAILED) {
                while (s6 !== peg$FAILED) {
                  s5.push(s6);
                  s6 = peg$parseoptionalFormatPattern();
                }
              } else {
                s5 = peg$FAILED;
              }
              if (s5 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c27(s5);
                s0 = s1;
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseselector() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      s1 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 61) {
        s2 = peg$c28;
        peg$currPos++;
      } else {
        s2 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c29); }
      }
      if (s2 !== peg$FAILED) {
        s3 = peg$parsenumber();
        if (s3 !== peg$FAILED) {
          s2 = [s2, s3];
          s1 = s2;
        } else {
          peg$currPos = s1;
          s1 = peg$FAILED;
        }
      } else {
        peg$currPos = s1;
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        s0 = input.substring(s0, peg$currPos);
      } else {
        s0 = s1;
      }
      if (s0 === peg$FAILED) {
        s0 = peg$parsechars();
      }

      return s0;
    }

    function peg$parseoptionalFormatPattern() {
      var s0, s1, s2, s3, s4, s5, s6, s7, s8;

      s0 = peg$currPos;
      s1 = peg$parse_();
      if (s1 !== peg$FAILED) {
        s2 = peg$parseselector();
        if (s2 !== peg$FAILED) {
          s3 = peg$parse_();
          if (s3 !== peg$FAILED) {
            if (input.charCodeAt(peg$currPos) === 123) {
              s4 = peg$c5;
              peg$currPos++;
            } else {
              s4 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c6); }
            }
            if (s4 !== peg$FAILED) {
              s5 = peg$parse_();
              if (s5 !== peg$FAILED) {
                s6 = peg$parsemessageFormatPattern();
                if (s6 !== peg$FAILED) {
                  s7 = peg$parse_();
                  if (s7 !== peg$FAILED) {
                    if (input.charCodeAt(peg$currPos) === 125) {
                      s8 = peg$c9;
                      peg$currPos++;
                    } else {
                      s8 = peg$FAILED;
                      if (peg$silentFails === 0) { peg$fail(peg$c10); }
                    }
                    if (s8 !== peg$FAILED) {
                      peg$savedPos = s0;
                      s1 = peg$c30(s2, s6);
                      s0 = s1;
                    } else {
                      peg$currPos = s0;
                      s0 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              } else {
                peg$currPos = s0;
                s0 = peg$FAILED;
              }
            } else {
              peg$currPos = s0;
              s0 = peg$FAILED;
            }
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parseoffset() {
      var s0, s1, s2, s3;

      s0 = peg$currPos;
      if (input.substr(peg$currPos, 7) === peg$c31) {
        s1 = peg$c31;
        peg$currPos += 7;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c32); }
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = peg$parsenumber();
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c33(s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsepluralStyle() {
      var s0, s1, s2, s3, s4;

      s0 = peg$currPos;
      s1 = peg$parseoffset();
      if (s1 === peg$FAILED) {
        s1 = null;
      }
      if (s1 !== peg$FAILED) {
        s2 = peg$parse_();
        if (s2 !== peg$FAILED) {
          s3 = [];
          s4 = peg$parseoptionalFormatPattern();
          if (s4 !== peg$FAILED) {
            while (s4 !== peg$FAILED) {
              s3.push(s4);
              s4 = peg$parseoptionalFormatPattern();
            }
          } else {
            s3 = peg$FAILED;
          }
          if (s3 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c34(s1, s3);
            s0 = s1;
          } else {
            peg$currPos = s0;
            s0 = peg$FAILED;
          }
        } else {
          peg$currPos = s0;
          s0 = peg$FAILED;
        }
      } else {
        peg$currPos = s0;
        s0 = peg$FAILED;
      }

      return s0;
    }

    function peg$parsews() {
      var s0, s1;

      peg$silentFails++;
      s0 = [];
      if (peg$c36.test(input.charAt(peg$currPos))) {
        s1 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c37); }
      }
      if (s1 !== peg$FAILED) {
        while (s1 !== peg$FAILED) {
          s0.push(s1);
          if (peg$c36.test(input.charAt(peg$currPos))) {
            s1 = input.charAt(peg$currPos);
            peg$currPos++;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c37); }
          }
        }
      } else {
        s0 = peg$FAILED;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c35); }
      }

      return s0;
    }

    function peg$parse_() {
      var s0, s1, s2;

      peg$silentFails++;
      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsews();
      while (s2 !== peg$FAILED) {
        s1.push(s2);
        s2 = peg$parsews();
      }
      if (s1 !== peg$FAILED) {
        s0 = input.substring(s0, peg$currPos);
      } else {
        s0 = s1;
      }
      peg$silentFails--;
      if (s0 === peg$FAILED) {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c38); }
      }

      return s0;
    }

    function peg$parsedigit() {
      var s0;

      if (peg$c39.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c40); }
      }

      return s0;
    }

    function peg$parsehexDigit() {
      var s0;

      if (peg$c41.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c42); }
      }

      return s0;
    }

    function peg$parsenumber() {
      var s0, s1, s2, s3, s4, s5;

      s0 = peg$currPos;
      if (input.charCodeAt(peg$currPos) === 48) {
        s1 = peg$c43;
        peg$currPos++;
      } else {
        s1 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c44); }
      }
      if (s1 === peg$FAILED) {
        s1 = peg$currPos;
        s2 = peg$currPos;
        if (peg$c45.test(input.charAt(peg$currPos))) {
          s3 = input.charAt(peg$currPos);
          peg$currPos++;
        } else {
          s3 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c46); }
        }
        if (s3 !== peg$FAILED) {
          s4 = [];
          s5 = peg$parsedigit();
          while (s5 !== peg$FAILED) {
            s4.push(s5);
            s5 = peg$parsedigit();
          }
          if (s4 !== peg$FAILED) {
            s3 = [s3, s4];
            s2 = s3;
          } else {
            peg$currPos = s2;
            s2 = peg$FAILED;
          }
        } else {
          peg$currPos = s2;
          s2 = peg$FAILED;
        }
        if (s2 !== peg$FAILED) {
          s1 = input.substring(s1, peg$currPos);
        } else {
          s1 = s2;
        }
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c47(s1);
      }
      s0 = s1;

      return s0;
    }

    function peg$parsechar() {
      var s0, s1, s2, s3, s4, s5, s6, s7;

      if (peg$c48.test(input.charAt(peg$currPos))) {
        s0 = input.charAt(peg$currPos);
        peg$currPos++;
      } else {
        s0 = peg$FAILED;
        if (peg$silentFails === 0) { peg$fail(peg$c49); }
      }
      if (s0 === peg$FAILED) {
        s0 = peg$currPos;
        if (input.substr(peg$currPos, 2) === peg$c50) {
          s1 = peg$c50;
          peg$currPos += 2;
        } else {
          s1 = peg$FAILED;
          if (peg$silentFails === 0) { peg$fail(peg$c51); }
        }
        if (s1 !== peg$FAILED) {
          peg$savedPos = s0;
          s1 = peg$c52();
        }
        s0 = s1;
        if (s0 === peg$FAILED) {
          s0 = peg$currPos;
          if (input.substr(peg$currPos, 2) === peg$c53) {
            s1 = peg$c53;
            peg$currPos += 2;
          } else {
            s1 = peg$FAILED;
            if (peg$silentFails === 0) { peg$fail(peg$c54); }
          }
          if (s1 !== peg$FAILED) {
            peg$savedPos = s0;
            s1 = peg$c55();
          }
          s0 = s1;
          if (s0 === peg$FAILED) {
            s0 = peg$currPos;
            if (input.substr(peg$currPos, 2) === peg$c56) {
              s1 = peg$c56;
              peg$currPos += 2;
            } else {
              s1 = peg$FAILED;
              if (peg$silentFails === 0) { peg$fail(peg$c57); }
            }
            if (s1 !== peg$FAILED) {
              peg$savedPos = s0;
              s1 = peg$c58();
            }
            s0 = s1;
            if (s0 === peg$FAILED) {
              s0 = peg$currPos;
              if (input.substr(peg$currPos, 2) === peg$c59) {
                s1 = peg$c59;
                peg$currPos += 2;
              } else {
                s1 = peg$FAILED;
                if (peg$silentFails === 0) { peg$fail(peg$c60); }
              }
              if (s1 !== peg$FAILED) {
                peg$savedPos = s0;
                s1 = peg$c61();
              }
              s0 = s1;
              if (s0 === peg$FAILED) {
                s0 = peg$currPos;
                if (input.substr(peg$currPos, 2) === peg$c62) {
                  s1 = peg$c62;
                  peg$currPos += 2;
                } else {
                  s1 = peg$FAILED;
                  if (peg$silentFails === 0) { peg$fail(peg$c63); }
                }
                if (s1 !== peg$FAILED) {
                  s2 = peg$currPos;
                  s3 = peg$currPos;
                  s4 = peg$parsehexDigit();
                  if (s4 !== peg$FAILED) {
                    s5 = peg$parsehexDigit();
                    if (s5 !== peg$FAILED) {
                      s6 = peg$parsehexDigit();
                      if (s6 !== peg$FAILED) {
                        s7 = peg$parsehexDigit();
                        if (s7 !== peg$FAILED) {
                          s4 = [s4, s5, s6, s7];
                          s3 = s4;
                        } else {
                          peg$currPos = s3;
                          s3 = peg$FAILED;
                        }
                      } else {
                        peg$currPos = s3;
                        s3 = peg$FAILED;
                      }
                    } else {
                      peg$currPos = s3;
                      s3 = peg$FAILED;
                    }
                  } else {
                    peg$currPos = s3;
                    s3 = peg$FAILED;
                  }
                  if (s3 !== peg$FAILED) {
                    s2 = input.substring(s2, peg$currPos);
                  } else {
                    s2 = s3;
                  }
                  if (s2 !== peg$FAILED) {
                    peg$savedPos = s0;
                    s1 = peg$c64(s2);
                    s0 = s1;
                  } else {
                    peg$currPos = s0;
                    s0 = peg$FAILED;
                  }
                } else {
                  peg$currPos = s0;
                  s0 = peg$FAILED;
                }
              }
            }
          }
        }
      }

      return s0;
    }

    function peg$parsechars() {
      var s0, s1, s2;

      s0 = peg$currPos;
      s1 = [];
      s2 = peg$parsechar();
      if (s2 !== peg$FAILED) {
        while (s2 !== peg$FAILED) {
          s1.push(s2);
          s2 = peg$parsechar();
        }
      } else {
        s1 = peg$FAILED;
      }
      if (s1 !== peg$FAILED) {
        peg$savedPos = s0;
        s1 = peg$c65(s1);
      }
      s0 = s1;

      return s0;
    }

    peg$result = peg$startRuleFunction();

    if (peg$result !== peg$FAILED && peg$currPos === input.length) {
      return peg$result;
    } else {
      if (peg$result !== peg$FAILED && peg$currPos < input.length) {
        peg$fail({ type: "end", description: "end of input" });
      }

      throw peg$buildException(
        null,
        peg$maxFailExpected,
        peg$maxFailPos < input.length ? input.charAt(peg$maxFailPos) : null,
        peg$maxFailPos < input.length
          ? peg$computeLocation(peg$maxFailPos, peg$maxFailPos + 1)
          : peg$computeLocation(peg$maxFailPos, peg$maxFailPos)
      );
    }
  }

  return {
    SyntaxError: peg$SyntaxError,
    parse:       peg$parse
  };
})();

/*
Copyright (c) 2014, Yahoo! Inc. All rights reserved.
Copyrights licensed under the New BSD License.
See the accompanying LICENSE file for terms.
*/

/* jslint esnext: true */

// -- MessageFormat --------------------------------------------------------

function MessageFormat(message, locales, formats) {
    // Parse string messages into an AST.
    var ast = typeof message === 'string' ?
            MessageFormat.__parse(message) : message;

    if (!(ast && ast.type === 'messageFormatPattern')) {
        throw new TypeError('A message must be provided as a String or AST.');
    }

    // Creates a new object with the specified `formats` merged with the default
    // formats.
    formats = this._mergeFormats(MessageFormat.formats, formats);

    // Defined first because it's used to build the format pattern.
    defineProperty(this, '_locale',  {value: this._resolveLocale(locales)});

    // Compile the `ast` to a pattern that is highly optimized for repeated
    // `format()` invocations. **Note:** This passes the `locales` set provided
    // to the constructor instead of just the resolved locale.
    var pluralFn = this._findPluralRuleFunction(this._locale);
    var pattern  = this._compilePattern(ast, locales, formats, pluralFn);

    // "Bind" `format()` method to `this` so it can be passed by reference like
    // the other `Intl` APIs.
    var messageFormat = this;
    this.format = function (values) {
      try {
        return messageFormat._format(pattern, values);
      } catch (e) {
        if (e.variableId) {
          throw new Error(
            'The intl string context variable \'' + e.variableId + '\'' +
            ' was not provided to the string \'' + message + '\''
          );
        } else {
          throw e;
        }
      }
    };
}

// Default format options used as the prototype of the `formats` provided to the
// constructor. These are used when constructing the internal Intl.NumberFormat
// and Intl.DateTimeFormat instances.
defineProperty(MessageFormat, 'formats', {
    enumerable: true,

    value: {
        number: {
            'currency': {
                style: 'currency'
            },

            'percent': {
                style: 'percent'
            }
        },

        date: {
            'short': {
                month: 'numeric',
                day  : 'numeric',
                year : '2-digit'
            },

            'medium': {
                month: 'short',
                day  : 'numeric',
                year : 'numeric'
            },

            'long': {
                month: 'long',
                day  : 'numeric',
                year : 'numeric'
            },

            'full': {
                weekday: 'long',
                month  : 'long',
                day    : 'numeric',
                year   : 'numeric'
            }
        },

        time: {
            'short': {
                hour  : 'numeric',
                minute: 'numeric'
            },

            'medium':  {
                hour  : 'numeric',
                minute: 'numeric',
                second: 'numeric'
            },

            'long': {
                hour        : 'numeric',
                minute      : 'numeric',
                second      : 'numeric',
                timeZoneName: 'short'
            },

            'full': {
                hour        : 'numeric',
                minute      : 'numeric',
                second      : 'numeric',
                timeZoneName: 'short'
            }
        }
    }
});

// Define internal private properties for dealing with locale data.
defineProperty(MessageFormat, '__localeData__', {value: objCreate(null)});
defineProperty(MessageFormat, '__addLocaleData', {value: function (data) {
    if (!(data && data.locale)) {
        throw new Error(
            'Locale data provided to IntlMessageFormat is missing a ' +
            '`locale` property'
        );
    }

    MessageFormat.__localeData__[data.locale.toLowerCase()] = data;
}});

// Defines `__parse()` static method as an exposed private.
defineProperty(MessageFormat, '__parse', {value: parser.parse});

// Define public `defaultLocale` property which defaults to English, but can be
// set by the developer.
defineProperty(MessageFormat, 'defaultLocale', {
    enumerable: true,
    writable  : true,
    value     : undefined
});

MessageFormat.prototype.resolvedOptions = function () {
    // TODO: Provide anything else?
    return {
        locale: this._locale
    };
};

MessageFormat.prototype._compilePattern = function (ast, locales, formats, pluralFn) {
    var compiler = new Compiler$1(locales, formats, pluralFn);
    return compiler.compile(ast);
};

MessageFormat.prototype._findPluralRuleFunction = function (locale) {
    var localeData = MessageFormat.__localeData__;
    var data       = localeData[locale.toLowerCase()];

    // The locale data is de-duplicated, so we have to traverse the locale's
    // hierarchy until we find a `pluralRuleFunction` to return.
    while (data) {
        if (data.pluralRuleFunction) {
            return data.pluralRuleFunction;
        }

        data = data.parentLocale && localeData[data.parentLocale.toLowerCase()];
    }

    throw new Error(
        'Locale data added to IntlMessageFormat is missing a ' +
        '`pluralRuleFunction` for :' + locale
    );
};

MessageFormat.prototype._format = function (pattern, values) {
    var result = '',
        i, len, part, id, value, err;

    for (i = 0, len = pattern.length; i < len; i += 1) {
        part = pattern[i];

        // Exist early for string parts.
        if (typeof part === 'string') {
            result += part;
            continue;
        }

        id = part.id;

        // Enforce that all required values are provided by the caller.
        if (!(values && hop.call(values, id))) {
          err = new Error('A value must be provided for: ' + id);
          err.variableId = id;
          throw err;
        }

        value = values[id];

        // Recursively format plural and select parts' option — which can be a
        // nested pattern structure. The choosing of the option to use is
        // abstracted-by and delegated-to the part helper object.
        if (part.options) {
            result += this._format(part.getOption(value), values);
        } else {
            result += part.format(value);
        }
    }

    return result;
};

MessageFormat.prototype._mergeFormats = function (defaults, formats) {
    var mergedFormats = {},
        type, mergedType;

    for (type in defaults) {
        if (!hop.call(defaults, type)) { continue; }

        mergedFormats[type] = mergedType = objCreate(defaults[type]);

        if (formats && hop.call(formats, type)) {
            extend(mergedType, formats[type]);
        }
    }

    return mergedFormats;
};

MessageFormat.prototype._resolveLocale = function (locales) {
    if (typeof locales === 'string') {
        locales = [locales];
    }

    // Create a copy of the array so we can push on the default locale.
    locales = (locales || []).concat(MessageFormat.defaultLocale);

    var localeData = MessageFormat.__localeData__;
    var i, len, localeParts, data;

    // Using the set of locales + the default locale, we look for the first one
    // which that has been registered. When data does not exist for a locale, we
    // traverse its ancestors to find something that's been registered within
    // its hierarchy of locales. Since we lack the proper `parentLocale` data
    // here, we must take a naive approach to traversal.
    for (i = 0, len = locales.length; i < len; i += 1) {
        localeParts = locales[i].toLowerCase().split('-');

        while (localeParts.length) {
            data = localeData[localeParts.join('-')];
            if (data) {
                // Return the normalized locale string; e.g., we return "en-US",
                // instead of "en-us".
                return data.locale;
            }

            localeParts.pop();
        }
    }

    var defaultLocale = locales.pop();
    throw new Error(
        'No locale data has been added to IntlMessageFormat for: ' +
        locales.join(', ') + ', or the default locale: ' + defaultLocale
    );
};

// GENERATED FILE
var defaultLocale = {"locale":"en","pluralRuleFunction":function (n,ord){var s=String(n).split("."),v0=!s[1],t0=Number(s[0])==n,n10=t0&&s[0].slice(-1),n100=t0&&s[0].slice(-2);if(ord)return n10==1&&n100!=11?"one":n10==2&&n100!=12?"two":n10==3&&n100!=13?"few":"other";return n==1&&v0?"one":"other"}};

/* jslint esnext: true */

MessageFormat.__addLocaleData(defaultLocale);
MessageFormat.defaultLocale = 'en';

/**
 * Combines messages with the same locale code.
 */
class MessageBundle {
  /**
   * Creates a message bundle (a list of messages) for a locale.
   * @param {string} locale - A locale code for a message group. IETF language tag format is recommended.
   * @param {Object} messages - Messages for a locale in an object. Object keys are message IDss, strings that
   * are used to reference a message, and key values are message texts in a string format.
   */
  constructor (locale, messages) {
    if (!locale) {
      throw new Error('Locale data is missing')
    }
    if (!messages) {
      throw new Error('Messages data is missing')
    }

    this._locale = locale;

    for (let messageID in messages) {
      if (messages.hasOwnProperty(messageID)) {
        this[messageID] = new MessageFormat(messages[messageID], this._locale);
      }
    }
  }

  /**
   * Returns a (formatted) message for a message ID provided.
   * @param messageID - An ID of a message.
   * @param options - Options that can be used for message formatting.
   * @returns {string} A formatted message. If message not found, returns a message that contains an error text.
   */
  get (messageID, options = undefined) {
    if (this[messageID]) {
      return this[messageID].format(options)
    } else {
      // If message with the ID provided is not in translation data, generate a warning.
      return `Not in translation data: "${messageID}"`
    }
  }

  /**
   * Returns a locale of a current message bundle.
   * @return {string} A locale of this message bundle.
   */
  get locale () {
    return this._locale
  }
}

/**
 * Combines several message bundle for different locales.
 */
class L10n {
  /**
   * Creates an object. If an array of message bundle data is provided, initializes an object with this data.
   * This function is chainable.
   * @param {MessageBundle[]} messageData - An array of message bundles to be stored within.
   * @returns {L10n} Returns a reference to self for chaining.
   */
  constructor (messageData) {
    this._locales = {};
    this._localeList = [];

    if (messageData) {
      this.addLocaleData(messageData);
    }
    return this
  }

  /**
   * Adds one or several message bundles.
   * This function is chainable.
   * @param {MessageBundle[]} messageData - An array of message bundles to be stored within.
   * @return {L10n} - Returns self for chaining.
   */
  addLocaleData (messageData) {
    for (let messageBundle of messageData) {
      this._localeList.push(messageBundle.locale);
      this._locales[messageBundle.locale] = messageBundle;
    }
    return this
  }

  /**
   * Returns a message bundle for a locale.
   * @param {string} locale - A locale code for a message bundle. IETF language tag format is recommended.
   * @returns {MessageBundle} A message bundle for a locale.
   */
  messages (locale) {
    if (!this._locales[locale]) {
      throw new Error('Locale "' + locale + '" is not found.')
    }
    return this._locales[locale]
  }

  /**
   * Returns a list of available locale codes.
   * @returns {string[]} Array of local codes.
   */
  get locales () {
    return this._localeList
  }
}

const messages = [
  new MessageBundle('en-US', messages$1),
  new MessageBundle('en-GB', messages$2)
];

var nounSuffixesCSV = "Ending,Number,Case,Declension,Gender,Type,Footnote\na,singular,nominative,1st,feminine,regular,\nē,singular,nominative,1st,feminine,irregular,\nēs,singular,nominative,1st,feminine,irregular,\nā,singular,nominative,1st,feminine,irregular,7\nus,singular,nominative,2nd,masculine feminine,regular,\ner,singular,nominative,2nd,masculine feminine,regular,\nir,singular,nominative,2nd,masculine feminine,regular,\n-,singular,nominative,2nd,masculine feminine,irregular,\nos,singular,nominative,2nd,masculine feminine,irregular,1\nōs,singular,nominative,2nd,masculine feminine,irregular,\nō,singular,nominative,2nd,masculine feminine,irregular,7\num,singular,nominative,2nd,neuter,regular,\nus,singular,nominative,2nd,neuter,irregular,10\non,singular,nominative,2nd,neuter,irregular,7\n-,singular,nominative,3rd,masculine feminine,regular,\nos,singular,nominative,3rd,masculine feminine,irregular,\nōn,singular,nominative,3rd,masculine feminine,irregular,7\n-,singular,nominative,3rd,neuter,regular,\nus,singular,nominative,4th,masculine feminine,regular,\nū,singular,nominative,4th,neuter,regular,\nēs,singular,nominative,5th,feminine,regular,\nae,singular,genitive,1st,feminine,regular,\nāī,singular,genitive,1st,feminine,irregular,1\nās,singular,genitive,1st,feminine,irregular,2\nēs,singular,genitive,1st,feminine,irregular,7\nī,singular,genitive,2nd,masculine feminine,regular,\nō,singular,genitive,2nd,masculine feminine,irregular,7\nī,singular,genitive,2nd,neuter,regular,\nis,singular,genitive,3rd,masculine feminine,regular,\nis,singular,genitive,3rd,neuter,regular,\nūs,singular,genitive,4th,masculine feminine,regular,\nuis,singular,genitive,4th,masculine feminine,irregular,1\nuos,singular,genitive,4th,masculine feminine,irregular,1\nī,singular,genitive,4th,masculine feminine,irregular,15\nūs,singular,genitive,4th,neuter,regular,\nēī,singular,genitive,5th,feminine,regular,\neī,singular,genitive,5th,feminine,regular,\nī,singular,genitive,5th,feminine,irregular,\nē,singular,genitive,5th,feminine,irregular,\nēs,singular,genitive,5th,feminine,irregular,6\nae,singular,dative,1st,feminine,regular,\nāī,singular,dative,1st,feminine,irregular,1\nō,singular,dative,2nd,masculine feminine,regular,\nō,singular,dative,2nd,neuter,regular,\nī,singular,dative,3rd,masculine feminine,regular,\ne,singular,dative,3rd,masculine feminine,irregular,17\nī,singular,dative,3rd,neuter,regular,\nūī,singular,dative,4th,masculine feminine,regular,\nū,singular,dative,4th,masculine feminine,regular,\nū,singular,dative,4th,neuter,regular,\nēī,singular,dative,5th,feminine,regular,\neī,singular,dative,5th,feminine,regular,\nī,singular,dative,5th,feminine,irregular,\nē,singular,dative,5th,feminine,irregular,6\nam,singular,accusative,1st,feminine,regular,\nēn,singular,accusative,1st,feminine,irregular,\nān,singular,accusative,1st,feminine,irregular,7\num,singular,accusative,2nd,masculine feminine,regular,\nom,singular,accusative,2nd,masculine feminine,irregular,1\nōn,singular,accusative,2nd,masculine feminine,irregular,7\num,singular,accusative,2nd,neuter,regular,\nus,singular,accusative,2nd,neuter,irregular,10\non,singular,accusative,2nd,neuter,irregular,7\nem,singular,accusative,3rd,masculine feminine,regular,\nim,singular,accusative,3rd,masculine feminine,irregular,11\na,singular,accusative,3rd,masculine feminine,irregular,7\n-,singular,accusative,3rd,neuter,regular,\num,singular,accusative,4th,masculine feminine,regular,\nū,singular,accusative,4th,neuter,regular,\nem,singular,accusative,5th,feminine,regular,\nā,singular,ablative,1st,feminine,regular,\nād,singular,ablative,1st,feminine,irregular,5\nē,singular,ablative,1st,feminine,irregular,7\nō,singular,ablative,2nd,masculine feminine,regular,\nōd,singular,ablative,2nd,masculine feminine,irregular,1\nō,singular,ablative,2nd,neuter,regular,\ne,singular,ablative,3rd,masculine feminine,regular,\nī,singular,ablative,3rd,masculine feminine,irregular,11\ne,singular,ablative,3rd,neuter,regular,\nī,singular,ablative,3rd,neuter,irregular,11\nū,singular,ablative,4th,masculine feminine,regular,\nūd,singular,ablative,4th,masculine feminine,irregular,1\nū,singular,ablative,4th,neuter,regular,\nē,singular,ablative,5th,feminine,regular,\nae,singular,locative,1st,feminine,regular,\nō,singular,locative,2nd,masculine feminine,regular,\nō,singular,locative,2nd,neuter,regular,\ne,singular,locative,3rd,masculine feminine,regular,\nī,singular,locative,3rd,masculine feminine,regular,\nī,singular,locative,3rd,neuter,regular,\nū,singular,locative,4th,masculine feminine,regular,\nū,singular,locative,4th,neuter,regular,\nē,singular,locative,5th,feminine,regular,\na,singular,vocative,1st,feminine,regular,\nē,singular,vocative,1st,feminine,irregular,\nā,singular,vocative,1st,feminine,irregular,7\ne,singular,vocative,2nd,masculine feminine,regular,\ner,singular,vocative,2nd,masculine feminine,regular,\nir,singular,vocative,2nd,masculine feminine,regular,\n-,singular,vocative,2nd,masculine feminine,irregular,\nī,singular,vocative,2nd,masculine feminine,irregular,8\nōs,singular,vocative,2nd,masculine feminine,irregular,\ne,singular,vocative,2nd,masculine feminine,irregular,7\num,singular,vocative,2nd,neuter,regular,\non,singular,vocative,2nd,neuter,irregular,7\n-,singular,vocative,3rd,masculine feminine,regular,\n-,singular,vocative,3rd,neuter,regular,\nus,singular,vocative,4th,masculine feminine,regular,\nū,singular,vocative,4th,neuter,regular,\nēs,singular,vocative,5th,feminine,regular,\nae,plural,nominative,1st,feminine,regular,\nī,plural,nominative,2nd,masculine feminine,regular,\noe,plural,nominative,2nd,masculine feminine,irregular,7 9\na,plural,nominative,2nd,neuter,regular,\nēs,plural,nominative,3rd,masculine feminine,regular,\nes,plural,nominative,3rd,masculine feminine,irregular,7\na,plural,nominative,3rd,neuter,regular,\nia,plural,nominative,3rd,neuter,irregular,11\nūs,plural,nominative,4th,masculine feminine,regular,\nua,plural,nominative,4th,neuter,regular,\nēs,plural,nominative,5th,feminine,regular,\nārum,plural,genitive,1st,feminine,regular,\num,plural,genitive,1st,feminine,irregular,3\nōrum,plural,genitive,2nd,masculine feminine,regular,\num,plural,genitive,2nd,masculine feminine,irregular,\nom,plural,genitive,2nd,masculine feminine,irregular,8\nōrum,plural,genitive,2nd,neuter,regular,\num,plural,genitive,2nd,neuter,irregular,\num,plural,genitive,3rd,masculine feminine,regular,\nium,plural,genitive,3rd,masculine feminine,irregular,11\nōn,plural,genitive,3rd,masculine feminine,irregular,7\num,plural,genitive,3rd,neuter,regular,\nium,plural,genitive,3rd,neuter,irregular,11\nuum,plural,genitive,4th,masculine feminine,regular,\num,plural,genitive,4th,masculine feminine,irregular,16\nuom,plural,genitive,4th,masculine feminine,irregular,1\nuum,plural,genitive,4th,neuter,regular,\nērum,plural,genitive,5th,feminine,regular,\nīs,plural,dative,1st,feminine,regular,\nābus,plural,dative,1st,feminine,irregular,4\neis,plural,dative,1st,feminine,irregular,6\nīs,plural,dative,2nd,masculine feminine,regular,\nīs,plural,dative,2nd,neuter,regular,\nibus,plural,dative,3rd,masculine feminine,regular,\nibus,plural,dative,3rd,neuter,regular,\nibus,plural,dative,4th,masculine feminine,regular,\nubus,plural,dative,4th,masculine feminine,irregular,14\nibus,plural,dative,4th,neuter,regular,\nēbus,plural,dative,5th,feminine,regular,\nās,plural,accusative,1st,feminine,regular,\nōs,plural,accusative,2nd,masculine feminine,regular,\na,plural,accusative,2nd,neuter,regular,\nēs,plural,accusative,3rd,masculine feminine,regular,\nīs,plural,accusative,3rd,masculine feminine,irregular,11\nas,plural,accusative,3rd,masculine feminine,irregular,7\na,plural,accusative,3rd,neuter,regular,\nia,plural,accusative,3rd,neuter,irregular,11\nūs,plural,accusative,4th,masculine feminine,regular,\nua,plural,accusative,4th,neuter,regular,\nēs,plural,accusative,5th,feminine,regular,\nīs,plural,ablative,1st,feminine,regular,\nābus,plural,ablative,1st,feminine,irregular,4\neis,plural,ablative,1st,feminine,irregular,6\nīs,plural,ablative,2nd,masculine feminine,regular,\nīs,plural,ablative,2nd,neuter,regular,\nibus,plural,ablative,3rd,masculine feminine,regular,\nibus,plural,ablative,3rd,neuter,regular,\nibus,plural,ablative,4th,masculine feminine,regular,\nubus,plural,ablative,4th,masculine feminine,irregular,14\nibus,plural,ablative,4th,neuter,regular,\nēbus,plural,ablative,5th,feminine,regular,\nīs,plural,locative,1st,feminine,regular,\nīs,plural,locative,2nd,masculine feminine,regular,\nīs,plural,locative,2nd,neuter,regular,\nibus,plural,locative,3rd,masculine feminine,regular,\nibus,plural,locative,3rd,neuter,regular,\nibus,plural,locative,4th,masculine feminine,regular,\nibus,plural,locative,4th,neuter,regular,\nēbus,plural,locative,5th,feminine,regular,\nae,plural,vocative,1st,feminine,regular,\nī,plural,vocative,2nd,masculine feminine,regular,\na,plural,vocative,2nd,neuter,regular,\nēs,plural,vocative,3rd,masculine feminine,regular,\na,plural,vocative,3rd,neuter,regular,\nia,plural,vocative,3rd,neuter,irregular,11\nūs,plural,vocative,4th,masculine feminine,regular,\nua,plural,vocative,4th,neuter,regular,\nēs,plural,vocative,5th,feminine,regular,";

var nounFootnotesCSV = "Index,Text\n1,archaic (final s and m of os and om may be omitted in inscriptions)\n2,only in familiās\n3,especially in Greek patronymics and compounds in -gena and -cola.\n4,always in deābus and filiābus; rarely with other words to distinguish the female\n5,archaic\n6,rare\n7,\"may occur in words of Greek origin. The forms of many Greek nouns vary among the first, second and third declensions.\"\n8,proper names in ius and filius and genius\n9,poetic\n10,\"only pelagus, vīrus, and sometimes vulgus\"\n11,may occur with i-stems\n12,several nouns (most commonly domus) show forms of both second and fourth declensions\n13,\"some nouns also have forms from the first declension (eg materia, saevitia) or the third declension (eg requiēs, satiēs, plēbēs, famēs)\"\n14,\"Always in partus and tribus, usually in artus and lacus, sometimes in other words, eg portus and specus\"\n15,Often in names of plants and trees and in nouns ending in -tus\n16,When pronounced as one syllable\n17,early\n18,dies and meridies are masculine";

var adjectiveSuffixesCSV = "Ending,Number,Case,Declension,Gender,Type,Footnote\na,singular,nominative,1st 2nd,feminine,regular,\nus,singular,nominative,1st 2nd,masculine,regular,\num,singular,nominative,1st 2nd,neuter,regular,\nis,singular,nominative,3rd,feminine,regular,\n-,singular,nominative,3rd,feminine,irregular,6\n-,singular,nominative,3rd,masculine,regular,\nis,singular,nominative,3rd,masculine,irregular,5\ne,singular,nominative,3rd,neuter,regular,\n-,singular,nominative,3rd,neuter,irregular,6\nae,singular,genitive,1st 2nd,feminine,regular,\nīus,singular,genitive,1st 2nd,feminine,irregular,3\nī,singular,genitive,1st 2nd,masculine,regular,\nīus,singular,genitive,1st 2nd,masculine,irregular,3\nī,singular,genitive,1st 2nd,neuter,regular,\nīus,singular,genitive,1st 2nd,neuter,irregular,3\nis,singular,genitive,3rd,feminine,regular,\nis,singular,genitive,3rd,masculine,regular,\nis,singular,genitive,3rd,neuter,regular,\nae,singular,dative,1st 2nd,feminine,regular,\nī,singular,dative,1st 2nd,feminine,irregular,3\nō,singular,dative,1st 2nd,masculine,regular,\nī,singular,dative,1st 2nd,masculine,irregular,3\nō,singular,dative,1st 2nd,neuter,regular,\nī,singular,dative,1st 2nd,neuter,irregular,3\nī,singular,dative,3rd,feminine,regular,\nī,singular,dative,3rd,masculine,regular,\nī,singular,dative,3rd,neuter,regular,\nam,singular,accusative,1st 2nd,feminine,regular,\num,singular,accusative,1st 2nd,masculine,regular,\num,singular,accusative,1st 2nd,neuter,regular,\nem,singular,accusative,3rd,feminine,regular,\nem,singular,accusative,3rd,masculine,regular,\ne,singular,accusative,3rd,neuter,regular,\n-,singular,accusative,3rd,neuter,irregular,6\nā,singular,ablative,1st 2nd,feminine,regular,\nō,singular,ablative,1st 2nd,feminine,irregular,4\nō,singular,ablative,1st 2nd,masculine,regular,\nō,singular,ablative,1st 2nd,neuter,regular,\nī,singular,ablative,3rd,feminine,regular,\ne,singular,ablative,3rd,feminine,irregular,7\nī,singular,ablative,3rd,masculine,regular,\ne,singular,ablative,3rd,masculine,irregular,7\nī,singular,ablative,3rd,neuter,regular,\nae,singular,locative,1st 2nd,feminine,regular,\nī,singular,locative,1st 2nd,masculine,regular,\nī,singular,locative,1st 2nd,neuter,regular,\nī,singular,locative,3rd,feminine,regular,\ne,singular,locative,3rd,feminine,irregular,7\nī,singular,locative,3rd,masculine,regular,\nī,singular,locative,3rd,neuter,regular,\na,singular,vocative,1st 2nd,feminine,regular,\ne,singular,vocative,1st 2nd,masculine,regular,\nī,singular,vocative,1st 2nd,masculine,irregular,\num,singular,vocative,1st 2nd,neuter,regular,\nis,singular,vocative,3rd,feminine,regular,\n-,singular,vocative,3rd,masculine,regular,\ne,singular,vocative,3rd,neuter,regular,\n-,singular,vocative,3rd,neuter,irregular,6\nae,plural,nominative,1st 2nd,feminine,regular,\nī,plural,nominative,1st 2nd,masculine,regular,\na,plural,nominative,1st 2nd,neuter,regular,\nēs,plural,nominative,3rd,feminine,regular,\nēs,plural,nominative,3rd,masculine,regular,\nia,plural,nominative,3rd,neuter,regular,\nārum,plural,genitive,1st 2nd,feminine,regular,\nōrum,plural,genitive,1st 2nd,masculine,regular,\nōrum,plural,genitive,1st 2nd,neuter,regular,\nium,plural,genitive,3rd,feminine,regular,\num,plural,genitive,3rd,feminine,irregular,8\nium,plural,genitive,3rd,masculine,regular,\num,plural,genitive,3rd,masculine,irregular,8\nium,plural,genitive,3rd,neuter,regular,\num,plural,genitive,3rd,neuter,irregular,8\nīs,plural,dative,1st 2nd,feminine,regular,\nīs,plural,dative,1st 2nd,masculine,regular,\nīs,plural,dative,1st 2nd,neuter,regular,\nibus,plural,dative,3rd,feminine,regular,\nibus,plural,dative,3rd,masculine,regular,\nibus,plural,dative,3rd,neuter,regular,\nās,plural,accusative,1st 2nd,feminine,regular,\nōs,plural,accusative,1st 2nd,masculine,regular,\na,plural,accusative,1st 2nd,neuter,regular,\nīs,plural,accusative,3rd,feminine,regular,\nēs,plural,accusative,3rd,feminine,irregular,9\nīs,plural,accusative,3rd,masculine,regular,\nēs,plural,accusative,3rd,masculine,irregular,9\nia,plural,accusative,3rd,neuter,regular,\nīs,plural,ablative,1st 2nd,feminine,regular,\nīs,plural,ablative,1st 2nd,masculine,regular,\nīs,plural,ablative,1st 2nd,neuter,regular,\nibus,plural,ablative,3rd,feminine,regular,\nibus,plural,ablative,3rd,masculine,regular,\nibus,plural,ablative,3rd,neuter,regular,\nīs,plural,locative,1st 2nd,feminine,regular,\nīs,plural,locative,1st 2nd,masculine,regular,\nīs,plural,locative,1st 2nd,neuter,regular,\nibus,plural,locative,3rd,feminine,regular,\nibus,plural,locative,3rd,masculine,regular,\nibus,plural,locative,3rd,neuter,regular,\nae,plural,vocative,1st 2nd,feminine,regular,\nī,plural,vocative,1st 2nd,masculine,regular,\na,plural,vocative,1st 2nd,neuter,regular,\nēs,plural,vocative,3rd,feminine,regular,\nēs,plural,vocative,3rd,masculine,regular,\nia,plural,vocative,3rd,neuter,regular,";

var adjectiveFootnotesCSV = "Index,Text\n1,\"Adjectives agree with the noun they modify in gender, number and case.\"\n2,Adjectives are inflected according to either\n3,\"Only nullus, sōlus, alius (alia, aliud), tōtus, ūllus, ūnus, alter, neuter (neutra,\n            neutrum) and uter (utra, utrum).\"\n4,In a few adjectives of Greek origin.\n5,\"The \"\"two-ending\"\" adjectives use \"\"-is\"\", for both masculine and feminine nominative\n            singular.\"\n6,\"The \"\"one-ending\"\" adjectives use the same consonant ending for all three genders in the\n            nominative singular and the neuter accusative and vocative singular.\"\n7,\"An ablative singular in \"\"e\"\" is common in one-ending adjectives, but is usually confined to\n            poetry in three and two-ending adjectives.\"\n8,\"In comparatives, poetry and some one-ending adjectives.\"\n9,Chiefly in comparatives.";

var verbSuffixesCSV = "Ending,Conjugation,Voice,Mood,Tense,Number,Person,Type,Footnote\nō,1st,active,indicative,present,singular,1st,regular,\nās,1st,active,indicative,present,singular,2nd,regular,\nat,1st,active,indicative,present,singular,3rd,regular,\nāmus,1st,active,indicative,present,plural,1st,regular,\nātis,1st,active,indicative,present,plural,2nd,regular,\nant,1st,active,indicative,present,plural,3rd,regular,\nem,1st,active,subjunctive,present,singular,1st,regular,\nēs,1st,active,subjunctive,present,singular,2nd,regular,\net,1st,active,subjunctive,present,singular,3rd,regular,\nēmus,1st,active,subjunctive,present,plural,1st,regular,\nētis,1st,active,subjunctive,present,plural,2nd,regular,\nent,1st,active,subjunctive,present,plural,3rd,regular,\neō,2nd,active,indicative,present,singular,1st,regular,\nēs,2nd,active,indicative,present,singular,2nd,regular,\nēt,2nd,active,indicative,present,singular,3rd,regular,\nēmus,2nd,active,indicative,present,plural,1st,regular,\nētis,2nd,active,indicative,present,plural,2nd,regular,\nent,2nd,active,indicative,present,plural,3rd,regular,\neam,2nd,active,subjunctive,present,singular,1st,regular,\neās,2nd,active,subjunctive,present,singular,2nd,regular,\neat,2nd,active,subjunctive,present,singular,3rd,regular,\neāmus,2nd,active,subjunctive,present,plural,1st,regular,\neātis,2nd,active,subjunctive,present,plural,2nd,regular,\neant,2nd,active,subjunctive,present,plural,3rd,regular,\nō,3rd,active,indicative,present,singular,1st,regular,\nis,3rd,active,indicative,present,singular,2nd,regular,\nit,3rd,active,indicative,present,singular,3rd,regular,\nimus,3rd,active,indicative,present,plural,1st,regular,\nitis,3rd,active,indicative,present,plural,2nd,regular,\nunt,3rd,active,indicative,present,plural,3rd,regular,\nam,3rd,active,subjunctive,present,singular,1st,regular,\nās,3rd,active,subjunctive,present,singular,2nd,regular,\nat,3rd,active,subjunctive,present,singular,3rd,regular,\nāmus,3rd,active,subjunctive,present,plural,1st,regular,\nātis,3rd,active,subjunctive,present,plural,2nd,regular,\nant,3rd,active,subjunctive,present,plural,3rd,regular,\niō,4th,active,indicative,present,singular,1st,regular,\nīs,4th,active,indicative,present,singular,2nd,regular,\nit,4th,active,indicative,present,singular,3rd,regular,\nīmus,4th,active,indicative,present,plural,1st,regular,\nītis,4th,active,indicative,present,plural,2nd,regular,\niunt,4th,active,indicative,present,plural,3rd,regular,\niam,4th,active,subjunctive,present,singular,1st,regular,\niās,4th,active,subjunctive,present,singular,2nd,regular,\niat,4th,active,subjunctive,present,singular,3rd,regular,\niāmus,4th,active,subjunctive,present,plural,1st,regular,\niāatis,4th,active,subjunctive,present,plural,2nd,regular,\niant,4th,active,subjunctive,present,plural,3rd,regular,\nābam,1st,active,indicative,imperfect,singular,1st,regular,\nābas,1st,active,indicative,imperfect,singular,2nd,regular,\nābat,1st,active,indicative,imperfect,singular,3rd,regular,\nābāmus,1st,active,indicative,imperfect,plural,1st,regular,\nābātis,1st,active,indicative,imperfect,plural,2nd,regular,\nābant,1st,active,indicative,imperfect,plural,3rd,regular,\nārem,1st,active,subjunctive,imperfect,singular,1st,regular,\nārēs,1st,active,subjunctive,imperfect,singular,2nd,regular,\nāret,1st,active,subjunctive,imperfect,singular,3rd,regular,\nārēmus,1st,active,subjunctive,imperfect,plural,1st,regular,\nārētis,1st,active,subjunctive,imperfect,plural,2nd,regular,\nārent,1st,active,subjunctive,imperfect,plural,3rd,regular,\nēbam,2nd,active,indicative,imperfect,singular,1st,regular,\nēbās,2nd,active,indicative,imperfect,singular,2nd,regular,\nēbat,2nd,active,indicative,imperfect,singular,3rd,regular,\nēbāmus,2nd,active,indicative,imperfect,plural,1st,regular,\nēbātis,2nd,active,indicative,imperfect,plural,2nd,regular,\nēbant,2nd,active,indicative,imperfect,plural,3rd,regular,\nērem,2nd,active,subjunctive,imperfect,singular,1st,regular,\nērēs,2nd,active,subjunctive,imperfect,singular,2nd,regular,\nēret,2nd,active,subjunctive,imperfect,singular,3rd,regular,\nērēmus,2nd,active,subjunctive,imperfect,plural,1st,regular,\nērētis,2nd,active,subjunctive,imperfect,plural,2nd,regular,\nērēnt,2nd,active,subjunctive,imperfect,plural,3rd,regular,\nēbas,3rd,active,indicative,imperfect,singular,1st,regular,\nēbāt,3rd,active,indicative,imperfect,singular,2nd,regular,\nēbat,3rd,active,indicative,imperfect,singular,3rd,regular,\nēbāmus,3rd,active,indicative,imperfect,plural,1st,regular,\nēbātis,3rd,active,indicative,imperfect,plural,2nd,regular,\nēbant,3rd,active,indicative,imperfect,plural,3rd,regular,\nerem,3rd,active,subjunctive,imperfect,singular,1st,regular,\nerēs,3rd,active,subjunctive,imperfect,singular,2nd,regular,\neret,3rd,active,subjunctive,imperfect,singular,3rd,regular,\nerēmus,3rd,active,subjunctive,imperfect,plural,1st,regular,\nerētis,3rd,active,subjunctive,imperfect,plural,2nd,regular,\nerent,3rd,active,subjunctive,imperfect,plural,3rd,regular,\niēbam,4th,active,indicative,imperfect,singular,1st,regular,\nībam,4th,active,indicative,imperfect,singular,1st,irregular,2\niēbas,4th,active,indicative,imperfect,singular,2nd,regular,\nības,4th,active,indicative,imperfect,singular,2nd,irregular,\niēbat,4th,active,indicative,imperfect,singular,3rd,regular,\nībat,4th,active,indicative,imperfect,singular,3rd,irregular,\niēbāmus,4th,active,indicative,imperfect,plural,1st,regular,\nībāmus,4th,active,indicative,imperfect,plural,1st,irregular,\niēbātis,4th,active,indicative,imperfect,plural,2nd,regular,\nībātis,4th,active,indicative,imperfect,plural,2nd,irregular,\niēbant,4th,active,indicative,imperfect,plural,3rd,regular,\nībant,4th,active,indicative,imperfect,plural,3rd,irregular,\nīrem,4th,active,subjunctive,imperfect,singular,1st,regular,\nīrēs,4th,active,subjunctive,imperfect,singular,2nd,regular,\nīret,4th,active,subjunctive,imperfect,singular,3rd,regular,\nīrēmus,4th,active,subjunctive,imperfect,plural,1st,regular,\nīrētis,4th,active,subjunctive,imperfect,plural,2nd,regular,\nīrēnt,4th,active,subjunctive,imperfect,plural,3rd,regular,\nābo,1st,active,indicative,future,singular,1st,regular,\nābis,1st,active,indicative,future,singular,2nd,regular,\nābit,1st,active,indicative,future,singular,3rd,regular,\nābimus,1st,active,indicative,future,plural,1st,regular,\nābitis,1st,active,indicative,future,plural,2nd,regular,\nābunt,1st,active,indicative,future,plural,3rd,regular,\n,1st,active,subjunctive,future,singular,1st,,\n,1st,active,subjunctive,future,singular,2nd,,\n,1st,active,subjunctive,future,singular,3rd,,\n,1st,active,subjunctive,future,plural,1st,,\n,1st,active,subjunctive,future,plural,2nd,,\n,1st,active,subjunctive,future,plural,3rd,,\nēbō,2nd,active,indicative,future,singular,1st,regular,\nēbis,2nd,active,indicative,future,singular,2nd,regular,\nēbit,2nd,active,indicative,future,singular,3rd,regular,\nēbimus,2nd,active,indicative,future,plural,1st,regular,\nēbitis,2nd,active,indicative,future,plural,2nd,regular,\nēbunt,2nd,active,indicative,future,plural,3rd,regular,\n,2nd,active,subjunctive,future,singular,1st,regular,\n,2nd,active,subjunctive,future,singular,2nd,,\n,2nd,active,subjunctive,future,singular,3rd,,\n,2nd,active,subjunctive,future,plural,1st,,\n,2nd,active,subjunctive,future,plural,2nd,,\n,2nd,active,subjunctive,future,plural,3rd,,\nam,3rd,active,indicative,future,singular,1st,regular,\nēs,3rd,active,indicative,future,singular,2nd,regular,\net,3rd,active,indicative,future,singular,3rd,regular,\nēmus,3rd,active,indicative,future,plural,1st,regular,\nētis,3rd,active,indicative,future,plural,2nd,regular,\nent,3rd,active,indicative,future,plural,3rd,regular,\n,3rd,active,subjunctive,future,singular,1st,,\n,3rd,active,subjunctive,future,singular,2nd,,\n,3rd,active,subjunctive,future,singular,3rd,,\n,3rd,active,subjunctive,future,plural,1st,,\n,3rd,active,subjunctive,future,plural,2nd,,\n,3rd,active,subjunctive,future,plural,3rd,,\niam,4th,active,indicative,future,singular,1st,regular,\nībō,4th,active,indicative,future,singular,1st,irregular,2\niēs,4th,active,indicative,future,singular,2nd,regular,\nībis,4th,active,indicative,future,singular,2nd,irregular,\niet,4th,active,indicative,future,singular,3rd,regular,\nībit,4th,active,indicative,future,singular,3rd,irregular,\niēmus,4th,active,indicative,future,plural,1st,regular,\nībimus,4th,active,indicative,future,plural,1st,irregular,\niētis,4th,active,indicative,future,plural,2nd,regular,\nībitis,4th,active,indicative,future,plural,2nd,irregular,\nient,4th,active,indicative,future,plural,3rd,regular,\nībunt,4th,active,indicative,future,plural,3rd,irregular,\n,4th,active,subjunctive,future,singular,1st,,\n,4th,active,subjunctive,future,singular,2nd,,\n,4th,active,subjunctive,future,singular,3rd,,\n,4th,active,subjunctive,future,plural,1st,,\n,4th,active,subjunctive,future,plural,2nd,,\n,4th,active,subjunctive,future,plural,3rd,,\nāvī,1st,active,indicative,perfect,singular,1st,regular,\nāvistī,1st,active,indicative,perfect,singular,2nd,regular,\nāvit,1st,active,indicative,perfect,singular,3rd,regular,\nāvimus,1st,active,indicative,perfect,plural,1st,regular,\nāvistis,1st,active,indicative,perfect,plural,2nd,regular,\nāvērunt,1st,active,indicative,perfect,plural,3rd,regular,\nāvēre,1st,active,indicative,perfect,plural,3rd,irregular,6\nāverim,1st,active,subjunctive,perfect,singular,1st,regular,\nāveris,1st,active,subjunctive,perfect,singular,2nd,regular,\nāverit,1st,active,subjunctive,perfect,singular,3rd,regular,\nāverimus,1st,active,subjunctive,perfect,plural,1st,regular,\nāveritis,1st,active,subjunctive,perfect,plural,2nd,regular,\nāverint,1st,active,subjunctive,perfect,plural,3rd,regular,\nvī,2nd,active,indicative,perfect,singular,1st,regular,\nvistī,2nd,active,indicative,perfect,singular,2nd,regular,\nvit,2nd,active,indicative,perfect,singular,3rd,regular,\nvimus,2nd,active,indicative,perfect,plural,1st,regular,\nvistis,2nd,active,indicative,perfect,plural,2nd,regular,\nvērunt,2nd,active,indicative,perfect,plural,3rd,regular,\nvēre,2nd,active,indicative,perfect,plural,3rd,irregular,6\nverim,2nd,active,subjunctive,perfect,singular,1st,regular,\nveris,2nd,active,subjunctive,perfect,singular,2nd,regular,\nverit,2nd,active,subjunctive,perfect,singular,3rd,regular,\nverimus,2nd,active,subjunctive,perfect,plural,1st,regular,\nveritis,2nd,active,subjunctive,perfect,plural,2nd,regular,\nverint,2nd,active,subjunctive,perfect,plural,3rd,regular,\nī,3rd,active,indicative,perfect,singular,1st,regular,\nistī,3rd,active,indicative,perfect,singular,2nd,regular,\nit,3rd,active,indicative,perfect,singular,3rd,regular,\nimus,3rd,active,indicative,perfect,plural,1st,regular,\nistis,3rd,active,indicative,perfect,plural,2nd,regular,\nērunt,3rd,active,indicative,perfect,plural,3rd,regular,\nēre,3rd,active,indicative,perfect,plural,3rd,irregular,6\nerim,3rd,active,subjunctive,perfect,singular,1st,regular,\neris,3rd,active,subjunctive,perfect,singular,2nd,regular,\nerit,3rd,active,subjunctive,perfect,singular,3rd,regular,\nerimus,3rd,active,subjunctive,perfect,plural,1st,regular,\neritis,3rd,active,subjunctive,perfect,plural,2nd,regular,\nerint,3rd,active,subjunctive,perfect,plural,3rd,regular,\nīvi,4th,active,indicative,perfect,singular,1st,regular,\nīvistī,4th,active,indicative,perfect,singular,2nd,regular,\nīvit,4th,active,indicative,perfect,singular,3rd,regular,\nīvimus,4th,active,indicative,perfect,plural,1st,regular,\nīvistis,4th,active,indicative,perfect,plural,2nd,regular,\nīvērunt,4th,active,indicative,perfect,plural,3rd,regular,\nīvēre,4th,active,indicative,perfect,plural,3rd,irregular,6\nīverim,4th,active,subjunctive,perfect,singular,1st,regular,\niveris,4th,active,subjunctive,perfect,singular,2nd,regular,\nīverit,4th,active,subjunctive,perfect,singular,3rd,regular,\nīverimus,4th,active,subjunctive,perfect,plural,1st,regular,\nīveritis,4th,active,subjunctive,perfect,plural,2nd,regular,\nīverint,4th,active,subjunctive,perfect,plural,3rd,regular,\nāveram,1st,active,indicative,pluperfect,singular,1st,regular,\nāverās,1st,active,indicative,pluperfect,singular,2nd,regular,\nāverat,1st,active,indicative,pluperfect,singular,3rd,regular,\nāverāmus,1st,active,indicative,pluperfect,plural,1st,regular,\nāverātis,1st,active,indicative,pluperfect,plural,2nd,regular,\nāverant,1st,active,indicative,pluperfect,plural,3rd,regular,\nāvissem,1st,active,subjunctive,pluperfect,singular,1st,regular,\nāvissēs,1st,active,subjunctive,pluperfect,singular,2nd,regular,\nāvisset,1st,active,subjunctive,pluperfect,singular,3rd,regular,\nāvissēm,1st,active,subjunctive,pluperfect,plural,1st,regular,\nāvissēs,1st,active,subjunctive,pluperfect,plural,2nd,regular,\nāvisset,1st,active,subjunctive,pluperfect,plural,3rd,regular,\nveram,2nd,active,indicative,pluperfect,singular,1st,regular,\nverās,2nd,active,indicative,pluperfect,singular,2nd,regular,\nverat,2nd,active,indicative,pluperfect,singular,3rd,regular,\nverāmus,2nd,active,indicative,pluperfect,plural,1st,regular,\nverātis,2nd,active,indicative,pluperfect,plural,2nd,regular,\nverant,2nd,active,indicative,pluperfect,plural,3rd,regular,\nvissem,2nd,active,subjunctive,pluperfect,singular,1st,regular,\nvissēs,2nd,active,subjunctive,pluperfect,singular,2nd,regular,\nvisset,2nd,active,subjunctive,pluperfect,singular,3rd,regular,\nvissēmus,2nd,active,subjunctive,pluperfect,plural,1st,regular,\nvissētis,2nd,active,subjunctive,pluperfect,plural,2nd,regular,\nvissent,2nd,active,subjunctive,pluperfect,plural,3rd,regular,\neram,3rd,active,indicative,pluperfect,singular,1st,regular,\nerās,3rd,active,indicative,pluperfect,singular,2nd,regular,\nerat,3rd,active,indicative,pluperfect,singular,3rd,regular,\nerāmus,3rd,active,indicative,pluperfect,plural,1st,regular,\nerātis,3rd,active,indicative,pluperfect,plural,2nd,regular,\nerant,3rd,active,indicative,pluperfect,plural,3rd,regular,\nissem,3rd,active,subjunctive,pluperfect,singular,1st,regular,\nissēs,3rd,active,subjunctive,pluperfect,singular,2nd,regular,\nisset,3rd,active,subjunctive,pluperfect,singular,3rd,regular,\nissēmus,3rd,active,subjunctive,pluperfect,plural,1st,regular,\nissētis,3rd,active,subjunctive,pluperfect,plural,2nd,regular,\nissent,3rd,active,subjunctive,pluperfect,plural,3rd,regular,\nīveram,4th,active,indicative,pluperfect,singular,1st,regular,\nīverās,4th,active,indicative,pluperfect,singular,2nd,regular,\nīverat,4th,active,indicative,pluperfect,singular,3rd,regular,\nīverāmus,4th,active,indicative,pluperfect,plural,1st,regular,\nīverātis,4th,active,indicative,pluperfect,plural,2nd,regular,\nīverant,4th,active,indicative,pluperfect,plural,3rd,regular,\nīvissem,4th,active,subjunctive,pluperfect,singular,1st,regular,\nīvissēs,4th,active,subjunctive,pluperfect,singular,2nd,regular,\nīvisset,4th,active,subjunctive,pluperfect,singular,3rd,regular,\nīvissēmus,4th,active,subjunctive,pluperfect,plural,1st,regular,\nīvissētis,4th,active,subjunctive,pluperfect,plural,2nd,regular,\nīvissent,4th,active,subjunctive,pluperfect,plural,3rd,regular,\nāverō,1st,active,indicative,future_perfect,singular,1st,regular,\nāveris,1st,active,indicative,future_perfect,singular,2nd,regular,\nāverit,1st,active,indicative,future_perfect,singular,3rd,regular,\nāverimus,1st,active,indicative,future_perfect,plural,1st,regular,\nāveritis,1st,active,indicative,future_perfect,plural,2nd,regular,\nāverint,1st,active,indicative,future_perfect,plural,3rd,regular,\n,1st,active,subjunctive,future_perfect,singular,1st,,\n,1st,active,subjunctive,future_perfect,singular,2nd,,\n,1st,active,subjunctive,future_perfect,singular,3rd,,\n,1st,active,subjunctive,future_perfect,plural,1st,,\n,1st,active,subjunctive,future_perfect,plural,2nd,,\n,1st,active,subjunctive,future_perfect,plural,3rd,,\nverō,2nd,active,indicative,future_perfect,singular,1st,regular,\nvēris,2nd,active,indicative,future_perfect,singular,2nd,regular,\nvērit,2nd,active,indicative,future_perfect,singular,3rd,regular,\nvērimus,2nd,active,indicative,future_perfect,plural,1st,regular,\nvēritis,2nd,active,indicative,future_perfect,plural,2nd,regular,\nvērint,2nd,active,indicative,future_perfect,plural,3rd,regular,\n,2nd,active,subjunctive,future_perfect,singular,1st,,\n,2nd,active,subjunctive,future_perfect,singular,2nd,,\n,2nd,active,subjunctive,future_perfect,singular,3rd,,\n,2nd,active,subjunctive,future_perfect,plural,1st,,\n,2nd,active,subjunctive,future_perfect,plural,2nd,,\n,2nd,active,subjunctive,future_perfect,plural,3rd,,\nerō,3rd,active,indicative,future_perfect,singular,1st,regular,\neris,3rd,active,indicative,future_perfect,singular,2nd,regular,\nerit,3rd,active,indicative,future_perfect,singular,3rd,regular,\nerimus,3rd,active,indicative,future_perfect,plural,1st,regular,\neritis,3rd,active,indicative,future_perfect,plural,2nd,regular,\nerint,3rd,active,indicative,future_perfect,plural,3rd,regular,\n,3rd,active,subjunctive,future_perfect,singular,1st,,\n,3rd,active,subjunctive,future_perfect,singular,2nd,,\n,3rd,active,subjunctive,future_perfect,singular,3rd,,\n,3rd,active,subjunctive,future_perfect,plural,1st,,\n,3rd,active,subjunctive,future_perfect,plural,2nd,,\n,3rd,active,subjunctive,future_perfect,plural,3rd,,\nīverō,4th,active,indicative,future_perfect,singular,1st,regular,\nīveris,4th,active,indicative,future_perfect,singular,2nd,regular,\nīverit,4th,active,indicative,future_perfect,singular,3rd,regular,\nīverimus,4th,active,indicative,future_perfect,plural,1st,regular,\nīveritis,4th,active,indicative,future_perfect,plural,2nd,regular,\nīverint,4th,active,indicative,future_perfect,plural,3rd,regular,\n,4th,active,subjunctive,future_perfect,singular,1st,,\n,4th,active,subjunctive,future_perfect,singular,2nd,,\n,4th,active,subjunctive,future_perfect,singular,3rd,,\n,4th,active,subjunctive,future_perfect,plural,1st,,\n,4th,active,subjunctive,future_perfect,plural,2nd,,\n,4th,active,subjunctive,future_perfect,plural,3rd,,\nor,1st,passive,indicative,present,singular,1st,regular,\nāris,1st,passive,indicative,present,singular,2nd,regular,\nāre,1st,passive,indicative,present,singular,2nd,irregular,5\nātur,1st,passive,indicative,present,singular,3rd,regular,\nāmur,1st,passive,indicative,present,plural,1st,regular,\nāminiī,1st,passive,indicative,present,plural,2nd,regular,\nantur,1st,passive,indicative,present,plural,3rd,regular,\ner,1st,passive,subjunctive,present,singular,1st,regular,\nēris,1st,passive,subjunctive,present,singular,2nd,regular,\nēre,1st,passive,subjunctive,present,singular,2nd,regular,\nētur,1st,passive,subjunctive,present,singular,3rd,regular,\nēmur,1st,passive,subjunctive,present,plural,1st,regular,\nēminī,1st,passive,subjunctive,present,plural,2nd,regular,\nentur,1st,passive,subjunctive,present,plural,3rd,regular,\neor,2nd,passive,indicative,present,singular,1st,regular,\nēris,2nd,passive,indicative,present,singular,2nd,regular,\nēre,2nd,passive,indicative,present,singular,2nd,regular,\nētur,2nd,passive,indicative,present,singular,3rd,regular,\nēmur,2nd,passive,indicative,present,plural,1st,regular,\nēmini,2nd,passive,indicative,present,plural,2nd,regular,\nentur,2nd,passive,indicative,present,plural,3rd,regular,\near,2nd,passive,subjunctive,present,singular,1st,regular,\neāris,2nd,passive,subjunctive,present,singular,2nd,regular,\neāre,2nd,passive,subjunctive,present,singular,2nd,regular,\neātur,2nd,passive,subjunctive,present,singular,3rd,regular,\neāmur,2nd,passive,subjunctive,present,plural,1st,regular,\neāminī,2nd,passive,subjunctive,present,plural,2nd,regular,\neantur,2nd,passive,subjunctive,present,plural,3rd,regular,\nor,3rd,passive,indicative,present,singular,1st,regular,\neris,3rd,passive,indicative,present,singular,2nd,regular,\nere,3rd,passive,indicative,present,singular,2nd,regular,\nitur,3rd,passive,indicative,present,singular,3rd,regular,\nimur,3rd,passive,indicative,present,plural,1st,regular,\niminī,3rd,passive,indicative,present,plural,2nd,regular,\nuntur,3rd,passive,indicative,present,plural,3rd,regular,\nar,3rd,passive,subjunctive,present,singular,1st,regular,\nāris,3rd,passive,subjunctive,present,singular,2nd,regular,\nāre,3rd,passive,subjunctive,present,singular,2nd,regular,\nātur,3rd,passive,subjunctive,present,singular,3rd,regular,\nāmur,3rd,passive,subjunctive,present,plural,1st,regular,\nāminī,3rd,passive,subjunctive,present,plural,2nd,regular,\nantur,3rd,passive,subjunctive,present,plural,3rd,regular,\nior,4th,passive,indicative,present,singular,1st,regular,\nīris,4th,passive,indicative,present,singular,2nd,regular,\nīre,4th,passive,indicative,present,singular,2nd,regular,\nītur,4th,passive,indicative,present,singular,3rd,regular,\nīmur,4th,passive,indicative,present,plural,1st,regular,\nīminī,4th,passive,indicative,present,plural,2nd,regular,\niuntur,4th,passive,indicative,present,plural,3rd,regular,\niar,4th,passive,subjunctive,present,singular,1st,regular,\niāris,4th,passive,subjunctive,present,singular,2nd,regular,\niāre,4th,passive,subjunctive,present,singular,2nd,regular,\niātur,4th,passive,subjunctive,present,singular,3rd,regular,\niāmur,4th,passive,subjunctive,present,plural,1st,regular,\niāminī,4th,passive,subjunctive,present,plural,2nd,regular,\niantur,4th,passive,subjunctive,present,plural,3rd,regular,\nābar,1st,passive,indicative,imperfect,singular,1st,regular,\nābāaris,1st,passive,indicative,imperfect,singular,2nd,regular,\nābāre,1st,passive,indicative,imperfect,singular,2nd,regular,\nābātur,1st,passive,indicative,imperfect,singular,3rd,regular,\nābāmur,1st,passive,indicative,imperfect,plural,1st,regular,\nābāminī,1st,passive,indicative,imperfect,plural,2nd,regular,\nābantur,1st,passive,indicative,imperfect,plural,3rd,regular,\nārer,1st,passive,subjunctive,imperfect,singular,1st,regular,\nārēris,1st,passive,subjunctive,imperfect,singular,2nd,regular,\nārēre,1st,passive,subjunctive,imperfect,singular,2nd,regular,\nārētur,1st,passive,subjunctive,imperfect,singular,3rd,regular,\nārēmur,1st,passive,subjunctive,imperfect,plural,1st,regular,\nārēminī,1st,passive,subjunctive,imperfect,plural,2nd,regular,\nārentur,1st,passive,subjunctive,imperfect,plural,3rd,regular,\nēbar,2nd,passive,indicative,imperfect,singular,1st,regular,\nēbāris,2nd,passive,indicative,imperfect,singular,2nd,regular,\nēbāre,2nd,passive,indicative,imperfect,singular,2nd,regular,\nēbātur,2nd,passive,indicative,imperfect,singular,3rd,regular,\nēbāmur,2nd,passive,indicative,imperfect,plural,1st,regular,\nēbāmini,2nd,passive,indicative,imperfect,plural,2nd,regular,\nēbantur,2nd,passive,indicative,imperfect,plural,3rd,regular,\nērer,2nd,passive,subjunctive,imperfect,singular,1st,regular,\nērēris,2nd,passive,subjunctive,imperfect,singular,2nd,regular,\nērēre,2nd,passive,subjunctive,imperfect,singular,2nd,regular,\nērētur,2nd,passive,subjunctive,imperfect,singular,3rd,regular,\nērēmur,2nd,passive,subjunctive,imperfect,plural,1st,regular,\nērēminī,2nd,passive,subjunctive,imperfect,plural,2nd,regular,\nērentur,2nd,passive,subjunctive,imperfect,plural,3rd,regular,\nēbar,3rd,passive,indicative,imperfect,singular,1st,regular,\nēbāris,3rd,passive,indicative,imperfect,singular,2nd,regular,\nēbāre,3rd,passive,indicative,imperfect,singular,2nd,regular,\nēbatur,3rd,passive,indicative,imperfect,singular,3rd,regular,\nēbāmur,3rd,passive,indicative,imperfect,plural,1st,regular,\nēbāminī,3rd,passive,indicative,imperfect,plural,2nd,regular,\nēbantur,3rd,passive,indicative,imperfect,plural,3rd,regular,\nerer,3rd,passive,subjunctive,imperfect,singular,1st,regular,\nerēris,3rd,passive,subjunctive,imperfect,singular,2nd,regular,\nerēre,3rd,passive,subjunctive,imperfect,singular,2nd,regular,\nerētur,3rd,passive,subjunctive,imperfect,singular,3rd,regular,\nerēmur,3rd,passive,subjunctive,imperfect,plural,1st,regular,\nerēminī,3rd,passive,subjunctive,imperfect,plural,2nd,regular,\nerentur,3rd,passive,subjunctive,imperfect,plural,3rd,regular,\niēbar,4th,passive,indicative,imperfect,singular,1st,regular,\niēbāris,4th,passive,indicative,imperfect,singular,2nd,regular,\niēbāre,4th,passive,indicative,imperfect,singular,2nd,regular,\niēbātur,4th,passive,indicative,imperfect,singular,3rd,regular,\niēbāmur,4th,passive,indicative,imperfect,plural,1st,regular,\niēbāminī,4th,passive,indicative,imperfect,plural,2nd,regular,\niēbantur,4th,passive,indicative,imperfect,plural,3rd,regular,\nīrer,4th,passive,subjunctive,imperfect,singular,1st,regular,\nīrēris,4th,passive,subjunctive,imperfect,singular,2nd,regular,\nīrēre,4th,passive,subjunctive,imperfect,singular,2nd,regular,\nīrētur,4th,passive,subjunctive,imperfect,singular,3rd,regular,\nīrēmur,4th,passive,subjunctive,imperfect,plural,1st,regular,\nīrēminī,4th,passive,subjunctive,imperfect,plural,2nd,regular,\nīrentur,4th,passive,subjunctive,imperfect,plural,3rd,regular,\nābor,1st,passive,indicative,future,singular,1st,regular,\nāberis,1st,passive,indicative,future,singular,2nd,regular,\nābere,1st,passive,indicative,future,singular,2nd,irregular,\nābitur,1st,passive,indicative,future,singular,3rd,regular,\nābimur,1st,passive,indicative,future,plural,1st,regular,\nābiminī,1st,passive,indicative,future,plural,2nd,regular,\nābuntur,1st,passive,indicative,future,plural,3rd,regular,\n,1st,passive,subjunctive,future,singular,1st,,\n,1st,passive,subjunctive,future,singular,2nd,,\n,1st,passive,subjunctive,future,singular,3rd,,\n,1st,passive,subjunctive,future,plural,1st,,\n,1st,passive,subjunctive,future,plural,2nd,,\n,1st,passive,subjunctive,future,plural,3rd,,\nēbor,2nd,passive,indicative,future,singular,1st,regular,\nēberis,2nd,passive,indicative,future,singular,2nd,regular,\nēbere,2nd,passive,indicative,future,singular,2nd,regular,\nēbitur,2nd,passive,indicative,future,singular,3rd,regular,\nēbimur,2nd,passive,indicative,future,plural,1st,regular,\nēbiminī,2nd,passive,indicative,future,plural,2nd,regular,\nēbuntur,2nd,passive,indicative,future,plural,3rd,regular,\n,2nd,passive,subjunctive,future,singular,1st,,\n,2nd,passive,subjunctive,future,singular,2nd,,\n,2nd,passive,subjunctive,future,singular,3rd,,\n,2nd,passive,subjunctive,future,plural,1st,,\n,2nd,passive,subjunctive,future,plural,2nd,,\n,2nd,passive,subjunctive,future,plural,3rd,,\nar,3rd,passive,indicative,future,singular,1st,regular,\nēris,3rd,passive,indicative,future,singular,2nd,regular,\nēre,3rd,passive,indicative,future,singular,2nd,irregular,\nētur,3rd,passive,indicative,future,singular,3rd,regular,\nēmur,3rd,passive,indicative,future,plural,1st,regular,\nēminī,3rd,passive,indicative,future,plural,2nd,regular,\nentur,3rd,passive,indicative,future,plural,3rd,regular,\n,3rd,passive,subjunctive,future,singular,1st,,\n,3rd,passive,subjunctive,future,singular,2nd,,\n,3rd,passive,subjunctive,future,singular,3rd,,\n,3rd,passive,subjunctive,future,plural,1st,,\n,3rd,passive,subjunctive,future,plural,2nd,,\n,3rd,passive,subjunctive,future,plural,3rd,,\niar,4th,passive,indicative,future,singular,1st,regular,\niēris,4th,passive,indicative,future,singular,2nd,regular,\nīēre,4th,passive,indicative,future,singular,2nd,irregular,\niētur,4th,passive,indicative,future,singular,3rd,regular,\niēmur,4th,passive,indicative,future,plural,1st,regular,\niēminī,4th,passive,indicative,future,plural,2nd,regular,\nientur,4th,passive,indicative,future,plural,3rd,regular,\n,4th,passive,subjunctive,future,singular,1st,,\n,4th,passive,subjunctive,future,singular,2nd,,\n,4th,passive,subjunctive,future,singular,3rd,,\n,4th,passive,subjunctive,future,plural,1st,,\n,4th,passive,subjunctive,future,plural,2nd,,\n,4th,passive,subjunctive,future,plural,3rd,,\nātus sum,1st,passive,indicative,perfect,singular,1st,regular,\nātus fui,1st,passive,indicative,perfect,singular,1st,regular,\nātus es,1st,passive,indicative,perfect,singular,2nd,regular,\nātus fuisti,1st,passive,indicative,perfect,singular,2nd,regular,\nātus est,1st,passive,indicative,perfect,singular,3rd,regular,\nātus fuit,1st,passive,indicative,perfect,singular,3rd,regular,\nāti sumus,1st,passive,indicative,perfect,plural,1st,regular,\nāti fuimus,1st,passive,indicative,perfect,plural,1st,irregular,\nāti estis,1st,passive,indicative,perfect,plural,2nd,regular,\nāti fuistis,1st,passive,indicative,perfect,plural,2nd,irregular,\nāti sunt,1st,passive,indicative,perfect,plural,3rd,regular,\nāti fuerunt,1st,passive,indicative,perfect,plural,3rd,irregular,\nātus sim,1st,passive,subjunctive,perfect,singular,1st,regular,\nātus fuerim,1st,passive,subjunctive,perfect,singular,1st,irregular,\nātus sis,1st,passive,subjunctive,perfect,singular,2nd,regular,\nātus fueris,1st,passive,subjunctive,perfect,singular,2nd,irregular,\nātus sit,1st,passive,subjunctive,perfect,singular,3rd,regular,\nātus fuerit,1st,passive,subjunctive,perfect,singular,3rd,regular,\nāti sīmus,1st,passive,subjunctive,perfect,plural,1st,regular,\nāti fuerimus,1st,passive,subjunctive,perfect,plural,1st,irregular,\nāti sītis,1st,passive,subjunctive,perfect,plural,2nd,regular,\nāti fueritis,1st,passive,subjunctive,perfect,plural,2nd,irregular,\nāti sint,1st,passive,subjunctive,perfect,plural,3rd,regular,\nāti fuerint,1st,passive,subjunctive,perfect,plural,3rd,irregular,\nitus sum,2nd,passive,indicative,perfect,singular,1st,regular,\nitus es,2nd,passive,indicative,perfect,singular,2nd,regular,\nitus est,2nd,passive,indicative,perfect,singular,3rd,regular,\nitī sumus,2nd,passive,indicative,perfect,plural,1st,regular,\nitī estis,2nd,passive,indicative,perfect,plural,2nd,regular,\nitī sunt,2nd,passive,indicative,perfect,plural,3rd,regular,\nitus sim,2nd,passive,subjunctive,perfect,singular,1st,regular,\nitus sīs,2nd,passive,subjunctive,perfect,singular,2nd,regular,\nitus sit,2nd,passive,subjunctive,perfect,singular,3rd,regular,\nitī sīmus,2nd,passive,subjunctive,perfect,plural,1st,regular,\nitī sītis,2nd,passive,subjunctive,perfect,plural,2nd,regular,\nitī sint,2nd,passive,subjunctive,perfect,plural,3rd,regular,\nus sum,3rd,passive,indicative,perfect,singular,1st,regular,\nus es,3rd,passive,indicative,perfect,singular,2nd,regular,\nus est,3rd,passive,indicative,perfect,singular,3rd,regular,\nī sumus,3rd,passive,indicative,perfect,plural,1st,regular,\nī estis,3rd,passive,indicative,perfect,plural,2nd,regular,\nī sunt,3rd,passive,indicative,perfect,plural,3rd,regular,\nus sim,3rd,passive,subjunctive,perfect,singular,1st,regular,\nus sīs,3rd,passive,subjunctive,perfect,singular,2nd,regular,\nus sit,3rd,passive,subjunctive,perfect,singular,3rd,regular,\nus sīmus,3rd,passive,subjunctive,perfect,plural,1st,regular,\nus sītis,3rd,passive,subjunctive,perfect,plural,2nd,regular,\nus sint,3rd,passive,subjunctive,perfect,plural,3rd,regular,\nītus sum,4th,passive,indicative,perfect,singular,1st,regular,\nītus es,4th,passive,indicative,perfect,singular,2nd,regular,\nītus est,4th,passive,indicative,perfect,singular,3rd,regular,\nītī sumus,4th,passive,indicative,perfect,plural,1st,regular,\nīti estis,4th,passive,indicative,perfect,plural,2nd,regular,\nīti sunt,4th,passive,indicative,perfect,plural,3rd,regular,\nītus sim,4th,passive,subjunctive,perfect,singular,1st,regular,\nītus sīs,4th,passive,subjunctive,perfect,singular,2nd,regular,\nītus sit,4th,passive,subjunctive,perfect,singular,3rd,regular,\nītī sīmus,4th,passive,subjunctive,perfect,plural,1st,regular,\nīti sītis,4th,passive,subjunctive,perfect,plural,2nd,regular,\nīti sint,4th,passive,subjunctive,perfect,plural,3rd,regular,\nātus eram,1st,passive,indicative,pluperfect,singular,1st,regular,\nātus fueram,1st,passive,indicative,pluperfect,singular,1st,irregular,\nātus eras,1st,passive,indicative,pluperfect,singular,2nd,regular,\nātus fueras,1st,passive,indicative,pluperfect,singular,2nd,irregular,\nātus erat,1st,passive,indicative,pluperfect,singular,3rd,regular,\nātus fuerat,1st,passive,indicative,pluperfect,singular,3rd,irregular,\nātī erāmus,1st,passive,indicative,pluperfect,plural,1st,regular,\nātī fueramus,1st,passive,indicative,pluperfect,plural,1st,irregular,\nātī erātis,1st,passive,indicative,pluperfect,plural,2nd,regular,\nātī fueratis,1st,passive,indicative,pluperfect,plural,2nd,irregular,\nātī erant,1st,passive,indicative,pluperfect,plural,3rd,regular,\nātī fuerant,1st,passive,indicative,pluperfect,plural,3rd,irregular,\nātus essem,1st,passive,subjunctive,pluperfect,singular,1st,regular,\nātus fuissem,1st,passive,subjunctive,pluperfect,singular,1st,irregular,\nātus esses,1st,passive,subjunctive,pluperfect,singular,2nd,regular,\nātus fuissēs,1st,passive,subjunctive,pluperfect,singular,2nd,irregular,\nātus esset,1st,passive,subjunctive,pluperfect,singular,3rd,regular,\nātus fuisset,1st,passive,subjunctive,pluperfect,singular,3rd,irregular,\nāti essēmus,1st,passive,subjunctive,pluperfect,plural,1st,regular,\nāti fuissēmus,1st,passive,subjunctive,pluperfect,plural,1st,irregular,\nāti essētis,1st,passive,subjunctive,pluperfect,plural,2nd,regular,\nāti fuissētis,1st,passive,subjunctive,pluperfect,plural,2nd,regular,\nāti essent,1st,passive,subjunctive,pluperfect,plural,3rd,regular,\nāti fuissent,1st,passive,subjunctive,pluperfect,plural,3rd,regular,\nitus eram,2nd,passive,indicative,pluperfect,singular,1st,regular,\nitus erās,2nd,passive,indicative,pluperfect,singular,2nd,regular,\nitus erat,2nd,passive,indicative,pluperfect,singular,3rd,regular,\nitī erāmus,2nd,passive,indicative,pluperfect,plural,1st,regular,\nitī erātis,2nd,passive,indicative,pluperfect,plural,2nd,regular,\nitī erant,2nd,passive,indicative,pluperfect,plural,3rd,regular,\nitus essem,2nd,passive,subjunctive,pluperfect,singular,1st,regular,\nitus essēs,2nd,passive,subjunctive,pluperfect,singular,2nd,regular,\nitus esset,2nd,passive,subjunctive,pluperfect,singular,3rd,regular,\nitī essēmus,2nd,passive,subjunctive,pluperfect,plural,1st,regular,\nīti essētis,2nd,passive,subjunctive,pluperfect,plural,2nd,regular,\nīti essent,2nd,passive,subjunctive,pluperfect,plural,3rd,regular,\nus eram,3rd,passive,indicative,pluperfect,singular,1st,regular,\nus erās,3rd,passive,indicative,pluperfect,singular,2nd,regular,\nus erat,3rd,passive,indicative,pluperfect,singular,3rd,regular,\nī erāmus,3rd,passive,indicative,pluperfect,plural,1st,regular,\nī erātis,3rd,passive,indicative,pluperfect,plural,2nd,regular,\nī erant,3rd,passive,indicative,pluperfect,plural,3rd,regular,\nus essem,3rd,passive,subjunctive,pluperfect,singular,1st,regular,\nus essēs,3rd,passive,subjunctive,pluperfect,singular,2nd,regular,\nus esset,3rd,passive,subjunctive,pluperfect,singular,3rd,regular,\nī essēmus,3rd,passive,subjunctive,pluperfect,plural,1st,regular,\nī essētis,3rd,passive,subjunctive,pluperfect,plural,2nd,regular,\nī essent,3rd,passive,subjunctive,pluperfect,plural,3rd,regular,\nītus eram,4th,passive,indicative,pluperfect,singular,1st,regular,\nītus erās,4th,passive,indicative,pluperfect,singular,2nd,regular,\nītus erat,4th,passive,indicative,pluperfect,singular,3rd,regular,\nītī erāmus,4th,passive,indicative,pluperfect,plural,1st,regular,\nīti erātis,4th,passive,indicative,pluperfect,plural,2nd,regular,\nītī erant,4th,passive,indicative,pluperfect,plural,3rd,regular,\nītus essem,4th,passive,subjunctive,pluperfect,singular,1st,regular,\nītus essēs,4th,passive,subjunctive,pluperfect,singular,2nd,regular,\nītus esset,4th,passive,subjunctive,pluperfect,singular,3rd,regular,\nītī essēmus,4th,passive,subjunctive,pluperfect,plural,1st,regular,\nīti essētis,4th,passive,subjunctive,pluperfect,plural,2nd,regular,\nīti essent,4th,passive,subjunctive,pluperfect,plural,3rd,regular,\nātus erō,1st,passive,indicative,future_perfect,singular,1st,regular,\nātus eris,1st,passive,indicative,future_perfect,singular,2nd,regular,\nātus erit,1st,passive,indicative,future_perfect,singular,3rd,regular,\nāti erimus,1st,passive,indicative,future_perfect,plural,1st,regular,\nāti eritis,1st,passive,indicative,future_perfect,plural,2nd,regular,\nāti erunt,1st,passive,indicative,future_perfect,plural,3rd,regular,\n,1st,passive,subjunctive,future_perfect,singular,1st,,\n,1st,passive,subjunctive,future_perfect,singular,2nd,,\n,1st,passive,subjunctive,future_perfect,singular,3rd,,\n,1st,passive,subjunctive,future_perfect,plural,1st,,\n,1st,passive,subjunctive,future_perfect,plural,2nd,,\n,1st,passive,subjunctive,future_perfect,plural,3rd,,\nitus erō,2nd,passive,indicative,future_perfect,singular,1st,regular,\nitus eris,2nd,passive,indicative,future_perfect,singular,2nd,regular,\nitus erit,2nd,passive,indicative,future_perfect,singular,3rd,regular,\nitī erimus,2nd,passive,indicative,future_perfect,plural,1st,regular,\nitī eritis,2nd,passive,indicative,future_perfect,plural,2nd,regular,\nitī erunt,2nd,passive,indicative,future_perfect,plural,3rd,regular,\n,2nd,passive,subjunctive,future_perfect,singular,1st,,\n,2nd,passive,subjunctive,future_perfect,singular,2nd,,\n,2nd,passive,subjunctive,future_perfect,singular,3rd,,\n,2nd,passive,subjunctive,future_perfect,plural,1st,,\n,2nd,passive,subjunctive,future_perfect,plural,2nd,,\n,2nd,passive,subjunctive,future_perfect,plural,3rd,,\nus erō,3rd,passive,indicative,future_perfect,singular,1st,regular,\nus eris,3rd,passive,indicative,future_perfect,singular,2nd,regular,\nus erit,3rd,passive,indicative,future_perfect,singular,3rd,regular,\nī erimus,3rd,passive,indicative,future_perfect,plural,1st,regular,\nī eritis,3rd,passive,indicative,future_perfect,plural,2nd,regular,\nī erunt,3rd,passive,indicative,future_perfect,plural,3rd,regular,\n,3rd,passive,subjunctive,future_perfect,singular,1st,,\n,3rd,passive,subjunctive,future_perfect,singular,2nd,,\n,3rd,passive,subjunctive,future_perfect,singular,3rd,,\n,3rd,passive,subjunctive,future_perfect,plural,1st,,\n,3rd,passive,subjunctive,future_perfect,plural,2nd,,\n,3rd,passive,subjunctive,future_perfect,plural,3rd,,\nītus erō,4th,passive,indicative,future_perfect,singular,1st,regular,\nītus eris,4th,passive,indicative,future_perfect,singular,2nd,regular,\nītus erit,4th,passive,indicative,future_perfect,singular,3rd,regular,\nītī erimus,4th,passive,indicative,future_perfect,plural,1st,regular,\nītī eritis,4th,passive,indicative,future_perfect,plural,2nd,regular,\nītī erunt,4th,passive,indicative,future_perfect,plural,3rd,regular,\n,4th,passive,subjunctive,future_perfect,singular,1st,,\n,4th,passive,subjunctive,future_perfect,singular,2nd,,\n,4th,passive,subjunctive,future_perfect,singular,3rd,,\n,4th,passive,subjunctive,future_perfect,plural,1st,,\n,4th,passive,subjunctive,future_perfect,plural,2nd,,\n,4th,passive,subjunctive,future_perfect,plural,3rd,,";

var verbFootnotesCSV = "Index,Text\n2,Chiefly in poetry.\n3,\"In tenses based on the perfect stem (the perfect, pluperfect and future perfect of the Active voice) a v between two vowels is often lost with contraction of the two vowels, thus āvī to ā, ēvī to ē, ōvi to ō. Perfects in īvī often omit the v but rarely contract the vowels, except before ss or st, and sometimes in the third person. In addition to the use of v or u, the Active perfect stem can also be formed in a number of other ways, such as the addition of s to the root (eg carpsi), reduplication of the root (eg cecidi from cado), and simple lengthening of the vowel (eg vidī from video or legī from lego).\"\n4,\"Dic, duc, fac, and fer lack a final vowel in the imperative in classical Latin. The singular imperative of the verb sciō is always scītō, and the plural is usually scītōte.\"\n5,Common in epic poetry.\n6,Present in early Latin but chiefly confined to popular use until Livy and later writers.\n7,The verb fīō is a 4th conjugation verb that is irregular in only two forms: the present infinitive fierī and the imperfect subjunctive fierem.";

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var papaparse = createCommonjsModule(function (module, exports) {
/*!
	Papa Parse
	v4.3.6
	https://github.com/mholt/PapaParse
	License: MIT
*/
(function(root, factory)
{
	if (typeof undefined === 'function' && undefined.amd)
	{
		// AMD. Register as an anonymous module.
		undefined([], factory);
	}
	else {
		// Node. Does not work with strict CommonJS, but
		// only CommonJS-like environments that support module.exports,
		// like Node.
		module.exports = factory();
	}
}(this, function()
{
	'use strict';

	var global = (function () {
		// alternative method, similar to `Function('return this')()`
		// but without using `eval` (which is disabled when
		// using Content Security Policy).

		if (typeof self !== 'undefined') { return self; }
		if (typeof window !== 'undefined') { return window; }
		if (typeof global !== 'undefined') { return global; }

		// When running tests none of the above have been defined
		return {};
	})();


	var IS_WORKER = !global.document && !!global.postMessage,
		IS_PAPA_WORKER = IS_WORKER && /(\?|&)papaworker(=|&|$)/.test(global.location.search),
		LOADED_SYNC = false, AUTO_SCRIPT_PATH;
	var workers = {}, workerIdCounter = 0;

	var Papa = {};

	Papa.parse = CsvToJson;
	Papa.unparse = JsonToCsv;

	Papa.RECORD_SEP = String.fromCharCode(30);
	Papa.UNIT_SEP = String.fromCharCode(31);
	Papa.BYTE_ORDER_MARK = '\ufeff';
	Papa.BAD_DELIMITERS = ['\r', '\n', '"', Papa.BYTE_ORDER_MARK];
	Papa.WORKERS_SUPPORTED = !IS_WORKER && !!global.Worker;
	Papa.SCRIPT_PATH = null;	// Must be set by your code if you use workers and this lib is loaded asynchronously

	// Configurable chunk sizes for local and remote files, respectively
	Papa.LocalChunkSize = 1024 * 1024 * 10;	// 10 MB
	Papa.RemoteChunkSize = 1024 * 1024 * 5;	// 5 MB
	Papa.DefaultDelimiter = ',';			// Used if not specified and detection fails

	// Exposed for testing and development only
	Papa.Parser = Parser;
	Papa.ParserHandle = ParserHandle;
	Papa.NetworkStreamer = NetworkStreamer;
	Papa.FileStreamer = FileStreamer;
	Papa.StringStreamer = StringStreamer;
	Papa.ReadableStreamStreamer = ReadableStreamStreamer;

	if (global.jQuery)
	{
		var $ = global.jQuery;
		$.fn.parse = function(options)
		{
			var config = options.config || {};
			var queue = [];

			this.each(function(idx)
			{
				var supported = $(this).prop('tagName').toUpperCase() === 'INPUT'
								&& $(this).attr('type').toLowerCase() === 'file'
								&& global.FileReader;

				if (!supported || !this.files || this.files.length === 0)
					return true;	// continue to next input element

				for (var i = 0; i < this.files.length; i++)
				{
					queue.push({
						file: this.files[i],
						inputElem: this,
						instanceConfig: $.extend({}, config)
					});
				}
			});

			parseNextFile();	// begin parsing
			return this;		// maintains chainability


			function parseNextFile()
			{
				if (queue.length === 0)
				{
					if (isFunction(options.complete))
						options.complete();
					return;
				}

				var f = queue[0];

				if (isFunction(options.before))
				{
					var returned = options.before(f.file, f.inputElem);

					if (typeof returned === 'object')
					{
						if (returned.action === 'abort')
						{
							error('AbortError', f.file, f.inputElem, returned.reason);
							return;	// Aborts all queued files immediately
						}
						else if (returned.action === 'skip')
						{
							fileComplete();	// parse the next file in the queue, if any
							return;
						}
						else if (typeof returned.config === 'object')
							f.instanceConfig = $.extend(f.instanceConfig, returned.config);
					}
					else if (returned === 'skip')
					{
						fileComplete();	// parse the next file in the queue, if any
						return;
					}
				}

				// Wrap up the user's complete callback, if any, so that ours also gets executed
				var userCompleteFunc = f.instanceConfig.complete;
				f.instanceConfig.complete = function(results)
				{
					if (isFunction(userCompleteFunc))
						userCompleteFunc(results, f.file, f.inputElem);
					fileComplete();
				};

				Papa.parse(f.file, f.instanceConfig);
			}

			function error(name, file, elem, reason)
			{
				if (isFunction(options.error))
					options.error({name: name}, file, elem, reason);
			}

			function fileComplete()
			{
				queue.splice(0, 1);
				parseNextFile();
			}
		};
	}


	if (IS_PAPA_WORKER)
	{
		global.onmessage = workerThreadReceivedMessage;
	}
	else if (Papa.WORKERS_SUPPORTED)
	{
		AUTO_SCRIPT_PATH = getScriptPath();

		// Check if the script was loaded synchronously
		if (!document.body)
		{
			// Body doesn't exist yet, must be synchronous
			LOADED_SYNC = true;
		}
		else
		{
			document.addEventListener('DOMContentLoaded', function () {
				LOADED_SYNC = true;
			}, true);
		}
	}




	function CsvToJson(_input, _config)
	{
		_config = _config || {};
		var dynamicTyping = _config.dynamicTyping || false;
		if (isFunction(dynamicTyping)) {
			_config.dynamicTypingFunction = dynamicTyping;
			// Will be filled on first row call
			dynamicTyping = {};
		}
		_config.dynamicTyping = dynamicTyping;

		if (_config.worker && Papa.WORKERS_SUPPORTED)
		{
			var w = newWorker();

			w.userStep = _config.step;
			w.userChunk = _config.chunk;
			w.userComplete = _config.complete;
			w.userError = _config.error;

			_config.step = isFunction(_config.step);
			_config.chunk = isFunction(_config.chunk);
			_config.complete = isFunction(_config.complete);
			_config.error = isFunction(_config.error);
			delete _config.worker;	// prevent infinite loop

			w.postMessage({
				input: _input,
				config: _config,
				workerId: w.id
			});

			return;
		}

		var streamer = null;
		if (typeof _input === 'string')
		{
			if (_config.download)
				streamer = new NetworkStreamer(_config);
			else
				streamer = new StringStreamer(_config);
		}
		else if (_input.readable === true && isFunction(_input.read) && isFunction(_input.on))
		{
			streamer = new ReadableStreamStreamer(_config);
		}
		else if ((global.File && _input instanceof File) || _input instanceof Object)	// ...Safari. (see issue #106)
			streamer = new FileStreamer(_config);

		return streamer.stream(_input);
	}






	function JsonToCsv(_input, _config)
	{
		var _output = '';
		var _fields = [];

		// Default configuration

		/** whether to surround every datum with quotes */
		var _quotes = false;

		/** whether to write headers */
		var _writeHeader = true;

		/** delimiting character */
		var _delimiter = ',';

		/** newline character(s) */
		var _newline = '\r\n';

		/** quote character */
		var _quoteChar = '"';

		unpackConfig();

		var quoteCharRegex = new RegExp(_quoteChar, 'g');

		if (typeof _input === 'string')
			_input = JSON.parse(_input);

		if (_input instanceof Array)
		{
			if (!_input.length || _input[0] instanceof Array)
				return serialize(null, _input);
			else if (typeof _input[0] === 'object')
				return serialize(objectKeys(_input[0]), _input);
		}
		else if (typeof _input === 'object')
		{
			if (typeof _input.data === 'string')
				_input.data = JSON.parse(_input.data);

			if (_input.data instanceof Array)
			{
				if (!_input.fields)
					_input.fields =  _input.meta && _input.meta.fields;

				if (!_input.fields)
					_input.fields =  _input.data[0] instanceof Array
									? _input.fields
									: objectKeys(_input.data[0]);

				if (!(_input.data[0] instanceof Array) && typeof _input.data[0] !== 'object')
					_input.data = [_input.data];	// handles input like [1,2,3] or ['asdf']
			}

			return serialize(_input.fields || [], _input.data || []);
		}

		// Default (any valid paths should return before this)
		throw 'exception: Unable to serialize unrecognized input';


		function unpackConfig()
		{
			if (typeof _config !== 'object')
				return;

			if (typeof _config.delimiter === 'string'
				&& _config.delimiter.length === 1
				&& Papa.BAD_DELIMITERS.indexOf(_config.delimiter) === -1)
			{
				_delimiter = _config.delimiter;
			}

			if (typeof _config.quotes === 'boolean'
				|| _config.quotes instanceof Array)
				_quotes = _config.quotes;

			if (typeof _config.newline === 'string')
				_newline = _config.newline;

			if (typeof _config.quoteChar === 'string')
				_quoteChar = _config.quoteChar;

			if (typeof _config.header === 'boolean')
				_writeHeader = _config.header;
		}


		/** Turns an object's keys into an array */
		function objectKeys(obj)
		{
			if (typeof obj !== 'object')
				return [];
			var keys = [];
			for (var key in obj)
				keys.push(key);
			return keys;
		}

		/** The double for loop that iterates the data and writes out a CSV string including header row */
		function serialize(fields, data)
		{
			var csv = '';

			if (typeof fields === 'string')
				fields = JSON.parse(fields);
			if (typeof data === 'string')
				data = JSON.parse(data);

			var hasHeader = fields instanceof Array && fields.length > 0;
			var dataKeyedByField = !(data[0] instanceof Array);

			// If there a header row, write it first
			if (hasHeader && _writeHeader)
			{
				for (var i = 0; i < fields.length; i++)
				{
					if (i > 0)
						csv += _delimiter;
					csv += safe(fields[i], i);
				}
				if (data.length > 0)
					csv += _newline;
			}

			// Then write out the data
			for (var row = 0; row < data.length; row++)
			{
				var maxCol = hasHeader ? fields.length : data[row].length;

				for (var col = 0; col < maxCol; col++)
				{
					if (col > 0)
						csv += _delimiter;
					var colIdx = hasHeader && dataKeyedByField ? fields[col] : col;
					csv += safe(data[row][colIdx], col);
				}

				if (row < data.length - 1)
					csv += _newline;
			}

			return csv;
		}

		/** Encloses a value around quotes if needed (makes a value safe for CSV insertion) */
		function safe(str, col)
		{
			if (typeof str === 'undefined' || str === null)
				return '';

			str = str.toString().replace(quoteCharRegex, _quoteChar+_quoteChar);

			var needsQuotes = (typeof _quotes === 'boolean' && _quotes)
							|| (_quotes instanceof Array && _quotes[col])
							|| hasAny(str, Papa.BAD_DELIMITERS)
							|| str.indexOf(_delimiter) > -1
							|| str.charAt(0) === ' '
							|| str.charAt(str.length - 1) === ' ';

			return needsQuotes ? _quoteChar + str + _quoteChar : str;
		}

		function hasAny(str, substrings)
		{
			for (var i = 0; i < substrings.length; i++)
				if (str.indexOf(substrings[i]) > -1)
					return true;
			return false;
		}
	}

	/** ChunkStreamer is the base prototype for various streamer implementations. */
	function ChunkStreamer(config)
	{
		this._handle = null;
		this._paused = false;
		this._finished = false;
		this._input = null;
		this._baseIndex = 0;
		this._partialLine = '';
		this._rowCount = 0;
		this._start = 0;
		this._nextChunk = null;
		this.isFirstChunk = true;
		this._completeResults = {
			data: [],
			errors: [],
			meta: {}
		};
		replaceConfig.call(this, config);

		this.parseChunk = function(chunk)
		{
			// First chunk pre-processing
			if (this.isFirstChunk && isFunction(this._config.beforeFirstChunk))
			{
				var modifiedChunk = this._config.beforeFirstChunk(chunk);
				if (modifiedChunk !== undefined)
					chunk = modifiedChunk;
			}
			this.isFirstChunk = false;

			// Rejoin the line we likely just split in two by chunking the file
			var aggregate = this._partialLine + chunk;
			this._partialLine = '';

			var results = this._handle.parse(aggregate, this._baseIndex, !this._finished);

			if (this._handle.paused() || this._handle.aborted())
				return;

			var lastIndex = results.meta.cursor;

			if (!this._finished)
			{
				this._partialLine = aggregate.substring(lastIndex - this._baseIndex);
				this._baseIndex = lastIndex;
			}

			if (results && results.data)
				this._rowCount += results.data.length;

			var finishedIncludingPreview = this._finished || (this._config.preview && this._rowCount >= this._config.preview);

			if (IS_PAPA_WORKER)
			{
				global.postMessage({
					results: results,
					workerId: Papa.WORKER_ID,
					finished: finishedIncludingPreview
				});
			}
			else if (isFunction(this._config.chunk))
			{
				this._config.chunk(results, this._handle);
				if (this._paused)
					return;
				results = undefined;
				this._completeResults = undefined;
			}

			if (!this._config.step && !this._config.chunk) {
				this._completeResults.data = this._completeResults.data.concat(results.data);
				this._completeResults.errors = this._completeResults.errors.concat(results.errors);
				this._completeResults.meta = results.meta;
			}

			if (finishedIncludingPreview && isFunction(this._config.complete) && (!results || !results.meta.aborted))
				this._config.complete(this._completeResults, this._input);

			if (!finishedIncludingPreview && (!results || !results.meta.paused))
				this._nextChunk();

			return results;
		};

		this._sendError = function(error)
		{
			if (isFunction(this._config.error))
				this._config.error(error);
			else if (IS_PAPA_WORKER && this._config.error)
			{
				global.postMessage({
					workerId: Papa.WORKER_ID,
					error: error,
					finished: false
				});
			}
		};

		function replaceConfig(config)
		{
			// Deep-copy the config so we can edit it
			var configCopy = copy(config);
			configCopy.chunkSize = parseInt(configCopy.chunkSize);	// parseInt VERY important so we don't concatenate strings!
			if (!config.step && !config.chunk)
				configCopy.chunkSize = null;  // disable Range header if not streaming; bad values break IIS - see issue #196
			this._handle = new ParserHandle(configCopy);
			this._handle.streamer = this;
			this._config = configCopy;	// persist the copy to the caller
		}
	}


	function NetworkStreamer(config)
	{
		config = config || {};
		if (!config.chunkSize)
			config.chunkSize = Papa.RemoteChunkSize;
		ChunkStreamer.call(this, config);

		var xhr;

		if (IS_WORKER)
		{
			this._nextChunk = function()
			{
				this._readChunk();
				this._chunkLoaded();
			};
		}
		else
		{
			this._nextChunk = function()
			{
				this._readChunk();
			};
		}

		this.stream = function(url)
		{
			this._input = url;
			this._nextChunk();	// Starts streaming
		};

		this._readChunk = function()
		{
			if (this._finished)
			{
				this._chunkLoaded();
				return;
			}

			xhr = new XMLHttpRequest();

			if (this._config.withCredentials)
			{
				xhr.withCredentials = this._config.withCredentials;
			}

			if (!IS_WORKER)
			{
				xhr.onload = bindFunction(this._chunkLoaded, this);
				xhr.onerror = bindFunction(this._chunkError, this);
			}

			xhr.open('GET', this._input, !IS_WORKER);
			// Headers can only be set when once the request state is OPENED
			if (this._config.downloadRequestHeaders)
			{
				var headers = this._config.downloadRequestHeaders;

				for (var headerName in headers)
				{
					xhr.setRequestHeader(headerName, headers[headerName]);
				}
			}

			if (this._config.chunkSize)
			{
				var end = this._start + this._config.chunkSize - 1;	// minus one because byte range is inclusive
				xhr.setRequestHeader('Range', 'bytes='+this._start+'-'+end);
				xhr.setRequestHeader('If-None-Match', 'webkit-no-cache'); // https://bugs.webkit.org/show_bug.cgi?id=82672
			}

			try {
				xhr.send();
			}
			catch (err) {
				this._chunkError(err.message);
			}

			if (IS_WORKER && xhr.status === 0)
				this._chunkError();
			else
				this._start += this._config.chunkSize;
		};

		this._chunkLoaded = function()
		{
			if (xhr.readyState != 4)
				return;

			if (xhr.status < 200 || xhr.status >= 400)
			{
				this._chunkError();
				return;
			}

			this._finished = !this._config.chunkSize || this._start > getFileSize(xhr);
			this.parseChunk(xhr.responseText);
		};

		this._chunkError = function(errorMessage)
		{
			var errorText = xhr.statusText || errorMessage;
			this._sendError(errorText);
		};

		function getFileSize(xhr)
		{
			var contentRange = xhr.getResponseHeader('Content-Range');
			if (contentRange === null) { // no content range, then finish!
					return -1;
					}
			return parseInt(contentRange.substr(contentRange.lastIndexOf('/') + 1));
		}
	}
	NetworkStreamer.prototype = Object.create(ChunkStreamer.prototype);
	NetworkStreamer.prototype.constructor = NetworkStreamer;


	function FileStreamer(config)
	{
		config = config || {};
		if (!config.chunkSize)
			config.chunkSize = Papa.LocalChunkSize;
		ChunkStreamer.call(this, config);

		var reader, slice;

		// FileReader is better than FileReaderSync (even in worker) - see http://stackoverflow.com/q/24708649/1048862
		// But Firefox is a pill, too - see issue #76: https://github.com/mholt/PapaParse/issues/76
		var usingAsyncReader = typeof FileReader !== 'undefined';	// Safari doesn't consider it a function - see issue #105

		this.stream = function(file)
		{
			this._input = file;
			slice = file.slice || file.webkitSlice || file.mozSlice;

			if (usingAsyncReader)
			{
				reader = new FileReader();		// Preferred method of reading files, even in workers
				reader.onload = bindFunction(this._chunkLoaded, this);
				reader.onerror = bindFunction(this._chunkError, this);
			}
			else
				reader = new FileReaderSync();	// Hack for running in a web worker in Firefox

			this._nextChunk();	// Starts streaming
		};

		this._nextChunk = function()
		{
			if (!this._finished && (!this._config.preview || this._rowCount < this._config.preview))
				this._readChunk();
		};

		this._readChunk = function()
		{
			var input = this._input;
			if (this._config.chunkSize)
			{
				var end = Math.min(this._start + this._config.chunkSize, this._input.size);
				input = slice.call(input, this._start, end);
			}
			var txt = reader.readAsText(input, this._config.encoding);
			if (!usingAsyncReader)
				this._chunkLoaded({ target: { result: txt } });	// mimic the async signature
		};

		this._chunkLoaded = function(event)
		{
			// Very important to increment start each time before handling results
			this._start += this._config.chunkSize;
			this._finished = !this._config.chunkSize || this._start >= this._input.size;
			this.parseChunk(event.target.result);
		};

		this._chunkError = function()
		{
			this._sendError(reader.error);
		};

	}
	FileStreamer.prototype = Object.create(ChunkStreamer.prototype);
	FileStreamer.prototype.constructor = FileStreamer;


	function StringStreamer(config)
	{
		config = config || {};
		ChunkStreamer.call(this, config);

		var string;
		var remaining;
		this.stream = function(s)
		{
			string = s;
			remaining = s;
			return this._nextChunk();
		};
		this._nextChunk = function()
		{
			if (this._finished) return;
			var size = this._config.chunkSize;
			var chunk = size ? remaining.substr(0, size) : remaining;
			remaining = size ? remaining.substr(size) : '';
			this._finished = !remaining;
			return this.parseChunk(chunk);
		};
	}
	StringStreamer.prototype = Object.create(StringStreamer.prototype);
	StringStreamer.prototype.constructor = StringStreamer;


	function ReadableStreamStreamer(config)
	{
		config = config || {};

		ChunkStreamer.call(this, config);

		var queue = [];
		var parseOnData = true;

		this.stream = function(stream)
		{
			this._input = stream;

			this._input.on('data', this._streamData);
			this._input.on('end', this._streamEnd);
			this._input.on('error', this._streamError);
		};

		this._nextChunk = function()
		{
			if (queue.length)
			{
				this.parseChunk(queue.shift());
			}
			else
			{
				parseOnData = true;
			}
		};

		this._streamData = bindFunction(function(chunk)
		{
			try
			{
				queue.push(typeof chunk === 'string' ? chunk : chunk.toString(this._config.encoding));

				if (parseOnData)
				{
					parseOnData = false;
					this.parseChunk(queue.shift());
				}
			}
			catch (error)
			{
				this._streamError(error);
			}
		}, this);

		this._streamError = bindFunction(function(error)
		{
			this._streamCleanUp();
			this._sendError(error.message);
		}, this);

		this._streamEnd = bindFunction(function()
		{
			this._streamCleanUp();
			this._finished = true;
			this._streamData('');
		}, this);

		this._streamCleanUp = bindFunction(function()
		{
			this._input.removeListener('data', this._streamData);
			this._input.removeListener('end', this._streamEnd);
			this._input.removeListener('error', this._streamError);
		}, this);
	}
	ReadableStreamStreamer.prototype = Object.create(ChunkStreamer.prototype);
	ReadableStreamStreamer.prototype.constructor = ReadableStreamStreamer;


	// Use one ParserHandle per entire CSV file or string
	function ParserHandle(_config)
	{
		// One goal is to minimize the use of regular expressions...
		var FLOAT = /^\s*-?(\d*\.?\d+|\d+\.?\d*)(e[-+]?\d+)?\s*$/i;

		var self = this;
		var _stepCounter = 0;	// Number of times step was called (number of rows parsed)
		var _input;				// The input being parsed
		var _parser;			// The core parser being used
		var _paused = false;	// Whether we are paused or not
		var _aborted = false;	// Whether the parser has aborted or not
		var _delimiterError;	// Temporary state between delimiter detection and processing results
		var _fields = [];		// Fields are from the header row of the input, if there is one
		var _results = {		// The last results returned from the parser
			data: [],
			errors: [],
			meta: {}
		};

		if (isFunction(_config.step))
		{
			var userStep = _config.step;
			_config.step = function(results)
			{
				_results = results;

				if (needsHeaderRow())
					processResults();
				else	// only call user's step function after header row
				{
					processResults();

					// It's possbile that this line was empty and there's no row here after all
					if (_results.data.length === 0)
						return;

					_stepCounter += results.data.length;
					if (_config.preview && _stepCounter > _config.preview)
						_parser.abort();
					else
						userStep(_results, self);
				}
			};
		}

		/**
		 * Parses input. Most users won't need, and shouldn't mess with, the baseIndex
		 * and ignoreLastRow parameters. They are used by streamers (wrapper functions)
		 * when an input comes in multiple chunks, like from a file.
		 */
		this.parse = function(input, baseIndex, ignoreLastRow)
		{
			if (!_config.newline)
				_config.newline = guessLineEndings(input);

			_delimiterError = false;
			if (!_config.delimiter)
			{
				var delimGuess = guessDelimiter(input, _config.newline, _config.skipEmptyLines);
				if (delimGuess.successful)
					_config.delimiter = delimGuess.bestDelimiter;
				else
				{
					_delimiterError = true;	// add error after parsing (otherwise it would be overwritten)
					_config.delimiter = Papa.DefaultDelimiter;
				}
				_results.meta.delimiter = _config.delimiter;
			}
			else if(isFunction(_config.delimiter))
			{
				_config.delimiter = _config.delimiter(input);
				_results.meta.delimiter = _config.delimiter;
			}

			var parserConfig = copy(_config);
			if (_config.preview && _config.header)
				parserConfig.preview++;	// to compensate for header row

			_input = input;
			_parser = new Parser(parserConfig);
			_results = _parser.parse(_input, baseIndex, ignoreLastRow);
			processResults();
			return _paused ? { meta: { paused: true } } : (_results || { meta: { paused: false } });
		};

		this.paused = function()
		{
			return _paused;
		};

		this.pause = function()
		{
			_paused = true;
			_parser.abort();
			_input = _input.substr(_parser.getCharIndex());
		};

		this.resume = function()
		{
			_paused = false;
			self.streamer.parseChunk(_input);
		};

		this.aborted = function ()
		{
			return _aborted;
		};

		this.abort = function()
		{
			_aborted = true;
			_parser.abort();
			_results.meta.aborted = true;
			if (isFunction(_config.complete))
				_config.complete(_results);
			_input = '';
		};

		function processResults()
		{
			if (_results && _delimiterError)
			{
				addError('Delimiter', 'UndetectableDelimiter', 'Unable to auto-detect delimiting character; defaulted to \''+Papa.DefaultDelimiter+'\'');
				_delimiterError = false;
			}

			if (_config.skipEmptyLines)
			{
				for (var i = 0; i < _results.data.length; i++)
					if (_results.data[i].length === 1 && _results.data[i][0] === '')
						_results.data.splice(i--, 1);
			}

			if (needsHeaderRow())
				fillHeaderFields();

			return applyHeaderAndDynamicTyping();
		}

		function needsHeaderRow()
		{
			return _config.header && _fields.length === 0;
		}

		function fillHeaderFields()
		{
			if (!_results)
				return;
			for (var i = 0; needsHeaderRow() && i < _results.data.length; i++)
				for (var j = 0; j < _results.data[i].length; j++)
					_fields.push(_results.data[i][j]);
			_results.data.splice(0, 1);
		}

		function shouldApplyDynamicTyping(field) {
			// Cache function values to avoid calling it for each row
			if (_config.dynamicTypingFunction && _config.dynamicTyping[field] === undefined) {
				_config.dynamicTyping[field] = _config.dynamicTypingFunction(field);
			}
			return (_config.dynamicTyping[field] || _config.dynamicTyping) === true
		}

		function parseDynamic(field, value)
		{
			if (shouldApplyDynamicTyping(field))
			{
				if (value === 'true' || value === 'TRUE')
					return true;
				else if (value === 'false' || value === 'FALSE')
					return false;
				else
					return tryParseFloat(value);
			}
			return value;
		}

		function applyHeaderAndDynamicTyping()
		{
			if (!_results || (!_config.header && !_config.dynamicTyping))
				return _results;

			for (var i = 0; i < _results.data.length; i++)
			{
				var row = _config.header ? {} : [];

				for (var j = 0; j < _results.data[i].length; j++)
				{
					var field = j;
					var value = _results.data[i][j];

					if (_config.header)
						field = j >= _fields.length ? '__parsed_extra' : _fields[j];

					value = parseDynamic(field, value);

					if (field === '__parsed_extra')
					{
						row[field] = row[field] || [];
						row[field].push(value);
					}
					else
						row[field] = value;
				}

				_results.data[i] = row;

				if (_config.header)
				{
					if (j > _fields.length)
						addError('FieldMismatch', 'TooManyFields', 'Too many fields: expected ' + _fields.length + ' fields but parsed ' + j, i);
					else if (j < _fields.length)
						addError('FieldMismatch', 'TooFewFields', 'Too few fields: expected ' + _fields.length + ' fields but parsed ' + j, i);
				}
			}

			if (_config.header && _results.meta)
				_results.meta.fields = _fields;
			return _results;
		}

		function guessDelimiter(input, newline, skipEmptyLines)
		{
			var delimChoices = [',', '\t', '|', ';', Papa.RECORD_SEP, Papa.UNIT_SEP];
			var bestDelim, bestDelta, fieldCountPrevRow;

			for (var i = 0; i < delimChoices.length; i++)
			{
				var delim = delimChoices[i];
				var delta = 0, avgFieldCount = 0, emptyLinesCount = 0;
				fieldCountPrevRow = undefined;

				var preview = new Parser({
					delimiter: delim,
					newline: newline,
					preview: 10
				}).parse(input);

				for (var j = 0; j < preview.data.length; j++)
				{
					if (skipEmptyLines && preview.data[j].length === 1 && preview.data[j][0].length === 0) {
						emptyLinesCount++;
						continue
					}
					var fieldCount = preview.data[j].length;
					avgFieldCount += fieldCount;

					if (typeof fieldCountPrevRow === 'undefined')
					{
						fieldCountPrevRow = fieldCount;
						continue;
					}
					else if (fieldCount > 1)
					{
						delta += Math.abs(fieldCount - fieldCountPrevRow);
						fieldCountPrevRow = fieldCount;
					}
				}

				if (preview.data.length > 0)
					avgFieldCount /= (preview.data.length - emptyLinesCount);

				if ((typeof bestDelta === 'undefined' || delta < bestDelta)
					&& avgFieldCount > 1.99)
				{
					bestDelta = delta;
					bestDelim = delim;
				}
			}

			_config.delimiter = bestDelim;

			return {
				successful: !!bestDelim,
				bestDelimiter: bestDelim
			}
		}

		function guessLineEndings(input)
		{
			input = input.substr(0, 1024*1024);	// max length 1 MB

			var r = input.split('\r');

			var n = input.split('\n');

			var nAppearsFirst = (n.length > 1 && n[0].length < r[0].length);

			if (r.length === 1 || nAppearsFirst)
				return '\n';

			var numWithN = 0;
			for (var i = 0; i < r.length; i++)
			{
				if (r[i][0] === '\n')
					numWithN++;
			}

			return numWithN >= r.length / 2 ? '\r\n' : '\r';
		}

		function tryParseFloat(val)
		{
			var isNumber = FLOAT.test(val);
			return isNumber ? parseFloat(val) : val;
		}

		function addError(type, code, msg, row)
		{
			_results.errors.push({
				type: type,
				code: code,
				message: msg,
				row: row
			});
		}
	}





	/** The core parser implements speedy and correct CSV parsing */
	function Parser(config)
	{
		// Unpack the config object
		config = config || {};
		var delim = config.delimiter;
		var newline = config.newline;
		var comments = config.comments;
		var step = config.step;
		var preview = config.preview;
		var fastMode = config.fastMode;
		var quoteChar = config.quoteChar || '"';

		// Delimiter must be valid
		if (typeof delim !== 'string'
			|| Papa.BAD_DELIMITERS.indexOf(delim) > -1)
			delim = ',';

		// Comment character must be valid
		if (comments === delim)
			throw 'Comment character same as delimiter';
		else if (comments === true)
			comments = '#';
		else if (typeof comments !== 'string'
			|| Papa.BAD_DELIMITERS.indexOf(comments) > -1)
			comments = false;

		// Newline must be valid: \r, \n, or \r\n
		if (newline != '\n' && newline != '\r' && newline != '\r\n')
			newline = '\n';

		// We're gonna need these at the Parser scope
		var cursor = 0;
		var aborted = false;

		this.parse = function(input, baseIndex, ignoreLastRow)
		{
			// For some reason, in Chrome, this speeds things up (!?)
			if (typeof input !== 'string')
				throw 'Input must be a string';

			// We don't need to compute some of these every time parse() is called,
			// but having them in a more local scope seems to perform better
			var inputLen = input.length,
				delimLen = delim.length,
				newlineLen = newline.length,
				commentsLen = comments.length;
			var stepIsFunction = isFunction(step);

			// Establish starting state
			cursor = 0;
			var data = [], errors = [], row = [], lastCursor = 0;

			if (!input)
				return returnable();

			if (fastMode || (fastMode !== false && input.indexOf(quoteChar) === -1))
			{
				var rows = input.split(newline);
				for (var i = 0; i < rows.length; i++)
				{
					var row = rows[i];
					cursor += row.length;
					if (i !== rows.length - 1)
						cursor += newline.length;
					else if (ignoreLastRow)
						return returnable();
					if (comments && row.substr(0, commentsLen) === comments)
						continue;
					if (stepIsFunction)
					{
						data = [];
						pushRow(row.split(delim));
						doStep();
						if (aborted)
							return returnable();
					}
					else
						pushRow(row.split(delim));
					if (preview && i >= preview)
					{
						data = data.slice(0, preview);
						return returnable(true);
					}
				}
				return returnable();
			}

			var nextDelim = input.indexOf(delim, cursor);
			var nextNewline = input.indexOf(newline, cursor);
			var quoteCharRegex = new RegExp(quoteChar+quoteChar, 'g');

			// Parser loop
			for (;;)
			{
				// Field has opening quote
				if (input[cursor] === quoteChar)
				{
					// Start our search for the closing quote where the cursor is
					var quoteSearch = cursor;

					// Skip the opening quote
					cursor++;

					for (;;)
					{
						// Find closing quote
						var quoteSearch = input.indexOf(quoteChar, quoteSearch+1);

						//No other quotes are found - no other delimiters
						if (quoteSearch === -1)
						{
							if (!ignoreLastRow) {
								// No closing quote... what a pity
								errors.push({
									type: 'Quotes',
									code: 'MissingQuotes',
									message: 'Quoted field unterminated',
									row: data.length,	// row has yet to be inserted
									index: cursor
								});
							}
							return finish();
						}

						// Closing quote at EOF
						if (quoteSearch === inputLen-1)
						{
							var value = input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar);
							return finish(value);
						}

						// If this quote is escaped, it's part of the data; skip it
						if (input[quoteSearch+1] === quoteChar)
						{
							quoteSearch++;
							continue;
						}

						// Closing quote followed by delimiter
						if (input[quoteSearch+1] === delim)
						{
							row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar));
							cursor = quoteSearch + 1 + delimLen;
							nextDelim = input.indexOf(delim, cursor);
							nextNewline = input.indexOf(newline, cursor);
							break;
						}

						// Closing quote followed by newline
						if (input.substr(quoteSearch+1, newlineLen) === newline)
						{
							row.push(input.substring(cursor, quoteSearch).replace(quoteCharRegex, quoteChar));
							saveRow(quoteSearch + 1 + newlineLen);
							nextDelim = input.indexOf(delim, cursor);	// because we may have skipped the nextDelim in the quoted field

							if (stepIsFunction)
							{
								doStep();
								if (aborted)
									return returnable();
							}

							if (preview && data.length >= preview)
								return returnable(true);

							break;
						}


						// Checks for valid closing quotes are complete (escaped quotes or quote followed by EOF/delimiter/newline) -- assume these quotes are part of an invalid text string
						errors.push({
							type: 'Quotes',
							code: 'InvalidQuotes',
							message: 'Trailing quote on quoted field is malformed',
							row: data.length,	// row has yet to be inserted
							index: cursor
						});

						quoteSearch++;
						continue;

					}

					continue;
				}

				// Comment found at start of new line
				if (comments && row.length === 0 && input.substr(cursor, commentsLen) === comments)
				{
					if (nextNewline === -1)	// Comment ends at EOF
						return returnable();
					cursor = nextNewline + newlineLen;
					nextNewline = input.indexOf(newline, cursor);
					nextDelim = input.indexOf(delim, cursor);
					continue;
				}

				// Next delimiter comes before next newline, so we've reached end of field
				if (nextDelim !== -1 && (nextDelim < nextNewline || nextNewline === -1))
				{
					row.push(input.substring(cursor, nextDelim));
					cursor = nextDelim + delimLen;
					nextDelim = input.indexOf(delim, cursor);
					continue;
				}

				// End of row
				if (nextNewline !== -1)
				{
					row.push(input.substring(cursor, nextNewline));
					saveRow(nextNewline + newlineLen);

					if (stepIsFunction)
					{
						doStep();
						if (aborted)
							return returnable();
					}

					if (preview && data.length >= preview)
						return returnable(true);

					continue;
				}

				break;
			}


			return finish();


			function pushRow(row)
			{
				data.push(row);
				lastCursor = cursor;
			}

			/**
			 * Appends the remaining input from cursor to the end into
			 * row, saves the row, calls step, and returns the results.
			 */
			function finish(value)
			{
				if (ignoreLastRow)
					return returnable();
				if (typeof value === 'undefined')
					value = input.substr(cursor);
				row.push(value);
				cursor = inputLen;	// important in case parsing is paused
				pushRow(row);
				if (stepIsFunction)
					doStep();
				return returnable();
			}

			/**
			 * Appends the current row to the results. It sets the cursor
			 * to newCursor and finds the nextNewline. The caller should
			 * take care to execute user's step function and check for
			 * preview and end parsing if necessary.
			 */
			function saveRow(newCursor)
			{
				cursor = newCursor;
				pushRow(row);
				row = [];
				nextNewline = input.indexOf(newline, cursor);
			}

			/** Returns an object with the results, errors, and meta. */
			function returnable(stopped)
			{
				return {
					data: data,
					errors: errors,
					meta: {
						delimiter: delim,
						linebreak: newline,
						aborted: aborted,
						truncated: !!stopped,
						cursor: lastCursor + (baseIndex || 0)
					}
				};
			}

			/** Executes the user's step function and resets data & errors. */
			function doStep()
			{
				step(returnable());
				data = [], errors = [];
			}
		};

		/** Sets the abort flag */
		this.abort = function()
		{
			aborted = true;
		};

		/** Gets the cursor position */
		this.getCharIndex = function()
		{
			return cursor;
		};
	}


	// If you need to load Papa Parse asynchronously and you also need worker threads, hard-code
	// the script path here. See: https://github.com/mholt/PapaParse/issues/87#issuecomment-57885358
	function getScriptPath()
	{
		var scripts = document.getElementsByTagName('script');
		return scripts.length ? scripts[scripts.length - 1].src : '';
	}

	function newWorker()
	{
		if (!Papa.WORKERS_SUPPORTED)
			return false;
		if (!LOADED_SYNC && Papa.SCRIPT_PATH === null)
			throw new Error(
				'Script path cannot be determined automatically when Papa Parse is loaded asynchronously. ' +
				'You need to set Papa.SCRIPT_PATH manually.'
			);
		var workerUrl = Papa.SCRIPT_PATH || AUTO_SCRIPT_PATH;
		// Append 'papaworker' to the search string to tell papaparse that this is our worker.
		workerUrl += (workerUrl.indexOf('?') !== -1 ? '&' : '?') + 'papaworker';
		var w = new global.Worker(workerUrl);
		w.onmessage = mainThreadReceivedMessage;
		w.id = workerIdCounter++;
		workers[w.id] = w;
		return w;
	}

	/** Callback when main thread receives a message */
	function mainThreadReceivedMessage(e)
	{
		var msg = e.data;
		var worker = workers[msg.workerId];
		var aborted = false;

		if (msg.error)
			worker.userError(msg.error, msg.file);
		else if (msg.results && msg.results.data)
		{
			var abort = function() {
				aborted = true;
				completeWorker(msg.workerId, { data: [], errors: [], meta: { aborted: true } });
			};

			var handle = {
				abort: abort,
				pause: notImplemented,
				resume: notImplemented
			};

			if (isFunction(worker.userStep))
			{
				for (var i = 0; i < msg.results.data.length; i++)
				{
					worker.userStep({
						data: [msg.results.data[i]],
						errors: msg.results.errors,
						meta: msg.results.meta
					}, handle);
					if (aborted)
						break;
				}
				delete msg.results;	// free memory ASAP
			}
			else if (isFunction(worker.userChunk))
			{
				worker.userChunk(msg.results, handle, msg.file);
				delete msg.results;
			}
		}

		if (msg.finished && !aborted)
			completeWorker(msg.workerId, msg.results);
	}

	function completeWorker(workerId, results) {
		var worker = workers[workerId];
		if (isFunction(worker.userComplete))
			worker.userComplete(results);
		worker.terminate();
		delete workers[workerId];
	}

	function notImplemented() {
		throw 'Not implemented.';
	}

	/** Callback when worker thread receives a message */
	function workerThreadReceivedMessage(e)
	{
		var msg = e.data;

		if (typeof Papa.WORKER_ID === 'undefined' && msg)
			Papa.WORKER_ID = msg.workerId;

		if (typeof msg.input === 'string')
		{
			global.postMessage({
				workerId: Papa.WORKER_ID,
				results: Papa.parse(msg.input, msg.config),
				finished: true
			});
		}
		else if ((global.File && msg.input instanceof File) || msg.input instanceof Object)	// thank you, Safari (see issue #106)
		{
			var results = Papa.parse(msg.input, msg.config);
			if (results)
				global.postMessage({
					workerId: Papa.WORKER_ID,
					results: results,
					finished: true
				});
		}
	}

	/** Makes a deep copy of an array or object (mostly) */
	function copy(obj)
	{
		if (typeof obj !== 'object')
			return obj;
		var cpy = obj instanceof Array ? [] : {};
		for (var key in obj)
			cpy[key] = copy(obj[key]);
		return cpy;
	}

	function bindFunction(f, self)
	{
		return function() { f.apply(self, arguments); };
	}

	function isFunction(func)
	{
		return typeof func === 'function';
	}

	return Papa;
}));
});

/*
 * Latin language data module
 */
let languageModel = new LatinLanguageModel();
let types = Feature.types;
// A language of this module
const language = languages.latin;
// Create a language data set that will keep all language-related information
let dataSet = new LanguageDataset(language);

// region Definition of grammatical features
/*
 Define grammatical features of a language. Those grammatical features definitions will also be used by morphological
 analyzer's language modules as well.
 */
const importerName = 'csv';
languageModel.features[types.declension].addImporter(importerName)
    .map('1st 2nd',
  [ languageModel.features[types.declension][Constants.ORD_1ST],
    languageModel.features[types.declension][Constants.ORD_2ND]
  ]);
languageModel.features[types.gender].addImporter(importerName)
    .map('masculine feminine',
  [ languageModel.features[types.gender][Constants.GEND_MASCULINE],
    languageModel.features[types.gender][Constants.GEND_FEMININE]
  ]);
languageModel.features[types.tense].addImporter(importerName)
    .map('future_perfect', languageModel.features[types.tense][Constants.TENSE_FUTURE_PERFECT]);
const footnotes = new FeatureType(types.footnote, [], language);

// endregion Definition of grammatical features

// For noun and adjectives
dataSet.addSuffixes = function (partOfSpeech, data) {
    // Some suffix values will mean a lack of suffix, they will be mapped to a null
  let noSuffixValue = '-';

    // First row are headers
  for (let i = 1; i < data.length; i++) {
    let suffix = data[i][0];
        // Handle special suffix values
    if (suffix === noSuffixValue) {
      suffix = null;
    }

    let features = [partOfSpeech,
      languageModel.features[types.number].getFromImporter('csv', data[i][1]),
      languageModel.features[types.grmCase].getFromImporter('csv', data[i][2]),
      languageModel.features[types.declension].getFromImporter('csv', data[i][3]),
      languageModel.features[types.gender].getFromImporter('csv', data[i][4]),
      languageModel.features[types.type].getFromImporter('csv', data[i][5])];
    if (data[i][6]) {
            // There can be multiple footnote indexes separated by spaces
      let indexes = data[i][6].split(' ').map(function (index) {
        return footnotes.get(index)
      });
      features.push(...indexes);
    }
    this.addSuffix(suffix, features);
  }
};

// For verbs
dataSet.addVerbSuffixes = function (partOfSpeech, data) {
    // Some suffix values will mean a lack of suffix, they will be mapped to a null
  let noSuffixValue = '-';

    // First row are headers
  for (let i = 1; i < data.length; i++) {
    let suffix = data[i][0];
        // Handle special suffix values
    if (suffix === noSuffixValue) {
      suffix = null;
    }

    let features = [partOfSpeech,
      languageModel.features[types.conjugation].getFromImporter('csv', data[i][1]),
      languageModel.features[types.voice].getFromImporter('csv', data[i][2]),
      languageModel.features[types.mood].getFromImporter('csv', data[i][3]),
      languageModel.features[types.tense].getFromImporter('csv', data[i][4]),
      languageModel.features[types.number].getFromImporter('csv', data[i][5]),
      languageModel.features[types.person].getFromImporter('csv', data[i][6])];

    let grammartype = data[i][7];
        // Type information can be empty if no ending is provided
    if (grammartype) {
      features.push(languageModel.features[types.type].getFromImporter('csv', grammartype));
    }
        // Footnotes
    if (data[i][8]) {
            // There can be multiple footnote indexes separated by spaces
      let indexes = data[i][8].split(' ').map(function (index) {
        return footnotes.get(index)
      });
      features.push(...indexes);
    }
    this.addSuffix(suffix, features);
  }
};

dataSet.addFootnotes = function (partOfSpeech, data) {
    // First row are headers
  for (let i = 1; i < data.length; i++) {
    this.addFootnote(partOfSpeech, data[i][0], data[i][1]);
  }
};

dataSet.loadData = function () {
    // Nouns
  let partOfSpeech = languageModel.features[types.part][Constants.POFS_NOUN];
  let suffixes = papaparse.parse(nounSuffixesCSV, {});
  this.addSuffixes(partOfSpeech, suffixes.data);
  let footnotes = papaparse.parse(nounFootnotesCSV, {});
  this.addFootnotes(partOfSpeech, footnotes.data);

    // Adjectives
  partOfSpeech = languageModel.features[types.part][Constants.POFS_ADJECTIVE];
  suffixes = papaparse.parse(adjectiveSuffixesCSV, {});
  this.addSuffixes(partOfSpeech, suffixes.data);
  footnotes = papaparse.parse(adjectiveFootnotesCSV, {});
  this.addFootnotes(partOfSpeech, footnotes.data);

    // Verbs
  partOfSpeech = languageModel.features[types.part][Constants.POFS_VERB];
  suffixes = papaparse.parse(verbSuffixesCSV, {});
  this.addVerbSuffixes(partOfSpeech, suffixes.data);
  footnotes = papaparse.parse(verbFootnotesCSV, {});
  this.addFootnotes(partOfSpeech, footnotes.data);
};

/**
 * Decides whether a suffix is a match to any of inflections, and if it is, what type of match it is.
 * @param {Inflection[]} inflections - an array of inflection objects to be matched against a suffix.
 * @param {Suffix} suffix - a suffix to be matched with inflections.
 * @returns {Suffix | null} if a match is found, returns a suffix object modified with some
 * additional information about a match. if no matches found, returns null.
 */
dataSet.matcher = function (inflections, suffix) {
  'use strict';
    // All of those features must match between an inflection and an ending
  let obligatoryMatches = [types.part];

    // Any of those features must match between an inflection and an ending
  let optionalMatches = [types.grmCase, types.declension, types.gender, types.number];
  let bestMatchData = null; // information about the best match we would be able to find

    /*
     There can be only one full match between an inflection and a suffix (except when suffix has multiple values?)
     But there could be multiple partial matches. So we should try to find the best match possible and return it.
     a fullFeature match is when one of inflections has all grammatical features fully matching those of a suffix
     */
  for (let inflection of inflections) {
    let matchData = new MatchData(); // Create a match profile

    if (inflection.suffix === suffix.value) {
      matchData.suffixMatch = true;
    }

        // Check obligatory matches
    for (let feature of obligatoryMatches) {
      let featureMatch = suffix.featureMatch(feature, inflection[feature]);
            // matchFound = matchFound && featureMatch;

      if (!featureMatch) {
                // If an obligatory match is not found, there is no reason to check other items
        break
      }
            // Inflection's value of this feature is matching the one of the suffix
      matchData.matchedFeatures.push(feature);
    }

    if (matchData.matchedFeatures.length < obligatoryMatches.length) {
            // Not all obligatory matches are found, this is not a match
      break
    }

        // Check optional matches now
    for (let feature of optionalMatches) {
      let matchedValue = suffix.featureMatch(feature, inflection[feature]);
      if (matchedValue) {
        matchData.matchedFeatures.push(feature);
      }
    }

    if (matchData.suffixMatch && (matchData.matchedFeatures.length === obligatoryMatches.length + optionalMatches.length)) {
            // This is a full match
      matchData.fullMatch = true;

            // There can be only one full match, no need to search any further
      suffix.match = matchData;
      return suffix
    }
    bestMatchData = this.bestMatch(bestMatchData, matchData);
  }
  if (bestMatchData) {
        // There is some match found
    suffix.match = bestMatchData;
    return suffix
  }
  return null
};

/**
 * Decides whether matchA is 'better' (i.e. has more items matched) than matchB or not
 * @param {MatchData} matchA
 * @param {MatchData} matchB
 * @returns {MatchData} A best of two matches
 */
dataSet.bestMatch = function (matchA, matchB) {
    // If one of the arguments is not set, return the other one
  if (!matchA && matchB) {
    return matchB
  }

  if (!matchB && matchA) {
    return matchA
  }

    // Suffix match has a priority
  if (matchA.suffixMatch !== matchB.suffixMatch) {
    if (matchA.suffixMatch > matchB.suffixMatch) {
      return matchA
    } else {
      return matchB
    }
  }

    // If same on suffix matche, compare by how many features matched
  if (matchA.matchedFeatures.length >= matchB.matchedFeatures.length) {
        // Arbitrarily return matchA if matches are the same
    return matchA
  } else {
    return matchB
  }
};

let classNames = {
  cell: 'infl-cell',
  widthPrefix: 'infl-cell--sp',
  fullWidth: 'infl-cell--fw',
  header: 'infl-cell--hdr',
  highlight: 'infl-cell--hl',
  hidden: 'hidden',
  suffix: 'infl-suff',
  suffixMatch: 'infl-suff--suffix-match',
  suffixFullFeatureMatch: 'infl-suff--full-feature-match',
  inflectionTable: 'infl-table',
  wideView: 'infl-table--wide',
  narrowViewsContainer: 'infl-table-narrow-views-cont',
  narrowView: 'infl-table--narrow',
  footnotesContainer: 'infl-footnotes'
};

let wideView = {
  column: {
    width: 1,
    unit: 'fr'
  }
};

let narrowView = {
  column: {
    width: 100,
    unit: 'px'
  }
};

let footnotes$1 = {
  id: 'inlection-table-footer'
};

let pageHeader = {
  html: `
        <button id="hide-empty-columns" class="switch-btn">Hide empty columns</button><button id="show-empty-columns" class="switch-btn hidden">Show empty columns</button>
        <button id="hide-no-suffix-groups" class="switch-btn">Hide top-level groups with no suffix matches</button><button id="show-no-suffix-groups" class="switch-btn hidden">Show top-level groups with no suffix matches</button><br>
        <p>Hover over the suffix to see its grammar features</p>
        `,
  hideEmptyColumnsBtnSel: '#hide-empty-columns',
  showEmptyColumnsBtnSel: '#show-empty-columns',
  hideNoSuffixGroupsBtnSel: '#hide-no-suffix-groups',
  showNoSuffixGroupsBtnSel: '#show-no-suffix-groups'
};

class Cell {
    /**
     * Creates a cell for an inflection table.
     * @param {Suffix[]} suffixes - A list of suffixes that belongs to this cell.
     * @param {Feature[]} features - A list of features this cell corresponds to.
     */
  constructor (suffixes, features) {
    this.suffixes = suffixes;
    if (!this.suffixes) {
      this.suffixes = [];
    }
    this.features = features;
    this.empty = (this.suffixes.length === 0);
    this.suffixMatches = !!this.suffixes.find(element => {
      if (element.match && element.match.suffixMatch) {
        return element.match.suffixMatch
      }
    });

    this.column = undefined; // A column this cell belongs to
    this.row = undefined; // A row this cell belongs to

    this._index = undefined;

    this.render();
  }

    /**
     * Renders an element's HTML representation.
     */
  render () {
    let element = document.createElement('div');
    element.classList.add(classNames.cell);
    for (let [index, suffix] of this.suffixes.entries()) {
            // Render each suffix
      let suffixElement = document.createElement('a');
      suffixElement.classList.add(classNames.suffix);
      if (suffix.match && suffix.match.suffixMatch) {
        suffixElement.classList.add(classNames.suffixMatch);
      }
      if (suffix.match && suffix.match.fullMatch) {
        suffixElement.classList.add(classNames.suffixFullFeatureMatch);
      }
      let suffixValue = suffix.value ? suffix.value : '-';
      if (suffix.footnote && suffix.footnote.length) {
        suffixValue += '[' + suffix.footnote + ']';
      }
      suffixElement.innerHTML = suffixValue;
      element.appendChild(suffixElement);
      if (index < this.suffixes.length - 1) {
        element.appendChild(document.createTextNode(',\u00A0'));
      }
    }
    this.wNode = element;
    this.nNode = element.cloneNode(true);
  }

    /**
     * Returns an HTML element for a wide view.
     * @returns {HTMLElement}
     */
  get wvNode () {
    return this.wNode
  }

    /**
     * Returns an HTML element for a narrow view.
     * @returns {HTMLElement}
     */
  get nvNode () {
    return this.nNode
  }

    /**
     * Sets a unique index of the cell that can be used for cell identification via 'data-index' attribute.
     * @param {number} index - A unique cell index.
     */
  set index (index) {
    this._index = index;
    this.wNode.dataset.index = this._index;
    this.nNode.dataset.index = this._index;
  }

    /**
     * A proxy for adding an event listener for both wide and narrow view HTML elements.
     * @param {string} type - Listener type.
     * @param {EventListener} listener - Event listener function.
     */
  addEventListener (type, listener) {
    this.wNode.addEventListener(type, listener);
    this.nNode.addEventListener(type, listener);
  }

    /**
     * Hides an element.
     */
  hide () {
    if (!this.wNode.classList.contains(classNames.hidden)) {
      this.wNode.classList.add(classNames.hidden);
      this.nNode.classList.add(classNames.hidden);
    }
  }

    /**
     * Shows a previously hidden element.
     */
  show () {
    if (this.wNode.classList.contains(classNames.hidden)) {
      this.wNode.classList.remove(classNames.hidden);
      this.nNode.classList.remove(classNames.hidden);
    }
  }

    /**
     * Highlights a cell with color.
     */
  highlight () {
    if (!this.wNode.classList.contains(classNames.highlight)) {
      this.wNode.classList.add(classNames.highlight);
      this.nNode.classList.add(classNames.highlight);
    }
  }

    /**
     * Removes highlighting from a previously highlighted cell.
     */
  clearHighlighting () {
    if (this.wNode.classList.contains(classNames.highlight)) {
      this.wNode.classList.remove(classNames.highlight);
      this.nNode.classList.remove(classNames.highlight);
    }
  }

    /**
     * Highlights a row and a column this cell belongs to.
     */
  highlightRowAndColumn () {
    if (!this.column) {
      throw new Error('Column is undefined.')
    }
    if (!this.row) {
      throw new Error('Row is undefined.')
    }
    this.column.highlight();
    this.row.highlight();
  }

    /**
     * Removes highlighting form a previously highlighted row and column.
     */
  clearRowAndColumnHighlighting () {
    if (!this.column) {
      throw new Error('Column is undefined.')
    }
    if (!this.row) {
      throw new Error('Row is undefined.')
    }
    this.column.clearHighlighting();
    this.row.clearHighlighting();
  }
}

/**
 * A cell that specifies a title for a row in an inflection table.
 */
class RowTitleCell {
    /**
     * Initializes a row title cell.
     * @param {string} title - A text that will be shown within the cell.
     * @param {GroupFeatureType} groupingFeature - A grouping feature that specifies a row for which a title cell
     * is created.
     * @param {number} nvGroupQty - A number of narrow view groups. Because each group will be shown separately
     * and will have its own title cells, we need to create a copy of a title cell for each such group.
     */
  constructor (title, groupingFeature, nvGroupQty) {
    this.parent = undefined;
    this.title = title;
    this.feature = groupingFeature;
    this.nvGroupQty = nvGroupQty;

    this.render();
  }

    /**
     * Renders an element's HTML representation.
     */
  render () {
        // Generate HTML representation for a wide view node
    this.wNode = document.createElement('div');
    this.wNode.classList.add(classNames.cell);
    if (this.feature.formsColumn) {
      this.wNode.classList.add(classNames.header);
    }
    if (this.feature.hasFullWidthRowTitle) {
            // This cell is taking an entire row
      this.wNode.classList.add(classNames.fullWidth);
    }
    if (this.feature.formsColumn && this.feature.groupFeatureList.titleColumnsQuantity > 1) {
      this.wNode.classList.add(classNames.widthPrefix + this.feature.groupFeatureList.titleColumnsQuantity);
    }
    this.wNode.innerHTML = this.title;

        // Copy HTML representation to all narrow view nodes (each narrow view group has its own node)
    this.nNodes = []; // Narrow nodes, one for each group
    for (let i = 0; i < this.nvGroupQty; i++) {
      this.nNodes.push(this.wNode.cloneNode(true));
    }
  }

    /**
     * Returns an HTML element for a wide view
     * @returns {HTMLElement} HTML element for a wide view's cell.
     */
  get wvNode () {
    return this.wNode
  }

    /**
     * Returns an array HTML element for narrow view groups
     * @returns {HTMLElement[]} Array of HTML elements for narrow view group's cells.
     */
  getNvNode (index) {
    return this.nNodes[index]
  }

    /**
     * Generates an empty cell placeholder of a certain width. Useful for situation when empty title cells need to be
     * inserted into a table structure (i.e. when title cells occupy multiple columns.
     * @param {number} width - A number of columns placeholder cell will occupy.
     * @returns {HTMLElement} HTML element of a placeholder cell.
     */
  static placeholder (width = 1) {
    let placeholder = document.createElement('div');
    placeholder.classList.add(classNames.cell, classNames.widthPrefix + width);
    return placeholder
  }

    /**
     * Some table layouts require multiple title cells to be shown for a row. These could be, for example, a title
     * cell for a parent category that will follow a title cell for a category that defines a row. In such situation a
     * title cell will have a parent, which will represent a parent cell object.
     * This function returns an array of title cells for a row, starting from the topmost parent and moving down
     * tot the current title cell.
     * @returns {RowTitleCell[]} An array of title row cells representing a title cell hierarchy list.
     */
  get hierarchyList () {
    let parentCells = [];
    if (this.parent) {
      parentCells = this.parent.hierarchyList;
    }
    return parentCells.concat(this)
  }

    /**
     * Highlights this row title cell
     */
  highlight () {
    this.wNode.classList.add(classNames.highlight);
    for (let nNode of this.nNodes) {
      nNode.classList.add(classNames.highlight);
    }
  }

    /**
     * Removes highlighting from this row title cell
     */
  clearHighlighting () {
    this.wNode.classList.remove(classNames.highlight);
    for (let nNode of this.nNodes) {
      nNode.classList.remove(classNames.highlight);
    }
  }
}

/**
 * A cell in a header row, a column title cell.
 */
class HeaderCell {
    /**
     * Initializes a header cell.
     * @param {string} title - A title text that will be shown in the header cell.
     * @param {GroupFeatureType} groupingFeature - A feature that defines one or several columns this header forms.
     * @param {number} [span=1] - How many columns in a table this header cell forms.
     */
  constructor (title, groupingFeature, span = 1) {
    this.feature = groupingFeature;
    this.title = title;
    this.span = span;

    this.parent = undefined;
    this.children = [];
    this.columns = [];

    this.render();
  }

    /**
     * Renders an element's HTML representation.
     */
  render () {
    let element = document.createElement('div');
    element.classList.add(classNames.cell, classNames.header, classNames.widthPrefix + this.span);
    element.innerHTML = this.title;
    this.wNode = element;
    this.nNode = element.cloneNode(true);
  }

    /**
     * Returns an HTML element for a wide view
     * @returns {HTMLElement} HTML element for a wide view's cell.
     */
  get wvNode () {
    return this.wNode
  }

    /**
     * Returns an HTML element for a narrow view
     * @returns {HTMLElement} HTML element for a narrow view's cell.
     */
  get nvNode () {
    return this.nNode
  }

    /**
     * Registers a column that's being formed by this header cell. Adds column to itself and to its parent(s).
     * @param {Column} column - A column that is formed by this header cell.
     */
  addColumn (column) {
    this.columns = this.columns.concat([column]);

    if (this.parent) {
      this.parent.addColumn(column);
    }
  }

    /**
     * Temporary changes a width of a header cell. This happens when one or several columns
     * that this header forms are hidden or shown.
     * @param value
     */
  changeSpan (value) {
    let currentWidthClass = classNames.widthPrefix + this.span;
    this.span += value;
    let newWidthClass = classNames.widthPrefix + this.span;
    this.wNode.classList.replace(currentWidthClass, newWidthClass);
    this.nNode.classList.replace(currentWidthClass, newWidthClass);
  }

    /**
     * This function will notify all parents and children of a title column that some columns under this headers cell
     * changed their state (i.e. were hidden or shown). This way parents and children will be able to update their
     * states accordingly.
     */
  columnStateChange () {
    let visibleColumns = 0;
    for (let column of this.columns) {
      if (!column.hidden) {
        visibleColumns++;
      }
    }
    if (this.span !== visibleColumns) {
            // Number of visible columns has been changed
      let change = visibleColumns - this.span;
      this.changeSpan(change);

            // Notify parents and children
      if (this.children.length) {
        for (let child of this.children) {
          child.columnStateChange();
        }
      }
      if (this.parent) {
        this.parent.columnStateChange();
      }
    }
  }

    /**
     * Highlights a header cell, its parent and children
     */
  highlight () {
    if (!this.wNode.classList.contains(classNames.highlight)) {
      this.wNode.classList.add(classNames.highlight);
      this.nNode.classList.add(classNames.highlight);

      if (this.parent) {
        this.parent.highlight();
      }
    }
  }

    /**
     * Removes highlighting from a header cell, its parent and children
     */
  clearHighlighting () {
    if (this.wNode.classList.contains(classNames.highlight)) {
      this.wNode.classList.remove(classNames.highlight);
      this.nNode.classList.remove(classNames.highlight);

      if (this.parent) {
        this.parent.clearHighlighting();
      }
    }
  }
}

/**
 * Represent a column of cells in an inflection table.
 */
class Column {
    /**
     * Initializes column with a provided set of cells.
     * @param {Cell} cells - Cells that are within this column.
     */
  constructor (cells) {
    this.cells = cells;
    if (!cells) {
      this.cells = [];
    }
    this._headerCell = undefined;
    this.hidden = false;
    this.empty = this.cells.every(cell => cell.empty);
    this.suffixMatches = !!this.cells.find(cell => cell.suffixMatches);

    for (let cell of this.cells) {
      cell.column = this;
    }
  }

    /**
     * Assigns a header cell to the column.
     * @param {HeaderCell} headerCell - A header cell of this column.
     */
  set headerCell (headerCell) {
    this._headerCell = headerCell;
    headerCell.addColumn(this);
  }

    /**
     * Returns a number of cells within this column.
     * @returns {Number} A number of cells this column contains.
     */
  get length () {
    return this.cells.length
  }

    /**
     * Hides the column. Notifies a header about a state change.
     */
  hide () {
    if (!this.hidden) {
      this.hidden = true;

      for (let cell of this.cells) {
        cell.hide();
      }
      if (this._headerCell) {
        this._headerCell.columnStateChange();
      }
    }
  }

    /**
     * Shows the column. Notifies a header about a state change.
     */
  show () {
    if (this.hidden) {
      this.hidden = false;

      for (let cell of this.cells) {
        cell.show();
      }
      if (this._headerCell) {
        this._headerCell.columnStateChange();
      }
    }
  }

    /**
     * Highlights a column and its header.
     */
  highlight () {
    for (let cell of this.cells) {
      cell.highlight();
    }
    if (this._headerCell) {
      this._headerCell.highlight();
    }
  }

    /**
     * Removes highlighting from a column and its header.
     */
  clearHighlighting () {
    for (let cell of this.cells) {
      cell.clearHighlighting();
    }
    if (this._headerCell) {
      this._headerCell.clearHighlighting();
    }
  }
}

/**
 * Represents a row of cells
 */
class Row {
    /**
     * Populates row with cells
     * @param {Cell[]} cells - Cells that belong to this row
     */
  constructor (cells) {
    this.cells = cells;
    if (!cells) {
      this.cells = [];
    }
    this.titleCell = undefined;

    for (let cell of this.cells) {
      cell.row = this;
    }
  }

    /**
     * Adds a cell to the row.
     * This is a chainable function.
     * @param {Cell} cell - A cell to be added to the row
     */
  add (cell) {
    cell.row = this;
    this.cells.push(cell);
    return this
  }

    /**
     * Returns a number of cells in a row
     * @returns {Number} A number of cells in a row
     */
  get length () {
    return this.cells.length
  }

    /**
     * Returns a portion of a cells array starting from `from` item and up to, but not including, `upto` element.
     * It does not create new copies of cells to populate a newly created array; this array contains references to
     * the same cells that original Row refers to. It also does not update row reference within Cell objects.
     *
     * This function presents a way to create another structure of existing table's cells.
     * It can be useful for views that have a different structure (i.e. narrow view).
     * @param {number} from
     * @param {number} upto
     */
  slice (from, upto) {
    let slice = new Row();
    if (from < 0 && from > this.cells.length) {
      throw new Error('"from" parameter is out of range.')
    }
    if (upto < 0 && upto > this.cells.length) {
      throw new Error('"upto" parameter is out of range.')
    }
    for (let index = from; index < upto; index++) {
      slice.cells.push(this.cells[index]);
    }
    slice.titleCell = this.titleCell;
    return slice
  }

    /**
     * Highlights all cells in a row, and a title cells
     */
  highlight () {
    for (let cell of this.cells) {
      cell.highlight();
    }
    if (this.titleCell) {
      this.titleCell.highlight();
    }
  }

    /**
     * Removes highlighting from all cells in a row, and from a title cell
     */
  clearHighlighting () {
    for (let cell of this.cells) {
      cell.clearHighlighting();
    }
    if (this.titleCell) {
      this.titleCell.clearHighlighting();
    }
  }
}

/**
 * This is a wrapper around a FeatureType object. When a Table object creates a
 * hierarchical tree of suffixes, it uses grammatical features as tree nodes.
 * GroupFeatureType extends a Feature object so that it'll be able to store additional information
 * that is required for that.
 */
class GroupFeatureType extends FeatureType {
    /**
     * GroupFeatureType extends FeatureType to serve as a grouping feature (i.e. a feature that forms
     * either a column or a row in an inflection table). For that, it adds some additional functionality,
     * such as custom feature orders that will allow to combine suffixes from several grammatical features
     * (i.e. masculine and feminine) into a one column of a table.
     * @param {FeatureType} featureType - A feature that defines a type of this item.
     * @param {string} titleMessageID - A message ID of a title, used to get a formatted title from a
     * language-specific message bundle.
     * @param {Feature[]} order - A custom sort order for this feature that redefines
     * a default one stored in FeatureType object (optional).
     * Use this parameter to redefine a deafult sort order for a type.
     */
  constructor (featureType, titleMessageID, order = featureType.orderedFeatures) {
    super(featureType.type, GroupFeatureType.featuresToValues(order), featureType.language);

    this.groupTitle = titleMessageID;
    this._groupType = undefined;

    this.groupFeatureList = undefined;

        // Properties below are required to store information during tree creation
    this.subgroups = []; // Each value of the feature
    this.cells = []; // All cells within this group and below
    this.parent = undefined;
    this.header = undefined;

    this._formsColumn = false;
    this._formsRow = false;
    this.hasColumnRowTitle = false; // Whether this feature has a title of a suffix row in the left-side column.
    this.hasFullWidthRowTitle = false; // Whether this feature has a title of suffix rows that spans the whole table width.
  }

    /**
     * Converts a list of Feature objects into a list of strings that represent their values. Keeps tha original
     * array structure intact (work with up two two array levels).
     * @param {Feature[] | Feature[][]} features - An array of feature objects.
     * @return {string[] | strings[][]} A matching array of strings with feature values.
     */
  static featuresToValues (features) {
    return features.map((feature) => {
      if (Array.isArray(feature)) {
        return feature.map((feature) => feature.value)
      } else {
        return feature.value
      }
    })
  }

    /**
     * This is a wrapper around orderedFeatures() that allows to set a custom feature order for particular columns.
     * @returns {Feature[] | Feature[][]} A sorted array of feature values.
     */
  getOrderedFeatures (ancestorFeatures) {
    return this.getOrderedValues(ancestorFeatures).map((value) => new Feature(value, this.type, this.language))
  }

    /**
     * This is a wrapper around orderedValues() that allows to set a custom feature order for particular columns.
     * By default it returns features in the same order that is defined in a base FeatureType class.
     * Redefine it to provide a custom grouping and sort order.
     * @returns {string[] | string[][]} A sorted array of feature values.
     */
  getOrderedValues (ancestorFeatures) {
    return this._orderIndex
  }

    /**
     * Whether this feature forms a columns group.
     * @returns {boolean} True if this feature forms a column.
     */
  get formsColumn () {
    return this._formsColumn
  }

    /**
     * Sets that this feature would form a column.
     * @param {boolean} value
     */
  set formsColumn (value) {
    this._formsColumn = value;
    this._formsRow = !value; // Can't do both
  }

    /**
     * Whether this feature forms a row group.
     * @returns {boolean} True if this feature forms a row.
     */
  get formsRow () {
    return this._formsRow
  }

    /**
     * Sets that this feature would form a row.
     * @param {boolean} value
     */
  set formsRow (value) {
    this._formsRow = value;
    this._formsColumn = !value; // Can't do both
  }

    /**
     * How many groups this feature would form.
     * @returns {Number} A number of groupes formed by this feature.
     */
  get size () {
    return this.orderedValues.length
  }

    /**
     * Checks if two grouping features are of the same type.
     * @param {GroupFeatureType} groupingFeature - A grouping feature to compare with the current one.
     * @returns {boolean} True if grouping features are of the same type.
     */
  isSameType (groupingFeature) {
    return this.type === groupingFeature.type
  }

    /**
     * Creates a title cell for a feature from the current group.
     * @param {string} title - A text that will be shown within a cell.
     * @param {number} nvGroupQty - A number of narrow view groups.
     * @returns {RowTitleCell} A created RowTitleCell object.
     */
  createTitleCell (title, nvGroupQty) {
    return new RowTitleCell(title, this, nvGroupQty)
  }
}

/**
 * Holds a list of all grouping features of a table.
 */
class GroupFeatureList extends FeatureList {
    /**
     * Initializes object with an array of grouping feature objects.
     * @param {GroupFeatureType[]} features - An array of features that form a table.
     * An order of features defines in what order a table tree would be built.
     */
  constructor (features) {
    super(features);
    this._columnFeatures = []; // Features that group cells into columns
    this._rowFeatures = []; // Features that group cells into rows

    this.forEach((feature) => { feature.groupFeatureList = this; });
  }

    /**
     * Return a list of all grouping features that form columns.
     * @returns {GroupFeatureType[]} - An array of grouping features.
     */
  get columnFeatures () {
    return this._columnFeatures
  }

    /**
     * Defines what features form columns. An order of items specifies an order in which columns be shown.
     * @param {Feature[] | GroupingFeature[]} features - What features form columns and what order
     * these columns would follow.
     */
  set columns (features) {
    for (let feature of features) {
      let matchingFeature = this.ofType(feature.type);
      if (!matchingFeature) {
        throw new Error(`Feature of ${feature.type} is not found.`)
      }
      matchingFeature.formsColumn = true;
      this._columnFeatures.push(matchingFeature);
    }
  }

    /**
     * Returns a first column feature item.
     * @returns {GroupFeatureType} A fist column feature.
     */
  get firstColumnFeature () {
    if (this._columnFeatures && this._columnFeatures.length) {
      return this._columnFeatures[0]
    }
  }

    /**
     * Returns a last column feature item.
     * @returns {GroupFeatureType} A last column feature.
     */
  get lastColumnFeature () {
    if (this._columnFeatures && this._columnFeatures.length) {
      return this._columnFeatures[this._columnFeatures.length - 1]
    }
  }

    /**
     * Return a list of all grouping features that form rows.
     * @returns {GroupFeatureType[]} - An array of grouping rows.
     */
  get rowFeatures () {
    return this._rowFeatures
  }

    /**
     * Defines what features form rows. An order of items specifies an order in which columns be shown.
     * @param {Feature[] | GroupingFeature[]} features - What features form rows and what order
     * these rows would follow.
     */
  set rows (features) {
    for (let feature of features) {
      let matchingFeature = this.ofType(feature.type);
      if (!matchingFeature) {
        throw new Error(`Feature of ${feature.type} is not found.`)
      }
      matchingFeature.formsRow = true;
      this._rowFeatures.push(matchingFeature);
    }
    return this
  }

    /**
     * Returns a first row feature item.
     * @returns {GroupFeatureType} A fist row feature.
     */
  get firstRowFeature () {
    if (this._rowFeatures && this._rowFeatures.length) {
      return this._rowFeatures[0]
    }
  }

    /**
     * Returns a last row feature item.
     * @returns {GroupFeatureType} A last row feature.
     */
  get lastRowFeature () {
    if (this._rowFeatures && this._rowFeatures.length) {
      return this._rowFeatures[this._rowFeatures.length - 1]
    }
  }

    /**
     * Defines what are the titles of suffix cell rows within a table body.
     * The number of such items defines how many left-side title columns this table would have (default is one).
     * Full width titles (see below) does not need to be specified here.
     * @param {Feature | GroupingFeature} features - What suffix row titles this table would have.
     */
  set columnRowTitles (features) {
    for (let feature of features) {
      let matchingFeature = this.ofType(feature.type);
      if (!matchingFeature) {
        throw new Error(`Feature of ${feature.type} is not found.`)
      }
      matchingFeature.hasColumnRowTitle = true;
    }
  }

    /**
     * In inflection tables, titles of features are usually located in left-side columns. However, some titles that
     * group several rows together may span the whole table width. This setters defines
     * what those features are.
     * @param {Feature | GroupingFeature} features - What feature titles would take a whole row
     */
  set fullWidthRowTitles (features) {
    for (let feature of features) {
      let matchingFeature = this.ofType(feature.type);
      if (!matchingFeature) {
        throw new Error(`Feature of ${feature.type} is not found.`)
      }
      matchingFeature.hasFullWidthRowTitle = true;
    }
  }

    /**
     * Returns a quantity of grouping features.
     * @returns {number} - A number of grouping features.
     */
  get length () {
    return this._features.length
  }

    /**
     * Calculate a number of title columns.
     * @returns {number} A number of title columns.
     */
  get titleColumnsQuantity () {
    let quantity = 0;
    for (let feature of this._features) {
      if (feature.hasColumnRowTitle) {
        quantity++;
      }
    }
    return quantity
  }
}

/**
 * Stores group data during feature tree construction.
 */
class NodeGroup {
    /**
     * Creates feature group data structures.
     */
  constructor () {
    this.subgroups = []; // Each value of the feature
    this.cells = []; // All cells within this group and below
    this.parent = undefined;
    this.header = undefined;

    this.groupFeatureType = undefined; // Defines a feature type that forms a tree level this node is in.
    this.ancestorFeatures = undefined; // Defines feature values of this node's parents.
  }
}

/**
 * A representation of a table that is shown on wide screens (desktops).
 */
class WideView {
    /**
     * Initializes a wide view.
     * @param {Column[]} columns - Table columns.
     * @param {Row[]} rows - Table rows.
     * @param {Row[]} headers - Table headers.
     * @param {number} titleColumnQty - Number of title columns in a table.
     */
  constructor (columns, rows, headers, titleColumnQty) {
    this.columns = columns;
    this.rows = rows;
    this.headers = headers;
    this.titleColumnQty = titleColumnQty;
    this.nodes = document.createElement('div');
    this.nodes.classList.add(classNames.inflectionTable, classNames.wideView);
  }

    /**
     * Calculates a number of visible columns in this view.
     * @returns {number} A number of visible columns.
     */
  get visibleColumnQty () {
    let qty = 0;
    for (let column of this.columns) {
      if (!column.hidden) {
        qty++;
      }
    }
    return qty
  }

    /**
     * Renders an HTML representation of a wide table view.
     * @returns {HTMLElement} A rendered HTML Element.
     */
  render () {
        // Remove any previously inserted nodes
    this.nodes.innerHTML = '';

    for (let row of this.headers) {
      this.nodes.appendChild(row.titleCell.wvNode);
      for (let cell of row.cells) {
        this.nodes.appendChild(cell.wvNode);
      }
    }

    for (let row of this.rows) {
      let titleCells = row.titleCell.hierarchyList;
      if (titleCells.length < this.titleColumnQty) {
        this.nodes.appendChild(RowTitleCell.placeholder(this.titleColumnQty - titleCells.length));
      }
      for (let titleCell of titleCells) {
        this.nodes.appendChild(titleCell.wvNode);
      }

      for (let cell of row.cells) {
        this.nodes.appendChild(cell.wvNode);
      }
    }
    this.nodes.style.gridTemplateColumns = 'repeat(' + (this.visibleColumnQty + this.titleColumnQty) + ', ' +
            wideView.column.width + wideView.column.unit + ')';

    return this.nodes
  }
}

/**
 * A representation of a table that is shown on narrow screens (mobile devices).
 */
class NarrowView {
    /**
     * Initializes a narrow view.
     * @param {number} groupQty - A number of visible groups (sub tables) within a narrow view.
     * @param {Column[]} columns - Table columns.
     * @param {Row[]} rows - Table rows.
     * @param {Row[]} headers - Table headers.
     * @param {number} titleColumnQty - Number of title columns in a table.
     */
  constructor (groupQty, columns, rows, headers, titleColumnQty) {
    this.columns = columns;
    this.rows = rows;
    this.headers = headers;
    this.titleColumnQty = titleColumnQty;
    this.groups = [];
    this.groupQty = groupQty;
    this.groupSize = 0;
    if (groupQty) {
      this.groupSize = this.columns.length / groupQty;
    }

    this.nodes = document.createElement('div');
    this.nodes.classList.add(classNames.narrowViewsContainer);

    for (let [index, headerCell] of this.headers[0].cells.entries()) {
      this.createGroup(index, headerCell);
    }
  }

    /**
     * Creates a group within a table.
     * @returns {NarrowViewGroup} A newly created group.
     */
  createGroup (index, headerCell) {
    let group = new NarrowViewGroup(index, this.headers, this.rows, this.titleColumnQty);
    this.nodes.appendChild(group.nodes);
    this.groups.push(group);
  }

    /**
     * Generates an HTML representation of a view.
     * @returns {HTMLElement} - HTML representation of a view.
     */
  render () {
    for (let group of this.groups) {
      group.render();
    }
    return this.nodes
  }
}

/**
 * Represents a group within a narrow view. A narrow view is split into separate sub tables
 * by values of a first grammatical feature that forms columns. Then each sub table would contain
 * a suffixes that belong to that grammatical feature value only. Each sub table becomes a
 * separated object and can be reflown on devices with narrow screens.
 */
class NarrowViewGroup {
    // TODO: Review constructor parameters

    /**
     * Initializes a narrow view group. Please note that column, rows, and headers are those of a whole table,
     * not of this particular group. NarrowViewGroup constructor will use this data to build
     * the corresponding objects of the group itself.
     * @param {number} index - An index of this group within a groups array, starting from zero.
     * @param {Row[]} headers - Table headers.
     * @param {Row[]} rows - Table rows.
     * @param {number} titleColumnQty - Number of title columns in a table.
     */
  constructor (index, headers, rows, titleColumnQty) {
    this.index = index;
    this.columns = headers[0].cells[index].columns;
    this.groupSize = this.columns.length;
    let columnsStartIndex = this.columns[0].index;
    let columnsEndIndex = this.columns[this.columns.length - 1].index;

    this.rows = [];
    for (let row of rows) {
      this.rows.push(row.slice(columnsStartIndex, columnsEndIndex + 1));
    }
    this.headers = [];
        /**
         * Since we group by the first column feature, there will be a single feature in a first header row,
         * its children in the second row, children of its children in a third row and so on.
         */
    for (let [headerIndex, headerRow] of headers.entries()) {
      let row = new Row();
      row.titleCell = headerRow.titleCell;
      if (headerIndex === 0) {
        row.cells.push(headerRow.cells[index]);
      } else {
        for (let headerCell of this.headers[headerIndex - 1].cells) {
          row.cells = row.cells.concat(headerCell.children);
        }
      }
      this.headers.push(row);
    }
    this.titleColumnQty = titleColumnQty;

    this.nodes = document.createElement('div');
    this.nodes.classList.add(classNames.inflectionTable, classNames.narrowView);
  }

    /**
     * Calculates a number of visible columns in this view.
     * @returns {number} A number of visible columns.
     */
  get visibleColumnQty () {
    let qty = 0;
    for (let column of this.columns) {
      if (!column.hidden) {
        qty++;
      }
    }
    return qty
  }

    /**
     * Renders an HTML representation of a narrow view group.
     */
  render () {
    this.nodes.innerHTML = '';

    if (this.visibleColumnQty) {
            // This group is visible
      for (let headerRow of this.headers) {
        this.nodes.appendChild(headerRow.titleCell.getNvNode(this.index));
        for (let headerCell of headerRow.cells) {
          this.nodes.appendChild(headerCell.nvNode);
        }
      }

      for (let row of this.rows) {
        let titleCells = row.titleCell.hierarchyList;
        if (titleCells.length < this.titleColumnQty) {
          this.nodes.appendChild(RowTitleCell.placeholder(this.titleColumnQty - titleCells.length));
        }
        for (let titleCell of titleCells) {
          this.nodes.appendChild(titleCell.getNvNode(this.index));
        }

        for (let cell of row.cells) {
          this.nodes.appendChild(cell.nvNode);
        }
      }
      this.nodes.classList.remove(classNames.hidden);
      this.nodes.style.gridTemplateColumns = 'repeat(' + (this.visibleColumnQty + this.titleColumnQty) + ', ' +
                narrowView.column.width + narrowView.column.unit + ')';
      this.nodes.style.width = (this.visibleColumnQty + this.titleColumnQty) * narrowView.column.width +
                narrowView.column.unit;
    } else {
            // This group is hidden
      this.nodes.classList.add(classNames.hidden);
    }
  }
}

/**
 * Represents an inflection table.
 */
class Table {
    /**
     * Initializes an inflection table.
     * @param {GroupFeatureType[]} features - An array of grouping features. An order of elements in this array
     */
  constructor (features) {
    this.features = new GroupFeatureList(features);
    this.emptyColumnsHidden = false;
    this.cells = []; // Will be populated by groupByFeature()

        /*
        This is a special filter function that, if defined will do additional filtering of suffixes within a cell.
         */
    this.suffixCellFilter = undefined;
  }

    /**
     * Creates a table tree and other data structures (columns, rows, headers).
     * This function is chainabe.
     * @param {Suffix[]} suffixes - An array of suffixes to build table from.
     * @returns {Table} Reference to self for chaining.
     */
  construct (suffixes) {
    this.suffixes = suffixes;
    this.tree = this.groupByFeature(suffixes);
    this.headers = this.constructHeaders();
    this.columns = this.constructColumns();
    this.rows = this.constructRows();
    this.emptyColumnsHidden = false;
    return this
  }

    /**
     * Builds wide and narrow views of the table.
     * This function is chainabe.
     * @returns {Table} Reference to self for chaining.
     */
  constructViews () {
    this.wideView = new WideView(this.columns, this.rows, this.headers, this.titleColumnQty);
    this.narrowView = new NarrowView(
            this.features.firstColumnFeature.size, this.columns, this.rows, this.headers, this.titleColumnQty);
    return this
  }

    /**
     * Returns a number of columns with suffix cells in a table.
     * @returns {number} A number of columns with suffix cells in a table.
     */
  get suffixColumnQty () {
    if (!this.columns) {
      throw new Error('Columns are not populated yet.')
    }
    return this.columns.length
  }

    /**
     * Returns a number of columns with row titles in a table.
     * @returns {number} A number of columns with row titles.
     */
  get titleColumnQty () {
    if (!this.features) {
      throw new Error('Features are not defined.')
    }
    return this.features.titleColumnsQuantity
  }

    /**
     * Returns a number of rows with suffix cells in a table.
     * @returns {number} A number of rows with suffix cells.
     */
  get suffixRowQty () {
    if (!this.columns) {
      throw new Error('Columns are not populated yet.')
    }
    return this.columns[0].length
  }

    /**
     * Returns true if an ending grammatical feature defined by featureType has a value that is listed in a featureValues array.
     * This function is for use with Array.prototype.filter().
     * @param {string} featureType - a grammatical feature type we need to filter on.
     * @param {string | string[]} featureValues - a list of possible values of a type specified by featureType that
     * this ending should have.
     * @param {Suffix} suffix - an ending we need to filter out.
     * @returns {boolean} True if suffix has a value of a grammatical feature specified.
     */
  static filter (featureType, featureValues, suffix) {
    'use strict';

        // If not an array, convert it to array for uniformity
    if (!Array.isArray(featureValues)) {
      featureValues = [featureValues];
    }
    for (const value of featureValues) {
      if (suffix.features[featureType] === value) {
        return true
      }
    }

    return false
  };

    /**
     * Groups all suffixes into a tree according to their grammatical features. There are several levels in this tree.
     * Each level corresponds to a one grouping feature. The order of items in GroupingFeatures List object
     * defines an order of those levels.
     * Nodes on each level are values of a grammatical feature that forms this level. An order of those values
     * is determined by the order of values within a GroupFeatureType object of each feature.
     * This is a recursive function.
     * @param {Suffix[]} suffixes - Suffixes to be grouped.
     * @param {Feature[]} ancestorFeatures - A list of feature values on levels above the current.
     * @param {number} currentLevel - At what level in a tree we are now. Used to stop recursion.
     * @returns {NodeGroup} A top level group of suffixes that contain subgroups all way down to the last group.
     */
  groupByFeature (suffixes, ancestorFeatures = [], currentLevel = 0) {
    let group = new NodeGroup();
    group.groupFeatureType = this.features.items[currentLevel];
    group.ancestorFeatures = ancestorFeatures.slice();

        // Iterate over each value of the feature
    for (const featureValue of group.groupFeatureType.getOrderedFeatures(ancestorFeatures)) {
      if (ancestorFeatures.length > 0 && ancestorFeatures[ancestorFeatures.length - 1].type === group.groupFeatureType.type) {
                // Remove previously inserted feature of the same type
        ancestorFeatures.pop();
      }
      ancestorFeatures.push(featureValue);

            // Suffixes that are selected for current combination of feature values
      let selectedSuffixes = suffixes.filter(Table.filter.bind(this, group.groupFeatureType.type, featureValue.value));

      if (currentLevel < this.features.length - 1) {
                // Divide to further groups
        let subGroup = this.groupByFeature(selectedSuffixes, ancestorFeatures, currentLevel + 1);
        group.subgroups.push(subGroup);
        group.cells = group.cells.concat(subGroup.cells);
      } else {
                // This is the last level. This represent a cell with suffixes
                // Split result has a list of suffixes in a table cell. We need to combine items with same endings.
        if (selectedSuffixes.length > 0) {
          if (this.suffixCellFilter) {
            selectedSuffixes = selectedSuffixes.filter(this.suffixCellFilter);
          }

          selectedSuffixes = Suffix.combine(selectedSuffixes);
        }

        let cell = new Cell(selectedSuffixes, ancestorFeatures.slice());
        group.subgroups.push(cell);
        group.cells.push(cell);
        this.cells.push(cell);
        cell.index = this.cells.length - 1;
      }
    }
    ancestorFeatures.pop();
    return group
  }

    /**
     * Create columns out of a suffixes organized into a tree.
     * This is a recursive function.
     * @param {NodeGroup} tree - A tree of suffixes.
     * @param {Column[]} columns - An array of columns to be constructed.
     * @param {number} currentLevel - Current recursion level.
     * @returns {Array} An array of columns of suffix cells.
     */
  constructColumns (tree = this.tree, columns = [], currentLevel = 0) {
    let currentFeature = this.features.items[currentLevel];

    let groups = [];
    for (let [index, featureValue] of currentFeature.getOrderedValues(tree.ancestorFeatures).entries()) {
      let cellGroup = tree.subgroups[index];

            // Iterate until it is the last row feature
      if (!currentFeature.isSameType(this.features.lastRowFeature)) {
        let currentResult = this.constructColumns(cellGroup, columns, currentLevel + 1);
        if (currentFeature.formsRow) {
                    // TODO: Avoid creating extra cells

          let group = {
            titleText: featureValue,
            groups: currentResult,
            titleCell: currentFeature.createTitleCell(featureValue, this.features.firstColumnFeature.size)
          };
          group.groups[0].titleCell.parent = group.titleCell;
          groups.push(group);
        } else if (currentFeature.isSameType(this.features.lastColumnFeature)) {
          let column = new Column(cellGroup.cells);
          column.groups = currentResult;
          column.header = featureValue;
          column.index = columns.length;
          columns.push(column);
          column.headerCell = this.headers[this.headers.length - 1].cells[columns.length - 1];
        }
      } else {
                // Last level
        cellGroup.titleCell = currentFeature.createTitleCell(featureValue, this.features.firstColumnFeature.size);
        let group = {
          titleText: featureValue,
          cell: cellGroup,
          titleCell: cellGroup.titleCell
        };
        groups.push(group);
      }
    }
    if (currentFeature.formsRow) {
      return groups
    }
    return columns
  }

    /**
     * Creates an array of header cell rows.
     * This is a recursive function.
     * @param {NodeGroup} tree - A tree of suffixes.
     * @param {Row[]} headers - An array of rows with header cells.
     * @param {number} currentLevel - Current recursion level.
     * @returns {Array} A two-dimensional array of header cell rows.
     */
  constructHeaders (tree = this.tree, headers = [], currentLevel = 0) {
    let currentFeature = this.features.columnFeatures[currentLevel];

    let cells = [];
    for (let [index, featureValue] of currentFeature.getOrderedValues(tree.ancestorFeatures).entries()) {
      let cellGroup = tree.subgroups[index];

            // Iterate over all column features (features that form columns)
      if (currentLevel < this.features.columnFeatures.length - 1) {
        let subCells = this.constructHeaders(cellGroup, headers, currentLevel + 1);

        let columnSpan = 0;
        for (let cell of subCells) {
          columnSpan += cell.span;
        }

        let headerCell = new HeaderCell(featureValue, currentFeature, columnSpan);
        headerCell.children = subCells;
        for (let cell of subCells) {
          cell.parent = headerCell;
        }

        if (!headers[currentLevel]) {
          headers[currentLevel] = new Row();
        }
        headers[currentLevel].titleCell = currentFeature.createTitleCell(
                    this.messages.get(currentFeature.groupTitle), this.features.firstColumnFeature.size);

        headers[currentLevel].add(headerCell);
        cells.push(headerCell);
      } else {
                // Last level
        let headerCell = new HeaderCell(featureValue, currentFeature);

        if (!headers[currentLevel]) {
          headers[currentLevel] = new Row();
        }

        headers[currentLevel].add(headerCell);
        headers[currentLevel].titleCell = currentFeature.createTitleCell(
                    this.messages.get(currentFeature.groupTitle), this.features.firstColumnFeature.size);
        cells.push(headerCell);
      }
    }
    if (currentLevel === 0) {
      return headers
    } else {
      return cells
    }
  }

    /**
     * Creates an array of rows by parsing an array of columns.
     * @returns {Row[]} An array of rows.
     */
  constructRows () {
    let rows = [];
    for (let rowIndex = 0; rowIndex < this.suffixRowQty; rowIndex++) {
      rows[rowIndex] = new Row();
      rows[rowIndex].titleCell = this.columns[0].cells[rowIndex].titleCell;
      for (let columnIndex = 0; columnIndex < this.suffixColumnQty; columnIndex++) {
        rows[rowIndex].add(this.columns[columnIndex].cells[rowIndex]);
      }
    }
    return rows
  }

    /**
     * Adds event listeners to each cell object.
     */
  addEventListeners () {
    for (let cell of this.cells) {
      cell.addEventListener('mouseenter', this.highlightRowAndColumn.bind(this));
      cell.addEventListener('mouseleave', this.clearRowAndColumnHighlighting.bind(this));
    }
  }

    /**
     * Highlights a row and a column this cell is in.
     * @param {Event} event - An event that triggers this function.
     */
  highlightRowAndColumn (event) {
    let index = event.currentTarget.dataset.index;
    this.cells[index].highlightRowAndColumn();
  }

    /**
     * Removes highlighting from row and a column this cell is in.
     * @param {Event} event - An event that triggers this function.
     */
  clearRowAndColumnHighlighting (event) {
    let index = event.currentTarget.dataset.index;
    this.cells[index].clearRowAndColumnHighlighting();
  }

    /**
     * Hides empty columns in a table.
     */
  hideEmptyColumns () {
    for (let column of this.columns) {
      if (column.empty) {
        column.hide();
      }
    }
    this.emptyColumnsHidden = true;
  }

    /**
     * Show all empty columns that were previously hidden.
     */
  showEmptyColumns () {
    for (let column of this.columns) {
      if (column.hidden) {
        column.show();
      }
    }
    this.emptyColumnsHidden = false;
  }

    /**
     * Hide groups that have no suffix matches.
     */
  hideNoSuffixGroups () {
    for (let headerCell of this.headers[0].cells) {
      let matches = !!headerCell.columns.find(column => column.suffixMatches);
      if (!matches) {
        for (let column of headerCell.columns) {
          column.hide();
        }
      }
    }
    this.suffixMatchesHidden = true;
  }

    /**
     * Show groups that have no suffix matches.
     */
  showNoSuffixGroups () {
    for (let column of this.columns) {
      column.show();
    }
    if (this.emptyColumnsHidden) {
      this.hideEmptyColumns();
    }
    this.suffixMatchesHidden = false;
  }
}

/**
 * Represents a list of footnotes.
 */
class Footnotes {
    /**
     * Initialises a Footnotes object.
     * @param {Footnote[]} footnotes - An array of footnote objects.
     */
  constructor (footnotes) {
    this.footnotes = footnotes;

    this.nodes = document.createElement('dl');
    this.nodes.id = footnotes$1.id;
    this.nodes.classList.add(classNames.footnotesContainer);
    for (let footnote of footnotes) {
      let index = document.createElement('dt');
      index.innerHTML = footnote.index;
      this.nodes.appendChild(index);
      let text = document.createElement('dd');
      text.innerHTML = footnote.text;
      this.nodes.appendChild(text);
    }
  }

    /**
     * Returns an HTML representation of a Footnotes object.
     * @returns {HTMLElement} An HTML representation of a Footnotes object.
     */
  get html () {
    return this.nodes
  }
}

/**
 * Represents a single view.
 */
class View {
    /**
     * Initializes a View object with options. There is at least one view per part of speech,
     * but there could be several views for the same part of speech that show different table representation of a view.
     * @param {Object} viewOptions
     */
  constructor () {
        // this.options = viewOptions;
    this.pageHeader = {};

        // An HTML element where this view is rendered
    this.container = undefined;

        // Must be implemented in a descendant
    this.id = 'baseView';
    this.name = 'base view';
    this.title = 'Base View';
    this.language = undefined;
    this.partOfSpeech = undefined;
  }

    /**
     * Converts a WordData, returned from inflection tables library, into an HTML representation of an inflection table
     * and inserts that HTML into a `container` HTML element. `messages` provides a translation for view's texts.
     * @param {HTMLElement} container - An HTML element where this view will be inserted.
     * @param {LexicalData} wordData - A result set from inflection tables library.
     * @param {MessageBundle} messages - A message bundle with message translations.
     */
  render (container, wordData, messages) {
    'use strict';

    this.messages = messages;
    this.container = container;
    this.wordData = wordData;
    let selection = wordData[this.partOfSpeech];

    this.footnotes = new Footnotes(selection.footnotes);

        // this.table = new Table(selection.suffixes, this.groupingFeatures, messages);
        // this.table = new Table();
        // this.setTableData();
    this.table.messages = messages;
    this.table.construct(selection.suffixes).constructViews();
    this.display();
  }

    /**
     * Renders a view's HTML representation and inserts it into `container` HTML element.
     */
  display () {
        // Clear the container
    this.container.innerHTML = '';

    let word = document.createElement('h2');
    word.innerHTML = this.wordData.homonym.targetWord;
    this.container.appendChild(word);

    let title = document.createElement('h3');
    title.innerHTML = this.title;
    this.container.appendChild(title);

    this.pageHeader = { nodes: document.createElement('div') };
    this.pageHeader.nodes.innerHTML = pageHeader.html;
    this.pageHeader.hideEmptyColumnsBtn = this.pageHeader.nodes.querySelector(pageHeader.hideEmptyColumnsBtnSel);
    this.pageHeader.showEmptyColumnsBtn = this.pageHeader.nodes.querySelector(pageHeader.showEmptyColumnsBtnSel);
    this.pageHeader.hideNoSuffixGroupsBtn = this.pageHeader.nodes.querySelector(pageHeader.hideNoSuffixGroupsBtnSel);
    this.pageHeader.showNoSuffixGroupsBtn = this.pageHeader.nodes.querySelector(pageHeader.showNoSuffixGroupsBtnSel);
    this.container.appendChild(this.pageHeader.nodes);

        // Insert a wide view
    this.container.appendChild(this.table.wideView.render());
        // Insert narrow views
    this.container.appendChild(this.table.narrowView.render());

    this.table.addEventListeners();

    this.container.appendChild(this.footnotes.html);

    this.pageHeader.hideEmptyColumnsBtn.addEventListener('click', this.hideEmptyColumns.bind(this));
    this.pageHeader.showEmptyColumnsBtn.addEventListener('click', this.showEmptyColumns.bind(this));

    this.pageHeader.hideNoSuffixGroupsBtn.addEventListener('click', this.hideNoSuffixGroups.bind(this));
    this.pageHeader.showNoSuffixGroupsBtn.addEventListener('click', this.showNoSuffixGroups.bind(this));
  }

    /**
     * Hides all empty columns of the view.
     */
  hideEmptyColumns () {
    this.table.hideEmptyColumns();
    this.display();
    this.pageHeader.hideEmptyColumnsBtn.classList.add(classNames.hidden);
    this.pageHeader.showEmptyColumnsBtn.classList.remove(classNames.hidden);
  }

    /**
     * Displays all previously hidden columns.
     */
  showEmptyColumns () {
    this.table.showEmptyColumns();
    this.display();
    this.pageHeader.showEmptyColumnsBtn.classList.add(classNames.hidden);
    this.pageHeader.hideEmptyColumnsBtn.classList.remove(classNames.hidden);
  }

    /**
     * Hides groups (formed by first column feature) that have no suffix matches.
     */
  hideNoSuffixGroups () {
    this.table.hideNoSuffixGroups();
    this.display();
    this.pageHeader.hideNoSuffixGroupsBtn.classList.add(classNames.hidden);
    this.pageHeader.showNoSuffixGroupsBtn.classList.remove(classNames.hidden);
  }

    /**
     * Displays previously hidden groups with no suffix matches.
     */
  showNoSuffixGroups () {
    this.table.showNoSuffixGroups();
    this.display();
    this.pageHeader.hideNoSuffixGroupsBtn.classList.add(classNames.hidden);
    this.pageHeader.showNoSuffixGroupsBtn.classList.remove(classNames.hidden);
  }
}

class LatinView extends View {
  constructor () {
    super();
    this.language = languages.latin;
    this.language_features = languageModel.features;

        /*
        Default grammatical features of a view. It child views need to have different feature values, redefine
        those values in child objects.
         */
    this.features = {
      numbers: new GroupFeatureType(this.language_features[Feature.types.number], 'Number'),
      cases: new GroupFeatureType(this.language_features[Feature.types.grmCase], 'Case'),
      declensions: new GroupFeatureType(this.language_features[Feature.types.declension], 'Declension'),
      genders: new GroupFeatureType(this.language_features[Feature.types.gender], 'Gender'),
      types: new GroupFeatureType(this.language_features[Feature.types.type], 'Type')
    };
  }

    /*
    Creates and initializes an inflection table. Redefine this method in child objects in order to create
    an inflection table differently
     */
  createTable () {
    this.table = new Table([this.features.declensions, this.features.genders,
      this.features.types, this.features.numbers, this.features.cases]);
    let features = this.table.features;
    features.columns = [this.language_features[Feature.types.declension], this.language_features[Feature.types.gender], this.language_features[Feature.types.type]];
    features.rows = [this.language_features[Feature.types.number], this.language_features[Feature.types.grmCase]];
    features.columnRowTitles = [this.language_features[Feature.types.grmCase]];
    features.fullWidthRowTitles = [this.language_features[Feature.types.number]];
  }
}

class NounView extends LatinView {
  constructor () {
    super();
    this.id = 'nounDeclension';
    this.name = 'noun declension';
    this.title = 'Noun declension';
    this.partOfSpeech = this.language_features[Feature.types.part][Constants.POFS_NOUN].value;

        // Models.Feature that are different from base class values
    this.features.genders = new GroupFeatureType(this.language_features[Feature.types.gender], 'Gender',
      [ this.language_features[Feature.types.gender][Constants.GEND_MASCULINE],
        this.language_features[Feature.types.gender][Constants.GEND_FEMININE],
        this.language_features[Feature.types.gender][Constants.GEND_NEUTER]
      ]);
    this.createTable();
  }
}

class AdjectiveView extends LatinView {
  constructor () {
    super();
    this.id = 'adjectiveDeclension';
    this.name = 'adjective declension';
    this.title = 'Adjective declension';
    this.partOfSpeech = this.language_features[Feature.types.part].adjective.value;

        // Models.Feature that are different from base class values
    this.features.declensions = new GroupFeatureType(this.language_features[Feature.types.declension], 'Declension',
      [ this.language_features[Feature.types.declension][Constants.ORD_1ST],
        this.language_features[Feature.types.declension][Constants.ORD_2ND],
        this.language_features[Feature.types.declension][Constants.ORD_3RD]
      ]);
    this.createTable();
  }
}

class VerbView extends LatinView {
  constructor () {
    super();
    this.partOfSpeech = this.language_features[Feature.types.part][Constants.POFS_VERB].value;

    this.features = {
      tenses: new GroupFeatureType(this.language_features[Feature.types.tense], 'Tenses'),
      numbers: new GroupFeatureType(this.language_features[Feature.types.number], 'Number'),
      persons: new GroupFeatureType(this.language_features[Feature.types.person], 'Person'),
      voices: new GroupFeatureType(this.language_features[Feature.types.voice], 'Voice'),
      conjugations: new GroupFeatureType(this.language_features[Feature.types.conjugation], 'Conjugation Stem'),
      moods: new GroupFeatureType(this.language_features[Feature.types.mood], 'Mood')
    };
  }
}

class VoiceConjugationMoodView extends VerbView {
  constructor () {
    super();
    this.id = 'verbVoiceConjugationMood';
    this.name = 'verb voice-conjugation-mood';
    this.title = 'Voice-Conjugation-Mood';

    this.createTable();
  }

  createTable () {
    this.table = new Table([this.features.voices, this.features.conjugations, this.features.moods,
      this.features.tenses, this.features.numbers, this.features.persons]);
    let features = this.table.features;
    features.columns = [
      this.language_features[Feature.types.voice],
      this.language_features[Feature.types.conjugation],
      this.language_features[Feature.types.mood]];
    features.rows = [
      this.language_features[Feature.types.tense],
      this.language_features[Feature.types.number],
      this.language_features[Feature.types.person]];
    features.columnRowTitles = [
      this.language_features[Feature.types.number],
      this.language_features[Feature.types.person]];
    features.fullWidthRowTitles = [this.language_features[Feature.types.tense]];
  }
}

class VoiceMoodConjugationView extends VerbView {
  constructor () {
    super();
    this.id = 'verbVoiceMoodConjugation';
    this.name = 'verb voice-mood-conjugation';
    this.title = 'Voice-Mood-Conjugation';

    this.createTable();
  }

  createTable () {
    this.table = new Table([this.features.voices, this.features.moods, this.features.conjugations,
      this.features.tenses, this.features.numbers, this.features.persons]);
    let features = this.table.features;
    features.columns = [
      this.language_features[Feature.types.voice],
      this.language_features[Feature.types.mood],
      this.language_features[Feature.types.conjugation]];
    features.rows = [
      this.language_features[Feature.types.tense],
      this.language_features[Feature.types.number],
      this.language_features[Feature.types.person]];
    features.columnRowTitles = [
      this.language_features[Feature.types.number],
      this.language_features[Feature.types.person]];
    features.fullWidthRowTitles = [this.language_features[Feature.types.tense]];
  }
}

class ConjugationVoiceMoodView extends VerbView {
  constructor () {
    super();
    this.id = 'verbConjugationVoiceMood';
    this.name = 'verb conjugation-voice-mood';
    this.title = 'Conjugation-Voice-Mood';

    this.createTable();
  }

  createTable () {
    this.table = new Table([this.features.conjugations, this.features.voices, this.features.moods,
      this.features.tenses, this.features.numbers, this.features.persons]);
    let features = this.table.features;
    features.columns = [
      this.language_features[Feature.types.conjugation],
      this.language_features[Feature.types.voice], this.language_features[Feature.types.mood]];
    features.rows = [
      this.language_features[Feature.types.tense],
      this.language_features[Feature.types.number],
      this.language_features[Feature.types.person]];
    features.columnRowTitles = [
      this.language_features[Feature.types.number],
      this.language_features[Feature.types.person]];
    features.fullWidthRowTitles = [this.language_features[Feature.types.tense]];
  }
}

class ConjugationMoodVoiceView extends VerbView {
  constructor () {
    super();
    this.id = 'verbConjugationMoodVoice';
    this.name = 'verb conjugation-mood-voice';
    this.title = 'Conjugation-Mood-Voice';

    this.createTable();
  }

  createTable () {
    this.table = new Table([this.features.conjugations, this.features.moods, this.features.voices,
      this.features.tenses, this.features.numbers, this.features.persons]);
    let features = this.table.features;
    features.columns = [
      this.language_features[Feature.types.conjugation],
      this.language_features[Feature.types.mood],
      this.language_features[Feature.types.voice]];
    features.rows = [
      this.language_features[Feature.types.tense],
      this.language_features[Feature.types.number],
      this.language_features[Feature.types.person]];
    features.columnRowTitles = [
      this.language_features[Feature.types.number],
      this.language_features[Feature.types.person]];
    features.fullWidthRowTitles = [this.language_features[Feature.types.tense]];
  }
}

class MoodVoiceConjugationView extends VerbView {
  constructor () {
    super();
    this.id = 'verbMoodVoiceConjugation';
    this.name = 'verb mood-voice-conjugation';
    this.title = 'Mood-Voice-Conjugation';

    this.createTable();
  }

  createTable () {
    this.table = new Table([this.features.moods, this.features.voices, this.features.conjugations,
      this.features.tenses, this.features.numbers, this.features.persons]);
    let features = this.table.features;
    features.columns = [this.language_features[Feature.types.mood], this.language_features[Feature.types.voice], this.language_features[Feature.types.conjugation]];
    features.rows = [this.language_features[Feature.types.tense], this.language_features[Feature.types.number], this.language_features[Feature.types.person]];
    features.columnRowTitles = [this.language_features[Feature.types.number], this.language_features[Feature.types.person]];
    features.fullWidthRowTitles = [this.language_features[Feature.types.tense]];
  }
}

class MoodConjugationVoiceView extends VerbView {
  constructor () {
    super();
    this.id = 'verbMoodConjugationVoice';
    this.name = 'verb mood-conjugation-voice';
    this.title = 'Mood-Conjugation-Voice';

    this.createTable();
  }

  createTable () {
    this.table = new Table([this.features.moods, this.features.conjugations, this.features.voices,
      this.features.tenses, this.features.numbers, this.features.persons]);
    let features = this.table.features;
    features.columns = [this.language_features[Feature.types.mood], this.language_features[Feature.types.conjugation], this.language_features[Feature.types.voice]];
    features.rows = [this.language_features[Feature.types.tense], this.language_features[Feature.types.number], this.language_features[Feature.types.person]];
    features.columnRowTitles = [this.language_features[Feature.types.number], this.language_features[Feature.types.person]];
    features.fullWidthRowTitles = [this.language_features[Feature.types.tense]];
  }
}

var viewsLatin = [new NounView(), new AdjectiveView(),
    // Verbs
  new VoiceConjugationMoodView(), new VoiceMoodConjugationView(), new ConjugationVoiceMoodView(),
  new ConjugationMoodVoiceView(), new MoodVoiceConjugationView(), new MoodConjugationVoiceView()];

var nounSuffixesCSV$1 = "Ending,Number,Case,Declension,Gender,Type,Primary,Footnote\nα,dual,accusative,1st,feminine,regular,primary,\nά,dual,accusative,1st,feminine,regular,,\nᾶ,dual,accusative,1st,feminine,regular,,2\nαιν,dual,dative,1st,feminine,regular,primary,\nαῖν,dual,dative,1st,feminine,regular,,\nαιιν,dual,dative,1st,feminine,irregular,,\nαιν,dual,genitive,1st,feminine,regular,primary,\nαῖν,dual,genitive,1st,feminine,regular,,\nαιιν,dual,genitive,1st,feminine,irregular,,\nα,dual,nominative,1st,feminine,regular,primary,\nά,dual,nominative,1st,feminine,regular,,\nᾶ,dual,nominative,1st,feminine,regular,,2\nα,dual,vocative,1st,feminine,regular,primary,\nά,dual,vocative,1st,feminine,regular,,\nᾶ,dual,vocative,1st,feminine,regular,,2\nα,dual,accusative,1st,masculine,regular,primary,\nά,dual,accusative,1st,masculine,regular,,\nᾶ,dual,accusative,1st,masculine,regular,,2\nαιν,dual,dative,1st,masculine,regular,primary,\nαῖν,dual,dative,1st,masculine,regular,,\nαιιν,dual,dative,1st,masculine,irregular,,\nαιν,dual,genitive,1st,masculine,regular,primary,\nαῖν,dual,genitive,1st,masculine,regular,,\nαιιν,dual,genitive,1st,masculine,irregular,,\nα,dual,nominative,1st,masculine,regular,primary,\nά,dual,nominative,1st,masculine,regular,,\nᾶ,dual,nominative,1st,masculine,regular,,2\nα,dual,vocative,1st,masculine,regular,primary,\nά,dual,vocative,1st,masculine,regular,,\nᾶ,dual,vocative,1st,masculine,regular,,2\nας,plural,accusative,1st,feminine,regular,primary,\nάς,plural,accusative,1st,feminine,regular,,\nᾶς,plural,accusative,1st,feminine,regular,,2\nανς,plural,accusative,1st,feminine,irregular,,\nαις,plural,accusative,1st,feminine,irregular,,\nαις,plural,dative,1st,feminine,regular,primary,\nαῖς,plural,dative,1st,feminine,regular,,\nῃσι,plural,dative,1st,feminine,irregular,,44\nῃσιν,plural,dative,1st,feminine,irregular,,4 44\nῃς,plural,dative,1st,feminine,irregular,,44\nαισι,plural,dative,1st,feminine,irregular,,44\nαισιν,plural,dative,1st,feminine,irregular,,4 44\nῶν,plural,genitive,1st,feminine,regular,primary,\nάων,plural,genitive,1st,feminine,irregular,,\nέων,plural,genitive,1st,feminine,irregular,,\nήων,plural,genitive,1st,feminine,irregular,,\nᾶν,plural,genitive,1st,feminine,irregular,,\nαι,plural,nominative,1st,feminine,regular,primary,\nαί,plural,nominative,1st,feminine,regular,,\nαῖ,plural,nominative,1st,feminine,regular,,2\nαι,plural,vocative,1st,feminine,regular,primary,\nαί,plural,vocative,1st,feminine,regular,,\nαῖ,plural,vocative,1st,feminine,regular,,2\nας,plural,accusative,1st,masculine,regular,primary,\nάς,plural,accusative,1st,masculine,regular,,\nᾶς,plural,accusative,1st,masculine,regular,,3\nανς,plural,accusative,1st,masculine,irregular,,\nαις,plural,accusative,1st,masculine,irregular,,\nαις,plural,dative,1st,masculine,regular,primary,\nαῖς,plural,dative,1st,masculine,regular,,\nῃσι,plural,dative,1st,masculine,irregular,,44\nῃσιν,plural,dative,1st,masculine,irregular,,4 44\nῃς,plural,dative,1st,masculine,irregular,,44\nαισι,plural,dative,1st,masculine,irregular,,44\nαισιν,plural,dative,1st,masculine,irregular,,4 44\nῶν,plural,genitive,1st,masculine,regular,primary,\nάων,plural,genitive,1st,masculine,irregular,,\nέων,plural,genitive,1st,masculine,irregular,,\nήων,plural,genitive,1st,masculine,irregular,,\nᾶν,plural,genitive,1st,masculine,irregular,,\nαι,plural,nominative,1st,masculine,regular,primary,\nαί,plural,nominative,1st,masculine,regular,,\nαῖ,plural,nominative,1st,masculine,regular,,3\nαι,plural,vocative,1st,masculine,regular,primary,\nαί,plural,vocative,1st,masculine,regular,,\nαῖ,plural,vocative,1st,masculine,regular,,3\nαν,singular,accusative,1st,feminine,regular,primary,\nην,singular,accusative,1st,feminine,regular,primary,\nήν,singular,accusative,1st,feminine,regular,,\nᾶν,singular,accusative,1st,feminine,regular,,2\nῆν,singular,accusative,1st,feminine,regular,,2\nάν,singular,accusative,1st,feminine,irregular,,63\nᾳ,singular,dative,1st,feminine,regular,primary,\nῃ,singular,dative,1st,feminine,regular,primary,\nῇ,singular,dative,1st,feminine,regular,,2\nᾷ,singular,dative,1st,feminine,regular,,2\nηφι,singular,dative,1st,feminine,irregular,,45\nηφιν,singular,dative,1st,feminine,irregular,,4 45\nῆφι,singular,dative,1st,feminine,irregular,,45\nῆφιv,singular,dative,1st,feminine,irregular,,4 45\nας,singular,genitive,1st,feminine,regular,primary,\nης,singular,genitive,1st,feminine,regular,primary,\nῆs,singular,genitive,1st,feminine,regular,,\nᾶs,singular,genitive,1st,feminine,regular,,2\nηφι,singular,genitive,1st,feminine,irregular,,45\nηφιν,singular,genitive,1st,feminine,irregular,,4 45\nῆφι,singular,genitive,1st,feminine,irregular,,45\nῆφιv,singular,genitive,1st,feminine,irregular,,4 45\nα,singular,nominative,1st,feminine,regular,primary,\nη,singular,nominative,1st,feminine,regular,primary,1\nή,singular,nominative,1st,feminine,regular,,\nᾶ,singular,nominative,1st,feminine,regular,,2\nῆ,singular,nominative,1st,feminine,regular,,2\nά,singular,nominative,1st,feminine,irregular,,63\nα,singular,vocative,1st,feminine,regular,primary,\nη,singular,vocative,1st,feminine,regular,primary,\nή,singular,vocative,1st,feminine,regular,,\nᾶ,singular,vocative,1st,feminine,regular,,2\nῆ,singular,vocative,1st,feminine,regular,,2\nά,singular,vocative,1st,feminine,irregular,,63\nαν,singular,accusative,1st,masculine,regular,primary,\nην,singular,accusative,1st,masculine,regular,primary,3\nήν,singular,accusative,1st,masculine,regular,,\nᾶν,singular,accusative,1st,masculine,regular,,3\nῆν,singular,accusative,1st,masculine,regular,,3\nεα,singular,accusative,1st,masculine,irregular,,\nᾳ,singular,dative,1st,masculine,regular,primary,\nῃ,singular,dative,1st,masculine,regular,primary,\nῇ,singular,dative,1st,masculine,regular,,\nᾷ,singular,dative,1st,masculine,regular,,3\nῆ,singular,dative,1st,masculine,regular,,3\nηφι,singular,dative,1st,masculine,irregular,,45\nηφιν,singular,dative,1st,masculine,irregular,,4 45\nῆφι,singular,dative,1st,masculine,irregular,,45\nῆφιv,singular,dative,1st,masculine,irregular,,4 45\nου,singular,genitive,1st,masculine,regular,primary,\nοῦ,singular,genitive,1st,masculine,regular,,\nαο,singular,genitive,1st,masculine,irregular,,\nεω,singular,genitive,1st,masculine,irregular,,\nηφι,singular,genitive,1st,masculine,irregular,,45\nηφιν,singular,genitive,1st,masculine,irregular,,4 45\nῆφι,singular,genitive,1st,masculine,irregular,,45\nῆφιv,singular,genitive,1st,masculine,irregular,,4 45\nω,singular,genitive,1st,masculine,irregular,,\nα,singular,genitive,1st,masculine,irregular,,\nας,singular,nominative,1st,masculine,regular,primary,\nης,singular,nominative,1st,masculine,regular,primary,\nής,singular,nominative,1st,masculine,regular,,\nᾶs,singular,nominative,1st,masculine,regular,,3\nῆs,singular,nominative,1st,masculine,regular,,3\nα,singular,vocative,1st,masculine,regular,primary,\nη,singular,vocative,1st,masculine,regular,primary,\nά,singular,vocative,1st,masculine,regular,,\nᾶ,singular,vocative,1st,masculine,regular,,3\nῆ,singular,vocative,1st,masculine,regular,,3\nω,dual,accusative,2nd,masculine feminine,regular,primary,\nώ,dual,accusative,2nd,masculine feminine,regular,,5\nοιν,dual,dative,2nd,masculine feminine,regular,primary,\nοῖν,dual,dative,2nd,masculine feminine,regular,,5\nοιιν,dual,dative,2nd,masculine feminine,irregular,,\nῴν,dual,dative,2nd,masculine feminine,irregular,,7\nοιν,dual,genitive,2nd,masculine feminine,regular,primary,\nοῖν,dual,genitive,2nd,masculine feminine,regular,,5\nοιιν,dual,genitive,2nd,masculine feminine,irregular,,\nῴν,dual,genitive,2nd,masculine feminine,irregular,,7\nω,dual,nominative,2nd,masculine feminine,regular,primary,60\nώ,dual,nominative,2nd,masculine feminine,regular,,60\nω,dual,vocative,2nd,masculine feminine,regular,primary,\nώ,dual,vocative,2nd,masculine feminine,regular,,5\nω,dual,accusative,2nd,neuter,regular,primary,\nώ,dual,accusative,2nd,neuter,regular,,6\nοιν,dual,dative,2nd,neuter,regular,primary,\nοῖν,dual,dative,2nd,neuter,regular,,6\nοιιν,dual,dative,2nd,neuter,irregular,,\nοιν,dual,genitive,2nd,neuter,regular,primary,\nοῖν,dual,genitive,2nd,neuter,regular,,6\nοιιν,dual,genitive,2nd,neuter,irregular,,\nω,dual,nominative,2nd,neuter,regular,primary,\nώ,dual,nominative,2nd,neuter,regular,,6\nω,dual,vocative,2nd,neuter,regular,primary,\nώ,dual,vocative,2nd,neuter,regular,,6\nους,plural,accusative,2nd,masculine feminine,regular,primary,\nούς,plural,accusative,2nd,masculine feminine,regular,,41\nοῦς,plural,accusative,2nd,masculine feminine,regular,,5\nονς,plural,accusative,2nd,masculine feminine,irregular,,\nος,plural,accusative,2nd,masculine feminine,irregular,,\nως,plural,accusative,2nd,masculine feminine,irregular,,\nοις,plural,accusative,2nd,masculine feminine,irregular,,\nώς,plural,accusative,2nd,masculine feminine,irregular,,7\nοις,plural,dative,2nd,masculine feminine,regular,primary,\nοῖς,plural,dative,2nd,masculine feminine,regular,,5\nοισι,plural,dative,2nd,masculine feminine,irregular,,\nοισιν,plural,dative,2nd,masculine feminine,irregular,,4\nῴς,plural,dative,2nd,masculine feminine,irregular,,7\nόφι,plural,dative,2nd,masculine feminine,irregular,,45\nόφιv,plural,dative,2nd,masculine feminine,irregular,,4 45\nων,plural,genitive,2nd,masculine feminine,regular,primary,\nῶν,plural,genitive,2nd,masculine feminine,regular,,5\nών,plural,genitive,2nd,masculine feminine,irregular,,7\nόφι,plural,genitive,2nd,masculine feminine,irregular,,45\nόφιv,plural,genitive,2nd,masculine feminine,irregular,,4 45\nοι,plural,nominative,2nd,masculine feminine,regular,primary,\nοί,plural,nominative,2nd,masculine feminine,regular,,41\nοῖ,plural,nominative,2nd,masculine feminine,regular,,5\nῴ,plural,nominative,2nd,masculine feminine,irregular,,7\nοι,plural,vocative,2nd,masculine feminine,regular,primary,\nοί,plural,vocative,2nd,masculine feminine,regular,,41\nοῖ,plural,vocative,2nd,masculine feminine,regular,,5\nα,plural,accusative,2nd,neuter,regular,primary,\nᾶ,plural,accusative,2nd,neuter,regular,,6\nοις,plural,dative,2nd,neuter,regular,primary,\nοῖς,plural,dative,2nd,neuter,regular,,6\nοισι,plural,dative,2nd,neuter,irregular,,\nοισιν,plural,dative,2nd,neuter,irregular,,4\nόφι,plural,dative,2nd,neuter,irregular,,45\nόφιv,plural,dative,2nd,neuter,irregular,,4 45\nων,plural,genitive,2nd,neuter,regular,primary,\nῶν,plural,genitive,2nd,neuter,regular,,6\nόφι,plural,genitive,2nd,neuter,irregular,,45\nόφιv,plural,genitive,2nd,neuter,irregular,,4 45\nα,plural,nominative,2nd,neuter,regular,primary,\nᾶ,plural,nominative,2nd,neuter,regular,,6\nα,plural,vocative,2nd,neuter,regular,primary,\nᾶ,plural,vocative,2nd,neuter,regular,,6\nον,singular,accusative,2nd,masculine feminine,regular,primary,\nόν,singular,accusative,2nd,masculine feminine,regular,primary,41\nουν,singular,accusative,2nd,masculine feminine,regular,,5\nοῦν,singular,accusative,2nd,masculine feminine,regular,,5\nω,singular,accusative,2nd,masculine feminine,irregular,,7 5\nωv,singular,accusative,2nd,masculine feminine,irregular,,7 59\nώ,singular,accusative,2nd,masculine feminine,irregular,,7 42 59\nών,singular,accusative,2nd,masculine feminine,irregular,,7 59\nῳ,singular,dative,2nd,masculine feminine,regular,primary,\nῷ,singular,dative,2nd,masculine feminine,regular,,5\nῴ,singular,dative,2nd,masculine feminine,irregular,,7\nόφι,singular,dative,2nd,masculine feminine,irregular,,45\nόφιv,singular,dative,2nd,masculine feminine,irregular,,4 45\nου,singular,genitive,2nd,masculine feminine,regular,primary,\nοῦ,singular,genitive,2nd,masculine feminine,regular,,5\nοιο,singular,genitive,2nd,masculine feminine,irregular,,\nοο,singular,genitive,2nd,masculine feminine,irregular,,\nω,singular,genitive,2nd,masculine feminine,irregular,,\nώ,singular,genitive,2nd,masculine feminine,irregular,,7\nόφι,singular,genitive,2nd,masculine feminine,irregular,,45\nόφιv,singular,genitive,2nd,masculine feminine,irregular,,4 45\nος,singular,nominative,2nd,masculine feminine,regular,primary,\nους,singular,nominative,2nd,masculine feminine,regular,,5\noῦς,singular,nominative,2nd,masculine feminine,regular,,5\nός,singular,nominative,2nd,masculine feminine,regular,,\nώς,singular,nominative,2nd,masculine feminine,irregular,,7 42\nως,singular,nominative,2nd,masculine feminine,irregular,,\nε,singular,vocative,2nd,masculine feminine,regular,primary,\nέ,singular,vocative,2nd,masculine feminine,regular,,\nοu,singular,vocative,2nd,masculine feminine,regular,,5\nοῦ,singular,vocative,2nd,masculine feminine,regular,,42\nός,singular,vocative,2nd,masculine feminine,irregular,,57\nον,singular,accusative,2nd,neuter,regular,primary,\nοῦν,singular,accusative,2nd,neuter,regular,,6\nῳ,singular,dative,2nd,neuter,regular,primary,\nῷ,singular,dative,2nd,neuter,regular,,6\nόφι,singular,dative,2nd,neuter,irregular,,45\nόφιv,singular,dative,2nd,neuter,irregular,,4 45\nου,singular,genitive,2nd,neuter,regular,primary,\nοῦ,singular,genitive,2nd,neuter,regular,,6\nοο,singular,genitive,2nd,neuter,irregular,,\nοιο,singular,genitive,2nd,neuter,irregular,,\nω,singular,genitive,2nd,neuter,irregular,,\nόφι,singular,genitive,2nd,neuter,irregular,,45\nόφιv,singular,genitive,2nd,neuter,irregular,,4 45\nον,singular,nominative,2nd,neuter,regular,primary,\nοῦν,singular,nominative,2nd,neuter,regular,,6\nον,singular,vocative,2nd,neuter,regular,primary,\nοῦν,singular,vocative,2nd,neuter,regular,,6\nε,dual,accusative,3rd,masculine feminine,regular,primary,\nει,dual,accusative,3rd,masculine feminine,regular,,\nῆ,dual,accusative,3rd,masculine feminine,regular,,18\nω,dual,accusative,3rd,masculine feminine,irregular,,32\nῖ,dual,accusative,3rd,masculine feminine,irregular,,33\nεε,dual,accusative,3rd,masculine feminine,irregular,,16 55 61\nοιν,dual,dative,3rd,masculine feminine,regular,primary,\nοῖν,dual,dative,3rd,masculine feminine,regular,,\nοιιν,dual,dative,3rd,masculine feminine,irregular,,54\nσι,dual,dative,3rd,masculine feminine,irregular,,33 37\nεσσι,dual,dative,3rd,masculine feminine,irregular,,33\nεσι,dual,dative,3rd,masculine feminine,irregular,,33\nέοιν,dual,dative,3rd,masculine feminine,irregular,,16 61\nῳν,dual,dative,3rd,masculine feminine,irregular,,49\nοιν,dual,genitive,3rd,masculine feminine,regular,primary,\nοῖν,dual,genitive,3rd,masculine feminine,regular,,\nοιιν,dual,genitive,3rd,masculine feminine,irregular,,54\nέοιν,dual,genitive,3rd,masculine feminine,irregular,,16 61\nῳν,dual,genitive,3rd,masculine feminine,irregular,,49\nε,dual,nominative,3rd,masculine feminine,regular,primary,\nει,dual,nominative,3rd,masculine feminine,regular,,\nῆ,dual,nominative,3rd,masculine feminine,regular,,18\nω,dual,nominative,3rd,masculine feminine,irregular,,32\nῖ,dual,nominative,3rd,masculine feminine,irregular,,33\nεε,dual,nominative,3rd,masculine feminine,irregular,,16 55 61\nε,dual,vocative,3rd,masculine feminine,regular,primary,\nει,dual,vocative,3rd,masculine feminine,regular,,\nῆ,dual,vocative,3rd,masculine feminine,regular,,18\nω,dual,vocative,3rd,masculine feminine,irregular,,32\nῖ,dual,vocative,3rd,masculine feminine,irregular,,33\nεε,dual,vocative,3rd,masculine feminine,irregular,,16 55 61\nε,dual,accusative,3rd,neuter,regular,primary,\nει,dual,accusative,3rd,neuter,regular,,\nα,dual,accusative,3rd,neuter,regular,,\nεε,dual,accusative,3rd,neuter,irregular,,16 61\nαε,dual,accusative,3rd,neuter,irregular,,16 61\nοιν,dual,dative,3rd,neuter,regular,primary,\nῷν,dual,dative,3rd,neuter,regular,,\nοις,dual,dative,3rd,neuter,irregular,,33 38\nοισι,dual,dative,3rd,neuter,irregular,,33 38\nοισι(ν),dual,dative,3rd,neuter,irregular,,4 33 38\nοιιν,dual,dative,3rd,neuter,irregular,,\nέοιν,dual,dative,3rd,neuter,irregular,,16 61\nάοιν,dual,dative,3rd,neuter,irregular,,16 61\nοιν,dual,genitive,3rd,neuter,regular,primary,\nῷν,dual,genitive,3rd,neuter,regular,,\nων,dual,genitive,3rd,neuter,irregular,,33 38\nοιιν,dual,genitive,3rd,neuter,irregular,,\nέοιν,dual,genitive,3rd,neuter,irregular,,16 61\nάοιν,dual,genitive,3rd,neuter,irregular,,16 61\nε,dual,nominative,3rd,neuter,regular,primary,\nει,dual,nominative,3rd,neuter,regular,,\nα,dual,nominative,3rd,neuter,regular,,\nεε,dual,nominative,3rd,neuter,irregular,,16 61\nαε,dual,nominative,3rd,neuter,irregular,,16 61\nε,dual,vocative,3rd,neuter,regular,primary,\nει,dual,vocative,3rd,neuter,regular,,\nα,dual,vocative,3rd,neuter,regular,,\nεε,dual,vocative,3rd,neuter,irregular,,16 61\nαε,dual,vocative,3rd,neuter,irregular,,16 61\nας,plural,accusative,3rd,masculine feminine,regular,primary,\nεις,plural,accusative,3rd,masculine feminine,regular,,17 41\nες,plural,accusative,3rd,masculine feminine,regular,,\nς,plural,accusative,3rd,masculine feminine,regular,,\nῦς,plural,accusative,3rd,masculine feminine,regular,,17 18 48\nως,plural,accusative,3rd,masculine feminine,regular,,30\nῆς,plural,accusative,3rd,masculine feminine,irregular,,56\nέας,plural,accusative,3rd,masculine feminine,irregular,,\nέος,plural,accusative,3rd,masculine feminine,irregular,,\nῆος,plural,accusative,3rd,masculine feminine,irregular,,\nῆες,plural,accusative,3rd,masculine feminine,irregular,,\nῆας,plural,accusative,3rd,masculine feminine,irregular,,\nους,plural,accusative,3rd,masculine feminine,irregular,,32\nούς,plural,accusative,3rd,masculine feminine,irregular,,32\nεῖς,plural,accusative,3rd,masculine feminine,irregular,,31 41\nεες,plural,accusative,3rd,masculine feminine,irregular,,55 61\nις,plural,accusative,3rd,masculine feminine,irregular,,\nινς,plural,accusative,3rd,masculine feminine,irregular,,\nῶς,plural,accusative,3rd,masculine feminine,irregular,,48\nσι,plural,dative,3rd,masculine feminine,regular,primary,\nσιν,plural,dative,3rd,masculine feminine,regular,primary,4\nσί,plural,dative,3rd,masculine feminine,regular,,41\nσίν,plural,dative,3rd,masculine feminine,regular,,4 41\nεσι,plural,dative,3rd,masculine feminine,regular,,41\nεσιν,plural,dative,3rd,masculine feminine,regular,,4 41\nέσι,plural,dative,3rd,masculine feminine,regular,,\nέσιν,plural,dative,3rd,masculine feminine,regular,,4\nψι,plural,dative,3rd,masculine feminine,regular,,\nψιν,plural,dative,3rd,masculine feminine,regular,,4\nψί,plural,dative,3rd,masculine feminine,regular,,\nψίν,plural,dative,3rd,masculine feminine,regular,,4\nξι,plural,dative,3rd,masculine feminine,regular,,\nξιν,plural,dative,3rd,masculine feminine,regular,,4\nξί,plural,dative,3rd,masculine feminine,regular,,\nξίν,plural,dative,3rd,masculine feminine,regular,,4\nφι,plural,dative,3rd,masculine feminine,irregular,,45\nφιν,plural,dative,3rd,masculine feminine,irregular,,4 45\nηφι,plural,dative,3rd,masculine feminine,irregular,,45\nηφιv,plural,dative,3rd,masculine feminine,irregular,,4 45\nῆφι,plural,dative,3rd,masculine feminine,irregular,,45\nῆφιν,plural,dative,3rd,masculine feminine,irregular,,4 45\nόφι,plural,dative,3rd,masculine feminine,irregular,,45\nόφιν,plural,dative,3rd,masculine feminine,irregular,,4 45\nαις,plural,dative,3rd,masculine feminine,irregular,,33 41\nοῖσι,plural,dative,3rd,masculine feminine,irregular,,33\nοῖσιv,plural,dative,3rd,masculine feminine,irregular,,4 33\nεσσι,plural,dative,3rd,masculine feminine,irregular,,16 61\nεσσιv,plural,dative,3rd,masculine feminine,irregular,,4 16 61\nυσσι,plural,dative,3rd,masculine feminine,irregular,,54\nυσσιv,plural,dative,3rd,masculine feminine,irregular,,4 54\nσσί,plural,dative,3rd,masculine feminine,irregular,,54\nσσίv,plural,dative,3rd,masculine feminine,irregular,,4 54\nων,plural,genitive,3rd,masculine feminine,regular,primary,\nῶν,plural,genitive,3rd,masculine feminine,regular,,\n-,plural,genitive,3rd,masculine feminine,irregular,,41\nφι,plural,genitive,3rd,masculine feminine,irregular,,45\nφιν,plural,genitive,3rd,masculine feminine,irregular,,4 45\nηφι,plural,genitive,3rd,masculine feminine,irregular,,45\nηφιv,plural,genitive,3rd,masculine feminine,irregular,,4 45\nῆφι,plural,genitive,3rd,masculine feminine,irregular,,45\nῆφιν,plural,genitive,3rd,masculine feminine,irregular,,4 45\nόφι,plural,genitive,3rd,masculine feminine,irregular,,45\nόφιν,plural,genitive,3rd,masculine feminine,irregular,,4 45\nέων,plural,genitive,3rd,masculine feminine,irregular,,16 61\nες,plural,nominative,3rd,masculine feminine,regular,primary,\nως,plural,nominative,3rd,masculine feminine,regular,,30\nεις,plural,nominative,3rd,masculine feminine,regular,,17\nεῖς,plural,nominative,3rd,masculine feminine,regular,,18\nοί,plural,nominative,3rd,masculine feminine,irregular,,32\nαί,plural,nominative,3rd,masculine feminine,irregular,,33\nῆς,plural,nominative,3rd,masculine feminine,irregular,,18\nῄς,plural,nominative,3rd,masculine feminine,irregular,,31 41\nεες,plural,nominative,3rd,masculine feminine,irregular,,16 55 61\nοι,plural,nominative,3rd,masculine feminine,irregular,,33\nες,plural,vocative,3rd,masculine feminine,regular,primary,\nεις,plural,vocative,3rd,masculine feminine,regular,,17\nεῖς,plural,vocative,3rd,masculine feminine,regular,,18\nῆς,plural,vocative,3rd,masculine feminine,regular,,18\nως,plural,vocative,3rd,masculine feminine,regular,,30\nεες,plural,vocative,3rd,masculine feminine,irregular,,16 55 61\nα,plural,accusative,3rd,neuter,regular,primary,\nη,plural,accusative,3rd,neuter,regular,,\nς,plural,accusative,3rd,neuter,regular,,\nά,plural,accusative,3rd,neuter,irregular,,33\nαα,plural,accusative,3rd,neuter,irregular,,16 61\nεα,plural,accusative,3rd,neuter,irregular,,16 61\nσι,plural,dative,3rd,neuter,regular,primary,\nσιν,plural,dative,3rd,neuter,regular,primary,4\nσί,plural,dative,3rd,neuter,regular,,\nσίv,plural,dative,3rd,neuter,regular,,4\nασι,plural,dative,3rd,neuter,regular,,\nασιν,plural,dative,3rd,neuter,regular,,4\nεσι,plural,dative,3rd,neuter,regular,,\nεσιν,plural,dative,3rd,neuter,regular,,4\nέσι,plural,dative,3rd,neuter,regular,,\nέσιv,plural,dative,3rd,neuter,regular,,4\nεσσι,plural,dative,3rd,neuter,irregular,,54\nεσσιν,plural,dative,3rd,neuter,irregular,,4 54\nσσί,plural,dative,3rd,neuter,irregular,,54\nσσίv,plural,dative,3rd,neuter,irregular,,4 54\nασσι,plural,dative,3rd,neuter,irregular,,54\nασσιν,plural,dative,3rd,neuter,irregular,,4 54\nφι,plural,dative,3rd,neuter,irregular,,45\nφιν,plural,dative,3rd,neuter,irregular,,4 45\nηφι,plural,dative,3rd,neuter,irregular,,45\nηφιv,plural,dative,3rd,neuter,irregular,,4 45\nῆφι,plural,dative,3rd,neuter,irregular,,45\nῆφιν,plural,dative,3rd,neuter,irregular,,4 45\nόφι,plural,dative,3rd,neuter,irregular,,45\nόφιν,plural,dative,3rd,neuter,irregular,,4 45\nων,plural,genitive,3rd,neuter,regular,primary,\nῶν,plural,genitive,3rd,neuter,regular,primary,\nφι,plural,genitive,3rd,neuter,irregular,,\nφιν,plural,genitive,3rd,neuter,irregular,,4 45\nηφι,plural,genitive,3rd,neuter,irregular,,45\nηφιv,plural,genitive,3rd,neuter,irregular,,4 45\nῆφι,plural,genitive,3rd,neuter,irregular,,45\nῆφιν,plural,genitive,3rd,neuter,irregular,,4 45\nόφι,plural,genitive,3rd,neuter,irregular,,45\nόφιν,plural,genitive,3rd,neuter,irregular,,4 45\nέων,plural,genitive,3rd,neuter,irregular,,16 61\nάων,plural,genitive,3rd,neuter,irregular,,16 61\nα,plural,nominative,3rd,neuter,regular,primary,\nη,plural,nominative,3rd,neuter,regular,,\nες,plural,nominative,3rd,neuter,regular,,\nά,plural,nominative,3rd,neuter,irregular,,33\nεα,plural,nominative,3rd,neuter,irregular,,16 61\nαα,plural,nominative,3rd,neuter,irregular,,16 61\nα,plural,vocative,3rd,neuter,regular,primary,\nη,plural,vocative,3rd,neuter,regular,,\nες,plural,vocative,3rd,neuter,regular,,\nαα,plural,vocative,3rd,neuter,irregular,,16 61\nεα,plural,vocative,3rd,neuter,irregular,,16 61\nα,singular,accusative,3rd,masculine feminine,regular,primary,\nη,singular,accusative,3rd,masculine feminine,regular,,16\nν,singular,accusative,3rd,masculine feminine,regular,,\nιν,singular,accusative,3rd,masculine feminine,regular,,41\nῦν,singular,accusative,3rd,masculine feminine,regular,,18\nῶ,singular,accusative,3rd,masculine feminine,regular,,23\nυν,singular,accusative,3rd,masculine feminine,regular,,\nῦν,singular,accusative,3rd,masculine feminine,regular,,17\nύν,singular,accusative,3rd,masculine feminine,regular,,17\nέα,singular,accusative,3rd,masculine feminine,regular,,20\nην,singular,accusative,3rd,masculine feminine,regular,,24\nώ,singular,accusative,3rd,masculine feminine,regular,,19 41\nω,singular,accusative,3rd,masculine feminine,regular,,23\nεῖν,singular,accusative,3rd,masculine feminine,irregular,,31 41\nων,singular,accusative,3rd,masculine feminine,irregular,,33 41 49\nαν,singular,accusative,3rd,masculine feminine,irregular,,33 41\nον,singular,accusative,3rd,masculine feminine,irregular,,39\nῖς,singular,accusative,3rd,masculine feminine,irregular,,33\nεα,singular,accusative,3rd,masculine feminine,irregular,,61\nι,singular,dative,3rd,masculine feminine,regular,primary,\nί,singular,dative,3rd,masculine feminine,regular,,\nϊ,singular,dative,3rd,masculine feminine,regular,,17\nΐ,singular,dative,3rd,masculine feminine,regular,,40\nει,singular,dative,3rd,masculine feminine,regular,,16 17\nεῖ,singular,dative,3rd,masculine feminine,regular,,18\nαι,singular,dative,3rd,masculine feminine,regular,,\noῖ,singular,dative,3rd,masculine feminine,regular,,28 41\nῖ,singular,dative,3rd,masculine feminine,irregular,,33 46\nῆι,singular,dative,3rd,masculine feminine,irregular,,18\nᾳ,singular,dative,3rd,masculine feminine,irregular,,25\nῳ,singular,dative,3rd,masculine feminine,irregular,,33 34\nῷ,singular,dative,3rd,masculine feminine,irregular,,33\nιί,singular,dative,3rd,masculine feminine,irregular,,62\nυί,singular,dative,3rd,masculine feminine,irregular,,62\nέϊ,singular,dative,3rd,masculine feminine,irregular,,18 61\nος,singular,genitive,3rd,masculine feminine,regular,primary,\nός,singular,genitive,3rd,masculine feminine,regular,,\nους,singular,genitive,3rd,masculine feminine,regular,,16\nοῦς,singular,genitive,3rd,masculine feminine,regular,,19 46\nως,singular,genitive,3rd,masculine feminine,regular,,17 18\nώς,singular,genitive,3rd,masculine feminine,regular,,17 18 41\nῶς,singular,genitive,3rd,masculine feminine,regular,,47\nεως,singular,genitive,3rd,masculine feminine,regular,,17\nέως,singular,genitive,3rd,masculine feminine,regular,,\nεώς,singular,genitive,3rd,masculine feminine,regular,,\nέους,singular,genitive,3rd,masculine feminine,regular,,20\nω,singular,genitive,3rd,masculine feminine,irregular,,\nεος,singular,genitive,3rd,masculine feminine,irregular,,61\nΰς,singular,genitive,3rd,masculine feminine,irregular,,41 48\nῦς,singular,genitive,3rd,masculine feminine,irregular,,48\nνος,singular,genitive,3rd,masculine feminine,irregular,,22\nοῦ,singular,genitive,3rd,masculine feminine,irregular,,33\nηος,singular,genitive,3rd,masculine feminine,irregular,,55\nιός,singular,genitive,3rd,masculine feminine,irregular,,62\nuός,singular,genitive,3rd,masculine feminine,irregular,,62\nς,singular,nominative,3rd,masculine feminine,regular,primary,\n-,singular,nominative,3rd,masculine feminine,regular,primary,\nηρ,singular,nominative,3rd,masculine feminine,regular,,41\nις,singular,nominative,3rd,masculine feminine,regular,,\nϊς,singular,nominative,3rd,masculine feminine,regular,,\nώ,singular,nominative,3rd,masculine feminine,regular,,41\nψ,singular,nominative,3rd,masculine feminine,regular,,\nξ,singular,nominative,3rd,masculine feminine,regular,,\nρ,singular,nominative,3rd,masculine feminine,regular,,\nήρ,singular,nominative,3rd,masculine feminine,regular,,\nήν,singular,nominative,3rd,masculine feminine,regular,,50\nν,singular,nominative,3rd,masculine feminine,regular,,\nωρ,singular,nominative,3rd,masculine feminine,regular,,\nων,singular,nominative,3rd,masculine feminine,regular,,\nών,singular,nominative,3rd,masculine feminine,regular,,\nης,singular,nominative,3rd,masculine feminine,regular,,\nῆς,singular,nominative,3rd,masculine feminine,regular,,\nυς,singular,nominative,3rd,masculine feminine,regular,,\nῦς,singular,nominative,3rd,masculine feminine,regular,,\nεῦς,singular,nominative,3rd,masculine feminine,regular,,\nύς,singular,nominative,3rd,masculine feminine,regular,,\nής,singular,nominative,3rd,masculine feminine,regular,,33\nας,singular,nominative,3rd,masculine feminine,irregular,,\nῴ,singular,nominative,3rd,masculine feminine,irregular,,29 41\nώς,singular,nominative,3rd,masculine feminine,irregular,,27 41\nϋς,singular,nominative,3rd,masculine feminine,irregular,,41\nῄς,singular,nominative,3rd,masculine feminine,irregular,,31 41\nῖς,singular,nominative,3rd,masculine feminine,irregular,,\nεῖς,singular,nominative,3rd,masculine feminine,irregular,,31 41\nῶς,singular,nominative,3rd,masculine feminine,irregular,,48\nος,singular,nominative,3rd,masculine feminine,irregular,,33\n-,singular,vocative,3rd,masculine feminine,regular,primary,52\nς,singular,vocative,3rd,masculine feminine,regular,,30\nι,singular,vocative,3rd,masculine feminine,regular,,41\nῦ,singular,vocative,3rd,masculine feminine,regular,,15 17 18\nοῖ,singular,vocative,3rd,masculine feminine,regular,,19 41\nψ,singular,vocative,3rd,masculine feminine,regular,,\nξ,singular,vocative,3rd,masculine feminine,regular,,\nν,singular,vocative,3rd,masculine feminine,regular,,\nρ,singular,vocative,3rd,masculine feminine,regular,,\nων,singular,vocative,3rd,masculine feminine,regular,,50\nών,singular,vocative,3rd,masculine feminine,regular,,\nήν,singular,vocative,3rd,masculine feminine,regular,,\nερ,singular,vocative,3rd,masculine feminine,regular,,\nες,singular,vocative,3rd,masculine feminine,regular,,\nί,singular,vocative,3rd,masculine feminine,regular,,\nως,singular,vocative,3rd,masculine feminine,regular,,\nἶ,singular,vocative,3rd,masculine feminine,regular,,\nούς,singular,vocative,3rd,masculine feminine,regular,,51\nύ,singular,vocative,3rd,masculine feminine,regular,,15\nυ,singular,vocative,3rd,masculine feminine,regular,,51\nεις,singular,vocative,3rd,masculine feminine,regular,,20\nαν,singular,vocative,3rd,masculine feminine,regular,,\nώς,singular,vocative,3rd,masculine feminine,irregular,,27 41 46\nον,singular,vocative,3rd,masculine feminine,irregular,,\nυς,singular,vocative,3rd,masculine feminine,irregular,,33\nα,singular,accusative,3rd,neuter,regular,primary,15\n-,singular,accusative,3rd,neuter,regular,,33\nος,singular,accusative,3rd,neuter,regular,,\nας,singular,accusative,3rd,neuter,regular,,\nαρ,singular,accusative,3rd,neuter,regular,,21\nυ,singular,accusative,3rd,neuter,regular,,\nι,singular,dative,3rd,neuter,regular,primary,\nει,singular,dative,3rd,neuter,regular,,16\nαι,singular,dative,3rd,neuter,regular,,16 21\nϊ,singular,dative,3rd,neuter,irregular,,17\nᾳ,singular,dative,3rd,neuter,irregular,,25 33\nυϊ,singular,dative,3rd,neuter,irregular,,17\nαϊ,singular,dative,3rd,neuter,irregular,,21 61\nος,singular,genitive,3rd,neuter,regular,primary,\nους,singular,genitive,3rd,neuter,regular,,16\nως,singular,genitive,3rd,neuter,regular,,16\nεως,singular,genitive,3rd,neuter,regular,,17\nυς,singular,genitive,3rd,neuter,irregular,,26\nου,singular,genitive,3rd,neuter,irregular,,33\nαος,singular,genitive,3rd,neuter,irregular,,21 61\nα,singular,nominative,3rd,neuter,regular,primary,\n-,singular,nominative,3rd,neuter,regular,,33\nος,singular,nominative,3rd,neuter,regular,,\nαρ,singular,nominative,3rd,neuter,regular,,\nας,singular,nominative,3rd,neuter,regular,,16 21\nυ,singular,nominative,3rd,neuter,regular,,\nον,singular,nominative,3rd,neuter,irregular,,33\nα,singular,vocative,3rd,neuter,regular,primary,15\n-,singular,vocative,3rd,neuter,regular,,\nος,singular,vocative,3rd,neuter,regular,,\nας,singular,vocative,3rd,neuter,regular,,\nαρ,singular,vocative,3rd,neuter,regular,,21\nυ,singular,vocative,3rd,neuter,regular,,";

var nounFootnotesCSV$1 = "Index,Text\n1,See  for Rules of variance within regular endings\n2,See  for Table of α- and ε- stem feminine 1st declension contracts\n3,See  for Table of α- and ε- stem masculine 1st declension contracts\n4,\"Previous, with (ν)\"\n5,See  for Table of o- and ε- stem masculine  2nd declension contracts\n6,See  for Table of o- and ε- stem neuter 2nd declension contracts\n7,(Attic) contracts of o-stems preceded by a long vowel\n15,\"This is not actually an “ending,” but the last letter of the “pure stem”. See\"\n16,\"See  &  for Table of Sigma (ες,ας,ος) stem contracts\"\n17,See  for Table of  ι and υ - stem contracts\n18,\"See  for Table of  ευ,αυ,and ου - stem contracts\"\n19,See  for stems in οι feminine 3rd declension contracts\n20,See  for Table of 3rd declension contracts of stems in -εσ- preceded by ε\n21,See  for Table of stems in τ and ατ neuter 3rd declension contracts\n22,\"On stem ending in ν, ν doubled in gen. Sing Aeolic (e.g. μῆνς,μῆννος...)\"\n23,Also in inscriptions and expressions of swearing\n24,(Borrowed from 1st decl) Sometimes in proper names whose nominative ends in -ης\n25,From -ας-stems (properly αι)\n26,(ε)υς instead of (ε)ος or ους (gen) for (3rd decl) words whose nominative ends in -ος\n27,In 3rd decl. Only in the words αἰδώς (Attic) and ἠώς (Homer and Ionic)\n28,Contraction of a stem in οι  and an ι-ending\n29,Stronger form of Ionic contractions of οι-stems (in the nominative)\n30,See  for Table of ω - stem contracts (masculine only)\n31,Nominative plural contraction of  -ειδ+ες  after dropping the δ (used for accusative too). See .a\n32,\"Plurals & duals occur rarely (and w/ 2nd decl endings) for 3rd decl οι-stem nouns. See .D.a,b,c\"\n33,See  for description and examples of Irreg. Decl involving 3rd decl endings\n34,(Homer)  for Attic  (ῳτ)ι\n35,(Homer) for Cretan ινς\n36,Also an irregular ending for other stem(s)\n37,In inscriptions\n38,\"Plural endings for otherwise dual noun,οσσε (eyes)\"\n39,\"“Poetical” (acc for ἔρως). See ,11\"\n40,\"Poetic for χρωτι,dat. of ὁ χρως\"\n41,No Masculine of this Form\n42,No Feminine of this Form\n44,See  D.9 and #215 regarding dialectic alternate forms of the Dative Plural\n45,\"Surviving in Homer (See ) Not truly genitive or dative, but instrumental/locative/ablative, associated with the remaining oblique cases (genitive & dative) only after being lost as cases themselves in Greek\"\n46,See Smyth # 266 for only surviving ος-stem in Attic (fem. singular of αἰδως)\n47,See  for Substantives in -εύς preceded by a vowel.\n48,\"See Smyth,  #275 D.1,2,3\"\n49,\"See , List of Principal Irregular Substantives\"\n50,\"See  for Table of stems in a Liquid (λ,ρ) or a Nasal (ν), and Note #259D for variants including Κρονίων...\"\n51,\"See  for Table of stems in a Dental (τ,δ,θ) or a Nasal (ν), and its notes including Ν.κόρυς (Voc. Κόρυ) & ὀδούς\"\n52,See  for general rule re 3rd Declension Masc/Fem Singular Vocative\n54,See  D\n55,See\n56,\"See  for other forms of endings for contracts of ευ,αυ,and ου - stems\"\n57,Nominative form used as Vocative. See\n58,\"See ,b\"\n59,\"See ,d\"\n60,This (Feminine or Masculine) Form only Masculine when derived from ε- or ο- contraction\n61,See Smyth Note 264 D.1 regarding Homer's use of Open Forms\n62,See Smyth Note 269 for alternate i-stem and u-stem endings\n63,See  D.2\n64,See  D.1";

/*
 * Latin language data module
 */
/* import adjectiveSuffixesCSV from './data/adjective/suffixes.csv';
import adjectiveFootnotesCSV from './data/adjective/footnotes.csv';
import verbSuffixesCSV from './data/verb/suffixes.csv';
import verbFootnotesCSV from './data/verb/footnotes.csv'; */
// A language of this module
const language$1 = languages.greek;
// Create a language data set that will keep all language-related information
let dataSet$1 = new LanguageDataset(language$1);

// region Definition of grammatical features
/*
 Define grammatical features of a language. Those grammatical features definitions will also be used by morphological
 analyzer's language modules as well.
 */
const importerName$1 = 'csv';
const parts = new FeatureType(Feature.types.part, ['noun', 'adjective', 'verb'], language$1);
const numbers = new FeatureType(Feature.types.number, ['singular', 'dual', 'plural'], language$1);
numbers.addImporter(importerName$1)
    .map('singular', numbers.singular)
    .map('dual', numbers.dual)
    .map('plural', numbers.plural);
const cases = new FeatureType(Feature.types.grmCase, ['nominative', 'genitive', 'dative', 'accusative', 'vocative'], language$1);
cases.addImporter(importerName$1)
    .map('nominative', cases.nominative)
    .map('genitive', cases.genitive)
    .map('dative', cases.dative)
    .map('accusative', cases.accusative)
    .map('vocative', cases.vocative);
const declensions = new FeatureType(Feature.types.declension, ['first', 'second', 'third'], language$1);
declensions.addImporter(importerName$1)
    .map('1st', declensions.first)
    .map('2nd', declensions.second)
    .map('3rd', declensions.third);
const genders = new FeatureType(Feature.types.gender, ['masculine', 'feminine', 'neuter'], language$1);
genders.addImporter(importerName$1)
    .map('masculine', genders.masculine)
    .map('feminine', genders.feminine)
    .map('neuter', genders.neuter)
    .map('masculine feminine', [genders.masculine, genders.feminine]);
const types$1 = new FeatureType(Feature.types.type, ['regular', 'irregular'], language$1);
types$1.addImporter(importerName$1)
    .map('regular', types$1.regular)
    .map('irregular', types$1.irregular);
/*
const conjugations = new Models.FeatureType(Lib.types.conjugation, ['first', 'second', 'third', 'fourth']);
conjugations.addImporter(importerName)
    .map('1st', conjugations.first)
    .map('2nd', conjugations.second)
    .map('3rd', conjugations.third)
    .map('4th', conjugations.fourth);
const tenses = new Models.FeatureType(Lib.types.tense, ['present', 'imperfect', 'future', 'perfect', 'pluperfect', 'future perfect']);
tenses.addImporter(importerName)
    .map('present', tenses.present)
    .map('imperfect', tenses.imperfect)
    .map('future', tenses.future)
    .map('perfect', tenses.perfect)
    .map('pluperfect', tenses.pluperfect)
    .map('future_perfect', tenses['future perfect']);
const voices = new Models.FeatureType(Lib.types.voice, ['passive', 'active'],language);
voices.addImporter(importerName)
    .map('passive', voices.passive)
    .map('active', voices.active);
const moods = new Models.FeatureType(Lib.types.mood, ['indicative', 'subjunctive']);
moods.addImporter(importerName)
    .map('indicative', moods.indicative)
    .map('subjunctive', moods.subjunctive);
const persons = new Models.FeatureType(Lib.types.person, ['first', 'second', 'third']);
persons.addImporter(importerName)
    .map('1st', persons.first)
    .map('2nd', persons.second)
    .map('3rd', persons.third); */
const footnotes$2 = new FeatureType(Feature.types.footnote, [], {});

// endregion Definition of grammatical features

// For noun and adjectives
dataSet$1.addSuffixes = function (partOfSpeech, data) {
  // Some suffix values will mean a lack of suffix, they will be mapped to a null
  let noSuffixValue = '-';

  // First row are headers
  for (let i = 1; i < data.length; i++) {
    let dataItem = data[i];
    let suffixValue = dataItem[0];
    // Handle special suffix values
    if (suffixValue === noSuffixValue) {
      suffixValue = null;
    }

    let primary = false;
    let features = [partOfSpeech,
      numbers.importer.csv.get(dataItem[1]),
      cases.importer.csv.get(dataItem[2]),
      declensions.importer.csv.get(dataItem[3]),
      genders.importer.csv.get(dataItem[4]),
      types$1.importer.csv.get(dataItem[5])];
    if (dataItem[6] === 'primary') {
      primary = true;
    }
    if (dataItem[7]) {
      // There can be multiple footnote indexes separated by spaces
      let indexes = dataItem[7].split(' ').map(function (index) {
        return footnotes$2.get(index)
      });
      features.push(...indexes);
    }
    let extendedGreekData = new ExtendedGreekData();
    extendedGreekData.primary = primary;
    let extendedLangData = {
      [languages.greek]: extendedGreekData
    };
    this.addSuffix(suffixValue, features, extendedLangData);
  }
};

// For verbs
dataSet$1.addVerbSuffixes = function (partOfSpeech, data) {
  // Some suffix values will mean a lack of suffix, they will be mapped to a null
  let noSuffixValue = '-';

  // First row are headers
  for (let i = 1; i < data.length; i++) {
    let suffix = data[i][0];
    // Handle special suffix values
    if (suffix === noSuffixValue) {
      suffix = null;
    }

    let features = [partOfSpeech
      /*
      conjugations.importer.csv.get(data[i][1]),
      voices.importer.csv.get(data[i][2]),
      moods.importer.csv.get(data[i][3]),
      tenses.importer.csv.get(data[i][4]),
      numbers.importer.csv.get(data[i][5]),
      persons.importer.csv.get(data[i][6]) */
    ];

    let grammarType = data[i][7];
    // Type information can be empty if no ending is provided
    if (grammarType) {
      features.push(types$1.importer.csv.get(grammarType));
    }
    // Footnotes
    if (data[i][8]) {
      // There can be multiple footnote indexes separated by spaces
      let indexes = data[i][8].split(' ').map(function (index) {
        return footnotes$2.get(index)
      });
      features.push(...indexes);
    }
    this.addSuffix(suffix, features);
  }
};

dataSet$1.addFootnotes = function (partOfSpeech, data) {
  // First row are headers
  for (let i = 1; i < data.length; i++) {
    this.addFootnote(partOfSpeech, data[i][0], data[i][1]);
  }
};

dataSet$1.loadData = function () {
  // Nouns
  let partOfSpeech = parts.noun;
  let suffixes = papaparse.parse(nounSuffixesCSV$1, {});
  this.addSuffixes(partOfSpeech, suffixes.data);
  let footnotes = papaparse.parse(nounFootnotesCSV$1, {});
  this.addFootnotes(partOfSpeech, footnotes.data);

  // Adjectives
  /* partOfSpeech = parts.adjective;
  suffixes = papaparse.parse(adjectiveSuffixesCSV, {});
  this.addSuffixes(partOfSpeech, suffixes.data);
  footnotes = papaparse.parse(adjectiveFootnotesCSV, {});
  this.addFootnotes(partOfSpeech, footnotes.data); */

  // Verbs
  /* partOfSpeech = parts.verb;
  suffixes = papaparse.parse(verbSuffixesCSV, {});
  this.addVerbSuffixes(partOfSpeech, suffixes.data);
  footnotes = papaparse.parse(verbFootnotesCSV, {});
  this.addFootnotes(partOfSpeech, footnotes.data); */
};

/**
 * Decides whether a suffix is a match to any of inflections, and if it is, what type of match it is.
 * @param {Inflection[]} inflections - An array of Inflection objects to be matched against a suffix.
 * @param {Suffix} suffix - A suffix to be matched with inflections.
 * @returns {Suffix | null} If a match is found, returns a Suffix object modified with some
 * additional information about a match. If no matches found, returns null.
 */
dataSet$1.matcher = function (inflections, suffix) {
  'use strict';
    // All of those features must match between an inflection and an ending
  let obligatoryMatches = [Feature.types.part];

    // Any of those features must match between an inflection and an ending
  let optionalMatches = [Feature.types.grmCase, Feature.types.declension, Feature.types.gender, Feature.types.number];
  let bestMatchData = null; // Information about the best match we would be able to find

  /*
   There can be only one full match between an inflection and a suffix (except when suffix has multiple values?)
   But there could be multiple partial matches. So we should try to find the best match possible and return it.
   A fullFeature match is when one of inflections has all grammatical features fully matching those of a suffix
   */
  for (let inflection of inflections) {
    let matchData = new MatchData(); // Create a match profile

    if (inflection.suffix === suffix.value) {
      matchData.suffixMatch = true;
    }

    // Check obligatory matches
    for (let feature of obligatoryMatches) {
      let featureMatch = suffix.featureMatch(feature, inflection[feature]);
      // matchFound = matchFound && featureMatch;

      if (!featureMatch) {
        // If an obligatory match is not found, there is no reason to check other items
        break
      }
      // Inflection's value of this feature is matching the one of the suffix
      matchData.matchedFeatures.push(feature);
    }

    if (matchData.matchedFeatures.length < obligatoryMatches.length) {
      // Not all obligatory matches are found, this is not a match
      break
    }

    // Check optional matches now
    for (let feature of optionalMatches) {
      let matchedValue = suffix.featureMatch(feature, inflection[feature]);
      if (matchedValue) {
        matchData.matchedFeatures.push(feature);
      }
    }

    if (matchData.suffixMatch && (matchData.matchedFeatures.length === obligatoryMatches.length + optionalMatches.length)) {
      // This is a full match
      matchData.fullMatch = true;

      // There can be only one full match, no need to search any further
      suffix.match = matchData;
      return suffix
    }
    bestMatchData = this.bestMatch(bestMatchData, matchData);
  }
  if (bestMatchData) {
    // There is some match found
    suffix.match = bestMatchData;
    return suffix
  }
  return null
};

/**
 * Decides whether matchA is 'better' (i.e. has more items matched) than matchB or not
 * @param {MatchData} matchA
 * @param {MatchData} matchB
 * @returns {MatchData} A best of two matches
 */
dataSet$1.bestMatch = function (matchA, matchB) {
  // If one of the arguments is not set, return the other one
  if (!matchA && matchB) {
    return matchB
  }

  if (!matchB && matchA) {
    return matchA
  }

  // Suffix match has a priority
  if (matchA.suffixMatch !== matchB.suffixMatch) {
    if (matchA.suffixMatch > matchB.suffixMatch) {
      return matchA
    } else {
      return matchB
    }
  }

  // If same on suffix matche, compare by how many features matched
  if (matchA.matchedFeatures.length >= matchB.matchedFeatures.length) {
    // Arbitrarily return matchA if matches are the same
    return matchA
  } else {
    return matchB
  }
};

class GreekView extends View {
  constructor () {
    super();
    this.language = languages.greek;

    /*
    Default grammatical features of a view. It child views need to have different feature values, redefine
    those values in child objects.
     */
    this.features = {
      numbers: new GroupFeatureType(numbers, 'Number'),
      cases: new GroupFeatureType(cases, 'Case'),
      declensions: new GroupFeatureType(declensions, 'Declension'),
      genders: new GroupFeatureType(genders, 'Gender'),
      types: new GroupFeatureType(types$1, 'Type')
    };
  }

  /**
   * Creates and initializes an inflection table. Redefine this method in child objects in order to create
   * an inflection table differently.
   */
  createTable () {
    this.table = new Table([this.features.declensions, this.features.genders,
      this.features.types, this.features.numbers, this.features.cases]);
    let features = this.table.features;
    features.columns = [declensions, genders, types$1];
    features.rows = [numbers, cases];
    features.columnRowTitles = [cases];
    features.fullWidthRowTitles = [numbers];
  }
}

class NounView$1 extends GreekView {
  constructor () {
    super();
    this.id = 'nounDeclension';
    this.name = 'noun declension';
    this.title = 'Noun declension';
    this.partOfSpeech = parts.noun.value;

    this.features.genders.getOrderedValues = function getOrderedValues (ancestorFeatures) {
      if (ancestorFeatures) {
        if (ancestorFeatures[0].value === declensions.second.value ||
          ancestorFeatures[0].value === declensions.third.value) {
          return [[genders.masculine.value, genders.feminine.value], genders.neuter.value]
        }
      }
      return [genders.masculine.value, genders.feminine.value, genders.neuter.value]
    };

    this.createTable();
  }
}

class NounViewSimplified extends NounView$1 {
  constructor () {
    super();
    this.id = 'nounDeclensionSimplified';
    this.name = 'noun declension simplified';
    this.title = 'Noun declension (simplified)';
    this.partOfSpeech = parts.noun.value;

    this.features.genders.getOrderedValues = function getOrderedValues (ancestorFeatures) {
      if (ancestorFeatures) {
        if (ancestorFeatures[0].value === declensions.second.value) {
          return [[genders.masculine.value, genders.feminine.value], genders.neuter.value]
        }
        if (ancestorFeatures[0].value === declensions.third.value) {
          return [[genders.masculine.value, genders.feminine.value, genders.neuter.value]]
        }
      }
      return [genders.masculine.value, genders.feminine.value, genders.neuter.value]
    };

    this.createTable();

    this.table.suffixCellFilter = NounViewSimplified.suffixCellFilter;
  }

  static suffixCellFilter (suffix) {
    return suffix.extendedLangData[languages.greek].primary
  }
}

var viewsGreek = [new NounView$1(), new NounViewSimplified()];

/**
 * This module is responsible for displaying different views of an inflection table. Each view is located in a separate
 * directory under /presenter/views/view-name
 */
class Presenter {
  constructor (viewContainer, viewSelectorContainer, localeSelectorContainer, wordData, locale = 'en-US') {
    this.viewContainer = viewContainer;
    this.viewSelectorContainer = viewSelectorContainer;
    this.localeSelectorContainer = localeSelectorContainer;
    this.wordData = wordData;

        // All views registered by the Presenter
    this.views = [];
    this.viewIndex = {};

    for (let view of viewsLatin) {
      this.addView(view);
    }
    for (let view of viewsGreek) {
      this.addView(view);
    }

        // Views available for parts of speech that are present in a Result Set
    this.availableViews = this.getViews(this.wordData);

    this.defaultView = this.availableViews[0];
    this.activeView = undefined;

    this.locale = locale; // This is a default locale
    this.l10n = new L10n(messages);

    return this
  }

  addView (view) {
       // let view =  new View.View(viewOptions);
    this.views.push(view);
    this.viewIndex[view.id] = view;
  }

  setLocale (locale) {
    this.locale = locale;
    this.activeView.render(this.viewContainer, this.wordData, this.l10n.messages(this.locale));
  }

  render () {
        // Show a default view
    if (this.defaultView) {
      this.defaultView.render(this.viewContainer, this.wordData, this.l10n.messages(this.locale));
      this.activeView = this.defaultView;

      this.appendViewSelector(this.viewSelectorContainer);
            // this.appendLocaleSelector(this.localeSelectorContainer);
    }
    return this
  }

  appendViewSelector (targetContainer) {
    targetContainer.innerHTML = '';
    if (this.availableViews.length > 1) {
      let id = 'view-selector-list';
      let viewLabel = document.createElement('label');
      viewLabel.setAttribute('for', id);
      viewLabel.innerHTML = 'View:&nbsp;';
      let viewList = document.createElement('select');
      viewList.classList.add('alpheios-ui-form-control');
      for (const view of this.availableViews) {
        let option = document.createElement('option');
        option.value = view.id;
        option.text = view.name;
        viewList.appendChild(option);
      }
      viewList.addEventListener('change', this.viewSelectorEventListener.bind(this));
      targetContainer.appendChild(viewLabel);
      targetContainer.appendChild(viewList);
    }
    return this
  }

  viewSelectorEventListener (event) {
    let viewID = event.target.value;
    let view = this.viewIndex[viewID];
    view.render(this.viewContainer, this.wordData, this.l10n.messages(this.locale));
    this.activeView = view;
  }

  appendLocaleSelector (targetContainer) {
    let id = 'locale-selector-list';
    targetContainer.innerHTML = ''; // Erase whatever was there
    let localeLabel = document.createElement('label');
    localeLabel.setAttribute('for', id);
    localeLabel.innerHTML = 'Locale:&nbsp;';
    let localeList = document.createElement('select');
    localeList.classList.add('alpheios-ui-form-control');
    localeList.id = id;
    for (let locale of this.l10n.locales) {
      let option = document.createElement('option');
      option.value = locale;
      option.text = locale;
      localeList.appendChild(option);
    }
    localeList.addEventListener('change', this.localeSelectorEventListener.bind(this));
    targetContainer.appendChild(localeLabel);
    targetContainer.appendChild(localeList);
    return this
  }

  localeSelectorEventListener () {
    let locale = window.event.target.value;
    this.setLocale(locale);
  }

  getViews (wordData) {
        // First view in a returned array will be a default one
    let views = [];
    for (let view of this.views) {
      if (wordData.language === view.language && wordData[Feature.types.part].includes(view.partOfSpeech)) {
        views.push(view);
      }
    }
    return views
  }
}

export { dataSet as LatinDataSet, dataSet$1 as GreekDataSet, languages, LanguageDataset, LanguageData, Suffix, Footnote, MatchData, ExtendedLanguageData, ExtendedGreekData, LexicalData, loadData, SelectedWord, Presenter };