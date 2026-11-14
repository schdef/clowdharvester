# Cloud Harvesters – Spieldesign

Nov 13, 2026 · @Stefan

## Vision: Turmoil in der Luft

Cloud Harvesters übernimmt Turmoils Spannungsbogen (Land ersteigern, Vorkommen finden, hinbohren, Fluss beobachten, Anteile gewinnen) und verlegt ihn in driftende Wolkenbänder.

Vier Grundentscheidungen stehen fest: eine Saison gegen drei Rivalen, eine vertikale Sonde mit Widerstand, ruhige Echtzeit nach einer Planungsphase und eine Auktion mit Sky-Council. Alle Zahlen in diesem Dokument sind Startwerte für den Prototyp und werden getestet.

| Turmoil | Cloud Harvesters | Was sich ändert |
| --- | --- | --- |
| Land bei der Stadtauktion kaufen | Wolkenband per Gebotsrunde ersteigern | Verdeckte Gebote in 3 Runden statt Echtzeit-Bieten |
| Öl unter der Erde | Kondensat-Taschen in Wolkenschichten | Taschen driften mit der Wolke und kehren zyklisch zurück |
| Wünschelrute, Maulwurf, Scan | Windfühler, Echo-Drohne, Spektralscan | Gleiche Abstufung von billig und ungenau bis teuer und genau |
| Bohren | Sonde absenken und lenken | Widerstand pro Schicht statt Gesteinshärte |
| Pipelines, Wagen, Silos | Rohre, Tankballons, Hafen | Sichtbarer Durchfluss bleibt erhalten |
| Aktien und Bürgermeisteramt | Council-Anteile und Vorsitz | Anteile werden in 3 Sitzungen versteigert |
| Saloon-Kartenspiele | Wolkenlesen-Rätsel | Erst nach dem Prototyp |
| Wettlauf gegen die Zeit | Planungsphase, dann ruhige Echtzeit | Pausierbar, keine ablaufenden Timer |
| In-App-Käufe | Keine | Einmalkauf, keine Werbung, keine In-Game-Käufe |

**Designprinzipien**

- Das Graben bleibt: Die Sonde muss durch Schichten geführt werden, Antippen reicht nie.
- Alles Wichtige ist vorab sichtbar: Windvorhersage, Preise, Ereignisse.
- Kein Verlust ohne Vorwarnung, keine zerstörten Anlagen.
- Fortschritt schaltet neue Optionen frei, nicht reine Stärke.
- Jede Funktion muss Entdecken, Erreichen, Verbinden oder Sammeln verbessern.

## Rundenablauf und Spielziel

Eine Runde ist eine Saison mit 12 Wochen und dauert bei normalem Tempo etwa 12 Minuten. Gewonnen hat, wer am Ende die meisten Council-Anteile hält und damit den Vorsitz bekommt. Du spielst gegen bis zu 3 KI-Rivalen, in der Kampagne wächst ihre Zahl von 1 auf 3.

1. **Planung (ohne Zeitlimit):** Windkarte, 4-Wochen-Vorhersage und Preise ansehen, Wolkenbänder prüfen.
2. **Auktion:** 6 Wolkenbänder werden in 3 verdeckten Gebotsrunden ersteigert.
3. **Saison (Woche 1 bis 12):** Eine Woche dauert 60 Sekunden bei 1x. Tempo 0,5x, 1x, 2x und Pause jederzeit. Du scannst, bohrst, baust das Netz und verkaufst.
4. **Council-Sitzungen in Woche 4, 8 und 12:** Je 10 Anteile werden versteigert, insgesamt 30.
5. **Wertung:** Meiste Anteile gewinnt den Vorsitz. Bei Gleichstand zählt das Vermögen.

**Gewinnen und Verlieren.** Es gibt kein Scheitern mit Spielende. Platz 1 bis 4 ergibt 3 bis 0 Sterne. Für die nächste Karte der Kampagne reichen 1 Stern (Platz 3 oder besser). Wer schlechter war, wiederholt die Saison mit neuer Zufallskarte.

