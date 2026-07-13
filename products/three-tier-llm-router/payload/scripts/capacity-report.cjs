#!/usr/bin/env node
// capacity-report.cjs — human-readable capacity dashboard (wrapper).

'use strict';

const { formatReport, getPoolStatus } = require('../lib/capacity-ledger.cjs');

console.log(formatReport(getPoolStatus()));
