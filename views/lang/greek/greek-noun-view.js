import { Constants, GreekLanguageModel, Feature, LanguageModelFactory } from 'alpheios-data-models'
import GreekView from './greek-view.js'

export default class GreekNounView extends GreekView {
  constructor (inflectionData, messages) {
    super(inflectionData, messages)
    this.id = 'nounDeclension'
    this.name = 'noun declension'
    this.title = 'Noun declension'
    this.partOfSpeech = Constants.POFS_NOUN
    let genderMasculine = GreekLanguageModel.getFeatureType(Feature.types.gender)[Constants.GEND_MASCULINE].value
    let genderFeminine = GreekLanguageModel.getFeatureType(Feature.types.gender)[Constants.GEND_FEMININE].value
    let genderNeuter = GreekLanguageModel.getFeatureType(Feature.types.gender)[Constants.GEND_NEUTER].value

    this.features.genders.getOrderedValues = function getOrderedValues (ancestorFeatures) {
      if (ancestorFeatures) {
        if (ancestorFeatures[0].value === GreekLanguageModel.getFeatureType(Feature.types.declension)[Constants.ORD_2ND].value ||
          ancestorFeatures[0].value === GreekLanguageModel.getFeatureType(Feature.types.declension)[Constants.ORD_3RD].value) {
          return [[genderMasculine, genderFeminine], genderNeuter]
        }
      }
      return [genderMasculine, genderFeminine, genderNeuter]
    }

    this.createTable()
  }

  static get partOfSpeech () {
    return Constants.POFS_NOUN
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
      return inflectionData.partsOfSpeech.includes(GreekNounView.partOfSpeech)
    }
  }
}