**Der Zielkonflikt.** Credits sind nur dann Punkte, wenn du sie in Anteile umwandelst. Wer zu früh Anteile kauft, hat weniger Geld für Ausrüstung. Wer zu spät kauft, zahlt mehr, weil die Rivalen mitbieten. Das ersetzt den Zeitdruck von Turmoil durch eine Entscheidung.

## Die Wolkenwelt

Die Karte ist ein Seitenschnitt im Hochformat mit drei Höhenzonen. Wolken pendeln in einem festen Wind-Zyklus hin und her, sie verschwinden nie. So entsteht kein "verpasst für immer", und die Wolkendrift erzeugt Planung statt Hektik.

| Zone | Dichte (Bohrwiderstand) | Drift pro Woche | Ressource | Besonderheit |
| --- | --- | --- | --- | --- |
| Hochzone | Niedrig | 3 Felder | Frostkristalle | Schnell, dünne Schichten, hoher Preis |
| Mittelzone | Mittel | 2 Felder | Skywater | Große Mengen, solide Basis |
| Tiefzone | Hoch | 1 Feld | Sturmladung | Langsam, dicht, stark schwankender Preis |

&#91;embedded content: Seitenschnitt · 3 Zonen, 1 Plattform, 1 Sonde, Rohr zum Hafen\]

Die Plattform ist verankert, das Wolkenband pendelt über sie hinweg. Die Sonde bohrt in die Tasche, ein Rohr bringt die Ernte über den Tankballon zum Hafen.

**Regeln, die Stress verhindern**

- Wind wechselt nur zu festen Wochen. Die Vorhersage zeigt 4 Wochen voraus.
- Jedes Wolkenband kehrt alle 4 Wochen über seinen Ausgangspunkt zurück. Die Vorhersage zeigt auch dieses Fenster.
- Plattformen sind verankert und bleiben stehen. Umsetzen kostet 1 Woche und 100 Credits.
- Die Karte hat 24 Felder in der Breite und 12 Schichten in der Höhe (4 pro Zone). Ein Wolkenband ist 8 Felder breit.
- Pro Saison gibt es 6 Wolkenbänder, jedes mit 2 bis 4 Taschen.

## Graben in Wolken: die Sonde

Das Graben fühlt sich wie Bohren an, wenn drei Dinge zusammenkommen: Widerstand, eine sichtbare Spur und schrittweises Aufdecken.

- **Widerstand:** Der Finger zieht den Bohrkopf an seinem Seil von der Plattform nach unten. Jede Schicht bremst ihn nach ihrer Dichte, dazu kommt leichte Vibration. Turbulenz lässt den Kopf seitlich wackeln. Ein Stabilisator (Upgrade) dämpft das.
- **Sichtbare Spur:** Der Kopf hinterlässt einen Kanal im Nebel, der sich nach 1 Woche langsam schließt. In dieser Zeit kannst du die Sonde zurückführen oder verzweigen.
- **Aufdecken:** Die Karte startet verdeckt. Scans zeigen Hinweise, keine fertigen Antworten.

**Scan-Werkzeuge** (wie Wünschelrute, Maulwurf und Scan in Turmoil)

| Werkzeug | Preis | Was es zeigt |
| --- | --- | --- |
| Windfühler | 50 Credits | "Wärmer/kälter"-Hinweis in einem Radius von 3 Feldern |
| Echo-Drohne | 150 Credits | Dichtelinie einer ganzen Schicht, ungefähre Taschenposition |
| Spektralscan | 400 Credits | Form, Größe und Qualität einer Tasche, einmal pro Wolkenband |

**Taschen** haben Form (Blase, Strang oder Linse), Größe (S, M, L), Qualität (1 bis 3 Sterne) und Zugänglichkeit (Tiefe und Turbulenz).

**Bohrköpfe** passen zur Zone: Nebelfänger für die Mittelzone, Eisbohrer für die Hochzone, Ladungsspitze für die Tiefzone. Ein falscher Kopf bohrt, aber mit halber Leistung. Ein Splitter-Modul (Upgrade) erlaubt eine Verzweigung des Kanals.

**Ernte:** Erreicht der Kopf eine Tasche, füllt sich der Kondensator an der Plattform. Die Tasche leert sich sichtbar, während die Tropfen durchs Rohr laufen.

## Sammelnetz

