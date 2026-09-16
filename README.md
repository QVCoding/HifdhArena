# Quran Tester
HTML-based Quran (Hifdh) testing apps.

Are made public on [https://qurantester.neocities.org](https://qurantester.neocities.org)

# Files
All Quranic data is taken from [tanzil.org](https://tanzil.net/docs/).

`app_quran_metadata.xml` Quranic metadata taken from [https://tanzil.net/docs/quran_metadata](https://tanzil.net/docs/quran_metadata), modified to include only surah, juz, and page.

`quran_words.csv` List of every word in the Quran. 

How to reproduce:
From [https://tanzil.net/download/](https://tanzil.net/download/) download the `Simple (Plain)` SQL text, with all options disabled.
Run `make_quran_words.py`, then convert the resulting file to csv.

 `minimaltest.html` App which shows a unique-phrase (with no more words than necessary for the phrase to be uniquely identifiable) for the user to identify.

 `commonphrase.html` App which shows a set of surahs of juz's which all contain a common phrase, and the user must identify that phrase.

 `quran-simple-plain_nobasmalah.sql` Sql of entire Quran with the basmalah from the beginning of the surahs removed (except Fatihah). The basmalahs are removed to prevent them from being identified as a common phrase in every surah.

 `Occurrences_Tester.html` App which tests the user in identifying whether certain phrases appear in certain Surahs/Juz's of the Quran.

 `changecolour.py` Changes the colour of the Quran page pngs to give them contrast on whatever background the app has.

 `khatmahclock.html` App which has a countdown for Quran Khatmas - showing what page the reciter must be up to to finish on time.
 Potential updates: Use ayah timing data from qul.ai to show the exact ayah to keep pace.

---
The code itself is primarily AI-written, but AI did not generate any of the actual Quranic text. The text on the page (description, labels, tooltips, instructions etc.) is primarily human-written (a human can use an em dash).
