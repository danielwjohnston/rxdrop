# RxDrop practitioners - full roster and date corrections

## A. Corrections to what ships today (`src/eras.js`, five eras)

| # | Era (levels) | Practitioner | Shipped period | Problem | Corrected period | Corrected note |
|---|---|---|---|---|---|---|
| 1 | Protomedicine (0-3) | Shaman / paleolithic healer | before record | none | **before c. 3000 BCE** (before written medicine; earliest medical texts are Sumerian and Egyptian, 3rd-2nd millennium BCE) | unchanged: "A cave mouth, no date" |
| 2 | The Apothecary (4-7) | Plague doctor | 1347 - 1799 | The beaked costume is first described by Charles de Lorme in **1619**; the famous engraving ("Doctor Schnabel von Rom") is **1656**. 1347-48 is the Black Death - three centuries too early for this figure. The note "Marseille, 1348" with a beak is anachronistic. | **1619 - 1799** | **"Marseille, 1720"** (the Great Plague of Marseille, the last major plague outbreak in Western Europe - beaked doctors are attested there) |
| 3 | Patent Medicine (8-11) | Patent-medicine showman | 1800 - 1905 | Off by one: the era is conventionally closed by the US **Pure Food and Drug Act of 1906**, which forced ingredient labelling. | **1800 - 1906** | unchanged: "St. Louis, 1889" |
| 4 | Pharmaceutical (12-15) | Physician | 1928 - 1999 | Accurate. 1928 = Fleming observes penicillin; the note "London, 1945" matches his Nobel lecture warning of resistance (Dec 1945). | **1928 - 1999** | unchanged |
| 5 | Gene Therapy (16+) | Gene-tech / technician | 2000 - onward | The first approved human gene-therapy trial was **1990** (Ashanti DeSilva, ADA-SCID, NIH). 2000 is the Human Genome draft, which is genomics, not gene therapy. Either rename the era or move the date. | **1990 - onward** (keep name "Gene Therapy"), or keep 2000 and rename to **"Genomic Medicine"** | unchanged: "Cambridge, 2021" (mRNA vaccines 2020, fine) |

Also: `index.html` line 50 hard-codes `1928 - 1999` as placeholder text - it is overwritten at runtime but should match era 1's corrected value.

Docs that reference the old dates (`docs/direction.md` §3 and "two live instances") describe the errors and stay as the record of why they were fixed.

## B. Full practitioner roster (superset of `main` + `openai/medical-eras-visual-overhaul`, dated)

Sprite status: R = rendered in PR #32 (5 x 4 poses), - = not yet rendered.

| # | Practitioner | Date anchor | Basis | Dress / props that read at 130 px | Sprites |
|---|---|---|---|---|---|
| 1 | Paleolithic healer | before c. 3000 BCE | Shanidar and other burials with medicinal plants; Otzi (c. 3300 BCE) carried birch fungus | ochre, hide, bone/antler, shell cordage. **No feathered war bonnet** (Plains, 18th-19th c.) | R (`shaman`) |
| 2 | Egyptian swnw | c. 1550 BCE | Ebers and Edwin Smith papyri; Imhotep tradition | shaved head, linen kilt, papyrus roll, faience jars | - |
| 3 | Hippocratic physician | c. 400 BCE | Hippocrates of Kos, c. 460-370 BCE; the Corpus | himation, staff, wax tablet, bleeding cup | - |
| 4 | Galenic / Roman physician | c. 160 CE | Galen of Pergamon, 129-c. 216 | toga, scalpel case, theriac jar | - (optional; overlaps 3) |
| 5 | Bimaristan physician | c. 1000 CE | al-Razi (d. 925), al-Adudi hospital Baghdad 981, Ibn Sina's Canon c. 1025 | turban, robe, astrolabe-era brass, urine flask (matula) | - |
| 6 | Medieval apothecary | c. 1250 - 1600 | Edict of Salerno 1231 separates apothecaries from physicians; guilds from the 1200s | apron, mortar and pestle, drug jars (albarelli), scales | - (this is what "The Apothecary" era is actually named after) |
| 7 | Barber-surgeon | c. 1500 - 1745 | Ambroise Pare 1510-1590; London Company of Barber-Surgeons 1540, split 1745 | striped pole, razor, lancet, basin | - |
| 8 | Plague doctor | 1619 - c. 1720 | de Lorme 1619; Rome 1656; Marseille 1720 | waxed coat, beak mask, wide hat, cane | R (`plague`) |
| 9 | Patent-medicine showman | 1800 - 1906 | US patent-medicine boom; Pure Food and Drug Act 1906 | top hat, brocade waistcoat, embossed bottle | R (`quack`) |
| 10 | Germ-theory surgeon | 1867 - 1900 | Pasteur 1860s, Lister's antisepsis 1867, Koch's postulates 1882 | gown, carbolic spray, microscope | - |
| 11 | Antibiotic-era physician | 1928 - 1999 | penicillin 1928 / mass production 1943; sulfa (Prontosil) 1935 | white coat, stethoscope, clipboard | R (`physician`) - **note: PR #32 sprite wears a dark suit, not a white coat; re-render recommended** |
|   | **Open item:** re-render the physician in a white coat for the final art pass. | | | | |
| 12 | Molecular researcher | c. 1985 | PCR 1983, first genetically engineered drug (insulin) 1982 | lab coat, pipette, gel | - (optional; overlaps 13) |
| 13 | Gene-therapy clinician | 1990 - onward | DeSilva trial 1990; Glybera 2012; CRISPR 2012; Casgevy 2023 | visor, sealed suit, cryo vial | R (`technician`) |

Seasonal (not historical, not in the timeline): holy healer for the October ward (druid / exorcist-priest / hedge-witch) - see `docs/ideas.md`.

## C. The decision

The game has 20 levels in five 4-level bands. Thirteen practitioners do not fit that without changing the level structure.

Option 1 - **Fix dates, keep five eras** (recommended now). Five code-line edits plus tests; the roster above goes into `docs/practitioners.md` as the dated cast list for future art and the Godot build. Zero gameplay change.

Option 2 - **Expand to more eras**. Requires a new level banding (e.g. 10 eras x 2 levels), five new sprite sets x 4 poses (~20 more renders), era-note text, and re-verifying the "era changes never change legibility" constraint. A separate, larger PR.
