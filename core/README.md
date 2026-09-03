# core/event-isolation.js

Biblioteko-agnostyczny wzorzec izolacji zdarzen dotykowych oparty na **fazie przechwytywania (capture phase)** i warunkowym `stopPropagation()` / `preventDefault()`.

## Kiedy uzywac

Uzyj tego modulu jako **dodatkowej warstwy bezpieczenstwa** obok konfiguracji natywnej dla biblioteki (`kendo-ui/touch-action-fix.js` lub `lightweight-charts/touch-drag-fix.js`), gdy:

- biblioteka wewnetrznie wywoluje `preventDefault()` niezaleznie od CSS `touch-action`,
- musisz wsparcia starszych WebView (czesc Androidow < 10, wbudowane przegladarki w aplikacjach),
- integrujesz biblioteke wykresu, ktora nie ma zadnej wbudowanej opcji `touch-action`/`horzTouchDrag` (np. Chart.js, ECharts, D3 + canvas).

## Jak to dziala

1. Listener rejestrowany jest z `{ capture: true, passive: false }` na elemencie-wrapperze - otrzymuje zdarzenie **zanim** dotrze ono do wewnetrznych handlerow biblioteki (ktore zwykle nasluchuja w fazie babelkowania na elementach potomnych: `<svg>`, `<canvas>`).
2. Pierwsze kilka pikseli ruchu (`minDistancePx`) sluzy do zmierzenia kata gestu wzgledem osi poziomej.
3. Gest zgodny z osia strony (`axis`, domyslnie `'vertical'`) jest **puszczany bez ingerencji** - uzytkownik przewija strone natywnie, z pelna plynnoscia i kinetycznym scrollem systemowym.
4. Gest zgodny z osia obslugiwana przez wykres jest izolowany: `stopPropagation()` zatrzymuje dalsza propagacje do innych listenerow tego samego zdarzenia, a `preventDefault()` blokuje domyslne zachowania przegladarki (np. "elastic bounce" na iOS).

## API

```ts
createTouchScrollIsolator(element: HTMLElement, options?: {
  axis?: 'vertical' | 'horizontal';       // domyslnie 'vertical'
  angleThresholdDeg?: number;             // domyslnie 25
  minDistancePx?: number;                 // domyslnie 6
  onLockToLibrary?: (e: TouchEvent) => void;
  onReleaseToPage?: (e: TouchEvent) => void;
}): { destroy: () => void }
```

## Uwaga o wydajnosci

Handler `touchmove` w fazie przechwytywania z `passive: false` jest z natury nieco kosztowniejszy niz listener `passive: true`, bo przegladarka musi czekac na ewentualny `preventDefault()` przed rozpoczeciem scrolla. W praktyce dla jednego wrappera na wykres roznica jest niezauwazalna; unikaj jednak dodawania tego izolatora do wielu zagniezdzonych elementow na tej samej stronie.
