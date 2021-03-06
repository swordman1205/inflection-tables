/**
 * This module is responsible for displaying different views of an inflection table. Each view is located in a separate
 * directory under /presenter/views/view-name
 */
import { L10n } from '../../dist/inflection-tables.standalone.js'
import { Feature } from '../../node_modules/alpheios-data-models/dist/alpheios-data-models.js'

export default class Presenter {
  constructor (wideViewContainer, narrowViewContainer, footerContainer, viewSelectorContainer, localeSelectorContainer, inflectionData, locale = 'en-US') {
    this.wideViewContainer = wideViewContainer
    this.narrowViewContainer = narrowViewContainer
    this.footerContainer = footerContainer
    this.viewSelectorContainer = viewSelectorContainer
    this.localeSelectorContainer = localeSelectorContainer
    this.inflectionData = inflectionData

    // All views registered by the Presenter
    this.views = []
    this.viewIndex = {}

    /* for (let view of viewsLatin) {
      this.addView(view)
    }
    for (let view of viewsGreek) {
      this.addView(view)
    } */

    // Views available for parts of speech that are present in a Result Set
    this.availableViews = this.getViews(this.inflectionData)

    this.defaultView = this.availableViews[0]
    this.activeView = undefined

    this.locale = locale // This is a default locale
    this.l10n = new L10n.L10n(L10n.messages)

    return this
  }

  addView (view) {
    // let view =  new View.View(viewOptions);
    this.views.push(view)
    this.viewIndex[view.id] = view
  }

  setLocale (locale) {
    this.locale = locale
    // this.activeView.render(this.viewContainer, this.inflectionData, this.l10n.messages(this.locale))
    this.renderInflections(this.activeView).displayInflections(this.activeView)
  }

  render () {
    // Show a default view
    if (this.defaultView) {
      // this.defaultView.render(this.viewContainer, this.inflectionData, this.l10n.messages(this.locale))
      this.renderInflections(this.defaultView).displayInflections(this.defaultView)
      this.activeView = this.defaultView

      this.appendViewSelector(this.viewSelectorContainer)
      // this.appendLocaleSelector(this.localeSelectorContainer);
    }
    return this
  }

  clearInflections () {
    this.wideViewContainer.innerHTML = ''
    this.narrowViewContainer.innerHTML = ''
    this.footerContainer.innerHTML = ''
    return this
  }

  setDefaults () {
    //    this.buttons.hideEmptyCols.contentHidden = false
    //    this.buttons.hideEmptyCols.text = this.buttons.hideEmptyCols.shownText
    //    this.buttons.hideNoSuffixGroups.contentHidden = false
    //    this.buttons.hideNoSuffixGroups.text = this.buttons.hideNoSuffixGroups.shownText
    return this
  }

  renderInflections (view) {
    this.clearInflections().setDefaults()
    // view.render(this.inflectionData, this.l10n.messages(this.locale))
    this.renderInflections(view).displayInflections(view)
    return this
  }

  displayInflections (view) {
    this.wideViewContainer.appendChild(view.wideViewNodes)
    this.narrowViewContainer.appendChild(view.narrowViewNodes)
    this.footerContainer.appendChild(view.footnotesNodes)
    return this
  }

  hideEmptyColsClick () {
    /* this.buttons.hideEmptyCols.contentHidden = !this.buttons.hideEmptyCols.contentHidden
    if (this.buttons.hideEmptyCols.contentHidden) {
      this.buttons.hideEmptyCols.text = this.buttons.hideEmptyCols.hiddenText
      this.selectedView.hideEmptyColumns()
    } else {
      this.buttons.hideEmptyCols.text = this.buttons.hideEmptyCols.shownText
      this.selectedView.showEmptyColumns()
    }
    this.displayInflections() */
  }

  hideNoSuffixGroupsClick () {
    /* this.buttons.hideNoSuffixGroups.contentHidden = !this.buttons.hideNoSuffixGroups.contentHidden
    if (this.buttons.hideNoSuffixGroups.contentHidden) {
      this.buttons.hideNoSuffixGroups.text = this.buttons.hideNoSuffixGroups.hiddenText
      this.selectedView.hideNoSuffixGroups()
    } else {
      this.buttons.hideNoSuffixGroups.text = this.buttons.hideNoSuffixGroups.shownText
      this.selectedView.showNoSuffixGroups()
    }
    this.displayInflections() */
  }

  appendViewSelector (targetContainer) {
    targetContainer.innerHTML = ''
    if (this.availableViews.length > 1) {
      let id = 'view-selector-list'
      let viewLabel = document.createElement('label')
      viewLabel.setAttribute('for', id)
      viewLabel.innerHTML = 'View:&nbsp;'
      let viewList = document.createElement('select')
      viewList.classList.add('alpheios-ui-form-control')
      for (const view of this.availableViews) {
        let option = document.createElement('option')
        option.value = view.id
        option.text = view.name
        viewList.appendChild(option)
      }
      viewList.addEventListener('change', this.viewSelectorEventListener.bind(this))
      targetContainer.appendChild(viewLabel)
      targetContainer.appendChild(viewList)
    }
    return this
  }

  viewSelectorEventListener (event) {
    let viewID = event.target.value
    let view = this.viewIndex[viewID]
    // view.render(this.viewContainer, this.inflectionData, this.l10n.messages(this.locale))
    this.renderInflections(view).displayInflections(view)
    this.activeView = view
  }

  appendLocaleSelector (targetContainer) {
    let id = 'locale-selector-list'
    targetContainer.innerHTML = '' // Erase whatever was there
    let localeLabel = document.createElement('label')
    localeLabel.setAttribute('for', id)
    localeLabel.innerHTML = 'Locale:&nbsp;'
    let localeList = document.createElement('select')
    localeList.classList.add('alpheios-ui-form-control')
    localeList.id = id
    for (let locale of this.l10n.locales) {
      let option = document.createElement('option')
      option.value = locale
      option.text = locale
      localeList.appendChild(option)
    }
    localeList.addEventListener('change', this.localeSelectorEventListener.bind(this))
    targetContainer.appendChild(localeLabel)
    targetContainer.appendChild(localeList)
    return this
  }

  localeSelectorEventListener () {
    let locale = window.event.target.value
    this.setLocale(locale)
  }

  getViews (wordData) {
    // First view in a returned array will be a default one
    let views = []
    for (let view of this.views) {
      if (wordData.language === view.language && wordData[Feature.types.part].includes(view.partOfSpeech)) {
        views.push(view)
      }
    }
    return views
  }
}
