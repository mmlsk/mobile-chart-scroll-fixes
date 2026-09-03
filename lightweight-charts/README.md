# lightweight-charts/touch-drag-fix.js

Modul naprawiajacy blokade przewijania strony nad wykresem **TradingView Lightweight Charts** (v4/v5) na urzadzeniach dotykowych, przy zachowaniu pelnej interaktywnosci wykresu.

## Problem zrodlowy

Domyslnie `handleScroll.vertTouchDrag` bywa ustawione na `true` (albo pozostawione bez swiadomej konfiguracji), co powoduje, ze wykres przechwytuje **kazdy** gest dotykowy, w tym pionowy - uzytkownik na telefonie nie moze przewinac strony, jesli zacznie dotyk nad wykresem. Zglosone i opisane w:

- [tradingview/lightweight-charts#80](https://github.com/tradingview/lightweight-charts/issues/80)
- [tradingview/lightweight-charts#652](https://github.com/tradingview/lightweight-charts/discussions/652)

## Uzycie

```js
import { configureLightweightChartsTouchScroll } from './touch-drag-fix.js';

const chart = LightweightCharts.createChart(container, { autoSize: true });
// ... dodanie serii, danych itd. ...

configureLightweightChartsTouchScroll(chart, container, {
  allowVerticalPageScroll: true,  // strona przewija sie w pionie
  allowHorizontalPan: true,       // wykres nadal obsluguje pan w osi czasu
  allowPinchZoom: true            // pinch-zoom bez zmian
});
```

## Swiadomy kompromis (do decyzji uzytkownika biblioteki)

Wylaczenie `vertTouchDrag` ma jeden udokumentowany efekt uboczny: w trybie `CrosshairMode.Normal` na dotyku, pionowe "sledzenie" ceny crosshairem jednym gestem moze byc mniej precyzyjne, bo biblioteka nie nasluchuje juz pionowego przeciagania jako gestu wykresu ([tradingview/lightweight-charts#434](https://github.com/tradingview/lightweight-charts/issues/434)). W praktyce dla wykresow swiecowych/liniowych osadzonych w tresci strony (a nie w dedykowanym, pelnoekranowym widoku tradingowym) priorytetem jest zwykle mozliwosc przewiniecia strony - dlatego to jest wartosc domyslna tego modulu. Jesli budujesz dedykowany, pelnoekranowy terminal tradingowy bez potrzeby przewijania strony nad wykresem, ustaw `allowVerticalPageScroll: false`.
