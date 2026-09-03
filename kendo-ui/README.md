# kendo-ui/touch-action-fix.js

Modul naprawiajacy blokade przewijania strony nad wykresem **Kendo UI Chart** (jQuery/Angular/React wrapper - dziala na poziomie DOM, wiec jest niezalezny od frameworka) na urzadzeniach dotykowych.

## Problem zrodlowy

Kendo UI Chart z wlaczonym `pannable`/`zoomable` przechwytuje gesty dotykowe na calej powierzchni renderujacej. W wielu wersjach (SVG rendering) nie respektuje to osi - efekt: uzytkownik nie moze przewinac strony, gdy zaczyna dotyk nad wykresem. Potwierdzone w:

- [telerik/kendo-ui-core#5424](https://github.com/telerik/kendo-ui-core/issues/5424)
- [telerik/kendo-angular#409](https://github.com/telerik/kendo-angular/issues/409)

## Uzycie

```js
import { applyKendoTouchActionFix } from './touch-action-fix.js';

$("#chart").kendoChart({
  pannable: true,
  zoomable: { mousewheel: true, selection: false }
});

const fix = applyKendoTouchActionFix(document.getElementById('chart'), {
  axis: 'y', // strona przewija sie w Y, wykres obsluguje pan/zoom w X
  watchMutations: true
});

// przy odmontowaniu komponentu / destroy widgetu:
fix.destroy();
```

## Gdy to nie wystarcza

Jezeli po zastosowaniu `touch-action` strona wciaz nie przewija sie (spotykane w starszych buildach Kendo, ktore wolaja `preventDefault()` bezwarunkowo w swoim handlerze `touchmove` - CSS `touch-action` nie ma wtedy zadnego wplywu, bo blokada dzieje sie na poziomie JS, nie przegladarki), dolóż uniwersalny izolator zdarzen:

```js
import { createTouchScrollIsolator } from '../core/event-isolation.js';

createTouchScrollIsolator(document.getElementById('chart'), { axis: 'vertical' });
```

Kolejnosc wazna: `applyKendoTouchActionFix` powinien byc wywolany **przed** `createTouchScrollIsolator`, aby CSS obslugil wiekszosc przypadkow, a JS-owy izolator przechwycil tylko te gesty, ktore prześlizgnełyby sie przez wewnetrzny `preventDefault()` biblioteki.