Der Weg einer Ressource ist immer gleich und auf einen Blick lesbar: Tasche, Sonde, Kondensator, Rohr, Tankballon, Hafen. Der Hafen am unteren Rand kauft Ressourcen und verkauft Upgrades.

| Bauteil | Aufgabe | Stufe 1 / 2 / 3 |
| --- | --- | --- |
| Kondensator | Sammelt aus der Sonde, hängt an der Plattform | 6 / 12 / 24 Einheiten pro Woche |
| Rohr | Leitet vom Kondensator zum Tankballon und zum Hafen | 10 / 20 / 40 Einheiten pro Woche |
| Tankballon | Speichert, bis du verkaufst | 40 / 80 / 160 Einheiten |

Jedes Teil lässt sich einzeln aufrüsten oder ersetzen. Der Durchfluss ist durch das schwächste Teil begrenzt, und genau das ist die Optimierungsaufgabe.

**Statusanzeige** (nie nur durch Farbe): aktiv = fließende Punkte, voll = durchgehende Linie mit Schloss-Symbol, blockiert = Warndreieck und gestrichelte Linie, ruhend = graues Rohr mit Pause-Symbol.

**Automatisierung:** Ab Stufe 2 repariert eine Wartungsdrohne kleine Störungen selbst. Eine Verkaufsregel ("verkaufe ab Preis X") erspart wiederholtes Tippen.

**Verdunstung:** Gelagerte Ressourcen verlieren 2 Prozent pro Woche. Warten auf einen besseren Preis kostet also etwas.

## Wirtschaft und Markt

Es gibt eine einzige Währung (Credits) und einen gemeinsamen Hafenmarkt für alle drei Ressourcen. Das hält die Wirtschaft verständlich und macht Upgrades und Anteile direkt vergleichbar. Startkapital: 1000 Credits.

| Ressource | Zone | Basispreis pro Einheit | Schwankung | Rolle |
| --- | --- | --- | --- | --- |
| Skywater | Mittel | 10 Credits | ±20 Prozent | Verlässliche Basis |
| Frostkristalle | Hoch | 25 Credits | ±15 Prozent | Wenig Menge, hoher Wert |
| Sturmladung | Tief | 18 Credits | ±35 Prozent | Chance und Risiko |

**Preisregeln**

- Preise bewegen sich in Schritten pro Woche entlang einer sichtbaren Kurve. Nachfrage-Ereignisse werden 2 Wochen vorher angekündigt.
- Verkaufen drückt den Preis: minus 2 Prozent je 10 verkaufte Einheiten. Er erholt sich um 5 Prozent pro Woche.
- Wartet man mit dem Verkauf, bleibt der Preis lesbar, aber die Verdunstung (2 Prozent pro Woche) kostet.

**Seltene Funde** (Aurora-Taschen) liefern keine Credits, sondern einen Einflussbonus von 1 Anteil im Council. Sie sind das Gegenstück zu Turmoils Artefakten.

## Auktion, Rivalen und Sky-Council

Diese Ebene ersetzt Turmoils Landauktion und Bürgermeisteramt. Alle Gebote sind verdeckt und laufen in Runden, es gibt keinen Echtzeit-Bietdruck.

**Wolkenband-Auktion (Saisonbeginn).** 6 Bänder werden in 3 Gebotsrunden vergeben. Vorab sieht jeder pro Band die Zone, die ungefähre Größe, die Windvorhersage und genau einen Scan-Hinweis. Wer mehr wissen will, kauft einen Windfühler vor der Auktion.

**Sky-Council (Woche 4, 8 und 12).** Je 10 Anteile, verdeckte Gebote, höchstes Gebot gewinnt je Anteil. Gekaufte Anteile zählen für die Wertung. Aurora-Boni kommen oben drauf und stammen nicht aus den 30.

**Die drei Rivalen** nutzen dieselben Informationen wie du. Sie schummeln nicht.

| Rivale | Strategie | Schwäche |
| --- | --- | --- |
| Der Draufgänger | Bietet hoch auf Frostzonen und kauft früh Anteile | Hat oft zu wenig Geld für Ausrüstung |
| Der Rechner | Bietet nach Erwartungswert, spart für Council-Sitzungen | Ignoriert seltene Funde |
| Die Spürnase | Kauft viele Scans, jagt Aurora-Taschen | Baut ein schwächeres Netz |

