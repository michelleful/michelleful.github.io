# PLAN

Generate code for a puzzle game under languages/german/is-easy directory. The puzzle game is called "German Is Easy". (This is a tongue in cheek name.) The idea is that you use 

Game is organized in levels. Main page has a list of levels (for now) and their status. Initially only the first two levels are accessible. There will ultimately be ~30 levels.

Within each level, there are ~10 sub-levels. 

## Tasks

## Translating from German to English.

Most of the tasks are translating from German to English.

e.g. German: "Salz und Pfeffer"
Instruction: Translate

______ ______ ______ <- three blanks for text boxes, make sure they are wide enough to accommodate the words

target:
[
  {"word": "salt", "given": false},
  {"word": "and", "given": false},
  {"word": "pepper", "given": false}
]

When they type in say "salt", it will be accepted and the word turns green, is no longer editable, and the focus moves to the next open blank. We will accept regardless of case, but correct to the stated case if they put in say "SaLT" (put in "salt" at the end).

When "given" is true, that means it's already filled in. For example we should make all punctuation already given, including apostrophes and commas and periods.

## Multiple choice

Another possible task is choosing from multiple buttons

e.g. "Ist Salzwasser Trinkwasser?"

target:
[
    {"label": "Ja", "correct": false},
    {"label": "Nein", "correct": true}
]

If they click on "Nein", then it's correct.

## Drag and drop

Here they have to put various days of the week in order

M ______
T ______
W ______
Th ______
F ______
Sa ______
Su ______

Words: ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"] (randomize order). They have to drag and drop the correct words into the slots.

Once they have completed a sub-level, make available a button for "Next" and if you press the button or "Enter", you can go to the next sub-level. When they've finished all sub-levels return them to the main page to select a new level. 

# Implementation tasks

Implement the main page and the first two levels for now.

Main page: list available levels (just these two for now, already unlocked). Whether they're started/complete.

## Level 1

1. Salz und Pfeffer -> translate, "salt and pepper" (one blank each)
2. Salzwasser -> "salt water" (one blank each)
3. Trinkwasser -> "drinking water" (one blank each)
4. Ist Salzwasser Trinkwasser? -> "Ja" and "Nein" buttons, "Nein" is correct.
5. Salzwasser ist kein Trinkwasser. -> "Salt water is not drinking water." (one blank each, period is already supplied)
6. Ich trinke Wasser. -> "I drink water." (one blank each)
7. Ich trinke Bier, du trinkst Milch. -> "I drink beer, you drink milk." (one blank each)
8. Ich habe Bier, du habst Milch. -> "I have beer, you have milk."
9. Ich habe Bier getrunken. -> "I have drunk beer."
10. Ich habe zu viel Bier getrunken. Ich bin betrunken! -> "I have drunk too much beer. I am drunk!" ("too" will already be filled in as a hint)

## Level 2

1. Meine Mutter und mein Vater -> translate, "my mother and my father"
2. Muttertag ist immer ein Sonntag. -> translate, "Mother's Day is always a Sunday"
3. Task described above, to reorder days of the week
4. Mittwoch = Mid week (hint: translate literally)
5. Meine Woche beginnt am Montag.
6. Wochenende = Samstag + Sonntag
7. Wochentage sind Arbeitstage für mich.
8. Ich arbeite nicht am Wochenende.
9. Meine Arbeitswoche beginnt am Montag und endet am Freitag. -> "My workweek begins on Monday and ends on Friday."
10. Ich hasse Montage, wie Garfield. Ich will nicht arbeiten! -> "I hate Mondays, like Garfield. I don't want to work!"

To the extent possible, make all of the levels editable in a YAML file for easy changes, please. We will need:

* List of levels, which ones they each unlock
* Each level has its own YAML, with a list of sub-levels, which KIND it is, and all the information necessary to populate and determine correctness
  * Note: in future we will have hints and something to say when they get it correct (e.g. a note on how "will" means "want" in German, not precisely the English word "will"), but we can implement the hints system etc later.