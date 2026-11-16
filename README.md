# Entity Search Card

Eine Suchkarte für Home Assistant mit kompaktem Eingabefeld und eigenem Dashboard-Design. Sie durchsucht Entitäts-IDs und Anzeigenamen, unterstützt reguläre Ausdrücke und öffnet per Klick die Entitätsdetails.

Eigenständige Weiterentwicklung von [postlund/search-card](https://github.com/postlund/search-card). Die Originalkarte wird nicht verändert. Das Design funktioniert unabhängig vom Namen und Pfad des Dashboards.

## Voraussetzungen

- Home Assistant mit einem Lovelace-Dashboard.
- [Card Tools](https://github.com/thomasloven/lovelace-card-tools), installiert und als Dashboard-Ressource eingebunden.

Die Originalkarte `search-card` ist nicht erforderlich. Card Tools wird weiterhin benötigt.

## Installation

### Über den Marketplace

Dieses Repository als benutzerdefiniertes Dashboard-/Frontend-Repository hinzufügen:

```text
https://github.com/soundclub83/entity-search-card
```

Es liegt die kompatible Repository-Metadatei `hacs.json` bei. Das Repository ist noch nicht Teil des offiziellen Katalogs; die Installation über den Marketplace wurde noch nicht praktisch getestet. Die Karten-Datei liegt direkt im Repository und benötigt keinen Build-Schritt.

### Manuell

1. `entity-search-card.js` aus diesem Repository herunterladen.
2. Nach `/config/www/entity-search-card/entity-search-card.js` kopieren.
3. Unter **Einstellungen → Dashboards → Ressourcen** als **JavaScript-Modul** einbinden:

   ```text
   /local/entity-search-card/entity-search-card.js?v=0.1.0
   ```

4. Die Dashboard-Seite im Browser neu öffnen beziehungsweise aktualisieren. Ein HA-Neustart ist nicht erforderlich.

Keine GitHub-HTML-Seite als JavaScript-Ressource eintragen. Bei späteren manuellen Updates die lokale Datei ersetzen und die Versionsangabe der Ressourcen-URL ändern.

## Verwendung

Die Karte über eine manuelle Karte hinzufügen:

```yaml
type: custom:entity-search-card
search_text: Entitäten suchen …
max_results: 20
```

| Option | Vorgabe | Beschreibung |
| --- | --- | --- |
| `type` | erforderlich | `custom:entity-search-card` |
| `search_text` | `Entitäten suchen …` | Platzhalter des Suchfelds |
| `max_results` | `10` | Maximale Anzahl angezeigter Entitäten |
| `design` | kompakt | Mit `classic` die ursprüngliche Darstellung verwenden |
| `included_domains` | alle | Nur diese Entitätsdomänen durchsuchen |
| `excluded_domains` | keine | Diese Domänen ausschließen; gilt, wenn `included_domains` nicht gesetzt ist |
| `actions` | `[]` | Zusätzliche Suchaktionen nach dem Format der Originalkarte |

Beispiel für Licht und Schalter:

```yaml
type: custom:entity-search-card
max_results: 20
included_domains:
  - light
  - switch
```

Der Suchtext wird als regulärer Ausdruck interpretiert. `küche|wohnzimmer` sucht beispielsweise nach beiden Begriffen. Eine ungültige Suchsyntax liefert keine Ergebnisse. Es werden ausschließlich die Entitäten durchsucht, die dem angemeldeten HA-Benutzer im Frontend vorliegen.

Die eingebauten Ergebniszeilen können je nach Entitätsdomäne Steuerelemente enthalten. Ein Klick auf die Zeile öffnet die Entitätsdetails.

### Zusätzliche Suchaktionen

Wie im Original kann ein Suchmuster eine Aktion als Ergebnis anbieten. Die Ausführung erfolgt erst beim Anklicken der angebotenen Aktionszeile. `{0}` steht für den vollständigen Treffer, `{1}` usw. für reguläre Ausdrucksgruppen.

```yaml
type: custom:entity-search-card
actions:
  - matches: '^licht$'
    name: Licht einschalten
    icon: mdi:lightbulb
    service: light.turn_on
    service_data:
      entity_id: light.wohnzimmer
```

Das Beispiel muss an die eigenen Entitäten angepasst werden. Aus dem Original übernommen ist außerdem die Suchaktion für Torrent-/Magnet-Links; sie wird nur angeboten, wenn `transmission.add_torrent` verfügbar ist.

## Migration von unserer lokalen Variante

- Bisheriger Typ: `custom:matze-design-search-card`
- Neuer Typ: `custom:entity-search-card`
- Neue Datei als Ressource einbinden und den Kartentyp im Dashboard ersetzen.
- Bestehende Optionen und zusätzliche `card_mod`-Gestaltung können erhalten bleiben. Intern verwendete CSS-Klassen wurden beibehalten.
- Alte Ressourcen erst entfernen, wenn keine Karte mehr darauf verweist.

Die Veröffentlichung dieses Repositorys stellt eine vorhandene HA-Installation nicht automatisch um.

## Entwicklung

Die JavaScript-Datei ist gleichzeitig Quelltext und auslieferbare Karte. Keine Paketabhängigkeiten, kein Build-Schritt.

Mit Node.js 22 oder neuer:

```sh
npm run check
npm test
```

Die Tests prüfen Suchfilter, ungültige reguläre Ausdrücke, das Leeren während einer verzögerten Suche, wiederverwendbare Aktionsparameter und die pfadunabhängige Designauswahl. Sie ersetzen keinen visuellen Test in Home Assistant.

## Herkunft und Lizenz

Basis: [Search Card von postlund](https://github.com/postlund/search-card), ursprüngliches Copyright **2019 Pierre Ståhl**. Die lokalen Designänderungen werden von **soundclub83** weitergeführt.

MIT-Lizenz; siehe [LICENSE](LICENSE). Original-Lizenz und Copyright bleiben erhalten.
