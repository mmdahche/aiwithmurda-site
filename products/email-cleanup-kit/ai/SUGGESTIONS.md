# Suggestions file format

UTF-8 JSON only, under 500,000 characters. This is advice, not an execution plan.
Use exactly two top-level fields: report_id and suggestions.

```json
{
  "report_id": "COPY_THE_EXACT_REPORT_ID_FROM_THE_SHARED_REPORT",
  "suggestions": [
    {
      "sender": "offers@shop.example",
      "action": "delete",
      "reason": "Use only if you confirm these offers are unwanted. This moves mail to Trash."
    },
    {
      "sender": "receipts@store.example",
      "action": "folder",
      "folder": "Receipts",
      "reason": "Keep receipts in a named folder only if this sender does not mix in other important mail."
    }
  ]
}
```

The example addresses are fictional. Include only exact senders actually in the
shared report; do not invent senders or copy this example unchanged.

- Allowed actions: keep, delete, archive, folder, unsub_delete.
- reason: plain text, 1 to 300 characters, explains uncertainty and intent.
- folder: required only for folder; 1 to 200 ASCII characters, no ampersand or
  control characters. Use a normal user folder, not INBOX, Trash, Sent or Junk.
- No duplicate senders, extra keys, shell commands, message IDs or credentials.
- You may omit uncertain senders, but recommending Keep with an explanation is
  clearer. Omitting a sender does not erase the user's previous saved choice.
- bulk_hint is only a header hint, not an AI classification or proof of spam.
- Existing Keep choices should remain unless the user explicitly asks to change them.

The local tool checks the entire suggestion file before displaying it. It will
not silently accept half a malformed file. It never executes text in reasons.
It still asks the human to choose each action and confirm a separate saved plan.
