import { Constants, LanguageModelFactory } from 'alpheios-data-models'
import Suffix from '../../../../lib/suffix.js'
import GreekNounView from './greek-noun-view'

export default class GreekNounSimplifiedView extends GreekNounView {
  constructor (inflectionData, locale) {
    super(inflectionData, locale)
    this.id = 'nounDeclensionSimplified'
    this.name = 'noun declension simplified'
    this.title = 'Noun declension (simplified)'
    this.partOfSpeech = Constants.POFS_NOUN
    this.inflectionType = Suffix
    let genderMasculine = Constants.GEND_MASCULINE
    let genderFeminine = Constants.GEND_FEMININE
    let genderNeuter = Constants.GEND_NEUTER

    this.features.genders.getOrderedValues = function getOrderedValues (ancestorFeatures) {
      if (ancestorFeatures) {
        if (ancestorFeatures.value === Constants.ORD_2ND || ancestorFeatures.value === Constants.ORD_3RD) {
          return [[genderMasculine, genderFeminine], genderNeuter]
        }
      }
      return [genderMasculine, genderFeminine, genderNeuter]
    }

    this.createTable()

    this.table.suffixCellFilter = GreekNounSimplifiedView.suffixCellFilter
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
      console.warn(`Greek morpheme "${suffix.value}" has no extended language data attached.`)
      return false
    }
  }
}
