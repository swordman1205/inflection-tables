import { Constants, LanguageModelFactory, Feature, FeatureType } from 'alpheios-data-models'
import LatinVerbMoodView from './latin-verb-mood-view.js'
import GroupFeatureType from '../../lib/group-feature-type'
import Table from '../../lib/table'

export default class LatinImperativeView extends LatinVerbMoodView {
  constructor (inflectionData, messages) {
    super(inflectionData, messages)
    this.id = 'verbImperative'
    this.name = 'imperative'
    this.title = 'Imperative'
    this.features.moods = new GroupFeatureType(
      new FeatureType(Feature.types.mood, [Constants.MOOD_IMPERATIVE], this.languageModel.toCode()),
      'Mood')
    this.language_features[Feature.types.person] = new FeatureType(Feature.types.person, [Constants.ORD_2ND, Constants.ORD_3RD], this.languageModel.toCode())
    this.features.persons = new GroupFeatureType(this.language_features[Feature.types.person], 'Person')
    this.language_features[Feature.types.tense] = new FeatureType(Feature.types.tense,
      [Constants.TENSE_PRESENT, Constants.TENSE_FUTURE], this.languageModel.toCode())
    this.features.tenses = new GroupFeatureType(this.language_features[Feature.types.tense], 'Tense')
    this.createTable()
    this.table.suffixCellFilter = LatinImperativeView.suffixCellFilter
  }

  createTable () {
    this.table = new Table([this.features.voices, this.features.conjugations,
      this.features.tenses, this.features.numbers, this.features.persons])
    let features = this.table.features
    features.columns = [
      this.language_features[Feature.types.voice],
      this.language_features[Feature.types.conjugation]]
    features.rows = [this.language_features[Feature.types.tense], this.language_features[Feature.types.number], this.language_features[Feature.types.person]]
    features.columnRowTitles = [this.language_features[Feature.types.number], this.language_features[Feature.types.person]]
    features.fullWidthRowTitles = [this.language_features[Feature.types.tense]]
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
          inflection[Feature.types.mood].filter((f) => f.value.includes(Constants.MOOD_IMPERATIVE)).length > 0) {
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