Jeder Rivale hat ein Gesicht und kurze Kommentare. Das gibt Persönlichkeit ohne Zeitdruck.

**Nicht im Prototyp:** das Minispiel "Wolkenlesen" als Ersatz für den Saloon (kleines Rätsel für Bonus-Credits).

## Risiken und Wetterereignisse

Ereignisse sollen die Planung fordern, nie den Fortschritt zerstören. Dazu gelten vier feste Regeln: Jedes Ereignis wird mindestens 1 Woche vorher angekündigt, pro Plattform läuft höchstens eines gleichzeitig, keine Anlage geht verloren, und das Spiel pausiert auf Wunsch automatisch beim Eintreten.

| Ereignis | Zone | Wirkung | Behebung |
| --- | --- | --- | --- |
| Turbulenzböe | Alle | Sonde wackelt 1 Woche lang stärker | Stabilisator oder Warten |
| Rohrvereisung | Hoch | Durchfluss halbiert bis zur Reparatur | 1 Tipp und 10 Sekunden Reparatur |
| Gewitterladung | Tief | Speicher überläuft, maximal 10 Prozent des Inhalts gehen verloren | Tankballon vorher leeren |
| Seilverschleiß | Alle | Warnung bei 80 Prozent Verschleiß, bei 100 Prozent wird der Kopf eingeholt | Neuer Kopf für 50 Credits |

Verschleiß läuft sichtbar als Balken. Eine Wartungsdrohne (Stufe 2) nimmt dem Spieler die Routine ab.

## Fortschritt und Kampagne

Die Kampagne hat 9 Saisons in 3 Regionen. Credits und Ausrüstung der Saison verfallen am Ende, damit jede Saison frisch beginnt. Dauerhaft bleiben nur Freischaltungen, die neue Optionen bringen und keine reine Stärke. So bleibt der Wettbewerb fair, und die Entscheidung "welche Ausrüstung" bleibt jede Saison offen.

| Region | Saisons | Neu freigeschaltet |
| --- | --- | --- |
| Frühlingswinde | 1 bis 3 | Mittelzone, Skywater, Windfühler, erster Rivale |
| Sommerzüge | 4 bis 6 | Hochzone, Frostkristalle, Echo-Drohne, Splitter-Modul, zweiter Rivale |
| Sturmsaison | 7 bis 9 | Tiefzone, Sturmladung, Spektralscan, Wartungsdrohne, dritter Rivale |

Sterne (0 bis 3 pro Saison) schalten die nächsten Regionen frei. Wiederholen ist jederzeit möglich.

**Außerhalb des Umfangs:** Asteroiden- und Thermalwelten aus der PRD. Cloud Harvesters soll als eigenständiges Spiel funktionieren. Spätere Welten lassen sich als weitere Kampagnen mit derselben Wirtschaft ergänzen.

## UI und Look and Feel

Das Spiel läuft im Hochformat und mit einer Hand bedienbar. Das passt zur Höhenstruktur der Wolkenzonen und zu den aktuellen Top-Spielen im Play Store, die fast alle im Hochformat laufen.

- **Aufbau:** Oben Credits, Woche und Tempo. Die Mitte (etwa 70 Prozent) zeigt den Seitenschnitt mit Plattformen, Wolken und Sonden. Unten eine Werkzeugleiste mit 5 Slots (Scan, Kopf, Rohr, Speicher, Verkauf). Pause ist ein großer Knopf im Daumenbereich.
- **Stil:** Runde, weiche Formen und Pastellfarben, wie bei den erfolgreichen Casual-Spielen, aber mit handgezeichneten Maschinen. Jede Zone hat eine eigene Farbwelt: Hoch eisblau, Mitte weiß-blau, Tief violett mit gelben Blitzen.
- **Rückmeldung:** Jede Aktion bekommt Partikel, Ton und Vibration (Bohren, Treffer, Verkauf). Das ist der Teil, den die Top-Spiele am besten können.
- **Figuren:** Die drei Rivalen als Gesichter im Council. Ein kleiner Wetterballon dient als Berater im Tutorial.
- **Barrierefreiheit:** Große Touch-Flächen (mindestens 48 dp), Status nie nur durch Farbe, skalierbare Schrift, Option für weniger Bewegung, jederzeit pausierbar.
- **Offline und Datenschutz:** Komplett offline spielbar, kein Konto, keine Werbung. Autosave nach jeder Woche und nach jedem Kauf.

