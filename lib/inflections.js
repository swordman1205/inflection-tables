import { Feature } from 'alpheios-data-models'
// import LanguageDataset from './language-dataset.js'
// import Form from './form.js'
// import Suffix from './suffix.js'

export default class Inflections {
  constructor (type) {
    this.type = type
    this.items = [] // Suffixes or forms
    this.footnotesMap = new Map() // Footnotes (if any)
  }

  /**
   * Adds an individual item to the `items` array.
   * @param {Object} item
   */
  addItem (item) {
    if (!item) {
      throw new Error(`Inflection item cannot be empty`)
    }
    this.items.push(item)
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
    this.items.push(...items)
  }

  /**
   * Adds a singe footnote object
   * @param {string} index - A footnote index
   * @param {Footnote} footnote - A footnote object
   */
  addFootnote (index, footnote) {
    this.footnotesMap.set(index, footnote)
  }

  /**
   * Returns an array of items that `matches` an inflection. A match is determined as a result of item's `match`
   * function. Returned value is determined by item's `match` function as well.
   * @param {Inflection} inflection - An inflection to match against.
   * @return {Object[]} An array of objects. Each object is returned by a `match` function of an individual item.
   * Its format is dependent on the `match` function implementation.
   */
  getMatches (inflection) {
    let results = []
    for (const item of this.items) {
      let result = item.matches(inflection)
      if (result) { results.push(result) }
    }
    return results
  }

  /**
   * Returns a sorted (as numbers) array of footnote indexes that are used by items within an `items` array
   * @return {number[]}
   */
  get footnotesInUse () {
    let set = new Set()
    // Scan all selected suffixes to build a unique set of footnote indexes
    for (const item of this.items) {
      if (item.hasOwnProperty(Feature.types.footnote)) {
        // Footnote indexes are stored in an array
        for (let index of item[Feature.types.footnote]) {
          set.add(index)
        }
      }
    }
    return Array.from(set).sort((a, b) => parseInt(a) - parseInt(b))
  }
}
