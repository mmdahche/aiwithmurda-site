---
name: schedule-task
description: Register a recurring or one-time scheduled job mid-cycle via cron or launchd (macOS) / cron or systemd timers (Linux) / Task Scheduler (Windows). Use when /operator-cycle decides a script needs to run on a recurring basis (e.g., daily health check, hourly diagnostic).
risk: high
version: 1.0
---

# Schedule Task

Register a scheduled task with platform-aware defaults. Validates against CYCLE-CONTRACT § 5 cron firewall.

## When to use

- `/operator-cycle` decides a script needs recurring execution
- The operator says `/schedule-task <description>` explicitly
- A diagnostic should run daily / hourly instead of on-demand
- A failure-mode auto-watchdog needs cron registration

## When NOT to use

- One-off task that won't recur (just run it)
- Task that should be tied to git events (use git hooks instead)
- Anything in the cron deny-list (`sudo`, `rm -rf`, `dd`, `mkfs`, `chmod 777`, `git push --force`)

## Steps

1. **Identify the script + cadence** from the description:

   - What script to run (path or new file)
   - How often (daily / hourly / every-N-min / one-time)
   - At what time (if daily)
   - Required env vars or working directory
   - Network hosts the script will reach

2. **Smoke-test the script manually first.** If it doesn't run cleanly by hand, do NOT schedule it. Schedule-then-fix is the path to silent-skip hell.

3. **Validate against the cron firewall (CYCLE-CONTRACT § 5b):**

   - Script path must be in `$CYCLE_ROOT/scripts/**` OR a project repo in `project_allowlist`.
   - Network hosts must be in `cron_host_allowlist_default` OR explicitly declared at register-time.
   - Command must NOT contain: `sudo`, `rm -rf /`, `rm -rf ~`, `dd`, `mkfs`, `chmod 777`, `git push --force`.

4. **Choose the scheduler** for your platform:

### Option A — macOS `launchd` (preferred for daily/hourly with logging)

Write a plist to `~/Library/LaunchAgents/com.operator-cycle.<name>.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTD/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.operator-cycle.<NAME></string>
  <key>ProgramArguments</key>
  <array>
    <string>/usr/local/bin/node</string>
    <string><ABS_PATH_TO_SCRIPT></string>
  </array>
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key><integer>7</integer>
    <key>Minute</key><integer>30</integer>
  </dict>
  <key>StandardOutPath</key>
  <string><ABS_PATH>/logs/<NAME>.log</string>
  <key>StandardErrorPath</key>
  <string><ABS_PATH>/logs/<NAME>.err</string>
  <key>RunAtLoad</key><false/>
</dict>
</plist>
```

Load: `launchctl load ~/Library/LaunchAgents/com.operator-cycle.<NAME>.plist`
Verify: `launchctl list | grep operator-cycle`

### Option B — cron (preferred for every-N-min; also default on Linux)

```bash
(crontab -l 2>/dev/null; echo "*/30 * * * * cd <project root> && <interpreter> <script> >> <log path> 2>&1") | crontab -
```

Verify: `crontab -l | grep <NAME>`

### Option C — Linux systemd timer

Create `~/.config/systemd/user/operator-cycle-<name>.service` + `.timer`, then `systemctl --user enable --now operator-cycle-<name>.timer`.

### Option D — Windows Task Scheduler

Use `schtasks /Create /SC HOURLY /TN "operator-cycle\<NAME>" /TR "<command>"` or the GUI. Log paths must be writable by the task user.

5. **Verify registration:** query the scheduler post-create and report the next-run time.

6. **Append to `capabilities.jsonl`** (category: `cron`):

   ```json
   {"ts":"<ISO>","cycle":<N>,"capability":"<name>","category":"cron","artifact_path":"<plist / crontab entry / timer unit>","trigger":"<cause>","effect":"<forward impact>","commit":"<sha>","depth_level":<1-6>}
   ```

7. **Commit the script + scheduler unit together** with the operator-cycle trailer per CYCLE-CONTRACT § 4.

## Example invocations

- `/schedule-task daily 7am — run health-check.js`
- `/schedule-task every 30 min — check inbox-bounces.sh`
- `/schedule-task hourly — sync analytics-dashboard.py`

## Anti-patterns

- Don't schedule a task without smoke-testing it manually first.
- Don't use `RunAtLoad=true` (launchd) or `@reboot` (cron) for heavy tasks — cycle restart or reboot = blast on boot.
- Don't schedule fire-once tasks for recurring work.
- Don't forget to log — silent skips for 2-3 weeks at a time happen when there is no log path.
- Don't schedule scripts under your platform's protected paths — the firewall will block.

## Pressure-gate the heavy ones

If the script is heavy (consistently >10s wall-clock), build a pressure gate into the script itself:

```js
const os = require('os');
const free = os.freemem(), total = os.totalmem();
const pressureHigh = (1 - free/total) > 0.90;
if (pressureHigh) { console.log('[SKIP-PRESSURE] deferred'); process.exit(0); }
```

Or the shell equivalent — check load average / free memory / disk pressure and exit 0 with a `[SKIP-PRESSURE]` line rather than run under duress.

## Output

After registering:

- Task label / name + scheduler used
- Next run time
- Action (script + args)
- Log path
- Capability log entry written

## Related

- `/cycle-evolve` for creating the script if it doesn't exist yet.
- `/operator-cycle` calls this when a recurring pattern surfaces.
