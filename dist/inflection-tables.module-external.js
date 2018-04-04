import { Constants, Feature, FeatureImporter, GrmFeature, LanguageModelFactory, Lemma, FeatureType, FeatureList, GreekLanguageModel } from 'alpheios-data-models';
import IntlMessageFormat from 'intl-messageformat';

// import * as Models from 'alpheios-data-models'
// import InflectionItemsGroup from './inflection-items-group.js'
// import Suffix from './suffix'
// import Footnote from './footnote'

/**
 * A return value for inflection queries. Stores suffixes, forms and corresponding footnotes.
 * Inflection data is grouped first by a part of speech within a [Models.Feature.types.part] property object.
 * Inside that object, it is grouped by type: suffixes, or forms.
 */
class InflectionData {
  constructor (homonym) {
    this.homonym = homonym;
    this.pos = new Map();
  }

  addInflectionSet (infectionSet) {
    this.pos.set(infectionSet.partOfSpeech, infectionSet);
  }

  get targetWord () {
    if (this.homonym && this.homonym.targetWord) {
      return this.homonym.targetWord
    }
  }

  get languageID () {
    if (this.homonym) {
      return this.homonym.languageID
    }
  }

  get hasInflectionSets () {
    return this.pos.size > 0
  }

  /**
   * Returns a list of parts of speech that have any inflection data for them.
   * @return {string[]} Names of parts of speech, as strings, in an array.
   */
  get partsOfSpeech () {
    return Array.from(this.pos.keys())
  }

  /**
   * Returns either suffixes or forms of a given part of speech.
   * @param {string} partOfSpeech.
   * @param {string} inflectionType.
   * @return {Suffix[] | Form[]}
   */
  getMorphemes (partOfSpeech, inflectionType) {
    if (this.pos.has(partOfSpeech)) {
      let inflectionSet = this.pos.get(partOfSpeech);
      if (inflectionSet.types.has(inflectionType)) {
        return inflectionSet.types.get(inflectionType).types
      }
    }
    return []
  }

  /**
   * Returns footnotes for either suffixes or forms of a given part of speech.
   * @param {string} partOfSpeech.
   * @param {string} inflectionType.
   * @return {Map}
   */
  getFootnotesMap (partOfSpeech, inflectionType) {
    if (this.pos.has(partOfSpeech)) {
      let inflectionSet = this.pos.get(partOfSpeech);
      if (inflectionSet.types.has(inflectionType)) {
        return inflectionSet.types.get(inflectionType).footnotesMap
      }
    }
    return new Map()
  }

  /**
   * Retrieves all variants of feature values for a given part of speech.
   * @param partOfSpeech
   * @param featureName
   */
  /* getFeatureValues (partOfSpeech, featureName) {
    let values = []
    if (this.pos.has(partOfSpeech)) {
      for (const item of this[partOfSpeech].suffixes) {
        if (item.hasOwnProperty('features') && item.features.hasOwnProperty(featureName)) {
          let value = item.features[featureName]
          if (!values.includes(value)) {
            values.push(value)
          }
        }
      }
    }
    return values
  } */

  // Probably we won't need it any more
  /* static readObject (jsonObject) {
    // let homonym = Models.Homonym.readObject(jsonObject.homonym)

    let lexicalData = new InflectionData()
    lexicalData[Models.GrmFeature.types.part] = jsonObject[Models.Feature.types.part]

    for (let part of lexicalData[Models.Feature.types.part]) {
      let partData = jsonObject[part]
      lexicalData[part] = {}

      if (partData.suffixes) {
        lexicalData[part].suffixes = []
        for (let suffix of partData.suffixes) {
          lexicalData[part].suffixes.push(Suffix.readObject(suffix))
        }
      }

      if (partData.footnotes) {
        lexicalData[part].footnotes = []
        for (let footnote of partData.footnotes) {
          lexicalData[part].footnotes.push(Footnote.readObject(footnote))
        }
      }
    }

    return lexicalData
  } */
}

/**
 * Detailed information about a match type.
 */
class MatchData {
  constructor () {
    this.suffixMatch = false; // Whether two suffixes are the same.
    this.formMatch = false; // Whether two forms of the word are the same
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

  /* static readObject (jsonObject) {
    if (!jsonObject._type) {
      throw new Error('Extended language data has no type information. Unable to deserialize.')
    } else if (jsonObject._type === ExtendedLanguageData.types().EXTENDED_GREEK_DATA) {
      return ExtendedGreekData.readObject(jsonObject)
    } else {
      throw new Error(`Unsupported extended language data of type "${jsonObject._type}".`)
    }
  } */
}

function createCommonjsModule(fn, module) {
	return module = { exports: {} }, fn(module, module.exports), module.exports;
}

var rngBrowser = createCommonjsModule(function (module) {
// Unique ID creation requires a high quality random # generator.  In the
// browser this is a little complicated due to unknown quality of Math.random()
// and inconsistent support for the `crypto` API.  We do the best we can via
// feature-detection

// getRandomValues needs to be invoked in a context where "this" is a Crypto implementation.
var getRandomValues = (typeof(crypto) != 'undefined' && crypto.getRandomValues.bind(crypto)) ||
                      (typeof(msCrypto) != 'undefined' && msCrypto.getRandomValues.bind(msCrypto));
if (getRandomValues) {
  // WHATWG crypto RNG - http://wiki.whatwg.org/wiki/Crypto
  var rnds8 = new Uint8Array(16); // eslint-disable-line no-undef

  module.exports = function whatwgRNG() {
    getRandomValues(rnds8);
    return rnds8;
  };
} else {
  // Math.random()-based (RNG)
  //
  // If all else fails, use Math.random().  It's fast, but is of unspecified
  // quality.
  var rnds = new Array(16);

  module.exports = function mathRNG() {
    for (var i = 0, r; i < 16; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
    }

    return rnds;
  };
}
});

/**
 * Convert array of 16 byte values to UUID string format of the form:
 * XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX
 */
var byteToHex = [];
for (var i = 0; i < 256; ++i) {
  byteToHex[i] = (i + 0x100).toString(16).substr(1);
}

function bytesToUuid(buf, offset) {
  var i = offset || 0;
  var bth = byteToHex;
  return bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] + '-' +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]] +
          bth[buf[i++]] + bth[buf[i++]];
}

var bytesToUuid_1 = bytesToUuid;

function v4(options, buf, offset) {
  var i = buf && offset || 0;

  if (typeof(options) == 'string') {
    buf = options === 'binary' ? new Array(16) : null;
    options = null;
  }
  options = options || {};

  var rnds = options.random || (options.rng || rngBrowser)();

  // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
  rnds[6] = (rnds[6] & 0x0f) | 0x40;
  rnds[8] = (rnds[8] & 0x3f) | 0x80;

  // Copy bytes to buffer, if provided
  if (buf) {
    for (var ii = 0; ii < 16; ++ii) {
      buf[i + ii] = rnds[ii];
    }
  }

  return buf || bytesToUuid_1(rnds);
}

var v4_1 = v4;

/**
 * Suffix is an ending of a word with none or any grammatical features associated with it.
 * Features are stored in properties whose names are type of a grammatical feature (i.e. case, gender, etc.)
 * Each feature can have a single or multiple values associated with it (i.e. gender can be either 'masculine',
 * a single value, or 'masculine' and 'feminine'. That's why all values are stored in an array.
 */
class Morpheme {
  /**
   * Initializes a Suffix object.
   * @param {string | null} morphemeValue - A suffix text or null if suffix is empty.
   */
  constructor (morphemeValue) {
    if (morphemeValue === undefined) {
      throw new Error('Morpheme value should not be empty.')
    }
    this.id = v4_1();
    this.value = morphemeValue;
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

  static get ClassType () {
    return this
  }

  static readObject (jsonObject) {
    let suffix = new this.ClassType(jsonObject.value);

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

    if (jsonObject[GrmFeature.types.footnote]) {
      suffix[GrmFeature.types.footnote] = [];
      for (let footnote of jsonObject[GrmFeature.types.footnote]) {
        suffix[GrmFeature.types.footnote].push(footnote);
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
    let clone = new this.constructor.ClassType(this.value);
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

    if (this.hasOwnProperty(GrmFeature.types.footnote)) {
      clone[GrmFeature.types.footnote] = this[GrmFeature.types.footnote];
    }

    for (const lang in this.extendedLangData) {
      if (this.extendedLangData.hasOwnProperty(lang)) {
        clone.extendedLangData[lang] = this.extendedLangData[lang];
      }
    }
    return clone
  }

  /**
   * Checks if a morpheme has at least one common feature value with a `feature`.
   * @param {Feature} feature - A feature we need to match with the ones stored inside the morpheme object.
   * @returns {boolean} - True if a `feature` has at least one value in common with a morpheme, false otherwise.
   */
  featureMatch (feature) {
    const matchingValues = this.matchingValues(feature);
    return matchingValues.length > 0
  }

  /**
   * Returns a list of values that are the same between a morpheme and a feature (an intersection).
   * @param {Feature} feature
   * @return {string[]}
   */
  matchingValues (feature) {
    let matches = [];
    if (feature && this.features.hasOwnProperty(feature.type)) {
      const morphemeValue = this.features[feature.type];
      for (const featureValue of feature.values) {
        if (morphemeValue.values.includes(featureValue)) {
          matches.push(featureValue);
        }
      }
    }
    return matches
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
    let commonGroups = Morpheme.getCommonGroups([this, suffix]);
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
   * @param {GrmFeature[]} featureValues - Multiple grammatical feature values.
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
  }

  /**
   * Combines suffixes that are in the same group together. Suffixes to be combined must have their values listed
   * in an array stored as featureGroups[featureType] property.
   * @param {Suffix[]} suffixes - An array of suffixes to be combined.
   * @param {function} mergeFunction - A function that will merge two suffixes. By default it uses Suffix.merge,
   * but provides a way to supply a presentation specific functions. Please see Suffix.merge for more
   * information on function format.
   * @returns {Suffix[]} An array of suffixes with some items possibly combined together.
   */
  static combine (suffixes, mergeFunction = Morpheme.merge) {
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
    let commonGroups = Morpheme.getCommonGroups([suffixA, suffixB]);
    for (let type of commonGroups) {
      // Combine values using a comma separator. Can do anything else if we need to.
      suffixA.features[type] = suffixA.features[type] + ', ' + suffixB.features[type];
    }
    return suffixA
  }
}

class Suffix extends Morpheme {
}

class Form extends Morpheme {
}

class Footnote {
  constructor (index, text, partOfSpeech) {
    this.index = index;
    this.text = text;
    this[GrmFeature.types.part] = partOfSpeech;
  }

  static readObject (jsonObject) {
    this.index = jsonObject.index;
    this.text = jsonObject.text;
    this[GrmFeature.types.part] = jsonObject[GrmFeature.types.part];
    return new Footnote(jsonObject.index, jsonObject.text, jsonObject[GrmFeature.types.part])
  }
}

// import LanguageDataset from './language-dataset.js'
// import Form from './form.js'
// import Suffix from './suffix.js'

class Inflections {
  constructor (type) {
    this.type = type;
    this.items = []; // Suffixes or forms
    this.footnotesMap = new Map(); // Footnotes (if any)
  }

  /**
   * Adds an individual item to the `items` array.
   * @param {Object} item
   */
  addItem (item) {
    if (!item) {
      throw new Error(`Inflection item cannot be empty`)
    }
    this.items.push(item);
  }

  /**
   * Adds suffix of form items
   * @param {Suffix[] | Form[]} items
   */
  addItems (items) {
    if (!items) {
      throw new Error(`Inflection items cannot be empty`)
    }
    if (!Array.isArray(items)) {
      throw new Error(`Inflection items must be in an array`)
    }
    if (items.length === 0) {
      throw new Error(`Inflection items array must not be empty`)
    }
    this.items.push(...items);
  }

  /**
   * Adds a singe footnote object
   * @param {string} index - A footnote index
   * @param {Footnote} footnote - A footnote object
   */
  addFootnote (index, footnote) {
    this.footnotesMap.set(index, footnote);
  }

  /**
   * Returns an array of items that `matches` an inflection. A match is determined as a result of item's `match`
   * function. Returned value is determined by item's `match` function as well.
   * @param {Inflection} inflection - An inflection to match against.
   * @return {Object[]} An array of objects. Each object is returned by a `match` function of an individual item.
   * Its format is dependent on the `match` function implementation.
   */
  getMatches (inflection) {
    let results = [];
    for (const item of this.items) {
      let result = item.matches(inflection);
      if (result) { results.push(result); }
    }
    return results
  }

  /**
   * Returns a sorted (as numbers) array of footnote indexes that are used by items within an `items` array
   * @return {number[]}
   */
  get footnotesInUse () {
    let set = new Set();
    // Scan all selected suffixes to build a unique set of footnote indexes
    for (const item of this.items) {
      if (item.hasOwnProperty(Feature.types.footnote)) {
        // Footnote indexes are stored in an array
        for (let index of item[Feature.types.footnote]) {
          set.add(index);
        }
      }
    }
    return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b))
  }
}

class ParadigmRule {
  constructor (matchOrder, features, lemma, morphFlags) {
    this.matchOrder = matchOrder;
    this.features = features;
    this.lemma = lemma;
    this.morphFlags = morphFlags;
  }
}

class Paradigm {
  constructor (languageID, partOfSpeech, table) {
    this.id = v4_1();
    this.languageID = languageID;
    this.partOfSpeech = partOfSpeech;
    this.title = table.title;
    this.table = table.table;
    this.subTables = table.subTables;
    this.rules = [];
  }

  static get ClassType () {
    return this
  }

  addRule (matchOrder, features, lemma, morphFlags) {
    this.rules.push(new ParadigmRule(matchOrder, features, lemma, morphFlags));
  }

  sortRules () {
    this.rules.sort((a, b) => b.matchOrder - a.matchOrder);
  }

  /**
   * Checks wither an inflection matches any single rules within a `rules` array. Rules within a Paradigm
   * are sorted according to the match order, highest first. This is an order an array of rules will be iterated by.
   * In order for rule to be a match, an inflection should have all features with values equal to those
   * listed within a rule.
   * If rule is a match, an object with a paradigm and a rule that matched is returned.
   * @param {Inflection} inflection.
   * @return {Object | undefined} An object with a paradigm and a matching rule if there is a match
   * or false otherwise.
   */
  matches (inflection) {
    for (const rule of this.rules) {
      let match = true;
      for (const feature of rule.features) {
        if (!inflection.hasOwnProperty(feature.type) || feature.value !== inflection[feature.type].value) {
          match = false;
        }
      }
      return match ? {paradigm: this, rule: rule} : undefined
    }
  }
}

/**
 * Stores inflections of different types {such as `Suffix`, `Form`, or `Paradigm`} in a `types` map. Items are grouped by type.
 */
class InflectionSet {
  constructor (partOfSpeech) {
    this.partOfSpeech = partOfSpeech;
    this.types = new Map();
  }

  /**
   * Checks if an `InflectionSet` has any types stored. If it does not, it means that an `InflectionSet` is empty.
   * @return {boolean}
   */
  get hasTypes () {
    return this.types.size !== 0
  }

  /**
   * Return a list of item types this set contains.
   * @return {Function<Object>[]}
   */
  get inflectionTypes () {
    return Array.from(this.types.keys())
  }

  /**
   * Adds a single inflection item to the set
   * @param {Suffix | Form | Paradigm} inflection
   */
  addInflectionItem (inflection) {
    this.addInflectionItems([inflection]);
  }

  /**
   * Adds an array of inflection items of the same type.
   * @param {Suffix[] | Form[] | Paradigm[]} inflections
   */
  addInflectionItems (inflections) {
    let classType = inflections[0].constructor.ClassType;
    if (!this.types.has(classType)) {
      this.types.set(classType, new Inflections(classType));
    }
    this.types.get(classType).addItems(inflections);
  }

  /**
   * Adds an `Inflections` group of certain type.
   * @param {Inflections} inflectionsObject
   */
  addInflectionsObject (inflectionsObject) {
    if (!inflectionsObject) {
      throw new Error(`Inflection items object must not be empty`)
    }
    if (!(inflectionsObject instanceof Inflections)) {
      throw new Error(`Inflection items object must be of InflectionItems type`)
    }
    const type = inflectionsObject.type;
    if (!type) {
      throw new Error(`Inflection items must have a valid type`)
    }

    this.types.set(type, inflectionsObject);
  }

  addFootnote (classType, index, footnote) {
    if (!this.types.has(classType)) {
      this.types.set(classType, new Inflections(classType));
    }
    this.types.get(classType).addFootnote(index, footnote);
  }

  getMatchingParadigms (inflection) {
    console.log(`Matching paradigms`);
    if (this.types.has(Paradigm)) {
      const paradigms = this.types.get(Paradigm);
      return paradigms.getMatches(inflection).map(o => o.paradigm)
    }
    return []
  }
}

/**
 * Stores inflection language data
 */
class LanguageDataset {
  /**
   * Initializes a LanguageDataset.
   * @param {symbol} languageID - A language ID of a data set.
   */
  constructor (languageID) {
    if (!languageID) {
      // Language is not supported
      throw new Error('Language ID cannot be empty.')
    }

    this.languageID = languageID;
    this.dataLoaded = false;
    this.model = LanguageModelFactory.getLanguageModel(languageID);
    this.pos = new Map();
    this.footnotes = []; // Footnotes
  }

  /**
   * Each grammatical feature can be either a single or an array of GrmFeature objects. The latter is the case when
   * an ending can belong to several grammatical features at once (i.e. belong to both 'masculine' and
   * 'feminine' genders.
   *
   * @param {string} partOfSpeech - A part of speech this inflection belongs to.
   * @param {Function} ClassType - either Suffix, Form, or Paradigm
   * @param {string | null} itemValue - A text of an item. It is either a string or null if there is no suffix.
   * @param {Feature[]} features.
   * @param {ExtendedLanguageData} extendedLangData
   */
  addInflection (partOfSpeech, ClassType, itemValue, features, extendedLangData = undefined) {
    let item = new ClassType(itemValue);
    item.extendedLangData = extendedLangData;

    // Go through all features provided
    for (let feature of features) {
      // If this is a footnote. Footnotes should go in a flat array
      // because we don't need to split by them
      if (feature.type === GrmFeature.types.footnote) {
        item[GrmFeature.types.footnote] = item[GrmFeature.types.footnote] || [];
        item[GrmFeature.types.footnote].push(feature.value);
      } else {
        item.features[feature.type] = feature;
      }
    }

    if (!this.pos.has(partOfSpeech)) {
      this.pos.set(partOfSpeech, new InflectionSet(partOfSpeech));
    }
    this.pos.get(partOfSpeech).addInflectionItem(item);
  }

  addParadigms (partOfSpeech, paradigms) {
    if (!this.pos.has(partOfSpeech.value)) {
      this.pos.set(partOfSpeech.value, new InflectionSet(partOfSpeech.value));
    }
    this.pos.get(partOfSpeech.value).addInflectionItems(paradigms);
  }

  /**
   * Stores a footnote item.
   * @param {string} partOfSpeech - A part of speech this footnote belongs to
   * @param {Function} classType - A class constructor of either a Suffix or a Form
   * @param {number} index - A footnote's index.
   * @param {string} text - A footnote's text.
   */
  addFootnote (partOfSpeech, classType, index, text) {
    if (!index) {
      throw new Error('Footnote index data should not be empty.')
    }

    if (!text) {
      throw new Error('Footnote text data should not be empty.')
    }

    let footnote = new Footnote(index, text, partOfSpeech);

    // this.footnotes.push(footnote)

    if (!this.pos.has(partOfSpeech)) {
      this.pos.set(partOfSpeech, new InflectionSet(partOfSpeech));
    }
    this.pos.get(partOfSpeech).addFootnote(classType, index, footnote);
  }

  /**
   * Checks for obligatory matches between an inflection and an item.
   * @param {Inflection} inflection - An inflection object.
   * @param {Morpheme} item - An inflection data item: a Suffix, a Form, or a Paradigm
   * @return {Object} A results in the following format:
   *   {Feature[]} matchedItems - Features that matched (if any)
   *   {boolean} matchResult - True if all obligatory matches are fulfilled, false otherwise.
   */
  static getObligatoryMatches (inflection, item) {
    return this.checkMatches(this.getObligatoryMatchList(inflection), inflection, item)
  }

  /**
   * Checks for optional matches between an inflection and an item.
   * @param {Inflection} inflection - An inflection object.
   * @param {Morpheme} item - An inflection data item: a Suffix, a Form, or a Paradigm
   * @return {Object} A results in the following format:
   *   {Feature[]} matchedItems - Features that matched (if any)
   *   {boolean} matchResult - True if all obligatory matches are fulfilled, false otherwise.
   */
  static getOptionalMatches (inflection, item) {
    return this.checkMatches(this.getOptionalMatchList(inflection), inflection, item)
  }

  static checkMatches (matchList, inflection, item) {
    let matches = matchList.reduce((acc, f) => {
      if (inflection.hasOwnProperty(f) && item.featureMatch(inflection[f])) {
        acc.push(f);
      }
      return acc
    }, []);
    let result = (matches.length === matchList.length);
    return { fullMatch: result, matchedItems: matches }
  }

  /**
   * Sets inflection grammar properties based on inflection data
   * @param {Inflection} inflection - An inflection data object
   * @return {Inflection} A modified inflection data object
   */
  /* setInflectionConstraints (inflection) {
    inflection.constraints.optionalMatches = this.constructor.getOptionalMatches(inflection)
    return inflection
  } */

  getInflectionData (homonym) {
    // Add support for languages
    let result = new InflectionData(homonym);
    let inflections = {};

    for (let lexeme of homonym.lexemes) {
      for (let inflection of lexeme.inflections) {
        let partOfSpeech = inflection[GrmFeature.types.part];
        if (!partOfSpeech) {
          throw new Error('Part of speech data is missing in an inflection')
        }
        /* if (!Array.isArray(partOfSpeech)) {
          throw new Error('Part of speech data should be in an array format')
        }
        if (partOfSpeech.length === 0 && partOfSpeech.length > 1) {
          throw new Error('Part of speech data should be an array with exactly one element')
        }
        partOfSpeech = partOfSpeech[0].value */
        if (!partOfSpeech.isSingle) {
          throw new Error('Part of speech data should have only one value')
        }
        partOfSpeech = partOfSpeech.value;

        if (inflection.constraints.pronounClassRequired) {
          /*
          A `class` grammatical feature is an obligatory match for Greek pronouns. Class, however, is not present in
          the Inflection object at the time we receive it from a morphological analyzer because a morphological analyzer
          does not provide such data. To fix this, for pronouns we need to figure out what the `class` feature value is
          by finding an exact pronoun form match in inflection data and obtaining a corresponding `class` value.
          The value found will then be attached to an Inflection object.
           */
          // Get a class this inflection belongs to
          let grmClasses = this.model.getPronounClasses(this.pos.get(partOfSpeech).types.get(Form).items, inflection.form);
          if (!grmClasses) {
            console.warn(`Cannot determine a grammar class for a ${inflection.form} pronoun. 
              Table construction will probably fail`);
          } else {
            // One or more values found
            inflection[GrmFeature.types.grmClass] = grmClasses;
          }
        }

        // add the lemma to the inflection
        inflection[Feature.types.word] = new Feature(Feature.types.word, lexeme.lemma.word, lexeme.lemma.languageID);

        // Group inflections by a part of speech
        if (!inflections.hasOwnProperty(partOfSpeech)) {
          inflections[partOfSpeech] = [];
        }
        inflections[partOfSpeech].push(inflection);
      }
    }

    // Scan for matches for all parts of speech separately
    for (const partOfSpeech in inflections) {
      let inflectionSet = new InflectionSet(partOfSpeech);
      if (inflections.hasOwnProperty(partOfSpeech)) {
        let inflectionsGroup = inflections[partOfSpeech];
        let sourceSet = this.pos.get(partOfSpeech);
        if (!sourceSet) {
          // There is no source data for this part of speech
          console.warn(`There is no source data for the following part of speech: ${partOfSpeech}`);
          continue
        }

        let paradigms = [];
        let paradigmIDs = [];
        let paradigmBased = false;

        /*
        There might be cases when we don't know beforehand if an inflection is form based.
        In this case, if `fullFormBased` constraint not set, we'll try to find matching forms within a source data.
        If any found, `fullFormBased` constraint will be set to true.
         */
        for (let inflection of inflectionsGroup) {
          let matchingParadigms = sourceSet.getMatchingParadigms(inflection);
          if (matchingParadigms.length > 0) {
            // Make sure all paradigms are unique
            for (const paradigm of matchingParadigms) {
              if (!paradigmIDs.includes(paradigm.id)) {
                paradigms.push(paradigm);
                paradigmIDs.push(paradigm.id);
              }
            }
            inflection.constraints.paradigmBased = true;
            paradigmBased = true;
          }

          if (!inflection.constraints.suffixBased && !paradigmBased) {
            inflection.constraints.fullFormBased = this.hasMatchingForms(partOfSpeech, inflection);
          }

          if (!inflection.constraints.fullFormBased && !paradigmBased) {
            // If it is not full form based, then probably it is suffix base
            inflection.constraints.suffixBased = true;
          }
        }
        if (paradigmBased) {
          inflectionSet.addInflectionItems(paradigms);
        }

        // If at least one inflection in a group has a constraint, we'll search for data based on that criteria
        let suffixBased = (inflectionsGroup.find(i => i.constraints.suffixBased) !== undefined);
        let formBased = (inflectionsGroup.find(i => i.constraints.fullFormBased) !== undefined);

        // Check for suffix matches
        if (suffixBased) {
          if (sourceSet.types.has(Suffix)) {
            let items = sourceSet.types.get(Suffix).items.reduce(this['reducer'].bind(this, inflectionsGroup), []);
            if (items.length > 0) {
              inflectionSet.addInflectionItems(items);
            }
          }
        }

        // If there is at least on full form based inflection, search for full form items
        if (formBased) {
          let items = sourceSet.types.get(Form).items.reduce(this['reducer'].bind(this, inflectionsGroup), []);
          if (items.length > 0) {
            inflectionSet.addInflectionItems(items);
          }
        }

        if (inflectionSet.hasTypes) {
          for (const inflectionType of inflectionSet.inflectionTypes) {
            let footnotesSource = sourceSet.types.get(inflectionType).footnotesMap;
            const footnotesInUse = inflectionSet.types.get(inflectionType).footnotesInUse;
            for (let footnote of footnotesSource.values()) {
              if (footnotesInUse.includes(footnote.index)) {
                inflectionSet.addFootnote(inflectionType, footnote.index, footnote);
              }
            }
          }
          result.addInflectionSet(inflectionSet);
        }
      }
    }

    return result
  }

  hasMatchingForms (partOfSpeech, inflection) {
    if (this.pos.has(partOfSpeech)) {
      let inflectionSet = this.pos.get(partOfSpeech);
      if (inflectionSet.types.has(Form)) {
        return inflectionSet.types.get(Form).items.find(item => this.matcher([inflection], item)) !== undefined
      }
    }
    return false
  }

  reducer (inflections, accumulator, item) {
    let result = this.matcher(inflections, item);
    if (result) {
      accumulator.push(result);
    }
    return accumulator
  }

  /**
   * Decides whether a suffix is a match to any of inflections, and if it is, what type of match it is.
   * @param {Inflection[]} inflections - an array of inflection objects to be matched against a suffix.
   * @param {Suffix} item - a suffix to be matched with inflections.
   * @returns {Suffix | null} if a match is found, returns a suffix object modified with some
   * additional information about a match. if no matches found, returns null.
   */
  matcher (inflections, item) {
    // Any of those features must match between an inflection and an ending
    let bestMatchData = null; // information about the best match we would be able to find

    /*
     There can be only one full match between an inflection and a suffix (except when suffix has multiple values?)
     But there could be multiple partial matches. So we should try to find the best match possible and return it.
     a fullFeature match is when one of inflections has all grammatical features fully matching those of a suffix
     */
    for (let inflection of inflections) {
      let matchData = new MatchData(); // Create a match profile
      matchData.suffixMatch = inflection.compareWithWord(item.value);

      // Check for obligatory matches
      const obligatoryMatches = this.constructor.getObligatoryMatches(inflection, item);
      if (obligatoryMatches.fullMatch) {
        matchData.matchedFeatures.push(...obligatoryMatches.matchedItems);
      } else {
        // If obligatory features do not match, there is no reason to check other items
        break
      }

      // Check for optional matches
      const optionalMatches = this.constructor.getOptionalMatches(inflection, item);
      matchData.matchedFeatures.push(...optionalMatches.matchedItems);

      if (matchData.suffixMatch && obligatoryMatches.fullMatch && optionalMatches.fullMatch) {
        // This is a full match
        matchData.fullMatch = true;

        // There can be only one full match, no need to search any further
        item.match = matchData;
        return item
      }
      bestMatchData = this.bestMatch(bestMatchData, matchData);
    }
    if (bestMatchData) {
      // There is some match found
      item.match = bestMatchData;
      return item
    }
    return null
  }

  /**
   * Decides whether matchA is 'better' (i.e. has more items matched) than matchB or not
   * @param {MatchData} matchA
   * @param {MatchData} matchB
   * @returns {MatchData} A best of two matches
   */
  bestMatch (matchA, matchB) {
    // If one of the arguments is not set, return the other one
    if (!matchA && matchB) {
      return matchB
    }

    if (!matchB && matchA) {
      return matchA
    }

    // item match has a priority
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
  }
}

var nounSuffixesCSV = "Ending,Number,Case,Declension,Gender,Type,Footnote\na,singular,nominative,1st,feminine,regular,\nē,singular,nominative,1st,feminine,irregular,\nēs,singular,nominative,1st,feminine,irregular,\nā,singular,nominative,1st,feminine,irregular,7\nus,singular,nominative,2nd,masculine feminine,regular,\ner,singular,nominative,2nd,masculine feminine,regular,\nir,singular,nominative,2nd,masculine feminine,regular,\n-,singular,nominative,2nd,masculine feminine,irregular,\nos,singular,nominative,2nd,masculine feminine,irregular,1\nōs,singular,nominative,2nd,masculine feminine,irregular,\nō,singular,nominative,2nd,masculine feminine,irregular,7\num,singular,nominative,2nd,neuter,regular,\nus,singular,nominative,2nd,neuter,irregular,10\non,singular,nominative,2nd,neuter,irregular,7\n-,singular,nominative,3rd,masculine feminine,regular,\nos,singular,nominative,3rd,masculine feminine,irregular,\nōn,singular,nominative,3rd,masculine feminine,irregular,7\n-,singular,nominative,3rd,neuter,regular,\nus,singular,nominative,4th,masculine feminine,regular,\nū,singular,nominative,4th,neuter,regular,\nēs,singular,nominative,5th,feminine,regular,\nae,singular,genitive,1st,feminine,regular,\nāī,singular,genitive,1st,feminine,irregular,1\nās,singular,genitive,1st,feminine,irregular,2\nēs,singular,genitive,1st,feminine,irregular,7\nī,singular,genitive,2nd,masculine feminine,regular,\nō,singular,genitive,2nd,masculine feminine,irregular,7\nī,singular,genitive,2nd,neuter,regular,\nis,singular,genitive,3rd,masculine feminine,regular,\nis,singular,genitive,3rd,neuter,regular,\nūs,singular,genitive,4th,masculine feminine,regular,\nuis,singular,genitive,4th,masculine feminine,irregular,1\nuos,singular,genitive,4th,masculine feminine,irregular,1\nī,singular,genitive,4th,masculine feminine,irregular,15\nūs,singular,genitive,4th,neuter,regular,\nēī,singular,genitive,5th,feminine,regular,\neī,singular,genitive,5th,feminine,regular,\nī,singular,genitive,5th,feminine,irregular,\nē,singular,genitive,5th,feminine,irregular,\nēs,singular,genitive,5th,feminine,irregular,6\nae,singular,dative,1st,feminine,regular,\nāī,singular,dative,1st,feminine,irregular,1\nō,singular,dative,2nd,masculine feminine,regular,\nō,singular,dative,2nd,neuter,regular,\nī,singular,dative,3rd,masculine feminine,regular,\ne,singular,dative,3rd,masculine feminine,irregular,17\nī,singular,dative,3rd,neuter,regular,\nūī,singular,dative,4th,masculine feminine,regular,\nū,singular,dative,4th,masculine feminine,regular,\nū,singular,dative,4th,neuter,regular,\nēī,singular,dative,5th,feminine,regular,\neī,singular,dative,5th,feminine,regular,\nī,singular,dative,5th,feminine,irregular,\nē,singular,dative,5th,feminine,irregular,6\nam,singular,accusative,1st,feminine,regular,\nēn,singular,accusative,1st,feminine,irregular,\nān,singular,accusative,1st,feminine,irregular,7\num,singular,accusative,2nd,masculine feminine,regular,\nom,singular,accusative,2nd,masculine feminine,irregular,1\nōn,singular,accusative,2nd,masculine feminine,irregular,7\num,singular,accusative,2nd,neuter,regular,\nus,singular,accusative,2nd,neuter,irregular,10\non,singular,accusative,2nd,neuter,irregular,7\nem,singular,accusative,3rd,masculine feminine,regular,\nim,singular,accusative,3rd,masculine feminine,irregular,11\na,singular,accusative,3rd,masculine feminine,irregular,7\n-,singular,accusative,3rd,neuter,regular,\num,singular,accusative,4th,masculine feminine,regular,\nū,singular,accusative,4th,neuter,regular,\nem,singular,accusative,5th,feminine,regular,\nā,singular,ablative,1st,feminine,regular,\nād,singular,ablative,1st,feminine,irregular,5\nē,singular,ablative,1st,feminine,irregular,7\nō,singular,ablative,2nd,masculine feminine,regular,\nōd,singular,ablative,2nd,masculine feminine,irregular,1\nō,singular,ablative,2nd,neuter,regular,\ne,singular,ablative,3rd,masculine feminine,regular,\nī,singular,ablative,3rd,masculine feminine,irregular,11\ne,singular,ablative,3rd,neuter,regular,\nī,singular,ablative,3rd,neuter,irregular,11\nū,singular,ablative,4th,masculine feminine,regular,\nūd,singular,ablative,4th,masculine feminine,irregular,1\nū,singular,ablative,4th,neuter,regular,\nē,singular,ablative,5th,feminine,regular,\nae,singular,locative,1st,feminine,regular,\nō,singular,locative,2nd,masculine feminine,regular,\nō,singular,locative,2nd,neuter,regular,\ne,singular,locative,3rd,masculine feminine,regular,\nī,singular,locative,3rd,masculine feminine,regular,\nī,singular,locative,3rd,neuter,regular,\nū,singular,locative,4th,masculine feminine,regular,\nū,singular,locative,4th,neuter,regular,\nē,singular,locative,5th,feminine,regular,\na,singular,vocative,1st,feminine,regular,\nē,singular,vocative,1st,feminine,irregular,\nā,singular,vocative,1st,feminine,irregular,7\ne,singular,vocative,2nd,masculine feminine,regular,\ner,singular,vocative,2nd,masculine feminine,regular,\nir,singular,vocative,2nd,masculine feminine,regular,\n-,singular,vocative,2nd,masculine feminine,irregular,\nī,singular,vocative,2nd,masculine feminine,irregular,8\nōs,singular,vocative,2nd,masculine feminine,irregular,\ne,singular,vocative,2nd,masculine feminine,irregular,7\num,singular,vocative,2nd,neuter,regular,\non,singular,vocative,2nd,neuter,irregular,7\n-,singular,vocative,3rd,masculine feminine,regular,\n-,singular,vocative,3rd,neuter,regular,\nus,singular,vocative,4th,masculine feminine,regular,\nū,singular,vocative,4th,neuter,regular,\nēs,singular,vocative,5th,feminine,regular,\nae,plural,nominative,1st,feminine,regular,\nī,plural,nominative,2nd,masculine feminine,regular,\noe,plural,nominative,2nd,masculine feminine,irregular,7 9\na,plural,nominative,2nd,neuter,regular,\nēs,plural,nominative,3rd,masculine feminine,regular,\nes,plural,nominative,3rd,masculine feminine,irregular,7\na,plural,nominative,3rd,neuter,regular,\nia,plural,nominative,3rd,neuter,irregular,11\nūs,plural,nominative,4th,masculine feminine,regular,\nua,plural,nominative,4th,neuter,regular,\nēs,plural,nominative,5th,feminine,regular,\nārum,plural,genitive,1st,feminine,regular,\num,plural,genitive,1st,feminine,irregular,3\nōrum,plural,genitive,2nd,masculine feminine,regular,\num,plural,genitive,2nd,masculine feminine,irregular,\nom,plural,genitive,2nd,masculine feminine,irregular,8\nōrum,plural,genitive,2nd,neuter,regular,\num,plural,genitive,2nd,neuter,irregular,\num,plural,genitive,3rd,masculine feminine,regular,\nium,plural,genitive,3rd,masculine feminine,irregular,11\nōn,plural,genitive,3rd,masculine feminine,irregular,7\num,plural,genitive,3rd,neuter,regular,\nium,plural,genitive,3rd,neuter,irregular,11\nuum,plural,genitive,4th,masculine feminine,regular,\num,plural,genitive,4th,masculine feminine,irregular,16\nuom,plural,genitive,4th,masculine feminine,irregular,1\nuum,plural,genitive,4th,neuter,regular,\nērum,plural,genitive,5th,feminine,regular,\nīs,plural,dative,1st,feminine,regular,\nābus,plural,dative,1st,feminine,irregular,4\neis,plural,dative,1st,feminine,irregular,6\nīs,plural,dative,2nd,masculine feminine,regular,\nīs,plural,dative,2nd,neuter,regular,\nibus,plural,dative,3rd,masculine feminine,regular,\nibus,plural,dative,3rd,neuter,regular,\nibus,plural,dative,4th,masculine feminine,regular,\nubus,plural,dative,4th,masculine feminine,irregular,14\nibus,plural,dative,4th,neuter,regular,\nēbus,plural,dative,5th,feminine,regular,\nās,plural,accusative,1st,feminine,regular,\nōs,plural,accusative,2nd,masculine feminine,regular,\na,plural,accusative,2nd,neuter,regular,\nēs,plural,accusative,3rd,masculine feminine,regular,\nīs,plural,accusative,3rd,masculine feminine,irregular,11\nas,plural,accusative,3rd,masculine feminine,irregular,7\na,plural,accusative,3rd,neuter,regular,\nia,plural,accusative,3rd,neuter,irregular,11\nūs,plural,accusative,4th,masculine feminine,regular,\nua,plural,accusative,4th,neuter,regular,\nēs,plural,accusative,5th,feminine,regular,\nīs,plural,ablative,1st,feminine,regular,\nābus,plural,ablative,1st,feminine,irregular,4\neis,plural,ablative,1st,feminine,irregular,6\nīs,plural,ablative,2nd,masculine feminine,regular,\nīs,plural,ablative,2nd,neuter,regular,\nibus,plural,ablative,3rd,masculine feminine,regular,\nibus,plural,ablative,3rd,neuter,regular,\nibus,plural,ablative,4th,masculine feminine,regular,\nubus,plural,ablative,4th,masculine feminine,irregular,14\nibus,plural,ablative,4th,neuter,regular,\nēbus,plural,ablative,5th,feminine,regular,\nīs,plural,locative,1st,feminine,regular,\nīs,plural,locative,2nd,masculine feminine,regular,\nīs,plural,locative,2nd,neuter,regular,\nibus,plural,locative,3rd,masculine feminine,regular,\nibus,plural,locative,3rd,neuter,regular,\nibus,plural,locative,4th,masculine feminine,regular,\nibus,plural,locative,4th,neuter,regular,\nēbus,plural,locative,5th,feminine,regular,\nae,plural,vocative,1st,feminine,regular,\nī,plural,vocative,2nd,masculine feminine,regular,\na,plural,vocative,2nd,neuter,regular,\nēs,plural,vocative,3rd,masculine feminine,regular,\na,plural,vocative,3rd,neuter,regular,\nia,plural,vocative,3rd,neuter,irregular,11\nūs,plural,vocative,4th,masculine feminine,regular,\nua,plural,vocative,4th,neuter,regular,\nēs,plural,vocative,5th,feminine,regular,";

var nounFootnotesCSV = "Index,Text\n1,archaic (final s and m of os and om may be omitted in inscriptions)\n2,only in familiās\n3,especially in Greek patronymics and compounds in -gena and -cola.\n4,always in deābus and filiābus; rarely with other words to distinguish the female\n5,archaic\n6,rare\n7,\"may occur in words of Greek origin. The forms of many Greek nouns vary among the first, second and third declensions.\"\n8,proper names in ius and filius and genius\n9,poetic\n10,\"only pelagus, vīrus, and sometimes vulgus\"\n11,may occur with i-stems\n12,several nouns (most commonly domus) show forms of both second and fourth declensions\n13,\"some nouns also have forms from the first declension (eg materia, saevitia) or the third declension (eg requiēs, satiēs, plēbēs, famēs)\"\n14,\"Always in partus and tribus, usually in artus and lacus, sometimes in other words, eg portus and specus\"\n15,Often in names of plants and trees and in nouns ending in -tus\n16,When pronounced as one syllable\n17,early\n18,dies and meridies are masculine";

var pronounFormsCSV = "Form Set,Headwords,Class,Person,Number,Case,Type,Form,Footnote\n1,,personal,1st,singular,nominative,regular,ego,\n1,,personal,1st,singular,genitive,regular,meI,\n1,,personal,1st,singular,genitive,irregular,mIs,1\n1,,personal,1st,singular,dative,regular,mihi,\n1,,personal,1st,singular,dative,irregular,mI,\n1,,personal,1st,singular,accusative,regular,mE,\n1,,personal,1st,singular,accusative,irregular,mEmE,\n1,,personal,1st,singular,ablative,regular,mE,\n1,,personal,1st,singular,ablative,irregular,mEmE,\n1,,personal,1st,singular,vocative,,,\n1,,personal,2nd,singular,nominative,regular,tU,\n1,,personal,2nd,singular,genitive,regular,tuI,\n1,,personal,2nd,singular,genitive,irregular,tIs,1\n1,,personal,2nd,singular,dative,regular,tibi,\n1,,personal,2nd,singular,accusative,regular,tE,\n1,,personal,2nd,singular,accusative,irregular,tEtE,\n1,,personal,2nd,singular,ablative,regular,tE,\n1,,personal,2nd,singular,ablative,irregular,tEtE,\n1,,personal,2nd,singular,vocative,regular,tU,\n1,,personal,1st,plural,nominative,regular,nOs,\n1,,personal,1st,plural,genitive,regular,nostrum,\n1,,personal,1st,plural,dative,regular,nObIs,\n1,,personal,1st,plural,accusative,regular,nOs,\n1,,personal,1st,plural,ablative,regular,nObIs,\n1,,personal,1st,plural,vocative,,,\n1,,personal,2nd,plural,nominative,regular,vOs,\n1,,personal,2nd,plural,genitive,regular,vestrum,\n1,,personal,2nd,plural,genitive,regular,vestrI,\n1,,personal,2nd,plural,genitive,irregular,vostrum,\n1,,personal,2nd,plural,genitive,irregular,vostrI,\n1,,personal,2nd,plural,dative,regular,vObIs,\n1,,personal,2nd,plural,accusative,regular,vOs,\n1,,personal,2nd,plural,ablative,regular,vObIs,\n1,,personal,2nd,plural,vocative,regular,vOs,\n2,,reflexive,3rd,singular,nominative,,,\n2,,reflexive,3rd,singular,genitive,regular,suI,\n2,,reflexive,3rd,singular,dative,regular,sibi,\n2,,reflexive,3rd,singular,accusative,regular,sE,\n2,,reflexive,3rd,singular,accusative,irregular,sEsE,\n2,,reflexive,3rd,singular,ablative,regular,sE,\n2,,reflexive,3rd,singular,ablative,irregular,sEsE,\n2,,reflexive,3rd,singular,vocative,,,\n2,,reflexive,3rd,plural,nominative,,,\n2,,reflexive,3rd,plural,genitive,regular,suI,\n2,,reflexive,3rd,plural,dative,regular,sibi,\n2,,reflexive,3rd,plural,accusative,regular,sE,\n2,,reflexive,3rd,plural,accusative,irregular,sEsE,\n2,,reflexive,3rd,plural,ablative,regular,sE,\n2,,reflexive,3rd,plural,ablative,irregular,sEsE,\n2,,reflexive,3rd,plural,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,nominative,regular,meus,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,genitive,regular,meI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,dative,regular,meO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,accusative,regular,meum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,ablative,regular,meO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,vocative,regular,mI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,vocative,irregular,meus,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,nominative,regular,mea,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,genitive,regular,meae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,dative,regular,meae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,accusative,regular,meam,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,ablative,regular,meA,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,vocative,regular,mea,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,nominative,regular,meum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,genitive,regular,meI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,dative,regular,meO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,accusative,regular,meum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,ablative,regular,meO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,singular,vocative,regular,meum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,nominative,regular,tuus,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,genitive,regular,tuI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,dative,regular,tuO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,accusative,regular,tuum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,ablative,regular,tuO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,nominative,regular,tua,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,genitive,regular,tuae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,dative,regular,tuae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,accusative,regular,tuam,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,ablative,regular,tuA,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,nominative,regular,tuum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,genitive,regular,tuI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,dative,regular,tuO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,accusative,regular,tuum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,ablative,regular,tuO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,singular,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,nominative,regular,suus,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,genitive,regular,suI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,dative,regular,suO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,accusative,regular,suum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,ablative,regular,suO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,nominative,regular,sua,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,genitive,regular,suae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,dative,regular,suae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,accusative,regular,suam,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,ablative,regular,suA,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,nominative,regular,suum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,genitive,regular,suI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,dative,regular,suO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,accusative,regular,suum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,ablative,regular,suO,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,singular,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,nominative,regular,meI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,genitive,regular,meOrum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,dative,regular,meIs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,accusative,regular,meOs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,ablative,regular,meIs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,vocative,regular,meI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,nominative,regular,meae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,genitive,regular,meArum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,dative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,accusative,regular,meAs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,ablative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,vocative,regular,meae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,nominative,regular,mea,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,genitive,regular,meOrum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,dative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,accusative,regular,mea,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,ablative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,1st,plural,vocative,regular,mea,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,nominative,regular,tuI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,genitive,regular,tuOrum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,dative,regular,tuIs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,accusative,regular,tuOs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,ablative,regular,tuIs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,nominative,regular,tuae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,genitive,regular,tuArum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,dative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,accusative,regular,tuAs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,ablative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,nominative,regular,tua,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,genitive,regular,tuOrum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,dative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,accusative,regular,tua,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,ablative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,2nd,plural,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,nominative,regular,suI,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,genitive,regular,suOrum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,dative,regular,suIs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,accusative,regular,suOs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,ablative,regular,suIs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,nominative,regular,suae,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,genitive,regular,suArum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,dative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,accusative,regular,suAs,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,ablative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,vocative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,nominative,regular,sua,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,genitive,regular,suOrum,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,dative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,accusative,regular,sua,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,ablative,,,\n3,\"meus,mea,meum;tuus,tua,tuum;suus,sua,suum\",possessive,3rd,plural,vocative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,nominative,regular,noster,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,genitive,regular,nostrI,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,dative,regular,nostrO,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,accusative,regular,nostrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,ablative,regular,nostrO,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,vocative,regular,noster,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,nominative,regular,nostra,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,genitive,regular,nostrae,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,dative,regular,nostrae,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,accusative,regular,nostram,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,ablative,regular,nostrA,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,vocative,regular,nostra,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,nominative,regular,nostrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,genitive,regular,nostrI,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,dative,regular,nostrO,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,accusative,regular,nostrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,ablative,regular,nostrO,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,singular,vocative,regular,nostrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,nominative,regular,vester,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,genitive,regular,vestrI,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,dative,regular,vestrO,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,accusative,regular,vestrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,ablative,regular,vestrO,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,vocative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,nominative,regular,vestra,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,genitive,regular,vestrae,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,dative,regular,vestrae,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,accusative,regular,vestram,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,ablative,regular,vestrA,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,vocative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,nominative,regular,vestum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,genitive,regular,vestrI,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,dative,regular,vestrO,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,accusative,regular,vestrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,ablative,regular,vestrO,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,singular,vocative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,nominative,regular,nostrI,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,genitive,regular,nostrOrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,dative,regular,nostrIs,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,accusative,regular,nostrOs,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,ablative,regular,nostrIs,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,vocative,regular,nostrI,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,nominative,regular,nostrae,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,genitive,regular,nostrArum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,dative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,accusative,regular,nostrAs,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,ablative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,vocative,regular,nostrae,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,nominative,regular,nostra,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,genitive,regular,nostrOrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,dative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,accusative,regular,nostra,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,ablative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,1st,plural,vocative,regular,nostra,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,nominative,regular,vestrI,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,genitive,regular,vestrOrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,dative,regular,vestrIs,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,accusative,regular,vestrOs,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,ablative,regular,vestrIs,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,vocative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,nominative,regular,vestrae,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,genitive,regular,vestrArum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,dative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,accusative,regular,vestrAs,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,ablative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,,vocative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,nominative,regular,vestra,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,genitive,regular,vestrOrum,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,dative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,accusative,regular,vestra,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,ablative,,,\n4,\"noster,nostra,nostrum;vester,vestra,vestrum\",possessive,2nd,plural,vocative,,,\n5,\"is,ea,id\",demonstrative,,singular,nominative,regular,is,\n5,\"is,ea,id\",demonstrative,,singular,genitive,regular,eius,\n5,\"is,ea,id\",demonstrative,,singular,dative,regular,eI,\n5,\"is,ea,id\",demonstrative,,singular,accusative,regular,eum,\n5,\"is,ea,id\",demonstrative,,singular,ablative,regular,eO,\n5,\"is,ea,id\",demonstrative,,singular,nominative,regular,ea,\n5,\"is,ea,id\",demonstrative,,singular,genitive,,,\n5,\"is,ea,id\",demonstrative,,singular,dative,,,\n5,\"is,ea,id\",demonstrative,,singular,accusative,regular,eam,\n5,\"is,ea,id\",demonstrative,,singular,ablative,regular,eA,\n5,\"is,ea,id\",demonstrative,,singular,nominative,regular,id,\n5,\"is,ea,id\",demonstrative,,singular,genitive,,,\n5,\"is,ea,id\",demonstrative,,singular,dative,,,\n5,\"is,ea,id\",demonstrative,,singular,accusative,regular,id,\n5,\"is,ea,id\",demonstrative,,singular,ablative,regular,eO,\n5,\"is,ea,id\",demonstrative,,plural,nominative,regular,eI,\n5,\"is,ea,id\",demonstrative,,plural,nominative,irregular,iI,\n5,\"is,ea,id\",demonstrative,,plural,nominative,irregular,I,\n5,\"is,ea,id\",demonstrative,,plural,genitive,regular,eOrum,\n5,\"is,ea,id\",demonstrative,,plural,dative,regular,eIs,\n5,\"is,ea,id\",demonstrative,,plural,dative,irregular,iIs,\n5,\"is,ea,id\",demonstrative,,plural,dative,irregular,Is,\n5,\"is,ea,id\",demonstrative,,plural,accusative,regular,eOs,\n5,\"is,ea,id\",demonstrative,,plural,ablative,regular,eIs,\n5,\"is,ea,id\",demonstrative,,plural,ablative,irregular,iIs,\n5,\"is,ea,id\",demonstrative,,plural,ablative,irregular,Is,\n5,\"is,ea,id\",demonstrative,,plural,nominative,regular,eae,\n5,\"is,ea,id\",demonstrative,,plural,genitive,regular,eArum,\n5,\"is,ea,id\",demonstrative,,plural,dative,,,\n5,\"is,ea,id\",demonstrative,,plural,accusative,regular,eAs,\n5,\"is,ea,id\",demonstrative,,plural,ablative,,,\n5,\"is,ea,id\",demonstrative,,plural,nominative,regular,ea,\n5,\"is,ea,id\",demonstrative,,plural,genitive,regular,eOrum,\n5,\"is,ea,id\",demonstrative,,plural,dative,,,\n5,\"is,ea,id\",demonstrative,,plural,accusative,regular,ea,\n5,\"is,ea,id\",demonstrative,,plural,ablative,,,\n6,\"ille,illa,illud\",demonstrative,,singular,nominative,regular,ille,\n6,\"ille,illa,illud\",demonstrative,,singular,genitive,regular,illIus,\n6,\"ille,illa,illud\",demonstrative,,singular,dative,regular,illI,\n6,\"ille,illa,illud\",demonstrative,,singular,accusative,regular,illum,\n6,\"ille,illa,illud\",demonstrative,,singular,ablative,regular,illO,\n6,\"ille,illa,illud\",demonstrative,,singular,nominative,regular,illa,\n6,\"ille,illa,illud\",demonstrative,,singular,genitive,,,\n6,\"ille,illa,illud\",demonstrative,,singular,dative,,,\n6,\"ille,illa,illud\",demonstrative,,singular,accusative,regular,illam,\n6,\"ille,illa,illud\",demonstrative,,singular,ablative,regular,illA,\n6,\"ille,illa,illud\",demonstrative,,singular,nominative,regular,illud,\n6,\"ille,illa,illud\",demonstrative,,singular,genitive,,,\n6,\"ille,illa,illud\",demonstrative,,singular,dative,,,\n6,\"ille,illa,illud\",demonstrative,,singular,accusative,regular,illud,\n6,\"ille,illa,illud\",demonstrative,,singular,ablative,regular,illO,\n6,\"ille,illa,illud\",demonstrative,,plural,nominative,regular,illI,\n6,\"ille,illa,illud\",demonstrative,,plural,genitive,regular,illOrum,\n6,\"ille,illa,illud\",demonstrative,,plural,dative,regular,illIs,\n6,\"ille,illa,illud\",demonstrative,,plural,accusative,regular,illOs,\n6,\"ille,illa,illud\",demonstrative,,plural,ablative,regular,illIs,\n6,\"ille,illa,illud\",demonstrative,,plural,nominative,regular,illae,\n6,\"ille,illa,illud\",demonstrative,,plural,genitive,regular,illArum,\n6,\"ille,illa,illud\",demonstrative,,plural,dative,,,\n6,\"ille,illa,illud\",demonstrative,,plural,accusative,regular,illAs,\n6,\"ille,illa,illud\",demonstrative,,plural,ablative,,,\n6,\"ille,illa,illud\",demonstrative,,plural,nominative,regular,Illa,\n6,\"ille,illa,illud\",demonstrative,,plural,genitive,regular,illOrum,\n6,\"ille,illa,illud\",demonstrative,,plural,dative,,,\n6,\"ille,illa,illud\",demonstrative,,plural,accusative,regular,illa,\n6,\"ille,illa,illud\",demonstrative,,plural,ablative,,,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,nominative,regular,ipse,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,genitive,regular,ipsIus,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,dative,regular,ipsI,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,accusative,regular,ipsum,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,ablative,regular,ipsO,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,nominative,regular,ipsa,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,genitive,,,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,dative,,,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,accusative,regular,ipsam,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,ablative,regular,ipsA,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,nominative,regular,ipsum,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,genitive,,,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,dative,,,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,accusative,regular,ipsum,\n7,\"ipse,ipsa,ipsum\",demonstrative,,singular,ablative,regular,ipsO,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,nominative,regular,ipsI,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,genitive,regular,ipsOrum,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,dative,regular,ipsIs,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,accusative,regular,ipsOs,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,ablative,regular,ipsIs,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,nominative,regular,ipsae,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,genitive,regular,ipsArum,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,dative,,,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,accusative,regular,ipsAs,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,ablative,,,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,nominative,regular,ipsa,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,genitive,regular,ipsOrum,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,dative,,,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,accusative,regular,ipsa,\n7,\"ipse,ipsa,ipsum\",demonstrative,,plural,ablative,,,\n8,\"iste,ista,istud\",demonstrative,,singular,nominative,regular,iste,\n8,\"iste,ista,istud\",demonstrative,,singular,genitive,regular,istIus,\n8,\"iste,ista,istud\",demonstrative,,singular,dative,regular,istI,\n8,\"iste,ista,istud\",demonstrative,,singular,accusative,regular,istum,\n8,\"iste,ista,istud\",demonstrative,,singular,ablative,regular,istO,\n8,\"iste,ista,istud\",demonstrative,,singular,nominative,regular,ista,\n8,\"iste,ista,istud\",demonstrative,,singular,genitive,,,\n8,\"iste,ista,istud\",demonstrative,,singular,dative,,,\n8,\"iste,ista,istud\",demonstrative,,singular,accusative,regular,istam,\n8,\"iste,ista,istud\",demonstrative,,singular,ablative,regular,istA,\n8,\"iste,ista,istud\",demonstrative,,singular,nominative,regular,istud,\n8,\"iste,ista,istud\",demonstrative,,singular,genitive,,,\n8,\"iste,ista,istud\",demonstrative,,singular,dative,,,\n8,\"iste,ista,istud\",demonstrative,,singular,accusative,regular,istud,\n8,\"iste,ista,istud\",demonstrative,,singular,ablative,regular,istO,\n8,\"iste,ista,istud\",demonstrative,,plural,nominative,regular,istI,\n8,\"iste,ista,istud\",demonstrative,,plural,genitive,regular,istOrum,\n8,\"iste,ista,istud\",demonstrative,,plural,dative,regular,istIs,\n8,\"iste,ista,istud\",demonstrative,,plural,accusative,regular,istOs,\n8,\"iste,ista,istud\",demonstrative,,plural,ablative,regular,istIs,\n8,\"iste,ista,istud\",demonstrative,,plural,nominative,regular,istae,\n8,\"iste,ista,istud\",demonstrative,,plural,genitive,regular,istArum,\n8,\"iste,ista,istud\",demonstrative,,plural,dative,,,\n8,\"iste,ista,istud\",demonstrative,,plural,accusative,regular,istAs,\n8,\"iste,ista,istud\",demonstrative,,plural,ablative,,,\n8,\"iste,ista,istud\",demonstrative,,plural,nominative,regular,ista,\n8,\"iste,ista,istud\",demonstrative,,plural,genitive,regular,istOrum,\n8,\"iste,ista,istud\",demonstrative,,plural,dative,,,\n8,\"iste,ista,istud\",demonstrative,,plural,accusative,regular,ista,\n8,\"iste,ista,istud\",demonstrative,,plural,ablative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,nominative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,genitive,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,dative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,accusative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,ablative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,vocative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,nominative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,genitive,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,dative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,accusative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,ablative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,nominative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,genitive,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,dative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,accusative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,ablative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,singular,vocative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,nominative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,genitive,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,dative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,accusative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,ablative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,vocative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,nominative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,genitive,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,dative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,accusative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,ablative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,vocative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,nominative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,genitive,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,dative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,accusative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,ablative,,,\n9,\"is,id,ea;Idem,eadem,idem;ille,illa,illud;ipse,ipsa,ipsum;iste,ista,istud\",demonstrative,,plural,vocative,,,\n10,\"hIc,haec,hOc\",demonstrative,,singular,nominative,regular,hIc,\n10,\"hIc,haec,hOc\",demonstrative,,singular,genitive,regular,huius,\n10,\"hIc,haec,hOc\",demonstrative,,singular,dative,regular,huic,\n10,\"hIc,haec,hOc\",demonstrative,,singular,accusative,regular,hunc,\n10,\"hIc,haec,hOc\",demonstrative,,singular,ablative,regular,hOc,\n10,\"hIc,haec,hOc\",demonstrative,,singular,vocative,regular,,\n10,\"hIc,haec,hOc\",demonstrative,,singular,nominative,regular,haec,\n10,\"hIc,haec,hOc\",demonstrative,,singular,genitive,,,\n10,\"hIc,haec,hOc\",demonstrative,,singular,dative,,,\n10,\"hIc,haec,hOc\",demonstrative,,singular,accusative,regular,hanc,\n10,\"hIc,haec,hOc\",demonstrative,,singular,ablative,regular,hAc,\n10,\"hIc,haec,hOc\",demonstrative,,singular,vocative,regular,,\n10,\"hIc,haec,hOc\",demonstrative,,singular,nominative,regular,hOc,\n10,\"hIc,haec,hOc\",demonstrative,,singular,genitive,,,\n10,\"hIc,haec,hOc\",demonstrative,,singular,dative,,,\n10,\"hIc,haec,hOc\",demonstrative,,singular,accusative,regular,hOc,\n10,\"hIc,haec,hOc\",demonstrative,,singular,ablative,regular,hOc,\n10,\"hIc,haec,hOc\",demonstrative,,singular,vocative,regular,,\n10,\"hIc,haec,hOc\",demonstrative,,plural,nominative,regular,hI,\n10,\"hIc,haec,hOc\",demonstrative,,plural,genitive,regular,hOrum,\n10,\"hIc,haec,hOc\",demonstrative,,plural,dative,regular,hIs,\n10,\"hIc,haec,hOc\",demonstrative,,plural,accusative,regular,hOs,\n10,\"hIc,haec,hOc\",demonstrative,,plural,ablative,regular,hIs,\n10,\"hIc,haec,hOc\",demonstrative,,plural,vocative,regular,,\n10,\"hIc,haec,hOc\",demonstrative,,plural,nominative,regular,hae,\n10,\"hIc,haec,hOc\",demonstrative,,plural,genitive,regular,hArum,\n10,\"hIc,haec,hOc\",demonstrative,,plural,dative,,,\n10,\"hIc,haec,hOc\",demonstrative,,plural,accusative,regular,hAs,\n10,\"hIc,haec,hOc\",demonstrative,,plural,ablative,,,\n10,\"hIc,haec,hOc\",demonstrative,,plural,vocative,regular,,\n10,\"hIc,haec,hOc\",demonstrative,,plural,nominative,regular,haec,\n10,\"hIc,haec,hOc\",demonstrative,,plural,genitive,regular,hOrum,\n10,\"hIc,haec,hOc\",demonstrative,,plural,dative,,,\n10,\"hIc,haec,hOc\",demonstrative,,plural,accusative,regular,haec,\n10,\"hIc,haec,hOc\",demonstrative,,plural,ablative,,,\n10,\"hIc,haec,hOc\",demonstrative,,plural,vocative,regular,,\n11,,relative,,singular,nominative,regular,quI,\n11,,relative,,singular,genitive,regular,cuius,\n11,,relative,,singular,genitive,irregular,quoius,3\n11,,relative,,singular,dative,regular,cui,\n11,,relative,,singular,dative,irregular,quoius,3\n11,,relative,,singular,accusative,regular,quem,\n11,,relative,,singular,ablative,regular,quO,\n11,,relative,,singular,vocative,regular,,\n11,,relative,,singular,nominative,regular,qua,\n11,,relative,,singular,nominative,irregular,quae,\n11,,relative,,singular,genitive,,,\n11,,relative,,singular,dative,,,\n11,,relative,,singular,accusative,regular,quam,\n11,,relative,,singular,ablative,regular,quA,\n11,,relative,,singular,vocative,regular,,\n11,,relative,,singular,nominative,regular,quod,\n11,,relative,,singular,genitive,,,\n11,,relative,,singular,dative,,,\n11,,relative,,singular,accusative,regular,quod,\n11,,relative,,singular,ablative,regular,quO,\n11,,relative,,singular,vocative,regular,,\n11,,relative,,plural,nominative,regular,quI,\n11,,relative,,plural,nominative,regular,quEs,3\n11,,relative,,plural,genitive,regular,quOrum,\n11,,relative,,plural,dative,regular,quibus,\n11,,relative,,plural,dative,irregular,quIs,\n11,,relative,,plural,accusative,regular,quOs,\n11,,relative,,plural,ablative,regular,quibus,\n11,,relative,,plural,ablative,irregular,quIs,\n11,,relative,,plural,vocative,regular,,\n11,,relative,,plural,nominative,regular,quae,\n11,,relative,,plural,genitive,regular,quArum,\n11,,relative,,plural,dative,,,\n11,,relative,,plural,accusative,regular,quAs,\n11,,relative,,plural,ablative,,,\n11,,relative,,plural,vocative,regular,,\n11,,relative,,plural,nominative,regular,quae,\n11,,relative,,plural,genitive,regular,quorum,\n11,,relative,,plural,dative,,,\n11,,relative,,plural,accusative,regular,quae,\n11,,relative,,plural,ablative,,,\n11,,relative,,plural,vocative,regular,,\n12,,interrogative,,singular,nominative,regular,quis,\n12,,interrogative,,singular,genitive,regular,cuius,\n12,,interrogative,,singular,dative,regular,cui,\n12,,interrogative,,singular,accusative,regular,quem,\n12,,interrogative,,singular,ablative,regular,quO,\n12,,interrogative,,singular,vocative,regular,,\n12,,interrogative,,singular,nominative,regular,quis,\n12,,interrogative,,singular,genitive,regular,cuius,\n12,,interrogative,,singular,dative,regular,cui,\n12,,interrogative,,singular,accusative,regular,quem,\n12,,interrogative,,singular,ablative,regular,quO,\n12,,interrogative,,singular,vocative,regular,,\n12,,interrogative,,singular,nominative,regular,quid,\n12,,interrogative,,singular,genitive,,,\n12,,interrogative,,singular,dative,,,\n12,,interrogative,,singular,accusative,regular,quid,\n12,,interrogative,,singular,ablative,regular,quO,\n12,,interrogative,,singular,vocative,regular,,\n12,,interrogative,,plural,nominative,regular,quI,\n12,,interrogative,,plural,nominative,regular,quEs,3\n12,,interrogative,,plural,genitive,regular,quOrum,\n12,,interrogative,,plural,dative,regular,quibus,\n12,,interrogative,,plural,dative,irregular,quIs,\n12,,interrogative,,plural,accusative,regular,quOs,\n12,,interrogative,,plural,ablative,regular,quibus,\n12,,interrogative,,plural,ablative,irregular,quIs,\n12,,interrogative,,plural,vocative,regular,,\n12,,interrogative,,plural,nominative,regular,quae,\n12,,interrogative,,plural,genitive,regular,quArum,\n12,,interrogative,,plural,dative,,,\n12,,interrogative,,plural,accusative,regular,quAs,\n12,,interrogative,,plural,ablative,,,\n12,,interrogative,,plural,vocative,regular,,\n12,,interrogative,,plural,nominative,regular,quae,\n12,,interrogative,,plural,genitive,regular,quorum,\n12,,interrogative,,plural,dative,,,\n12,,interrogative,,plural,accusative,regular,quae,\n12,,interrogative,,plural,ablative,,,\n12,,interrogative,,plural,vocative,regular,,";

var pronounFootnotesCSV = "Index,Text\n1,\"tU is made emphatic by adding on the endings –te, –temet or –timet. \n            The other forms of the personal pronoun (with the exception of the genitive plural) \n            are made emphatic by the addition of –met to the original form. Early emphatic forms include mEpte and tEpte.\"\n2,Enclitics –ce or –c are sometimes added to forms of hic. Common examples include huiusce and hIsce.\n3,Earlier forms.\n4,The plural forms of the Interrogatives are the same as the plural forms of the Relative.";

var adjectiveSuffixesCSV = "Ending,Number,Case,Declension,Gender,Type,Footnote\na,singular,nominative,1st 2nd,feminine,regular,\nus,singular,nominative,1st 2nd,masculine,regular,\num,singular,nominative,1st 2nd,neuter,regular,\nis,singular,nominative,3rd,feminine,regular,\n-,singular,nominative,3rd,feminine,irregular,6\n-,singular,nominative,3rd,masculine,regular,\nis,singular,nominative,3rd,masculine,irregular,5\ne,singular,nominative,3rd,neuter,regular,\n-,singular,nominative,3rd,neuter,irregular,6\nae,singular,genitive,1st 2nd,feminine,regular,\nīus,singular,genitive,1st 2nd,feminine,irregular,3\nī,singular,genitive,1st 2nd,masculine,regular,\nīus,singular,genitive,1st 2nd,masculine,irregular,3\nī,singular,genitive,1st 2nd,neuter,regular,\nīus,singular,genitive,1st 2nd,neuter,irregular,3\nis,singular,genitive,3rd,feminine,regular,\nis,singular,genitive,3rd,masculine,regular,\nis,singular,genitive,3rd,neuter,regular,\nae,singular,dative,1st 2nd,feminine,regular,\nī,singular,dative,1st 2nd,feminine,irregular,3\nō,singular,dative,1st 2nd,masculine,regular,\nī,singular,dative,1st 2nd,masculine,irregular,3\nō,singular,dative,1st 2nd,neuter,regular,\nī,singular,dative,1st 2nd,neuter,irregular,3\nī,singular,dative,3rd,feminine,regular,\nī,singular,dative,3rd,masculine,regular,\nī,singular,dative,3rd,neuter,regular,\nam,singular,accusative,1st 2nd,feminine,regular,\num,singular,accusative,1st 2nd,masculine,regular,\num,singular,accusative,1st 2nd,neuter,regular,\nem,singular,accusative,3rd,feminine,regular,\nem,singular,accusative,3rd,masculine,regular,\ne,singular,accusative,3rd,neuter,regular,\n-,singular,accusative,3rd,neuter,irregular,6\nā,singular,ablative,1st 2nd,feminine,regular,\nō,singular,ablative,1st 2nd,feminine,irregular,4\nō,singular,ablative,1st 2nd,masculine,regular,\nō,singular,ablative,1st 2nd,neuter,regular,\nī,singular,ablative,3rd,feminine,regular,\ne,singular,ablative,3rd,feminine,irregular,7\nī,singular,ablative,3rd,masculine,regular,\ne,singular,ablative,3rd,masculine,irregular,7\nī,singular,ablative,3rd,neuter,regular,\nae,singular,locative,1st 2nd,feminine,regular,\nī,singular,locative,1st 2nd,masculine,regular,\nī,singular,locative,1st 2nd,neuter,regular,\nī,singular,locative,3rd,feminine,regular,\ne,singular,locative,3rd,feminine,irregular,7\nī,singular,locative,3rd,masculine,regular,\nī,singular,locative,3rd,neuter,regular,\na,singular,vocative,1st 2nd,feminine,regular,\ne,singular,vocative,1st 2nd,masculine,regular,\nī,singular,vocative,1st 2nd,masculine,irregular,\num,singular,vocative,1st 2nd,neuter,regular,\nis,singular,vocative,3rd,feminine,regular,\n-,singular,vocative,3rd,masculine,regular,\ne,singular,vocative,3rd,neuter,regular,\n-,singular,vocative,3rd,neuter,irregular,6\nae,plural,nominative,1st 2nd,feminine,regular,\nī,plural,nominative,1st 2nd,masculine,regular,\na,plural,nominative,1st 2nd,neuter,regular,\nēs,plural,nominative,3rd,feminine,regular,\nēs,plural,nominative,3rd,masculine,regular,\nia,plural,nominative,3rd,neuter,regular,\nārum,plural,genitive,1st 2nd,feminine,regular,\nōrum,plural,genitive,1st 2nd,masculine,regular,\nōrum,plural,genitive,1st 2nd,neuter,regular,\nium,plural,genitive,3rd,feminine,regular,\num,plural,genitive,3rd,feminine,irregular,8\nium,plural,genitive,3rd,masculine,regular,\num,plural,genitive,3rd,masculine,irregular,8\nium,plural,genitive,3rd,neuter,regular,\num,plural,genitive,3rd,neuter,irregular,8\nīs,plural,dative,1st 2nd,feminine,regular,\nīs,plural,dative,1st 2nd,masculine,regular,\nīs,plural,dative,1st 2nd,neuter,regular,\nibus,plural,dative,3rd,feminine,regular,\nibus,plural,dative,3rd,masculine,regular,\nibus,plural,dative,3rd,neuter,regular,\nās,plural,accusative,1st 2nd,feminine,regular,\nōs,plural,accusative,1st 2nd,masculine,regular,\na,plural,accusative,1st 2nd,neuter,regular,\nīs,plural,accusative,3rd,feminine,regular,\nēs,plural,accusative,3rd,feminine,irregular,9\nīs,plural,accusative,3rd,masculine,regular,\nēs,plural,accusative,3rd,masculine,irregular,9\nia,plural,accusative,3rd,neuter,regular,\nīs,plural,ablative,1st 2nd,feminine,regular,\nīs,plural,ablative,1st 2nd,masculine,regular,\nīs,plural,ablative,1st 2nd,neuter,regular,\nibus,plural,ablative,3rd,feminine,regular,\nibus,plural,ablative,3rd,masculine,regular,\nibus,plural,ablative,3rd,neuter,regular,\nīs,plural,locative,1st 2nd,feminine,regular,\nīs,plural,locative,1st 2nd,masculine,regular,\nīs,plural,locative,1st 2nd,neuter,regular,\nibus,plural,locative,3rd,feminine,regular,\nibus,plural,locative,3rd,masculine,regular,\nibus,plural,locative,3rd,neuter,regular,\nae,plural,vocative,1st 2nd,feminine,regular,\nī,plural,vocative,1st 2nd,masculine,regular,\na,plural,vocative,1st 2nd,neuter,regular,\nēs,plural,vocative,3rd,feminine,regular,\nēs,plural,vocative,3rd,masculine,regular,\nia,plural,vocative,3rd,neuter,regular,";

var adjectiveFootnotesCSV = "Index,Text\n1,\"Adjectives agree with the noun they modify in gender, number and case.\"\n2,Adjectives are inflected according to either\n3,\"Only nullus, sōlus, alius (alia, aliud), tōtus, ūllus, ūnus, alter, neuter (neutra,\n            neutrum) and uter (utra, utrum).\"\n4,In a few adjectives of Greek origin.\n5,\"The \"\"two-ending\"\" adjectives use \"\"-is\"\", for both masculine and feminine nominative\n            singular.\"\n6,\"The \"\"one-ending\"\" adjectives use the same consonant ending for all three genders in the\n            nominative singular and the neuter accusative and vocative singular.\"\n7,\"An ablative singular in \"\"e\"\" is common in one-ending adjectives, but is usually confined to\n            poetry in three and two-ending adjectives.\"\n8,\"In comparatives, poetry and some one-ending adjectives.\"\n9,Chiefly in comparatives.";

var verbSuffixesCSV = "Ending,Conjugation,Voice,Mood,Tense,Number,Person,Case,Type,Footnote\r\nō,1st,active,indicative,present,singular,1st,,regular,\r\nās,1st,active,indicative,present,singular,2nd,,regular,\r\nat,1st,active,indicative,present,singular,3rd,,regular,\r\nāmus,1st,active,indicative,present,plural,1st,,regular,\r\nātis,1st,active,indicative,present,plural,2nd,,regular,\r\nant,1st,active,indicative,present,plural,3rd,,regular,\r\nem,1st,active,subjunctive,present,singular,1st,,regular,\r\nēs,1st,active,subjunctive,present,singular,2nd,,regular,\r\net,1st,active,subjunctive,present,singular,3rd,,regular,\r\nēmus,1st,active,subjunctive,present,plural,1st,,regular,\r\nētis,1st,active,subjunctive,present,plural,2nd,,regular,\r\nent,1st,active,subjunctive,present,plural,3rd,,regular,\r\neō,2nd,active,indicative,present,singular,1st,,regular,\r\nēs,2nd,active,indicative,present,singular,2nd,,regular,\r\nēt,2nd,active,indicative,present,singular,3rd,,regular,\r\nēmus,2nd,active,indicative,present,plural,1st,,regular,\r\nētis,2nd,active,indicative,present,plural,2nd,,regular,\r\nent,2nd,active,indicative,present,plural,3rd,,regular,\r\neam,2nd,active,subjunctive,present,singular,1st,,regular,\r\neās,2nd,active,subjunctive,present,singular,2nd,,regular,\r\neat,2nd,active,subjunctive,present,singular,3rd,,regular,\r\neāmus,2nd,active,subjunctive,present,plural,1st,,regular,\r\neātis,2nd,active,subjunctive,present,plural,2nd,,regular,\r\neant,2nd,active,subjunctive,present,plural,3rd,,regular,\r\nō,3rd,active,indicative,present,singular,1st,,regular,\r\nis,3rd,active,indicative,present,singular,2nd,,regular,\r\nit,3rd,active,indicative,present,singular,3rd,,regular,\r\nimus,3rd,active,indicative,present,plural,1st,,regular,\r\nitis,3rd,active,indicative,present,plural,2nd,,regular,\r\nunt,3rd,active,indicative,present,plural,3rd,,regular,\r\nam,3rd,active,subjunctive,present,singular,1st,,regular,\r\nās,3rd,active,subjunctive,present,singular,2nd,,regular,\r\nat,3rd,active,subjunctive,present,singular,3rd,,regular,\r\nāmus,3rd,active,subjunctive,present,plural,1st,,regular,\r\nātis,3rd,active,subjunctive,present,plural,2nd,,regular,\r\nant,3rd,active,subjunctive,present,plural,3rd,,regular,\r\niō,4th,active,indicative,present,singular,1st,,regular,\r\nīs,4th,active,indicative,present,singular,2nd,,regular,\r\nit,4th,active,indicative,present,singular,3rd,,regular,\r\nīmus,4th,active,indicative,present,plural,1st,,regular,\r\nītis,4th,active,indicative,present,plural,2nd,,regular,\r\niunt,4th,active,indicative,present,plural,3rd,,regular,\r\niam,4th,active,subjunctive,present,singular,1st,,regular,\r\niās,4th,active,subjunctive,present,singular,2nd,,regular,\r\niat,4th,active,subjunctive,present,singular,3rd,,regular,\r\niāmus,4th,active,subjunctive,present,plural,1st,,regular,\r\niāatis,4th,active,subjunctive,present,plural,2nd,,regular,\r\niant,4th,active,subjunctive,present,plural,3rd,,regular,\r\nābam,1st,active,indicative,imperfect,singular,1st,,regular,\r\nābas,1st,active,indicative,imperfect,singular,2nd,,regular,\r\nābat,1st,active,indicative,imperfect,singular,3rd,,regular,\r\nābāmus,1st,active,indicative,imperfect,plural,1st,,regular,\r\nābātis,1st,active,indicative,imperfect,plural,2nd,,regular,\r\nābant,1st,active,indicative,imperfect,plural,3rd,,regular,\r\nārem,1st,active,subjunctive,imperfect,singular,1st,,regular,\r\nārēs,1st,active,subjunctive,imperfect,singular,2nd,,regular,\r\nāret,1st,active,subjunctive,imperfect,singular,3rd,,regular,\r\nārēmus,1st,active,subjunctive,imperfect,plural,1st,,regular,\r\nārētis,1st,active,subjunctive,imperfect,plural,2nd,,regular,\r\nārent,1st,active,subjunctive,imperfect,plural,3rd,,regular,\r\nēbam,2nd,active,indicative,imperfect,singular,1st,,regular,\r\nēbās,2nd,active,indicative,imperfect,singular,2nd,,regular,\r\nēbat,2nd,active,indicative,imperfect,singular,3rd,,regular,\r\nēbāmus,2nd,active,indicative,imperfect,plural,1st,,regular,\r\nēbātis,2nd,active,indicative,imperfect,plural,2nd,,regular,\r\nēbant,2nd,active,indicative,imperfect,plural,3rd,,regular,\r\nērem,2nd,active,subjunctive,imperfect,singular,1st,,regular,\r\nērēs,2nd,active,subjunctive,imperfect,singular,2nd,,regular,\r\nēret,2nd,active,subjunctive,imperfect,singular,3rd,,regular,\r\nērēmus,2nd,active,subjunctive,imperfect,plural,1st,,regular,\r\nērētis,2nd,active,subjunctive,imperfect,plural,2nd,,regular,\r\nērēnt,2nd,active,subjunctive,imperfect,plural,3rd,,regular,\r\nēbas,3rd,active,indicative,imperfect,singular,1st,,regular,\r\nēbāt,3rd,active,indicative,imperfect,singular,2nd,,regular,\r\nēbat,3rd,active,indicative,imperfect,singular,3rd,,regular,\r\nēbāmus,3rd,active,indicative,imperfect,plural,1st,,regular,\r\nēbātis,3rd,active,indicative,imperfect,plural,2nd,,regular,\r\nēbant,3rd,active,indicative,imperfect,plural,3rd,,regular,\r\nerem,3rd,active,subjunctive,imperfect,singular,1st,,regular,\r\nerēs,3rd,active,subjunctive,imperfect,singular,2nd,,regular,\r\neret,3rd,active,subjunctive,imperfect,singular,3rd,,regular,\r\nerēmus,3rd,active,subjunctive,imperfect,plural,1st,,regular,\r\nerētis,3rd,active,subjunctive,imperfect,plural,2nd,,regular,\r\nerent,3rd,active,subjunctive,imperfect,plural,3rd,,regular,\r\niēbam,4th,active,indicative,imperfect,singular,1st,,regular,\r\nībam,4th,active,indicative,imperfect,singular,1st,,irregular,2\r\niēbas,4th,active,indicative,imperfect,singular,2nd,,regular,\r\nības,4th,active,indicative,imperfect,singular,2nd,,irregular,\r\niēbat,4th,active,indicative,imperfect,singular,3rd,,regular,\r\nībat,4th,active,indicative,imperfect,singular,3rd,,irregular,\r\niēbāmus,4th,active,indicative,imperfect,plural,1st,,regular,\r\nībāmus,4th,active,indicative,imperfect,plural,1st,,irregular,\r\niēbātis,4th,active,indicative,imperfect,plural,2nd,,regular,\r\nībātis,4th,active,indicative,imperfect,plural,2nd,,irregular,\r\niēbant,4th,active,indicative,imperfect,plural,3rd,,regular,\r\nībant,4th,active,indicative,imperfect,plural,3rd,,irregular,\r\nīrem,4th,active,subjunctive,imperfect,singular,1st,,regular,\r\nīrēs,4th,active,subjunctive,imperfect,singular,2nd,,regular,\r\nīret,4th,active,subjunctive,imperfect,singular,3rd,,regular,\r\nīrēmus,4th,active,subjunctive,imperfect,plural,1st,,regular,\r\nīrētis,4th,active,subjunctive,imperfect,plural,2nd,,regular,\r\nīrēnt,4th,active,subjunctive,imperfect,plural,3rd,,regular,\r\nābo,1st,active,indicative,future,singular,1st,,regular,\r\nābis,1st,active,indicative,future,singular,2nd,,regular,\r\nābit,1st,active,indicative,future,singular,3rd,,regular,\r\nābimus,1st,active,indicative,future,plural,1st,,regular,\r\nābitis,1st,active,indicative,future,plural,2nd,,regular,\r\nābunt,1st,active,indicative,future,plural,3rd,,regular,\r\n,1st,active,subjunctive,future,singular,1st,,,\r\n,1st,active,subjunctive,future,singular,2nd,,,\r\n,1st,active,subjunctive,future,singular,3rd,,,\r\n,1st,active,subjunctive,future,plural,1st,,,\r\n,1st,active,subjunctive,future,plural,2nd,,,\r\n,1st,active,subjunctive,future,plural,3rd,,,\r\nēbō,2nd,active,indicative,future,singular,1st,,regular,\r\nēbis,2nd,active,indicative,future,singular,2nd,,regular,\r\nēbit,2nd,active,indicative,future,singular,3rd,,regular,\r\nēbimus,2nd,active,indicative,future,plural,1st,,regular,\r\nēbitis,2nd,active,indicative,future,plural,2nd,,regular,\r\nēbunt,2nd,active,indicative,future,plural,3rd,,regular,\r\n,2nd,active,subjunctive,future,singular,1st,,regular,\r\n,2nd,active,subjunctive,future,singular,2nd,,,\r\n,2nd,active,subjunctive,future,singular,3rd,,,\r\n,2nd,active,subjunctive,future,plural,1st,,,\r\n,2nd,active,subjunctive,future,plural,2nd,,,\r\n,2nd,active,subjunctive,future,plural,3rd,,,\r\nam,3rd,active,indicative,future,singular,1st,,regular,\r\nēs,3rd,active,indicative,future,singular,2nd,,regular,\r\net,3rd,active,indicative,future,singular,3rd,,regular,\r\nēmus,3rd,active,indicative,future,plural,1st,,regular,\r\nētis,3rd,active,indicative,future,plural,2nd,,regular,\r\nent,3rd,active,indicative,future,plural,3rd,,regular,\r\n,3rd,active,subjunctive,future,singular,1st,,,\r\n,3rd,active,subjunctive,future,singular,2nd,,,\r\n,3rd,active,subjunctive,future,singular,3rd,,,\r\n,3rd,active,subjunctive,future,plural,1st,,,\r\n,3rd,active,subjunctive,future,plural,2nd,,,\r\n,3rd,active,subjunctive,future,plural,3rd,,,\r\niam,4th,active,indicative,future,singular,1st,,regular,\r\nībō,4th,active,indicative,future,singular,1st,,irregular,2\r\niēs,4th,active,indicative,future,singular,2nd,,regular,\r\nībis,4th,active,indicative,future,singular,2nd,,irregular,\r\niet,4th,active,indicative,future,singular,3rd,,regular,\r\nībit,4th,active,indicative,future,singular,3rd,,irregular,\r\niēmus,4th,active,indicative,future,plural,1st,,regular,\r\nībimus,4th,active,indicative,future,plural,1st,,irregular,\r\niētis,4th,active,indicative,future,plural,2nd,,regular,\r\nībitis,4th,active,indicative,future,plural,2nd,,irregular,\r\nient,4th,active,indicative,future,plural,3rd,,regular,\r\nībunt,4th,active,indicative,future,plural,3rd,,irregular,\r\n,4th,active,subjunctive,future,singular,1st,,,\r\n,4th,active,subjunctive,future,singular,2nd,,,\r\n,4th,active,subjunctive,future,singular,3rd,,,\r\n,4th,active,subjunctive,future,plural,1st,,,\r\n,4th,active,subjunctive,future,plural,2nd,,,\r\n,4th,active,subjunctive,future,plural,3rd,,,\r\nāvī,1st,active,indicative,perfect,singular,1st,,regular,\r\nāvistī,1st,active,indicative,perfect,singular,2nd,,regular,\r\nāvit,1st,active,indicative,perfect,singular,3rd,,regular,\r\nāvimus,1st,active,indicative,perfect,plural,1st,,regular,\r\nāvistis,1st,active,indicative,perfect,plural,2nd,,regular,\r\nāvērunt,1st,active,indicative,perfect,plural,3rd,,regular,\r\nāvēre,1st,active,indicative,perfect,plural,3rd,,irregular,6\r\nāverim,1st,active,subjunctive,perfect,singular,1st,,regular,\r\nāveris,1st,active,subjunctive,perfect,singular,2nd,,regular,\r\nāverit,1st,active,subjunctive,perfect,singular,3rd,,regular,\r\nāverimus,1st,active,subjunctive,perfect,plural,1st,,regular,\r\nāveritis,1st,active,subjunctive,perfect,plural,2nd,,regular,\r\nāverint,1st,active,subjunctive,perfect,plural,3rd,,regular,\r\nvī,2nd,active,indicative,perfect,singular,1st,,regular,\r\nvistī,2nd,active,indicative,perfect,singular,2nd,,regular,\r\nvit,2nd,active,indicative,perfect,singular,3rd,,regular,\r\nvimus,2nd,active,indicative,perfect,plural,1st,,regular,\r\nvistis,2nd,active,indicative,perfect,plural,2nd,,regular,\r\nvērunt,2nd,active,indicative,perfect,plural,3rd,,regular,\r\nvēre,2nd,active,indicative,perfect,plural,3rd,,irregular,6\r\nverim,2nd,active,subjunctive,perfect,singular,1st,,regular,\r\nveris,2nd,active,subjunctive,perfect,singular,2nd,,regular,\r\nverit,2nd,active,subjunctive,perfect,singular,3rd,,regular,\r\nverimus,2nd,active,subjunctive,perfect,plural,1st,,regular,\r\nveritis,2nd,active,subjunctive,perfect,plural,2nd,,regular,\r\nverint,2nd,active,subjunctive,perfect,plural,3rd,,regular,\r\nī,3rd,active,indicative,perfect,singular,1st,,regular,\r\nistī,3rd,active,indicative,perfect,singular,2nd,,regular,\r\nit,3rd,active,indicative,perfect,singular,3rd,,regular,\r\nimus,3rd,active,indicative,perfect,plural,1st,,regular,\r\nistis,3rd,active,indicative,perfect,plural,2nd,,regular,\r\nērunt,3rd,active,indicative,perfect,plural,3rd,,regular,\r\nēre,3rd,active,indicative,perfect,plural,3rd,,irregular,6\r\nerim,3rd,active,subjunctive,perfect,singular,1st,,regular,\r\neris,3rd,active,subjunctive,perfect,singular,2nd,,regular,\r\nerit,3rd,active,subjunctive,perfect,singular,3rd,,regular,\r\nerimus,3rd,active,subjunctive,perfect,plural,1st,,regular,\r\neritis,3rd,active,subjunctive,perfect,plural,2nd,,regular,\r\nerint,3rd,active,subjunctive,perfect,plural,3rd,,regular,\r\nīvi,4th,active,indicative,perfect,singular,1st,,regular,\r\nīvistī,4th,active,indicative,perfect,singular,2nd,,regular,\r\nīvit,4th,active,indicative,perfect,singular,3rd,,regular,\r\nīvimus,4th,active,indicative,perfect,plural,1st,,regular,\r\nīvistis,4th,active,indicative,perfect,plural,2nd,,regular,\r\nīvērunt,4th,active,indicative,perfect,plural,3rd,,regular,\r\nīvēre,4th,active,indicative,perfect,plural,3rd,,irregular,6\r\nīverim,4th,active,subjunctive,perfect,singular,1st,,regular,\r\niveris,4th,active,subjunctive,perfect,singular,2nd,,regular,\r\nīverit,4th,active,subjunctive,perfect,singular,3rd,,regular,\r\nīverimus,4th,active,subjunctive,perfect,plural,1st,,regular,\r\nīveritis,4th,active,subjunctive,perfect,plural,2nd,,regular,\r\nīverint,4th,active,subjunctive,perfect,plural,3rd,,regular,\r\nāveram,1st,active,indicative,pluperfect,singular,1st,,regular,\r\nāverās,1st,active,indicative,pluperfect,singular,2nd,,regular,\r\nāverat,1st,active,indicative,pluperfect,singular,3rd,,regular,\r\nāverāmus,1st,active,indicative,pluperfect,plural,1st,,regular,\r\nāverātis,1st,active,indicative,pluperfect,plural,2nd,,regular,\r\nāverant,1st,active,indicative,pluperfect,plural,3rd,,regular,\r\nāvissem,1st,active,subjunctive,pluperfect,singular,1st,,regular,\r\nāvissēs,1st,active,subjunctive,pluperfect,singular,2nd,,regular,\r\nāvisset,1st,active,subjunctive,pluperfect,singular,3rd,,regular,\r\nāvissēm,1st,active,subjunctive,pluperfect,plural,1st,,regular,\r\nāvissēs,1st,active,subjunctive,pluperfect,plural,2nd,,regular,\r\nāvisset,1st,active,subjunctive,pluperfect,plural,3rd,,regular,\r\nveram,2nd,active,indicative,pluperfect,singular,1st,,regular,\r\nverās,2nd,active,indicative,pluperfect,singular,2nd,,regular,\r\nverat,2nd,active,indicative,pluperfect,singular,3rd,,regular,\r\nverāmus,2nd,active,indicative,pluperfect,plural,1st,,regular,\r\nverātis,2nd,active,indicative,pluperfect,plural,2nd,,regular,\r\nverant,2nd,active,indicative,pluperfect,plural,3rd,,regular,\r\nvissem,2nd,active,subjunctive,pluperfect,singular,1st,,regular,\r\nvissēs,2nd,active,subjunctive,pluperfect,singular,2nd,,regular,\r\nvisset,2nd,active,subjunctive,pluperfect,singular,3rd,,regular,\r\nvissēmus,2nd,active,subjunctive,pluperfect,plural,1st,,regular,\r\nvissētis,2nd,active,subjunctive,pluperfect,plural,2nd,,regular,\r\nvissent,2nd,active,subjunctive,pluperfect,plural,3rd,,regular,\r\neram,3rd,active,indicative,pluperfect,singular,1st,,regular,\r\nerās,3rd,active,indicative,pluperfect,singular,2nd,,regular,\r\nerat,3rd,active,indicative,pluperfect,singular,3rd,,regular,\r\nerāmus,3rd,active,indicative,pluperfect,plural,1st,,regular,\r\nerātis,3rd,active,indicative,pluperfect,plural,2nd,,regular,\r\nerant,3rd,active,indicative,pluperfect,plural,3rd,,regular,\r\nissem,3rd,active,subjunctive,pluperfect,singular,1st,,regular,\r\nissēs,3rd,active,subjunctive,pluperfect,singular,2nd,,regular,\r\nisset,3rd,active,subjunctive,pluperfect,singular,3rd,,regular,\r\nissēmus,3rd,active,subjunctive,pluperfect,plural,1st,,regular,\r\nissētis,3rd,active,subjunctive,pluperfect,plural,2nd,,regular,\r\nissent,3rd,active,subjunctive,pluperfect,plural,3rd,,regular,\r\nīveram,4th,active,indicative,pluperfect,singular,1st,,regular,\r\nīverās,4th,active,indicative,pluperfect,singular,2nd,,regular,\r\nīverat,4th,active,indicative,pluperfect,singular,3rd,,regular,\r\nīverāmus,4th,active,indicative,pluperfect,plural,1st,,regular,\r\nīverātis,4th,active,indicative,pluperfect,plural,2nd,,regular,\r\nīverant,4th,active,indicative,pluperfect,plural,3rd,,regular,\r\nīvissem,4th,active,subjunctive,pluperfect,singular,1st,,regular,\r\nīvissēs,4th,active,subjunctive,pluperfect,singular,2nd,,regular,\r\nīvisset,4th,active,subjunctive,pluperfect,singular,3rd,,regular,\r\nīvissēmus,4th,active,subjunctive,pluperfect,plural,1st,,regular,\r\nīvissētis,4th,active,subjunctive,pluperfect,plural,2nd,,regular,\r\nīvissent,4th,active,subjunctive,pluperfect,plural,3rd,,regular,\r\nāverō,1st,active,indicative,future_perfect,singular,1st,,regular,\r\nāveris,1st,active,indicative,future_perfect,singular,2nd,,regular,\r\nāverit,1st,active,indicative,future_perfect,singular,3rd,,regular,\r\nāverimus,1st,active,indicative,future_perfect,plural,1st,,regular,\r\nāveritis,1st,active,indicative,future_perfect,plural,2nd,,regular,\r\nāverint,1st,active,indicative,future_perfect,plural,3rd,,regular,\r\n,1st,active,subjunctive,future_perfect,singular,1st,,,\r\n,1st,active,subjunctive,future_perfect,singular,2nd,,,\r\n,1st,active,subjunctive,future_perfect,singular,3rd,,,\r\n,1st,active,subjunctive,future_perfect,plural,1st,,,\r\n,1st,active,subjunctive,future_perfect,plural,2nd,,,\r\n,1st,active,subjunctive,future_perfect,plural,3rd,,,\r\nverō,2nd,active,indicative,future_perfect,singular,1st,,regular,\r\nvēris,2nd,active,indicative,future_perfect,singular,2nd,,regular,\r\nvērit,2nd,active,indicative,future_perfect,singular,3rd,,regular,\r\nvērimus,2nd,active,indicative,future_perfect,plural,1st,,regular,\r\nvēritis,2nd,active,indicative,future_perfect,plural,2nd,,regular,\r\nvērint,2nd,active,indicative,future_perfect,plural,3rd,,regular,\r\n,2nd,active,subjunctive,future_perfect,singular,1st,,,\r\n,2nd,active,subjunctive,future_perfect,singular,2nd,,,\r\n,2nd,active,subjunctive,future_perfect,singular,3rd,,,\r\n,2nd,active,subjunctive,future_perfect,plural,1st,,,\r\n,2nd,active,subjunctive,future_perfect,plural,2nd,,,\r\n,2nd,active,subjunctive,future_perfect,plural,3rd,,,\r\nerō,3rd,active,indicative,future_perfect,singular,1st,,regular,\r\neris,3rd,active,indicative,future_perfect,singular,2nd,,regular,\r\nerit,3rd,active,indicative,future_perfect,singular,3rd,,regular,\r\nerimus,3rd,active,indicative,future_perfect,plural,1st,,regular,\r\neritis,3rd,active,indicative,future_perfect,plural,2nd,,regular,\r\nerint,3rd,active,indicative,future_perfect,plural,3rd,,regular,\r\n,3rd,active,subjunctive,future_perfect,singular,1st,,,\r\n,3rd,active,subjunctive,future_perfect,singular,2nd,,,\r\n,3rd,active,subjunctive,future_perfect,singular,3rd,,,\r\n,3rd,active,subjunctive,future_perfect,plural,1st,,,\r\n,3rd,active,subjunctive,future_perfect,plural,2nd,,,\r\n,3rd,active,subjunctive,future_perfect,plural,3rd,,,\r\nīverō,4th,active,indicative,future_perfect,singular,1st,,regular,\r\nīveris,4th,active,indicative,future_perfect,singular,2nd,,regular,\r\nīverit,4th,active,indicative,future_perfect,singular,3rd,,regular,\r\nīverimus,4th,active,indicative,future_perfect,plural,1st,,regular,\r\nīveritis,4th,active,indicative,future_perfect,plural,2nd,,regular,\r\nīverint,4th,active,indicative,future_perfect,plural,3rd,,regular,\r\n,4th,active,subjunctive,future_perfect,singular,1st,,,\r\n,4th,active,subjunctive,future_perfect,singular,2nd,,,\r\n,4th,active,subjunctive,future_perfect,singular,3rd,,,\r\n,4th,active,subjunctive,future_perfect,plural,1st,,,\r\n,4th,active,subjunctive,future_perfect,plural,2nd,,,\r\n,4th,active,subjunctive,future_perfect,plural,3rd,,,\r\nor,1st,passive,indicative,present,singular,1st,,regular,\r\nāris,1st,passive,indicative,present,singular,2nd,,regular,\r\nāre,1st,passive,indicative,present,singular,2nd,,irregular,5\r\nātur,1st,passive,indicative,present,singular,3rd,,regular,\r\nāmur,1st,passive,indicative,present,plural,1st,,regular,\r\nāminiī,1st,passive,indicative,present,plural,2nd,,regular,\r\nantur,1st,passive,indicative,present,plural,3rd,,regular,\r\ner,1st,passive,subjunctive,present,singular,1st,,regular,\r\nēris,1st,passive,subjunctive,present,singular,2nd,,regular,\r\nēre,1st,passive,subjunctive,present,singular,2nd,,regular,\r\nētur,1st,passive,subjunctive,present,singular,3rd,,regular,\r\nēmur,1st,passive,subjunctive,present,plural,1st,,regular,\r\nēminī,1st,passive,subjunctive,present,plural,2nd,,regular,\r\nentur,1st,passive,subjunctive,present,plural,3rd,,regular,\r\neor,2nd,passive,indicative,present,singular,1st,,regular,\r\nēris,2nd,passive,indicative,present,singular,2nd,,regular,\r\nēre,2nd,passive,indicative,present,singular,2nd,,regular,\r\nētur,2nd,passive,indicative,present,singular,3rd,,regular,\r\nēmur,2nd,passive,indicative,present,plural,1st,,regular,\r\nēmini,2nd,passive,indicative,present,plural,2nd,,regular,\r\nentur,2nd,passive,indicative,present,plural,3rd,,regular,\r\near,2nd,passive,subjunctive,present,singular,1st,,regular,\r\neāris,2nd,passive,subjunctive,present,singular,2nd,,regular,\r\neāre,2nd,passive,subjunctive,present,singular,2nd,,regular,\r\neātur,2nd,passive,subjunctive,present,singular,3rd,,regular,\r\neāmur,2nd,passive,subjunctive,present,plural,1st,,regular,\r\neāminī,2nd,passive,subjunctive,present,plural,2nd,,regular,\r\neantur,2nd,passive,subjunctive,present,plural,3rd,,regular,\r\nor,3rd,passive,indicative,present,singular,1st,,regular,\r\neris,3rd,passive,indicative,present,singular,2nd,,regular,\r\nere,3rd,passive,indicative,present,singular,2nd,,regular,\r\nitur,3rd,passive,indicative,present,singular,3rd,,regular,\r\nimur,3rd,passive,indicative,present,plural,1st,,regular,\r\niminī,3rd,passive,indicative,present,plural,2nd,,regular,\r\nuntur,3rd,passive,indicative,present,plural,3rd,,regular,\r\nar,3rd,passive,subjunctive,present,singular,1st,,regular,\r\nāris,3rd,passive,subjunctive,present,singular,2nd,,regular,\r\nāre,3rd,passive,subjunctive,present,singular,2nd,,regular,\r\nātur,3rd,passive,subjunctive,present,singular,3rd,,regular,\r\nāmur,3rd,passive,subjunctive,present,plural,1st,,regular,\r\nāminī,3rd,passive,subjunctive,present,plural,2nd,,regular,\r\nantur,3rd,passive,subjunctive,present,plural,3rd,,regular,\r\nior,4th,passive,indicative,present,singular,1st,,regular,\r\nīris,4th,passive,indicative,present,singular,2nd,,regular,\r\nīre,4th,passive,indicative,present,singular,2nd,,regular,\r\nītur,4th,passive,indicative,present,singular,3rd,,regular,\r\nīmur,4th,passive,indicative,present,plural,1st,,regular,\r\nīminī,4th,passive,indicative,present,plural,2nd,,regular,\r\niuntur,4th,passive,indicative,present,plural,3rd,,regular,\r\niar,4th,passive,subjunctive,present,singular,1st,,regular,\r\niāris,4th,passive,subjunctive,present,singular,2nd,,regular,\r\niāre,4th,passive,subjunctive,present,singular,2nd,,regular,\r\niātur,4th,passive,subjunctive,present,singular,3rd,,regular,\r\niāmur,4th,passive,subjunctive,present,plural,1st,,regular,\r\niāminī,4th,passive,subjunctive,present,plural,2nd,,regular,\r\niantur,4th,passive,subjunctive,present,plural,3rd,,regular,\r\nābar,1st,passive,indicative,imperfect,singular,1st,,regular,\r\nābāaris,1st,passive,indicative,imperfect,singular,2nd,,regular,\r\nābāre,1st,passive,indicative,imperfect,singular,2nd,,regular,\r\nābātur,1st,passive,indicative,imperfect,singular,3rd,,regular,\r\nābāmur,1st,passive,indicative,imperfect,plural,1st,,regular,\r\nābāminī,1st,passive,indicative,imperfect,plural,2nd,,regular,\r\nābantur,1st,passive,indicative,imperfect,plural,3rd,,regular,\r\nārer,1st,passive,subjunctive,imperfect,singular,1st,,regular,\r\nārēris,1st,passive,subjunctive,imperfect,singular,2nd,,regular,\r\nārēre,1st,passive,subjunctive,imperfect,singular,2nd,,regular,\r\nārētur,1st,passive,subjunctive,imperfect,singular,3rd,,regular,\r\nārēmur,1st,passive,subjunctive,imperfect,plural,1st,,regular,\r\nārēminī,1st,passive,subjunctive,imperfect,plural,2nd,,regular,\r\nārentur,1st,passive,subjunctive,imperfect,plural,3rd,,regular,\r\nēbar,2nd,passive,indicative,imperfect,singular,1st,,regular,\r\nēbāris,2nd,passive,indicative,imperfect,singular,2nd,,regular,\r\nēbāre,2nd,passive,indicative,imperfect,singular,2nd,,regular,\r\nēbātur,2nd,passive,indicative,imperfect,singular,3rd,,regular,\r\nēbāmur,2nd,passive,indicative,imperfect,plural,1st,,regular,\r\nēbāmini,2nd,passive,indicative,imperfect,plural,2nd,,regular,\r\nēbantur,2nd,passive,indicative,imperfect,plural,3rd,,regular,\r\nērer,2nd,passive,subjunctive,imperfect,singular,1st,,regular,\r\nērēris,2nd,passive,subjunctive,imperfect,singular,2nd,,regular,\r\nērēre,2nd,passive,subjunctive,imperfect,singular,2nd,,regular,\r\nērētur,2nd,passive,subjunctive,imperfect,singular,3rd,,regular,\r\nērēmur,2nd,passive,subjunctive,imperfect,plural,1st,,regular,\r\nērēminī,2nd,passive,subjunctive,imperfect,plural,2nd,,regular,\r\nērentur,2nd,passive,subjunctive,imperfect,plural,3rd,,regular,\r\nēbar,3rd,passive,indicative,imperfect,singular,1st,,regular,\r\nēbāris,3rd,passive,indicative,imperfect,singular,2nd,,regular,\r\nēbāre,3rd,passive,indicative,imperfect,singular,2nd,,regular,\r\nēbatur,3rd,passive,indicative,imperfect,singular,3rd,,regular,\r\nēbāmur,3rd,passive,indicative,imperfect,plural,1st,,regular,\r\nēbāminī,3rd,passive,indicative,imperfect,plural,2nd,,regular,\r\nēbantur,3rd,passive,indicative,imperfect,plural,3rd,,regular,\r\nerer,3rd,passive,subjunctive,imperfect,singular,1st,,regular,\r\nerēris,3rd,passive,subjunctive,imperfect,singular,2nd,,regular,\r\nerēre,3rd,passive,subjunctive,imperfect,singular,2nd,,regular,\r\nerētur,3rd,passive,subjunctive,imperfect,singular,3rd,,regular,\r\nerēmur,3rd,passive,subjunctive,imperfect,plural,1st,,regular,\r\nerēminī,3rd,passive,subjunctive,imperfect,plural,2nd,,regular,\r\nerentur,3rd,passive,subjunctive,imperfect,plural,3rd,,regular,\r\niēbar,4th,passive,indicative,imperfect,singular,1st,,regular,\r\niēbāris,4th,passive,indicative,imperfect,singular,2nd,,regular,\r\niēbāre,4th,passive,indicative,imperfect,singular,2nd,,regular,\r\niēbātur,4th,passive,indicative,imperfect,singular,3rd,,regular,\r\niēbāmur,4th,passive,indicative,imperfect,plural,1st,,regular,\r\niēbāminī,4th,passive,indicative,imperfect,plural,2nd,,regular,\r\niēbantur,4th,passive,indicative,imperfect,plural,3rd,,regular,\r\nīrer,4th,passive,subjunctive,imperfect,singular,1st,,regular,\r\nīrēris,4th,passive,subjunctive,imperfect,singular,2nd,,regular,\r\nīrēre,4th,passive,subjunctive,imperfect,singular,2nd,,regular,\r\nīrētur,4th,passive,subjunctive,imperfect,singular,3rd,,regular,\r\nīrēmur,4th,passive,subjunctive,imperfect,plural,1st,,regular,\r\nīrēminī,4th,passive,subjunctive,imperfect,plural,2nd,,regular,\r\nīrentur,4th,passive,subjunctive,imperfect,plural,3rd,,regular,\r\nābor,1st,passive,indicative,future,singular,1st,,regular,\r\nāberis,1st,passive,indicative,future,singular,2nd,,regular,\r\nābere,1st,passive,indicative,future,singular,2nd,,irregular,\r\nābitur,1st,passive,indicative,future,singular,3rd,,regular,\r\nābimur,1st,passive,indicative,future,plural,1st,,regular,\r\nābiminī,1st,passive,indicative,future,plural,2nd,,regular,\r\nābuntur,1st,passive,indicative,future,plural,3rd,,regular,\r\n,1st,passive,subjunctive,future,singular,1st,,,\r\n,1st,passive,subjunctive,future,singular,2nd,,,\r\n,1st,passive,subjunctive,future,singular,3rd,,,\r\n,1st,passive,subjunctive,future,plural,1st,,,\r\n,1st,passive,subjunctive,future,plural,2nd,,,\r\n,1st,passive,subjunctive,future,plural,3rd,,,\r\nēbor,2nd,passive,indicative,future,singular,1st,,regular,\r\nēberis,2nd,passive,indicative,future,singular,2nd,,regular,\r\nēbere,2nd,passive,indicative,future,singular,2nd,,regular,\r\nēbitur,2nd,passive,indicative,future,singular,3rd,,regular,\r\nēbimur,2nd,passive,indicative,future,plural,1st,,regular,\r\nēbiminī,2nd,passive,indicative,future,plural,2nd,,regular,\r\nēbuntur,2nd,passive,indicative,future,plural,3rd,,regular,\r\n,2nd,passive,subjunctive,future,singular,1st,,,\r\n,2nd,passive,subjunctive,future,singular,2nd,,,\r\n,2nd,passive,subjunctive,future,singular,3rd,,,\r\n,2nd,passive,subjunctive,future,plural,1st,,,\r\n,2nd,passive,subjunctive,future,plural,2nd,,,\r\n,2nd,passive,subjunctive,future,plural,3rd,,,\r\nar,3rd,passive,indicative,future,singular,1st,,regular,\r\nēris,3rd,passive,indicative,future,singular,2nd,,regular,\r\nēre,3rd,passive,indicative,future,singular,2nd,,irregular,\r\nētur,3rd,passive,indicative,future,singular,3rd,,regular,\r\nēmur,3rd,passive,indicative,future,plural,1st,,regular,\r\nēminī,3rd,passive,indicative,future,plural,2nd,,regular,\r\nentur,3rd,passive,indicative,future,plural,3rd,,regular,\r\n,3rd,passive,subjunctive,future,singular,1st,,,\r\n,3rd,passive,subjunctive,future,singular,2nd,,,\r\n,3rd,passive,subjunctive,future,singular,3rd,,,\r\n,3rd,passive,subjunctive,future,plural,1st,,,\r\n,3rd,passive,subjunctive,future,plural,2nd,,,\r\n,3rd,passive,subjunctive,future,plural,3rd,,,\r\niar,4th,passive,indicative,future,singular,1st,,regular,\r\niēris,4th,passive,indicative,future,singular,2nd,,regular,\r\nīēre,4th,passive,indicative,future,singular,2nd,,irregular,\r\niētur,4th,passive,indicative,future,singular,3rd,,regular,\r\niēmur,4th,passive,indicative,future,plural,1st,,regular,\r\niēminī,4th,passive,indicative,future,plural,2nd,,regular,\r\nientur,4th,passive,indicative,future,plural,3rd,,regular,\r\n,4th,passive,subjunctive,future,singular,1st,,,\r\n,4th,passive,subjunctive,future,singular,2nd,,,\r\n,4th,passive,subjunctive,future,singular,3rd,,,\r\n,4th,passive,subjunctive,future,plural,1st,,,\r\n,4th,passive,subjunctive,future,plural,2nd,,,\r\n,4th,passive,subjunctive,future,plural,3rd,,,\r\nātus sum,1st,passive,indicative,perfect,singular,1st,,regular,\r\nātus fui,1st,passive,indicative,perfect,singular,1st,,regular,\r\nātus es,1st,passive,indicative,perfect,singular,2nd,,regular,\r\nātus fuisti,1st,passive,indicative,perfect,singular,2nd,,regular,\r\nātus est,1st,passive,indicative,perfect,singular,3rd,,regular,\r\nātus fuit,1st,passive,indicative,perfect,singular,3rd,,regular,\r\nāti sumus,1st,passive,indicative,perfect,plural,1st,,regular,\r\nāti fuimus,1st,passive,indicative,perfect,plural,1st,,irregular,\r\nāti estis,1st,passive,indicative,perfect,plural,2nd,,regular,\r\nāti fuistis,1st,passive,indicative,perfect,plural,2nd,,irregular,\r\nāti sunt,1st,passive,indicative,perfect,plural,3rd,,regular,\r\nāti fuerunt,1st,passive,indicative,perfect,plural,3rd,,irregular,\r\nātus sim,1st,passive,subjunctive,perfect,singular,1st,,regular,\r\nātus fuerim,1st,passive,subjunctive,perfect,singular,1st,,irregular,\r\nātus sis,1st,passive,subjunctive,perfect,singular,2nd,,regular,\r\nātus fueris,1st,passive,subjunctive,perfect,singular,2nd,,irregular,\r\nātus sit,1st,passive,subjunctive,perfect,singular,3rd,,regular,\r\nātus fuerit,1st,passive,subjunctive,perfect,singular,3rd,,regular,\r\nāti sīmus,1st,passive,subjunctive,perfect,plural,1st,,regular,\r\nāti fuerimus,1st,passive,subjunctive,perfect,plural,1st,,irregular,\r\nāti sītis,1st,passive,subjunctive,perfect,plural,2nd,,regular,\r\nāti fueritis,1st,passive,subjunctive,perfect,plural,2nd,,irregular,\r\nāti sint,1st,passive,subjunctive,perfect,plural,3rd,,regular,\r\nāti fuerint,1st,passive,subjunctive,perfect,plural,3rd,,irregular,\r\nitus sum,2nd,passive,indicative,perfect,singular,1st,,regular,\r\nitus es,2nd,passive,indicative,perfect,singular,2nd,,regular,\r\nitus est,2nd,passive,indicative,perfect,singular,3rd,,regular,\r\nitī sumus,2nd,passive,indicative,perfect,plural,1st,,regular,\r\nitī estis,2nd,passive,indicative,perfect,plural,2nd,,regular,\r\nitī sunt,2nd,passive,indicative,perfect,plural,3rd,,regular,\r\nitus sim,2nd,passive,subjunctive,perfect,singular,1st,,regular,\r\nitus sīs,2nd,passive,subjunctive,perfect,singular,2nd,,regular,\r\nitus sit,2nd,passive,subjunctive,perfect,singular,3rd,,regular,\r\nitī sīmus,2nd,passive,subjunctive,perfect,plural,1st,,regular,\r\nitī sītis,2nd,passive,subjunctive,perfect,plural,2nd,,regular,\r\nitī sint,2nd,passive,subjunctive,perfect,plural,3rd,,regular,\r\nus sum,3rd,passive,indicative,perfect,singular,1st,,regular,\r\nus es,3rd,passive,indicative,perfect,singular,2nd,,regular,\r\nus est,3rd,passive,indicative,perfect,singular,3rd,,regular,\r\nī sumus,3rd,passive,indicative,perfect,plural,1st,,regular,\r\nī estis,3rd,passive,indicative,perfect,plural,2nd,,regular,\r\nī sunt,3rd,passive,indicative,perfect,plural,3rd,,regular,\r\nus sim,3rd,passive,subjunctive,perfect,singular,1st,,regular,\r\nus sīs,3rd,passive,subjunctive,perfect,singular,2nd,,regular,\r\nus sit,3rd,passive,subjunctive,perfect,singular,3rd,,regular,\r\nus sīmus,3rd,passive,subjunctive,perfect,plural,1st,,regular,\r\nus sītis,3rd,passive,subjunctive,perfect,plural,2nd,,regular,\r\nus sint,3rd,passive,subjunctive,perfect,plural,3rd,,regular,\r\nītus sum,4th,passive,indicative,perfect,singular,1st,,regular,\r\nītus es,4th,passive,indicative,perfect,singular,2nd,,regular,\r\nītus est,4th,passive,indicative,perfect,singular,3rd,,regular,\r\nītī sumus,4th,passive,indicative,perfect,plural,1st,,regular,\r\nīti estis,4th,passive,indicative,perfect,plural,2nd,,regular,\r\nīti sunt,4th,passive,indicative,perfect,plural,3rd,,regular,\r\nītus sim,4th,passive,subjunctive,perfect,singular,1st,,regular,\r\nītus sīs,4th,passive,subjunctive,perfect,singular,2nd,,regular,\r\nītus sit,4th,passive,subjunctive,perfect,singular,3rd,,regular,\r\nītī sīmus,4th,passive,subjunctive,perfect,plural,1st,,regular,\r\nīti sītis,4th,passive,subjunctive,perfect,plural,2nd,,regular,\r\nīti sint,4th,passive,subjunctive,perfect,plural,3rd,,regular,\r\nātus eram,1st,passive,indicative,pluperfect,singular,1st,,regular,\r\nātus fueram,1st,passive,indicative,pluperfect,singular,1st,,irregular,\r\nātus eras,1st,passive,indicative,pluperfect,singular,2nd,,regular,\r\nātus fueras,1st,passive,indicative,pluperfect,singular,2nd,,irregular,\r\nātus erat,1st,passive,indicative,pluperfect,singular,3rd,,regular,\r\nātus fuerat,1st,passive,indicative,pluperfect,singular,3rd,,irregular,\r\nātī erāmus,1st,passive,indicative,pluperfect,plural,1st,,regular,\r\nātī fueramus,1st,passive,indicative,pluperfect,plural,1st,,irregular,\r\nātī erātis,1st,passive,indicative,pluperfect,plural,2nd,,regular,\r\nātī fueratis,1st,passive,indicative,pluperfect,plural,2nd,,irregular,\r\nātī erant,1st,passive,indicative,pluperfect,plural,3rd,,regular,\r\nātī fuerant,1st,passive,indicative,pluperfect,plural,3rd,,irregular,\r\nātus essem,1st,passive,subjunctive,pluperfect,singular,1st,,regular,\r\nātus fuissem,1st,passive,subjunctive,pluperfect,singular,1st,,irregular,\r\nātus esses,1st,passive,subjunctive,pluperfect,singular,2nd,,regular,\r\nātus fuissēs,1st,passive,subjunctive,pluperfect,singular,2nd,,irregular,\r\nātus esset,1st,passive,subjunctive,pluperfect,singular,3rd,,regular,\r\nātus fuisset,1st,passive,subjunctive,pluperfect,singular,3rd,,irregular,\r\nāti essēmus,1st,passive,subjunctive,pluperfect,plural,1st,,regular,\r\nāti fuissēmus,1st,passive,subjunctive,pluperfect,plural,1st,,irregular,\r\nāti essētis,1st,passive,subjunctive,pluperfect,plural,2nd,,regular,\r\nāti fuissētis,1st,passive,subjunctive,pluperfect,plural,2nd,,regular,\r\nāti essent,1st,passive,subjunctive,pluperfect,plural,3rd,,regular,\r\nāti fuissent,1st,passive,subjunctive,pluperfect,plural,3rd,,regular,\r\nitus eram,2nd,passive,indicative,pluperfect,singular,1st,,regular,\r\nitus erās,2nd,passive,indicative,pluperfect,singular,2nd,,regular,\r\nitus erat,2nd,passive,indicative,pluperfect,singular,3rd,,regular,\r\nitī erāmus,2nd,passive,indicative,pluperfect,plural,1st,,regular,\r\nitī erātis,2nd,passive,indicative,pluperfect,plural,2nd,,regular,\r\nitī erant,2nd,passive,indicative,pluperfect,plural,3rd,,regular,\r\nitus essem,2nd,passive,subjunctive,pluperfect,singular,1st,,regular,\r\nitus essēs,2nd,passive,subjunctive,pluperfect,singular,2nd,,regular,\r\nitus esset,2nd,passive,subjunctive,pluperfect,singular,3rd,,regular,\r\nitī essēmus,2nd,passive,subjunctive,pluperfect,plural,1st,,regular,\r\nīti essētis,2nd,passive,subjunctive,pluperfect,plural,2nd,,regular,\r\nīti essent,2nd,passive,subjunctive,pluperfect,plural,3rd,,regular,\r\nus eram,3rd,passive,indicative,pluperfect,singular,1st,,regular,\r\nus erās,3rd,passive,indicative,pluperfect,singular,2nd,,regular,\r\nus erat,3rd,passive,indicative,pluperfect,singular,3rd,,regular,\r\nī erāmus,3rd,passive,indicative,pluperfect,plural,1st,,regular,\r\nī erātis,3rd,passive,indicative,pluperfect,plural,2nd,,regular,\r\nī erant,3rd,passive,indicative,pluperfect,plural,3rd,,regular,\r\nus essem,3rd,passive,subjunctive,pluperfect,singular,1st,,regular,\r\nus essēs,3rd,passive,subjunctive,pluperfect,singular,2nd,,regular,\r\nus esset,3rd,passive,subjunctive,pluperfect,singular,3rd,,regular,\r\nī essēmus,3rd,passive,subjunctive,pluperfect,plural,1st,,regular,\r\nī essētis,3rd,passive,subjunctive,pluperfect,plural,2nd,,regular,\r\nī essent,3rd,passive,subjunctive,pluperfect,plural,3rd,,regular,\r\nītus eram,4th,passive,indicative,pluperfect,singular,1st,,regular,\r\nītus erās,4th,passive,indicative,pluperfect,singular,2nd,,regular,\r\nītus erat,4th,passive,indicative,pluperfect,singular,3rd,,regular,\r\nītī erāmus,4th,passive,indicative,pluperfect,plural,1st,,regular,\r\nīti erātis,4th,passive,indicative,pluperfect,plural,2nd,,regular,\r\nītī erant,4th,passive,indicative,pluperfect,plural,3rd,,regular,\r\nītus essem,4th,passive,subjunctive,pluperfect,singular,1st,,regular,\r\nītus essēs,4th,passive,subjunctive,pluperfect,singular,2nd,,regular,\r\nītus esset,4th,passive,subjunctive,pluperfect,singular,3rd,,regular,\r\nītī essēmus,4th,passive,subjunctive,pluperfect,plural,1st,,regular,\r\nīti essētis,4th,passive,subjunctive,pluperfect,plural,2nd,,regular,\r\nīti essent,4th,passive,subjunctive,pluperfect,plural,3rd,,regular,\r\nātus erō,1st,passive,indicative,future_perfect,singular,1st,,regular,\r\nātus eris,1st,passive,indicative,future_perfect,singular,2nd,,regular,\r\nātus erit,1st,passive,indicative,future_perfect,singular,3rd,,regular,\r\nāti erimus,1st,passive,indicative,future_perfect,plural,1st,,regular,\r\nāti eritis,1st,passive,indicative,future_perfect,plural,2nd,,regular,\r\nāti erunt,1st,passive,indicative,future_perfect,plural,3rd,,regular,\r\n,1st,passive,subjunctive,future_perfect,singular,1st,,,\r\n,1st,passive,subjunctive,future_perfect,singular,2nd,,,\r\n,1st,passive,subjunctive,future_perfect,singular,3rd,,,\r\n,1st,passive,subjunctive,future_perfect,plural,1st,,,\r\n,1st,passive,subjunctive,future_perfect,plural,2nd,,,\r\n,1st,passive,subjunctive,future_perfect,plural,3rd,,,\r\nitus erō,2nd,passive,indicative,future_perfect,singular,1st,,regular,\r\nitus eris,2nd,passive,indicative,future_perfect,singular,2nd,,regular,\r\nitus erit,2nd,passive,indicative,future_perfect,singular,3rd,,regular,\r\nitī erimus,2nd,passive,indicative,future_perfect,plural,1st,,regular,\r\nitī eritis,2nd,passive,indicative,future_perfect,plural,2nd,,regular,\r\nitī erunt,2nd,passive,indicative,future_perfect,plural,3rd,,regular,\r\n,2nd,passive,subjunctive,future_perfect,singular,1st,,,\r\n,2nd,passive,subjunctive,future_perfect,singular,2nd,,,\r\n,2nd,passive,subjunctive,future_perfect,singular,3rd,,,\r\n,2nd,passive,subjunctive,future_perfect,plural,1st,,,\r\n,2nd,passive,subjunctive,future_perfect,plural,2nd,,,\r\n,2nd,passive,subjunctive,future_perfect,plural,3rd,,,\r\nus erō,3rd,passive,indicative,future_perfect,singular,1st,,regular,\r\nus eris,3rd,passive,indicative,future_perfect,singular,2nd,,regular,\r\nus erit,3rd,passive,indicative,future_perfect,singular,3rd,,regular,\r\nī erimus,3rd,passive,indicative,future_perfect,plural,1st,,regular,\r\nī eritis,3rd,passive,indicative,future_perfect,plural,2nd,,regular,\r\nī erunt,3rd,passive,indicative,future_perfect,plural,3rd,,regular,\r\n,3rd,passive,subjunctive,future_perfect,singular,1st,,,\r\n,3rd,passive,subjunctive,future_perfect,singular,2nd,,,\r\n,3rd,passive,subjunctive,future_perfect,singular,3rd,,,\r\n,3rd,passive,subjunctive,future_perfect,plural,1st,,,\r\n,3rd,passive,subjunctive,future_perfect,plural,2nd,,,\r\n,3rd,passive,subjunctive,future_perfect,plural,3rd,,,\r\nītus erō,4th,passive,indicative,future_perfect,singular,1st,,regular,\r\nītus eris,4th,passive,indicative,future_perfect,singular,2nd,,regular,\r\nītus erit,4th,passive,indicative,future_perfect,singular,3rd,,regular,\r\nītī erimus,4th,passive,indicative,future_perfect,plural,1st,,regular,\r\nītī eritis,4th,passive,indicative,future_perfect,plural,2nd,,regular,\r\nītī erunt,4th,passive,indicative,future_perfect,plural,3rd,,regular,\r\n,4th,passive,subjunctive,future_perfect,singular,1st,,,\r\n,4th,passive,subjunctive,future_perfect,singular,2nd,,,\r\n,4th,passive,subjunctive,future_perfect,singular,3rd,,,\r\n,4th,passive,subjunctive,future_perfect,plural,1st,,,\r\n,4th,passive,subjunctive,future_perfect,plural,2nd,,,\r\n,4th,passive,subjunctive,future_perfect,plural,3rd,,,\r\nā,1st,active,imperative,present,singular,2nd,,regular,3\r\nāte,1st,active,imperative,present,plural,2nd,,regular,\r\nāre,1st,passive,imperative,present,singular,2nd,,regular,\r\nāminī,1st,passive,imperative,present,plural,2nd,,regular,\r\nē,2nd,active,imperative,present,singular,2nd,,regular,3\r\nēte,2nd,active,imperative,present,plural,2nd,,regular,\r\nēre,2nd,passive,imperative,present,singular,2nd,,regular,\r\nēminī,2nd,passive,imperative,present,plural,2nd,,regular,\r\ne,3rd,active,imperative,present,singular,2nd,,regular,3\r\nīte,3rd,active,imperative,present,plural,2nd,,regular,\r\nere,3rd,passive,imperative,present,singular,2nd,,regular,\r\niminī,3rd,passive,imperative,present,plural,2nd,,regular,\r\nī,4th,active,imperative,present,singular,2nd,,regular,3\r\nīte,4th,active,imperative,present,plural,2nd,,regular,\r\nīre,4th,passive,imperative,present,singular,2nd,,regular,\r\nīminī,4th,passive,imperative,present,plural,2nd,,regular,\r\nātō,1st,active,imperative,future,singular,2nd,,regular,\r\nātō,1st,active,imperative,future,singular,3rd,,regular,\r\nātote,1st,active,imperative,future,plural,2nd,,regular,\r\nantō,1st,active,imperative,future,plural,3rd,,regular,\r\nātōr,1st,passive,imperative,future,singular,2nd,,regular,\r\n,1st,passive,imperative,future,singular,3rd,,,\r\nātor,1st,passive,imperative,future,plural,2nd,,regular,\r\namantor,1st,passive,imperative,future,plural,3rd,,regular,\r\nētō,2nd,active,imperative,future,singular,2nd,,regular,\r\nētō,2nd,active,imperative,future,singular,3rd,,regular,\r\nētōte,2nd,active,imperative,future,plural,2nd,,regular,\r\nentō,2nd,active,imperative,future,plural,3rd,,regular,\r\nētor,2nd,passive,imperative,future,singular,2nd,,regular,\r\n,2nd,passive,imperative,future,singular,3rd,,,\r\nētor,2nd,passive,imperative,future,plural,2nd,,regular,\r\nentor,2nd,passive,imperative,future,plural,3rd,,regular,\r\nitō,3rd,active,imperative,future,singular,2nd,,regular,\r\nitō,3rd,active,imperative,future,singular,3rd,,regular,\r\nitōte,3rd,active,imperative,future,plural,2nd,,regular,\r\nuntō,3rd,active,imperative,future,plural,3rd,,regular,\r\nitor,3rd,passive,imperative,future,singular,2nd,,regular,\r\n,3rd,passive,imperative,future,singular,3rd,,,\r\nitor,3rd,passive,imperative,future,plural,2nd,,regular,\r\nuntor,3rd,passive,imperative,future,plural,3rd,,regular,\r\nītō,4th,active,imperative,future,singular,2nd,,regular,\r\nītō,4th,active,imperative,future,singular,3rd,,regular,\r\nītōte,4th,active,imperative,future,plural,2nd,,regular,\r\niuntō,4th,active,imperative,future,plural,3rd,,regular,\r\nītor,4th,passive,imperative,future,singular,2nd,,regular,\r\n,4th,passive,imperative,future,singular,3rd,,,\r\nītor,4th,passive,imperative,future,plural,2nd,,regular,\r\niuntor,4th,passive,imperative,future,plural,3rd,,regular,\r\nāre,1st,active,infinitive,present,,,,regular,\r\nēre,2nd,active,infinitive,present,,,,regular,\r\nere,3rd,active,infinitive,present,,,,regular,\r\nīre,4th,active,infinitive,present,,,,regular,\r\nāvisse,1st,active,infinitive,perfect,,,,regular,\r\nvisse,2nd,active,infinitive,perfect,,,,regular,\r\nisse,3rd,active,infinitive,perfect,,,,regular,\r\nīvisse,4th,active,infinitive,perfect,,,,regular,\r\nāturus esse,1st,active,infinitive,future,,,,regular,\r\ntūrus esse,2nd,active,infinitive,future,,,,regular,\r\ntūrus esse,3rd,active,infinitive,future,,,,regular,\r\nītūrus esse,4th,active,infinitive,future,,,,regular,\r\nārī,1st,passive,infinitive,present,,,,regular,\r\nērī,2nd,passive,infinitive,present,,,,regular,\r\nī,3rd,passive,infinitive,present,,,,regular,\r\nīrī,4th,passive,infinitive,present,,,,regular,\r\nāus esse,1st,passive,infinitive,perfect,,,,regular,\r\nitus esse,2nd,passive,infinitive,perfect,,,,regular,\r\ntus esse,3rd,passive,infinitive,perfect,,,,regular,\r\nītus esse,4th,passive,infinitive,perfect,,,,regular,\r\nātum īrī,1st,passive,infinitive,future,,,,regular,\r\nitum īrī,2nd,passive,infinitive,future,,,,regular,\r\ntum īri,3rd,passive,infinitive,future,,,,regular,\r\nītum īrī,4th,passive,infinitive,future,,,,regular,\r\nandī,1st,active,gerundive,,,,genitive,regular,\r\nendī,2nd,active,gerundive,,,,genitive,regular,\r\nendī,3rd,active,gerundive,,,,genitive,regular,\r\niendī,4th,active,gerundive,,,,genitive,regular,\r\nandō,1st,active,gerundive,,,,dative,regular,\r\nendō,2nd,active,gerundive,,,,dative,regular,\r\nendō,3rd,active,gerundive,,,,dative,regular,\r\niendō,4th,active,gerundive,,,,dative,regular,\r\nandum,1st,active,gerundive,,,,accusative,regular,\r\nendum,2nd,active,gerundive,,,,accusative,regular,\r\nendum,3rd,active,gerundive,,,,accusative,regular,\r\niendum,4th,active,gerundive,,,,accusative,regular,\r\nandō,1st,active,gerundive,,,,ablative,regular,\r\nendō,2nd,active,gerundive,,,,ablative,regular,\r\nendō,3rd,active,gerundive,,,,ablative,regular,\r\niendō,4th,active,gerundive,,,,ablative,regular,\r\n,1st,passive,gerundive,,,,genitive,,\r\n,2nd,passive,gerundive,,,,genitive,,\r\n,3rd,passive,gerundive,,,,genitive,,\r\n,4th,passive,gerundive,,,,genitive,,\r\n,1st,passive,gerundive,,,,dative,,\r\n,2nd,passive,gerundive,,,,dative,,\r\n,3rd,passive,gerundive,,,,dative,,\r\n,4th,passive,gerundive,,,,dative,,\r\n,1st,passive,gerundive,,,,accusative,,\r\n,2nd,passive,gerundive,,,,accusative,,\r\n,3rd,passive,gerundive,,,,accusative,,\r\n,4th,passive,gerundive,,,,accusative,,\r\n,1st,passive,gerundive,,,,ablative,,\r\n,2nd,passive,gerundive,,,,ablative,,\r\n,3rd,passive,gerundive,,,,ablative,,\r\n,4th,passive,gerundive,,,,ablative,,\r\n";

var verbFootnotesCSV = "Index,Text\r\n2,Chiefly in poetry.\r\n3,\"In tenses based on the perfect stem (the perfect, pluperfect and future perfect of the Active voice) a v between two vowels is often lost with contraction of the two vowels, thus āvī to ā, ēvī to ē, ōvi to ō. Perfects in īvī often omit the v but rarely contract the vowels, except before ss or st, and sometimes in the third person. In addition to the use of v or u, the Active perfect stem can also be formed in a number of other ways, such as the addition of s to the root (eg carpsi), reduplication of the root (eg cecidi from cado), and simple lengthening of the vowel (eg vidī from video or legī from lego).\"\r\n4,\"Dic, duc, fac, and fer lack a final vowel in the imperative in classical Latin. The singular imperative of the verb sciō is always scītō, and the plural is usually scītōte.\"\r\n5,Common in epic poetry.\r\n6,Present in early Latin but chiefly confined to popular use until Livy and later writers.\r\n7,The verb fīō is a 4th conjugation verb that is irregular in only two forms: the present infinitive fierī and the imperfect subjunctive fierem.";

var verbFormsCSV = "Lemma,PrincipalParts,Form,Voice,Mood,Tense,Number,Person,Footnote\r\nsum,esse_fui_futurus,sum,,indicative,present,singular,1st,\r\nsum,esse_fui_futurus,es,,indicative,present,singular,2nd,\r\nsum,esse_fui_futurus,est,,indicative,present,singular,3rd,\r\nsum,esse_fui_futurus,sumus,,indicative,present,plural,1st,\r\nsum,esse_fui_futurus,estis,,indicative,present,plural,2nd,\r\nsum,esse_fui_futurus,sunt,,indicative,present,plural,3rd,\r\nsum,esse_fui_futurus,sim,,subjunctive,present,singular,1st,\r\nsum,esse_fui_futurus,siem,,subjunctive,present,singular,1st,1\r\nsum,esse_fui_futurus,fuam,,subjunctive,present,singular,1st,1\r\nsum,esse_fui_futurus,sīs,,subjunctive,present,singular,2nd,\r\nsum,esse_fui_futurus,siēs,,subjunctive,present,singular,2nd,1\r\nsum,esse_fui_futurus,fuās,,subjunctive,present,singular,2nd,1\r\nsum,esse_fui_futurus,sit,,subjunctive,present,singular,3rd,\r\nsum,esse_fui_futurus,siet,,subjunctive,present,singular,3rd,1\r\nsum,esse_fui_futurus,fuat,,subjunctive,present,singular,3rd,1\r\nsum,esse_fui_futurus,sīmus,,subjunctive,present,plural,1st,\r\nsum,esse_fui_futurus,sītis,,subjunctive,present,plural,2nd,\r\nsum,esse_fui_futurus,sint,,subjunctive,present,plural,3rd,\r\nsum,esse_fui_futurus,sient,,subjunctive,present,plural,3rd,1\r\nsum,esse_fui_futurus,fuant,,subjunctive,present,plural,3rd,1\r\nsum,esse_fui_futurus,es,,imperative,present,singular,2nd,\r\nsum,esse_fui_futurus,este,,imperative,present,plural,2nd,\r\nsum,esse_fui_futurus,esse,,infinitive,present,,,\r\nsum,esse_fui_futurus,eram,,indicative,imperfect,singular,1st,\r\nsum,esse_fui_futurus,erās,,indicative,imperfect,singular,2nd,\r\nsum,esse_fui_futurus,erat,,indicative,imperfect,singular,3rd,\r\nsum,esse_fui_futurus,erāmus,,indicative,imperfect,plural,1st,\r\nsum,esse_fui_futurus,erātis,,indicative,imperfect,plural,2nd,\r\nsum,esse_fui_futurus,erant,,indicative,imperfect,plural,3rd,\r\nsum,esse_fui_futurus,essem,,subjunctive,imperfect,singular,1st,\r\nsum,esse_fui_futurus,forem,,subjunctive,imperfect,singular,1st,2\r\nsum,esse_fui_futurus,essēs,,subjunctive,imperfect,singular,2nd,\r\nsum,esse_fui_futurus,forēs,,subjunctive,imperfect,singular,2nd,2\r\nsum,esse_fui_futurus,esset,,subjunctive,imperfect,singular,3rd,\r\nsum,esse_fui_futurus,foret,,subjunctive,imperfect,singular,3rd,2\r\nsum,esse_fui_futurus,essēmus,,subjunctive,imperfect,plural,1st,\r\nsum,esse_fui_futurus,forēmus,,subjunctive,imperfect,plural,1st,2\r\nsum,esse_fui_futurus,essētis,,subjunctive,imperfect,plural,2nd,\r\nsum,esse_fui_futurus,forētis,,subjunctive,imperfect,plural,2nd,2\r\nsum,esse_fui_futurus,essent,,subjunctive,imperfect,plural,3rd,\r\nsum,esse_fui_futurus,forent,,subjunctive,imperfect,plural,3rd,2\r\nsum,esse_fui_futurus,erō,,indicative,future,singular,1st,\r\nsum,esse_fui_futurus,eris,,indicative,future,singular,2nd,\r\nsum,esse_fui_futurus,erit,,indicative,future,singular,3rd,\r\nsum,esse_fui_futurus,escit,,indicative,future,singular,3rd,1\r\nsum,esse_fui_futurus,erimus,,indicative,future,plural,1st,\r\nsum,esse_fui_futurus,eritis,,indicative,future,plural,2nd,\r\nsum,esse_fui_futurus,erunt,,indicative,future,plural,3rd,\r\nsum,esse_fui_futurus,escunt,,indicative,future,plural,3rd,1\r\nsum,esse_fui_futurus,estō,,imperative,future,singular,2nd,\r\nsum,esse_fui_futurus,estō,,imperative,future,singular,3rd,\r\nsum,esse_fui_futurus,estōte,,imperative,future,plural,2nd,\r\nsum,esse_fui_futurus,suntō,,imperative,future,plural,3rd,\r\nsum,esse_fui_futurus,futūrus esse,,infinitive,future,,,\r\nsum,esse_fui_futurus,fore,,infinitive,future,,,\r\nsum,esse_fui_futurus,futūrus,,verb_participle,future,,,\r\nsum,esse_fui_futurus,-a,,verb_participle,future,,,\r\nsum,esse_fui_futurus,-um,,verb_participle,future,,,\r\nsum,esse_fui_futurus,fuī,,indicative,perfect,singular,1st,\r\nsum,esse_fui_futurus,fuistī,,indicative,perfect,singular,2nd,\r\nsum,esse_fui_futurus,fuit,,indicative,perfect,singular,3rd,\r\nsum,esse_fui_futurus,fuimus,,indicative,perfect,plural,1st,\r\nsum,esse_fui_futurus,fuistis,,indicative,perfect,plural,2nd,\r\nsum,esse_fui_futurus,fuērunt,,indicative,perfect,plural,3rd,\r\nsum,esse_fui_futurus,fuēre,,indicative,perfect,plural,3rd,\r\nsum,esse_fui_futurus,fuerim,,subjunctive,perfect,singular,1st,\r\nsum,esse_fui_futurus,fueris,,subjunctive,perfect,singular,2nd,\r\nsum,esse_fui_futurus,fuerit,,subjunctive,perfect,singular,3rd,\r\nsum,esse_fui_futurus,fuerimus,,subjunctive,perfect,plural,1st,\r\nsum,esse_fui_futurus,fūvimus,,subjunctive,perfect,plural,1st,\r\nsum,esse_fui_futurus,fueritis,,subjunctive,perfect,plural,2nd,\r\nsum,esse_fui_futurus,fuerint,,subjunctive,perfect,plural,3rd,\r\nsum,esse_fui_futurus,fuisse,,infinitive,perfect,,,\r\nsum,esse_fui_futurus,fueram,,indicative,pluperfect,singular,1st,\r\nsum,esse_fui_futurus,fuerās,,indicative,pluperfect,singular,2nd,\r\nsum,esse_fui_futurus,fuerat,,indicative,pluperfect,singular,3rd,\r\nsum,esse_fui_futurus,fuerāmus,,indicative,pluperfect,plural,1st,\r\nsum,esse_fui_futurus,fuerātis,,indicative,pluperfect,plural,2nd,\r\nsum,esse_fui_futurus,fuerant,,indicative,pluperfect,plural,3rd,\r\nsum,esse_fui_futurus,fuissem,,subjunctive,pluperfect,singular,1st,\r\nsum,esse_fui_futurus,fuissēs,,subjunctive,pluperfect,singular,2nd,\r\nsum,esse_fui_futurus,fuisset,,subjunctive,pluperfect,singular,3rd,\r\nsum,esse_fui_futurus,fūvisset,,subjunctive,pluperfect,singular,3rd,\r\nsum,esse_fui_futurus,fuissēmus,,subjunctive,pluperfect,plural,1st,\r\nsum,esse_fui_futurus,fuissētis,,subjunctive,pluperfect,plural,2nd,\r\nsum,esse_fui_futurus,fuissent,,subjunctive,pluperfect,plural,3rd,\r\nsum,esse_fui_futurus,fuerō,,indicative,future_perfect,singular,1st,\r\nsum,esse_fui_futurus,fueris,,indicative,future_perfect,singular,2nd,\r\nsum,esse_fui_futurus,fuerit,,indicative,future_perfect,singular,3rd,\r\nsum,esse_fui_futurus,fuerimus,,indicative,future_perfect,plural,1st,\r\nsum,esse_fui_futurus,fueritis,,indicative,future_perfect,plural,2nd,\r\nsum,esse_fui_futurus,fuerint,,indicative,future_perfect,plural,3rd,\r\nfero,ferre_tuli_latus,ferō,active,indicative,present,singular,1st,\r\nfero,ferre_tuli_latus,fers,active,indicative,present,singular,2nd,\r\nfero,ferre_tuli_latus,fert,active,indicative,present,singular,3rd,\r\nfero,ferre_tuli_latus,ferimus,active,indicative,present,plural,1st,\r\nfero,ferre_tuli_latus,fertis,active,indicative,present,plural,2nd,\r\nfero,ferre_tuli_latus,ferunt,active,indicative,present,plural,3rd,\r\nfero,ferre_tuli_latus,feram,active,subjunctive,present,singular,1st,\r\nfero,ferre_tuli_latus,ferās,active,subjunctive,present,singular,2nd,\r\nfero,ferre_tuli_latus,ferat,active,subjunctive,present,singular,3rd,\r\nfero,ferre_tuli_latus,ferāmus,active,subjunctive,present,plural,1st,\r\nfero,ferre_tuli_latus,ferātis,active,subjunctive,present,plural,2nd,\r\nfero,ferre_tuli_latus,ferant,active,subjunctive,present,plural,3rd,\r\nfero,ferre_tuli_latus,fer,active,imperative,present,singular,2nd,\r\nfero,ferre_tuli_latus,ferte,active,imperative,present,plural,2nd,\r\nfero,ferre_tuli_latus,ferre,active,infinitive,present,,,3\r\nfero,ferre_tuli_latus,feror,passive,indicative,present,singular,1st,\r\nfero,ferre_tuli_latus,ferris,passive,indicative,present,singular,2nd,\r\nfero,ferre_tuli_latus,ferre,passive,indicative,present,singular,2nd,\r\nfero,ferre_tuli_latus,fertur,passive,indicative,present,singular,3rd,\r\nfero,ferre_tuli_latus,ferimur,passive,indicative,present,plural,1st,\r\nfero,ferre_tuli_latus,feriminī,passive,indicative,present,plural,2nd,\r\nfero,ferre_tuli_latus,feruntur,passive,indicative,present,plural,3rd,\r\nfero,ferre_tuli_latus,ferar,passive,subjunctive,present,singular,1st,\r\nfero,ferre_tuli_latus,ferāris,passive,subjunctive,present,singular,2nd,\r\nfero,ferre_tuli_latus,ferāre,passive,subjunctive,present,singular,2nd,\r\nfero,ferre_tuli_latus,ferātur,passive,subjunctive,present,singular,3rd,\r\nfero,ferre_tuli_latus,ferāmur,passive,subjunctive,present,plural,1st,\r\nfero,ferre_tuli_latus,ferāminī,passive,subjunctive,present,plural,2nd,\r\nfero,ferre_tuli_latus,ferantur,passive,subjunctive,present,plural,3rd,\r\nfero,ferre_tuli_latus,ferre,passive,imperative,present,singular,2nd,\r\nfero,ferre_tuli_latus,feriminī,passive,imperative,present,plural,2nd,\r\nfero,ferre_tuli_latus,ferrī,passive,infinitive,present,,,\r\nfero,ferre_tuli_latus,ferēns,active,verb_participle,present,,,\r\nfero,ferre_tuli_latus,-entis,active,verb_participle,present,,,\r\nfero,ferre_tuli_latus,ferēbam,active,indicative,imperfect,singular,1st,\r\nfero,ferre_tuli_latus,ferēbās,active,indicative,imperfect,singular,2nd,\r\nfero,ferre_tuli_latus,ferēbat,active,indicative,imperfect,singular,3rd,\r\nfero,ferre_tuli_latus,ferēbāmus,active,indicative,imperfect,plural,1st,\r\nfero,ferre_tuli_latus,ferēbātis,active,indicative,imperfect,plural,2nd,\r\nfero,ferre_tuli_latus,ferēbant,active,indicative,imperfect,plural,3rd,\r\nfero,ferre_tuli_latus,ferrem,active,subjunctive,imperfect,singular,1st,3\r\nfero,ferre_tuli_latus,ferrēs,active,subjunctive,imperfect,singular,2nd,\r\nfero,ferre_tuli_latus,ferret,active,subjunctive,imperfect,singular,3rd,\r\nfero,ferre_tuli_latus,ferrēmus,active,subjunctive,imperfect,plural,1st,\r\nfero,ferre_tuli_latus,ferrētis,active,subjunctive,imperfect,plural,2nd,\r\nfero,ferre_tuli_latus,ferrent,active,subjunctive,imperfect,plural,3rd,\r\nfero,ferre_tuli_latus,ferēbar,passive,indicative,imperfect,singular,1st,\r\nfero,ferre_tuli_latus,ferēbāris,passive,indicative,imperfect,singular,2nd,\r\nfero,ferre_tuli_latus,ferēbāre,passive,indicative,imperfect,singular,2nd,\r\nfero,ferre_tuli_latus,ferēbātur,passive,indicative,imperfect,singular,3rd,\r\nfero,ferre_tuli_latus,ferēbāmur,passive,indicative,imperfect,plural,1st,\r\nfero,ferre_tuli_latus,ferēbāminī,passive,indicative,imperfect,plural,2nd,\r\nfero,ferre_tuli_latus,ferēbantur,passive,indicative,imperfect,plural,3rd,\r\nfero,ferre_tuli_latus,ferrer,passive,subjunctive,imperfect,singular,1st,\r\nfero,ferre_tuli_latus,ferrēris,passive,subjunctive,imperfect,singular,2nd,\r\nfero,ferre_tuli_latus,ferrēre,passive,subjunctive,imperfect,singular,2nd,\r\nfero,ferre_tuli_latus,ferrētur,passive,subjunctive,imperfect,singular,3rd,\r\nfero,ferre_tuli_latus,ferrēmur,passive,subjunctive,imperfect,plural,1st,\r\nfero,ferre_tuli_latus,ferrēminī,passive,subjunctive,imperfect,plural,2nd,\r\nfero,ferre_tuli_latus,ferrentur,passive,subjunctive,imperfect,plural,3rd,\r\nfero,ferre_tuli_latus,feram,active,indicative,future,singular,1st,\r\nfero,ferre_tuli_latus,ferēs,active,indicative,future,singular,2nd,\r\nfero,ferre_tuli_latus,feret,active,indicative,future,singular,3rd,\r\nfero,ferre_tuli_latus,ferēmus,active,indicative,future,plural,1st,\r\nfero,ferre_tuli_latus,ferētis,active,indicative,future,plural,2nd,\r\nfero,ferre_tuli_latus,ferent,active,indicative,future,plural,3rd,\r\nfero,ferre_tuli_latus,ferar,passive,indicative,future,singular,1st,\r\nfero,ferre_tuli_latus,ferēris,passive,indicative,future,singular,2nd,\r\nfero,ferre_tuli_latus,ferēre,passive,indicative,future,singular,2nd,\r\nfero,ferre_tuli_latus,ferētur,passive,indicative,future,singular,3rd,\r\nfero,ferre_tuli_latus,ferēmur,passive,indicative,future,plural,1st,\r\nfero,ferre_tuli_latus,ferēminī,passive,indicative,future,plural,2nd,\r\nfero,ferre_tuli_latus,ferentur,passive,indicative,future,plural,3rd,\r\nfero,ferre_tuli_latus,fertō,active,imperative,future,singular,2nd,\r\nfero,ferre_tuli_latus,fertōte,active,imperative,future,singular,3rd,\r\nfero,ferre_tuli_latus,fertō,active,imperative,future,plural,2nd,\r\nfero,ferre_tuli_latus,feruntō,active,imperative,future,plural,3rd,\r\nfero,ferre_tuli_latus,fertor,passive,imperative,future,singular,2nd,\r\nfero,ferre_tuli_latus,fertor,passive,imperative,future,plural,2nd,\r\nfero,ferre_tuli_latus,feruntor,passive,imperative,future,plural,3rd,\r\nfero,ferre_tuli_latus,latūrus esse,active,infinitive,future,,,\r\nfero,ferre_tuli_latus,latūm īrī,passive,infinitive,future,,,\r\nfero,ferre_tuli_latus,latūrus,active,verb_participle,future,,,\r\nfero,ferre_tuli_latus,ferundus,passive,verb_participle,future,,,4\r\nfero,ferre_tuli_latus,tulī,active,indicative,perfect,singular,1st,\r\nfero,ferre_tuli_latus,tulistī,active,indicative,perfect,singular,2nd,\r\nfero,ferre_tuli_latus,tulit,active,indicative,perfect,singular,3rd,\r\nfero,ferre_tuli_latus,tulimus,active,indicative,perfect,plural,1st,\r\nfero,ferre_tuli_latus,tulistis,active,indicative,perfect,plural,2nd,\r\nfero,ferre_tuli_latus,tulērunt,active,indicative,perfect,plural,3rd,\r\nfero,ferre_tuli_latus,tulerim,active,subjunctive,perfect,singular,1st,\r\nfero,ferre_tuli_latus,tulerīs,active,subjunctive,perfect,singular,2nd,\r\nfero,ferre_tuli_latus,tulerit,active,subjunctive,perfect,singular,3rd,\r\nfero,ferre_tuli_latus,tulerimus,active,subjunctive,perfect,plural,1st,\r\nfero,ferre_tuli_latus,tuleritis,active,subjunctive,perfect,plural,2nd,\r\nfero,ferre_tuli_latus,tulerint,active,subjunctive,perfect,plural,3rd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) sum\",passive,indicative,perfect,singular,1st,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) es\",passive,indicative,perfect,singular,2nd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) est\",passive,indicative,perfect,singular,3rd,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) sumus\",passive,indicative,perfect,plural,1st,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) estis\",passive,indicative,perfect,plural,2nd,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) sunt\",passive,indicative,perfect,plural,3rd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) sim\",passive,subjunctive,perfect,singular,1st,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) sīs\",passive,subjunctive,perfect,singular,2nd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um)sit\",passive,subjunctive,perfect,singular,3rd,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) sīmus\",passive,subjunctive,perfect,plural,1st,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) sītis\",passive,subjunctive,perfect,plural,2nd,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a)sint\",passive,subjunctive,perfect,plural,3rd,\r\nfero,ferre_tuli_latus,tulisse,active,infinitive,perfect,,,\r\nfero,ferre_tuli_latus,lātus esse,passive,infinitive,perfect,,,\r\nfero,ferre_tuli_latus,\"lātus, -ta, -tum\",passive,verb_participle,perfect,,,8\r\nfero,ferre_tuli_latus,tuleram,active,indicative,pluperfect,singular,1st,\r\nfero,ferre_tuli_latus,tulerās,active,indicative,pluperfect,singular,2nd,\r\nfero,ferre_tuli_latus,tulerat,active,indicative,pluperfect,singular,3rd,\r\nfero,ferre_tuli_latus,tulerāmus,active,indicative,pluperfect,plural,1st,\r\nfero,ferre_tuli_latus,tulerātis,active,indicative,pluperfect,plural,2nd,\r\nfero,ferre_tuli_latus,tulerant,active,indicative,pluperfect,plural,3rd,\r\nfero,ferre_tuli_latus,tulissem,active,subjunctive,pluperfect,singular,1st,\r\nfero,ferre_tuli_latus,tulissēs,active,subjunctive,pluperfect,singular,2nd,\r\nfero,ferre_tuli_latus,tulisset,active,subjunctive,pluperfect,singular,3rd,\r\nfero,ferre_tuli_latus,tulissēmus,active,subjunctive,pluperfect,plural,1st,\r\nfero,ferre_tuli_latus,tulissētis,active,subjunctive,pluperfect,plural,2nd,\r\nfero,ferre_tuli_latus,tulissent,active,subjunctive,pluperfect,plural,3rd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) eram\",passive,indicative,pluperfect,singular,1st,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) erās\",passive,indicative,pluperfect,singular,2nd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) erat\",passive,indicative,pluperfect,singular,3rd,\r\nfero,ferre_tuli_latus,\"latī (-ae, a) erāmus\",passive,indicative,pluperfect,plural,1st,\r\nfero,ferre_tuli_latus,\"latī (-ae, a) erātis\",passive,indicative,pluperfect,plural,2nd,\r\nfero,ferre_tuli_latus,\"latī (-ae, a) erant\",passive,indicative,pluperfect,plural,3rd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) essem\",passive,subjunctive,pluperfect,singular,1st,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) essēs\",passive,subjunctive,pluperfect,singular,2nd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) esset\",passive,subjunctive,pluperfect,singular,3rd,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) essēmus\",passive,subjunctive,pluperfect,plural,1st,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) essētis\",passive,subjunctive,pluperfect,plural,2nd,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) essent\",passive,subjunctive,pluperfect,plural,3rd,\r\nfero,ferre_tuli_latus,tulerō,active,indicative,future_perfect,singular,1st,\r\nfero,ferre_tuli_latus,tuleris,active,indicative,future_perfect,singular,2nd,\r\nfero,ferre_tuli_latus,tulerit,active,indicative,future_perfect,singular,3rd,\r\nfero,ferre_tuli_latus,tulerimus,active,indicative,future_perfect,plural,1st,\r\nfero,ferre_tuli_latus,tuleritis,active,indicative,future_perfect,plural,2nd,\r\nfero,ferre_tuli_latus,tulerint,active,indicative,future_perfect,plural,3rd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) erō\",passive,indicative,future_perfect,singular,1st,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) eris\",passive,indicative,future_perfect,singular,2nd,\r\nfero,ferre_tuli_latus,\"lātus (-a, -um) erit\",passive,indicative,future_perfect,singular,3rd,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) erimus\",passive,indicative,future_perfect,plural,1st,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) ēritis\",passive,indicative,future_perfect,plural,2nd,\r\nfero,ferre_tuli_latus,\"latī (-ae, -a) ērunt\",passive,indicative,future_perfect,plural,3rd,\r\nfero,ferre_tuli_latus,ferendī,,gerundive,,,,5\r\nfero,ferre_tuli_latus,ferendō,,gerundive,,,,\r\nfero,ferre_tuli_latus,ferendum,,gerundive,,,,\r\nfero,ferre_tuli_latus,ferendō,,gerundive,,,,\r\nfero,ferre_tuli_latus,lātum,,supine,,,,5\r\nfero,ferre_tuli_latus,lātū,,supine,,,,\r\nfero,ferre_tuli_latus,lātū,,supine,,,,\r\nvolo,velle_volui_-,volō,,indicative,present,singular,1st,\r\nvolo,velle_volui_-,vīs,,indicative,present,singular,2nd,\r\nvolo,velle_volui_-,vult,,indicative,present,singular,3rd,\r\nvolo,velle_volui_-,volt,,indicative,present,singular,3rd,7\r\nvolo,velle_volui_-,volumus,,indicative,present,plural,1st,\r\nvolo,velle_volui_-,vultis,,indicative,present,plural,2nd,\r\nvolo,velle_volui_-,volunt,,indicative,present,plural,3rd,\r\nvolo,velle_volui_-,velim,,subjunctive,present,singular,1st,\r\nvolo,velle_volui_-,velīs,,subjunctive,present,singular,2nd,\r\nvolo,velle_volui_-,velit,,subjunctive,present,singular,3rd,\r\nvolo,velle_volui_-,velīmus,,subjunctive,present,plural,1st,\r\nvolo,velle_volui_-,velītis,,subjunctive,present,plural,2nd,\r\nvolo,velle_volui_-,velint,,subjunctive,present,plural,3rd,\r\nvolo,velle_volui_-,velle,,infinitive,present,,,\r\nvolo,velle_volui_-,volēns,,verb_participle,present,,,\r\nvolo,velle_volui_-,-entis,,verb_participle,present,,,\r\nvolo,velle_volui_-,volēbam,,indicative,imperfect,singular,1st,\r\nvolo,velle_volui_-,volēbās,,indicative,imperfect,singular,2nd,\r\nvolo,velle_volui_-,volēbat,,indicative,imperfect,singular,3rd,\r\nvolo,velle_volui_-,volēbāmus,,indicative,imperfect,plural,1st,\r\nvolo,velle_volui_-,volēbātis,,indicative,imperfect,plural,2nd,\r\nvolo,velle_volui_-,volēbant,,indicative,imperfect,plural,3rd,\r\nvolo,velle_volui_-,vellem,,subjunctive,imperfect,singular,1st,\r\nvolo,velle_volui_-,vellēs,,subjunctive,imperfect,singular,2nd,\r\nvolo,velle_volui_-,vellet,,subjunctive,imperfect,singular,3rd,\r\nvolo,velle_volui_-,vellēmus,,subjunctive,imperfect,plural,1st,\r\nvolo,velle_volui_-,vellētis,,subjunctive,imperfect,plural,2nd,\r\nvolo,velle_volui_-,vellent,,subjunctive,imperfect,plural,3rd,\r\nvolo,velle_volui_-,volam,,indicative,future,singular,1st,\r\nvolo,velle_volui_-,volēs,,indicative,future,singular,2nd,\r\nvolo,velle_volui_-,volet,,indicative,future,singular,3rd,\r\nvolo,velle_volui_-,volēmus,,indicative,future,plural,1st,\r\nvolo,velle_volui_-,volētis,,indicative,future,plural,2nd,\r\nvolo,velle_volui_-,volent,,indicative,future,plural,3rd,\r\nvolo,velle_volui_-,voluī,,indicative,perfect,singular,1st,\r\nvolo,velle_volui_-,voluistī,,indicative,perfect,singular,2nd,\r\nvolo,velle_volui_-,voluit,,indicative,perfect,singular,3rd,\r\nvolo,velle_volui_-,voluimus,,indicative,perfect,plural,1st,\r\nvolo,velle_volui_-,voluistis,,indicative,perfect,plural,2nd,\r\nvolo,velle_volui_-,voluērunt,,indicative,perfect,plural,3rd,\r\nvolo,velle_volui_-,voluerim,,subjunctive,perfect,singular,1st,\r\nvolo,velle_volui_-,voluerīs,,subjunctive,perfect,singular,2nd,\r\nvolo,velle_volui_-,voluerit,,subjunctive,perfect,singular,3rd,\r\nvolo,velle_volui_-,voluerīmus,,subjunctive,perfect,plural,1st,\r\nvolo,velle_volui_-,voluerītis,,subjunctive,perfect,plural,2nd,\r\nvolo,velle_volui_-,voluerint,,subjunctive,perfect,plural,3rd,\r\nvolo,velle_volui_-,voluisse,,infinitive,perfect,,,\r\nvolo,velle_volui_-,volueram,,indicative,pluperfect,singular,1st,\r\nvolo,velle_volui_-,voluerās,,indicative,pluperfect,singular,2nd,\r\nvolo,velle_volui_-,voluerat,,indicative,pluperfect,singular,3rd,\r\nvolo,velle_volui_-,voluerāmus,,indicative,pluperfect,plural,1st,\r\nvolo,velle_volui_-,voluerātis,,indicative,pluperfect,plural,2nd,\r\nvolo,velle_volui_-,voluerant,,indicative,pluperfect,plural,3rd,\r\nvolo,velle_volui_-,voluissem,,subjunctive,pluperfect,singular,1st,\r\nvolo,velle_volui_-,voluissēs,,subjunctive,pluperfect,singular,2nd,\r\nvolo,velle_volui_-,voluisset,,subjunctive,pluperfect,singular,3rd,\r\nvolo,velle_volui_-,voluissēmus,,subjunctive,pluperfect,plural,1st,\r\nvolo,velle_volui_-,voluissētis,,subjunctive,pluperfect,plural,2nd,\r\nvolo,velle_volui_-,voluissent,,subjunctive,pluperfect,plural,3rd,\r\nvolo,velle_volui_-,voluerō,,indicative,future_perfect,singular,1st,\r\nvolo,velle_volui_-,volueris,,indicative,future_perfect,singular,2nd,\r\nvolo,velle_volui_-,voluerit,,indicative,future_perfect,singular,3rd,\r\nvolo,velle_volui_-,voluerimus,,indicative,future_perfect,plural,1st,\r\nvolo,velle_volui_-,volueritis,,indicative,future_perfect,plural,2nd,\r\nvolo,velle_volui_-,voluerunt,,indicative,future_perfect,plural,3rd,\r\neo,ire_ivi(ii)_itus,eō,,indicative,present,singular,1st,\r\neo,ire_ivi(ii)_itus,īs,,indicative,present,singular,2nd,\r\neo,ire_ivi(ii)_itus,it,,indicative,present,singular,3rd,\r\neo,ire_ivi(ii)_itus,īmus,,indicative,present,plural,1st,\r\neo,ire_ivi(ii)_itus,ītis,,indicative,present,plural,2nd,\r\neo,ire_ivi(ii)_itus,eunt,,indicative,present,plural,3rd,\r\neo,ire_ivi(ii)_itus,eam,,subjunctive,present,singular,1st,\r\neo,ire_ivi(ii)_itus,eās,,subjunctive,present,singular,2nd,\r\neo,ire_ivi(ii)_itus,eat,,subjunctive,present,singular,3rd,\r\neo,ire_ivi(ii)_itus,eāmus,,subjunctive,present,plural,1st,\r\neo,ire_ivi(ii)_itus,eātis,,subjunctive,present,plural,2nd,\r\neo,ire_ivi(ii)_itus,eant,,subjunctive,present,plural,3rd,\r\neo,ire_ivi(ii)_itus,ī,,imperative,present,singular,2nd,\r\neo,ire_ivi(ii)_itus,īte,,imperative,present,plural,2nd,\r\neo,ire_ivi(ii)_itus,īre,,infinitive,present,,,\r\neo,ire_ivi(ii)_itus,iēns,,verb_participle,present,,,\r\neo,ire_ivi(ii)_itus,euntis,,verb_participle,present,,,\r\neo,ire_ivi(ii)_itus,ībam,,indicative,imperfect,singular,1st,\r\neo,ire_ivi(ii)_itus,ības,,indicative,imperfect,singular,2nd,\r\neo,ire_ivi(ii)_itus,ībat,,indicative,imperfect,singular,3rd,\r\neo,ire_ivi(ii)_itus,ībāmus,,indicative,imperfect,plural,1st,\r\neo,ire_ivi(ii)_itus,ībātis,,indicative,imperfect,plural,2nd,\r\neo,ire_ivi(ii)_itus,ībant,,indicative,imperfect,plural,3rd,\r\neo,ire_ivi(ii)_itus,īrem,,subjunctive,imperfect,singular,1st,\r\neo,ire_ivi(ii)_itus,īrēs,,subjunctive,imperfect,singular,2nd,\r\neo,ire_ivi(ii)_itus,īret,,subjunctive,imperfect,singular,3rd,\r\neo,ire_ivi(ii)_itus,īrēmus,,subjunctive,imperfect,plural,1st,\r\neo,ire_ivi(ii)_itus,īrētis,,subjunctive,imperfect,plural,2nd,\r\neo,ire_ivi(ii)_itus,īrent,,subjunctive,imperfect,plural,3rd,\r\neo,ire_ivi(ii)_itus,ībō,,indicative,future,singular,1st,\r\neo,ire_ivi(ii)_itus,ībis,,indicative,future,singular,2nd,\r\neo,ire_ivi(ii)_itus,ībit,,indicative,future,singular,3rd,\r\neo,ire_ivi(ii)_itus,ībimus,,indicative,future,plural,1st,\r\neo,ire_ivi(ii)_itus,ībitis,,indicative,future,plural,2nd,\r\neo,ire_ivi(ii)_itus,ībunt,,indicative,future,plural,3rd,\r\neo,ire_ivi(ii)_itus,ītō,,imperative,future,singular,2nd,\r\neo,ire_ivi(ii)_itus,ītō,,imperative,future,singular,3rd,\r\neo,ire_ivi(ii)_itus,ītōte,,imperative,future,plural,2nd,\r\neo,ire_ivi(ii)_itus,euntō,,imperative,future,plural,3rd,\r\neo,ire_ivi(ii)_itus,itūrus esse,,infinitive,future,,,\r\neo,ire_ivi(ii)_itus,itūrus,,verb_participle,future,,,\r\neo,ire_ivi(ii)_itus,eundum,passive,verb_participle,future,,,4\r\neo,ire_ivi(ii)_itus,iī,,indicative,perfect,singular,1st,10\r\neo,ire_ivi(ii)_itus,īvī,,indicative,perfect,singular,1st,11\r\neo,ire_ivi(ii)_itus,īstī,,indicative,perfect,singular,2nd,\r\neo,ire_ivi(ii)_itus,iit,,indicative,perfect,singular,3rd,\r\neo,ire_ivi(ii)_itus,iimus,,indicative,perfect,plural,1st,\r\neo,ire_ivi(ii)_itus,īstis,,indicative,perfect,plural,2nd,\r\neo,ire_ivi(ii)_itus,iērunt,,indicative,perfect,plural,3rd,\r\neo,ire_ivi(ii)_itus,ierim,,subjunctive,perfect,singular,1st,\r\neo,ire_ivi(ii)_itus,ierīs,,subjunctive,perfect,singular,2nd,\r\neo,ire_ivi(ii)_itus,ierit,,subjunctive,perfect,singular,3rd,\r\neo,ire_ivi(ii)_itus,ierīmus,,subjunctive,perfect,plural,1st,\r\neo,ire_ivi(ii)_itus,ierītis,,subjunctive,perfect,plural,2nd,\r\neo,ire_ivi(ii)_itus,ierint,,subjunctive,perfect,plural,3rd,\r\neo,ire_ivi(ii)_itus,īsse,,infinitive,perfect,,,10\r\neo,ire_ivi(ii)_itus,īvisse,,infinitive,perfect,,,\r\neo,ire_ivi(ii)_itus,ieram,,indicative,pluperfect,singular,1st,\r\neo,ire_ivi(ii)_itus,īveram,,indicative,pluperfect,singular,1st,\r\neo,ire_ivi(ii)_itus,ierās,,indicative,pluperfect,singular,2nd,\r\neo,ire_ivi(ii)_itus,ierat,,indicative,pluperfect,singular,3rd,\r\neo,ire_ivi(ii)_itus,ierāmus,,indicative,pluperfect,plural,1st,\r\neo,ire_ivi(ii)_itus,ierātis,,indicative,pluperfect,plural,2nd,\r\neo,ire_ivi(ii)_itus,ierant,,indicative,pluperfect,plural,3rd,\r\neo,ire_ivi(ii)_itus,īssem,,subjunctive,pluperfect,singular,1st,\r\neo,ire_ivi(ii)_itus,īssēs,,subjunctive,pluperfect,singular,2nd,\r\neo,ire_ivi(ii)_itus,īsset,,subjunctive,pluperfect,singular,3rd,\r\neo,ire_ivi(ii)_itus,īssēmus,,subjunctive,pluperfect,plural,1st,\r\neo,ire_ivi(ii)_itus,īssētis,,subjunctive,pluperfect,plural,2nd,\r\neo,ire_ivi(ii)_itus,īssent,,subjunctive,pluperfect,plural,3rd,\r\neo,ire_ivi(ii)_itus,ierō,,indicative,future_perfect,singular,1st,\r\neo,ire_ivi(ii)_itus,īverō,,indicative,future_perfect,singular,1st,\r\neo,ire_ivi(ii)_itus,ieris,,indicative,future_perfect,singular,2nd,\r\neo,ire_ivi(ii)_itus,ierit,,indicative,future_perfect,singular,3rd,\r\neo,ire_ivi(ii)_itus,ierimus,,indicative,future_perfect,plural,1st,\r\neo,ire_ivi(ii)_itus,ieritis,,indicative,future_perfect,plural,2nd,\r\neo,ire_ivi(ii)_itus,ierunt,,indicative,future_perfect,plural,3rd,\r\neo,ire_ivi(ii)_itus,eundī,,gerundive,,,,5\r\neo,ire_ivi(ii)_itus,eundō,,gerundive,,,,\r\neo,ire_ivi(ii)_itus,eundum,,gerundive,,,,\r\neo,ire_ivi(ii)_itus,eundō,,gerundive,,,,\r\neo,ire_ivi(ii)_itus,itum,,supine,,,,5\r\neo,ire_ivi(ii)_itus,itū,,supine,,,,\r\neo,ire_ivi(ii)_itus,itū,,supine,,,,\r\npossum,posse_potui_-,possum,,indicative,present,singular,1st,\r\npossum,posse_potui_-,\"potis, -e sum\",,indicative,present,singular,1st,12\r\npossum,posse_potui_-,potes,,indicative,present,singular,2nd,\r\npossum,posse_potui_-,\"potis, -e es\",,indicative,present,singular,2nd,12\r\npossum,posse_potui_-,potest,,indicative,present,singular,3rd,\r\npossum,posse_potui_-,\"potis, -e est\",,indicative,present,singular,3rd,12\r\npossum,posse_potui_-,possumus,,indicative,present,plural,1st,\r\npossum,posse_potui_-,\"potes, -ia sumus\",,indicative,present,plural,1st,12\r\npossum,posse_potui_-,potestis,,indicative,present,plural,2nd,\r\npossum,posse_potui_-,\"potes, -ia estis\",,indicative,present,plural,2nd,12\r\npossum,posse_potui_-,possunt,,indicative,present,plural,3rd,\r\npossum,posse_potui_-,\"potes, -ia sunt\",,indicative,present,plural,3rd,12\r\npossum,posse_potui_-,possim,,subjunctive,present,singular,1st,\r\npossum,posse_potui_-,possiem,,subjunctive,present,singular,1st,12\r\npossum,posse_potui_-,possīs,,subjunctive,present,singular,2nd,\r\npossum,posse_potui_-,possiēs,,subjunctive,present,singular,2nd,\r\npossum,posse_potui_-,possit,,subjunctive,present,singular,3rd,\r\npossum,posse_potui_-,postisit,,subjunctive,present,singular,3rd,12\r\npossum,posse_potui_-,possiet,,subjunctive,present,singular,3rd,\r\npossum,posse_potui_-,possīmus,,subjunctive,present,plural,1st,\r\npossum,posse_potui_-,possiemus,,subjunctive,present,plural,1st,\r\npossum,posse_potui_-,possītis,,subjunctive,present,plural,2nd,\r\npossum,posse_potui_-,possietis,,subjunctive,present,plural,2nd,\r\npossum,posse_potui_-,possint,,subjunctive,present,plural,3rd,\r\npossum,posse_potui_-,possient,,subjunctive,present,plural,3rd,\r\npossum,posse_potui_-,posse,,infinitive,present,,,\r\npossum,posse_potui_-,potesse,,infinitive,present,,,12\r\npossum,posse_potui_-,potēns,,verb_participle,present,,,\r\npossum,posse_potui_-,poteram,,indicative,imperfect,singular,1st,\r\npossum,posse_potui_-,poterās,,indicative,imperfect,singular,2nd,\r\npossum,posse_potui_-,poterat,,indicative,imperfect,singular,3rd,\r\npossum,posse_potui_-,poterāmus,,indicative,imperfect,plural,1st,\r\npossum,posse_potui_-,poterātis,,indicative,imperfect,plural,2nd,\r\npossum,posse_potui_-,poterant,,indicative,imperfect,plural,3rd,\r\npossum,posse_potui_-,possem,,subjunctive,imperfect,singular,1st,\r\npossum,posse_potui_-,possēs,,subjunctive,imperfect,singular,2nd,\r\npossum,posse_potui_-,posset,,subjunctive,imperfect,singular,3rd,\r\npossum,posse_potui_-,possēmus,,subjunctive,imperfect,plural,1st,\r\npossum,posse_potui_-,possētis,,subjunctive,imperfect,plural,2nd,\r\npossum,posse_potui_-,possent,,subjunctive,imperfect,plural,3rd,\r\npossum,posse_potui_-,poterō,,indicative,future,singular,1st,\r\npossum,posse_potui_-,poteris,,indicative,future,singular,2nd,\r\npossum,posse_potui_-,poterit,,indicative,future,singular,3rd,\r\npossum,posse_potui_-,poterimus,,indicative,future,plural,1st,\r\npossum,posse_potui_-,poteritis,,indicative,future,plural,2nd,\r\npossum,posse_potui_-,poterunt,,indicative,future,plural,3rd,\r\npossum,posse_potui_-,poterint,,indicative,future,plural,3rd,12\r\npossum,posse_potui_-,potuī,,indicative,perfect,singular,1st,\r\npossum,posse_potui_-,potuistī,,indicative,perfect,singular,2nd,\r\npossum,posse_potui_-,potuit,,indicative,perfect,singular,3rd,\r\npossum,posse_potui_-,potuimus,,indicative,perfect,plural,1st,\r\npossum,posse_potui_-,potuistis,,indicative,perfect,plural,2nd,\r\npossum,posse_potui_-,potuērunt,,indicative,perfect,plural,3rd,\r\npossum,posse_potui_-,potuerim,,subjunctive,perfect,singular,1st,\r\npossum,posse_potui_-,potuerīs,,subjunctive,perfect,singular,2nd,\r\npossum,posse_potui_-,potuerit,,subjunctive,perfect,singular,3rd,\r\npossum,posse_potui_-,potuerīmus,,subjunctive,perfect,plural,1st,\r\npossum,posse_potui_-,potuerītis,,subjunctive,perfect,plural,2nd,\r\npossum,posse_potui_-,potuerint,,subjunctive,perfect,plural,3rd,\r\npossum,posse_potui_-,potuisse,,infinitive,perfect,,,\r\npossum,posse_potui_-,potueram,,indicative,pluperfect,singular,1st,\r\npossum,posse_potui_-,potuerās,,indicative,pluperfect,singular,2nd,\r\npossum,posse_potui_-,potuerat,,indicative,pluperfect,singular,3rd,\r\npossum,posse_potui_-,potuerāmus,,indicative,pluperfect,plural,1st,\r\npossum,posse_potui_-,potuerātis,,indicative,pluperfect,plural,2nd,\r\npossum,posse_potui_-,potuerant,,indicative,pluperfect,plural,3rd,\r\npossum,posse_potui_-,potuissem,,subjunctive,pluperfect,singular,1st,\r\npossum,posse_potui_-,potuissēs,,subjunctive,pluperfect,singular,2nd,\r\npossum,posse_potui_-,potuisset,,subjunctive,pluperfect,singular,3rd,\r\npossum,posse_potui_-,potuissēmus,,subjunctive,pluperfect,plural,1st,\r\npossum,posse_potui_-,potuissētis,,subjunctive,pluperfect,plural,2nd,\r\npossum,posse_potui_-,potuissent,,subjunctive,pluperfect,plural,3rd,\r\npossum,posse_potui_-,potuerō,,indicative,future_perfect,singular,1st,\r\npossum,posse_potui_-,potueris,,indicative,future_perfect,singular,2nd,\r\npossum,posse_potui_-,potuerit,,indicative,future_perfect,singular,3rd,\r\npossum,posse_potui_-,potuerimus,,indicative,future_perfect,plural,1st,\r\npossum,posse_potui_-,potueritis,,indicative,future_perfect,plural,2nd,\r\npossum,posse_potui_-,potuerint,,indicative,future_perfect,plural,3rd,";

var verbFormFootnotesCSV = "Index,Text\r\n1,Old forms.\r\n2,Alternate forms.\r\n3,\"The original forms of ferrem and ferre are fer-sēm and fer-se, respectively.\"\r\n4,Gerundive (Future Passive Participle)\r\n5,singular\r\n6,\"The verbs nōlō and malō are compounds of volo. They therefore attach nō- or mā- to the beginning of each verb, in place of vo- or vu-. Exceptions to this are found in the present tense: nōlō nōlumus mālō mālumus nōn vīs nōn vultis māvīs māvultis nōn vult nōlunt māvult mālunt In addition, nōlō is the only verb of the three that has present and future tense imperative forms of the verb: nōlī, nōlīte, and nōlītō, nōlītōte, respectively.\"\r\n7,An earlier form.\r\n8,\"The perfect passive participle ending will change according to its subject's gender, number and case. Endings shown here are the masculine, feminine and neuter nominative singular.\"\r\n9,A passive form of the verb that is used impersonally is itum est.\r\n10,\"While the perfect form of this verb is regular, ii usually contracts to i when it is followed by an s. Thus, īstī, īstis and īsse\"\r\n11,It is rare that the “v” appear as a form.\r\n12,Used by early writers.";

var verbParticipleSuffixesCSV = "Ending,Conjugation,Voice,Mood,Tense,Number,Person,Case,Type,Footnote\nāns,1st,active,verb participle,present,,,,regular,\nantis,1st,active,verb participle,present,,,,irregular,\nēns,2nd,active,verb participle,present,,,,regular,\nventis,2nd,active,verb participle,present,,,,irregular,\nēns,3rd,active,verb participle,present,,,,regular,\nentis,3rd,active,verb participle,present,,,,irregular,\niēns,4th,active,verb participle,present,,,,regular,\nientis,4th,active,verb participle,present,,,,irregular,\n,1st,active,verb participle,perfect,,,,,\n,2nd,active,verb participle,perfect,,,,,\n,3rd,active,verb participle,perfect,,,,,\n,4th,active,verb participle,perfect,,,,,\nātūrus,1st,active,verb participle,future,,,,regular,\na,1st,active,verb participle,future,,,,irregular,\num,1st,active,verb participle,future,,,,irregular,\ntūrus,2nd,active,verb participle,future,,,,regular,\na,2nd,active,verb participle,future,,,,irregular,\num,2nd,active,verb participle,future,,,,irregular,\ntūrus,3rd,active,verb participle,future,,,,regular,\na,3rd,active,verb participle,future,,,,irregular,\num,3rd,active,verb participle,future,,,,irregular,\nītūrus esse,4th,active,verb participle,future,,,,regular,\n,1st,passive,verb participle,present,,,,,\n,2nd,passive,verb participle,present,,,,,\n,3rd,passive,verb participle,present,,,,,\n,4th,passive,verb participle,present,,,,,\nātus,1st,passive,verb participle,perfect,,,,regular,\na,1st,passive,verb participle,perfect,,,,irregular,\num,1st,passive,verb participle,perfect,,,,irregular,\nitus,2nd,passive,verb participle,perfect,,,,regular,\na,2nd,passive,verb participle,perfect,,,,irregular,\num,2nd,passive,verb participle,perfect,,,,irregular,\ntus,3rd,passive,verb participle,perfect,,,,regular,\na,3rd,passive,verb participle,perfect,,,,irregular,\num,3rd,passive,verb participle,perfect,,,,irregular,\nītus,4th,passive,verb participle,perfect,,,,regular,\na,4th,passive,verb participle,perfect,,,,irregular,\num,4th,passive,verb participle,perfect,,,,irregular,\nandus,1st,passive,verb participle,future,,,,regular,\na,1st,passive,verb participle,future,,,,irregular,\num,1st,passive,verb participle,future,,,,irregular,\nendus,2nd,passive,verb participle,future,,,,regular,\na,2nd,passive,verb participle,future,,,,irregular,\num,2nd,passive,verb participle,future,,,,irregular,\nendus,3rd,passive,verb participle,future,,,,regular,\niendus,4th,passive,verb participle,future,,,,regular,\na,4th,passive,verb participle,future,,,,irregular,\num,4th,passive,verb participle,future,,,,irregular,\n";

var verbSupineSuffixesCSV = "Ending,Conjugation,Voice,Mood,Tense,Number,Person,Case,Type,Footnote\nātum,1st,active,supine,,,,accusative,regular,\nitum,2nd,active,supine,,,,accusative,regular,\ntum,3rd,active,supine,,,,accusative,regular,\nītum,4th,active,supine,,,,accusative,regular,\nātū,1st,active,supine,,,,ablative,regular,\nitū,2nd,active,supine,,,,ablative,regular,\ntū,3rd,active,supine,,,,ablative,regular,\nītū,4th,active,supine,,,,ablative,regular,\n,1st,passive,supine,,,,accusative,,\n,2nd,passive,supine,,,,accusative,,\n,3rd,passive,supine,,,,accusative,,\n,4th,passive,supine,,,,accusative,,\n,1st,passive,supine,,,,ablative,,\n,2nd,passive,supine,,,,ablative,,\n,3rd,passive,supine,,,,ablative,,\n,4th,passive,supine,,,,ablative,,\n";

var papaparse = createCommonjsModule(function (module, exports) {
/*!
	Papa Parse
	v4.3.7
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
			this._sendError(reader.error.message);
		};

	}
	FileStreamer.prototype = Object.create(ChunkStreamer.prototype);
	FileStreamer.prototype.constructor = FileStreamer;


	function StringStreamer(config)
	{
		config = config || {};
		ChunkStreamer.call(this, config);
		var remaining;
		this.stream = function(s)
		{
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
		/** Allows for no quoteChar by setting quoteChar to undefined in config */
		if (config.quoteChar === undefined){
			var quoteChar = '"';
		} else {
			var quoteChar = config.quoteChar;
		}

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

/*
 Define grammatical features of a language. Those grammatical features definitions will also be used by morphological
 analyzer's language modules as well.
 */
class LatinLanguageDataset extends LanguageDataset {
  constructor () {
    super(LatinLanguageDataset.languageID);

    this.features = this.model.typeFeatures;
    this.features.set(Feature.types.footnote, new Feature(Feature.types.footnote, [], LatinLanguageDataset.languageID));
    this.features.set(Feature.types.fullForm, new Feature(Feature.types.fullForm, [], LatinLanguageDataset.languageID));

    // Create an importer with default values for every feature
    for (let feature of this.features.values()) {
      feature.addImporter(new FeatureImporter(feature.values, true));
    }

    // Create importer mapping for special language-specific values
    this.features.get(Feature.types.declension).getImporter()
      .map('1st 2nd', [Constants.ORD_1ST, Constants.ORD_2ND]);
    this.features.get(Feature.types.gender).getImporter()
      .map('masculine feminine', [Constants.GEND_MASCULINE, Constants.GEND_FEMININE]);

    this.features.get(Feature.types.tense).getImporter()
      .map('future_perfect', Constants.TENSE_FUTURE_PERFECT);
  }

  static get languageID () {
    return Constants.LANG_LATIN
  }

  // For noun and adjectives
  addSuffixes (partOfSpeech, data) {
    // An order of columns in a data CSV file
    const n = {
      suffix: 0,
      number: 1,
      grmCase: 2,
      declension: 3,
      gender: 4,
      type: 5,
      footnote: 6
    };
    // Some suffix values will mean a lack of suffix, they will be mapped to a null
    let noSuffixValue = '-';

    // First row are headers
    for (let i = 1; i < data.length; i++) {
      const item = data[i];
      let suffix = item[n.suffix];
      // Handle special suffix values
      if (suffix === noSuffixValue) {
        suffix = null;
      }

      let features = [partOfSpeech,
        this.features.get(Feature.types.number).createFromImporter(item[n.number]),
        this.features.get(Feature.types.grmCase).createFromImporter(item[n.grmCase]),
        this.features.get(Feature.types.declension).createFromImporter(item[n.declension]),
        this.features.get(Feature.types.gender).createFromImporter(item[n.gender]),
        this.features.get(Feature.types.type).createFromImporter(item[n.type])];
      if (item[n.footnote]) {
        // There can be multiple footnote indexes separated by spaces
        let indexes = item[n.footnote].split(' ');
        features.push(this.features.get(Feature.types.footnote).createFeatures(indexes));
      }
      this.addInflection(partOfSpeech.value, Suffix, suffix, features);
    }
  }

  // For pronouns
  addPronounForms (partOfSpeech, data) {
    const n = {
      formSet: 0,
      headword: 1,
      grmClass: 2,
      person: 3,
      number: 4,
      case: 5,
      type: 6,
      form: 7,
      footnote: 8
    };

    // First row are headers
    for (let i = 1; i < data.length; i++) {
      const item = data[i];
      let features = [partOfSpeech];
      //    if (item[n.formSet]) {
      //      features.push(languageModel.features[Feature.types.formSet]createFromImporter(item[0]))
      //    }
      // TODO read a headword into a principalPars array
      //  if (item[n.headword]) { }
      if (item[n.grmClass]) {
        features.push(this.features.get(Feature.types.grmClass).createFromImporter(item[n.grmClass]));
      }
      if (item[n.person]) {
        features.push(this.features.get(Feature.types.person).createFromImporter(item[n.person]));
      }
      if (item[n.number]) {
        features.push(this.features.get(Feature.types.number).createFromImporter(item[n.number]));
      }
      if (item[n.case]) {
        features.push(this.features.get(Feature.types.case).createFromImporter(item[n.case]));
      }
      if (item[n.type]) {
        features.push(this.features.get(Feature.types.type).createFromImporter(item[n.type]));
      }
      let form = item[n.form] ? item[n.form] : '';

      // Footnotes
      if (item[n.footnote]) {
        // There can be multiple footnote indexes separated by spaces
        let indexes = item[n.footnote].split(' ');
        features.push(this.features.get(Feature.types.footnote).createFeatures(indexes));
      }
      this.addInflection(partOfSpeech.value, Form, form, features);
    }
  }

  // For verbs
  addVerbSuffixes (partOfSpeech, data) {
    // Some suffix values will mean a lack of suffix, they will be mapped to a null
    let noSuffixValue = '-';

    // First row are headers
    for (let i = 1; i < data.length; i++) {
      const item = data[i];
      let suffix = item[0];
      // Handle special suffix values
      if (suffix === noSuffixValue) {
        suffix = null;
      }

      let features = [partOfSpeech];
      let columns = [
        Feature.types.conjugation,
        Feature.types.voice,
        Feature.types.mood,
        Feature.types.tense,
        Feature.types.number,
        Feature.types.person,
        Feature.types.case,
        Feature.types.type
      ];
      columns.forEach((c, j) => {
        try {
          features.push(this.features.get(c).createFromImporter(item[j + 1]));
        } catch (e) {
          // ignore empty or non-parsable values
        }
      });

      let grammartype = item[7];
      // Type information can be empty if no ending is provided
      if (grammartype) {
        features.push(this.features.get(Feature.types.type).createFromImporter(grammartype));
      }
      // Footnotes
      if (item[9]) {
        // There can be multiple footnote indexes separated by spaces
        let indexes = item[9].split(' ');
        features.push(this.features.get(Feature.types.footnote).createFeatures(indexes));
      }
      this.addInflection(partOfSpeech.value, Suffix, suffix, features);
    }
  }

  addVerbParticipleSuffixes (partOfSpeech, data) {
    // Some suffix values will mean a lack of suffix, they will be mapped to a null
    let noSuffixValue = '-';

    // First row are headers
    for (let i = 1; i < data.length; i++) {
      const item = data[i];
      let suffix = item[0];
      // Handle special suffix values
      if (suffix === noSuffixValue) {
        suffix = null;
      }

      let features = [partOfSpeech];
      let columns = [
        Feature.types.conjugation,
        Feature.types.voice,
        Feature.types.mood,
        Feature.types.tense,
        Feature.types.number,
        Feature.types.person,
        Feature.types.case,
        Feature.types.type
      ];
      columns.forEach((c, j) => {
        try {
          features.push(this.features.get(c).createFromImporter(item[j + 1]));
        } catch (e) {
          // ignore empty or non-parsable values
        }
      });

      let grammartype = item[7];
      // Type information can be empty if no ending is provided
      if (grammartype) {
        features.push(this.features.get(Feature.types.type).createFromImporter(grammartype));
      }
      this.addInflection(partOfSpeech.value, Suffix, suffix, features);
    }
  }

  addVerbSupineSuffixes (partOfSpeech, data) {
    // Some suffix values will mean a lack of suffix, they will be mapped to a null
    let noSuffixValue = '-';

    // First row are headers
    for (let i = 1; i < data.length; i++) {
      const item = data[i];
      let suffix = item[0];
      // Handle special suffix values
      if (suffix === noSuffixValue) {
        suffix = null;
      }

      let features = [partOfSpeech];
      let columns = [
        Feature.types.conjugation,
        Feature.types.voice,
        Feature.types.mood,
        Feature.types.tense,
        Feature.types.number,
        Feature.types.person,
        Feature.types.case,
        Feature.types.type
      ];
      columns.forEach((c, j) => {
        try {
          features.push(this.features.get(c).createFromImporter(item[j + 1]));
        } catch (e) {
          // ignore empty or non-parsable values
        }
      });

      let grammartype = item[7];
      // Type information can be empty if no ending is provided
      if (grammartype) {
        features.push(this.features.get(Feature.types.type).createFromImporter(grammartype));
      }
      this.addInflection(partOfSpeech.value, Suffix, suffix, features);
    }
  }

  // for Lemmas
  addVerbForms (partOfSpeech, data) {
    // First row are headers
    for (let i = 1; i < data.length; i++) {
      const item = data[i];
      let lemma = item[0];
      // let principalParts = item[1].split(/_/)
      let form = item[2];

      // Lemma,PrincipalParts,Form,Voice,Mood,Tense,Number,Person,Footnote
      let features = [
        partOfSpeech,
        this.features.get(Feature.types.fullForm).createFromImporter(lemma)
      ];
      if (item[3]) {
        features.push(this.features.get(Feature.types.voice).createFromImporter(item[3]));
      }
      if (item[4]) {
        features.push(this.features.get(Feature.types.mood).createFromImporter(item[4]));
      }
      if (item[5]) {
        features.push(this.features.get(Feature.types.tense).createFromImporter(item[5]));
      }
      if (item[6]) {
        features.push(this.features.get(Feature.types.number).createFromImporter(item[6]));
      }
      if (item[7]) {
        features.push(this.features.get(Feature.types.person).createFromImporter(item[7]));
      }

      // Footnotes
      if (item[8]) {
        // There can be multiple footnote indexes separated by spaces
        let indexes = item[8].split(' ');
        features.push(this.features.get(Feature.types.footnote).createFeatures(indexes));
      }
      this.addInflection(partOfSpeech.value, Form, form, features);
    }
  }

  addFootnotes (partOfSpeech, classType, data) {
    // First row are headers
    for (let i = 1; i < data.length; i++) {
      this.addFootnote(partOfSpeech.value, classType, data[i][0], data[i][1]);
    }
  }

  loadData () {
    let partOfSpeech;
    let suffixes;
    let forms;
    let footnotes;

    // Nouns
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_NOUN);
    suffixes = papaparse.parse(nounSuffixesCSV, {});
    this.addSuffixes(partOfSpeech, suffixes.data);
    footnotes = papaparse.parse(nounFootnotesCSV, {});
    this.addFootnotes(partOfSpeech, Suffix, footnotes.data);

    // Pronouns
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_PRONOUN);
    forms = papaparse.parse(pronounFormsCSV, {});
    this.addPronounForms(partOfSpeech, forms.data);
    footnotes = papaparse.parse(pronounFootnotesCSV, {});
    this.addFootnotes(partOfSpeech, Form, footnotes.data);

    // Adjectives
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_ADJECTIVE);
    suffixes = papaparse.parse(adjectiveSuffixesCSV, {});
    this.addSuffixes(partOfSpeech, suffixes.data);
    footnotes = papaparse.parse(adjectiveFootnotesCSV, {});
    this.addFootnotes(partOfSpeech, Suffix, footnotes.data);

    // Verbs
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_VERB);
    suffixes = papaparse.parse(verbSuffixesCSV, {});
    this.addVerbSuffixes(partOfSpeech, suffixes.data);
    footnotes = papaparse.parse(verbFootnotesCSV, {});
    this.addFootnotes(partOfSpeech, Suffix, footnotes.data);
    forms = papaparse.parse(verbFormsCSV, {});
    this.addVerbForms(partOfSpeech, forms.data);
    footnotes = papaparse.parse(verbFormFootnotesCSV, {});
    this.addFootnotes(partOfSpeech, Form, footnotes.data);

    // Verb Participles
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_VERB_PARTICIPLE);
    suffixes = papaparse.parse(verbParticipleSuffixesCSV, {});
    this.addVerbParticipleSuffixes(partOfSpeech, suffixes.data);

    // Verb Supine
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_SUPINE);
    suffixes = papaparse.parse(verbSupineSuffixesCSV, {});
    this.addVerbSupineSuffixes(partOfSpeech, suffixes.data);

    this.dataLoaded = true;
    return this
  }

  static getObligatoryMatchList (inflection) {
    if (inflection.constraints.fullFormBased) {
      return [Feature.types.fullForm]
    } else {
      // Default value for suffix matching
      return [Feature.types.part]
    }
  }

  static getOptionalMatchList (inflection) {
    const featureOptions = [
      Feature.types.grmCase,
      Feature.types.declension,
      Feature.types.gender,
      Feature.types.number,
      Feature.types.voice,
      Feature.types.mood,
      Feature.types.tense,
      Feature.types.person
    ];
    return featureOptions.filter(f => inflection[f])
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

var nounSuffixesCSV$1 = "Ending,Number,Case,Declension,Gender,Type,Primary,Footnote\nα,dual,accusative,1st,feminine,regular,primary,\nά,dual,accusative,1st,feminine,regular,,\nᾶ,dual,accusative,1st,feminine,regular,,2\nαιν,dual,dative,1st,feminine,regular,primary,\nαῖν,dual,dative,1st,feminine,regular,,\nαιιν,dual,dative,1st,feminine,irregular,,\nαιν,dual,genitive,1st,feminine,regular,primary,\nαῖν,dual,genitive,1st,feminine,regular,,\nαιιν,dual,genitive,1st,feminine,irregular,,\nα,dual,nominative,1st,feminine,regular,primary,\nά,dual,nominative,1st,feminine,regular,,\nᾶ,dual,nominative,1st,feminine,regular,,2\nα,dual,vocative,1st,feminine,regular,primary,\nά,dual,vocative,1st,feminine,regular,,\nᾶ,dual,vocative,1st,feminine,regular,,2\nα,dual,accusative,1st,masculine,regular,primary,\nά,dual,accusative,1st,masculine,regular,,\nᾶ,dual,accusative,1st,masculine,regular,,2\nαιν,dual,dative,1st,masculine,regular,primary,\nαῖν,dual,dative,1st,masculine,regular,,\nαιιν,dual,dative,1st,masculine,irregular,,\nαιν,dual,genitive,1st,masculine,regular,primary,\nαῖν,dual,genitive,1st,masculine,regular,,\nαιιν,dual,genitive,1st,masculine,irregular,,\nα,dual,nominative,1st,masculine,regular,primary,\nά,dual,nominative,1st,masculine,regular,,\nᾶ,dual,nominative,1st,masculine,regular,,2\nα,dual,vocative,1st,masculine,regular,primary,\nά,dual,vocative,1st,masculine,regular,,\nᾶ,dual,vocative,1st,masculine,regular,,2\nας,plural,accusative,1st,feminine,regular,primary,\nάς,plural,accusative,1st,feminine,regular,,\nᾶς,plural,accusative,1st,feminine,regular,,2\nανς,plural,accusative,1st,feminine,irregular,,\nαις,plural,accusative,1st,feminine,irregular,,\nαις,plural,dative,1st,feminine,regular,primary,\nαῖς,plural,dative,1st,feminine,regular,,\nῃσι,plural,dative,1st,feminine,irregular,,44\nῃσιν,plural,dative,1st,feminine,irregular,,4 44\nῃς,plural,dative,1st,feminine,irregular,,44\nαισι,plural,dative,1st,feminine,irregular,,44\nαισιν,plural,dative,1st,feminine,irregular,,4 44\nῶν,plural,genitive,1st,feminine,regular,primary,\nάων,plural,genitive,1st,feminine,irregular,,\nέων,plural,genitive,1st,feminine,irregular,,\nήων,plural,genitive,1st,feminine,irregular,,\nᾶν,plural,genitive,1st,feminine,irregular,,\nαι,plural,nominative,1st,feminine,regular,primary,\nαί,plural,nominative,1st,feminine,regular,,\nαῖ,plural,nominative,1st,feminine,regular,,2\nαι,plural,vocative,1st,feminine,regular,primary,\nαί,plural,vocative,1st,feminine,regular,,\nαῖ,plural,vocative,1st,feminine,regular,,2\nας,plural,accusative,1st,masculine,regular,primary,\nάς,plural,accusative,1st,masculine,regular,,\nᾶς,plural,accusative,1st,masculine,regular,,3\nανς,plural,accusative,1st,masculine,irregular,,\nαις,plural,accusative,1st,masculine,irregular,,\nαις,plural,dative,1st,masculine,regular,primary,\nαῖς,plural,dative,1st,masculine,regular,,\nῃσι,plural,dative,1st,masculine,irregular,,44\nῃσιν,plural,dative,1st,masculine,irregular,,4 44\nῃς,plural,dative,1st,masculine,irregular,,44\nαισι,plural,dative,1st,masculine,irregular,,44\nαισιν,plural,dative,1st,masculine,irregular,,4 44\nῶν,plural,genitive,1st,masculine,regular,primary,\nάων,plural,genitive,1st,masculine,irregular,,\nέων,plural,genitive,1st,masculine,irregular,,\nήων,plural,genitive,1st,masculine,irregular,,\nᾶν,plural,genitive,1st,masculine,irregular,,\nαι,plural,nominative,1st,masculine,regular,primary,\nαί,plural,nominative,1st,masculine,regular,,\nαῖ,plural,nominative,1st,masculine,regular,,3\nαι,plural,vocative,1st,masculine,regular,primary,\nαί,plural,vocative,1st,masculine,regular,,\nαῖ,plural,vocative,1st,masculine,regular,,3\nαν,singular,accusative,1st,feminine,regular,primary,\nην,singular,accusative,1st,feminine,regular,primary,\nήν,singular,accusative,1st,feminine,regular,,\nᾶν,singular,accusative,1st,feminine,regular,,2\nῆν,singular,accusative,1st,feminine,regular,,2\nάν,singular,accusative,1st,feminine,irregular,,63\nᾳ,singular,dative,1st,feminine,regular,primary,\nῃ,singular,dative,1st,feminine,regular,primary,\nῇ,singular,dative,1st,feminine,regular,,2\nᾷ,singular,dative,1st,feminine,regular,,2\nηφι,singular,dative,1st,feminine,irregular,,45\nηφιν,singular,dative,1st,feminine,irregular,,4 45\nῆφι,singular,dative,1st,feminine,irregular,,45\nῆφιv,singular,dative,1st,feminine,irregular,,4 45\nας,singular,genitive,1st,feminine,regular,primary,\nης,singular,genitive,1st,feminine,regular,primary,\nῆs,singular,genitive,1st,feminine,regular,,\nᾶs,singular,genitive,1st,feminine,regular,,2\nηφι,singular,genitive,1st,feminine,irregular,,45\nηφιν,singular,genitive,1st,feminine,irregular,,4 45\nῆφι,singular,genitive,1st,feminine,irregular,,45\nῆφιv,singular,genitive,1st,feminine,irregular,,4 45\nα,singular,nominative,1st,feminine,regular,primary,\nη,singular,nominative,1st,feminine,regular,primary,1\nή,singular,nominative,1st,feminine,regular,,\nᾶ,singular,nominative,1st,feminine,regular,,2\nῆ,singular,nominative,1st,feminine,regular,,2\nά,singular,nominative,1st,feminine,irregular,,63\nα,singular,vocative,1st,feminine,regular,primary,\nη,singular,vocative,1st,feminine,regular,primary,\nή,singular,vocative,1st,feminine,regular,,\nᾶ,singular,vocative,1st,feminine,regular,,2\nῆ,singular,vocative,1st,feminine,regular,,2\nά,singular,vocative,1st,feminine,irregular,,63\nαν,singular,accusative,1st,masculine,regular,primary,\nην,singular,accusative,1st,masculine,regular,primary,3\nήν,singular,accusative,1st,masculine,regular,,\nᾶν,singular,accusative,1st,masculine,regular,,3\nῆν,singular,accusative,1st,masculine,regular,,3\nεα,singular,accusative,1st,masculine,irregular,,\nᾳ,singular,dative,1st,masculine,regular,primary,\nῃ,singular,dative,1st,masculine,regular,primary,\nῇ,singular,dative,1st,masculine,regular,,\nᾷ,singular,dative,1st,masculine,regular,,3\nῆ,singular,dative,1st,masculine,regular,,3\nηφι,singular,dative,1st,masculine,irregular,,45\nηφιν,singular,dative,1st,masculine,irregular,,4 45\nῆφι,singular,dative,1st,masculine,irregular,,45\nῆφιv,singular,dative,1st,masculine,irregular,,4 45\nου,singular,genitive,1st,masculine,regular,primary,\nοῦ,singular,genitive,1st,masculine,regular,,\nαο,singular,genitive,1st,masculine,irregular,,\nεω,singular,genitive,1st,masculine,irregular,,\nηφι,singular,genitive,1st,masculine,irregular,,45\nηφιν,singular,genitive,1st,masculine,irregular,,4 45\nῆφι,singular,genitive,1st,masculine,irregular,,45\nῆφιv,singular,genitive,1st,masculine,irregular,,4 45\nω,singular,genitive,1st,masculine,irregular,,\nα,singular,genitive,1st,masculine,irregular,,\nας,singular,nominative,1st,masculine,regular,primary,\nης,singular,nominative,1st,masculine,regular,primary,\nής,singular,nominative,1st,masculine,regular,,\nᾶs,singular,nominative,1st,masculine,regular,,3\nῆs,singular,nominative,1st,masculine,regular,,3\nα,singular,vocative,1st,masculine,regular,primary,\nη,singular,vocative,1st,masculine,regular,primary,\nά,singular,vocative,1st,masculine,regular,,\nᾶ,singular,vocative,1st,masculine,regular,,3\nῆ,singular,vocative,1st,masculine,regular,,3\nω,dual,accusative,2nd,masculine feminine,regular,primary,\nώ,dual,accusative,2nd,masculine feminine,regular,,5\nοιν,dual,dative,2nd,masculine feminine,regular,primary,\nοῖν,dual,dative,2nd,masculine feminine,regular,,5\nοιιν,dual,dative,2nd,masculine feminine,irregular,,\nῴν,dual,dative,2nd,masculine feminine,irregular,,7\nοιν,dual,genitive,2nd,masculine feminine,regular,primary,\nοῖν,dual,genitive,2nd,masculine feminine,regular,,5\nοιιν,dual,genitive,2nd,masculine feminine,irregular,,\nῴν,dual,genitive,2nd,masculine feminine,irregular,,7\nω,dual,nominative,2nd,masculine feminine,regular,primary,60\nώ,dual,nominative,2nd,masculine feminine,regular,,60\nω,dual,vocative,2nd,masculine feminine,regular,primary,\nώ,dual,vocative,2nd,masculine feminine,regular,,5\nω,dual,accusative,2nd,neuter,regular,primary,\nώ,dual,accusative,2nd,neuter,regular,,6\nοιν,dual,dative,2nd,neuter,regular,primary,\nοῖν,dual,dative,2nd,neuter,regular,,6\nοιιν,dual,dative,2nd,neuter,irregular,,\nοιν,dual,genitive,2nd,neuter,regular,primary,\nοῖν,dual,genitive,2nd,neuter,regular,,6\nοιιν,dual,genitive,2nd,neuter,irregular,,\nω,dual,nominative,2nd,neuter,regular,primary,\nώ,dual,nominative,2nd,neuter,regular,,6\nω,dual,vocative,2nd,neuter,regular,primary,\nώ,dual,vocative,2nd,neuter,regular,,6\nους,plural,accusative,2nd,masculine feminine,regular,primary,\nούς,plural,accusative,2nd,masculine feminine,regular,,41\nοῦς,plural,accusative,2nd,masculine feminine,regular,,5\nονς,plural,accusative,2nd,masculine feminine,irregular,,\nος,plural,accusative,2nd,masculine feminine,irregular,,\nως,plural,accusative,2nd,masculine feminine,irregular,,\nοις,plural,accusative,2nd,masculine feminine,irregular,,\nώς,plural,accusative,2nd,masculine feminine,irregular,,7\nοις,plural,dative,2nd,masculine feminine,regular,primary,\nοῖς,plural,dative,2nd,masculine feminine,regular,,5\nοισι,plural,dative,2nd,masculine feminine,irregular,,\nοισιν,plural,dative,2nd,masculine feminine,irregular,,4\nῴς,plural,dative,2nd,masculine feminine,irregular,,7\nόφι,plural,dative,2nd,masculine feminine,irregular,,45\nόφιv,plural,dative,2nd,masculine feminine,irregular,,4 45\nων,plural,genitive,2nd,masculine feminine,regular,primary,\nῶν,plural,genitive,2nd,masculine feminine,regular,,5\nών,plural,genitive,2nd,masculine feminine,irregular,,7\nόφι,plural,genitive,2nd,masculine feminine,irregular,,45\nόφιv,plural,genitive,2nd,masculine feminine,irregular,,4 45\nοι,plural,nominative,2nd,masculine feminine,regular,primary,\nοί,plural,nominative,2nd,masculine feminine,regular,,41\nοῖ,plural,nominative,2nd,masculine feminine,regular,,5\nῴ,plural,nominative,2nd,masculine feminine,irregular,,7\nοι,plural,vocative,2nd,masculine feminine,regular,primary,\nοί,plural,vocative,2nd,masculine feminine,regular,,41\nοῖ,plural,vocative,2nd,masculine feminine,regular,,5\nα,plural,accusative,2nd,neuter,regular,primary,\nᾶ,plural,accusative,2nd,neuter,regular,,6\nοις,plural,dative,2nd,neuter,regular,primary,\nοῖς,plural,dative,2nd,neuter,regular,,6\nοισι,plural,dative,2nd,neuter,irregular,,\nοισιν,plural,dative,2nd,neuter,irregular,,4\nόφι,plural,dative,2nd,neuter,irregular,,45\nόφιv,plural,dative,2nd,neuter,irregular,,4 45\nων,plural,genitive,2nd,neuter,regular,primary,\nῶν,plural,genitive,2nd,neuter,regular,,6\nόφι,plural,genitive,2nd,neuter,irregular,,45\nόφιv,plural,genitive,2nd,neuter,irregular,,4 45\nα,plural,nominative,2nd,neuter,regular,primary,\nᾶ,plural,nominative,2nd,neuter,regular,,6\nα,plural,vocative,2nd,neuter,regular,primary,\nᾶ,plural,vocative,2nd,neuter,regular,,6\nον,singular,accusative,2nd,masculine feminine,regular,primary,\nόν,singular,accusative,2nd,masculine feminine,regular,primary,41\nουν,singular,accusative,2nd,masculine feminine,regular,,5\nοῦν,singular,accusative,2nd,masculine feminine,regular,,5\nω,singular,accusative,2nd,masculine feminine,irregular,,7 5\nωv,singular,accusative,2nd,masculine feminine,irregular,,7 59\nώ,singular,accusative,2nd,masculine feminine,irregular,,7 42 59\nών,singular,accusative,2nd,masculine feminine,irregular,,7 59\nῳ,singular,dative,2nd,masculine feminine,regular,primary,\nῷ,singular,dative,2nd,masculine feminine,regular,,5\nῴ,singular,dative,2nd,masculine feminine,irregular,,7\nόφι,singular,dative,2nd,masculine feminine,irregular,,45\nόφιv,singular,dative,2nd,masculine feminine,irregular,,4 45\nου,singular,genitive,2nd,masculine feminine,regular,primary,\nοῦ,singular,genitive,2nd,masculine feminine,regular,,5\nοιο,singular,genitive,2nd,masculine feminine,irregular,,\nοο,singular,genitive,2nd,masculine feminine,irregular,,\nω,singular,genitive,2nd,masculine feminine,irregular,,\nώ,singular,genitive,2nd,masculine feminine,irregular,,7\nόφι,singular,genitive,2nd,masculine feminine,irregular,,45\nόφιv,singular,genitive,2nd,masculine feminine,irregular,,4 45\nος,singular,nominative,2nd,masculine feminine,regular,primary,\nους,singular,nominative,2nd,masculine feminine,regular,,5\noῦς,singular,nominative,2nd,masculine feminine,regular,,5\nός,singular,nominative,2nd,masculine feminine,regular,,\nώς,singular,nominative,2nd,masculine feminine,irregular,,7 42\nως,singular,nominative,2nd,masculine feminine,irregular,,\nε,singular,vocative,2nd,masculine feminine,regular,primary,\nέ,singular,vocative,2nd,masculine feminine,regular,,\nοu,singular,vocative,2nd,masculine feminine,regular,,5\nοῦ,singular,vocative,2nd,masculine feminine,regular,,42\nός,singular,vocative,2nd,masculine feminine,irregular,,57\nον,singular,accusative,2nd,neuter,regular,primary,\nοῦν,singular,accusative,2nd,neuter,regular,,6\nῳ,singular,dative,2nd,neuter,regular,primary,\nῷ,singular,dative,2nd,neuter,regular,,6\nόφι,singular,dative,2nd,neuter,irregular,,45\nόφιv,singular,dative,2nd,neuter,irregular,,4 45\nου,singular,genitive,2nd,neuter,regular,primary,\nοῦ,singular,genitive,2nd,neuter,regular,,6\nοο,singular,genitive,2nd,neuter,irregular,,\nοιο,singular,genitive,2nd,neuter,irregular,,\nω,singular,genitive,2nd,neuter,irregular,,\nόφι,singular,genitive,2nd,neuter,irregular,,45\nόφιv,singular,genitive,2nd,neuter,irregular,,4 45\nον,singular,nominative,2nd,neuter,regular,primary,\nοῦν,singular,nominative,2nd,neuter,regular,,6\nον,singular,vocative,2nd,neuter,regular,primary,\nοῦν,singular,vocative,2nd,neuter,regular,,6\nε,dual,accusative,3rd,masculine feminine,regular,primary,\nει,dual,accusative,3rd,masculine feminine,regular,,\nῆ,dual,accusative,3rd,masculine feminine,regular,,18\nω,dual,accusative,3rd,masculine feminine,irregular,,32\nῖ,dual,accusative,3rd,masculine feminine,irregular,,33\nεε,dual,accusative,3rd,masculine feminine,irregular,,16 55 61\nοιν,dual,dative,3rd,masculine feminine,regular,primary,\nοῖν,dual,dative,3rd,masculine feminine,regular,,\nοιιν,dual,dative,3rd,masculine feminine,irregular,,54\nσι,dual,dative,3rd,masculine feminine,irregular,,33 37\nεσσι,dual,dative,3rd,masculine feminine,irregular,,33\nεσι,dual,dative,3rd,masculine feminine,irregular,,33\nέοιν,dual,dative,3rd,masculine feminine,irregular,,16 61\nῳν,dual,dative,3rd,masculine feminine,irregular,,49\nοιν,dual,genitive,3rd,masculine feminine,regular,primary,\nοῖν,dual,genitive,3rd,masculine feminine,regular,,\nοιιν,dual,genitive,3rd,masculine feminine,irregular,,54\nέοιν,dual,genitive,3rd,masculine feminine,irregular,,16 61\nῳν,dual,genitive,3rd,masculine feminine,irregular,,49\nε,dual,nominative,3rd,masculine feminine,regular,primary,\nει,dual,nominative,3rd,masculine feminine,regular,,\nῆ,dual,nominative,3rd,masculine feminine,regular,,18\nω,dual,nominative,3rd,masculine feminine,irregular,,32\nῖ,dual,nominative,3rd,masculine feminine,irregular,,33\nεε,dual,nominative,3rd,masculine feminine,irregular,,16 55 61\nε,dual,vocative,3rd,masculine feminine,regular,primary,\nει,dual,vocative,3rd,masculine feminine,regular,,\nῆ,dual,vocative,3rd,masculine feminine,regular,,18\nω,dual,vocative,3rd,masculine feminine,irregular,,32\nῖ,dual,vocative,3rd,masculine feminine,irregular,,33\nεε,dual,vocative,3rd,masculine feminine,irregular,,16 55 61\nε,dual,accusative,3rd,neuter,regular,primary,\nει,dual,accusative,3rd,neuter,regular,,\nα,dual,accusative,3rd,neuter,regular,,\nεε,dual,accusative,3rd,neuter,irregular,,16 61\nαε,dual,accusative,3rd,neuter,irregular,,16 61\nοιν,dual,dative,3rd,neuter,regular,primary,\nῷν,dual,dative,3rd,neuter,regular,,\nοις,dual,dative,3rd,neuter,irregular,,33 38\nοισι,dual,dative,3rd,neuter,irregular,,33 38\nοισι(ν),dual,dative,3rd,neuter,irregular,,4 33 38\nοιιν,dual,dative,3rd,neuter,irregular,,\nέοιν,dual,dative,3rd,neuter,irregular,,16 61\nάοιν,dual,dative,3rd,neuter,irregular,,16 61\nοιν,dual,genitive,3rd,neuter,regular,primary,\nῷν,dual,genitive,3rd,neuter,regular,,\nων,dual,genitive,3rd,neuter,irregular,,33 38\nοιιν,dual,genitive,3rd,neuter,irregular,,\nέοιν,dual,genitive,3rd,neuter,irregular,,16 61\nάοιν,dual,genitive,3rd,neuter,irregular,,16 61\nε,dual,nominative,3rd,neuter,regular,primary,\nει,dual,nominative,3rd,neuter,regular,,\nα,dual,nominative,3rd,neuter,regular,,\nεε,dual,nominative,3rd,neuter,irregular,,16 61\nαε,dual,nominative,3rd,neuter,irregular,,16 61\nε,dual,vocative,3rd,neuter,regular,primary,\nει,dual,vocative,3rd,neuter,regular,,\nα,dual,vocative,3rd,neuter,regular,,\nεε,dual,vocative,3rd,neuter,irregular,,16 61\nαε,dual,vocative,3rd,neuter,irregular,,16 61\nας,plural,accusative,3rd,masculine feminine,regular,primary,\nεις,plural,accusative,3rd,masculine feminine,regular,,17 41\nες,plural,accusative,3rd,masculine feminine,regular,,\nς,plural,accusative,3rd,masculine feminine,regular,,\nῦς,plural,accusative,3rd,masculine feminine,regular,,17 18 48\nως,plural,accusative,3rd,masculine feminine,regular,,30\nῆς,plural,accusative,3rd,masculine feminine,irregular,,56\nέας,plural,accusative,3rd,masculine feminine,irregular,,\nέος,plural,accusative,3rd,masculine feminine,irregular,,\nῆος,plural,accusative,3rd,masculine feminine,irregular,,\nῆες,plural,accusative,3rd,masculine feminine,irregular,,\nῆας,plural,accusative,3rd,masculine feminine,irregular,,\nους,plural,accusative,3rd,masculine feminine,irregular,,32\nούς,plural,accusative,3rd,masculine feminine,irregular,,32\nεῖς,plural,accusative,3rd,masculine feminine,irregular,,31 41\nεες,plural,accusative,3rd,masculine feminine,irregular,,55 61\nις,plural,accusative,3rd,masculine feminine,irregular,,\nινς,plural,accusative,3rd,masculine feminine,irregular,,\nῶς,plural,accusative,3rd,masculine feminine,irregular,,48\nσι,plural,dative,3rd,masculine feminine,regular,primary,\nσιν,plural,dative,3rd,masculine feminine,regular,primary,4\nσί,plural,dative,3rd,masculine feminine,regular,,41\nσίν,plural,dative,3rd,masculine feminine,regular,,4 41\nεσι,plural,dative,3rd,masculine feminine,regular,,41\nεσιν,plural,dative,3rd,masculine feminine,regular,,4 41\nέσι,plural,dative,3rd,masculine feminine,regular,,\nέσιν,plural,dative,3rd,masculine feminine,regular,,4\nψι,plural,dative,3rd,masculine feminine,regular,,\nψιν,plural,dative,3rd,masculine feminine,regular,,4\nψί,plural,dative,3rd,masculine feminine,regular,,\nψίν,plural,dative,3rd,masculine feminine,regular,,4\nξι,plural,dative,3rd,masculine feminine,regular,,\nξιν,plural,dative,3rd,masculine feminine,regular,,4\nξί,plural,dative,3rd,masculine feminine,regular,,\nξίν,plural,dative,3rd,masculine feminine,regular,,4\nφι,plural,dative,3rd,masculine feminine,irregular,,45\nφιν,plural,dative,3rd,masculine feminine,irregular,,4 45\nηφι,plural,dative,3rd,masculine feminine,irregular,,45\nηφιv,plural,dative,3rd,masculine feminine,irregular,,4 45\nῆφι,plural,dative,3rd,masculine feminine,irregular,,45\nῆφιν,plural,dative,3rd,masculine feminine,irregular,,4 45\nόφι,plural,dative,3rd,masculine feminine,irregular,,45\nόφιν,plural,dative,3rd,masculine feminine,irregular,,4 45\nαις,plural,dative,3rd,masculine feminine,irregular,,33 41\nοῖσι,plural,dative,3rd,masculine feminine,irregular,,33\nοῖσιv,plural,dative,3rd,masculine feminine,irregular,,4 33\nεσσι,plural,dative,3rd,masculine feminine,irregular,,16 61\nεσσιv,plural,dative,3rd,masculine feminine,irregular,,4 16 61\nυσσι,plural,dative,3rd,masculine feminine,irregular,,54\nυσσιv,plural,dative,3rd,masculine feminine,irregular,,4 54\nσσί,plural,dative,3rd,masculine feminine,irregular,,54\nσσίv,plural,dative,3rd,masculine feminine,irregular,,4 54\nων,plural,genitive,3rd,masculine feminine,regular,primary,\nῶν,plural,genitive,3rd,masculine feminine,regular,,\n-,plural,genitive,3rd,masculine feminine,irregular,,41\nφι,plural,genitive,3rd,masculine feminine,irregular,,45\nφιν,plural,genitive,3rd,masculine feminine,irregular,,4 45\nηφι,plural,genitive,3rd,masculine feminine,irregular,,45\nηφιv,plural,genitive,3rd,masculine feminine,irregular,,4 45\nῆφι,plural,genitive,3rd,masculine feminine,irregular,,45\nῆφιν,plural,genitive,3rd,masculine feminine,irregular,,4 45\nόφι,plural,genitive,3rd,masculine feminine,irregular,,45\nόφιν,plural,genitive,3rd,masculine feminine,irregular,,4 45\nέων,plural,genitive,3rd,masculine feminine,irregular,,16 61\nες,plural,nominative,3rd,masculine feminine,regular,primary,\nως,plural,nominative,3rd,masculine feminine,regular,,30\nεις,plural,nominative,3rd,masculine feminine,regular,,17\nεῖς,plural,nominative,3rd,masculine feminine,regular,,18\nοί,plural,nominative,3rd,masculine feminine,irregular,,32\nαί,plural,nominative,3rd,masculine feminine,irregular,,33\nῆς,plural,nominative,3rd,masculine feminine,irregular,,18\nῄς,plural,nominative,3rd,masculine feminine,irregular,,31 41\nεες,plural,nominative,3rd,masculine feminine,irregular,,16 55 61\nοι,plural,nominative,3rd,masculine feminine,irregular,,33\nες,plural,vocative,3rd,masculine feminine,regular,primary,\nεις,plural,vocative,3rd,masculine feminine,regular,,17\nεῖς,plural,vocative,3rd,masculine feminine,regular,,18\nῆς,plural,vocative,3rd,masculine feminine,regular,,18\nως,plural,vocative,3rd,masculine feminine,regular,,30\nεες,plural,vocative,3rd,masculine feminine,irregular,,16 55 61\nα,plural,accusative,3rd,neuter,regular,primary,\nη,plural,accusative,3rd,neuter,regular,,\nς,plural,accusative,3rd,neuter,regular,,\nά,plural,accusative,3rd,neuter,irregular,,33\nαα,plural,accusative,3rd,neuter,irregular,,16 61\nεα,plural,accusative,3rd,neuter,irregular,,16 61\nσι,plural,dative,3rd,neuter,regular,primary,\nσιν,plural,dative,3rd,neuter,regular,primary,4\nσί,plural,dative,3rd,neuter,regular,,\nσίv,plural,dative,3rd,neuter,regular,,4\nασι,plural,dative,3rd,neuter,regular,,\nασιν,plural,dative,3rd,neuter,regular,,4\nεσι,plural,dative,3rd,neuter,regular,,\nεσιν,plural,dative,3rd,neuter,regular,,4\nέσι,plural,dative,3rd,neuter,regular,,\nέσιv,plural,dative,3rd,neuter,regular,,4\nεσσι,plural,dative,3rd,neuter,irregular,,54\nεσσιν,plural,dative,3rd,neuter,irregular,,4 54\nσσί,plural,dative,3rd,neuter,irregular,,54\nσσίv,plural,dative,3rd,neuter,irregular,,4 54\nασσι,plural,dative,3rd,neuter,irregular,,54\nασσιν,plural,dative,3rd,neuter,irregular,,4 54\nφι,plural,dative,3rd,neuter,irregular,,45\nφιν,plural,dative,3rd,neuter,irregular,,4 45\nηφι,plural,dative,3rd,neuter,irregular,,45\nηφιv,plural,dative,3rd,neuter,irregular,,4 45\nῆφι,plural,dative,3rd,neuter,irregular,,45\nῆφιν,plural,dative,3rd,neuter,irregular,,4 45\nόφι,plural,dative,3rd,neuter,irregular,,45\nόφιν,plural,dative,3rd,neuter,irregular,,4 45\nων,plural,genitive,3rd,neuter,regular,primary,\nῶν,plural,genitive,3rd,neuter,regular,primary,\nφι,plural,genitive,3rd,neuter,irregular,,\nφιν,plural,genitive,3rd,neuter,irregular,,4 45\nηφι,plural,genitive,3rd,neuter,irregular,,45\nηφιv,plural,genitive,3rd,neuter,irregular,,4 45\nῆφι,plural,genitive,3rd,neuter,irregular,,45\nῆφιν,plural,genitive,3rd,neuter,irregular,,4 45\nόφι,plural,genitive,3rd,neuter,irregular,,45\nόφιν,plural,genitive,3rd,neuter,irregular,,4 45\nέων,plural,genitive,3rd,neuter,irregular,,16 61\nάων,plural,genitive,3rd,neuter,irregular,,16 61\nα,plural,nominative,3rd,neuter,regular,primary,\nη,plural,nominative,3rd,neuter,regular,,\nες,plural,nominative,3rd,neuter,regular,,\nά,plural,nominative,3rd,neuter,irregular,,33\nεα,plural,nominative,3rd,neuter,irregular,,16 61\nαα,plural,nominative,3rd,neuter,irregular,,16 61\nα,plural,vocative,3rd,neuter,regular,primary,\nη,plural,vocative,3rd,neuter,regular,,\nες,plural,vocative,3rd,neuter,regular,,\nαα,plural,vocative,3rd,neuter,irregular,,16 61\nεα,plural,vocative,3rd,neuter,irregular,,16 61\nα,singular,accusative,3rd,masculine feminine,regular,primary,\nη,singular,accusative,3rd,masculine feminine,regular,,16\nν,singular,accusative,3rd,masculine feminine,regular,,\nιν,singular,accusative,3rd,masculine feminine,regular,,41\nῦν,singular,accusative,3rd,masculine feminine,regular,,18\nῶ,singular,accusative,3rd,masculine feminine,regular,,23\nυν,singular,accusative,3rd,masculine feminine,regular,,\nῦν,singular,accusative,3rd,masculine feminine,regular,,17\nύν,singular,accusative,3rd,masculine feminine,regular,,17\nέα,singular,accusative,3rd,masculine feminine,regular,,20\nην,singular,accusative,3rd,masculine feminine,regular,,24\nώ,singular,accusative,3rd,masculine feminine,regular,,19 41\nω,singular,accusative,3rd,masculine feminine,regular,,23\nεῖν,singular,accusative,3rd,masculine feminine,irregular,,31 41\nων,singular,accusative,3rd,masculine feminine,irregular,,33 41 49\nαν,singular,accusative,3rd,masculine feminine,irregular,,33 41\nον,singular,accusative,3rd,masculine feminine,irregular,,39\nῖς,singular,accusative,3rd,masculine feminine,irregular,,33\nεα,singular,accusative,3rd,masculine feminine,irregular,,61\nι,singular,dative,3rd,masculine feminine,regular,primary,\nί,singular,dative,3rd,masculine feminine,regular,,\nϊ,singular,dative,3rd,masculine feminine,regular,,17\nΐ,singular,dative,3rd,masculine feminine,regular,,40\nει,singular,dative,3rd,masculine feminine,regular,,16 17\nεῖ,singular,dative,3rd,masculine feminine,regular,,18\nαι,singular,dative,3rd,masculine feminine,regular,,\noῖ,singular,dative,3rd,masculine feminine,regular,,28 41\nῖ,singular,dative,3rd,masculine feminine,irregular,,33 46\nῆι,singular,dative,3rd,masculine feminine,irregular,,18\nᾳ,singular,dative,3rd,masculine feminine,irregular,,25\nῳ,singular,dative,3rd,masculine feminine,irregular,,33 34\nῷ,singular,dative,3rd,masculine feminine,irregular,,33\nιί,singular,dative,3rd,masculine feminine,irregular,,62\nυί,singular,dative,3rd,masculine feminine,irregular,,62\nέϊ,singular,dative,3rd,masculine feminine,irregular,,18 61\nος,singular,genitive,3rd,masculine feminine,regular,primary,\nός,singular,genitive,3rd,masculine feminine,regular,,\nους,singular,genitive,3rd,masculine feminine,regular,,16\nοῦς,singular,genitive,3rd,masculine feminine,regular,,19 46\nως,singular,genitive,3rd,masculine feminine,regular,,17 18\nώς,singular,genitive,3rd,masculine feminine,regular,,17 18 41\nῶς,singular,genitive,3rd,masculine feminine,regular,,47\nεως,singular,genitive,3rd,masculine feminine,regular,,17\nέως,singular,genitive,3rd,masculine feminine,regular,,\nεώς,singular,genitive,3rd,masculine feminine,regular,,\nέους,singular,genitive,3rd,masculine feminine,regular,,20\nω,singular,genitive,3rd,masculine feminine,irregular,,\nεος,singular,genitive,3rd,masculine feminine,irregular,,61\nΰς,singular,genitive,3rd,masculine feminine,irregular,,41 48\nῦς,singular,genitive,3rd,masculine feminine,irregular,,48\nνος,singular,genitive,3rd,masculine feminine,irregular,,22\nοῦ,singular,genitive,3rd,masculine feminine,irregular,,33\nηος,singular,genitive,3rd,masculine feminine,irregular,,55\nιός,singular,genitive,3rd,masculine feminine,irregular,,62\nuός,singular,genitive,3rd,masculine feminine,irregular,,62\nς,singular,nominative,3rd,masculine feminine,regular,primary,\n-,singular,nominative,3rd,masculine feminine,regular,primary,\nηρ,singular,nominative,3rd,masculine feminine,regular,,41\nις,singular,nominative,3rd,masculine feminine,regular,,\nϊς,singular,nominative,3rd,masculine feminine,regular,,\nώ,singular,nominative,3rd,masculine feminine,regular,,41\nψ,singular,nominative,3rd,masculine feminine,regular,,\nξ,singular,nominative,3rd,masculine feminine,regular,,\nρ,singular,nominative,3rd,masculine feminine,regular,,\nήρ,singular,nominative,3rd,masculine feminine,regular,,\nήν,singular,nominative,3rd,masculine feminine,regular,,50\nν,singular,nominative,3rd,masculine feminine,regular,,\nωρ,singular,nominative,3rd,masculine feminine,regular,,\nων,singular,nominative,3rd,masculine feminine,regular,,\nών,singular,nominative,3rd,masculine feminine,regular,,\nης,singular,nominative,3rd,masculine feminine,regular,,\nῆς,singular,nominative,3rd,masculine feminine,regular,,\nυς,singular,nominative,3rd,masculine feminine,regular,,\nῦς,singular,nominative,3rd,masculine feminine,regular,,\nεῦς,singular,nominative,3rd,masculine feminine,regular,,\nύς,singular,nominative,3rd,masculine feminine,regular,,\nής,singular,nominative,3rd,masculine feminine,regular,,33\nας,singular,nominative,3rd,masculine feminine,irregular,,\nῴ,singular,nominative,3rd,masculine feminine,irregular,,29 41\nώς,singular,nominative,3rd,masculine feminine,irregular,,27 41\nϋς,singular,nominative,3rd,masculine feminine,irregular,,41\nῄς,singular,nominative,3rd,masculine feminine,irregular,,31 41\nῖς,singular,nominative,3rd,masculine feminine,irregular,,\nεῖς,singular,nominative,3rd,masculine feminine,irregular,,31 41\nῶς,singular,nominative,3rd,masculine feminine,irregular,,48\nος,singular,nominative,3rd,masculine feminine,irregular,,33\n-,singular,vocative,3rd,masculine feminine,regular,primary,52\nς,singular,vocative,3rd,masculine feminine,regular,,30\nι,singular,vocative,3rd,masculine feminine,regular,,41\nῦ,singular,vocative,3rd,masculine feminine,regular,,15 17 18\nοῖ,singular,vocative,3rd,masculine feminine,regular,,19 41\nψ,singular,vocative,3rd,masculine feminine,regular,,\nξ,singular,vocative,3rd,masculine feminine,regular,,\nν,singular,vocative,3rd,masculine feminine,regular,,\nρ,singular,vocative,3rd,masculine feminine,regular,,\nων,singular,vocative,3rd,masculine feminine,regular,,50\nών,singular,vocative,3rd,masculine feminine,regular,,\nήν,singular,vocative,3rd,masculine feminine,regular,,\nερ,singular,vocative,3rd,masculine feminine,regular,,\nες,singular,vocative,3rd,masculine feminine,regular,,\nί,singular,vocative,3rd,masculine feminine,regular,,\nως,singular,vocative,3rd,masculine feminine,regular,,\nἶ,singular,vocative,3rd,masculine feminine,regular,,\nούς,singular,vocative,3rd,masculine feminine,regular,,51\nύ,singular,vocative,3rd,masculine feminine,regular,,15\nυ,singular,vocative,3rd,masculine feminine,regular,,51\nεις,singular,vocative,3rd,masculine feminine,regular,,20\nαν,singular,vocative,3rd,masculine feminine,regular,,\nώς,singular,vocative,3rd,masculine feminine,irregular,,27 41 46\nον,singular,vocative,3rd,masculine feminine,irregular,,\nυς,singular,vocative,3rd,masculine feminine,irregular,,33\nα,singular,accusative,3rd,neuter,regular,primary,15\n-,singular,accusative,3rd,neuter,regular,,33\nος,singular,accusative,3rd,neuter,regular,,\nας,singular,accusative,3rd,neuter,regular,,\nαρ,singular,accusative,3rd,neuter,regular,,21\nυ,singular,accusative,3rd,neuter,regular,,\nι,singular,dative,3rd,neuter,regular,primary,\nει,singular,dative,3rd,neuter,regular,,16\nαι,singular,dative,3rd,neuter,regular,,16 21\nϊ,singular,dative,3rd,neuter,irregular,,17\nᾳ,singular,dative,3rd,neuter,irregular,,25 33\nυϊ,singular,dative,3rd,neuter,irregular,,17\nαϊ,singular,dative,3rd,neuter,irregular,,21 61\nος,singular,genitive,3rd,neuter,regular,primary,\nους,singular,genitive,3rd,neuter,regular,,16\nως,singular,genitive,3rd,neuter,regular,,16\nεως,singular,genitive,3rd,neuter,regular,,17\nυς,singular,genitive,3rd,neuter,irregular,,26\nου,singular,genitive,3rd,neuter,irregular,,33\nαος,singular,genitive,3rd,neuter,irregular,,21 61\nα,singular,nominative,3rd,neuter,regular,primary,\n-,singular,nominative,3rd,neuter,regular,,33\nος,singular,nominative,3rd,neuter,regular,,\nαρ,singular,nominative,3rd,neuter,regular,,\nας,singular,nominative,3rd,neuter,regular,,16 21\nυ,singular,nominative,3rd,neuter,regular,,\nον,singular,nominative,3rd,neuter,irregular,,33\nα,singular,vocative,3rd,neuter,regular,primary,15\n-,singular,vocative,3rd,neuter,regular,,\nος,singular,vocative,3rd,neuter,regular,,\nας,singular,vocative,3rd,neuter,regular,,\nαρ,singular,vocative,3rd,neuter,regular,,21\nυ,singular,vocative,3rd,neuter,regular,,";

var nounFootnotesCSV$1 = "Index,Text\n1,See  for Rules of variance within regular endings\n2,See  for Table of α- and ε- stem feminine 1st declension contracts\n3,See  for Table of α- and ε- stem masculine 1st declension contracts\n4,\"Previous, with (ν)\"\n5,See  for Table of o- and ε- stem masculine  2nd declension contracts\n6,See  for Table of o- and ε- stem neuter 2nd declension contracts\n7,(Attic) contracts of o-stems preceded by a long vowel\n15,\"This is not actually an “ending,” but the last letter of the “pure stem”. See\"\n16,\"See  &  for Table of Sigma (ες,ας,ος) stem contracts\"\n17,See  for Table of  ι and υ - stem contracts\n18,\"See  for Table of  ευ,αυ,and ου - stem contracts\"\n19,See  for stems in οι feminine 3rd declension contracts\n20,See  for Table of 3rd declension contracts of stems in -εσ- preceded by ε\n21,See  for Table of stems in τ and ατ neuter 3rd declension contracts\n22,\"On stem ending in ν, ν doubled in gen. Sing Aeolic (e.g. μῆνς,μῆννος...)\"\n23,Also in inscriptions and expressions of swearing\n24,(Borrowed from 1st decl) Sometimes in proper names whose nominative ends in -ης\n25,From -ας-stems (properly αι)\n26,(ε)υς instead of (ε)ος or ους (gen) for (3rd decl) words whose nominative ends in -ος\n27,In 3rd decl. Only in the words αἰδώς (Attic) and ἠώς (Homer and Ionic)\n28,Contraction of a stem in οι  and an ι-ending\n29,Stronger form of Ionic contractions of οι-stems (in the nominative)\n30,See  for Table of ω - stem contracts (masculine only)\n31,Nominative plural contraction of  -ειδ+ες  after dropping the δ (used for accusative too). See .a\n32,\"Plurals & duals occur rarely (and w/ 2nd decl endings) for 3rd decl οι-stem nouns. See .D.a,b,c\"\n33,See  for description and examples of Irreg. Decl involving 3rd decl endings\n34,(Homer)  for Attic  (ῳτ)ι\n35,(Homer) for Cretan ινς\n36,Also an irregular ending for other stem(s)\n37,In inscriptions\n38,\"Plural endings for otherwise dual noun,οσσε (eyes)\"\n39,\"“Poetical” (acc for ἔρως). See ,11\"\n40,\"Poetic for χρωτι,dat. of ὁ χρως\"\n41,No Masculine of this Form\n42,No Feminine of this Form\n44,See  D.9 and #215 regarding dialectic alternate forms of the Dative Plural\n45,\"Surviving in Homer (See ) Not truly genitive or dative, but instrumental/locative/ablative, associated with the remaining oblique cases (genitive & dative) only after being lost as cases themselves in Greek\"\n46,See Smyth # 266 for only surviving ος-stem in Attic (fem. singular of αἰδως)\n47,See  for Substantives in -εύς preceded by a vowel.\n48,\"See Smyth,  #275 D.1,2,3\"\n49,\"See , List of Principal Irregular Substantives\"\n50,\"See  for Table of stems in a Liquid (λ,ρ) or a Nasal (ν), and Note #259D for variants including Κρονίων...\"\n51,\"See  for Table of stems in a Dental (τ,δ,θ) or a Nasal (ν), and its notes including Ν.κόρυς (Voc. Κόρυ) & ὀδούς\"\n52,See  for general rule re 3rd Declension Masc/Fem Singular Vocative\n54,See  D\n55,See\n56,\"See  for other forms of endings for contracts of ευ,αυ,and ου - stems\"\n57,Nominative form used as Vocative. See\n58,\"See ,b\"\n59,\"See ,d\"\n60,This (Feminine or Masculine) Form only Masculine when derived from ε- or ο- contraction\n61,See Smyth Note 264 D.1 regarding Homer's use of Open Forms\n62,See Smyth Note 269 for alternate i-stem and u-stem endings\n63,See  D.2\n64,See  D.1";

var pronounFormsCSV$1 = "Form,Headword,Class,Person,Number,Case,Gender,Type,Primary,Dialects,Footnote\nτούτω,οὗτος,demonstrative,,dual,accusative,masculine feminine neuter,regular,primary,,\nτούτοιν,οὗτος,demonstrative,,dual,dative,masculine feminine neuter,regular,primary,,\nτούτοιν,οὗτος,demonstrative,,dual,genitive,masculine feminine neuter,regular,primary,,\nτούτω,οὗτος,demonstrative,,dual,nominative,masculine feminine neuter,regular,primary,,\nταύτᾱς,οὗτος,demonstrative,,plural,accusative,feminine,regular,primary,,\nταύταις,οὗτος,demonstrative,,plural,dative,feminine,regular,primary,,\nτούτων,οὗτος,demonstrative,,plural,genitive,feminine,regular,primary,,\nαὗται,οὗτος,demonstrative,,plural,nominative,feminine,regular,primary,,\nτούτους,οὗτος,demonstrative,,plural,accusative,masculine,regular,primary,,\nτούτοις,οὗτος,demonstrative,,plural,dative,masculine,regular,primary,,\nτούτων,οὗτος,demonstrative,,plural,genitive,masculine,regular,primary,,\nοὗτοι,οὗτος,demonstrative,,plural,nominative,masculine,regular,primary,,\nταῦτα,οὗτος,demonstrative,,plural,accusative,neuter,regular,primary,,\nτούτοις,οὗτος,demonstrative,,plural,dative,neuter,regular,primary,,\nτούτων,οὗτος,demonstrative,,plural,genitive,neuter,regular,primary,,\nταῦτα,οὗτος,demonstrative,,plural,nominative,neuter,regular,primary,,\nταύτην,οὗτος,demonstrative,,singular,accusative,feminine,regular,primary,,\nταύτῃ,οὗτος,demonstrative,,singular,dative,feminine,regular,primary,,\nταύτης,οὗτος,demonstrative,,singular,genitive,feminine,regular,primary,,\nαὕτη,οὗτος,demonstrative,,singular,nominative,feminine,regular,primary,,\nτοῦτον,οὗτος,demonstrative,,singular,accusative,masculine,regular,primary,,\nτούτῳ,οὗτος,demonstrative,,singular,dative,masculine,regular,primary,,\nτούτου,οὗτος,demonstrative,,singular,genitive,masculine,regular,primary,,\nοὗτος,οὗτος,demonstrative,,singular,nominative,masculine,regular,primary,,\nτοῦτο,οὗτος,demonstrative,,singular,accusative,neuter,regular,primary,,\nτούτῳ,οὗτος,demonstrative,,singular,dative,neuter,regular,primary,,\nτούτου,οὗτος,demonstrative,,singular,genitive,neuter,regular,primary,,\nτοῦτο,οὗτος,demonstrative,,singular,nominative,neuter,regular,primary,,\nἐκείνω,ἐκεῖνος,demonstrative,,dual,accusative,masculine feminine neuter,regular,primary,,\nἐκείνοιν,ἐκεῖνος,demonstrative,,dual,dative,masculine feminine neuter,regular,primary,,\nἐκείνοιν,ἐκεῖνος,demonstrative,,dual,genitive,masculine feminine neuter,regular,primary,,\nἐκείνω,ἐκεῖνος,demonstrative,,dual,nominative,masculine feminine neuter,regular,primary,,\nἐκείνᾱς,ἐκεῖνος,demonstrative,,plural,accusative,feminine,regular,primary,,\nἐκείναις,ἐκεῖνος,demonstrative,,plural,dative,feminine,regular,primary,,\nἐκείνων,ἐκεῖνος,demonstrative,,plural,genitive,feminine,regular,primary,,\nἐκεῖναι,ἐκεῖνος,demonstrative,,plural,nominative,feminine,regular,primary,,\nἐκείνους,ἐκεῖνος,demonstrative,,plural,accusative,masculine,regular,primary,,\nἐκείνοις,ἐκεῖνος,demonstrative,,plural,dative,masculine,regular,primary,,\nἐκείνων,ἐκεῖνος,demonstrative,,plural,genitive,masculine,regular,primary,,\nἐκεῖνοι,ἐκεῖνος,demonstrative,,plural,nominative,masculine,regular,primary,,\nἐκεῖνα,ἐκεῖνος,demonstrative,,plural,accusative,neuter,regular,primary,,\nἐκείνοις,ἐκεῖνος,demonstrative,,plural,dative,neuter,regular,primary,,\nἐκείνων,ἐκεῖνος,demonstrative,,plural,genitive,neuter,regular,primary,,\nἐκεῖνα,ἐκεῖνος,demonstrative,,plural,nominative,neuter,regular,primary,,\nἐκείνην,ἐκεῖνος,demonstrative,,singular,accusative,feminine,regular,primary,,\nἐκείνῃ,ἐκεῖνος,demonstrative,,singular,dative,feminine,regular,primary,,\nἐκείνης,ἐκεῖνος,demonstrative,,singular,genitive,feminine,regular,primary,,\nἐκείνη,ἐκεῖνος,demonstrative,,singular,nominative,feminine,regular,primary,,\nἐκεῖνον,ἐκεῖνος,demonstrative,,singular,accusative,masculine,regular,primary,,\nἐκείνῳ,ἐκεῖνος,demonstrative,,singular,dative,masculine,regular,primary,,\nἐκείνου,ἐκεῖνος,demonstrative,,singular,genitive,masculine,regular,primary,,\nἐκεῖνος,ἐκεῖνος,demonstrative,,singular,nominative,masculine,regular,primary,,\nἐκεῖνο,ἐκεῖνος,demonstrative,,singular,accusative,neuter,regular,primary,,\nἐκείνῳ,ἐκεῖνος,demonstrative,,singular,dative,neuter,regular,primary,,\nἐκείνου,ἐκεῖνος,demonstrative,,singular,genitive,neuter,regular,primary,,\nἐκεῖνο,ἐκεῖνος,demonstrative,,singular,nominative,neuter,regular,primary,,\nτώδε,ὅδε,demonstrative,,dual,accusative,masculine feminine neuter,regular,primary,,\nτοῖνδε,ὅδε,demonstrative,,dual,dative,masculine feminine neuter,regular,primary,,\nτοῖνδε,ὅδε,demonstrative,,dual,genitive,masculine feminine neuter,regular,primary,,\nτώδε,ὅδε,demonstrative,,dual,nominative,masculine feminine neuter,regular,primary,,\nτά̄σδε,ὅδε,demonstrative,,plural,accusative,feminine,regular,primary,,\nταῖσδε,ὅδε,demonstrative,,plural,dative,feminine,regular,primary,,\nτῶνδε,ὅδε,demonstrative,,plural,genitive,feminine,regular,primary,,\nαἵδε,ὅδε,demonstrative,,plural,nominative,feminine,regular,primary,,\nτούσδε,ὅδε,demonstrative,,plural,accusative,masculine,regular,primary,,\nτοῖσδε,ὅδε,demonstrative,,plural,dative,masculine,regular,primary,,\nτῶνδε,ὅδε,demonstrative,,plural,genitive,masculine,regular,primary,,\nοἵδε,ὅδε,demonstrative,,plural,nominative,masculine,regular,primary,,\nτάδε,ὅδε,demonstrative,,plural,accusative,neuter,regular,primary,,\nτοῖσδε,ὅδε,demonstrative,,plural,dative,neuter,regular,primary,,\nτῶνδε,ὅδε,demonstrative,,plural,genitive,neuter,regular,primary,,\nτάδε,ὅδε,demonstrative,,plural,nominative,neuter,regular,primary,,\nτήνδε,ὅδε,demonstrative,,singular,accusative,feminine,regular,primary,,\nτῇδε,ὅδε,demonstrative,,singular,dative,feminine,regular,primary,,\nτῆσδε,ὅδε,demonstrative,,singular,genitive,feminine,regular,primary,,\nἥδε,ὅδε,demonstrative,,singular,nominative,feminine,regular,primary,,\nτόνδε,ὅδε,demonstrative,,singular,accusative,masculine,regular,primary,,\nτῷδε,ὅδε,demonstrative,,singular,dative,masculine,regular,primary,,\nτοῦδε,ὅδε,demonstrative,,singular,genitive,masculine,regular,primary,,\nὅδε,ὅδε,demonstrative,,singular,nominative,masculine,regular,primary,,\nτόδε,ὅδε,demonstrative,,singular,accusative,neuter,regular,primary,,\nτῷδε,ὅδε,demonstrative,,singular,dative,neuter,regular,primary,,\nτοῦδε,ὅδε,demonstrative,,singular,genitive,neuter,regular,primary,,\nτόδε,ὅδε,demonstrative,,singular,nominative,neuter,regular,primary,,\nὥτινε,,general relative,,dual,accusative,masculine feminine neuter,regular,primary,,\nοἷντινοιν,,general relative,,dual,dative,masculine feminine neuter,regular,primary,,\nοἷντινοιν,,general relative,,dual,genitive,masculine feminine neuter,regular,primary,,\nὥτινε,,general relative,,dual,nominative,masculine feminine neuter,regular,primary,,\nἅ̄στινας,,general relative,,plural,accusative,feminine,regular,primary,,\nαἷστισι,,general relative,,plural,dative,feminine,regular,primary,,\nαἷστισιν,,general relative,,plural,dative,feminine,regular,primary,,\nὁτέοισι,,general relative,,plural,dative,feminine,irregular,,\"Homer,Herodotus\",\nὧντινων,,general relative,,plural,genitive,feminine,regular,primary,,\nὅτεων,,general relative,,plural,genitive,feminine,irregular,,\"Homer,Herodotus\",\nαἵτινες,,general relative,,plural,nominative,feminine,regular,primary,,\nοὕστινας,,general relative,,plural,accusative,masculine,regular,primary,,\nὅτινας,,general relative,,plural,accusative,masculine,irregular,,Homer,\nοἷστισι,,general relative,,plural,dative,masculine,regular,primary,,\nοἷστισιν,,general relative,,plural,dative,masculine,regular,primary,,\nὅτοις,,general relative,,plural,dative,masculine,regular,primary,,\nὧντινων,,general relative,,plural,genitive,masculine,regular,primary,,\nὅτων,,general relative,,plural,genitive,masculine,regular,primary,,\nοἵτινες,,general relative,,plural,nominative,masculine,regular,primary,,\nἅτινα,,general relative,,plural,accusative,neuter,regular,primary,,\nἅττα,,general relative,,plural,accusative,neuter,regular,primary,,\nἅσσα,,general relative,,plural,accusative,neuter,irregular,,\"Homer,Herodotus\",\nοἷστισι,,general relative,,plural,dative,neuter,regular,primary,,\nοἷστισιν,,general relative,,plural,dative,neuter,regular,primary,,\nὅτοις,,general relative,,plural,dative,neuter,regular,primary,,\nὧντινων,,general relative,,plural,genitive,neuter,regular,primary,,\nὅτων,,general relative,,plural,genitive,neuter,regular,primary,,\nἅτινα,,general relative,,plural,nominative,neuter,regular,primary,,\nἅττα,,general relative,,plural,nominative,neuter,regular,primary,,\nἅσσα,,general relative,,plural,nominative,neuter,irregular,,\"Homer,Herodotus\",\nἥντινα,,general relative,,singular,accusative,feminine,regular,primary,,\nᾗτινι,,general relative,,singular,dative,feminine,regular,primary,,\nὅτεῳ,,general relative,,singular,dative,feminine,irregular,,\"Homer,Herodotus\",\nἧστινος,,general relative,,singular,genitive,feminine,regular,primary,,\nὅττεο,,general relative,,singular,genitive,feminine,irregular,,Homer,\nὅττευ,,general relative,,singular,genitive,feminine,irregular,,Homer,\nὅτευ,,general relative,,singular,genitive,feminine,irregular,,\"Homer,Herodotus\",\nἥτις,,general relative,,singular,nominative,feminine,regular,primary,,\nὅντινα,,general relative,,singular,accusative,masculine,regular,primary,,\nὅτινα,,general relative,,singular,accusative,masculine,irregular,,Homer,\nᾧτινι,,general relative,,singular,dative,masculine,regular,primary,,\nὅτῳ,,general relative,,singular,dative,masculine,regular,primary,,\nοὗτινος,,general relative,,singular,genitive,masculine,regular,primary,,\nὅτου,,general relative,,singular,genitive,masculine,regular,primary,,\nὅστις,,general relative,,singular,nominative,masculine,regular,primary,,\nὅτις,,general relative,,singular,nominative,masculine,irregular,,Homer,\nὅ τι,,general relative,,singular,accusative,neuter,regular,primary,,\nὅ ττι,,general relative,,singular,accusative,neuter,irregular,,Homer,\nᾧτινι,,general relative,,singular,dative,neuter,regular,primary,,\nὅτῳ,,general relative,,singular,dative,neuter,regular,primary,,\nοὗτινος,,general relative,,singular,genitive,neuter,regular,primary,,\nὅτου,,general relative,,singular,genitive,neuter,regular,primary,,\nὅ τι,,general relative,,singular,nominative,neuter,regular,primary,,\nὅ ττι,,general relative,,singular,nominative,neuter,irregular,,Homer,\nτινέ,,indefinite,,dual,accusative,masculine feminine,regular,primary,,\nτινοῖν,,indefinite,,dual,dative,masculine feminine,regular,primary,,\nτινοῖν,,indefinite,,dual,genitive,masculine feminine,regular,primary,,\nτινέ,,indefinite,,dual,nominative,masculine feminine,regular,primary,,\nτινέ,,indefinite,,dual,vocative,masculine feminine,regular,primary,,\nτινέ,,indefinite,,dual,accusative,neuter,regular,primary,,\nτινοῖν,,indefinite,,dual,dative,neuter,regular,primary,,\nτινοῖν,,indefinite,,dual,genitive,neuter,regular,primary,,\nτινέ,,indefinite,,dual,nominative,neuter,regular,primary,,\nτινέ,,indefinite,,dual,vocative,neuter,regular,primary,,\nτινάς,,indefinite,,plural,accusative,masculine feminine,regular,primary,,\nτισί,,indefinite,,plural,dative,masculine feminine,regular,primary,,\nτισίν,,indefinite,,plural,dative,masculine feminine,regular,primary,,\nτινῶν,,indefinite,,plural,genitive,masculine feminine,regular,primary,,\nτινές,,indefinite,,plural,nominative,masculine feminine,regular,primary,,\nτινά,,indefinite,,plural,accusative,neuter,regular,primary,,\nἄττα,,indefinite,,plural,accusative,neuter,regular,,,2\nτισί,,indefinite,,plural,dative,neuter,regular,primary,,\nτισίν,,indefinite,,plural,dative,neuter,regular,primary,,\nτινῶν,,indefinite,,plural,genitive,neuter,regular,primary,,\nτινά,,indefinite,,plural,nominative,neuter,regular,primary,,\nἄττα,,indefinite,,plural,nominative,neuter,regular,,,2\nτινά,,indefinite,,singular,accusative,masculine feminine,regular,primary,,\nἄττα,,indefinite,,singular,accusative,masculine feminine,regular,,,2\nτινί,,indefinite,,singular,dative,masculine feminine,regular,primary,,\nτῳ,,indefinite,,singular,dative,masculine feminine,regular,primary,,\nτινός,,indefinite,,singular,genitive,masculine feminine,regular,primary,,\nτου,,indefinite,,singular,genitive,masculine feminine,regular,primary,,\nτις,,indefinite,,singular,nominative,masculine feminine,regular,primary,,\nτι,,indefinite,,singular,accusative,neuter,regular,primary,,\nτινί,,indefinite,,singular,dative,neuter,regular,primary,,\nτῳ,,indefinite,,singular,dative,neuter,regular,primary,,\nτινός,,indefinite,,singular,genitive,neuter,regular,primary,,\nτου,,indefinite,,singular,genitive,neuter,regular,primary,,\nτι,,indefinite,,singular,nominative,neuter,regular,primary,,\nαὐτά,,intensive,,dual,accusative,feminine,regular,primary,,\nαὐταῖν,,intensive,,dual,dative,feminine,regular,primary,,\nαὐταῖν,,intensive,,dual,genitive,feminine,regular,primary,,\nαὐτά,,intensive,,dual,nominative,feminine,regular,primary,,\nαὐτώ,,intensive,,dual,accusative,masculine,regular,primary,,\nαὐτοῖν,,intensive,,dual,dative,masculine,regular,primary,,\nαὐτοῖν,,intensive,,dual,genitive,masculine,regular,primary,,\nαὐτώ,,intensive,,dual,nominative,masculine,regular,primary,,\nαὐτώ,,intensive,,dual,accusative,neuter,regular,primary,,\nαὐτοῖν,,intensive,,dual,dative,neuter,regular,primary,,\nαὐτοῖν,,intensive,,dual,genitive,neuter,regular,primary,,\nαὐτώ,,intensive,,dual,nominative,neuter,regular,primary,,\nαὐτά̄ς,,intensive,,plural,accusative,feminine,regular,primary,,\nαὐταῖς,,intensive,,plural,dative,feminine,regular,primary,,\nαὐτῶν,,intensive,,plural,genitive,feminine,regular,primary,,\nαὐτέων,,intensive,,plural,genitive,feminine,irregular,,Herodotus,\nαὐταί,,intensive,,plural,nominative,feminine,regular,primary,,\nαὐτούς,,intensive,,plural,accusative,masculine,regular,primary,,\nαὐτοῖς,,intensive,,plural,dative,masculine,regular,primary,,\nαὐτῶν,,intensive,,plural,genitive,masculine,regular,primary,,\nαὐτέων,,intensive,,plural,genitive,masculine,irregular,,Herodotus,\nαὐτοί,,intensive,,plural,nominative,masculine,regular,primary,,\nαὐτά,,intensive,,plural,accusative,neuter,regular,primary,,\nαὐτοῖς,,intensive,,plural,dative,neuter,regular,primary,,\nαὐτῶν,,intensive,,plural,genitive,neuter,regular,primary,,\nαὐτέων,,intensive,,plural,genitive,neuter,irregular,,Herodotus,\nαὐτά,,intensive,,plural,nominative,neuter,regular,primary,,\nαὐτήν,,intensive,,singular,accusative,feminine,regular,primary,,\nαὐτῇ,,intensive,,singular,dative,feminine,regular,primary,,\nαὐτῆς,,intensive,,singular,genitive,feminine,regular,primary,,\nαὐτή,,intensive,,singular,nominative,feminine,regular,primary,,\nαὐτόν,,intensive,,singular,accusative,masculine,regular,primary,,\nαὐτῷ,,intensive,,singular,dative,masculine,regular,primary,,\nαὐτοῦ,,intensive,,singular,genitive,masculine,regular,primary,,\nαὐτός,,intensive,,singular,nominative,masculine,regular,primary,,\nαὐτό,,intensive,,singular,accusative,neuter,regular,primary,,\nαὐτῷ,,intensive,,singular,dative,neuter,regular,primary,,\nαὐτοῦ,,intensive,,singular,genitive,neuter,regular,primary,,\nαὐτό,,intensive,,singular,nominative,neuter,regular,primary,,\nτίνε,,interrogative,,dual,accusative,masculine feminine,regular,primary,,\nτίνοιν,,interrogative,,dual,dative,masculine feminine,regular,primary,,\nτίνοιν,,interrogative,,dual,genitive,masculine feminine,regular,primary,,\nτίνε,,interrogative,,dual,nominative,masculine feminine,regular,primary,,\nτίνε,,interrogative,,dual,vocative,masculine feminine,regular,primary,,\nτίνε,,interrogative,,dual,accusative,neuter,regular,primary,,\nτίνοιν,,interrogative,,dual,dative,neuter,regular,primary,,\nτίνοιν,,interrogative,,dual,genitive,neuter,regular,primary,,\nτίνε,,interrogative,,dual,nominative,neuter,regular,primary,,\nτίνε,,interrogative,,dual,vocative,neuter,regular,primary,,\nτίνας,,interrogative,,plural,accusative,masculine feminine,regular,primary,,\nτίσι,,interrogative,,plural,dative,masculine feminine,regular,primary,,\nτίσιv,,interrogative,,plural,dative,masculine feminine,regular,primary,,\nτίνων,,interrogative,,plural,genitive,masculine feminine,regular,primary,,\nτίνες,,interrogative,,plural,nominative,masculine feminine,regular,primary,,\nτίνα,,interrogative,,plural,accusative,neuter,regular,primary,,\nτίσι,,interrogative,,plural,dative,neuter,regular,primary,,\nτίσιv,,interrogative,,plural,dative,neuter,regular,primary,,\nτίνων,,interrogative,,plural,genitive,neuter,regular,primary,,\nτίνα,,interrogative,,plural,nominative,neuter,regular,primary,,\nτίνα,,interrogative,,singular,accusative,masculine feminine,regular,primary,,\nτίνι,,interrogative,,singular,dative,masculine feminine,regular,primary,,\nτῷ,,interrogative,,singular,dative,masculine feminine,regular,primary,,\nτίνος,,interrogative,,singular,genitive,masculine feminine,regular,primary,,\nτοῦ,,interrogative,,singular,genitive,masculine feminine,regular,primary,,\nτίς,,interrogative,,singular,nominative,masculine feminine,regular,primary,,\nτί,,interrogative,,singular,accusative,neuter,regular,primary,,\nτίνι,,interrogative,,singular,dative,neuter,regular,primary,,\nτῷ,,interrogative,,singular,dative,neuter,regular,primary,,\nτίνος,,interrogative,,singular,genitive,neuter,regular,primary,,\nτοῦ,,interrogative,,singular,genitive,neuter,regular,primary,,\nτί,,interrogative,,singular,nominative,neuter,regular,primary,,\nνώ,,personal,1st,dual,accusative,,regular,primary,,\nνῷν,,personal,1st,dual,dative,,regular,primary,,\nνῷν,,personal,1st,dual,genitive,,regular,primary,,\nνώ,,personal,1st,dual,nominative,,regular,primary,,\nσφώ,,personal,2nd,dual,accusative,,regular,primary,,\nσφῷν,,personal,2nd,dual,dative,,regular,primary,,\nσφῷν,,personal,2nd,dual,genitive,,regular,primary,,\nσφώ,,personal,2nd,dual,nominative,,regular,primary,,\nἡμᾶς,,personal,1st,plural,accusative,,regular,primary,,\nἡμῖν,,personal,1st,plural,dative,,regular,primary,,\nἡμῶν,,personal,1st,plural,genitive,,regular,primary,,\nἡμεῖς,,personal,1st,plural,nominative,,regular,primary,,\nὑμᾶς,,personal,2nd,plural,accusative,,regular,primary,,\nὑμῖν,,personal,2nd,plural,dative,,regular,primary,,\nὑμῶν,,personal,2nd,plural,genitive,,regular,primary,,\nὑμεῖς,,personal,2nd,plural,nominative,,regular,primary,,\nσφᾶς,,personal,3rd,plural,accusative,,regular,primary,,\nσφίσι,,personal,3rd,plural,dative,,regular,primary,,\nσφίσιν,,personal,3rd,plural,dative,,regular,primary,,\nσφῶν,,personal,3rd,plural,genitive,,regular,primary,,\nσφεῖς,,personal,3rd,plural,nominative,,regular,primary,,\nἐμέ,,personal,1st,singular,accusative,,regular,primary,,\nμε,,personal,1st,singular,accusative,,regular,primary,,3\nἐμοί,,personal,1st,singular,dative,,regular,primary,,\nμοι,,personal,1st,singular,dative,,regular,primary,,3\nἐμοῦ,,personal,1st,singular,genitive,,regular,primary,,\nμου,,personal,1st,singular,genitive,,regular,primary,,3\nἐγώ,,personal,1st,singular,nominative,,regular,primary,,\nσέ,,personal,2nd,singular,accusative,,regular,primary,,\nσε,,personal,2nd,singular,accusative,,regular,primary,,3\nσοί,,personal,2nd,singular,dative,,regular,primary,,\nσοι,,personal,2nd,singular,dative,,regular,primary,,3\nσοῦ,,personal,2nd,singular,genitive,,regular,primary,,\nσου,,personal,2nd,singular,genitive,,regular,primary,,3\nσύ,,personal,2nd,singular,nominative,,regular,primary,,\nἕ,,personal,3rd,singular,accusative,,regular,primary,,\nἑ,,personal,3rd,singular,accusative,,regular,primary,,3\nοἷ,,personal,3rd,singular,dative,,regular,primary,,\nοἱ,,personal,3rd,singular,dative,,regular,primary,,3\nοὗ,,personal,3rd,singular,genitive,,regular,primary,,\nοὑ,,personal,3rd,singular,genitive,,regular,primary,,3\n-,,personal,3rd,singular,nominative,,regular,primary,,\nἀλλήλᾱ,,reciprocal,,dual,accusative,feminine,regular,primary,,\nἀλλήλαιν,,reciprocal,,dual,dative,feminine,regular,primary,,\nἀλλήλαιν,,reciprocal,,dual,genitive,feminine,regular,primary,,\nἀλλήλω,,reciprocal,,dual,accusative,masculine,regular,primary,,\nἀλλήλοιν,,reciprocal,,dual,dative,masculine,regular,primary,,\nἀλλήλοιν,,reciprocal,,dual,genitive,masculine,regular,primary,,\nἀλλήλω,,reciprocal,,dual,accusative,neuter,regular,primary,,\nἀλλήλοιν,,reciprocal,,dual,dative,neuter,regular,primary,,\nἀλλήλοιν,,reciprocal,,dual,genitive,neuter,regular,primary,,\nἀλλήλᾱς,,reciprocal,,plural,accusative,feminine,regular,primary,,\nἀλλήλαις,,reciprocal,,plural,dative,feminine,regular,primary,,\nἀλλήλων,,reciprocal,,plural,genitive,feminine,regular,primary,,\nἀλλήλους,,reciprocal,,plural,accusative,masculine,regular,primary,,\nἀλλήλοις,,reciprocal,,plural,dative,masculine,regular,primary,,\nἀλλήλων,,reciprocal,,plural,genitive,masculine,regular,primary,,\nἄλληλα,,reciprocal,,plural,accusative,neuter,regular,primary,,\nἀλλήλοις,,reciprocal,,plural,dative,neuter,regular,primary,,\nἀλλήλων,,reciprocal,,plural,genitive,neuter,regular,primary,,\nἡμᾶς,,reflexive,1st,plural,accusative,feminine,regular,primary,,\nαὐτά̄ς,,reflexive,1st,plural,accusative,feminine,regular,primary,,\nἡμῖν,,reflexive,1st,plural,dative,feminine,regular,primary,,\nαὐταῖς,,reflexive,1st,plural,dative,feminine,regular,primary,,\nἡμῶν,,reflexive,1st,plural,genitive,feminine,regular,primary,,\nαὐτῶν,,reflexive,1st,plural,genitive,feminine,regular,primary,,\nὑ̄μᾶς,,reflexive,2nd,plural,accusative,feminine,regular,primary,,\nαὐτά̄ς,,reflexive,2nd,plural,accusative,feminine,regular,primary,,\nὑ̄μῖν,,reflexive,2nd,plural,dative,feminine,regular,primary,,\nαὐταῖς,,reflexive,2nd,plural,dative,feminine,regular,primary,,\nὑ̄μῶν,,reflexive,2nd,plural,genitive,feminine,regular,primary,,\nαὐτῶν,,reflexive,2nd,plural,genitive,feminine,regular,primary,,\nἑαυτά̄ς,,reflexive,3rd,plural,accusative,feminine,regular,primary,,\nσφᾶς,,reflexive,3rd,plural,accusative,feminine,regular,primary,,\nαὑτά̄ς,,reflexive,3rd,plural,accusative,feminine,regular,primary,,\nἑαυταῖς,,reflexive,3rd,plural,dative,feminine,regular,primary,,\nσφίσιν,,reflexive,3rd,plural,dative,feminine,regular,primary,,\nαὑταῖς,,reflexive,3rd,plural,dative,feminine,regular,primary,,\nἑαυτῶν,,reflexive,3rd,plural,genitive,feminine,regular,primary,,\nσφῶν,,reflexive,3rd,plural,genitive,feminine,regular,primary,,\nαὑτῶν,,reflexive,3rd,plural,genitive,feminine,regular,primary,,\nἡμᾶς,,reflexive,1st,plural,accusative,masculine,regular,primary,,\nαὐτούς,,reflexive,1st,plural,accusative,masculine,regular,primary,,\nἡμῖν,,reflexive,1st,plural,dative,masculine,regular,primary,,\nαὐτοῖς,,reflexive,1st,plural,dative,masculine,regular,primary,,\nἡμῶν,,reflexive,1st,plural,genitive,masculine,regular,primary,,\nαὐτῶν,,reflexive,1st,plural,genitive,masculine,regular,primary,,\nὑ̄μᾶς,,reflexive,2nd,plural,accusative,masculine,regular,primary,,\nαὐτούς,,reflexive,2nd,plural,accusative,masculine,regular,primary,,\nὑ̄μῖν,,reflexive,2nd,plural,dative,masculine,regular,primary,,\nαὐτοῖς,,reflexive,2nd,plural,dative,masculine,regular,primary,,\nὑ̄μῶν,,reflexive,2nd,plural,genitive,masculine,regular,primary,,\nαὐτῶν,,reflexive,2nd,plural,genitive,masculine,regular,primary,,\nἑαυτούς,,reflexive,3rd,plural,accusative,masculine,regular,primary,,\nσφᾶς,,reflexive,3rd,plural,accusative,masculine,regular,primary,,\nαὑτούς,,reflexive,3rd,plural,accusative,masculine,regular,primary,,\nἑαυτοῖς,,reflexive,3rd,plural,dative,masculine,regular,primary,,\nσφίσιν,,reflexive,3rd,plural,dative,masculine,regular,primary,,\nαὑτοῖς,,reflexive,3rd,plural,dative,masculine,regular,primary,,\nἑαυτῶν,,reflexive,3rd,plural,genitive,masculine,regular,primary,,\nσφῶν,,reflexive,3rd,plural,genitive,masculine,regular,primary,,\nαὑτῶν,,reflexive,3rd,plural,genitive,masculine,regular,primary,,\nἑαυτά,,reflexive,3rd,plural,accusative,neuter,regular,primary,,\nσφέα,,reflexive,3rd,plural,accusative,neuter,regular,primary,,\nαὑτά,,reflexive,3rd,plural,accusative,neuter,regular,primary,,\nἑαυτοῖς,,reflexive,3rd,plural,dative,neuter,regular,primary,,\nσφίσιν,,reflexive,3rd,plural,dative,neuter,regular,primary,,\nαὑτοῖς,,reflexive,3rd,plural,dative,neuter,regular,primary,,\nἑαυτῶν,,reflexive,3rd,plural,genitive,neuter,regular,primary,,\nσφῶν,,reflexive,3rd,plural,genitive,neuter,regular,primary,,\nαὑτῶν,,reflexive,3rd,plural,genitive,neuter,regular,primary,,\nἐμαυτήν,,reflexive,1st,singular,accusative,feminine,regular,primary,,\nἐμαυτῇ,,reflexive,1st,singular,dative,feminine,regular,primary,,\nἐμαυτῆς,,reflexive,1st,singular,genitive,feminine,regular,primary,,\nσεαυτήν,,reflexive,2nd,singular,accusative,feminine,regular,primary,,\nσαυτήν,,reflexive,2nd,singular,accusative,feminine,regular,primary,,\nσεαυτῇ,,reflexive,2nd,singular,dative,feminine,regular,primary,,\nσαυτῇ,,reflexive,2nd,singular,dative,feminine,regular,primary,,\nσεαυτῆς,,reflexive,2nd,singular,genitive,feminine,regular,primary,,\nσαυτῆς,,reflexive,2nd,singular,genitive,feminine,regular,primary,,\nἑαυτήν,,reflexive,3rd,singular,accusative,feminine,regular,primary,,\nαὑτήν,,reflexive,3rd,singular,accusative,feminine,regular,primary,,\nἑαυτῇ,,reflexive,3rd,singular,dative,feminine,regular,primary,,\nαὑτῇ,,reflexive,3rd,singular,dative,feminine,regular,primary,,\nἑαυτῆς,,reflexive,3rd,singular,genitive,feminine,regular,primary,,\nαὑτῆς,,reflexive,3rd,singular,genitive,feminine,regular,primary,,\nἐμαυτόν,,reflexive,1st,singular,accusative,masculine,regular,primary,,\nἐμαυτῷ,,reflexive,1st,singular,dative,masculine,regular,primary,,\nἐμαυτοῦ,,reflexive,1st,singular,genitive,masculine,regular,primary,,\nσεαυτόν,,reflexive,2nd,singular,accusative,masculine,regular,primary,,\nσαυτόν,,reflexive,2nd,singular,accusative,masculine,regular,primary,,\nσεαυτῷ,,reflexive,2nd,singular,dative,masculine,regular,primary,,\nσαυτῷ,,reflexive,2nd,singular,dative,masculine,regular,primary,,\nσεαυτοῦ,,reflexive,2nd,singular,genitive,masculine,regular,primary,,\nσαυτοῦ,,reflexive,2nd,singular,genitive,masculine,regular,primary,,\nἑαυτόν,,reflexive,3rd,singular,accusative,masculine,regular,primary,,\nαὑτόν,,reflexive,3rd,singular,accusative,masculine,regular,primary,,\nἑαυτῷ,,reflexive,3rd,singular,dative,masculine,regular,primary,,\nαὑτῷ,,reflexive,3rd,singular,dative,masculine,regular,primary,,\nἑαυτοῦ,,reflexive,3rd,singular,genitive,masculine,regular,primary,,\nαὑτοῦ,,reflexive,3rd,singular,genitive,masculine,regular,primary,,\nἑαυτό,,reflexive,3rd,singular,accusative,neuter,regular,primary,,\nαὑτό,,reflexive,3rd,singular,accusative,neuter,regular,primary,,\nἑαυτῷ,,reflexive,3rd,singular,dative,neuter,regular,primary,,\nαὑτῷ,,reflexive,3rd,singular,dative,neuter,regular,primary,,\nἑαυτοῦ,,reflexive,3rd,singular,genitive,neuter,regular,primary,,\nαὑτοῦ,,reflexive,3rd,singular,genitive,neuter,regular,primary,,\nὥ,,relative,,dual,accusative,feminine,regular,primary,,\nἅ̄,,relative,,dual,accusative,feminine,irregular,,Attic,\nοἷν,,relative,,dual,dative,feminine,regular,primary,,\nαἷν,,relative,,dual,dative,feminine,irregular,,Attic,\nοἷν,,relative,,dual,genitive,feminine,regular,primary,,\nαἷν,,relative,,dual,genitive,feminine,irregular,,Attic,\nὥ,,relative,,dual,nominative,feminine,regular,primary,,\nἅ̄,,relative,,dual,nominative,feminine,irregular,,Attic,\nὥ,,relative,,dual,accusative,masculine,regular,primary,,\nοἷν,,relative,,dual,dative,masculine,regular,primary,,\nοἷν,,relative,,dual,genitive,masculine,regular,primary,,\nὥ,,relative,,dual,nominative,masculine,regular,primary,,\nὥ,,relative,,dual,accusative,neuter,regular,primary,,\nοἷν,,relative,,dual,dative,neuter,regular,primary,,\nοἷν,,relative,,dual,genitive,neuter,regular,primary,,\nὥ,,relative,,dual,nominative,neuter,regular,primary,,\nἅ̄ς,,relative,,plural,accusative,feminine,regular,primary,,\nαἷς,,relative,,plural,dative,feminine,regular,primary,,\nὧν,,relative,,plural,genitive,feminine,regular,primary,,\nαἵ,,relative,,plural,nominative,feminine,regular,primary,,\nοὕς,,relative,,plural,accusative,masculine,regular,primary,,\nοἷς,,relative,,plural,dative,masculine,regular,primary,,\nὧν,,relative,,plural,genitive,masculine,regular,primary,,\nοἵ,,relative,,plural,nominative,masculine,regular,primary,,\nἅ,,relative,,plural,accusative,neuter,regular,primary,,\nοἷς,,relative,,plural,dative,neuter,regular,primary,,\nὧν,,relative,,plural,genitive,neuter,regular,primary,,\nἅ,,relative,,plural,nominative,neuter,regular,primary,,\nἥν,,relative,,singular,accusative,feminine,regular,primary,,\nᾗ,,relative,,singular,dative,feminine,regular,primary,,\nἧς,,relative,,singular,genitive,feminine,regular,primary,,\nἥ,,relative,,singular,nominative,feminine,regular,primary,,\nὅν,,relative,,singular,accusative,masculine,regular,primary,,\nᾧ,,relative,,singular,dative,masculine,regular,primary,,\nοὗ,,relative,,singular,genitive,masculine,regular,primary,,\nὅς,,relative,,singular,nominative,masculine,regular,primary,,\nὅ,,relative,,singular,accusative,neuter,regular,primary,,\nᾧ,,relative,,singular,dative,neuter,regular,primary,,\nοὗ,,relative,,singular,genitive,neuter,regular,primary,,\nὅ,,relative,,singular,nominative,neuter,regular,primary,,";

var pronounFootnotesCSV$1 = "Index,Text\n1,enclitic\n2,not enclitic\n3,enclitic\n4,The reflexive pronouns are formed by compounding the stems of the personal pronouns with the oblique cases of αὐτός";

var paradigm01 = "{\"ID\":\"verbpdgm1\",\"partOfSpeech\":\"verb\",\"title\":\"-Verbs: Present System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλεύω\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλεύω\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλεύοιμι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβούλευον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύεις\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύῃς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύοις\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βούλευε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβούλευες\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύει\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύοι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευέτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβούλευε(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύετον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύητον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύοιτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύετον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύετον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύετον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύητον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευοίτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευέτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλευέτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλεύομεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλεύωμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλεύοιμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύομεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύετε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύητε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύοιτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύετε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύετε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύουσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύωσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύοιεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευόντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβούλευον\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"βουλεύειν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"βουλεύων, βουλεύουσᾰ, βουλεῦον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm54\"}}]}]}]}";

var paradigm02 = "{\"ID\":\"verbpdgm2\",\"partOfSpeech\":\"verb\",\"title\":\"-Verbs: Present System Middle-Passive\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλεύομαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλεύωμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευοίμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβουλευόμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύοιο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύου\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύου\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύεται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύηται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύοιτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευέσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύετο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύεσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύησθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύοισθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύεσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύεσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύεσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύησθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευοίσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευέσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλευέσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλευόμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλευώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευοίμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβουλευόμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύεσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύησθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύοισθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύεσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύεσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύονται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύωνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύοιντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευέσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύοντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"βουλεύεσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"βουλευόμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm03 = "{\"ID\":\"verbpdgm3\",\"partOfSpeech\":\"verb\",\"title\":\"Future System (without contraction)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"active indicative\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"active optative\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"middle\",\"mood\":\"indicative\",\"value\":\"middle indicative\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"middle\",\"mood\":\"optative\",\"value\":\"middle optative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλεύσω\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλεύσοιμι\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλεύσομαι\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευσοίμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύσεις\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσοις\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύσῃ (-ει)\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσοιο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύσει\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύσοι\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύσεται\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύσοιτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύσετον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσοιτον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύσετον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσοισθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύσετον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευσοίτην\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύσετον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευσοίσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλεύσομεν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλεύσοιμεν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλευσόμεθα\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευσοίμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύσετε\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσοιτε\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλεύσεσθε\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσοισθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύσουσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύσοιεν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλεύσονται\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύσοιντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"active infinitive\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"βουλεύσειν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"middle  infinitive\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"mood\":\"infinitive\",\"value\":\"βουλεύσεσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"active participle\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"βουλεύσων, βουλεύσουσᾰ, βουλεῦσον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm54\"}}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"middle participle\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"value\":\"βουλευσόμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]},{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"passive\",\"mood\":\"indicative\",\"value\":\"passive indicative\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"passive\",\"mood\":\"optative\",\"value\":\"passive optative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλευθήσομαι\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευθησοίμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλευθήσῃ (-ει)\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλευθήσοιο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλευθήσεται\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευθήσοιτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλευθήσεσθον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλευθήσοισθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλευθήσεσθον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευθησοίσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βουλευθησόμεθα\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευθησοίμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βουλευθήσεσθε\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλευθήσοισθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βουλευθήσονται\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευθήσοιντο\"}]}]},{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"passive infinitive\"},{\"role\":\"data\",\"tense\":\"future\",\"mood\":\"infinitive\",\"value\":\"βουλευθήσεσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"passive participle\"},{\"role\":\"data\",\"tense\":\"future\",\"value\":\"βουλευθησόμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm04 = "{\"ID\":\"verbpdgm4\",\"partOfSpeech\":\"verb\",\"title\":\"Future System (Active and Middle) with contraction in -\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"active indicative\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"active optative\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"middle\",\"mood\":\"indicative\",\"value\":\"middle indicative\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"middle\",\"mood\":\"optative\",\"value\":\"middle optative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βαλῶ\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βαλοίην\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἀποθανοῦμαι\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἀποθανοίμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βαλεῖς\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βαλοίης\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἀποθανῇ\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἀποθανοῖο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βαλεῖ\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βαλοίη\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἀποθανεῖται\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἀποθανοῖτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βαλεῖτον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βαλοῖτον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἀποθανεῖσθον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἀποθανοῖσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βαλεῖτον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βαλοίτην\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἀποθανεῖσθον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἀποθανοίσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"βαλοῦμεν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βαλοῖμεν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἀποθανούμεθα\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἀποθανοίμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"βαλεῖτε\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βαλοῖτε\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἀποθανεῖσθε\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἀποθανοῖσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"βαλοῦσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βαλοῖεν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἀποθανοῦνται\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἀποθανοῖντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"active infinitive\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"βαλεῖν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"middle  infinitive\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"mood\":\"infinitive\",\"value\":\"ἀποθανεῖσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"active participle\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"βαλῶν, βαλοῦσᾰ, βαλοῦν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm55\"}}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"value\":\"middle participle\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"middle\",\"value\":\"ἀποθανούμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm05 = "{\"ID\":\"verbpdgm5\",\"partOfSpeech\":\"verb\",\"title\":\"Future System (Active) with contraction in -\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"active indicative\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"active optative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐλᾶ\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἐλῴην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐλᾷς\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἐλῴης\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐλᾷ\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἐλῴη\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐλᾶτον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἐλῷτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐλᾶτον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἐλῴτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐλῶμεν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἐλῷμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐλᾶτε\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἐλῷτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐλῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἐλῷεν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"active infinitive\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"ἐλᾶν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"active participle\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"value\":\"ελῶν, ἐλῶσᾰ, ἐλῶν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm56\"}}]}]}]}";

var paradigm06 = "{\"ID\":\"verbpdgm6\",\"partOfSpeech\":\"verb\",\"title\":\"Strong (2nd) Aorist System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἤγαγον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγω\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἀγάγοιμι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἤγαγες\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγῃς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἀγάγοις\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἄγαγε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἤγαγε(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγῃ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἀγάγοι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἀγαγέτω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἠγάγετον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἀγάγοιτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἀγάγετον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἠγαγέτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἀγαγοίτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἀγαγέτων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἠγάγομεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγωμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἀγάγοιμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἠγάγετε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἀγάγοιτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἀγάγετε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἤγαγον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγωσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἀγάγοιεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἀγαγόντων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"ἀγαγεῖν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"ἀγαγών, ἀγαγοῦσᾰ, ἀγαγόν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm57\"}}]}]}]}";

var paradigm07 = "{\"ID\":\"verbpdgm7\",\"partOfSpeech\":\"verb\",\"title\":\"Strong (2nd) Aorist System Middle\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἠγαγόμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγωμαι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἀγαγοίμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἠγάγου\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγῃ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἀγάγοιο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἀγαγοῦ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἠγάγετο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγηται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἀγάγοιτο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἀγαγέσθω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἠγάγεσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγησθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἀγάγοισθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἀγάγεσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἠγαγέσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγησθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἀγαγοίσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἀγαγέσθων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἠγαγόμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἀγαγώμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἀγαγοίμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἠγάγεσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγησθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἀγάγοισθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἀγάγεσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἠγάγοντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἀγάγωνται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἀγάγοιντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἀγαγέσθων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"infinitive\",\"value\":\"ἀγαγέσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"ἀγαγόμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm08 = "{\"ID\":\"verbpdgm8\",\"partOfSpeech\":\"verb\",\"title\":\"Weak (1st) Aorist System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβούλευσα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσω\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλεύσαιμι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβούλευσας\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσῃς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσειας\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βούλευσον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβούλευσε(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσῃ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύσειε(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευσάτω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύσατον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσαιτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύσατον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλευσάτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευσαίτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευσάτων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύσαμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσωμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλεύσαιμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύσατε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσαιτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύσατε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβούλευσαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσωσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύσειαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευσάντων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"βουλεῦσαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"βουλεύσας, βουλεύσασᾰ, βουλεῦσαν\",\"reflink\":{\"text\":\"(see declension\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm58\"}}]}]}]}";

var paradigm09 = "{\"ID\":\"verbpdgm9\",\"partOfSpeech\":\"verb\",\"title\":\"Weak (1st) Aorist System Middle\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβουλευσάμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσωμαι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευσαίμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύσω\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσῃ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσαιο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βούλευσαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύσατο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσηται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύσαιτο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευσάσθω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύσασθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσησθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσαισθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύσασθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλευσάσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσησθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευσαίσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευσάσθων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβουλευσάμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλευσώμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευσαίμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύσασθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσησθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλεύσαισθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύσασθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύσαντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλεύσωνται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλεύσαιντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευσάσθων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"infinitive\",\"value\":\"βουλεύσασθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"βουλευσάμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm10 = "{\"ID\":\"verbpdgm10\",\"partOfSpeech\":\"verb\",\"title\":\"Aorist Passive System\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"mood\":\"indicative\",\"value\":\"2nd aorist indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλευθῶ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευθείην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐγράφην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύθης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλευθῇς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλευθείης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύθητι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐγράφης\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύθη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλευθῇ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευθείη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευθήτω\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐγράφη\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύθητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλευθῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλευθείητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύθητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐγράφητον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλευθήτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλευθῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευθειήτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευθήτων\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐγραφήτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύθημεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βουλευθῶμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βουλευθείημεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐγράφημεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύθητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βουλευθῆτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βουλευθείητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βουλεύθητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐγράφητε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβουλεύθησαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βουλευθῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βουλευθείησαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βουλευθέντων\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐγράφησαν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"mood\":\"infinitive\",\"value\":\"βουλευθῆναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"βουλευθείς, βουλευθεῖσᾰ, βουλευθέν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm60\"}}]}]}]}";

var paradigm11 = "{\"ID\":\"verbpdgm11\",\"partOfSpeech\":\"verb\",\"title\":\"Perfect Active System\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"1st perfect indicative\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"2nd perfect indicative\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive (simple)\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive (periphrastic)\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λέλυκα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λέλοιπα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"λελοίπω\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"λελοιπὼς ὦ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λέλυκας\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λέλοιπας\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"λελοίπῃς\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"λελοιπὼς (-υῖα) ᾖς\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λέλυκε(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λέλοιπε(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελοίπῃ\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελοιπὼς (-υῖα, -ὸς) ᾖ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελύκατον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελοίπατον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"λελοίπητον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"λελοιπότε (-υίᾱ) ἦτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελύκατον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελοίπατον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελοίπητον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελοιπότε (-υίᾱ) ἦτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λελύκαμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λελοίπαμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"λελοίπωμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"λελοιπότες (-υῖαι) ὦμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελύκατε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελοίπατε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"λελοίπητε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"λελοιπότες (-υῖαι) ἦτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελύκᾱσι(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελοίπᾱσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελοίπωσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελοιπότες (-υῖαι) ὦσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελοιπότα ᾖ\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative (simple)\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative (periphrastic)\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"λελοίποιμι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"λελοιπὼς (-υῖα) εἴην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"λελοίποις\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"λελοιπὼς (-υῖα) εἴης\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"λελοιπὼς (-υῖα) ἴσθι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελοίποι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελοιπὼς (-υῖα, -ὸς) εἴη\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"λελοιπὼς (-υῖα, -ὸς) ἔστω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"λελοίποιτον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"λελοιπότε (-υία) εἴητον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"λελοιπότε (-υία) ἔστον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελοιποίτην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελοιπότε (-υία) ειήτην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"λελοιπότε (-υία) ἔστων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"λελοίποιμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"λελοιπότες (-υῖαι) εἶμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"λελοίποιτε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"λελοιπότες (-υῖαι) εἶτε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"λελοιπότες (-υῖαι) ἔστε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελοίποιεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελοιπότες (-υῖαι) εἶεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"λελοιπότες (-υῖαι) ἔστων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελοιπότα εἴη\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"λελοιπότα ἔστω\"}]}]},{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"λελυκέναι; λελοιπέναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"λελυκώς, λελυκυῖᾰ, λελυκός\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm63\"}}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"λελοιπώς, λελοιπυῖᾰ, λελοιπός\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm63\"}}]}]}]}";

var paradigm12 = "{\"ID\":\"verbpdgm12\",\"partOfSpeech\":\"verb\",\"title\":\"Perfect System Middle-Passive: indicative, infinitive, participle\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"vowel stem\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"dental plosive stem\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"labial plosive stem\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λέλυμαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"πέπεισμαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"γέγραμμαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λέλυσαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πέπεισαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"γέγραψαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λέλυται\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πέπεισται\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"γέγραπται\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λέλυσθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πέπεισθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"γέγραφθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λέλυσθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πέπεισθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"γέγραφθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λελύμεθα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"πεπείσμεθα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"γεγράμμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λέλυσθε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πέπεισθε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"γέγραφθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λέλυνται\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεπεισμένοι (-αι) εἰσί(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"γεγραμμένοι (-αι) εἰσί(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεπεισμένα ἐστί(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"γεγραμμένα ἐστί(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"λελύσθαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"πεπεῖσθαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"γεγράφθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"λελυμένος, -η, -ον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"πεπεισμένος, -η, -ον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"γεγραμμένος, -η, -ον\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"velar plosive stem\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"stem in\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"stem in\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"πέπραγμαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἤγγελμαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"πέφασμαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πέπραξαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἤγγελσαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"———\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πέπρακται\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἤγγελται\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πέφανται\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πέπραχθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἤγγελθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πέφανθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πέπραχθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἤγγελθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πέφανθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"πεπράγμεθα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἠγγέλμεθα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"πεφάσμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πέπραχθε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἤγγελθε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πέφανθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεπραγμένοι (-αι) εἰσί(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἠγγελμένοι (-αι) εἰσί(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεφασμένοι (-αι) εἰσί(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεπραγμένα ἐστί(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἠγγελμένα ἐστί(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεφασμένα ἐστί(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"πεπρᾶχθαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"ἠγγέλθαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"πεφάνθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"πεπραγμένος, -η, -ον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"ἠγγελμένος, -η, -ον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"πεφασμένος, -η, -ον\"}]}]}]}";

var paradigm13 = "{\"ID\":\"verbpdgm13\",\"partOfSpeech\":\"verb\",\"title\":\"Perfect System Middle-Passive: periphrastic subjunctive, optative, imperative\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"λελυμένος (-η) ὦ\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"λελυμένος (-η) εἴην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"λελυμένος (-η) ᾖς\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"λελυμένος (-η) εἴης\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"λελυμένος (-η) ἴσθι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελυμένος (-η, -ον) ᾖ\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελυμένος (-η, -ον) εἴη\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"λελυμένος (-η, -ον) ἔστω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"λελυμένω (-ᾱ) ἦτον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"λελυμένω (-ᾱ) εἴητον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"λελυμένω (-ᾱ) ἔστον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελυμένω (-ᾱ) ἦτον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελυμένω (-ᾱ) εἰήτην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"λελυμένω (-ᾱ) ἔστων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"λελυμένοι (-αι) ὦμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"λελυμένοι (-αι) εἶμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"λελυμένοι (-αι) ἦτε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"λελυμένοι (-αι) εἶτε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"λελυμένοι (-αι) ἔστε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελυμένοι (-αι) ὦσι(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελυμένοι (-αι) εἴεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"λελυμένοι (-αι) ἔστων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"λελυμένᾰ ᾖ\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"λελυμένᾰ εἴη\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"λελυμένᾰ ἔστω\"}]}]},\"subTables\":[]}";

var paradigm14 = "{\"ID\":\"verbpdgm14\",\"partOfSpeech\":\"verb\",\"title\":\"Perfect System Middle-Passive: simple subjunctive, optative, imperative\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"μεμνῶμαι\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"μεμνῄμην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"μεμνῴμην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"μεμνῇ\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"μεμνῇο\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"μεμνῷο\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"μέμνησο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"μεμνῆται\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"μεμνῇτο\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"μεμνῷτο\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"μεμνήσθω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"μεμνῆσθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"μεμνῇσθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"μεμνῷσθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"μεμνῆσθον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"μεμνῄσθην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"μεμνῴσθην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"μεμνώμεθα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"μεμνῄμεθα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"μεμνῴμεθα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"μεμνῆσθε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"μεμνῇσθε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"μεμνῷσθε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"μέμνησθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"μεμνῶνται\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"μεμνῇντο\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"μεμνῷντο\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"\"}]}]},\"subTables\":[]}";

var paradigm15 = "{\"ID\":\"verbpdgm15\",\"partOfSpeech\":\"verb\",\"title\":\"Pluperfect Middle-Passive Indicative\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"active\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"m.-p.: vowel stem\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"m.-p.: dental plosive stem\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"m.-p.: labial plosive stem\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐλελύκη\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐλελύμην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐπεπείσμην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐγεγράμμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐλελύκης\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐλέλυσο\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπέπεισο\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐγέγραψο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐλελύκει(ν)\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐλέλυτο\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐπέπειστο\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐγέγραπτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐλελύκετον\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐλέλυσθον\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπέπεισθον\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐγέγραφθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐλελυκέτην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐλελύσθην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐπεπείσθην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐγεγράφθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐλελύκεμεν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐλελύμεθα\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐπεπείσμεθα\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐγεγράμμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐλελύκετε\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐλέλυσθε\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπέπεισθε\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐγέγραφθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐλελύκεσαν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐλέλυντο\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεπεισμένοι (-αι) ἦσαν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"γεγραμμένοι (-αι) ἦσαν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεπεισμένα ἦν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"γεγραμμένα ἦν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"m.-p.: velar plosive stem\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"m.-p.: stem in\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"m.-p.: stem in\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐπεπράγμην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἠγγέλμην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐπεφάσμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπέπραξο\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἤγγελσο\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"———\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐπέπρακτο\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἤγγελτο\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐπέφαντο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπέπραχθον\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἤγγελθον\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπέφανθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐπεπράχθην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἠγγέλθην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐπεφάνθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐπεπράγμεθα\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἠγγέλμεθα\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐπεφάσμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπέπραχθε\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἤγγελθε\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπέφανθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεπραγμένοι (-αι) ἦσαν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἠγγελμένοι (-αι) ἦσαν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεφασμένοι (-αι) ἦσαν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεπραγμένα ἦν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἠγγελμένα ἦν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πεφασμένα ἦν\"}]}]}]}";

var paradigm16 = "{\"ID\":\"verbpdgm16\",\"partOfSpeech\":\"verb\",\"title\":\"Future Perfect Indicative, Infinitive, Participle\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"periphrastic active\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"simple active (rare)\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"middle-passive\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λελυκὼς (-υῖα) ἔσομαι\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"τεθνήξω\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λελύσομαι\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λελυμένος (-η) ἔσομαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελυκὼς (-υῖα) ἔσῃ\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"τεθνήξεις\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελύσῃ\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελυμένος (-η) ἔσῃ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"number\":\"singular\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελυκὼς (-υῖα, -ὸς) ἔσται\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"τεθνήξει\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελύσεται\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελυμένος (-η, -ον) ἔσται\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελυκότε (-υία) ἔσεσθον\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"τεθνήξετον\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελύσεσθον\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελυμένω (-ᾱ) ἔσεσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"number\":\"dual\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελυκότε (-υία) ἔσεσθον\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"τεθνήξετον\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελύσεσθον\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελυμένω (-ᾱ) ἔσεσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λελυκότες (-υῖαι) ἐσόμεθα\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"τεθνήξομεν\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λελυσόμεθα\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"λελυμένοι (-αι) ἐσόμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελυκότες (-υῖαι) ἔσεσθε\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"τεθνήξετε\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελύσεσθε\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"λελυμένοι (-αι) ἔσεσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελυκότες (-υῖαι) ἔσονται\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"τεθνήξουσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελύσονται\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελυμένοι (-αι) ἔσονται\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"number\":\"plural\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελυκότα ἔσται\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"λελυμένᾰ ἔσται\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"active infinitive\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"periphrastic:\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"middle-passive infinitive\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"future_perfect\",\"mood\":\"indicative\",\"value\":\"middle-passive participle\"},{\"role\":\"label\",\"tense\":\"future_perfect\",\"voice\":\"mediopassive middle\",\"value\":\"\"}]}]}]}";

var paradigm17 = "{\"ID\":\"verbpdgm17\",\"partOfSpeech\":\"verb\",\"title\":\"Athematic Perfects\\r\\n          (in addition to forms from )\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"perfect\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"perfect\",\"mood\":\"optative\",\"value\":\"optative (poetic)\"},{\"role\":\"label\",\"tense\":\"perfect\",\"mood\":\"imperative\",\"value\":\"imperative (poetic)\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"mood\":\"indicative\",\"value\":\"pluperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"perfect\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἑστῶ\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἕσταίην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἑστῇς\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἕσταίης\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἕσταθι\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἑστῇ\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἕσταίη\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἑστάτω\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"perfect\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἕστατον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἑστῆτον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἑσταῖτον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἕστατον\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἕστατον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἕστατον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἑστῆτον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἑσταίτην\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἑστάτων\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑστάτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"perfect\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἕσταμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἑστῶμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἑσταῖμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἕσταμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἕστατε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἑστῆτε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἑσταῖτε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἕστατε\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἕστατε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑστᾶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἑστῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἑσταῖεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἑστάντων\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἕστασαν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"perfect\",\"mood\":\"infinitive\",\"value\":\"ἑστάναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"perfect\",\"value\":\"ἑστώς, ἑστῶσᾰ, ἑστός\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"verbpdgm64\"}}]}]}]}";

var paradigm18 = "{\"ID\":\"verbpdgm18\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Active of Contract Verbs in -\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ποιῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ποιῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(ποιοῖμι)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ποιοίην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐποίουν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ποιεῖς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ποιῇς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ποιοῖς)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ποιοίης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ποίει\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐποίεις\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ποιεῖ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ποιῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ποιοῖ)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ποιοίη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ποιείτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐποίει\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ποιεῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ποιῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ποιοῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ποιοίητον)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ποιεῖτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐποιεῖτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ποιεῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ποιῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ποιοίτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ποιοιήτην)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ποιείτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐποιείτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ποιοῦμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ποιῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ποιοῖμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(ποιοίημεν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐποιούμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ποιεῖτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ποιῆτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ποιοῖτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ποιοίητε)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ποιεῖτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐποιεῖτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ποιοῦσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ποιῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ποιοῖεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ποιοίησαν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ποιούντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐποιοῦντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"ποιεῖν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"ποιῶν, ποιοῦσᾰ, ποιοῦν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm55\"}}]}]}]}";

var paradigm19 = "{\"ID\":\"verbpdgm19\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Active of Contract Verbs in - (monosyllabic stems)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"πλέω\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"πλέω\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"πλέοιμι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔπλεον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πλεῖς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"πλέῃς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"πλέοις\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"πλεῖ\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔπλεις\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πλεῖ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"πλέῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"πλέοι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"πλείτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔπλει\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πλεῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"πλέητον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"πλέοιτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"πλεῖτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπλεῖτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πλεῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"πλέητον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"πλεοίτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"πλείτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐπλεῖτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"πλέομεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"πλέωμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"πλέοιμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐπλεόμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"πλεῖτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"πλέητε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"πλέοιτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"πλεῖτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπλεῖτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"πλέουσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"πλέωσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"πλέοιεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"πλεόντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔπλεον\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"πλεῖν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"πλέων, πλέουσᾰ, πλέον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm54\"}}]}]}]}";

var paradigm20 = "{\"ID\":\"verbpdgm20\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Middle-Passive of Contract Verbs in -\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ποιοῦμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ποιῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ποιοίμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐποίουν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ποιῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ποιῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ποιοῖο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ποιοῦ\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐποίεις\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ποιεῖται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ποιῆται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ποιοῖτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ποιείσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐποίει\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ποιεῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ποιῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ποιοῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ποιεῖσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐποίεῖσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ποιεῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ποιῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ποιοίσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ποιείσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐποιείσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ποιούμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ποιώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ποιοίμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐποιούμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ποιεῖσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ποιῆσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ποιοῖσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ποιεῖσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐποιεῖσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ποιοῦνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ποιῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ποιοῖντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ποιείσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐποιοῦντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"ποιεῖσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"ποιούμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm21 = "{\"ID\":\"verbpdgm21\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Middle-Passive of Contract Verbs in - (monosyllabic stem)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δέομαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δέωμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δεοίμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδεόμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δέῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δέῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δέοιο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δέου\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδέου\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δεῖται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δέηται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δέοιτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δείσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδεῖτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δεῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δέησθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δέοισθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δεῖσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδεῖσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δεῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δέησθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δεοίσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δείσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδείσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δεόμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δεώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δεοίμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδεόμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δεῖσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δέησθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δέοισθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δεῖσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδεῖσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δέονται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δέωνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δέοιντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δείσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδέοντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"δεῖσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"δεόμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm22 = "{\"ID\":\"verbpdgm22\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Active of Contract Verbs in -\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ὁρῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ὁρῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(ὁρῷμι)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ὁρῴην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἑώρων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ὁρᾷς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾷς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ὁρῷς)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ὁρῴης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ὁρᾱ\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἑώρᾱς\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ὁρᾷ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾷ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ὁρῷ)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ὁρῴη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ὁράτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑώρᾱ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ὁρᾶτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾶτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ὁρῷτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ὁρῴητον)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ὁρᾶτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἑωρᾶτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ὁρᾶτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾶτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ὁρῴτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ὁρῳήτην)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ὁράτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑωράτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ὁρῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ὁρῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ὁρῷμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(ὁρῴημεν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἑωρῶμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ὁρᾶτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾶτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ὁρῷτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ὁρῴμεν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ὁρᾶτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἑωρᾶτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ὁρῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ὁρῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ὁρῷεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ὁρῴημεν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ὁρώντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑώρων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"ὁρᾶν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"ὁρῶν, ὁρῶσᾰ, ὁρῶν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm56\"}}]}]}]}";

var paradigm23 = "{\"ID\":\"verbpdgm23\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Active of Contract Verbs in - (with  contraction)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"χρῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"χρῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"χρῴην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔχρων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"χρῇς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"χρῇς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"χρῴης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"χρῆ\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔχρης\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"χρῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"χρῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"χρῴη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"χρήτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔχρη\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"χρῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"χρῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"χρῷτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"χρῆτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐχρῆτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"χρῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"χρῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"χρῴτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"χρήτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐχρήτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"χρῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"χρῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"χρῷμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐχρῶμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"χρῆτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"χρῆτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"χρῷτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"χρῆτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐχρῆτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"χρῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"χρῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"χρῷεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"χρώντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔχρων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"χρῆν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"χρῶν, χρῶσᾰ, χρῶν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm56\"}}]}]}]}";

var paradigm24 = "{\"ID\":\"verbpdgm24\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Middle-Passive of Contract Verbs in -\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ὁρῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ὁρῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ὁρῴμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἑωρώμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ὁρᾷ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾷ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ὁρῷο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ὁρῶ\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἑωρῶ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ὁρᾶται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾶται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ὁρῷτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ὁράσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑωρᾶτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ὁρᾶσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾶσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ὁρῷσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ὁρᾶσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἑωρᾶσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ὁρᾶσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾶσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ὁρῴσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ὁράσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑωράσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ὁρώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ὁρώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ὁρῴμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἑωρώμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ὁρᾶσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ὁρᾶσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ὁρῷσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ὁρᾶσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἑωρᾶσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ὁρῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ὁρῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ὁρῷντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ὁράσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑωρῶντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"ὁρᾶσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"ὁρώμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm25 = "{\"ID\":\"verbpdgm25\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Middle-Passive of Contract Verbs in -  (with  contraction)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"χρῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"χρῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"χρῴμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐχρώμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"χρῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"χρῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"χρῷο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"χρῶ\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐχρῶ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"χρῆται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"χρῆται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"χρῷτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"χρήσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐχρῆτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"χρῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"χρῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"χρῷσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"χρῆσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐχρῆσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"χρῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"χρῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"χρῴσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"χρήσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐχρήσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"χρώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"χρώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"χρῴμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐχρώμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"χρῆσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"χρῆσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"χρῷσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"χρῆσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐχρῆσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"χρῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"χρῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"χρῷντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"χρήσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐχρῶντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"χρῆσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"χρώμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm26 = "{\"ID\":\"verbpdgm26\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Active of Contract Verbs in -\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δηλῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δηλῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(δηλοῖμι)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δηλοίην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδήλουν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δηλοῖς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δηλοῖς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(δηλοῖς)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δηλοίης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δήλου\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδήλους\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δηλοῖ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δηλοῖ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(δηλοῖ)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δηλοίη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δηλούτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδήλου\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δηλοῦτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δηλῶτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δηλοῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(δηλοίητον)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δηλοῦτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδηλοῦτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δηλοῦτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δηλῶτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δηλοίτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(δηλοιήτην)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δηλούτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδηλούτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δηλοῦμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δηλῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δηλοῖμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(δηλοίημεν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδηλοῦμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δηλοῦτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δηλῶτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δηλοῖτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(δηλοίητε)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δηλοῦτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδηλοῦτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δηλοῦσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δηλῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δηλοῖεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(δηλοίησαν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δηλούντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδήλουν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"δηλοῦν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"δηλῶν, δηλοῦσᾰ, δηλοῦν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm55\"}}]}]}]}";

var paradigm27 = "{\"ID\":\"verbpdgm27\",\"partOfSpeech\":\"verb\",\"title\":\"Present System Middle-Passive of Contract Verbs in -\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δηλοῦμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δηλῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δηλοίμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδηλούμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δηλοῖ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δηλοῖ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δηλοῖο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δηλοῦ\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδηλοῦ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δηλοῦται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δηλῶται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δηλοῖτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δηλούθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδηλοῦτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δηλοῦσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δηλῶσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δηλοῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δηλοῦσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδηλοῦσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δηλοῦσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δηλῶσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δηλοίσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δηλούσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδηλούσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δηλούμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δηλώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δηλοίμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδηλούμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δηλοῦσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δηλῶσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δηλοῖσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δηλοῦσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδηλοῦσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δηλοῦνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δηλῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δηλοῖντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δηλούσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδηλοῦντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"δηλοῦσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"δηλούμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm28 = "{\"ID\":\"verbpdgm28\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"τίθημι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"τιθῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"τιθείην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐτίθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"τίθης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"τιθῇς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"τιθείης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"τίθει\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐτίθεις\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"τίθησι(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"τιθῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"τιθείη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"τιθέτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐτίθει\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"τίθετον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"τιθῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"τιθεῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"τίθετον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐτίθετον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"τίθετον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"τιθῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"τιθείτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"τιθέτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐτιθέτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"τίθεμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"τιθῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"τιθεῖμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐτίθεμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"τίθετε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"τιθῆτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"τιθεῖτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"τίθετε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐτίθετε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"τιθέᾱσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"τιθῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"τιθεῖεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"τιθέντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐτίθεσαν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"τιθέναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"τιθείς, τιθεῖσᾰ, τιθέν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm60\"}}]}]}]}";

var paradigm29 = "{\"ID\":\"verbpdgm29\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Middle-Passive\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"τίθεμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"τιθῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"τιθείμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐτιθέμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"τίθεσαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"τιθῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"τιθεῖο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"τίθεσο\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐτίθεσο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"τίθεται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"τιθῆται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"τιθεῖτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"τιθέσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐτίθετο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"τίθεσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"τιθῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"τιθεῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"τίθεσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐτίθεσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"τίθεσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"τιθῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"τιθείσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"τιθέσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐτιθέσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"τιθέμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"τιθώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"τιθείμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐτιθέμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"τίθεσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"τιθῆσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"τιθεῖσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"τίθεσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐτίθεσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"τίθενται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"τιθῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"τιθεῖντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"τιθέσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐτίθεντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"τίθεσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"τιθέμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm30 = "{\"ID\":\"verbpdgm30\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔθηκα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"θῶ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"θείην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔθηκας\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"θῇς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"θείης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"θές\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔθηκε(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"θῇ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"θείη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"θέτω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔθετον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"θῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"θεῖτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"θέτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐθέτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"θῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"θείτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"θέτων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔθεμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"θῶμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"θείημεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔθετε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"θῆτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"θείητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"θέτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔθεσαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"θῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"θεῖεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"θέντων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"θεῖναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"θείς, θεῖσᾰ, θέν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm60\"}}]}]}]}";

var paradigm31 = "{\"ID\":\"verbpdgm31\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System Middle\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐθέμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"θῶμαι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"θείμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔθου\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"θῇ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"θεῖο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"θοῦ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔθετο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"θῆται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"θεῖτο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"θέσθω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔθεσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"θῆσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"θεῖσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"θέσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐθέσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"θῆσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"θείσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"θέσθων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐθέμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"θώμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"θείμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔθεσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"θῆσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"θεῖσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"θέσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔθεντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"θῶνται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"θεῖντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"θέσθων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"infinitive\",\"value\":\"θέσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"θέμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm32 = "{\"ID\":\"verbpdgm32\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵημι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἱῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἱείην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱῇς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱείης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵει\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵεις\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵησι(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱείη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱέτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵει\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵετον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱεῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵετον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵετον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵετον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱείτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱέτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἱέτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵεμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἱῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἱεῖμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵεμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵετε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱῆτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱεῖτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵετε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵετε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἱᾱσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱεῖεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱέντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵεσαν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"ἱέναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"ἱείς, ἱεῖσᾰ, ἱέν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm60\"}}]}]}]}";

var paradigm33 = "{\"ID\":\"verbpdgm33\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Middle-Passive\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵεμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἱῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἱείμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἱέμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵεσαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱεῖο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵεσο\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵεσο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵεται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱῆται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱεῖτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱέσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵετο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵεσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱεῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵεσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵεσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵεσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱείσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱέσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἱέσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἱέμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἱώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἱείμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἱέμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵεσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱῆσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱεῖσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵεσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵεσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵενται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱεῖντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱέσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵεντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"ἵεσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"ἱέμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm34 = "{\"ID\":\"verbpdgm34\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"(ἀφ)ῆκα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῶ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(ἀφ)είην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)ῆκας\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῇς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ἀφ)είης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)ές\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)ῆκε(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῇ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ἀφ)είη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)έτω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)εῖτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ἀφ)εῖτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)έτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)είτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ἀφ)είτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)έτων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"(ἀφ)εῖμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῶμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(ἀφ)εῖμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)εῖτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῆτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ἀφ)εῖτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)έτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)εῖσαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ἀφ)εῖεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)έντων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"(ἀφ)εῖναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"(ἀφ)είς, (ἀφ)εῖσᾰ, (ἀφ)έν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm60\"}}]}]}]}";

var paradigm35 = "{\"ID\":\"verbpdgm35\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System Middle\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"(ἀφ)είμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῶμαι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(ἀφ)είμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)εῖσο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῇ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ἀφ)εῖο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)οῦ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)εῖτο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῆται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ἀφ)εῖτο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)έσθω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)εῖσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῆσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ἀφ)εῖσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"(ἄφ)εσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)είσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῆσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ἀφ)είσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)έσθων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"(ἀφ)είμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ώμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"(ἀφ)είμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)εῖσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῆσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"(ἀφ)εῖσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"(ἄφ)εσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"(ἀφ)εῖντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"(ἀφ)ῶνται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"(ἀφ)εῖντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"(ἀφ)έσθων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"infinitive\",\"value\":\"(ἀφ)έσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"(ἀφ)έμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm36 = "{\"ID\":\"verbpdgm36\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δίδωμι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"διδῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"διδοίην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδίδουν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δίδως\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"διδῷς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"διδοίης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δίδου\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδίδους\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δίδωσι(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"διδῷ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"διδοίη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"διδότω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδίδου\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δίδοτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"διδῶτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"διδοῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δίδοτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδίδοτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δίδοτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"διδῶτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"διδοίτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"διδότων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδιδότην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δίδομεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"διδῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"διδοῖμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδίδομεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δίδοτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"διδῶτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"διδοῖτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δίδοτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδίδοτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"διδόᾱσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"διδῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"διδοῖεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"διδόντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδίδοσαν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"διδόναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"διδούς, διδοῦσᾰ, διδόν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm61\"}}]}]}]}";

var paradigm37 = "{\"ID\":\"verbpdgm37\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Middle-Passive\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δίδομαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"διδῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"διδοίμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδιδόμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δίδοσαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"διδῷ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"διδοῖο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δίδοσο\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδίδοσο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δίδοται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"διδῶται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"διδοῖτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"διδόσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδίδοτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δίδοσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"διδῶσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"διδοῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δίδοσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδίδοσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δίδοσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"διδῶσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"διδοίσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"διδόσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδιδόσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"διδόμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"διδώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"διδοίμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδιδόμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δίδοσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"διδῶσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"διδοῖσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δίδοσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδίδοσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δίδονται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"διδῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"διδοῖντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"διδόσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδίδοντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"δίδοσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"διδόμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm38 = "{\"ID\":\"verbpdgm38\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔδωκα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δῶ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δοίην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔδωκας\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δῷς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δοίης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δός\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔδωκε(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δῷ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δοίη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δότω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔδοτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δῶτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δοῖτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δότον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδότην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δῶτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δοίτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δότων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔδομεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δῶμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δοίημεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔδοτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δῶτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δοίητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δότε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔδοσαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δοῖεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δόντων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"δοῦναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"δούς, δοῦσᾰ, δόν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm61\"}}]}]}]}";

var paradigm39 = "{\"ID\":\"verbpdgm39\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System Middle\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδόμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δῶμαι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δοίμην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔδου\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δῷ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δοῖο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δοῦ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔδοτο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δῶται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δοῖτο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δόσθω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔδοσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δῶσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δοῖσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δόσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδόσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δῶσθον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δοίσθην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δόσθων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδόμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δῶμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δοίμεθα\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔδοσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δῶσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δοῖσθε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δόσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔδοντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δῶνται\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δοῖντο\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δόσθων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"mood\":\"infinitive\",\"value\":\"δόσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"middle\",\"value\":\"δόμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm40 = "{\"ID\":\"verbpdgm40\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵστημι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἱστῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἱσταίην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵστην [ῑ]\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῇς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱσταίης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵστη\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστης\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵστησι(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱσταίη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱστάτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵστη\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστατον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱσταῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵστατον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστατον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵστατον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱσταίτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱστάτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἱστάτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵσταμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἱστῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἱσταῖμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵσταμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστατε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῆτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱσταῖτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵστατε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστατε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἱστᾶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱσταῖεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱστάντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵστασαν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"ἱστάναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"ἱστάς, ἱστᾶσᾰ, ἱστάν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm59\"}}]}]}]}";

var paradigm41 = "{\"ID\":\"verbpdgm41\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Middle-Passive\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἵσταμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἱστῶμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἱσταίμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἱστάμην [ῑ]\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστασαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱσταῖο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵστασο\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστασο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵσταται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῆται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱσταῖτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱστάσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐτίθετο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστασθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱσταῖσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵστασθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστασθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵστασθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῆσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱσταίσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱστάσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἱστάσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἱστάμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἱστώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἱσταίμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἱστάμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστασθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῆσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἱσταῖσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἵστασθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἵστασθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵστανται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἱστῶνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἱσταῖντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἱστάσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἵσταντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"ἵστασθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"ἱστάμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm42 = "{\"ID\":\"verbpdgm42\",\"partOfSpeech\":\"verb\",\"title\":\": (Athematic/Intransitive) Aorist System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔστην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"στῶ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"σταίην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔστης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"στῇς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"σταίης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"στῆθι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔστη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"στῇ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"σταίη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"στήτω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔστητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"στῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"σταῖτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"στῆτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐστήτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"στῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"σταίτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"στήτων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔστημεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"στῶμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"σταίημεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔστητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"στῆτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"σταίητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"στῆτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔστησαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"στῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"σταῖεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"στάντων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"στῆναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"στάς, στᾶσᾰ, στάν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm59\"}}]}]}]}";

var paradigm43 = "{\"ID\":\"verbpdgm43\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Middle-Passive\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δύναμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δύνωμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δυναίμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδυνάμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δύνασαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δύνῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δύναιο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδύνω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐπίστασαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"(ἐπίστασο\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"(ἠπίστω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δύναται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δύνηται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δύναιτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἐπιστάτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδύνατο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δύνασθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δύνησθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δύναισθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἐπίστασθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδύνασθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δύνασθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δύνησθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δυναίσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἐπιστάσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδυνάσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δυνάμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δυνώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δυναίμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδυνάμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δύνασθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δύνησθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δύναισθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἐπίστασθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδύνασθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δύνανται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δύνωνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δύναιντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἐπιστάσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδύναντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"δύνασθαι (ἐπίστασθαι)\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"δυνάμενος, -η, -ον (ἐπιστάμενος, -η, -ον)\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm44 = "{\"ID\":\"verbpdgm44\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δείκνῡμι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δεικνύω\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δεικνύοιμι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῡν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δείκνῡς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύῃς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δεικνύοις\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δείκνῡ\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῡς\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δείκνῡσι(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δεικνύοι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δεικνύτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῡ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δείκνῠτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύητον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δεικνύοιτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δείκνῠτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῠτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δείκνῠτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύητον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δεικνῠοίτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δεικνύτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδεικνύτην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δείκνῠμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δεικνύωμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δεικνύοιμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῠμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δείκνῠτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύητε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δεικνύοιτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δείκνῠτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῠτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δεικνύᾱσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύωσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δεικνύοιεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δεικνύντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῠσαν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"δεικνύναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"δεικνύς, δεικνῦσᾰ, δεικνύν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm62\"}}]}]}]}";

var paradigm45 = "{\"ID\":\"verbpdgm45\",\"partOfSpeech\":\"verb\",\"title\":\": Present System Middle-Passive\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δείκνῠμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δεικνύωμαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δεικνῠοίμην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδεικνύμην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δείκνῠσαι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δεικνύοιο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δείκνῠσο\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῠσο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δείκνῠται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύηται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δεικνύοιτο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δεικνύσθω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῠτο\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δείκνῠσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύησθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δεικνύοισθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δείκνῠσθον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῠσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δείκνῠσθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύησθον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δεικνῠοίσθην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δεικνύσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδεικνύσθην\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"δεικνύμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δεικνῠώμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δεικνῠοίμεθα\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐδεικνύμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"δείκνῠσθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύησθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δεικνύοισθε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δείκνῠσθε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῠσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"δείκνῠνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δεικνύωνται\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δεικνύοιντο\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δεικνύσθων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"mediopassive middle\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδείκνῠντο\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"mood\":\"infinitive\",\"value\":\"δείκῠσθαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"mediopassive middle\",\"value\":\"δεικνύμενος, -η, -ον\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm65\"}}]}]}]}";

var paradigm46 = "{\"ID\":\"verbpdgm46\",\"partOfSpeech\":\"verb\",\"title\":\"(be): Present System and Future\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"present indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"present subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"present optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"present imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"},{\"role\":\"label\",\"tense\":\"future\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"fut. indicative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"εἰμί\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ὦ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"εἴην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἦ\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔσομαι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"εἶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ᾖς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"εἴης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἴσθι\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἦσθα\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔσῃ\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐστί(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ᾖ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"εἴη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἔστω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἦν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔσται\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐστόν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἦτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"εἶτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"εἴητον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἔστον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἦστον\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔσεσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐστόν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἦτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"εἴτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"εἰήτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἔστων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἤστην\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔσεσθον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐσμέν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ὦμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"εἶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"εἴημεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἦμεν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἐσόμεθα\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἐστέ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἦτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"εἶτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"εἴητε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἔστε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἦτε\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔσεσθε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"εἰσί(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ὦσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"εἶεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"εἴησαν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἔστων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἦσαν\"},{\"role\":\"data\",\"tense\":\"future\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔσονται\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitives\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"εἶναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participles\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"ὤν, οὖσᾰ, ὄν\",\"reflink\":{\"text\":\"decl.\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm57\"}}]}]}]}";

var paradigm47 = "{\"ID\":\"verbpdgm47\",\"partOfSpeech\":\"verb\",\"title\":\"(go): Present System\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"εἶμι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἴω\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἴοιμι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἰοίην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ᾖα\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ᾔειν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"εἶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἴῃς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἴοις\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἴθι\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ᾔεισθα\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ᾔεις\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"εἶσι(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἴῃ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἴοι\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἴτω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾔειν\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾔει\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἴτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἴητον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἴοιτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἴτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ᾖτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἴτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἴητον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἰοίτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἴτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾔτην\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἴμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἴωμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἴοιμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ᾖμεν\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἴτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἴητε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἴοιτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἴτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ᾖτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἴᾱσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἴωσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἴοιεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἰόντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾖσαν\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾔεσαν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"ἰέναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"ἰών, ἰοῦσᾰ, ἰόν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm57\"}}]}]}]}";

var paradigm48 = "{\"ID\":\"verbpdgm48\",\"partOfSpeech\":\"verb\",\"title\":\": Present System\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"imperfect indicative\"},{\"role\":\"label\",\"tense\":\"imperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"φημί\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"φῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"φαίην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔφην\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"φῄς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"φῇς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"φαίης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"φάθι / φαθί\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔφησθα\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔφης\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"φησί(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"φῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"φαίη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"φατω\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔφη\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"φατόν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"φῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"φαῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"φάτον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔφατον\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"φατόν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"φῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"φαίτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"φάτων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐφάτην\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"φαμέν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"φῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"φαῖμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"φαίημεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔφαμεν\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"φατέ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"φῆτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"φαίητε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"φαίητε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"φάτε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔφατε\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"φᾱσί(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"φῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"φαῖεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"φαίησαν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"φάντων\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔφασαν\"},{\"role\":\"data\",\"tense\":\"imperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"φάναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"value\":\"(poetic) φάς, φᾶσᾰ, φάν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm59\"}}]}]}]}";

var paradigm49 = "{\"ID\":\"verbpdgm49\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔβην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βῶ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βαίην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔβης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βῇς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βαίης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βῆθι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔβη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βῇ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βαίη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βήτω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔβητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βαίητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βαῖτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βῆτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐβήτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βῆτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βαιήτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βαίτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βήτων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔβημεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"βῶμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βαίημεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"βαῖμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔβητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"βῆτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"βαίητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"βῆτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔβησαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"βῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"βαῖεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"βάντων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"βῆναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"βάς, βᾶσᾰ, βάν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm59\"}}]}]}]}";

var paradigm50 = "{\"ID\":\"verbpdgm50\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔγνων\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"γνῶ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"γνοίην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔγνως\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"γνῷς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"γνοίης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"γνῶθι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔγνω\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"γνῷ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"γνοίη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"γνώτω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔγνωτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"γνῶτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"γνοίητον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"γνοῖτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"γνῶτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐγνώτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"γνῶτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"γνοιήτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"γνοίτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"γνώτων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔγνωμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"γνῶμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"γνοίημεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"γνοῖμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔγνωτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"γνῶτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"γνοίητε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"γνῶτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔγνωσαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"γνῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"γνοῖεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"γνόντων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"γνῶναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"γνούς, γνοῦσᾰ, γνόν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm61\"}}]}]}]}";

var paradigm51 = "{\"ID\":\"verbpdgm51\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἑάλων\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἥλων\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἁλῶ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"ἁλοίην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἑάλως\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἥλως\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἁλῷς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"ἁλοίης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑάλω\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἥλω\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἁλῷ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"ἁλοίη\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἑάλωτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἥλωτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἁλῶτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑαλώτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἡλώτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἁλῶτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἑάλωμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἥλωμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"ἁλῶμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἑάλωτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἥλωτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"ἁλῶτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἑάλωσαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἥλωσαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"ἁλῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"ἁλῶναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"ἁλούς, ἁλοῦσᾰ, ἁλόν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm61\"}}]}]}]}";

var paradigm52 = "{\"ID\":\"verbpdgm52\",\"partOfSpeech\":\"verb\",\"title\":\": Aorist System Active\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"optative\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔδῡν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δύω\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δύοιμι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔδῡς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δύῃς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δύοις\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δῦθι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔδῡ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δύῃ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δύοι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δύτω\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔδῡτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δύῶτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δύοιτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δῦτον\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἐδύτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δύῶτον\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δυοίτην\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δύτων\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἔδῡμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"δύῶμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"δύοιμεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἔδῡτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"δύῶτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"δύοιτε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"δῦτε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἔδῡσαν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"δύῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"δύοιεν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"δύντων\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"δῦναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"participle\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"active\",\"value\":\"δύς, δῦσᾰ, δύν\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm62\"}}]}]}]}";

var paradigm53 = "{\"ID\":\"verbpdgm53\",\"partOfSpeech\":\"verb\",\"title\":\": Perfect System\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"indicative\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"subjunctive\",\"value\":\"subjunctive\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"present optative\"},{\"role\":\"label\",\"tense\":\"present\",\"voice\":\"active\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"imperative\",\"value\":\"imperative\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"pluperfect indicative\"},{\"role\":\"label\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"singular\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"οἶδα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"εἰδῶ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"εἰδείην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ᾔδη\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ᾔδειν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"οἶσθα\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"εἰδῇς\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"εἰδείης\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἴσθι\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ᾔδησθα\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ᾔδεις\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"οἶδε(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"εἰδῇ\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"εἰδείη\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἴστω\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾔδειν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"singular\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾔδει\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"dual\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἴστον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"εἰδῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"εἰδεῖτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἴστον\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ᾔδετον\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἴστον\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"εἰδῆτον\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"εἰδείτην\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἴστων\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾐδέτην\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"dual\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"plural\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"1st\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ἴσμεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"subjunctive\",\"value\":\"εἰδῶμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"εἰδεῖμεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"optative\",\"value\":\"εἰδείημεν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"imperative\",\"value\":\"\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ᾔδεμεν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"1st\",\"mood\":\"indicative\",\"value\":\"ᾖσμεν\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"2nd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ἴστε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"subjunctive\",\"value\":\"εἰδῆτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"εἰδεῖτε\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"optative\",\"value\":\"εἰδείητε\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"imperative\",\"value\":\"ἴστε\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ᾔδετε\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"2nd\",\"mood\":\"indicative\",\"value\":\"ᾖστε\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"3rd\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ἴσᾱσι(ν)\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"subjunctive\",\"value\":\"εἰδῶσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"εἰδεῖεν\"},{\"role\":\"data\",\"tense\":\"present\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"optative\",\"value\":\"εἰδείησαν\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"imperative\",\"value\":\"ἴστων\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾔδεσαν\"},{\"role\":\"data\",\"tense\":\"pluperfect\",\"voice\":\"active\",\"number\":\"plural\",\"person\":\"3rd\",\"mood\":\"indicative\",\"value\":\"ᾖσαν\"}]}]},\"subTables\":[{\"rows\":[{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"infinitive\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"mood\":\"infinitive\",\"value\":\"εἰδέναι\"}]},{\"cells\":[{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"participles\"},{\"role\":\"data\",\"tense\":\"perfect\",\"voice\":\"active\",\"value\":\"εἰδώς, εἰδυῖᾰ, εἰδός\",\"reflink\":{\"text\":\"(see declension)\",\"href\":\"inflect:#verb|type:paradigm|paradigm_id:verbpdgm63\"}}]}]}]}";

var verbParadigmRulesCSV = "ID ref,Match order,Part of speech,Stem type,Voice,Mood,Tense,Lemma,Morph flags,Dialect\nverbpdgm1,2,verb,w_stem,active,,,,,\nverbpdgm2,2,verb,w_stem,mediopassive,,,,,\nverbpdgm2,2,verb,w_stem,middle,,,,,\nverbpdgm3,1,verb,reg_fut,,,,,,\nverbpdgm4,3,verb,reg_fut,,,,,contr,\nverbpdgm3,1,verb,aw_fut,,,,,,\nverbpdgm4,2,verb,aw_fut,,,,,contr,\nverbpdgm3,1,verb,ew_fut,,,,,,\nverbpdgm4,2,verb,ew_fut,,,,,contr,\nverbpdgm5,3,verb,aw_fut,,,,,contr,doric\nverbpdgm5,3,verb,aw_fut,,,,,contr,aeolic\nverbpdgm6,1,verb,aor2,active,,,,,\nverbpdgm7,1,verb,aor2,middle,,,,,\nverbpdgm8,1,verb,aor1,active,,,,,\nverbpdgm9,1,verb,aor1,middle,,,,,\nverbpdgm10,1,verb,aor_pass,,,,,,\nverbpdgm10,1,verb,aor2_pass,,,,,,\nverbpdgm3,3,verb,aor_pass,passive,,future,,,\nverbpdgm11,1,verb,perf_act,,,,,,\nverbpdgm15,3,verb,perf_act,active,,pluperfect,,,\nverbpdgm12,1,verb,,mediopassive,indicative,perfect,,,\nverbpdgm12,1,verb,,mediopassive,infinitive,perfect,,,\nverbpdgm13,1,verb,,mediopassive,subjunctive,perfect,,,\nverbpdgm13,1,verb,,middle,subjunctive,perfect,,,\nverbpdgm13,1,verb,,mediopassive,optative,perfect,,,\nverbpdgm13,1,verb,,middle,optative,perfect,,,\nverbpdgm13,1,verb,,mediopassive,imperative,perfect,,,\nverbpdgm13,1,verb,,middle,imperative,perfect,,,\nverbpdgm14,1,verb,,mediopassive,subjunctive,perfect,,,\nverbpdgm14,1,verb,,middle,subjunctive,perfect,,,\nverbpdgm14,1,verb,,mediopassive,optative,perfect,,,\nverbpdgm14,1,verb,,middle,optative,perfect,,,\nverbpdgm14,1,verb,,mediopassive,imperative,perfect,,,\nverbpdgm14,1,verb,,middle,imperative,perfect,,,\nverbpdgm15,1,verb,,mediopassive,indicative,pluperfect,,,\nverbpdgm16,1,verb,fut_perf,,,,,,\nverbpdgm17,1,verb,perf2_act,,,,,,\nverbpdgm18,1,verb,ew_pr,active,,,,,\nverbpdgm20,1,verb,ew_pr,mediopassive,,,,,\nverbpdgm20,1,verb,ew_pr,middle,,,,,\nverbpdgm19,1,verb,evw_pr,,,,,,\nverbpdgm21,2,verb,evw_pr,mediopassive,,,,,\nverbpdgm21,2,verb,evw_pr,middle,,,,,\nverbpdgm22,2,verb,aw_pr,,,,,,\nverbpdgm23,1,verb,ajw_pr,,,,,,\nverbpdgm24,2,verb,aw_pr,mediopassive,,,,,\nverbpdgm24,2,verb,aw_pr,middle,,,,,\nverbpdgm25,2,verb,ajw_pr,mediopassive,,,,,\nverbpdgm25,2,verb,ajw_pr,middle,,,,,\nverbpdgm26,2,verb,ow_pr,active,,,,,\nverbpdgm27,2,verb,ow_pr,mediopassive,,,,,\nverbpdgm27,2,verb,ow_pr,middle,,,,,\nverbpdgm26,2,verb,ww_pr,active,,,,,\nverbpdgm27,2,verb,ww_pr,mediopassive,,,,,\nverbpdgm27,2,verb,ww_pr,middle,,,,,\nverbpdgm28,2,verb,emi_pr,active,,,,,\nverbpdgm29,2,verb,emi_pr,mediopassive,,,,,\nverbpdgm29,2,verb,emi_pr,middle,,,,,\nverbpdgm30,2,verb,emi_or,active,,,,,\nverbpdgm31,2,verb,emi_or,middle,,,,,\nverbpdgm32,2,verb,,active,,,ἵημι,,\nverbpdgm33,2,verb,,mediopassive,,,ἵημι,,\nverbpdgm33,2,verb,,middle,,,ἵημι,,\nverbpdgm34,3,verb,,acive,,aorist,ἵημι,,\nverbpdgm35,3,verb,,middle,,aorist,ἵημι,,\nverbpdgm35,3,verb,,middle,,aorist,ἵημι,,\nverbpdgm36,2,verb,omi_pr,active,,,,,\nverbpdgm37,2,verb,omi_pr,mediopassive,,,,,\nverbpdgm37,2,verb,omi_pr,middle,,,,,\nverbpdgm38,2,verb,omi_aor,active,,,,,\nverbpdgm39,2,verb,omi_aor,middle,,,,,\nverbpdgm40,2,verb,ami_pr,active,,,,,\nverbpdgm41,2,verb,ami_pr,mediopassive,,,,,\nverbpdgm41,2,verb,ami_pr,middle,,,,,\nverbpdgm42,2,verb,ami_aor,active,,,,,\nverbpdgm43,1,verb,ami_short,,,,,,\nverbpdgm44,2,verb,umi_pr,active,,,,,\nverbpdgm45,2,verb,umi_pr,mediopassive,,,,,\nverbpdgm45,2,verb,umi_pr,middle,,,,,\nverbpdgm46,2,verb,irreg_mi,,,,εἰμί,,\nverbpdgm47,2,verb,irreg_mi,,,,εἶμι,,\nverbpdgm48,2,verb,ath_primary,active,,present,,,\nverbpdgm48,2,verb,ath_primary,active,,imperfect,,,\nverbpdgm49,1,verb,ath_h_aor,,,,,,\nverbpdgm50,1,verb,ath_w_aor,,,,,,\nverbpdgm51,1,verb,ath_w_aor,,,,,,\nverbpdgm52,1,verb,ath_u_aor,,,,,,\nverbpdgm53,2,verb,ath_primary,,,perfect,,,\nverbpdgm53,3,verb,perf_act,active,,pluperfect,,,";

var verbParadigmFootnotesCSV = "Index,Text\n1,\"With neuter plural subject, periphrastic forms are sometimes found in the indicative, but more commonly the 3rd singular form is used instead.\"\n2,\"thus is late Greek with a neuter plural subject, but in classical Attic the 3rd singular form is used with neuter plural subject.\"";

var paradigm54 = "{\"ID\":\"verbpdgm54\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in  (present and future active, uncontracted)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγων\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγουσᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγον\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγοντος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἀγούσης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγοντος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγοντι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἀγούσῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγοντι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγοντᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγουσᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἄγον\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἄγοντε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἀγούσᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἄγοντε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἀγόντοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἀγούσαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἀγόντοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἄγοντες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἄγουσαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἄγοντᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἀγόντων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἀγουσῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἀγόντων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἄγουσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἀγούσαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἄγουσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἄγοντᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἀγούσᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἄγοντᾰ\"}]}]},\"subTables\":[]}";

var paradigm55 = "{\"ID\":\"verbpdgm55\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in  (present and future active, - and -contract)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενῶν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενοῦσᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενοῦν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενοῦντος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενούσης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενοῦντος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενοῦντι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενούσῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενοῦντι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενοῦντᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενοῦσᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"μενοῦν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"μενοῦντε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"μενούσᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"μενοῦντε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"μενούντοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"μενούσαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"μενούντοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενοῦντες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενοῦσαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενοῦντᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενούντων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενουσῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενούντων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενοῦσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενούσαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενοῦσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενοῦντᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενούσᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"μενοῦντᾰ\"}]}]},\"subTables\":[]}";

var paradigm56 = "{\"ID\":\"verbpdgm56\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in  (present and future active, -contract)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶσᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶντος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρώσης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶντος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶντι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρώσῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶντι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶντᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶσᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ὁρῶν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ὁρῶντε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ὁρώσᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ὁρῶντε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ὁρώντοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ὁρώσαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ὁρώντοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρῶντες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρῶσαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρῶντᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρώντων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρωσῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρώντων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρῶσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρώσαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρῶσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρῶντᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρώσᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ὁρῶντᾰ\"}]}]},\"subTables\":[]}";

var paradigm57 = "{\"ID\":\"verbpdgm57\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in  (strong aorist active; present of  and )\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπών\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιποῦσᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπόν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπόντος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπούσης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπόντος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπόντι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπούσῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπόντι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπόντᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιποῦσᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λιπόν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λιπόντε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λιπούσᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λιπόντε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λιπόντοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λιπούσαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λιπόντοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιπόντες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιποῦσαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιπόντᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιπόντων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιπουσῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιπόντων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιποῦσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιπούσαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιποῦσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιπόντᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιπούσᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λιπόντᾰ\"}]}]},\"subTables\":[]}";

var paradigm58 = "{\"ID\":\"verbpdgm58\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in  (weak aorist active)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λύσᾱς\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λύσᾱσᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λῦσαν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λύσαντος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λυσάσης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λύσαντος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λύσαντι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λυσάσῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λύσαντι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λύσαντᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λύσᾱσᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λῦσαν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λύσαντε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λυσάσᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λύσαντε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λυσάντοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λυσάσαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λυσάντοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λύσαντες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λύσᾱσαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λύσαντᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λυσάντων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λυσᾱσῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λυσάντων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λύσᾱσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λυσάσαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λύσᾱσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λύσαντᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λυσάσᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λύσαντᾰ\"}]}]},\"subTables\":[]}";

var paradigm59 = "{\"ID\":\"verbpdgm59\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in -verb present and aorist active)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάς\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστᾶσᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάντος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάσης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάντος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάντι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάσῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάντι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάντᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστᾶσᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἱστάν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἱστάντε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἱστάσᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἱστάντε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἱστάντοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἱστάσαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἱστάντοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστάντες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστᾶσαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστάντᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστάντων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστᾱσῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστάντων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστᾶσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστάσαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστᾶσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστάντᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστάσᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἱστάντᾰ\"}]}]},\"subTables\":[]}";

var paradigm60 = "{\"ID\":\"verbpdgm60\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist present\",\"voice\":\"active\",\"value\":\"μι-verb present and aorist active\"},{\"role\":\"label\",\"tense\":\"aorist present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist present\",\"voice\":\"active\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"aorist passive\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"tense\":\"aorist present\",\"voice\":\"active\",\"value\":\"masculine\"},{\"role\":\"label\",\"tense\":\"aorist present\",\"voice\":\"active\",\"value\":\"feminine\"},{\"role\":\"label\",\"tense\":\"aorist present\",\"voice\":\"active\",\"value\":\"neuter\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"masculine\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"feminine\"},{\"role\":\"label\",\"tense\":\"aorist\",\"voice\":\"passive\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθείς\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθεῖσᾰ\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθέν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθείς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθεῖσᾰ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθέν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθέντος\"},{\"role\":\"data\",\"tense\":\"aoris present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθείσης\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθέντος\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθέντος\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθείσης\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθέντος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθέντι\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθείσῃ\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθέντι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθέντι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθείσῃ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθέντι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθέντᾰ\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθεῖσᾰν\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"singular\",\"value\":\"τιθέν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθέντᾰ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθεῖσᾰν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"singular\",\"value\":\"λυθέν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"number\":\"dual\",\"value\":\"τιθέντε\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"τιθείσᾱ\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"τιθέντε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"value\":\"λυθέντε\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"value\":\"λυθείσᾱ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"value\":\"λυθέντε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"τιθέντοιν\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"τιθείσαιν\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"dual\",\"value\":\"τιθέντοιν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"value\":\"λυθέντοιν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"value\":\"λυθείσαιν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"dual\",\"value\":\"λυθέντοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθέντες\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθεῖσαι\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθέντᾰ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθέντες\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθεῖσαι\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθέντᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθέντων\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθεισῶν\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθέντων\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθέντων\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθεισῶν\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθέντων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθεῖσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθείσαις\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθεῖσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθεῖσῐ(ν)\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθείσαις\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθεῖσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθέντᾰς\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθείσᾱς\"},{\"role\":\"data\",\"tense\":\"aorist present\",\"voice\":\"active\",\"number\":\"plural\",\"value\":\"τιθέντᾰ\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθέντᾰς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθείσᾱς\"},{\"role\":\"data\",\"tense\":\"aorist\",\"voice\":\"passive\",\"number\":\"plural\",\"value\":\"λυθέντᾰ\"}]}]},\"subTables\":[]}";

var paradigm61 = "{\"ID\":\"verbpdgm61\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in -verb active)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδούς\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδοῦσᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδόν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδόντος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδούσης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδόντος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδόντι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδούσῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδόντι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδόντᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδοῦσᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"διδόν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"διδόντε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"διδούσᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"διδόντε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"διδόντοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"διδούσαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"διδόντοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδόντες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδοῦσαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδόντᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδόντων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδουσῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδόντων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδοῦσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδούσαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδοῦσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδόντᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδούσᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"διδόντᾰ\"}]}]},\"subTables\":[]}";

var paradigm62 = "{\"ID\":\"verbpdgm62\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in -verb active)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύς\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνῦσᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύντος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύσης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύντος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύντι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύσῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύντι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύντᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνῦσᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"δεικνύν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"δεικνύντε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"δεικνύσᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"δεικνύντε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"δεικνύντοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"δεικνύσαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"δεικνύντοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνύντες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνῦσαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνύντᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνύντων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνῡσῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνύντων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνῦσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνύσαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνῦσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνύντᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνύσᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"δεικνύντᾰ\"}]}]},\"subTables\":[]}";

var paradigm63 = "{\"ID\":\"verbpdgm63\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in  (perfect active)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπώς\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπυῖᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπός\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπότος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπυίας\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπότος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπότι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπυίᾳ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπότι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπότᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπυῖᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"λελοιπός\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λελοιπότε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λελοιπυίᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λελοιπότε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λελοιπότοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λελοιπυίαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"λελοιπότοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπότες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπυῖαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπότᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπότων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπυιῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπότων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπόσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπυίαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπόσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπότᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπυίᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"λελοιπότᾰ\"}]}]},\"subTables\":[]}";

var paradigm64 = "{\"ID\":\"verbpdgm64\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in  (some athematic perfects)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστώς\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστῶσᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστός\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστῶτος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστώσης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστῶτος\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστῶτι\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστώσῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστῶτι\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστῶτᾰ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστῶσᾰν\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"ἑστός\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἑστῶτε\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἑστώσᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἑστῶτε\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἑστώτοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἑστώσαιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"ἑστώτοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστῶτες\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστῶσαι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστῶτᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστώτων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστωσῶν\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστώτων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστῶσῐ(ν)\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστώσαις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστῶσῐ(ν)\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστῶτᾰς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστώσᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"ἑστῶτᾰ\"}]}]},\"subTables\":[]}";

var paradigm65 = "{\"ID\":\"verbpdgm65\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in  (all middle-passive and middle except perfect)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"nominative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπόμενος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπομένη\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπόμενον\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπομένου\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπομένης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπομένου\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπομένῳ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπομένῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπομένῳ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπόμενον\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπομένην\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπόμενον\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"vocative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπόμενε\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπομένη\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"πεμπόμενον\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"πεμπομένω\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"πεμπομένᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"πεμπομένω\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"πεμπομένοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"πεμπομέναιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"πεμπομένοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπόμενοι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπόμεναι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπόμενᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπομένων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπομένων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπομένων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπομένοις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπομέναις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπομένοις\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπομένους\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπομένᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"πεμπόμενᾰ\"}]}]},\"subTables\":[]}";

var paradigm66 = "{\"ID\":\"verbpdgm66\",\"partOfSpeech\":\"verb_participle\",\"title\":\"Participles in  (perfect middle-passive)\",\"table\":{\"rows\":[{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"value\":\"masculine\"},{\"role\":\"label\",\"value\":\"feminine\"},{\"role\":\"label\",\"value\":\"neuter\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"singular\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"nominative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένος\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένη\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένον\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένου\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένης\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένου\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένῳ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένῃ\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένῳ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένον\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένην\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένον\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"singular\",\"value\":\"vocative\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένε\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένη\"},{\"role\":\"data\",\"number\":\"singular\",\"value\":\"γεγραμμένον\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"dual\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"n.a.v.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"γεγραμμένω\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"γεγραμμένᾱ\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"γεγραμμένω\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"dual\",\"value\":\"g.d.\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"γεγραμμένοιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"γεγραμμέναιν\"},{\"role\":\"data\",\"number\":\"dual\",\"value\":\"γεγραμμένοιν\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"plural\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"n.v.\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένοι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμέναι\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένᾰ\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"genitive\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένων\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένων\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"dative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένοις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμέναις\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένοις\"}]},{\"cells\":[{\"role\":\"label\",\"value\":\"\"},{\"role\":\"label\",\"number\":\"plural\",\"value\":\"accusative\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένους\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένᾱς\"},{\"role\":\"data\",\"number\":\"plural\",\"value\":\"γεγραμμένᾰ\"}]}]},\"subTables\":[]}";

var verbParticipleParadigmRulesCSV = "ID ref,Match order,Part of speech,Stem type,Voice,Mood,Tense,Lemma,Morph flags,Dialect\nverbpdgm54,13,verb_participle,w_stem,active,,,,,\nverbpdgm54,12,verb_participle,reg_fut,,,,,,\nverbpdgm54,12,verb_participle,evw_pr,,,,,,\nverbpdgm55,12,verb_participle,ww_pr,,,,,,\nverbpdgm55,12,verb_participle,ew_fut,,,,,,\nverbpdgm55,12,verb_participle,ew_pr,,,,,,\nverbpdgm55,12,verb_participle,ow_pr,,,,,,\nverbpdgm56,12,verb_participle,aw_pr,,,,,,\nverbpdgm56,12,verb_participle,ajw_pr,,,,,,\nverbpdgm56,12,verb_participle,aw_fut,,,,,,\nverbpdgm57,12,verb_participle,aor2,,,,,,\nverbpdgm57,13,verb_participle,irreg_mi,,,present,εἰμί,,\nverbpdgm57,13,verb_participle,irreg_mi,,,present,εἶμι,,\nverbpdgm58,12,verb_participle,aor1,,,,,,\nverbpdgm59,12,verb_participle,ami_pr,,,,,,\nverbpdgm59,12,verb_participle,ath_h_aor,,,,,,\nverbpdgm59,12,verb_participle,ami_aor,,,,,,\nverbpdgm59,12,verb_participle,irreg_mi,,,,,,\nverbpdgm60,12,verb_participle,emi_pr,,,,,,\nverbpdgm60,13,verb_participle,emi_aor,active,,,,,\nverbpdgm60,12,verb_participle,aor_pass,,,,,,\nverbpdgm60,11,verb_participle,aor2_pass,,,,,,\nverbpdgm60,13,verb_participle,irreg_mi,active,,,,,\nverbpdgm61,12,verb_participle,omi_pr,,,,,,\nverbpdgm61,12,verb_participle,omi_aor,,,,,,\nverbpdgm61,12,verb_participle,ath_w_aor,,,,,,\nverbpdgm62,12,verb_participle,umi_pr,,,,,,\nverbpdgm62,12,verb_participle,ath_u_aor,,,,,,\nverbpdgm63,12,verb_participle,perf_act,,,,,,\nverbpdgm64,12,verb_participle,perf2_act,,,,,,\nverbpdgm65,13,verb_participle,w_stem,mediopassive,,,,,\nverbpdgm65,13,verb_participle,w_stem,middle,,,,,\nverbpdgm65,13,verb_participle,aor2,middle,,,,,\nverbpdgm65,13,verb_participle,aor1,middle,,,,,\nverbpdgm65,13,verb_participle,reg_fut,middle,,,,,\nverbpdgm65,13,verb_participle,ew_fut,middle,,,,,\nverbpdgm65,12,verb_participle,fut_perf,,,,,,\nverbpdgm65,13,verb_participle,ow_pr,mediopassive,,,,,\nverbpdgm65,13,verb_participle,ow_pr,middle,,,,,\nverbpdgm65,13,verb_participle,ew_pr,mediopassive,,,,,\nverbpdgm65,13,verb_participle,ew_pr,middle,,,,,\nverbpdgm65,13,verb_participle,evw_pr,mediopassive,,,,,\nverbpdgm65,13,verb_participle,evw_pr,middle,,,,,\nverbpdgm65,13,verb_participle,aw_pr,mediopassive,,,,,\nverbpdgm65,13,verb_participle,aw_pr,middle,,,,,\nverbpdgm65,13,verb_participle,ajw_pr,mediopassive,,,,,\nverbpdgm65,13,verb_participle,ajw_pr,middle,,,,,\nverbpdgm65,13,verb_participle,ow_pr,mediopassive,,,,,\nverbpdgm65,13,verb_participle,ow_pr,middle,,,,,\nverbpdgm65,13,verb_participle,emi_pr,middle,,,,,\nverbpdgm65,13,verb_participle,emi_pr,passive,,,,,\nverbpdgm65,13,verb_participle,emi_aor,middle,,,,,\nverbpdgm65,13,verb_participle,irreg_mi,mediopassive,,,,,\nverbpdgm65,13,verb_participle,irreg_mi,middle,,,,,\nverbpdgm65,13,verb_participle,omi_pr,mediopassive,,,,,\nverbpdgm65,13,verb_participle,omi_pr,midle,,,,,\nverbpdgm65,13,verb_participle,omi_aor,middle,,,,,\nverbpdgm65,13,verb_participle,ami_pr,mediopassive,,,,,\nverbpdgm65,13,verb_participle,ami_pr,middle,,,,,\nverbpdgm65,13,verb_participle,ami_short,mediopassive,,,,,\nverbpdgm65,13,verb_participle,ami_short,middle,,,,,\nverbpdgm65,13,verb_participle,ami_aor,middle,,,,,\nverbpdgm65,13,verb_participle,umi_pr,mediopassive,,,,,\nverbpdgm65,13,verb_participle,umi_pr,middle,,,,,\nverbpdgm66,12,verb_participle,perfp_vow,,,,,,\nverbpdgm66,12,verb_participle,perfp_d,,,,,,\nverbpdgm66,12,verb_participle,perfp_mp,,,,,,\nverbpdgm66,12,verb_participle,perfp_g,,,,,,\nverbpdgm66,12,verb_participle,perfp_l,,,,,,\nverbpdgm66,12,verb_participle,perfp_gx,,,,,,\nverbpdgm66,12,verb_participle,perfp_p,,,,,,\nverbpdgm66,12,verb_participle,perfp_n,,,,,,\nverbpdgm66,12,verb_participle,perfp_un,,,,,,";

/*
 * Greek language data module
 */

// region Definition of grammatical features
/*
 Define grammatical features of a language. Those grammatical features definitions will also be used by morphological
 analyzer's language modules as well.
 */

// endregion Definition of grammatical features

class GreekLanguageDataset extends LanguageDataset {
  constructor () {
    super(GreekLanguageDataset.languageID);

    this.features = this.model.typeFeatures;
    this.features.set(Feature.types.footnote, new Feature(Feature.types.footnote, [], GreekLanguageDataset.languageID));
    this.features.set(Feature.types.fullForm, new Feature(Feature.types.fullForm, [], GreekLanguageDataset.languageID));
    this.features.set(Feature.types.hdwd, new Feature(Feature.types.hdwd, [], GreekLanguageDataset.languageID));
    this.features.set(Feature.types.dialect, new Feature(Feature.types.dialect, [], GreekLanguageDataset.languageID));

    // Create an importer with default values for every feature
    for (let feature of this.features.values()) {
      feature.addImporter(new FeatureImporter(feature.values, true));
    }
    // Custom importers for Greek-specific feature values
    this.features.get(Feature.types.gender).getImporter()
      .map('masculine feminine neuter', [Constants.GEND_MASCULINE, Constants.GEND_FEMININE, Constants.GEND_NEUTER]);
  }

  static get languageID () {
    return Constants.LANG_GREEK
  }

  // For noun and adjectives
  addSuffixes (partOfSpeech, data) {
    // An order of columns in a data CSV file
    const n = {
      suffix: 0,
      number: 1,
      grmCase: 2,
      declension: 3,
      gender: 4,
      type: 5,
      primary: 6,
      footnote: 7
    };
    // Some suffix values will mean a lack of suffix, they will be mapped to a null
    let noSuffixValue = '-';

    // First row are headers
    for (let i = 1; i < data.length; i++) {
      let item = data[i];
      let suffixValue = item[n.suffix];
      // Handle special suffix values
      if (suffixValue === noSuffixValue) {
        suffixValue = null;
      }

      let primary = false;
      let features = [partOfSpeech,
        this.features.get(Feature.types.number).createFromImporter(item[n.number]),
        this.features.get(Feature.types.grmCase).createFromImporter(item[n.grmCase]),
        this.features.get(Feature.types.declension).createFromImporter(item[n.declension]),
        this.features.get(Feature.types.gender).createFromImporter(item[n.gender]),
        this.features.get(Feature.types.type).createFromImporter(item[n.type])];
      if (item[n.primary] === 'primary') {
        primary = true;
      }
      if (item[n.footnote]) {
        // There can be multiple footnote indexes separated by spaces
        let indexes = item[n.footnote].split(' ');
        features.push(this.features.get(Feature.types.footnote).createFeatures(indexes));
      }

      let extendedGreekData = new ExtendedGreekData();
      extendedGreekData.primary = primary;
      let extendedLangData = {
        [Constants.STR_LANG_CODE_GRC]: extendedGreekData
      };
      this.addInflection(partOfSpeech.value, Suffix, suffixValue, features, extendedLangData);
    }
  }

  // For pronoun
  addPronounForms (partOfSpeech, data) {
    this.pronounGroupingLemmas = new Map([
      ['demonstrative', ['ὅδε', 'οὗτος', 'ἐκεῖνος']]
    ]);

    // An order of columns in a data CSV file
    const n = {
      form: 0,
      hdwd: 1,
      grmClass: 2,
      person: 3,
      number: 4,
      grmCase: 5,
      gender: 6,
      type: 7,
      primary: 8,
      dialect: 9,
      footnote: 10
    };

    // First row are headers
    for (let i = 1; i < data.length; i++) {
      let item = data[i];
      let form = item[n.form];

      let features = [
        partOfSpeech,
        this.features.get(Feature.types.fullForm).createFromImporter(form)
      ];

      if (item[n.hdwd]) {
        features.push(this.features.get(Feature.types.hdwd).createFromImporter(item[n.hdwd]));
      }
      if (item[n.grmClass]) { features.push(this.features.get(Feature.types.grmClass).createFromImporter(item[n.grmClass])); }
      if (item[n.person]) { features.push(this.features.get(Feature.types.person).createFromImporter(item[n.person])); }
      if (item[n.number]) { features.push(this.features.get(Feature.types.number).createFromImporter(item[n.number])); }
      if (item[n.grmCase]) { features.push(this.features.get(Feature.types.grmCase).createFromImporter(item[n.grmCase])); }
      if (item[n.gender]) { features.push(this.features.get(Feature.types.gender).createFromImporter(item[n.gender])); }
      if (item[n.type]) { features.push(this.features.get(Feature.types.type).createFromImporter(item[n.type])); }

      let primary = (item[n.primary] === 'primary');

      // Dialects could have multiple values
      let dialects = item[n.dialect].split(',');
      if (item[n.dialect] && dialects && dialects.length > 0) {
        features.push(this.features.get(Feature.types.dialect).createFeatures(dialects));
      }

      // Footnotes. There can be multiple footnote indexes separated by commas
      if (item[n.footnote]) {
        // There can be multiple footnote indexes separated by spaces
        let indexes = item[n.footnote].split(' ');
        features.push(this.features.get(Feature.types.footnote).createFeatures(indexes));
      }

      let extendedGreekData = new ExtendedGreekData();
      extendedGreekData.primary = primary;
      let extendedLangData = {
        [Constants.STR_LANG_CODE_GRC]: extendedGreekData
      };
      this.addInflection(partOfSpeech.value, Form, form, features, extendedLangData);
    }
  }

  static get verbParadigmTables () {
    const partOfSpeech = Constants.POFS_VERB;
    return new Map([
      ['verbpdgm1', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm01))],
      ['verbpdgm2', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm02))],
      ['verbpdgm3', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm03))],
      ['verbpdgm4', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm04))],
      ['verbpdgm5', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm05))],
      ['verbpdgm6', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm06))],
      ['verbpdgm7', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm07))],
      ['verbpdgm8', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm08))],
      ['verbpdgm9', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm09))],
      ['verbpdgm10', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm10))],
      ['verbpdgm11', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm11))],
      ['verbpdgm12', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm12))],
      ['verbpdgm13', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm13))],
      ['verbpdgm14', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm14))],
      ['verbpdgm15', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm15))],
      ['verbpdgm16', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm16))],
      ['verbpdgm17', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm17))],
      ['verbpdgm18', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm18))],
      ['verbpdgm19', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm19))],
      ['verbpdgm20', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm20))],
      ['verbpdgm21', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm21))],
      ['verbpdgm22', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm22))],
      ['verbpdgm23', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm23))],
      ['verbpdgm24', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm24))],
      ['verbpdgm25', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm25))],
      ['verbpdgm26', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm26))],
      ['verbpdgm27', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm27))],
      ['verbpdgm28', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm28))],
      ['verbpdgm29', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm29))],
      ['verbpdgm30', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm30))],
      ['verbpdgm31', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm31))],
      ['verbpdgm32', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm32))],
      ['verbpdgm33', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm33))],
      ['verbpdgm34', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm34))],
      ['verbpdgm35', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm35))],
      ['verbpdgm36', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm36))],
      ['verbpdgm37', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm37))],
      ['verbpdgm38', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm38))],
      ['verbpdgm39', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm39))],
      ['verbpdgm40', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm40))],
      ['verbpdgm41', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm41))],
      ['verbpdgm42', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm42))],
      ['verbpdgm43', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm43))],
      ['verbpdgm44', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm44))],
      ['verbpdgm45', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm45))],
      ['verbpdgm46', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm46))],
      ['verbpdgm47', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm47))],
      ['verbpdgm48', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm48))],
      ['verbpdgm49', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm49))],
      ['verbpdgm50', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm50))],
      ['verbpdgm51', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm51))],
      ['verbpdgm52', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm52))],
      ['verbpdgm53', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm53))]
    ])
  }

  static get verbParticipleParadigmTables () {
    const partOfSpeech = Constants.POFS_VERB_PARTICIPLE;
    return new Map([
      ['verbpdgm54', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm54))],
      ['verbpdgm55', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm55))],
      ['verbpdgm56', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm56))],
      ['verbpdgm57', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm57))],
      ['verbpdgm58', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm58))],
      ['verbpdgm59', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm59))],
      ['verbpdgm60', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm60))],
      ['verbpdgm61', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm61))],
      ['verbpdgm62', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm62))],
      ['verbpdgm63', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm63))],
      ['verbpdgm64', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm64))],
      ['verbpdgm65', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm65))],
      ['verbpdgm66', new Paradigm(this.languageID, partOfSpeech, JSON.parse(paradigm66))]
    ])
  }

  getParadigms (partOfSpeech, paradigms, rulesData) {
    // An order of columns in a data CSV file
    const n = {
      id: 0,
      matchOrder: 1,
      partOfSpeech: 2, // Ignored, an argument value will be used
      stemtype: 3,
      voice: 4,
      mood: 5,
      tense: 6,
      lemma: 7,
      morphFlags: 8,
      dialect: 9
    };

    // First row contains headers
    for (let i = 1; i < rulesData.length; i++) {
      let item = rulesData[i];
      let id = item[n.id];
      let matchOrder = Number.parseInt(item[n.matchOrder]);

      let features = [partOfSpeech];

      if (item[n.stemtype]) { features.push(this.features.get(Feature.types.stemtype).createFromImporter(item[n.stemtype])); }
      if (item[n.voice]) { features.push(this.features.get(Feature.types.voice).createFromImporter(item[n.voice])); }
      if (item[n.mood]) { features.push(this.features.get(Feature.types.mood).createFromImporter(item[n.mood])); }
      if (item[n.tense]) { features.push(this.features.get(Feature.types.tense).createFromImporter(item[n.tense])); }
      if (item[n.dialect]) { features.push(this.features.get(Feature.types.dialect).createFromImporter(item[n.dialect])); }

      let lemma;
      if (item[n.lemma]) {
        lemma = new Lemma(item[n.lemma], this.constructor.languageID);
      }

      let morphFlags = '';
      if (item[n.morphFlags]) {
        morphFlags = item[n.morphFlags];
      }

      if (paradigms.has(id)) {
        paradigms.get(id).addRule(matchOrder, features, lemma, morphFlags);
      } else {
        console.warn(`Cannot find a paradigm table for "${id}" index`);
      }
    }
    for (let paradigm of paradigms.values()) {
      paradigm.sortRules();
    }
    return Array.from(paradigms.values())
  }

  addFootnotes (partOfSpeech, classType, data) {
    // First row are headers
    for (let i = 1; i < data.length; i++) {
      this.addFootnote(partOfSpeech.value, classType, data[i][0], data[i][1]);
    }
  }

  loadData () {
    let partOfSpeech;
    let suffixes;
    let forms;
    let paradigms;
    let footnotes;

    // Nouns
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_NOUN);
    suffixes = papaparse.parse(nounSuffixesCSV$1, {});
    this.addSuffixes(partOfSpeech, suffixes.data);
    footnotes = papaparse.parse(nounFootnotesCSV$1, {});
    this.addFootnotes(partOfSpeech, Suffix, footnotes.data);

    // Pronouns
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_PRONOUN);
    forms = papaparse.parse(pronounFormsCSV$1, {});
    this.addPronounForms(partOfSpeech, forms.data);
    footnotes = papaparse.parse(pronounFootnotesCSV$1, {});
    this.addFootnotes(partOfSpeech, Form, footnotes.data);

    // Verbs
    // Paradigms
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_VERB);
    paradigms = this.getParadigms(
      partOfSpeech, this.constructor.verbParadigmTables, papaparse.parse(verbParadigmRulesCSV, {}).data);
    this.addParadigms(partOfSpeech, paradigms);
    this.addFootnotes(partOfSpeech, Paradigm, papaparse.parse(verbParadigmFootnotesCSV, {}).data);

    // Verb Participles
    // Paradigms
    partOfSpeech = this.features.get(Feature.types.part).createFeature(Constants.POFS_VERB_PARTICIPLE);
    paradigms = this.getParadigms(
      partOfSpeech, this.constructor.verbParticipleParadigmTables, papaparse.parse(verbParticipleParadigmRulesCSV, {}).data);
    this.addParadigms(partOfSpeech, paradigms);

    this.dataLoaded = true;
    return this
  }

  /**
   * Returns an array of lemmas that are used to group values within inflection tables,
   * such as for demonstrative pronouns
   * @param {string} grammarClass - A name of a pronoun class
   * @return {string[]} An array of lemma values
   */
  getPronounGroupingLemmas (grammarClass) {
    return this.pronounGroupingLemmas.has(grammarClass) ? this.pronounGroupingLemmas.get(grammarClass) : []
  }

  static getObligatoryMatchList (inflection) {
    if (inflection.hasFeatureValue(Feature.types.part, Constants.POFS_PRONOUN)) {
      // If it is a pronoun, it must match a grammatical class
      return [Feature.types.grmClass]
    } else if (inflection.constraints.fullFormBased) {
      // Not a pronoun, but the other form-based word
      return [Feature.types.fullForm]
    } else {
      // Default value for suffix matching
      return [Feature.types.part]
    }
  }

  static getOptionalMatchList (inflection) {
    const featureOptions = [
      Feature.types.grmCase,
      Feature.types.declension,
      Feature.types.gender,
      Feature.types.number,
      Feature.types.voice,
      Feature.types.mood,
      Feature.types.tense,
      Feature.types.person
    ];
    return featureOptions.filter(f => inflection[f])
  }
}

// Stores a LanguageDatasetFactory's single instance
let datasetFactory;

/**
 * Creates and stores datasets for all available languages. This is a singleton.
 * When created, datasets' data is not loaded yet. It will be loaded on a first call (lazy initialization).
 */
class LanguageDatasetFactory {
  /**
   * @param {Constructor[]} languageData - Language datasets of supported languages.
   */
  constructor (languageData = [LatinLanguageDataset, GreekLanguageDataset]) {
    this.sets = new Map();
    for (let Set of languageData) {
      this.sets.set(Set.languageID, new Set());
    }
  }

  /**
   * Returns a single instance of self.
   * @return {LanguageDatasetFactory} A self instances.
   */
  static get instance () {
    if (!datasetFactory) {
      datasetFactory = new LanguageDatasetFactory();
    }
    return datasetFactory
  }

  /**
   * Returns an instance of a dataset for a language ID given.
   * @param {symbol} languageID - A language ID of a dataset to be retrieved.
   * @return {LanguageDataset} An instance of a language dataset.
   */
  static getDataset (languageID) {
    let instance = this.instance;
    if (instance.sets.has(languageID)) {
      let dataset = instance.sets.get(languageID);
      if (!dataset.dataLoaded) {
        dataset.loadData();
      }
      return dataset
    }
  }

  /**
   * Finds matching forms or suffixes for a homonym.
   * @param {Homonym} homonym - A homonym for which matching suffixes must be found.
   * @return {InflectionData} A return value of an inflection query.
   */
  static getInflectionData (homonym) {
    let instance = this.instance;
    if (instance.sets.has(homonym.languageID)) {
      let dataset = this.getDataset(homonym.languageID);
      for (let inflection of homonym.inflections) {
        // Set grammar rules for an inflection
        inflection.setConstraints();
        // dataset.setInflectionConstraints(inflection)
      }
      return dataset.getInflectionData(homonym)
    } else {
      return new InflectionData(homonym) // Return an empty inflection data set
    }
  }
}

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
        this[messageID] = new IntlMessageFormat(messages[messageID], this._locale);
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

var enUS = "{\n  \"Number\": \"Number\",\n  \"Case\": \"Case\",\n  \"Declension\": \"Declension\",\n  \"Gender\": \"Gender\",\n  \"Type\": \"Type\",\n  \"Voice\": \"Voice\",\n  \"Conjugation Stem\": \"Conjugation Stem\",\n  \"Mood\": \"Mood\",\n  \"Person\": \"Person\",\n  \"Lemma\": \"Lemma\"\n}";

var enGB = "{\n  \"Number\": \"Number (GB)\",\n  \"Case\": \"Case (GB)\",\n  \"Declension\": \"Declension (GB)\",\n  \"Gender\": \"Gender (GB)\",\n  \"Type\": \"Type (GB)\",\n  \"Voice\": \"Voice (GB)\",\n  \"Conjugation Stem\": \"Conjugation Stem (GB)\",\n  \"Mood\": \"Mood (GB)\",\n  \"Person\": \"Person (GB)\",\n  \"Lemma\": \"Lemma (GB)\"\n}";

const messages = new Map([
  ['en-US', enUS],
  ['en-GB', enGB]
]);

let messageBundles = new Map();

/**
 * Combines several message bundle for different locales.
 */
class L10n {
  /**
   * Creates an object. If an array of message bundle data is provided, initializes an object with this data.
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

  static get defaultLocale () {
    return 'en-US'
  }

  static get locales () {
    return Array.from(messages.keys())
  }

  static getMessages (locale = this.defaultLocale) {
    if (messageBundles.has(locale)) {
      return messageBundles.get(locale)
    }
    if (!messages.has(locale)) {
      console.warn(`Messages for "{locale}" are not found, returning a default "${this.defaultLocale}" instead`);
      locale = this.defaultLocale;
    }
    let messageBundle = new MessageBundle(locale, JSON.parse(messages.get(locale)));
    messageBundles.set(locale, messageBundle);
    return messageBundle
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

/**
 * Represents a single view.
 */
class View {
  /**
   * Initializes a View object with options. There is at least one view per part of speech,
   * but there could be several views for the same part of speech that show different table representation of a view.
   * @param {InflectionData} inflectionData - An inflection data object.
   * @param {string} locale - A locale for serving localized messages. If none provided, a default language will be used.
   */
  constructor (inflectionData, locale = L10n.defaultLocale) {
    this.languageID = View.languageID;
    this.inflectionData = inflectionData;
    this.messages = L10n.getMessages(locale);
    this.pageHeader = {};

    // An HTML element where this view is rendered
    this.container = undefined;

    // Must be implemented in a descendant
    this.id = v4_1(); // A unique ID of a view instance. Can be used as a value in view selectors.
    this.name = 'base view';
    this.title = 'Base View';
    this.hasComponentData = false; // True if vue supports Vue.js components

    this.forms = new Set();
    this.table = {};
  }

  /**
   * Defines a language ID of a view. Should be redefined in child classes.
   * @return {symbol}
   */
  static get languageID () {
    return Symbol('Undefined language')
  }

  /**
   * Defines a part of speech of a view. Should be redefined in child classes.
   * @return {string | undefined}
   */
  static get partOfSpeech () {
  }

  /**
   * Defines an inflection type (Suffix/Form) of a view. Should be redefined in child classes.
   * @return {Function | undefined}
   */
  static get inflectionType () {
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(View.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(View.partOfSpeech) && View.enabledForLexemes(inflectionData.homonym.lexemes)
    }
  }

  /**
   * Finds out what views match inflection data and return initialized instances of those views.
   * By default only one instance of the view is returned, by views can override this method
   * to return multiple views if necessary (e.g. paradigm view can return multiple instances of the view
   * with different data).
   * @param {InflectionData} inflectionData
   * @param {MessageBundle} messages
   * @return {View[] | []} Array of view instances or an empty array if view instance does not match inflection data.
   */
  static getMatchingInstances (inflectionData, messages) {
    if (this.matchFilter(inflectionData)) {
      return [new this(inflectionData, messages)]
    }
    return []
  }

  /**
   * test to see if a view is enabled for a specific set of lexemes
   * @param {Lexeme[]} lexemes
   * @return {boolean} true if the view should be shown false if not
   */
  static enabledForLexemes (lexemes) {
    // default returns true
    return true
  }

  get locale () {
    return this.messages.locale
  }

  setLocale (locale) {
    if (this.locale !== locale) {
      this.messages = L10n.getMessages(locale);
    }
    return this
  }

  /**
   * Converts an InflectionData, returned from an inflection tables library, into an HTML representation of an inflection table.
   * `messages` provides a translation for view's texts.
   */
  render () {
    this.footnotes = this.getFootnotes(this.inflectionData);
    // Table is already created during a view construction
    this.table.messages = this.messages;
    for (let lexeme of this.inflectionData.homonym.lexemes) {
      for (let inflection of lexeme.inflections) {
        /* if (inflection['part of speech'].filter((f) => f.hasValue(this.constructor.partOfSpeech)).length > 0) {
          let form = inflection.prefix ? `${inflection.prefix} - ` : ''
          form = form + inflection.stem
          form = inflection.suffix ? `${form} - ${inflection.suffix}` : form
          this.forms.add(form)
        } */
        if (inflection['part of speech'].values.includes(this.constructor.partOfSpeech)) {
          let form = inflection.prefix ? `${inflection.prefix} - ` : '';
          form = form + inflection.stem;
          form = inflection.suffix ? `${form} - ${inflection.suffix}` : form;
          this.forms.add(form);
        }
      }
    }
    this.table.construct(this.getMorphemes(this.inflectionData)).constructViews().addEventListeners();
    return this
  }

  /**
   * A compatibility function to get morphemes, either suffixes or forms, depending on the view type.
   * By default, it returns suffixes
   * @param {InflectionData} inflectionData
   */
  getMorphemes (inflectionData) {
    return inflectionData.pos.get(this.constructor.partOfSpeech).types.get(this.constructor.inflectionType).items
  }

  /**
   * A compatibility function to get footnotes for either suffixes or forms, depending on the view type
   * @param {InflectionData} inflectionData
   */
  getFootnotes (inflectionData) {
    return inflectionData.pos.get(this.constructor.partOfSpeech).types.get(this.constructor.inflectionType).footnotesMap
  }

  get wideViewNodes () {
    return this.table.wideView.render()
  }

  get narrowViewNodes () {
    return this.table.narrowView.render()
  }

  /**
   * Hides all empty columns of the view.
   */
  hideEmptyColumns () {
    this.table.hideEmptyColumns();
    return this
  }

  /**
   * Displays all previously hidden columns.
   */
  showEmptyColumns () {
    this.table.showEmptyColumns();
    return this
  }

  /**
   * Hides groups (formed by first column feature) that have no suffix matches.
   */
  hideNoSuffixGroups () {
    if (this.table.canCollapse) {
      this.table.hideNoSuffixGroups();
    }
    return this
  }

  /**
   * Displays previously hidden groups with no suffix matches.
   */
  showNoSuffixGroups () {
    this.table.showNoSuffixGroups();
    return this
  }

  /**
   * A utility function to convert a string to a Sentence case.
   * @param {string} string - A source string.
   * @return {string} A string capitalized to a Sentence case.
   */
  static toSentenceCase (string) {
    string = string.toLowerCase();
    return string[0].toUpperCase() + string.substr(1)
  }

  /**
   * A utility function to convert a string to a Title Case.
   * @param {string} string - A source string.
   * @return {string} A string capitalized to a Title Case.
   */
  static toTitleCase (string) {
    return string
      .toLowerCase()
      .split(' ')
      .map(word => word.length >= 1 ? `${word[0].toUpperCase()}${word.substr(1)}` : '')
      .join(' ')
  }
}

let classNames = {
  cell: 'infl-cell',
  rowTitleCell: 'row-title-cell',
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
    this.wNode.classList.add(classNames.rowTitleCell);
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

// TODO: Rebase on Feature instead of FeatureType
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
   * @param {Feature} feature - A feature that defines a type of this item.
   * @param {string} titleMessageID - A message ID of a title, used to get a formatted title from a
   * language-specific message bundle.
   * @param {string[]} order - A custom sort order for this feature that redefines
   * a default one stored in FeatureType object (optional).
   * Use this parameter to redefine a default sort order for a type.
   */
  constructor (feature, titleMessageID, order = feature.values) {
    super(feature.type, order, feature.languageID);

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
    return this.getOrderedValues(ancestorFeatures).map((value) => new Feature(this.type, value, this.languageID))
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
   * Returns a column or row title for a value of a feature provided.
   * Redefine it if you want to display custom titles instead of feature values.
   * @param {Feature} featureValue - A feature object containing a feature value
   * @return {string} - A row or column title for a table
   */
  getTitle (featureValue) {
    if (this.hasOwnProperty(featureValue)) {
      if (Array.isArray(this[featureValue])) {
        return this[featureValue].map((feature) => feature.value).join('/')
      } else {
        return this[featureValue].value
      }
    } else {
      return 'not available'
    }
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
      let suffixElement = document.createElement('span');
      suffixElement.classList.add(classNames.suffix);
      if (suffix.match && suffix.match.suffixMatch) {
        suffixElement.classList.add(classNames.suffixMatch);
      }
      if (suffix.match && suffix.match.fullMatch) {
        suffixElement.classList.add(classNames.suffixFullFeatureMatch);
      }
      suffixElement.innerHTML = suffix.value ? suffix.value : '-';
      element.appendChild(suffixElement);

      if (suffix.footnote && suffix.footnote.length) {
        let footnoteElement = document.createElement('a');
        footnoteElement.innerHTML = `<sup>${suffix.footnote}</sup>`;
        footnoteElement.dataset.footnote = suffix.footnote;
        element.appendChild(footnoteElement);
      }
      if (index < this.suffixes.length - 1) {
        element.appendChild(document.createTextNode(', ')); // 00A0 is a non-breaking space
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
 * A cell in a header row, a column title cell.
 */
class HeaderCell {
  /**
   * Initializes a header cell.
   * @param {string} featureValue - A title text that will be shown in the header cell.
   * @param {GroupFeatureType} groupingFeature - A feature that defines one or several columns this header forms.
   * @param {number} [span=1] - How many columns in a table this header cell forms.
   */
  constructor (featureValue, groupingFeature, span = 1) {
    this.feature = groupingFeature;
    this.title = groupingFeature.getTitle(featureValue);
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

  get empty () {
    return this.cells.filter(c => !c.empty).length === 0
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
    this.canCollapse = this._hasAnyMatches();
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
   * Groups all suffixes into a tree according to their grammatical features. There are several levels in this tree.
   * Each level corresponds to a one grouping feature. The order of items in GroupingFeatures List object
   * defines an order of those levels.
   * Nodes on each level are values of a grammatical feature that forms this level. An order of those values
   * is determined by the order of values within a GroupFeatureType object of each feature.
   * This is a recursive function.
   * @param {Suffix[]} suffixes - Suffixes to be grouped.
   * @param {GrmFeature[]} ancestorFeatures - A list of feature values on levels above the current.
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
      // let selectedSuffixes = suffixes.filter(group.groupFeatureType.filter.bind(group.groupFeatureType, featureValue.value))
      let selectedSuffixes = suffixes.filter(s => s.featureMatch(featureValue));

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
    rows = rows.filter(r => !r.empty);
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
   * Check for any matched suffixes
   */
  _hasAnyMatches () {
    let hasMatches = false;
    if (this.headers.length > 0) {
      for (let headerCell of this.headers[0].cells) {
        hasMatches = !!headerCell.columns.find(column => column.suffixMatches);
        if (hasMatches) {
          break
        }
      }
    }
    return hasMatches
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

class LatinView extends View {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.model = LanguageModelFactory.getLanguageModel(LatinView.languageID);
    this.dataset = LanguageDatasetFactory.getDataset(LatinView.languageID);
    this.language_features = this.model.features;
    // limit regular verb moods
    this.language_features[Feature.types.mood] =
      new Feature(Feature.types.mood,
        [ Constants.MOOD_INDICATIVE,
          Constants.MOOD_SUBJUNCTIVE
        ], LatinView.languageID);

    /*
        Default grammatical features of a view. It child views need to have different feature values, redefine
        those values in child objects.
         */
    this.features = {
      numbers: new GroupFeatureType(this.model.typeFeature(Feature.types.number), 'Number'),
      cases: new GroupFeatureType(this.model.typeFeature(Feature.types.grmCase), 'Case'),
      declensions: new GroupFeatureType(this.model.typeFeature(Feature.types.declension), 'Declension'),
      genders: new GroupFeatureType(this.model.typeFeature(Feature.types.gender), 'Gender'),
      types: new GroupFeatureType(this.model.typeFeature(Feature.types.type), 'Type')
    };
    this.features.declensions.getTitle = LatinView.getDeclensionTitle;
  }

  /**
   * Defines a language ID of a view. Should be redefined in child classes.
   * @return {symbol}
   */
  static get languageID () {
    return Constants.LANG_LATIN
  }

  /*
    Creates and initializes an inflection table. Redefine this method in child objects in order to create
    an inflection table differently
     */
  createTable () {
    this.table = new Table([this.features.declensions, this.features.genders,
      this.features.types, this.features.numbers, this.features.cases]);
    let features = this.table.features;
    features.columns = [this.model.typeFeature(Feature.types.declension), this.model.typeFeature(Feature.types.gender), this.model.typeFeature(Feature.types.type)];
    features.rows = [this.model.typeFeature(Feature.types.number), this.model.typeFeature(Feature.types.grmCase)];
    features.columnRowTitles = [this.model.typeFeature(Feature.types.grmCase)];
    features.fullWidthRowTitles = [this.model.typeFeature(Feature.types.number)];
  }

  /**
   * Define declension group titles
   * @param {String} featureValue - A value of a declension
   * @return {string} - A title of a declension group, in HTML format
   */
  static getDeclensionTitle (featureValue) {
    if (featureValue === Constants.ORD_1ST) { return `First` }
    if (featureValue === Constants.ORD_2ND) { return `Second` }
    if (featureValue === Constants.ORD_3RD) { return `Third` }
    if (featureValue === Constants.ORD_4TH) { return `Fourth` }
    if (featureValue === Constants.ORD_5TH) { return `Fifth` }

    if (this.hasOwnProperty(featureValue)) {
      if (Array.isArray(this[featureValue])) {
        return this[featureValue].map((feature) => feature.value).join('/')
      } else {
        return this[featureValue].value
      }
    } else {
      return 'not available'
    }
  }
}

class LatinNounView extends LatinView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'nounDeclension';
    this.name = 'noun declension';
    this.title = 'Noun declension';

    // Feature that are different from base class values
    this.features.genders = new GroupFeatureType(this.language_features[Feature.types.gender], 'Gender',
      [Constants.GEND_MASCULINE, Constants.GEND_FEMININE, Constants.GEND_NEUTER]);
    this.createTable();
  }

  static get partOfSpeech () {
    return Constants.POFS_NOUN
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinNounView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinNounView.partOfSpeech)
    }
  }
}

class LatinAdjectiveView extends LatinView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'adjectiveDeclension';
    this.name = 'adjective declension';
    this.title = 'Adjective declension';
    this.partOfSpeech = LatinAdjectiveView.partOfSpeech;
    this.inflectionType = LanguageDataset.SUFFIX;

    // Feature that are different from base class values
    this.features.declensions = new GroupFeatureType(this.language_features[Feature.types.declension], 'Declension',
      [ Constants.ORD_1ST, Constants.ORD_2ND, Constants.ORD_3RD ]);
    this.features.declensions.getTitle = LatinView.getDeclensionTitle;

    this.createTable();
  }

  static get partOfSpeech () {
    return Constants.POFS_ADJECTIVE
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinAdjectiveView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinAdjectiveView.partOfSpeech)
    }
  }
}

class LatinVerbView extends LatinView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);

    this.features = {
      tenses: new GroupFeatureType(this.language_features[Feature.types.tense], 'Tenses'),
      numbers: new GroupFeatureType(this.language_features[Feature.types.number], 'Number'),
      persons: new GroupFeatureType(this.language_features[Feature.types.person], 'Person'),
      voices: new GroupFeatureType(this.language_features[Feature.types.voice], 'Voice'),
      conjugations: new GroupFeatureType(this.language_features[Feature.types.conjugation], 'Conjugation Stem'),
      moods: new GroupFeatureType(this.language_features[Feature.types.mood], 'Mood')
    };

    /**
     * Define conjugation group titles
     * @param {String} featureValue - A value of a conjugation feature
     * @return {string} - A title of a conjugation group, in HTML format
     */
    this.features.conjugations.getTitle = function getTitle (featureValue) {
      if (featureValue === Constants.ORD_1ST) { return `First<br><span class="infl-cell__conj-stem">ā</span>` }
      if (featureValue === Constants.ORD_2ND) { return `Second<br><span class="infl-cell__conj-stem">ē</span>` }
      if (featureValue === Constants.ORD_3RD) { return `Third<br><span class="infl-cell__conj-stem">e</span>` }
      if (featureValue === Constants.ORD_4TH) { return `Fourth<br><span class="infl-cell__conj-stem">i</span>` }

      if (this.hasOwnProperty(featureValue)) {
        if (Array.isArray(this[featureValue])) {
          return this[featureValue].map((feature) => feature.value).join('/')
        } else {
          return this[featureValue].value
        }
      } else {
        return 'not available'
      }
    };
  }

  static get partOfSpeech () {
    return Constants.POFS_VERB
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinVerbView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinVerbView.partOfSpeech)
    }
  }
}

class LatinVoiceConjugationMoodView extends LatinVerbView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'verbVoiceConjugationMood';
    this.name = 'voice-conjugation-mood';
    this.title = 'Verb Conjugation';

    this.createTable();
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinVoiceConjugationMoodView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinVoiceConjugationMoodView.partOfSpeech)
    }
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

class LatinVoiceMoodConjugationView extends LatinVerbView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'verbVoiceMoodConjugation';
    this.name = 'voice-mood-conjugation';
    this.title = 'Verb Conjugation';

    this.createTable();
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinVoiceMoodConjugationView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinVoiceMoodConjugationView.partOfSpeech)
    }
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

class LatinConjugationVoiceMoodView extends LatinVerbView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'verbConjugationVoiceMood';
    this.name = 'conjugation-voice-mood';
    this.title = 'Verb Conjugation';

    this.createTable();
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinConjugationVoiceMoodView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinConjugationVoiceMoodView.partOfSpeech)
    }
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

class LatinConjugationMoodVoiceView extends LatinVerbView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'verbConjugationMoodVoice';
    this.name = 'conjugation-mood-voice';
    this.title = 'Verb Conjugation';

    this.createTable();
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinConjugationMoodVoiceView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinConjugationMoodVoiceView.partOfSpeech)
    }
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

class LatinMoodVoiceConjugationView extends LatinVerbView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'verbMoodVoiceConjugation';
    this.name = 'mood-voice-conjugation';
    this.title = 'Verb Conjugation';

    this.createTable();
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinMoodVoiceConjugationView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinMoodVoiceConjugationView.partOfSpeech)
    }
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

class LatinMoodConjugationVoiceView extends LatinVerbView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'verbMoodConjugationVoice';
    this.name = 'mood-conjugation-voice';
    this.title = 'Verb Conjugation';

    this.createTable();
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinMoodConjugationVoiceView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinMoodConjugationVoiceView.partOfSpeech)
    }
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

class LatinVerbMoodView extends LatinVerbView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.features = {
      tenses: new GroupFeatureType(this.language_features[Feature.types.tense], 'Tenses'),
      numbers: new GroupFeatureType(this.language_features[Feature.types.number], 'Number'),
      persons: new GroupFeatureType(this.language_features[Feature.types.person], 'Person'),
      voices: new GroupFeatureType(this.language_features[Feature.types.voice], 'Voice'),
      conjugations: new GroupFeatureType(this.language_features[Feature.types.conjugation], 'Conjugation Stem')
    };
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinVerbMoodView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinVerbMoodView.partOfSpeech)
    }
  }
}

class LatinImperativeView extends LatinVerbMoodView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'verbImperative';
    this.name = 'imperative';
    this.title = 'Imperative';
    this.features.moods = new GroupFeatureType(
      new Feature(Feature.types.mood, [Constants.MOOD_IMPERATIVE], this.model.languageID),
      'Mood');
    this.language_features[Feature.types.person] = new Feature(Feature.types.person, [Constants.ORD_2ND, Constants.ORD_3RD], this.model.languageID);
    this.features.persons = new GroupFeatureType(this.language_features[Feature.types.person], 'Person');
    this.language_features[Feature.types.tense] = new Feature(Feature.types.tense,
      [Constants.TENSE_PRESENT, Constants.TENSE_FUTURE], this.model.languageID);
    this.features.tenses = new GroupFeatureType(this.language_features[Feature.types.tense], 'Tense');
    this.createTable();
    this.table.suffixCellFilter = LatinImperativeView.suffixCellFilter;
  }

  createTable () {
    this.table = new Table([this.features.voices, this.features.conjugations,
      this.features.tenses, this.features.numbers, this.features.persons]);
    let features = this.table.features;
    features.columns = [
      this.language_features[Feature.types.voice],
      this.language_features[Feature.types.conjugation]];
    features.rows = [this.language_features[Feature.types.tense], this.language_features[Feature.types.number], this.language_features[Feature.types.person]];
    features.columnRowTitles = [this.language_features[Feature.types.number], this.language_features[Feature.types.person]];
    features.fullWidthRowTitles = [this.language_features[Feature.types.tense]];
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinImperativeView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinImperativeView.partOfSpeech) &&
        LatinImperativeView.enabledForLexemes(inflectionData.homonym.lexemes)
    }
  }

  static enabledForLexemes (lexemes) {
    // default is true
    for (let lexeme of lexemes) {
      for (let inflection of lexeme.inflections) {
        if (inflection[Feature.types.mood] &&
          inflection[Feature.types.mood].values.includes(Constants.MOOD_IMPERATIVE)) {
          return true
        }
      }
    }
    return false
  }

  static suffixCellFilter (suffix) {
    return suffix.features[Feature.types.mood].includes(Constants.MOOD_IMPERATIVE)
  }
}

class LatinSupineView extends LatinView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.partOfSpeech = LatinSupineView.partOfSpeech;
    this.id = 'verbSupine';
    this.name = 'supine';
    this.title = 'Supine';
    this.features.moods = new GroupFeatureType(
      new Feature(Feature.types.mood, [Constants.MOOD_SUPINE], this.model.languageID),
      'Mood');
    this.language_features[Feature.types.grmCase] = new Feature(Feature.types.grmCase,
      [Constants.CASE_ACCUSATIVE, Constants.CASE_ABLATIVE], this.model.languageID);
    this.features = {
      cases: new GroupFeatureType(this.language_features[Feature.types.grmCase], 'Case'),
      voices: new GroupFeatureType(this.language_features[Feature.types.voice], 'Voice'),
      conjugations: new GroupFeatureType(this.language_features[Feature.types.conjugation], 'Conjugation Stem')
    };
    this.createTable();
  }

  static get partOfSpeech () {
    return Constants.POFS_SUPINE
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinSupineView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinSupineView.partOfSpeech)
    }
  }

  createTable () {
    this.table = new Table([this.features.voices, this.features.conjugations,
      this.features.cases]);
    let features = this.table.features;
    features.columns = [
      this.language_features[Feature.types.voice],
      this.language_features[Feature.types.conjugation]];
    features.rows = [this.language_features[Feature.types.grmCase]];
    features.columnRowTitles = [this.language_features[Feature.types.grmCase]];
    features.fullWidthRowTitles = [];
  }
}

class LatinVerbParticipleView extends LatinView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.partOfSpeech = LatinVerbParticipleView.partOfSpeech;
    this.id = 'verbParticiple';
    this.name = 'participle';
    this.title = 'Participle';
    this.language_features[Feature.types.tense] = new Feature(Feature.types.tense,
      [Constants.TENSE_PRESENT, Constants.TENSE_PERFECT, Constants.TENSE_FUTURE], this.model.languageID);
    this.features = {
      tenses: new GroupFeatureType(this.language_features[Feature.types.tense], 'Tenses'),
      voices: new GroupFeatureType(this.language_features[Feature.types.voice], 'Voice'),
      conjugations: new GroupFeatureType(this.language_features[Feature.types.conjugation], 'Conjugation Stem')
    };
    this.createTable();
  }

  static get partOfSpeech () {
    return Constants.POFS_VERB_PARTICIPLE
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinVerbParticipleView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinVerbParticipleView.partOfSpeech)
    }
  }

  createTable () {
    this.table = new Table([this.features.voices, this.features.conjugations,
      this.features.tenses]);
    let features = this.table.features;
    features.columns = [
      this.language_features[Feature.types.voice],
      this.language_features[Feature.types.conjugation]];
    features.rows = [this.language_features[Feature.types.tense]];
    features.columnRowTitles = [this.language_features[Feature.types.tense]];
    features.fullWidthRowTitles = [];
  }
}

class LatinInfinitiveView extends LatinVerbMoodView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'verbInfinitive';
    this.name = 'infinitive';
    this.title = 'Infinitive';
    this.features.moods = new GroupFeatureType(
      new Feature(Feature.types.mood, [Constants.MOOD_INFINITIVE], this.model.languageID),
      'Mood');
    this.language_features[Feature.types.tense] = new Feature(Feature.types.tense,
      [Constants.TENSE_PRESENT, Constants.TENSE_PERFECT, Constants.TENSE_FUTURE], this.model.languageID);
    this.features.tenses = new GroupFeatureType(this.language_features[Feature.types.tense], 'Tense');
    this.createTable();
    this.table.suffixCellFilter = LatinInfinitiveView.suffixCellFilter;
  }

  createTable () {
    this.table = new Table([this.features.voices, this.features.conjugations,
      this.features.tenses]);
    let features = this.table.features;
    features.columns = [
      this.language_features[Feature.types.voice],
      this.language_features[Feature.types.conjugation]];
    features.rows = [this.language_features[Feature.types.tense]];
    features.columnRowTitles = [this.language_features[Feature.types.tense]];
    features.fullWidthRowTitles = [];
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(LatinInfinitiveView.languageID, inflectionData.languageID)) {
      return inflectionData.partsOfSpeech.includes(LatinInfinitiveView.partOfSpeech) &&
        LatinInfinitiveView.enabledForLexemes(inflectionData.homonym.lexemes)
    }
  }

  static enabledForLexemes (lexemes) {
    // default is true
    for (let lexeme of lexemes) {
      for (let inflection of lexeme.inflections) {
        if (inflection[Feature.types.mood] &&
          inflection[Feature.types.mood].values.includes(Constants.MOOD_INFINITIVE)) {
          return true
        }
      }
    }
    return false
  }

  static suffixCellFilter (suffix) {
    return suffix.features[Feature.types.mood].includes(Constants.MOOD_INFINITIVE)
  }
}

class GreekView extends View {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.languageID = GreekView.languageID;
    this.model = LanguageModelFactory.getLanguageModel(GreekView.languageID);
    this.dataset = LanguageDatasetFactory.getDataset(GreekView.languageID);

    /*
    Default grammatical features of a View. It child views need to have different feature values, redefine
    those values in child objects.
     */
    this.features = {
      numbers: new GroupFeatureType(this.model.typeFeature(Feature.types.number), 'Number'),
      cases: new GroupFeatureType(this.model.typeFeature(Feature.types.grmCase), 'Case'),
      declensions: new GroupFeatureType(this.model.typeFeature(Feature.types.declension), 'Declension'),
      genders: new GroupFeatureType(this.model.typeFeature(Feature.types.gender), 'Gender'),
      types: new GroupFeatureType(this.model.typeFeature(Feature.types.type), 'Type')
    };
  }

  static get languageID () {
    return Constants.LANG_GREEK
  }

  /**
   * Creates and initializes an inflection table. Redefine this method in child objects in order to create
   * an inflection table differently.
   */
  createTable () {
    this.table = new Table([this.features.declensions, this.features.genders,
      this.features.types, this.features.numbers, this.features.cases]);
    let features = this.table.features;
    features.columns = [
      this.model.typeFeature(Feature.types.declension),
      this.model.typeFeature(Feature.types.gender),
      this.model.typeFeature(Feature.types.type)
    ];
    features.rows = [
      this.model.typeFeature(Feature.types.number),
      this.model.typeFeature(Feature.types.grmCase)
    ];
    features.columnRowTitles = [
      this.model.typeFeature(Feature.types.grmCase)
    ];
    features.fullWidthRowTitles = [
      this.model.typeFeature(Feature.types.number)
    ];
  }
}

class GreekNounView extends GreekView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'nounDeclension';
    this.name = 'noun declension';
    this.title = 'Noun declension';
    this.partOfSpeech = Constants.POFS_NOUN;
    this.inflectionType = Suffix;
    let genderMasculine = Constants.GEND_MASCULINE;
    let genderFeminine = Constants.GEND_FEMININE;
    let genderNeuter = Constants.GEND_NEUTER;

    this.features.genders.getOrderedValues = function getOrderedValues (ancestorFeatures) {
      if (ancestorFeatures) {
        if (ancestorFeatures.value === Constants.ORD_2ND || ancestorFeatures.value === Constants.ORD_3RD) {
          return [[genderMasculine, genderFeminine], genderNeuter]
        }
      }
      return [genderMasculine, genderFeminine, genderNeuter]
    };

    this.createTable();
  }

  static get partOfSpeech () {
    return Constants.POFS_NOUN
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(GreekNounView.languageID, inflectionData.languageID)) {
      return inflectionData.pos.has(GreekNounView.partOfSpeech)
    }
  }
}

class GreekNounSimplifiedView extends GreekNounView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);
    this.id = 'nounDeclensionSimplified';
    this.name = 'noun declension simplified';
    this.title = 'Noun declension (simplified)';
    this.partOfSpeech = Constants.POFS_NOUN;
    this.inflectionType = Suffix;
    let genderMasculine = Constants.GEND_MASCULINE;
    let genderFeminine = Constants.GEND_FEMININE;
    let genderNeuter = Constants.GEND_NEUTER;

    this.features.genders.getOrderedValues = function getOrderedValues (ancestorFeatures) {
      if (ancestorFeatures) {
        if (ancestorFeatures.value === Constants.ORD_2ND || ancestorFeatures.value === Constants.ORD_3RD) {
          return [[genderMasculine, genderFeminine], genderNeuter]
        }
      }
      return [genderMasculine, genderFeminine, genderNeuter]
    };

    this.createTable();

    this.table.suffixCellFilter = GreekNounSimplifiedView.suffixCellFilter;
  }

  static get partOfSpeech () {
    return Constants.POFS_NOUN
  }

  static get inflectionType () {
    return Suffix
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(GreekNounSimplifiedView.languageID, inflectionData.languageID)) {
      return inflectionData.pos.has(GreekNounSimplifiedView.partOfSpeech)
    }
  }

  static suffixCellFilter (suffix) {
    if (suffix.extendedLangData && suffix.extendedLangData[Constants.STR_LANG_CODE_GRC]) {
      return suffix.extendedLangData[Constants.STR_LANG_CODE_GRC].primary
    } else {
      console.warn(`Greek morpheme "${suffix.value}" has no extended language data attached.`);
      return false
    }
  }
}

/**
 * This is a base class for all pronoun views. This class should not be used to create tables. Its purpose
 * is to define common features and properties for all pronoun classes.
 */
class GreekPronounView extends GreekView {
  /**
   * @param {InflectionData} inflectionData
   * @param {string} locale
   * @param {string} grammarClass - For what pronoun class a view will be created
   */
  constructor (inflectionData, locale, grammarClass = 'Greek') {
    super(inflectionData, locale);
    this.id = GreekPronounView.getID(grammarClass);
    this.name = GreekPronounView.getName(grammarClass);
    this.title = GreekPronounView.getTitle(grammarClass);
    this.featureTypes = {};

    const GEND_MASCULINE_FEMININE = 'masculine feminine';
    const GEND_MASCULINE_FEMININE_NEUTER = 'masculine feminine neuter';
    this.featureTypes.numbers = new Feature(
      Feature.types.number,
      [Constants.NUM_SINGULAR, Constants.NUM_DUAL, Constants.NUM_PLURAL],
      this.languageID
    );

    this.featureTypes.genders = new Feature(
      Feature.types.gender,
      [Constants.GEND_MASCULINE, Constants.GEND_FEMININE, GEND_MASCULINE_FEMININE, Constants.GEND_NEUTER, GEND_MASCULINE_FEMININE_NEUTER],
      this.languageID
    );

    // This is just a placeholder. Lemma values will be generated dynamically
    this.featureTypes.lemmas = new Feature(Feature.types.hdwd, [], this.languageID);

    this.features = {
      numbers: new GroupFeatureType(this.featureTypes.numbers, 'Number'),
      cases: new GroupFeatureType(GreekLanguageModel.typeFeature(Feature.types.grmCase), 'Case'),
      genders: new GroupFeatureType(this.featureTypes.genders, 'Gender'),
      persons: new GroupFeatureType(GreekLanguageModel.typeFeature(Feature.types.person), 'Person')
    };

    this.features.genders.getTitle = function getTitle (featureValue) {
      if (featureValue === Constants.GEND_MASCULINE) { return 'm.' }
      if (featureValue === Constants.GEND_FEMININE) { return 'f.' }
      if (featureValue === Constants.GEND_NEUTER) { return 'n.' }
      if (featureValue === GEND_MASCULINE_FEMININE) { return 'm./f.' }
      if (featureValue === GEND_MASCULINE_FEMININE_NEUTER) { return 'm./f./n.' }
      return featureValue
    };

    this.features.genders.filter = function filter (featureValues, suffix) {
      // If not an array, convert it to array for uniformity
      if (!Array.isArray(featureValues)) {
        featureValues = [featureValues];
      }
      for (const value of featureValues) {
        if (suffix.features[this.type] === value) {
          return true
        }
      }

      return false
    };
  }

  static get partOfSpeech () {
    return Constants.POFS_PRONOUN
  }

  static get inflectionType () {
    return Form
  }

  /**
   * What classes of pronouns this view should be used with.
   * Should be defined in descendants.
   * @return {string[]} Array of class names
   */
  static get classes () {
    return []
  }

  static getID (grammarClass) {
    return `${grammarClass}${View.toTitleCase(GreekPronounView.partOfSpeech)}Declension`
  }

  static getName (grammarClass) {
    return `${grammarClass} ${GreekPronounView.partOfSpeech} declension`
  }

  static getTitle (grammarClass) {
    return View.toTitleCase(`${grammarClass} ${GreekPronounView.partOfSpeech} Declension`).trim()
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(this.languageID, inflectionData.languageID) &&
      inflectionData.pos.has(this.partOfSpeech)) {
      let inflectionSet = inflectionData.pos.get(this.partOfSpeech);
      if (inflectionSet.types.has(this.inflectionType)) {
        let inflections = inflectionSet.types.get(this.inflectionType);
        let found = inflections.items.find(form => {
          let match = false;
          for (const value of form.features[Feature.types.grmClass].values) {
            match = match || this.classes.includes(value);
          }
          return match
        });
        if (found) {
          return true
        }
      }
    }
    return false
  }
}

/**
 * Used for several classes of pronouns, see `classes` method for a full list.
 * Produces a table grouped into columns by gender.
 */
class GreekGenderPronounView extends GreekPronounView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale);

    /*
    Define tables and table features.
    Features should go as: column features first, row features last. This specifies the order of grouping
    in which a table tree will be built.
     */
    this.table = new Table([this.features.genders, this.features.numbers, this.features.cases]);
    let features = this.table.features;
    features.columns = [this.featureTypes.genders];
    features.rows = [this.featureTypes.numbers, GreekLanguageModel.typeFeature(Feature.types.grmCase)];
    features.columnRowTitles = [GreekLanguageModel.typeFeature(Feature.types.grmCase)];
    features.fullWidthRowTitles = [this.featureTypes.numbers];
  }

  /**
   * What classes of pronouns this view should be used with
   * @return {string[]} Array of class names
   */
  static get classes () {
    return [
      Constants.CLASS_GENERAL_RELATIVE,
      Constants.CLASS_INDEFINITE,
      Constants.CLASS_INTENSIVE,
      Constants.CLASS_INTERROGATIVE,
      Constants.CLASS_RECIPROCAL,
      Constants.CLASS_RELATIVE
    ]
  }
}

/**
 * Used for demonstrative pronouns. Produces a table grouped into columns by lemma and gender
 */
class GreekLemmaGenderPronounView extends GreekPronounView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale, GreekLemmaGenderPronounView.classes[0]);

    // Add lemmas
    const lemmaValues = this.dataset.getPronounGroupingLemmas(GreekLemmaGenderPronounView.classes[0]);
    this.featureTypes.lemmas = new Feature(Feature.types.hdwd, lemmaValues, GreekLemmaGenderPronounView.languageID);
    this.features.lemmas = new GroupFeatureType(this.featureTypes.lemmas, 'Lemma');

    /*
    Define tables and table features.
    Features should go as: column features first, row features last. This specifies the order of grouping
    in which a table tree will be built.
     */
    this.table = new Table([this.features.lemmas, this.features.genders, this.features.numbers, this.features.cases]);
    let features = this.table.features;
    features.columns = [this.featureTypes.lemmas, this.featureTypes.genders];
    features.rows = [this.featureTypes.numbers, GreekLanguageModel.typeFeature(Feature.types.grmCase)];
    features.columnRowTitles = [GreekLanguageModel.typeFeature(Feature.types.grmCase)];
    features.fullWidthRowTitles = [this.featureTypes.numbers];
  }

  /**
   * What classes of pronouns this view should be used with
   * @return {string[]} Array of class names
   */
  static get classes () {
    return [Constants.CLASS_DEMONSTRATIVE]
  }
}

/**
 * Used for reflexive pronouns. Produces a table grouped into columns by person and gender
 */
class GreekPersonGenderPronounView extends GreekPronounView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale, GreekPersonGenderPronounView.classes[0]);

    // Add persons
    this.featureTypes.persons = new Feature(
      Feature.types.person,
      [
        Constants.ORD_1ST,
        Constants.ORD_2ND,
        Constants.ORD_3RD
      ],
      this.languageID);
    this.features.persons = new GroupFeatureType(this.featureTypes.persons, 'Person');

    /*
    Define tables and table features.
    Features should go as: column features first, row features last. This specifies the order of grouping
    in which a table tree will be built.
     */
    this.table = new Table([this.features.persons, this.features.genders, this.features.numbers, this.features.cases]);
    let features = this.table.features;
    features.columns = [this.featureTypes.persons, this.featureTypes.genders];
    features.rows = [this.featureTypes.numbers, GreekLanguageModel.typeFeature(Feature.types.grmCase)];
    features.columnRowTitles = [GreekLanguageModel.typeFeature(Feature.types.grmCase)];
    features.fullWidthRowTitles = [this.featureTypes.numbers];
  }

  /**
   * What classes of pronouns this view should be used with
   * @return {string[]} Array of class names
   */
  static get classes () {
    return [Constants.CLASS_REFLEXIVE]
  }
}

/**
 * Used for personal pronouns. Produces a table grouped into columns by person
 */
class GreekPersonPronounView extends GreekPronounView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale, GreekPersonPronounView.classes[0]);

    // Add persons
    this.featureTypes.persons = new Feature(
      Feature.types.person,
      [
        Constants.ORD_1ST,
        Constants.ORD_2ND,
        Constants.ORD_3RD
      ],
      this.languageID);
    this.features.persons = new GroupFeatureType(this.featureTypes.persons, 'Person');

    /*
    Define tables and table features.
    Features should go as: column features first, row features last. This specifies the order of grouping
    in which a table tree will be built.
     */
    this.table = new Table([this.features.persons, this.features.numbers, this.features.cases]);
    let features = this.table.features;
    features.columns = [this.featureTypes.persons];
    features.rows = [this.featureTypes.numbers, GreekLanguageModel.typeFeature(Feature.types.grmCase)];
    features.columnRowTitles = [GreekLanguageModel.typeFeature(Feature.types.grmCase)];
    features.fullWidthRowTitles = [this.featureTypes.numbers];
  }

  /**
   * What classes of pronouns this view should be used with
   * @return {string[]} Array of class names
   */
  static get classes () {
    return [Constants.CLASS_PERSONAL]
  }
}

/**
 * This is a base class for all pronoun views. This class should not be used to create tables. Its purpose
 * is to define common features and properties for all pronoun classes.
 */
class GreekParadigmView extends GreekView {
  /**
   * @param {Paradigm} paradigm
   * @param {InflectionData} inflectionData
   * @param {string} locale
   */
  constructor (paradigm, inflectionData, locale) {
    super(inflectionData, locale);
    this.id = paradigm.id;
    this.name = paradigm.title.toLowerCase();
    this.title = paradigm.title;
    this.hasComponentData = true;
    this.paradigm = paradigm;
    this.featureTypes = {};

    this.wideTable = this.paradigm.table;
    this.wideSubTables = this.paradigm.subTables;
  }

  static get partOfSpeech () {
    return Constants.POFS_VERB
  }

  static get inflectionType () {
    return Paradigm
  }

  /**
   * What classes of pronouns this view should be used with.
   * Should be defined in descendants.
   * @return {string[]} Array of class names
   */
  static get classes () {
    return []
  }

  static getID (grammarClass) {
    return `${grammarClass}${View.toTitleCase(GreekParadigmView.partOfSpeech)}Paradigm`
  }

  static getName (grammarClass) {
    return `${grammarClass} ${GreekParadigmView.partOfSpeech} paradigm`
  }

  static getTitle (grammarClass) {
    return View.toTitleCase(`${grammarClass} ${GreekParadigmView.partOfSpeech} Paradigm`).trim()
  }

  /**
   * Determines wither this view can be used to display an inflection table of any data
   * within an `inflectionData` object.
   * By default a view can be used if a view and an inflection data piece have the same language,
   * the same part of speech, and the view is enabled for lexemes within an inflection data.
   * @param inflectionData
   * @return {boolean}
   */
  static matchFilter (inflectionData) {
    if (LanguageModelFactory.compareLanguages(this.languageID, inflectionData.languageID) &&
      inflectionData.pos.has(this.partOfSpeech)) {
      let inflectionSet = inflectionData.pos.get(this.partOfSpeech);
      if (inflectionSet.types.has(this.inflectionType)) {
        return true
      }
    }
    return false
  }

  static getMatchingInstances (inflectionData, messages) {
    if (this.matchFilter(inflectionData)) {
      let paradigms = inflectionData.pos.get(this.partOfSpeech).types.get(this.inflectionType).items;
      return paradigms.map(paradigm => new this(paradigm, inflectionData, messages))
    }
    return []
  }

  render () {
    // Do nothing as there is no need to render anything
    return this
  }

  get wideViewNodes () {
    return this.nodes
  }

  hideEmptyColumns () {
    return this
  }

  showEmptyColumns () {
    return this
  }

  hideNoSuffixGroups () {
    return this
  }

  showNoSuffixGroups () {
    return this
  }
}

/**
 * A set of inflection table views that represent all possible forms of inflection data. A new ViewSet instance
 * mast be created for each new inflection data piece.
 */
class ViewSet {
  constructor (inflectionData, locale) {
    this.views = new Map([
      [
        Constants.LANG_LATIN,
        [
          LatinNounView,
          LatinAdjectiveView,
          LatinVoiceConjugationMoodView,
          LatinVoiceMoodConjugationView,
          LatinConjugationVoiceMoodView,
          LatinConjugationMoodVoiceView,
          LatinMoodVoiceConjugationView,
          LatinMoodConjugationVoiceView,
          LatinImperativeView,
          LatinSupineView,
          LatinVerbParticipleView,
          LatinInfinitiveView
        ]
      ],
      [
        Constants.LANG_GREEK,
        [
          GreekNounView,
          GreekNounSimplifiedView,
          GreekGenderPronounView,
          GreekPersonGenderPronounView,
          GreekPersonPronounView,
          GreekLemmaGenderPronounView,
          GreekParadigmView
        ]
      ]
    ]);
    this.inflectionData = inflectionData;
    this.languageID = this.inflectionData.languageID;
    this.locale = locale;
    this.matchingViews = [];

    if (this.views.has(this.languageID)) {
      for (let view of this.views.get(this.languageID)) {
        this.matchingViews.push(...view.getMatchingInstances(this.inflectionData, this.messages));
      }
    }
    this.partsOfSpeech = Array.from(new Set(this.matchingViews.map(view => view.constructor.partOfSpeech)));
  }

  getViews (partOfSpeech = undefined) {
    if (partOfSpeech) {
      return this.matchingViews.filter(view => view.constructor.partOfSpeech === partOfSpeech)
    } else {
      return this.matchingViews
    }
  }

  updateMessages (messages) {
    this.messages = messages;
    for (let view of this.matchingViews) {
      view.updateMessages(messages);
    }
  }

  setLocale (locale) {
    for (let view of this.matchingViews) {
      view.setLocale(locale);
    }
  }
}

export { InflectionData, LanguageDatasetFactory, LatinLanguageDataset as LatinDataSet, GreekLanguageDataset as GreekDataSet, L10n, ViewSet };
//# sourceMappingURL=inflection-tables.module-external.js.map
