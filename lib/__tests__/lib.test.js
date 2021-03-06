/* eslint-env jest */
const t = require('../../tests/test-bundle')

describe('LanguageDataset object', () => {
  let languageDataset

  beforeAll(() => {
    // Create a test environment
    languageDataset = new t.LanguageDataset(t.Models.Constants.LANG_LATIN)
  })

  test('Should be initialized properly', () => {
    expect(languageDataset).toEqual({
      dataLoaded: false,
      languageID: t.Models.Constants.LANG_LATIN,
      model: expect.any(Function),
      suffixes: [],
      forms: [],
      footnotes: []
    })
  })

  test('Should require language to be provided', () => {
    expect(() => new t.LanguageDataset()).toThrowError(/empty/)
  })

  // TODO: Add tests for addSuffix for later as the logic might change

  test('addFootnote should add proper data into a footnotes object', () => {
    let partOfSpeech = new t.GrmFeature('noun', t.GrmFeature.types.part, t.Models.Constants.LANG_LATIN)
    languageDataset.addFootnote(partOfSpeech, 5, 'Footnote text')
    expect(languageDataset.footnotes).toEqual(
      expect.arrayContaining([{index: 5, text: 'Footnote text', 'part of speech': 'noun'}]))
  })

  test('addFootnote should not allow empty values', () => {
    expect(() => languageDataset.addFootnote(5)).toThrowError(/empty/)
  })

  // TODO: Add tests for getSuffixes later as the logic might change

  afterAll(() => {
    // Clean a test environment up
    languageDataset = undefined
  })
})

describe('LanguageData', () => {
  let latinDataset, greekDataset

  beforeAll(() => {
    latinDataset = new t.LanguageDataset(t.Models.Constants.LANG_LATIN)
    greekDataset = new t.LanguageDataset(t.Models.Constants.LANG_GREEK)
  })

  test('constructor should initialize object properly.', () => {
    expect(Array.from(t.LanguageDatasetFactory.instance.sets.values())).toEqual(expect.arrayContaining([
      greekDataset,
      latinDataset
    ]))
  })

  test('getSuffixes() should call a getSuffixes() method of a proper language dataset with correct argument(s).', () => {
    let homonym = new t.Homonym([
      new t.Lexeme(
        new t.Lemma('word1', t.Models.Constants.STR_LANG_CODE_GRC),
        [
          new t.Inflection('stem1', t.Models.Constants.STR_LANG_CODE_GRC),
          new t.Inflection('stem2', t.Models.Constants.STR_LANG_CODE_GRC)
        ]
      )
    ])
    const getSuffixes = jest.fn()
    greekDataset.getSuffixes = getSuffixes
    t.LanguageDatasetFactory.getInflectionData(homonym)

    expect(getSuffixes.mock.calls.length).toBe(1)
    expect(getSuffixes.mock.calls[0][0]).toBe(homonym)
  })
})

describe('Suffix object', () => {
  'use strict'

  let suffix

  beforeAll(() => {
    // Create a test environment

    suffix = new t.Suffix('suffixtext')
  })

  test('Should be initialized properly', () => {
    expect(suffix).toEqual({
      ConstructorFunc: expect.any(Function),
      value: 'suffixtext',
      features: {},
      featureGroups: {},
      extendedLangData: {},
      match: undefined
    })
  })

  test('Should not allow an empty argument', () => {
    expect(() => new t.Suffix()).toThrowError(/empty/)
  })

  test('clone method should return a copy of a Suffix object', () => {
    let clone = suffix.clone()
    expect(clone).toEqual(suffix)
  })

  // TODO: implement tests for featureMatch as functionality may change
  // TODO: implement tests for getCommonGroups as functionality may change
  // TODO: implement tests for isInSameGroupWith as functionality may change
  // TODO: implement tests for split as functionality may change
  // TODO: implement tests for combine as functionality may change

  test('merge() should join two previously split object (objects that are in the same group) together.', () => {
    let values = ['masculine', 'feminine']
    let suffixes = [new t.Suffix('endingOne', undefined), new t.Suffix('endingOne', undefined)]
    suffixes[0].features[t.GrmFeature.types.gender] = values[0]
    suffixes[1].features[t.GrmFeature.types.gender] = values[1]
    suffixes[0].featureGroups[t.GrmFeature.types.gender] = values
    suffixes[1].featureGroups[t.GrmFeature.types.gender] = values
    let merged = t.Suffix.merge(suffixes[0], suffixes[1])
    expect(merged.features[t.GrmFeature.types.gender]).toBe(values[0] + ', ' + values[1])
  })

  afterAll(() => {
    // Clean a test environment up
    suffix = undefined
  })
})

// TODO: implement tests for a WordData later as it will evolve
