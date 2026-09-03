/**
 * lightweight-charts/touch-drag-fix.js
 * ---------------------------------------------------------------------------
 * Naprawa problemu "strona nie przewija sie nad wykresem" dla TradingView
 * Lightweight Charts (v4 i v5) na urzadzeniach dotykowych.
 *
 * Zrodlo problemu (udokumentowane w issue trackerze biblioteki):
 *   - tradingview/lightweight-charts#80 - "Chart prevents vertical scroll on
 *     touch devices"
 *   - tradingview/lightweight-charts#652 - "How to prevent the chart from
 *     interfering with page scroll touchMove event?"
 *   - tradingview/lightweight-charts#434 - uboczy efekt: wylaczenie
 *     `horzTouchDrag`/`vertTouchDrag` wylacza tez ruch crosshaira w trybie
 *     tracking na dotyku - trade-off opisany w README tego katalogu.
 *
 * Biblioteka udostepnia natywna opcje `handleScroll.vertTouchDrag` -
 * ustawienie jej na `false` sprawia, ze wykres NIE przechwytuje pionowych
 * gestow dotykowych, wiec przegladarka moze swobodnie przewijac strone.
 * Analogicznie `horzTouchDrag` kontroluje przechwytywanie gestow poziomych
 * (pan po osi czasu).
 *
 * Ten modul laczy konfiguracje API biblioteki z CSS `touch-action`, zeby
 * decyzja o tym, kto obsluguje ktory gest, byla podjeta mozliwie najwczesniej
 * (przez przegladarke, zanim event trafi do JS) - co daje najbardziej plynne
 * wrazenie na wszystkich silnikach (Blink, WebKit, Gecko).
 */

/**
 * @typedef {Object} LightweightChartsTouchScrollOptions
 * @property {boolean} [allowVerticalPageScroll=true] Gdy true - strona moze
 *   przewijac sie w pionie nawet gdy gest zaczyna sie nad wykresem
 *   (`vertTouchDrag: false`). Ustaw na false tylko dla wykresow pelnoekranowych
 *   / dedykowanych widokow, gdzie nie ma nic do przewijania nad/pod wykresem.
 * @property {boolean} [allowHorizontalPan=true] Kontroluje `horzTouchDrag` -
 *   przesuwanie wykresu w osi czasu jednym palcem.
 * @property {boolean} [allowPinchZoom=true] Kontroluje `handleScale.pinch` -
 *   powiekszanie wykresu gestem dwoch palcow (nie wchodzi w konflikt ze
 *   scrollem strony, bo wymaga dwoch punktow dotyku).
 */

/**
 * Konfiguruje instancje Lightweight Charts oraz jej kontener DOM, aby
 * pionowe przewijanie strony dzialalo poprawnie na dotyku, przy zachowaniu
 * pelnej interaktywnosci wykresu (pan poziomy, pinch-zoom, kolko myszy na
 * desktopie - te zostaja niezmienione).
 *
 * @param {import('lightweight-charts').IChartApi} chart Instancja wykresu
 *   zwrocona z `LightweightCharts.createChart(...)`.
 * @param {HTMLElement} containerEl Element DOM przekazany do `createChart`.
 * @param {LightweightChartsTouchScrollOptions} [options]
 */
export function configureLightweightChartsTouchScroll(chart, containerEl, options = {}) {
  if (!chart || typeof chart.applyOptions !== 'function') {
    throw new Error('configureLightweightChartsTouchScroll: nieprawidlowa instancja wykresu.');
  }
  if (!containerEl) {
    throw new Error('configureLightweightChartsTouchScroll: brak elementu kontenera.');
  }

  const {
    allowVerticalPageScroll = true,
    allowHorizontalPan = true,
    allowPinchZoom = true
  } = options;

  chart.applyOptions({
    handleScroll: {
      horzTouchDrag: allowHorizontalPan,
      // Kluczowa linia naprawy: gdy strona ma sie przewijac w pionie,
      // wykres NIE MOZE przechwytywac pionowego gestu dotykowego.
      vertTouchDrag: !allowVerticalPageScroll
    },
    handleScale: {
      pinch: allowPinchZoom
    }
  });

  // touch-action jako deklaratywna warstwa CSS - zgodna z konfiguracja API:
  // 'pan-y' = przegladarka moze natywnie przewijac strone w pionie,
  // pozioma interakcja (pan/scale) jest oddana bibliotece.
  if (allowVerticalPageScroll) {
    containerEl.style.touchAction = allowHorizontalPan ? 'pan-y' : 'pan-y';
  } else {
    containerEl.style.touchAction = 'none';
  }

  return {
    /** Przywraca konfiguracje z innymi parametrami bez ponownego tworzenia wykresu. */
    update(newOptions) {
      configureLightweightChartsTouchScroll(chart, containerEl, { ...options, ...newOptions });
    }
  };
}
