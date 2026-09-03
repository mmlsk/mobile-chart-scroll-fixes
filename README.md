# mobile-chart-scroll-fixes

Modularny zestaw poprawek dla klasycznego problemu **"strona nie przewija się, gdy palec jest nad wykresem"** na urządzeniach dotykowych — dotyczy zarówno **Kendo UI Chart**, jak i **TradingView Lightweight Charts**, a wzorzec izolacji zdarzeń nadaje się też do innych bibliotek wykresów (Chart.js, Highcharts, ECharts, D3 + canvas/svg).

## Problem

Biblioteki wykresów, które obsługują pan/zoom na dotyku, muszą przechwytywać zdarzenia `touchmove`, żeby przesuwać/skalować wykres. Jeśli robią to bez rozróżnienia osi gestu, **blokują też naturalne przewijanie strony w pionie** — użytkownik dotyka wykresu i nie może zjechać niżej. Jest to udokumentowany, powtarzający się problem:

- Kendo UI Chart / kendo-angular: brak możliwości przewinięcia strony nad wykresem z włączonym pan/zoom ([telerik/kendo-ui-core#5424](https://github.com/telerik/kendo-ui-core/issues/5424), [telerik/kendo-angular#409](https://github.com/telerik/kendo-angular/issues/409))
- TradingView Lightweight Charts: `horzTouchDrag`/`vertTouchDrag` przechwytują gest zanim zdąży wystartować scroll strony ([tradingview/lightweight-charts#80](https://github.com/tradingview/lightweight-charts/issues/80), [#652](https://github.com/tradingview/lightweight-charts/discussions/652))

## Struktura repozytorium

```
mobile-chart-scroll-fixes/
├── core/
│   └── event-isolation.js       # Wzorzec izolacji zdarzeń (capture phase + stopPropagation),
│                                 # niezależny od biblioteki wykresu — działa jako uniwersalna siatka bezpieczeństwa
├── kendo-ui/
│   └── touch-action-fix.js      # Moduł konfiguracji touch-action + MutationObserver dla Kendo UI Chart
├── lightweight-charts/
│   └── touch-drag-fix.js        # Moduł konfiguracji horzTouchDrag/vertTouchDrag + touch-action dla Lightweight Charts
└── examples/
    ├── kendo-example.html
    └── lightweight-charts-example.html
```

## Szybki start

### Kendo UI

```js
import { applyKendoTouchActionFix } from './kendo-ui/touch-action-fix.js';

const chart = $("#chart").kendoChart({ /* ... */ }).data("kendoChart");
applyKendoTouchActionFix(document.getElementById('chart'), { axis: 'y' });
```

### TradingView Lightweight Charts

```js
import { configureLightweightChartsTouchScroll } from './lightweight-charts/touch-drag-fix.js';

const chart = LightweightCharts.createChart(container, { /* ... */ });
configureLightweightChartsTouchScroll(chart, container, {
  allowVerticalPageScroll: true,
  allowHorizontalPan: true,
  allowPinchZoom: true
});
```

### Wzorzec izolacji zdarzeń (uniwersalny fallback)

```js
import { createTouchScrollIsolator } from './core/event-isolation.js';

const isolator = createTouchScrollIsolator(container, { axis: 'vertical' });
// ... gdy wykres jest odmontowywany:
isolator.destroy();
```

## Kompatybilność przeglądarek

| Mechanizm | Wsparcie |
| --- | --- |
| CSS `touch-action` | Wszystkie aktualne przeglądarki mobilne (Chrome/Edge Android, Safari iOS ≥ 13, Firefox Android). Podstawowa, deklaratywna warstwa ochrony. |
| Capture-phase `touchmove` + warunkowy `preventDefault`/`stopPropagation` | Fallback dla starszych WebView/Android System WebView oraz przypadków, gdy biblioteka wykresu wewnętrznie wywołuje `preventDefault()` niezależnie od `touch-action` (część wersji Kendo UI Chart w renderowaniu SVG). Wymaga listenera z `passive: false`. |
| `-ms-touch-action` (starszy IE/Edge Legacy) | Ustawiany równolegle przez moduł Kendo dla kompatybilności wstecznej. |

Rekomendowane podejście: **najpierw `touch-action` (deklaratywnie, wydajnie), a `event-isolation.js` jako dodatkowa siatka bezpieczeństwa** tam, gdzie sama właściwość CSS nie wystarcza (np. biblioteka nadpisuje styl inline albo wywołuje `preventDefault` w swoim własnym handlerze przed dotarciem zdarzenia do warstwy CSS).

## Licencja

MIT — patrz [LICENSE](./LICENSE).