## Prototyp-Plan und Testkriterien

Der Prototyp beantwortet zuerst die größte Frage aus der PRD: Fühlt sich Graben in Wolken wie Graben an? Erst danach kommen Netz, Markt und Wettbewerb dazu. Jede Stufe hat ein Tor mit Zahlen.

| Stufe | Inhalt | Tor (mindestens 6 von 8 Testern) |
| --- | --- | --- |
| P1: Sonde | 1 Wolkenband, 1 Plattform, 1 Sonde, 2 Taschen, Scan-Hinweis | Bewerten "fühlt sich wie Bohren an" mit 4 oder 5 auf einer Skala bis 5 |
| P2: Netz und Markt | Kondensator, Rohr, Tankballon, Hafen, 1 Ressource, Preiskurve | Erklären nach 3 Minuten, warum ein Rohr zu langsam ist |
| P3: Auktion | 6 Bänder, 3 Gebotsrunden, 1 KI-Rivale | Nennen eine begründete Gebotsstrategie |
| P4: Council | 3 Sitzungen, Anteile, Wertung | Verstehen nach der ersten Saison, warum sie Platz X belegt haben |

Eine P1-Saison hat 6 Wochen (etwa 6 Minuten). Der Gesamttest der Saison mit 12 Wochen soll im Median zwischen 10 und 15 Minuten liegen.

**Technik (Vorschlag):** Godot 4 mit 2D-Rendering, Android-Export und ohne Lizenzkosten. Die Wolke ist ein Dichtefeld auf einem Raster. Die Sonde "schneidet" einen Kanal in dieses Feld, der sich in 1 Woche schließt. Das hält Performance und Aufwand klein. Alternativ funktioniert Unity oder native Android mit LibGDX.

**Name:** Cloud Harvesters ist ein Arbeitstitel. Vor jeder Veröffentlichung braucht es eine Namens- und Markenprüfung.

## Entscheidungsprotokoll

Jede offene Frage aus der Bewertung der PRD hat hier eine Antwort. "Zu testen" heißt: Der Wert ist gesetzt und wird im Prototyp geprüft. "Offen" heißt: Dafür brauche ich noch deine Entscheidung.

| Frage aus der Bewertung | Entscheidung | Status |
| --- | --- | --- |
| Fühlt sich Graben in Wolken wie Graben an? | Vertikale Sonde mit Widerstand, Kanalspur und Aufdecken | Zu testen |
| Zeitdruck durch Wolkendrift | Pendel-Drift mit 4-Wochen-Zyklus und Vorhersage, Plattformen verankert | Entschieden |
| Zeitmodell | Planungsphase, dann ruhige Echtzeit mit Pause | Entschieden |
| Ersatz für Turmoils zweite Ebene | Wolkenband-Auktion und Sky-Council | Entschieden |
| Rundenlänge | 12 Wochen à 60 Sekunden, etwa 12 Minuten | Zu testen |
| Sieg und Niederlage | Anteile, 0 bis 3 Sterne, kein Spielende | Entschieden |
| Wirtschaft | Eine Währung, ein Hafenmarkt, 3 Ressourcen | Entschieden |
| Look and Feel gegenüber den Top-10 | Hochformat, weiche Formen, viel Rückmeldung | Entschieden |
| Anzahl der Welten | Nur Wolken, andere Welten später | Entschieden |
| Engine und Technik | Godot 4 vorgeschlagen | Offen |
| Preis, Zielgruppe, Marktvergleich | Einmalkauf, Höhe und Vergleichsspiele noch offen | Offen |
| Name und Markenprüfung | Arbeitstitel Cloud Harvesters | Offen |
| Minispiel anstelle des Saloons | Wolkenlesen, erst nach dem Prototyp | Offen |
