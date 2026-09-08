# Verification

Run from the unpacked outer folder:

    python3 -B -m unittest discover -s tests -v

On Windows use py in place of python3.
The tests use fake mailboxes and prohibit network connections.

Coverage includes default Delete, review choices, dry-run isolation, typed approval,
account and UIDVALIDITY binding, exact sender checks, changed Keep rules, rechecked
stars, missing flag responses, unsupported servers, failed COPY/STORE/MOVE, scoped
UID EXPUNGE, protected sources/destinations, and manual-only unsubscribes.

Version 1.2 adds both guided route rehearsals using sample mail, cancellation at
each stage, changed saved choices, minimal AI report contents, no automatic AI
actions, unknown/duplicate sender rejection, schema/size checks, scan binding,
untrusted suggestion text, and isolation/restoration of practice mode.

To try the same practice workflow interactively, run:

    python3 -B start.py --demo

The practice inbox is a simulation, not evidence of live Gmail/iCloud compatibility.
The kit's AI guide can be opened explicitly in your assistant. It is not installed
automatically; no AI account is connected and no usage credits are included.

These tests do not prove interoperability with every mail server.
This release has not been acceptance-tested on live Gmail/iCloud mailboxes or on Windows.
Start with a small, backed-up group. Inspect the results in your own mail app.
The kit does not provide a backup or an automatic undo.
