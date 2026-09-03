/**
 * core/event-isolation.js
 * ---------------------------------------------------------------------------
 * Uniwersalny, niezalezny od biblioteki wzorzec izolacji zdarzen dotykowych.
 *
 * Problem: biblioteki wykresow (Kendo UI Chart, Lightweight Charts, Chart.js,
 * Highcharts, ECharts...) przechwytuja `touchmove`, aby realizowac pan/zoom.
 * Jezeli robia to bez analizy kierunku gestu, blokuja tez naturalne
 * przewijanie strony w pionie.
 *
 * Rozwiazanie: nasluchujemy zdarzen w FAZIE PRZECHWYTYWANIA (capture phase,
 * `{ capture: true }`) na elemencie-wrapperze wykresu, a wiec ZANIM dotra
 * one do wewnetrznych handlerow samej biblioteki (ktore sa zwykle
 * podczepione w fazie babelkowania, bubble, blizej elementu docelowego).
 * Dzieki temu mozemy:
 *   1. Zmierzyc kat pierwszego, klasyfikujacego przesuniecia (touchmove).
 *   2. Jesli gest jest zgodny z osia przewijania strony (domyslnie pionowa)
 *      - nic nie robimy, event swobodnie babelkuje dalej i przegladarka
 *      wykonuje natywny scroll.
 *   3. Jesli gest jest zgodny z osia obslugiwana przez wykres (domyslnie
 *      pozioma) - wywolujemy `stopPropagation()` (zeby zaden inny listener
 *      capture/bubble sie nie odpalil z tym samym eventem) oraz
 *      `preventDefault()` (zeby zablokowac elastyczne przewijanie strony /
 *      "bounce" na iOS Safari w trakcie interakcji z wykresem).
 *
 * Traktuj ten modul jako DODATKOWA siatke bezpieczenstwa nad deklaratywnym
 * CSS `touch-action` - przydaje sie, gdy:
 *   - biblioteka wywoluje `preventDefault()` we wlasnym handlerze zanim
 *     `touch-action` zdazy zadzialac (spotykane w starszych wersjach
 *     Kendo UI Chart renderowanych jako SVG),
 *   - trzeba wsparcia w starszym Android WebView, gdzie `touch-action`
 *     bywa tylko czesciowo respektowane.
 *
 * Kompatybilnosc: standardowe Touch Events API (Level 2) - wsparcie w
 * Chrome/Edge/Firefox/Safari (iOS i macOS) na urzadzeniach dotykowych.
 * Listener MUSI byc zarejestrowany z `passive: false`, inaczej
 * `preventDefault()` zostanie zignorowany przez przegladarke.
 */

/**
 * @typedef {Object} TouchScrollIsolatorOptions
 * @property {'vertical'|'horizontal'} [axis='vertical'] Os, ktora ma odzyskac
 *   strona (natywny scroll). Gesty zgodne z ta osia NIE sa przechwytywane.
 * @property {number} [angleThresholdDeg=25] Tolerancja kata (w stopniach) wokol
 *   osi strony, w obrebie ktorej gest wciaz jest klasyfikowany jako "scroll
 *   strony". Wieksza wartosc = latwiej "wygrac" scrollowi strony.
 * @property {number} [minDistancePx=6] Minimalny dystans przesuniecia (px),
 *   zanim gest zostanie sklasyfikowany - zapobiega "szarpaniu" przy drobnych
 *   , przypadkowych mikro-ruchach.
 * @property {(e: TouchEvent) => void} [onLockToLibrary] Callback wywolywany,
 *   gdy gest zostaje przekazany wykresowi (np. do wlaczenia wizualnego
 *   wskaznika interakcji).
 * @property {(e: TouchEvent) => void} [onReleaseToPage] Callback wywolywany,
 *   gdy gest zostaje oddany natywnemu scrollowi strony.
 */

/**
 * Tworzy izolator zdarzen dotykowych na wskazanym elemencie.
 * @param {HTMLElement} element Element-wrapper wykresu (kontener nadrzedny).
 * @param {TouchScrollIsolatorOptions} [options]
 * @returns {{ destroy: () => void }}
 */
export function createTouchScrollIsolator(element, options = {}) {
  if (!element || typeof element.addEventListener !== 'function') {
    throw new Error('createTouchScrollIsolator: "element" musi byc wezlem DOM.');
  }

  const {
    axis = 'vertical',
    angleThresholdDeg = 25,
    minDistancePx = 6,
    onLockToLibrary = () => {},
    onReleaseToPage = () => {}
  } = options;

  let startX = 0;
  let startY = 0;
  let decided = false;
  let lockedToLibrary = false;

  function reset() {
    decided = false;
    lockedToLibrary = false;
  }

  function onTouchStart(e) {
    if (e.touches.length !== 1) {
      reset();
      return;
    }
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    decided = false;
  }

  function onTouchMove(e) {
    if (e.touches.length !== 1) return; // gesty wielopunktowe (pinch) obsluguje biblioteka wykresu

    const dx = e.touches[0].clientX - startX;
    const dy = e.touches[0].clientY - startY;
    const distance = Math.hypot(dx, dy);

    if (!decided) {
      if (distance < minDistancePx) return; // za malo danych, by ocenic kierunek

      // Kat 0deg = ruch idealnie poziomy, 90deg = ruch idealnie pionowy
      const angleFromHorizontal = Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
      const isVerticalGesture = angleFromHorizontal > (90 - angleThresholdDeg);
      const pageAxisIsVertical = axis === 'vertical';
      const gestureMatchesPageAxis = pageAxisIsVertical ? isVerticalGesture : !isVerticalGesture;

      decided = true;
      lockedToLibrary = !gestureMatchesPageAxis;

      if (lockedToLibrary) {
        onLockToLibrary(e);
      } else {
        onReleaseToPage(e);
        return; // oddajemy zdarzenie naturalnemu scrollowi strony - nie ingerujemy
      }
    }

    if (lockedToLibrary) {
      e.stopPropagation();
      if (e.cancelable) e.preventDefault();
    }
  }

  function onTouchEnd() {
    reset();
  }

  // capture: true -> nasluch PRZED handlerami biblioteki wykresu
  // passive: false -> wymagane, aby preventDefault() mial efekt
  const listenerOpts = { capture: true, passive: false };

  element.addEventListener('touchstart', onTouchStart, listenerOpts);
  element.addEventListener('touchmove', onTouchMove, listenerOpts);
  element.addEventListener('touchend', onTouchEnd, listenerOpts);
  element.addEventListener('touchcancel', onTouchEnd, listenerOpts);

  return {
    destroy() {
      element.removeEventListener('touchstart', onTouchStart, listenerOpts);
      element.removeEventListener('touchmove', onTouchMove, listenerOpts);
      element.removeEventListener('touchend', onTouchEnd, listenerOpts);
      element.removeEventListener('touchcancel', onTouchEnd, listenerOpts);
    }
  };
}
