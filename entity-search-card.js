/**
 * Entity Search Card v0.1.0
 * Based on postlund/search-card (MIT), Copyright (c) 2019 Pierre Ståhl.
 * Dashboard design changes Copyright (c) 2026 soundclub83.
 * See LICENSE. Standalone distribution; the original card is not modified.
 */
customElements.whenDefined("card-tools").then(() => {
  var ct = customElements.get("card-tools");

  const BUILTIN_ACTIONS = [
    {
      matches: "^((magnet:.*)|(.*.torrent.*))$",
      name: "Add to Transmission",
      icon: "mdi:progress-download",
      service: "transmission.add_torrent",
      service_data: {
        torrent: "{1}",
      },
    },
  ];

  const matchAndReplace = (text, matches) => {
    for (var i = 0; i < matches.length; i++) {
      text = text.replace("{" + i + "}", matches[i]);
    }
    return text;
  };

  class SearchCard extends ct.LitElement {
    static get properties() {
      return {
        config: { type: Object },
        hass: { type: Object },
        _results: { type: Array },
        _activeActions: { type: Array },
        _searchValue: { type: String },
        _lastHass: { type: Object },
      };
    }

    constructor() {
      super();
      this._results = [];
      this._activeActions = [];
      this._searchValue = "";
      this._lastHass = null;
      this._debouncedSearch = this._debounce((searchText) => {
        this._performSearch(searchText);
      }, 100);
    }

    shouldUpdate(changedProps) {
      return (
        changedProps.has("config") ||
        changedProps.has("_results") ||
        changedProps.has("_activeActions") ||
        changedProps.has("_searchValue")
      );
    }

    setConfig(config) {
      this.config = config;
      this.max_results = this.config.max_results || 10;
      this.search_text = this.config.search_text || "Entitäten suchen …";
      this.actions = BUILTIN_ACTIONS.concat(this.config.actions || []);
      this.included_domains = this.config.included_domains;
      this.excluded_domains = this.config.excluded_domains || [];
    }

    getCardSize() {
      return 4;
    }

    render() {
      const results = this._results.slice(0, this.max_results).sort();
      const rows = results.map((entity_id) => this._createResultRow(entity_id));
      const actions = this._activeActions.map((x) =>
        this._createActionRow(x[0], x[1])
      );

      return ct.LitHtml`
      <ha-card class="${this.config.design !== "classic" ? "network-search" : ""}">
        <div id="searchContainer">
          <div id="searchTextFieldContainer">
            ${this.config.design !== "classic"
              ? ct.LitHtml`
                <span class="search-symbol"><ha-icon icon="mdi:magnify"></ha-icon></span>
                <input class="network-input" type="text"
                  .value="${this._searchValue}" @input="${this._valueChanged}"
                  placeholder="${this.config.search_text || 'Entitäten suchen …'}"
                  aria-label="Entitäten suchen" autocomplete="off" spellcheck="false" />
                <button class="clear-search" @click="${this._clearInput}"
                  aria-label="Suche leeren" title="Suche leeren"
                  ?hidden="${!this._searchValue}"><ha-icon icon="mdi:close"></ha-icon></button>
              `
              : ct.LitHtml`            <ha-input
              id="searchText"
              .value="${this._searchValue}"
              @input="${this._valueChanged}"
              no-label-float
              type="text"
              autocomplete="off"
              icon
              iconTrailing
              label="${this.config.design !== "classic" && !this.config.search_text ? "Entitäten suchen …" : this.search_text}"
            >
              <ha-icon icon="mdi:magnify" id="searchIcon" slot="leadingIcon"></ha-icon>
              <ha-icon-button
                slot="trailingIcon"
                @click="${this._clearInput}"
                alt="Clear"
                title="Clear"
              >
                <ha-icon icon="mdi:close"></ha-icon>
              </ha-icon-button>
            </ha-input>`}

          </div>

          ${
            results.length > 0
              ? ct.LitHtml`<div id="count">Showing ${results.length} of ${this._results.length} results</div>`
              : ""
          }
        </div>
        ${
          rows.length > 0 || actions.length > 0
            ? ct.LitHtml`<div id="results">${actions}${rows}</div>`
            : ""
        }
      </ha-card>
    `;
    }

    _createResultRow(entity_id) {
      var row = ct.createEntityRow({ entity: entity_id });
      row.addEventListener("click", () => ct.moreInfo(entity_id));
      row.hass = this.hass;
      return row;
    }

    _createActionRow(action, matches) {
      const service_data = { ...(action.service_data || {}) };
      for (var key in service_data) {
        if (typeof service_data[key] === "string") {
          service_data[key] = matchAndReplace(service_data[key], matches);
        }
      }

      const elem = ct.createThing("service-row", {
        type: "call",
        name: matchAndReplace(action.name, matches),
        icon: action.icon || "mdi:lamp",
        service: action.service,
        service_data: service_data,
      });
      elem.hass = this.hass;
      return elem;
    }

    _valueChanged(ev) {
      this._searchValue = ev.target.value;
      this._debouncedSearch(this._searchValue);
    }

    _clearInput() {
      this._debouncedSearch("");
      this._searchValue = "";
      this._results = [];
      this._activeActions = [];
    }

    _debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    _performSearch(searchText) {
      if (!this.config || !this.hass || searchText === "") {
        this._results = [];
        this._activeActions = [];
        return;
      }

      try {
        const searchRegex = new RegExp(searchText, "i");
        const newResults = [];

        for (const entity_id in this.hass.states) {
          if (
            (entity_id.search(searchRegex) >= 0 ||
              this.hass.states[entity_id].attributes.friendly_name?.search(
                searchRegex
              ) >= 0) &&
            (this.included_domains
              ? this.included_domains.includes(entity_id.split(".")[0])
              : !this.excluded_domains.includes(entity_id.split(".")[0]))
          ) {
            newResults.push(entity_id);
          }
        }

        this._results = newResults;
        this._activeActions = this._getActivatedActions(searchText);
      } catch (err) {
        console.warn(err);
        this._results = [];
        this._activeActions = [];
      }
    }

    _getActivatedActions(searchText) {
      var active = [];

      for (const action of this.actions) {
        if (this._serviceExists(action.service)) {
          var matches = searchText.match(action.matches);
          if (matches != null) {
            active.push([action, matches]);
          }
        }
      }
      return active;
    }

    _serviceExists(serviceCall) {
      var [domain, service] = serviceCall.split(".");
      var servicesForDomain = this.hass.services[domain];
      return servicesForDomain && service in servicesForDomain;
    }

    static get styles() {
      return ct.LitCSS`
      
      .network-search .search-symbol {
        display: flex;
        flex: 0 0 40px;
        height: 40px;
        align-items: center;
        justify-content: center;
        border-radius: 12px;
        color: #78dcff;
        background: rgba(120, 220, 255, 0.12);
        margin-right: 12px;
      }
      .network-search .network-input {
        appearance: none;
        box-sizing: border-box;
        width: 100%;
        min-width: 0;
        height: 48px;
        padding: 0;
        border: 0;
        outline: none;
        box-shadow: none;
        background: transparent;
        color: #e0faff;
        caret-color: #00bfa5;
        font: 500 14px var(--paper-font-body1_-_font-family, Roboto, sans-serif);
      }
      .network-search .network-input::placeholder { color: #a9bdc6; opacity: 1; }
      .network-search .clear-search {
        display: flex;
        flex: 0 0 36px;
        width: 36px;
        height: 36px;
        align-items: center;
        justify-content: center;
        padding: 0;
        border: 0;
        border-radius: 50%;
        background: rgba(120, 220, 255, 0.08);
        color: #a9bdc6;
        cursor: pointer;
      }
      .network-search .clear-search[hidden] { display: none; }
      .network-search .clear-search:focus-visible { outline: 2px solid #00bfa5; }

      /* Compact dashboard design, independent of the dashboard URL. */
      ha-card.network-search {
        position: relative;
        border-radius: 20px;
        border: 1px solid rgba(120, 220, 255, 0.12);
        background: linear-gradient(120deg, rgba(44, 73, 80, 0.72), rgba(30, 43, 51, 0.96));
        box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
        overflow: hidden;
        transition: border-color 180ms ease, box-shadow 180ms ease;
        --mdc-theme-primary: #00bfa5;
        --mdc-text-field-fill-color: transparent;
        --mdc-text-field-idle-line-color: transparent;
        --mdc-text-field-hover-line-color: transparent;
        --mdc-text-field-label-ink-color: #a9bdc6;
        --mdc-text-field-ink-color: #e0faff;
        --mdc-text-field-outlined-idle-border-color: transparent;
        --mdc-text-field-outlined-hover-border-color: transparent;
        --mdc-shape-small: 16px;
        --input-fill-color: transparent;
        --input-ink-color: #e0faff;
        --input-label-ink-color: #a9bdc6;
        --input-idle-line-color: transparent;
        --input-hover-line-color: transparent;
        --input-disabled-line-color: transparent;
        --input-dropdown-icon-color: #78dcff;
      }
      ha-card.network-search:focus-within {
        border-color: rgba(0, 191, 165, 0.65);
        box-shadow: 0 0 0 3px rgba(0, 191, 165, 0.10), 0 4px 14px rgba(0, 0, 0, 0.18);
      }
      .network-search #searchContainer {
        width: auto;
        margin: 0;
        padding: 4px 12px;
      }
      .network-search #searchTextFieldContainer {
        min-height: 48px;
        padding: 0;
        align-items: center;
      }
      .network-search #searchText {
        width: 100%;
        min-width: 0;
        --mdc-text-field-textarea-container-shape: 16px;
      }
      .network-search #searchIcon {
        color: #78dcff;
      }
      .network-search ha-icon-button {
        color: #94b3bd;
      }
      .network-search #count {
        padding: 0 8px 8px;
        font-size: 11px;
        font-style: normal;
        color: #94b3bd;
      }
      .network-search #results {
        box-sizing: border-box;
        width: auto;
        max-height: 420px;
        overflow-y: auto;
        margin: 0 12px 12px;
        padding: 8px;
        border-top: 1px solid rgba(120, 220, 255, 0.12);
        scrollbar-width: thin;
        scrollbar-color: #42616b transparent;
      }
      .network-search #results > * {
        display: block;
        padding: 8px 4px;
        border-radius: 12px;
        transition: background 150ms ease;
      }
      .network-search #results > *:hover {
        background: rgba(120, 220, 255, 0.08);
      }

      /* Same 40px outer height as the neighbouring Bubble buttons. */
      ha-card.network-search { border-radius: 16px; }
      .network-search #searchContainer { padding: 0 8px; }
      .network-search #searchTextFieldContainer { min-height: 38px; height: 38px; }
      .network-search .network-input { height: 38px; }
      .network-search .search-symbol {
        flex-basis: 32px;
        height: 32px;
        border-radius: 10px;
      }
      .network-search .clear-search { height: 30px; flex-basis: 30px; width: 30px; }

      @media (prefers-reduced-motion: reduce) {
        ha-card.network-search, .network-search #results > * {
          transition: none;
        }
      }

      #searchContainer {
        width: 90%;
        display: block;
        margin-left: auto;
        margin-right: auto;
      }
      #searchTextFieldContainer {
        display: flex;
        padding-top: 5px;
        padding-bottom: 5px;
      }
      #searchText {
        flex-grow: 1;
      }
      #count {
        text-align: right;
        font-style: italic;
      }
      #results {
        width: 90%;
        display: block;
        padding-bottom: 15px;
        margin-top: 15px;
        margin-left: auto;
        margin-right: auto;
      }
    `;
    }
  }

  if (!customElements.get("entity-search-card")) {
    customElements.define("entity-search-card", SearchCard);
  }
});

setTimeout(() => {
  if (customElements.get("card-tools") || customElements.get("entity-search-card")) return;
  customElements.define(
    "entity-search-card",
    class extends HTMLElement {
      setConfig() {
        throw new Error(
          "Can't find card-tools. See https://github.com/thomasloven/lovelace-card-tools"
        );
      }
    }
  );
}, 2000);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "entity-search-card",
  name: "Entity Search Card",
  preview: true,
  description: "Card to search entities",
});
