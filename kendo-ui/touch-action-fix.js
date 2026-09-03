/**
 * kendo-ui/touch-action-fix.js
 * ---------------------------------------------------------------------------
 * Naprawa problemu "strona nie przewija sie nad wykresem Kendo UI" na
 * urzadzeniach dotykowych.
 *
 * Zrodlo problemu (udokumentowane w issue trackerze Telerik/Kendo):
 *   - telerik/kendo-ui-core#5424 - "Page cannot be scrolled over Chart with
 *     Pan or Zoom when on a touch device"
 *   - telerik/kendo-angular#409 - "Cannot scroll when touch event starts in
 *     a <kendo-chart> component"
 *   - telerik/kendo-ui-core#5881, #5548 - analogiczne blokady scrolla w
 *     innych widgetach (Sortable, MobileListView), ten sam mechanizm.
 *
 * Kendo UI Chart (renderowanie SVG/Canvas) z wlaczonym `pannable`/`zoomable`
 * dolacza wlasne handlery `touchstart`/`touchmove` do elementu renderujacego
 * i w wielu wersjach ustawia (lub pozwala przegladarce domyslnie przyjac)
 * zachowanie blokujace scroll strony. Kendo NIE udostepnia oficjalnej opcji
 * "zablokuj tylko os X, oddaj os Y" - dlatego naprawa opiera sie na:
 *
 *   1. Wymuszeniu CSS `touch-action` na kontenerze wykresu (deklaratywna,
 *      wydajna warstwa - przegladarka sama decyduje, ktore gesty puszcza do
 *      scrolla strony, bez JS w hot-path).
 *   2. `MutationObserver` na atrybucie `style`/`class`, bo Kendo w niektorych
 *      wersjach nadpisuje inline style elementu renderujacego przy kazdym
 *      `refresh()`/`resize()` widgetu, co potrafi usunac nasza regule
 *      `touch-action`.
 *
 * Dla starszych wersji Kendo, ktore wewnetrznie wolaja `preventDefault()`
 * niezaleznie od `touch-action` (bo wsparcie dla tej wlasciwosci CSS bywa
 * "obchodzone" recznym JS), polacz ten modul z uniwersalnym izolatorem
 * zdarzen z `core/event-isolation.js` - patrz przyklad w README tego
 * katalogu.
 */

/**
 * @typedef {Object} KendoTouchActionFixOptions
 * @property {'y'|'x'|'none'} [axis='y'] Os, ktora ma zachowac przegladarka do
 *   natywnego scrollowania strony. 'y' = wykres obsluguje pan/zoom w osi X,
 *   strona przewija sie w osi Y (najczestszy przypadek dla wykresow
 *   liniowych/swiecowych osadzonych w artykule czy dashboardzie).
 * @property {boolean} [watchMutations=true] Czy re-aplikowac touch-action po
 *   kazdej zmianie stylu/atrybutow wykrytej przez MutationObserver (potrzebne
 *   przy dynamicznym `chart.refresh()`).
 * @property {string[]} [additionalSelectors] Dodatkowe selektory CSS
 *   (potomkowie kontenera) na ktore rowniez ma byc nalozony touch-action -
 *   przydatne, gdy Kendo renderuje wewnetrzny <svg>/<canvas>, ktory sam
 *   dziedziczy touch-action z rodzica, ale bywa nadpisywany indywidualnie.
 */

const TOUCH_ACTION_MAP = {
  y: 'pan-y',
  x: 'pan-x',
  none: 'none'
};

/**
 * Naklada i utrzymuje poprawna wartosc touch-action na kontenerze wykresu
 * Kendo UI, aby przegladarka mogla przewijac strone w osi nieuzywanej przez
 * pan/zoom wykresu.
 *
 * @param {HTMLElement} chartElement Element, na ktorym zainicjalizowano
 *   `.kendoChart()` (kontener przekazany do konstruktora widgetu).
 * @param {KendoTouchActionFixOptions} [options]
 * @returns {{ destroy: () => void }}
 */
export function applyKendoTouchActionFix(chartElement, options = {}) {
  if (!chartElement) {
    throw new Error('applyKendoTouchActionFix: brak elementu kontenera wykresu.');
  }

  const {
    axis = 'y',
    watchMutations = true,
    additionalSelectors = ['svg', 'canvas', '.k-chart-surface']
  } = options;

  const touchActionValue = TOUCH_ACTION_MAP[axis] ?? TOUCH_ACTION_MAP.y;

  function applyTouchAction(target) {
    target.style.touchAction = touchActionValue;
    // Wsparcie dla starszego IE11 / Edge Legacy, na wypadek srodowisk
    // korporacyjnych wciaz go wymagajacych.
    target.style.msTouchAction = touchActionValue;
  }

  function applyToAll() {
    applyTouchAction(chartElement);
    additionalSelectors.forEach((selector) => {
      chartElement.querySelectorAll(selector).forEach(applyTouchAction);
    });
  }

  applyToAll();

  let observer = null;
  if (watchMutations && typeof MutationObserver !== 'undefined') {
    observer = new MutationObserver((mutations) => {
      // Reagujemy tylko, gdy zmienil sie atrybut style/class - unikamy
      // niepotrzebnej pracy przy kazdej drobnej mutacji DOM wykresu.
      const relevant = mutations.some(
        (m) => m.type === 'attributes' && (m.attributeName === 'style' || m.attributeName === 'class')
      );
      if (relevant) applyToAll();
    });

    observer.observe(chartElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      subtree: true
    });
  }

  return {
    destroy() {
      if (observer) observer.disconnect();
    }
  };
}
